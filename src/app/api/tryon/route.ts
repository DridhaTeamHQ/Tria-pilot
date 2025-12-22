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
      // NOTE: identityImages (personImages) are no longer used in new architecture
      // Identity comes from person image only (pixel-level)

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

      // Retry logic with exponential backoff
      const MAX_RETRIES = 3
      const RETRY_DELAYS = [1000, 2000, 4000] // ms

      let result: Awaited<ReturnType<typeof runTryOnPipelineV3>> | null = null
      let lastError: Error | null = null

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`🔄 Retry attempt ${attempt + 1}/${MAX_RETRIES}...`)
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt - 1]))
          }

          console.log(`🎬 Running try-on pipeline (attempt ${attempt + 1})...`)
          result = await runTryOnPipelineV3({
            subjectImageBase64: normalizedPerson,
            clothingRefBase64: normalizedClothing, // Used for analysis only, never sent to Gemini
            preset,
            userRequest: userRequest || undefined,
            quality: {
              quality: model === 'pro' ? 'high' : 'fast',
              aspectRatio: (reqAspectRatio || '4:5') as any,
              resolution: (reqResolution || '2K') as any,
            },
          })

          // Success - break out of retry loop
          break
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err))
          console.error(`❌ Attempt ${attempt + 1} failed:`, lastError.message)

          // Don't retry on certain errors
          if (lastError.message.includes('Invalid') ||
            lastError.message.includes('required') ||
            lastError.message.includes('Unauthorized')) {
            break
          }
        }
      }

      if (!result) {
        throw lastError || new Error('Generation failed after multiple attempts')
      }

      const generatedImage = result.image

      console.log('Saving generated image...')

      const imagePath = `tryon/${dbUser.id}/${job.id}.png`
      let imageUrl: string | null = null
      let storageError: Error | null = null
      
      // Try to upload to storage, but don't fail if it doesn't work
      try {
        imageUrl = await saveUpload(generatedImage, imagePath, 'try-ons')
        console.log('✓ Image saved to storage:', imageUrl)
      } catch (err) {
        storageError = err instanceof Error ? err : new Error(String(err))
        console.error('⚠️  Storage upload failed, but generation succeeded:', storageError)
        console.warn('Returning base64 image instead. Storage issue:', storageError.message)
        // Continue without storage URL - we'll return base64 instead
        // This allows the user to still see their generated image
      }

      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          outputImagePath: imageUrl || 'base64://' + generatedImage.substring(0, 50) + '...', // Store a marker if storage failed
          suggestionsJSON: {
            presetId: stylePreset || null,
            presetName: presetV3?.name || null,
            prompt_text: result.debug.shootPlanText,
            timeMs: result.debug.timeMs,
            storageError: imageUrl ? null : (storageError?.message || 'Storage upload failed'),
          },
        },
      })

      return NextResponse.json({
        success: true,
        jobId: job.id,
        imageUrl: imageUrl || undefined, // Only include if storage succeeded
        base64Image: generatedImage, // Always include base64 as fallback
        preset: presetV3
          ? {
            id: presetV3.id,
            name: presetV3.name,
            category: presetV3.category,
          }
          : null,
        warning: imageUrl ? undefined : 'Image generated successfully but could not be saved to storage. Using base64 format.',
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
