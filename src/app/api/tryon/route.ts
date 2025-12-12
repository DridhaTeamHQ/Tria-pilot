import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import { tryOnSchema } from '@/lib/validation'
import { checkRateLimit } from '@/lib/rate-limit'
import { getGeminiKey } from '@/lib/config/api-keys'
import { getPresetById } from '@/lib/prompts/try-on-presets'
import { generateTryOn } from '@/lib/nanobanana'
import { buildEditPrompt } from '@/lib/prompts/edit-templates'
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

      // Merge preset hints into simple fields (optional)
      const presetBackground = preset?.background
      const presetLighting = preset?.lighting
        ? `${preset.lighting.type}, ${preset.lighting.direction}, ${preset.lighting.colorTemp}`
        : undefined
      const presetCamera = preset?.camera_style
        ? `${preset.camera_style.angle}, ${preset.camera_style.lens}, ${preset.camera_style.framing}`
        : undefined
      const presetPose = preset?.pose ? `${preset.pose.stance}. Arms: ${preset.pose.arms}.` : undefined
      const presetExpression = preset?.pose?.expression

      const finalPrompt = buildEditPrompt({
        editType,
        userRequest,
        background: background ?? presetBackground,
        pose: pose ?? presetPose,
        expression: expression ?? presetExpression,
        camera: camera ?? presetCamera,
        lighting: lighting ?? presetLighting,
        model: model === 'pro' ? 'pro' : 'flash',
      })

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
