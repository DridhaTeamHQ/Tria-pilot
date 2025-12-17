import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import { tryOnSchema } from '@/lib/validation'
import { checkRateLimit } from '@/lib/rate-limit'
import { getGeminiKey } from '@/lib/config/api-keys'
import { getTryOnPresetV3 } from '@/lib/tryon/presets'
import { normalizeBase64 } from '@/lib/image-processing'
import { runTryOnPipelineV3 } from '@/lib/tryon/pipeline'
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

    const presetV3 = stylePreset ? getTryOnPresetV3(stylePreset) : undefined
    if (stylePreset) {
      console.log(`🎨 Preset: ${stylePreset} → ${presetV3?.name || 'NOT FOUND'}`)
      if (presetV3) {
        console.log(`📸 Background: "${presetV3.background_name}"`)
      }
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
      const normalizedIdentityImages = (personImages || []).map((img) => normalizeBase64(img))

      if (!normalizedClothing) {
        throw new Error('Clothing image is required for try-on')
      }

      const preset = presetV3
        ? {
            id: presetV3.id,  // Pass preset ID for scene lookup
            pose_name: presetV3.pose_name,
            lighting_name: presetV3.lighting_name,
            background_name: presetV3.background_name,
            style_pack: presetV3.style_pack,
            background_focus: presetV3.background_focus,
          }
        : {
            id: undefined,
            pose_name: pose ?? 'keep the subject pose unchanged',
            lighting_name: lighting ?? 'match the original photo lighting',
            background_name: background ?? 'keep the original background',
            style_pack: 'candid_iphone',
            background_focus: 'moderate_bokeh',
          }

      console.log(`🎬 Running fast pipeline...`)
      const result = await runTryOnPipelineV3({
        subjectImageBase64: normalizedPerson,
        clothingRefBase64: normalizedClothing,
        identityImagesBase64: normalizedIdentityImages,
        preset,
        userRequest: userRequest || undefined,
        quality: {
          quality: model === 'pro' ? 'high' : 'fast',
          aspectRatio: (reqAspectRatio || '4:5') as any,
          resolution: (reqResolution || '2K') as any,
        },
      })

      const generatedImage = result.image

      console.log('Saving generated image...')

      const imagePath = `tryon/${dbUser.id}/${job.id}.png`
      const imageUrl = await saveUpload(generatedImage, imagePath, 'try-ons')

      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          outputImagePath: imageUrl,
          suggestionsJSON: {
            presetId: stylePreset || null,
            presetName: presetV3?.name || null,
            prompt_text: result.debug.shootPlanText,
            timeMs: result.debug.timeMs,
          },
        },
      })

      return NextResponse.json({
        success: true,
        jobId: job.id,
        imageUrl,
        preset: presetV3
          ? {
              id: presetV3.id,
              name: presetV3.name,
              category: presetV3.category,
            }
          : null,
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
