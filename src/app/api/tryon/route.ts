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
import { getVariantSpec, buildVariantPromptModifier, VARIANT_IDENTITY_LOCK, logVariantGeneration } from '@/lib/tryon/variant-specs'

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

      // Generate 3 variants in parallel for user selection
      const VARIANT_COUNT = 3
      console.log(`🎬 Generating ${VARIANT_COUNT} variants in parallel...`)

      const variantPromises = Array.from({ length: VARIANT_COUNT }, (_, variantIndex) =>
        (async () => {
          const MAX_RETRIES = 2
          const RETRY_DELAYS = [1000, 2000]

          let result: Awaited<ReturnType<typeof runTryOnPipelineV3>> | null = null
          let lastError: Error | null = null

          for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
              if (attempt > 0) {
                console.log(`🔄 Variant ${variantIndex + 1}: Retry attempt ${attempt + 1}/${MAX_RETRIES}...`)
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt - 1]))
              }

              // Get variant-specific settings
              const variantSpec = getVariantSpec(variantIndex)
              logVariantGeneration(job.id, variantSpec)

              // Build variant-specific prompt additions
              const variantPromptAddition = `${VARIANT_IDENTITY_LOCK}\n\n${buildVariantPromptModifier(variantSpec)}`

              console.log(`🎬 Running variant ${variantSpec.id} - ${variantSpec.name} (attempt ${attempt + 1})...`)
              result = await runTryOnPipelineV3({
                subjectImageBase64: normalizedPerson,
                clothingRefBase64: normalizedClothing,
                preset,
                userRequest: userRequest ? `${userRequest}\n\n${variantPromptAddition}` : variantPromptAddition,
                quality: {
                  quality: model === 'pro' ? 'high' : 'fast',
                  aspectRatio: (reqAspectRatio || '4:5') as any,
                  resolution: (reqResolution || '2K') as any,
                },
              })
              break
            } catch (err) {
              lastError = err instanceof Error ? err : new Error(String(err))
              console.error(`❌ Variant ${variantIndex + 1} attempt ${attempt + 1} failed:`, lastError.message)
              if (lastError.message.includes('Invalid') ||
                lastError.message.includes('required') ||
                lastError.message.includes('Unauthorized')) {
                break
              }
            }
          }

          if (!result) {
            console.error(`❌ Variant ${variantIndex + 1} failed completely`)
            return null
          }

          return { variantIndex, result }
        })()
      )

      const variantResults = await Promise.all(variantPromises)
      const successfulVariants = variantResults.filter(v => v !== null) as Array<{ variantIndex: number, result: Awaited<ReturnType<typeof runTryOnPipelineV3>> }>

      if (successfulVariants.length === 0) {
        throw new Error('All variant generations failed. Please try again.')
      }

      console.log(`✅ Generated ${successfulVariants.length}/${VARIANT_COUNT} variants successfully`)

      // Save all variants and build response
      const variants: Array<{ imageUrl?: string; base64Image: string; variantId: number; label: string }> = []

      for (const { variantIndex, result } of successfulVariants) {
        const generatedImage = result.image
        const variantSpec = getVariantSpec(variantIndex)
        const imagePath = `tryon/${dbUser.id}/${job.id}_v${variantSpec.id}.png`
        let imageUrl: string | null = null

        try {
          imageUrl = await saveUpload(generatedImage, imagePath, 'try-ons')
          console.log(`✓ Variant ${variantSpec.id} saved to storage`)
        } catch (err) {
          console.warn(`⚠️ Variant ${variantSpec.id} storage failed, using base64`)
        }

        variants.push({
          imageUrl: imageUrl || undefined,
          base64Image: generatedImage,
          variantId: variantIndex,
          label: variantSpec.label, // e.g. "Warm • Medium"
        })
      }

      // Use first variant as primary
      const primaryVariant = variants[0]

      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          outputImagePath: primaryVariant.imageUrl || 'base64://' + primaryVariant.base64Image.substring(0, 50) + '...',
          suggestionsJSON: {
            presetId: stylePreset || null,
            presetName: presetV3?.name || null,
            prompt_text: successfulVariants[0].result.debug.shootPlanText,
            timeMs: successfulVariants[0].result.debug.timeMs,
            variantCount: variants.length,
          },
        },
      })

      return NextResponse.json({
        success: true,
        jobId: job.id,
        imageUrl: primaryVariant.imageUrl || undefined,
        base64Image: primaryVariant.base64Image,
        variants: variants, // All 3 variants for UI selection
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
