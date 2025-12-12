import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import { tryOnSchema } from '@/lib/validation'
import { checkRateLimit } from '@/lib/rate-limit'
import { getGeminiKey, getOpenAIKey } from '@/lib/config/api-keys'
import { getPresetById } from '@/lib/prompts/try-on-presets'
import { getNanoBananaPreset, buildPresetPrompt } from '@/lib/prompts/nano-banana-presets'
import { getIntelligentPreset } from '@/lib/prompts/intelligent-presets'
import { processPresetTryOn } from '@/lib/prompts/scenario-selector'
import { generateTryOn } from '@/lib/nanobanana'
import { buildEditPrompt } from '@/lib/prompts/edit-templates'
import { writePromptFromImages } from '@/lib/openai'
import { normalizeBase64 } from '@/lib/image-processing'
import { saveUpload } from '@/lib/storage'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    // Validate API keys using unified config
    try {
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
      editType,
      clothingImage,
      backgroundImage,
      accessoryImages, // NEW: accessory images
      accessoryTypes,  // NEW: accessory type labels
      model,
      stylePreset,
      userRequest,
      background,
      pose,
      expression,
      camera,
      lighting,
      addOns,
      aspectRatio: reqAspectRatio,
      resolution: reqResolution
    } = tryOnSchema.parse(body)

    // Map user-friendly model names to Gemini model IDs
    const geminiModel = model === 'pro' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image'
    console.log(`📊 Selected model: ${model} (${geminiModel})`)

    // Get preset if provided
    // NOTE: Legacy preset lookup is only for fallback paths.
    // Prefer Intelligent Presets; avoid confusing "not found" logs for new preset ids.
    const preset = stylePreset ? getPresetById(stylePreset) ?? null : null
    if (stylePreset) {
      console.log(`🎨 Preset requested: ${stylePreset}`)
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
          backgroundImage,
          editType,
        },
        settings: {
          stylePreset,
          background,
          pose,
          expression,
          camera,
          lighting,
          userRequest,
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
      const normalizedBackground = backgroundImage ? normalizeBase64(backgroundImage) : undefined

      // =========================================================================
      // INTELLIGENT PRESET SYSTEM (NEW)
      // If an intelligent preset is selected, GPT-4o mini automatically:
      // 1. Analyzes the images
      // 2. Selects the best scenario from 100 variations
      // 3. Determines edit types automatically
      // 4. Builds the final prompt
      // =========================================================================
      const intelligentPreset = stylePreset ? getIntelligentPreset(stylePreset) : null
      
      if (intelligentPreset) {
        console.log(`🧠 Using Intelligent Preset: ${intelligentPreset.name}`)
        console.log(`   Category: ${intelligentPreset.category}`)
        console.log(`   Edit Types: ${intelligentPreset.editTypes.join(', ')}`)
        console.log(`   Scenarios available: ${intelligentPreset.scenarios.length}`)

        try {
          // GPT-4o mini selects the best scenario and builds the prompt
          const presetResult = await processPresetTryOn(
            stylePreset!,
            normalizedPerson,
            normalizedClothing,
            userRequest
          )

          console.log(`✅ Selected scenario: ${presetResult.scenario.id}`)
          console.log(`   Background: ${presetResult.scenario.background.slice(0, 50)}...`)
          console.log(`   Camera: ${presetResult.scenario.camera.angle}, ${presetResult.scenario.camera.framing}`)
          console.log(`   Lighting: ${presetResult.scenario.lighting.time}, ${presetResult.scenario.lighting.quality}`)

          // Extract scene and lighting descriptions from the selected scenario
          const scenario = presetResult.scenario
          const sceneDescription = scenario.background
          const lightingDescription = `${scenario.lighting.quality} ${scenario.lighting.type} lighting, ${scenario.lighting.color.replace('_', ' ')} tones, ${scenario.lighting.time.replace('_', ' ')} atmosphere`

          console.log(`🌄 Scene: ${sceneDescription}`)
          console.log(`💡 Lighting: ${lightingDescription}`)

          // Generate the image with the intelligent preset prompt + scene/lighting
          // Always use 'clothing_change' as primary since we're doing try-on
          const generatedImage = await generateTryOn({
            personImage: normalizedPerson,
            personImages: personImages?.map(img => normalizeBase64(img)),
            editType: 'clothing_change', // Always clothing_change for try-on - scene/lighting handled via descriptions
            clothingImage: normalizedClothing,
            backgroundImage: normalizedBackground,
            accessoryImages: accessoryImages?.map(img => normalizeBase64(img)),
            accessoryTypes,
            prompt: presetResult.prompt,
            garmentDescription: presetResult.garmentDescription,
            model: geminiModel as 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview',
            aspectRatio: reqAspectRatio as any,
            resolution: reqResolution as any,
            // NEW: Pass scene and lighting from preset
            sceneDescription,
            lightingDescription,
          })

          // Save and return
          const imagePath = `tryon/${dbUser.id}/${job.id}.png`
          const imageUrl = await saveUpload(generatedImage, imagePath, 'try-ons')

          await prisma.generationJob.update({
            where: { id: job.id },
            data: {
              status: 'completed',
              outputImagePath: imageUrl,
              suggestionsJSON: {
                presetId: stylePreset,
                presetName: intelligentPreset.name,
                scenarioId: presetResult.scenario.id,
                scenarioBackground: presetResult.scenario.background,
                personDescription: presetResult.personDescription,
                garmentDescription: presetResult.garmentDescription,
              },
            },
          })

          return NextResponse.json({
            success: true,
            jobId: job.id,
            imageUrl,
            preset: {
              id: stylePreset,
              name: intelligentPreset.name,
              scenario: presetResult.scenario.id,
            },
          })
        } catch (presetError) {
          console.error('❌ Intelligent preset processing failed:', presetError)
          // Fall through to legacy processing
          console.log('⚠️ Falling back to legacy prompt generation...')
        }
      }

      // =========================================================================
      // LEGACY PRESET SYSTEM (fallback)
      // =========================================================================
      
      // Check for Nano Banana preset
      const nanoBananaPreset = stylePreset ? getNanoBananaPreset(stylePreset) : null
      if (nanoBananaPreset) {
        console.log(`🍌 Using Nano Banana preset: ${nanoBananaPreset.name}`)
      }

      // Legacy preset hints (for backward compatibility)
      const presetBackground = preset?.background
      const presetLighting = preset?.lighting
        ? `${preset.lighting.type}, ${preset.lighting.direction}, ${preset.lighting.colorTemp}`
        : undefined
      const presetCamera = preset?.camera_style
        ? `${preset.camera_style.angle}, ${preset.camera_style.lens}, ${preset.camera_style.framing}`
        : undefined
      const presetPose = preset?.pose ? `${preset.pose.stance}. Arms: ${preset.pose.arms}.` : undefined
      const presetExpression = preset?.pose?.expression

      // =========================================================================
      // STEP 1: Use GPT-4o mini to analyze images and write prompt
      // If Nano Banana preset selected, use its template with GPT descriptions
      // =========================================================================
      let finalPrompt: string
      let promptWriterResult: { personDescription: string; referenceDescription: string } | null = null

      // Check if OpenAI key is available for GPT-4o mini prompt writing
      let useGptPromptWriter = true
      try {
        getOpenAIKey()
      } catch {
        console.warn('⚠️ OpenAI key not configured, falling back to template prompts')
        useGptPromptWriter = false
      }

      if (useGptPromptWriter) {
        try {
          console.log('🤖 Using GPT-4o mini to analyze images...')
          const writerResult = await writePromptFromImages({
            personImage: normalizedPerson,
            clothingImage: normalizedClothing,
            backgroundImage: normalizedBackground,
            editType,
            userRequest: userRequest || undefined,
            model: model === 'pro' ? 'pro' : 'flash',
          })

          promptWriterResult = {
            personDescription: writerResult.personDescription,
            referenceDescription: writerResult.referenceDescription,
          }

          // If Nano Banana preset selected, use its template with GPT's descriptions
          if (nanoBananaPreset) {
            finalPrompt = buildPresetPrompt(
              nanoBananaPreset,
              writerResult.referenceDescription, // garment description
              writerResult.personDescription      // face description
            )
            console.log(`✅ Built prompt using ${nanoBananaPreset.name} preset template`)
          } else {
            // Use GPT's generated prompt directly
            finalPrompt = writerResult.prompt
            console.log('✅ Using GPT-4o mini generated prompt')
          }
        } catch (gptError) {
          console.error('❌ GPT-4o mini failed, falling back to templates:', gptError)
          finalPrompt = buildEditPrompt({
            editType,
            userRequest,
            background: nanoBananaPreset?.background ?? background ?? presetBackground,
            pose: pose ?? presetPose,
            expression: expression ?? presetExpression,
            camera: camera ?? presetCamera,
            lighting: nanoBananaPreset?.lighting ?? lighting ?? presetLighting,
            model: model === 'pro' ? 'pro' : 'flash',
          })
        }
      } else {
        // Fallback to template-based prompts
        finalPrompt = buildEditPrompt({
          editType,
          userRequest,
          background: background ?? presetBackground,
          pose: pose ?? presetPose,
          expression: expression ?? presetExpression,
          camera: camera ?? presetCamera,
          lighting: lighting ?? presetLighting,
          model: model === 'pro' ? 'pro' : 'flash',
        })
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
          editType,
          clothingImage: normalizedClothing,
          backgroundImage: normalizedBackground,
          accessoryImages: accessoryImages?.map(img => normalizeBase64(img)), // NEW: accessories
          accessoryTypes, // NEW: accessory type labels
          prompt: finalPrompt,
          garmentDescription: promptWriterResult?.referenceDescription,
          model: geminiModel as 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview',
          aspectRatio,
          resolution,
        })
        console.log('✅ Image generated successfully')
      } catch (error) {
        console.error('Image generation failed:', error)
        throw new Error('Failed to generate try-on image. Please try again.')
      }

      console.log('Saving generated image...')

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
              gptAnalysis: promptWriterResult,
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
        debug: {
          prompt: finalPrompt,
          gptAnalysis: promptWriterResult,
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
      if (errorMessage.includes('prompt')) {
        userMessage = 'Unable to build edit instructions. Please try again.'
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
