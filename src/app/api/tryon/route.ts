import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import { tryOnSchema } from '@/lib/validation'
import {
  checkGenerationGate,
  completeGeneration,
} from '@/lib/generation-limiter'
import { getGeminiKey } from '@/lib/config/api-keys'
import { getTryOnPresetV3 } from '@/lib/tryon/presets'
import { normalizeBase64 } from '@/lib/image-processing'
import { saveUpload } from '@/lib/storage'
import { runHybridTryOnPipeline } from '@/lib/tryon/hybrid-tryon-pipeline'

// Allow up to 60s for the full try-on pipeline (scene intel + generation + retry)
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    // Validate API keys
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

    const service = createServiceClient()

    console.log('🔑 Auth check:', {
      sessionUserId: authUser.id,
      sessionEmail: authUser.email,
    })

    // Get profile from Supabase profiles table (SOURCE OF TRUTH)
    const { data: profile, error: profileError } = await service
      .from('profiles')
      .select('id, email, role, approval_status, onboarding_completed')
      .eq('id', authUser.id)
      .single()

    if (profileError || !profile) {
      console.error("❌ FATAL: Profile not found for user!", {
        sessionUserId: authUser.id,
        error: profileError
      })
      // Attempt to auto-create profile if missing (fallback)
      const { data: newProfile, error: createError } = await service
        .from('profiles')
        .insert({
          id: authUser.id,
          email: authUser.email,
          role: 'influencer',
          approval_status: 'pending',
          onboarding_completed: false
        })
        .select()
        .single()

      if (createError) {
        return NextResponse.json({
          code: 'USER_NOT_FOUND',
          message: 'User initialization failed. Please log out and log in again.',
        }, { status: 400 })
      }
    }

    const currentProfile = profile

    console.log('📋 User Status Check:', {
      userId: authUser.id,
      role: currentProfile?.role,
      status: currentProfile?.approval_status,
    })

    // Check approval status
    if ((currentProfile?.approval_status || '').toLowerCase() !== 'approved') {
      return NextResponse.json({
        code: 'NOT_APPROVED',
        message: `Your account is ${currentProfile?.approval_status?.toLowerCase() || 'pending'}. Please wait for admin approval.`,
      }, { status: 403 })
    }

    const role = (currentProfile?.role || 'influencer').toLowerCase()

    if (role !== 'influencer') {
      return NextResponse.json({
        code: 'PROFILE_INCOMPLETE',
        message: 'Influencer account required for try-on generation.',
      }, { status: 403 })
    }

    // Check InfluencerProfile exists
    const { data: influencerProfile } = await service
      .from('influencer_profiles')
      .select('id')
      .eq('user_id', authUser.id)
      .single()

    // Auto-create InfluencerProfile if missing
    if (!influencerProfile) {
      console.log('🔧 Auto-creating InfluencerProfile for approved user:', authUser.id)
      try {
        await service
          .from('influencer_profiles')
          .insert({
            user_id: authUser.id,
            niches: [],
            socials: {},
          })
        console.log('✅ InfluencerProfile created')
      } catch (profileError) {
        console.error('Failed to create InfluencerProfile:', profileError)
      }
    }

    const userId = authUser.id
    console.log('✅ User verified, starting generation:', { userId })

    // Rate limiting
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const clientIp = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown'

    const gateResult = checkGenerationGate(userId, clientIp)

    if (!gateResult.allowed) {
      return NextResponse.json(
        {
          error: gateResult.blockReason || 'Generation not allowed',
          remainingToday: gateResult.remainingToday,
        },
        { status: 429 }
      )
    }

    const generationRequestId = gateResult.requestId

    const body = await request.json().catch(() => null)
    const {
      personImage,
      clothingImage,
      backgroundImage,
      editType,
      stylePreset,
      userRequest,
      background,
      pose,
      lighting,
      aspectRatio: reqAspectRatio,
      resolution: reqResolution
    } = tryOnSchema.parse(body)

    const presetV3 = stylePreset ? getTryOnPresetV3(stylePreset) : undefined
    if (stylePreset) {
      console.log(`🎨 Preset: ${stylePreset} → ${presetV3?.name || 'NOT FOUND'}`)
    }

    // Create generation job
    const { data: job, error: jobError } = await service
      .from('generation_jobs')
      .insert({
        user_id: userId,
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
          lighting,
          userRequest,
          model: 'gemini-3-pro-image-preview',
        },
        status: 'pending',
      })
      .select()
      .single()

    if (jobError || !job) {
      console.error("❌ FATAL: Failed to create GenerationJob!", jobError)
      return NextResponse.json({
        code: 'JOB_CREATION_FAILED',
        message: 'Failed to start generation job. Please try again.',
      }, { status: 500 })
    }

    try {
      console.log('🚀 Starting Nano Banana Pro pipeline for job:', job.id)

      // Normalize images
      let normalizedPerson: string
      let normalizedClothing: string | undefined

      try {
        normalizedPerson = normalizeBase64(personImage)
      } catch (error) {
        throw new Error(`Invalid person image: ${error instanceof Error ? error.message : 'Invalid image data'}`)
      }

      try {
        normalizedClothing = clothingImage ? normalizeBase64(clothingImage) : undefined
      } catch (error) {
        throw new Error(`Invalid clothing image: ${error instanceof Error ? error.message : 'Invalid image data'}`)
      }

      if (!normalizedClothing) {
        throw new Error('Clothing image is required for try-on')
      }

      // Build preset config
      const preset = presetV3
        ? {
          id: presetV3.id,
          background_name: presetV3.background_name,
          lighting_name: presetV3.lighting_name,
        }
        : {
          id: undefined,
          background_name: background ?? 'keep the original background',
          lighting_name: lighting ?? 'match the original photo lighting',
        }

      // ═══════════════════════════════════════════════════════════════
      // SINGLE PIPELINE: Nano Banana Pro (always)
      // ═══════════════════════════════════════════════════════════════
      const pipelineResult = await runHybridTryOnPipeline({
        personImageBase64: normalizedPerson,
        clothingImageBase64: normalizedClothing,
        aspectRatio: reqAspectRatio ?? '1:1',
        preset,
        userRequest: userRequest || undefined,
        productId: null,
      })

      // Save to storage
      let imageUrl: string | null = null
      const imagePath = `tryon/${userId}/${job.id}.png`

      try {
        if (pipelineResult.image) {
          imageUrl = await saveUpload(pipelineResult.image, imagePath, 'try-ons')
          console.log(`✓ Saved to storage`)
        }
      } catch (saveErr) {
        console.warn('⚠️ Storage save failed, using base64 fallback')
      }

      completeGeneration(userId, generationRequestId, 'success', 1)

      // Update job status — NO TRUNCATION
      await service
        .from('generation_jobs')
        .update({
          status: 'completed',
          output_image_path: imageUrl || 'base64://' + pipelineResult.image,
          settings: {
            ...(job.settings as object),
            outcome: {
              pipeline: 'nano-banana-pro',
              status: pipelineResult.status,
              totalTimeMs: pipelineResult.debug.totalTimeMs,
              promptLength: pipelineResult.debug.promptUsed?.length || 0,
              warnings: pipelineResult.warnings,
            }
          }
        })
        .eq('id', job.id)

      return NextResponse.json({
        success: true,
        jobId: job.id,
        imageUrl: imageUrl || undefined,
        base64Image: pipelineResult.image,
        status: pipelineResult.status,
        warnings: pipelineResult.warnings,
        remainingToday: gateResult.remainingToday - 1,
        variants: [{
          imageUrl: imageUrl || undefined,
          base64Image: pipelineResult.image,
          variantId: 0,
          label: 'Nano Banana Pro'
        }],
        preset: presetV3
          ? {
            id: presetV3.id,
            name: presetV3.name,
            category: presetV3.category,
          }
          : null,
        debug: {
          pipeline: 'nano-banana-pro',
          totalTimeMs: pipelineResult.debug.totalTimeMs,
          promptLength: pipelineResult.debug.promptUsed?.length || 0,
        }
      })
    } catch (error) {
      console.error('❌ Try-on generation failed for job:', job.id)
      console.error('Error:', error)

      completeGeneration(userId, generationRequestId, 'failed', 0)

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

      try {
        await service
          .from('generation_jobs')
          .update({
            status: 'failed',
            error_message: errorMessage,
          })
          .eq('id', job.id)
      } catch (updateError) {
        console.error('Failed to update job status:', updateError)
      }

      let userMessage = errorMessage
      if (errorMessage.includes('prompt')) {
        userMessage = 'Unable to build edit instructions. Please try again.'
      } else if (errorMessage.includes('generate') || errorMessage.includes('Gemini')) {
        userMessage = 'Image generation service is experiencing issues. Please try again in a moment.'
      }

      // Timeout / quota / rate limit → return 503 with Retry-After so client shows "wait and retry" instead of generic error
      const isTimeoutOrLimit =
        /timed out|timeout|quota|rate limit|too many requests/i.test(errorMessage)
      if (isTimeoutOrLimit) {
        const retrySec = 60
        return NextResponse.json(
          {
            error:
              'Request timed out or rate limit reached. Please wait a minute and try again.',
            retryAfterSeconds: retrySec,
          },
          {
            status: 503,
            headers: {
              'Retry-After': String(retrySec),
              'Cache-Control': 'no-store',
            },
          }
        )
      }

      throw new Error(userMessage)
    }
  } catch (error) {
    console.error('Try-on generation error:', error)
    const msg = error instanceof Error ? error.message : 'Internal server error'
    // If outer catch sees a timeout-like message, return 503 so client can show retry UI
    if (/timed out|timeout/i.test(msg)) {
      const retrySec = 60
      return NextResponse.json(
        {
          error: 'Request timed out. Please wait a minute and try again.',
          retryAfterSeconds: retrySec,
        },
        {
          status: 503,
          headers: { 'Retry-After': String(retrySec), 'Cache-Control': 'no-store' },
        }
      )
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
