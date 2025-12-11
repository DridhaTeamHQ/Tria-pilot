import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import { tryOnSchema } from '@/lib/validation'
import { checkRateLimit } from '@/lib/rate-limit'
import { getOpenAIKey, getGeminiKey } from '@/lib/config/api-keys'
import { analyzePersonImage, analyzeClothingImage } from '@/lib/analysis/gemini-analyzer'
import { generatePromptFromAnalysis } from '@/lib/prompts/prompt-orchestrator'
import { getPresetById } from '@/lib/prompts/try-on-presets'
import { generateTryOn } from '@/lib/nanobanana'
import { normalizeBase64, redactClothingRefFaces, autoGarmentCrop } from '@/lib/image-processing'
import { saveUpload } from '@/lib/storage'
import { validateImageGeneration } from '@/lib/validation/image-validator'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    // Validate API keys using unified config
    try {
      getOpenAIKey()
      getGeminiKey()
    } catch (keyError) {
      return NextResponse.json(
        { error: keyError instanceof Error ? keyError.message : 'API keys not configured' },
        { status: 500 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Prisma manages connections automatically via pool
    let dbUser
    try {
      dbUser = await prisma.user.findUnique({
        where: { email: authUser.email! },
        select: {
          id: true,
          email: true,
          name: true,
        },
      })
    } catch (dbError) {
      console.error('Database query error:', dbError)
      return NextResponse.json(
        { error: 'Database connection failed. Please try again.' },
        { status: 503 }
      )
    }

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check rate limit
    const rateLimit = checkRateLimit(dbUser.id, 'tryon')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          resetTime: rateLimit.resetTime,
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const {
      personImage,
      personImages,
      clothingImage,
      accessoryImages, // NEW: accessory images
      accessoryTypes,  // NEW: accessory type labels
      model,
      stylePreset,
      background,
      pose,
      expression,
      addOns,
      aspectRatio: reqAspectRatio,
      resolution: reqResolution
    } = tryOnSchema.parse(body)

    // Map user-friendly model names to Gemini model IDs
    const geminiModel = model === 'pro' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image'
    console.log(`📊 Selected model: ${model} (${geminiModel})`)

    // Get preset if provided
    const preset = stylePreset ? getPresetById(stylePreset) ?? null : null
    if (stylePreset) {
      console.log(`🎨 Preset requested: ${stylePreset}`)
      if (preset) {
        console.log(`✅ Preset found: ${preset.name} (${preset.category})`)
        console.log(`   Deviation: ${preset.deviation}, Positive: ${preset.positive?.length || 0} modifiers`)
      } else {
        console.warn(`⚠️ Preset not found: ${stylePreset}`)
      }
    } else {
      console.log('📝 No preset selected - using default (clothing only)')
    }

    // Create generation job
    const job = await prisma.generationJob.create({
      data: {
        userId: dbUser.id,
        inputs: {
          personImage,
          clothingImage,
        },
        settings: {
          stylePreset,
          background,
          pose,
          expression,
          addOns,
          model: geminiModel,
        },
        status: 'pending',
      },
    })

    try {
      console.log('🚀 Starting try-on generation for job:', job.id)

      // Normalize images
      const normalizedPerson = normalizeBase64(personImage)
      const normalizedClothing = clothingImage ? normalizeBase64(clothingImage) : undefined

      console.log('Step 1/5: Analyzing person image with Gemini Nano...')

      // NEW PIPELINE: Use Gemini Nano for analysis
      let personAnalysis
      try {
        personAnalysis = await analyzePersonImage(normalizedPerson)
        console.log('✅ Person analysis complete')
        console.log(`Person: ${personAnalysis.person.skin_tone} skin, ${personAnalysis.person.hair_color} hair, ${personAnalysis.person.face_shape} face`)
      } catch (error) {
        console.error('Person analysis failed:', error)
        throw new Error('Failed to analyze person image. Please ensure the image clearly shows a person.')
      }

      console.log('Step 2/5: Analyzing clothing image with Gemini Nano...')

      // Analyze clothing if provided
      let clothingAnalysis
      if (normalizedClothing) {
        try {
          const redactedClothing = await redactClothingRefFaces(normalizedClothing)
          const croppedClothing = await autoGarmentCrop(redactedClothing)
          clothingAnalysis = await analyzeClothingImage(croppedClothing)
          console.log('✅ Clothing analysis complete')
          console.log(`Clothing: ${clothingAnalysis.upper_wear_color} ${clothingAnalysis.upper_wear_type}`)

          // Merge clothing analysis into person analysis
          personAnalysis.clothing = clothingAnalysis
        } catch (error) {
          console.error('Clothing analysis failed:', error)
          console.warn('Continuing without clothing analysis - will use person image clothing')
        }
      }

      console.log('Step 3/5: Generating prompt with ChatGPT...')

      // NEW PIPELINE: Use ChatGPT prompt orchestrator
      let finalPrompt: string
      try {
        finalPrompt = await generatePromptFromAnalysis(
          personAnalysis,
          preset,
          undefined, // userRequest - can be added later
          {
            model: geminiModel,
            resolution: '2K',
          }
        )
        console.log('✅ Prompt generated')
        console.log(`Prompt length: ${finalPrompt.length} characters`)

        // Validate preset data is included in final prompt
        if (preset) {
          // Check for preset content in the actual prompt format (not section headers)
          // The prompt uses "Scene Style:" and "Avoid:" sections, not "STYLE SECTION"
          const hasSceneStyle = finalPrompt.includes('Scene Style:') || finalPrompt.includes('Scene Style')
          const hasAvoid = finalPrompt.includes('Avoid:') || finalPrompt.includes('Avoid')

          // Check if preset name or description is mentioned
          const hasPresetName = finalPrompt.includes(preset.name)
          const hasPresetSection = finalPrompt.includes('PRESET:') || finalPrompt.includes(`PRESET: ${preset.name}`)
          const hasPresetDescription = preset.description ? finalPrompt.includes(preset.description.substring(0, 20)) : false

          // Check if specific modifiers are present (if they exist) - this is the most important check
          const hasPositiveMods = preset.positive && preset.positive.length > 0
            ? preset.positive.some((mod: string) => finalPrompt.includes(mod))
            : true // If no positive mods defined, that's okay
          const hasNegativeMods = preset.negative && preset.negative.length > 0
            ? preset.negative.some((mod: string) => finalPrompt.includes(mod))
            : true // If no negative mods defined, that's okay

          // Check for preset background if specified
          const hasBackground = preset.background ? finalPrompt.includes(preset.background) : true

          // Check for lighting if specified
          const hasLighting = preset.lighting
            ? (finalPrompt.includes(preset.lighting.type) || finalPrompt.includes(preset.lighting.source))
            : true

          // Check for camera if specified
          const hasCamera = preset.camera_style
            ? (finalPrompt.includes(preset.camera_style.angle) || finalPrompt.includes(preset.camera_style.lens))
            : true

          console.log(`🔍 Preset validation in final prompt:`)
          console.log(`   Scene Style Section: ${hasSceneStyle ? '✅' : '❌'}`)
          console.log(`   Avoid Section: ${hasAvoid ? '✅' : '❌'}`)
          console.log(`   Preset Section: ${hasPresetSection ? '✅' : '⚠️'}`)
          console.log(`   Preset Name/Description: ${hasPresetName || hasPresetDescription ? '✅' : '⚠️'}`)
          console.log(`   Positive Modifiers Content: ${hasPositiveMods ? '✅' : '❌'}`)
          console.log(`   Negative Modifiers Content: ${hasNegativeMods ? '✅' : '❌'}`)
          console.log(`   Background: ${hasBackground ? '✅' : '⚠️'}`)
          console.log(`   Lighting: ${hasLighting ? '✅' : '⚠️'}`)
          console.log(`   Camera: ${hasCamera ? '✅' : '⚠️'}`)

          // Critical validation: must have positive modifiers if they exist
          // This is the most important check - the actual preset content must be present
          if (preset.positive && preset.positive.length > 0 && !hasPositiveMods) {
            console.error('⚠️ CRITICAL ERROR: Preset positive modifiers not found in final prompt!')
            throw new Error('Preset data was not properly merged into final prompt - missing positive modifiers')
          }

          // Warn if sections are missing but don't fail (these are format checks, not critical)
          if (!hasSceneStyle || !hasAvoid) {
            console.warn('⚠️ WARNING: Prompt format may not match expected structure, but content validation passed')
          }

          // Log success if all critical checks pass
          if (hasPositiveMods && hasNegativeMods) {
            console.log('✅ Preset validation passed: All critical preset content is present in final prompt')
          }
        }
      } catch (error) {
        console.error('Prompt generation failed:', error)
        throw new Error('Failed to generate try-on prompt. Please try again.')
      }

      // Log final prompt before sending to Gemini
      console.log('\n📌 FINAL PROMPT BEFORE GEMINI:')
      console.log('='.repeat(80))
      console.log(finalPrompt)
      console.log('='.repeat(80))
      console.log(`\nPrompt length: ${finalPrompt.length} characters\n`)

      // Generate image using Gemini
      // Use user-selected aspect ratio and resolution (with defaults)
      const aspectRatio = reqAspectRatio || '4:5'
      const resolution = reqResolution || '2K'
      console.log(`📐 Generation settings: ${aspectRatio} aspect ratio, ${resolution} resolution`)

      let generatedImage
      try {
        generatedImage = await generateTryOn({
          personImage: normalizedPerson,
          personImages: personImages?.map(img => normalizeBase64(img)), // Additional person images for Pro
          clothingImage: normalizedClothing,
          accessoryImages: accessoryImages?.map(img => normalizeBase64(img)), // NEW: accessories
          accessoryTypes, // NEW: accessory type labels
          prompt: finalPrompt,
          model: geminiModel as 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview',
          aspectRatio,
          resolution,
        })
        console.log('✅ Image generated successfully')
      } catch (error) {
        console.error('Image generation failed:', error)
        throw new Error('Failed to generate try-on image. Please try again.')
      }

      console.log('Step 5/5: Validating and saving...')

      // Validate image generation
      const validation = validateImageGeneration(
        personAnalysis,
        { image: generatedImage }, // Placeholder - would use actual image analysis
        preset,
        finalPrompt
      )

      console.log(`Validation score: ${(validation.score * 100).toFixed(1)}%`)
      if (validation.warnings.length > 0) {
        console.warn('Validation warnings:', validation.warnings)
      }
      if (validation.errors.length > 0) {
        console.error('Validation errors:', validation.errors)
      }

      // Save image to storage
      const imagePath = `${dbUser.id}/${job.id}.jpg`
      const imageUrl = await saveUpload(generatedImage, imagePath, 'try-ons')

      console.log('✅ Image saved to storage:', imageUrl)

      // Update job with results
      try {
        await prisma.generationJob.update({
          where: { id: job.id },
          data: {
            outputImagePath: imageUrl,
            status: 'completed',
            settings: {
              ...(job.settings as any),
              generatedPrompt: finalPrompt,
              analysis: {
                person: {
                  skin_tone: personAnalysis.person.skin_tone,
                  hair_color: personAnalysis.person.hair_color,
                  face_shape: personAnalysis.person.face_shape,
                },
                clothing: personAnalysis.clothing,
              },
              validation: {
                score: validation.score,
                passed: validation.passed,
                warnings: validation.warnings,
                errors: validation.errors,
              },
            },
          },
        })
        console.log('✅ Job metadata updated')
      } catch (updateError) {
        console.error('Failed to update job metadata (non-critical):', updateError)
      }

      console.log('🎉 Try-on generation complete for job:', job.id)

      return NextResponse.json({
        jobId: job.id,
        imageUrl,
        status: 'completed',
        validation: {
          score: validation.score,
          passed: validation.passed,
          warnings: validation.warnings,
          errors: validation.errors,
        },
        debug: {
          prompt: finalPrompt,
          analysis: {
            person: personAnalysis.person,
            clothing: personAnalysis.clothing,
          },
        },
      })
    } catch (error) {
      console.error('❌ Try-on generation failed for job:', job.id)
      console.error('Error:', error)

      // Update job with error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

      try {
        await prisma.generationJob.update({
          where: { id: job.id },
          data: {
            status: 'failed',
            error: errorMessage,
          },
        })
      } catch (updateError) {
        console.error('Failed to update job status:', updateError)
      }

      // Provide user-friendly error messages
      let userMessage = errorMessage
      if (errorMessage.includes('analyze')) {
        userMessage = 'Unable to analyze the provided image. Please ensure the image is clear and shows the subject well.'
      } else if (errorMessage.includes('prompt')) {
        userMessage = 'Unable to generate try-on description. Please try again.'
      } else if (errorMessage.includes('generate') || errorMessage.includes('Gemini')) {
        userMessage = 'Image generation service is experiencing issues. Please try again in a moment.'
      }

      throw new Error(userMessage)
    }
  } catch (error) {
    console.error('Try-on generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
