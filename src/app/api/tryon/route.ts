import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import { tryOnSchema } from '@/lib/validation'
import { getTryOnPresetV3 } from '@/lib/tryon/presets'
import { getRedisConnection, isRedisConfigured } from '@/lib/queue/redis'
import { normalizeBase64 } from '@/lib/image-processing'
import { saveUpload } from '@/lib/storage'
import { runHybridTryOnPipeline } from '@/lib/tryon/hybrid-tryon-pipeline'
import { GeminiRateLimitError } from '@/lib/gemini/executor'

export const maxDuration = 60
const TRYON_RATE_LIMIT_DISABLED = true
const USER_LOCK_TTL_SECONDS = 75
const GLOBAL_ACTIVE_TTL_SECONDS = 75
const GLOBAL_ACTIVE_LIMIT = Math.max(
  1,
  Number.parseInt(process.env.TRYON_INLINE_GLOBAL_LIMIT || '8', 10) || 8
)
const GLOBAL_ACTIVE_KEY = 'tryon:inline:active_generations'

export async function POST(request: Request) {
  let redisUserLockKey: string | null = null
  let redisGlobalAcquired = false
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = createServiceClient()

    if (process.env.NODE_ENV !== 'production') {
      console.log('🔑 Auth check:', { sessionUserId: authUser.id })
    }

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

    if (process.env.NODE_ENV !== 'production') {
      console.log('📋 User Status Check:', { userId: authUser.id, role: currentProfile?.role, status: currentProfile?.approval_status })
    }

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
      if (process.env.NODE_ENV !== 'production') console.log('🔧 Auto-creating InfluencerProfile for approved user:', authUser.id)
      try {
        await service
          .from('influencer_profiles')
          .insert({
            user_id: authUser.id,
            niches: [],
            socials: {},
          })
        if (process.env.NODE_ENV !== 'production') console.log('✅ InfluencerProfile created')
      } catch (profileError) {
        console.error('Failed to create InfluencerProfile:', profileError)
      }
    }

    const userId = authUser.id
    if (process.env.NODE_ENV !== 'production') console.log('✅ User verified, generating try-on:', { userId })

    // Lightweight per-user guard: prevents double-click/duplicate tabs from starting parallel generations.
    if (!TRYON_RATE_LIMIT_DISABLED && isRedisConfigured()) {
      try {
        const redis = getRedisConnection()
        redisUserLockKey = `tryon:user:${userId}:generating`
        const lockResult = await redis.set(redisUserLockKey, '1', 'EX', USER_LOCK_TTL_SECONDS, 'NX')
        if (lockResult !== 'OK') {
          return NextResponse.json(
            {
              error: 'A try-on is already in progress. Please wait for it to finish.',
              code: 'JOB_IN_PROGRESS',
              retryAfterSeconds: 10,
            },
            { status: 429, headers: { 'Retry-After': '10', 'Cache-Control': 'no-store' } }
          )
        }
      } catch (redisErr) {
        // Fail open if Redis is unavailable: keep generation working instead of hard-failing requests.
        console.warn('[tryon] user lock unavailable, continuing without lock:', redisErr)
        redisUserLockKey = null
      }
    }

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

    if (!personImage || !clothingImage) {
      return NextResponse.json({ error: 'Both person and clothing images are required.' }, { status: 400 })
    }

    const presetV3 = stylePreset ? getTryOnPresetV3(stylePreset) : undefined

    // Create generation job first (authoritative state in DB)
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
          aspectRatio: reqAspectRatio ?? '1:1',
          resolution: reqResolution ?? '2K',
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

    // Run inline generation directly.
    try {
      await service
        .from('generation_jobs')
        .update({ status: 'processing', error_message: null })
        .eq('id', job.id)

      // Global guard: cap concurrent inline generations so bursts return a clean "server busy" instead of collapsing.
      if (!TRYON_RATE_LIMIT_DISABLED && process.env.NODE_ENV === 'production' && isRedisConfigured()) {
        try {
          const redis = getRedisConnection()
          const activeCount = await redis.incr(GLOBAL_ACTIVE_KEY)
          redisGlobalAcquired = true
          if (activeCount === 1) {
            await redis.expire(GLOBAL_ACTIVE_KEY, GLOBAL_ACTIVE_TTL_SECONDS)
          }
          if (activeCount > GLOBAL_ACTIVE_LIMIT) {
            await redis.decr(GLOBAL_ACTIVE_KEY)
            redisGlobalAcquired = false
            await service
              .from('generation_jobs')
              .update({
                status: 'failed',
                error_message: 'Server busy, please wait and retry.',
              })
              .eq('id', job.id)
            return NextResponse.json(
              {
                error: 'Server busy, please wait and retry.',
                code: 'SERVER_BUSY',
                retryAfterSeconds: 10,
                jobId: job.id,
              },
              { status: 429, headers: { 'Retry-After': '10', 'Cache-Control': 'no-store' } }
            )
          }
        } catch (redisErr) {
          // Fail open on Redis global guard issues; Gemini/DB errors are still handled below.
          console.warn('[tryon] global guard unavailable, continuing without cap:', redisErr)
          redisGlobalAcquired = false
        }
      }

      const normalizedPerson = normalizeBase64(personImage)
      const normalizedClothing = normalizeBase64(clothingImage)
      const pipelineResult = await runHybridTryOnPipeline({
        personImageBase64: normalizedPerson,
        clothingImageBase64: normalizedClothing,
        aspectRatio: reqAspectRatio ?? '1:1',
        preset,
        userRequest: userRequest || undefined,
        productId: null,
      })

      let imageUrl: string | null = null
      const imagePath = `tryon/${userId}/${job.id}.png`
      if (pipelineResult.image) {
        try {
          imageUrl = await saveUpload(pipelineResult.image, imagePath, 'try-ons')
        } catch {
          // non-fatal
        }
      }

      await service
        .from('generation_jobs')
        .update({
          status: 'completed',
          output_image_path: imageUrl || 'base64://' + pipelineResult.image,
          settings: {
            ...(job.settings as object),
            outcome: {
              pipeline: 'nano-banana-pro-inline',
              status: pipelineResult.status,
              totalTimeMs: pipelineResult.debug?.totalTimeMs,
              promptLength: pipelineResult.debug?.promptUsed?.length || 0,
              warnings: pipelineResult.warnings,
            },
          },
        })
        .eq('id', job.id)

      return NextResponse.json({
        success: true,
        jobId: job.id,
        status: 'completed',
        imageUrl: imageUrl || undefined,
        base64Image: pipelineResult.image,
        variants: [
          {
            imageUrl: imageUrl || undefined,
            base64Image: pipelineResult.image,
            variantId: 0,
            label: 'Nano Banana Pro',
          },
        ],
        preset: presetV3
          ? { id: presetV3.id, name: presetV3.name, category: presetV3.category }
          : null,
      })
    } catch (inlineError) {
      if (inlineError instanceof GeminiRateLimitError) {
        const retryAfterSeconds = Math.min(60, Math.ceil((inlineError.retryAfterMs || 30_000) / 1000)) || 30
        await service
          .from('generation_jobs')
          .update({
            status: 'failed',
            error_message: inlineError.message || 'Rate limit reached. Please retry shortly.',
          })
          .eq('id', job.id)
        return NextResponse.json(
          {
            error: inlineError.message || 'Rate limit reached. Please retry shortly.',
            code: 'RATE_LIMIT',
            retryAfterSeconds,
            jobId: job.id,
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(retryAfterSeconds),
              'Cache-Control': 'no-store',
            },
          }
        )
      }

      const errMsg = inlineError instanceof Error ? inlineError.message : 'Generation failed'
      await service
        .from('generation_jobs')
        .update({ status: 'failed', error_message: errMsg })
        .eq('id', job.id)
      return NextResponse.json(
        { error: errMsg, jobId: job.id, status: 'failed' },
        { status: 500 }
      )
    } finally {
      if (isRedisConfigured() && redisGlobalAcquired) {
        try {
          const redis = getRedisConnection()
          const remaining = await redis.decr(GLOBAL_ACTIVE_KEY)
          redisGlobalAcquired = false
          if (remaining < 0) {
            await redis.set(GLOBAL_ACTIVE_KEY, '0')
          }
        } catch (releaseErr) {
          console.warn('[tryon] failed to release global active counter:', releaseErr)
        }
      }
    }
  } catch (error) {
    console.error('Try-on generation error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    if (isRedisConfigured() && redisUserLockKey) {
      try {
        const redis = getRedisConnection()
        await redis.del(redisUserLockKey)
      } catch (releaseErr) {
        console.warn('[tryon] failed to release user lock:', releaseErr)
      }
    }
  }
}
