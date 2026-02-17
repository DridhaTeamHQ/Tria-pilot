/**
 * AD GENERATION API — Production Grade
 *
 * Generates AI-powered ad creatives using:
 *  - GPT-4o intelligent prompt crafting
 *  - Gemini 3 Pro Image (Nano Banana Pro) for generation
 *  - Forensic face-lock when influencer image is provided
 *  - Returns image inline for immediate display
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { tryAcquireInFlight } from '@/lib/traffic-guard'
import { rateAdCreative, generateAdCopy } from '@/lib/openai'
import { generateIntelligentAdComposition } from '@/lib/gemini'
import { GeminiRateLimitError } from '@/lib/gemini/executor'
import { saveUpload } from '@/lib/storage'
import {
  AD_PRESET_IDS,
  type AdGenerationInput,
  type AdPresetId,
  type Platform,
  type CtaType,
  type CaptionTone,
  type CharacterType,
  type FontStyle,
  type TextPlacement,
  type AspectRatio,
  validateAdInput,
} from '@/lib/ads/ad-styles'
import { buildAdPrompt } from '@/lib/ads/ad-prompt-builder'
import { buildForensicFaceAnchor } from '@/lib/tryon/face-forensics'
import { z } from 'zod'

// Increase serverless timeout for Vercel
export const maxDuration = 60

// Schema for the expanded preset-based generation
const adGenerationSchema = z
  .object({
    preset: z.enum(AD_PRESET_IDS as unknown as [string, ...string[]]),
    campaignId: z.string().max(100).optional(),

    // Image inputs
    productImage: z.string().min(1).max(15_000_000).optional(),
    influencerImage: z.string().min(1).max(15_000_000).optional(),
    lockFaceIdentity: z.boolean().optional().default(false),

    // Character config
    characterType: z
      .enum(['human_female', 'human_male', 'animal', 'none'])
      .optional()
      .default('none'),
    animalType: z.string().trim().max(50).optional(),
    characterStyle: z.string().trim().max(100).optional(),
    characterAge: z.string().trim().max(20).optional(),

    // Aspect ratio
    aspectRatio: z.enum(['1:1', '9:16', '16:9', '4:5']).optional().default('1:1'),

    // Camera angle (down, side, low, high, three-quarter, eye-level, dutch, auto)
    cameraAngle: z
      .enum(['auto', 'eye-level', 'low', 'high', 'down', 'side', 'three-quarter', 'dutch'])
      .optional()
      .default('auto'),

    // Text overlay
    textOverlay: z
      .object({
        headline: z.string().trim().max(100).optional(),
        subline: z.string().trim().max(150).optional(),
        tagline: z.string().trim().max(100).optional(),
        placement: z
          .enum(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'])
          .optional(),
        fontStyle: z.enum(['serif', 'sans-serif', 'handwritten', 'bold-display']).optional(),
      })
      .optional(),

    // Legacy text controls
    headline: z.string().trim().max(60).optional(),
    ctaType: z
      .enum(['shop_now', 'learn_more', 'explore', 'buy_now'])
      .default('shop_now'),
    captionTone: z.enum(['casual', 'premium', 'confident']).optional(),

    // Platform
    platforms: z
      .array(z.enum(['instagram', 'facebook', 'google', 'influencer']))
      .min(1),

    // Legacy subject overrides
    subject: z
      .object({
        gender: z.enum(['male', 'female', 'unisex']).optional(),
        ageRange: z.string().trim().max(40).optional(),
        pose: z.string().trim().max(120).optional(),
        expression: z.string().trim().max(120).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()

export async function POST(request: Request) {
  let inFlight: { allowed: boolean; retryAfterSeconds?: number; release?: () => Promise<void> } | null = null
  try {
    const startedAt = Date.now()
    const SOFT_DEADLINE_MS = 50_000
    const timeRemaining = () => SOFT_DEADLINE_MS - (Date.now() - startedAt)

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = createServiceClient()

    // Verify brand role
    const { data: profile } = await service
      .from('profiles')
      .select('role, brand_data, full_name')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'brand') {
      return NextResponse.json(
        { error: 'Unauthorized - Brand access required' },
        { status: 403 }
      )
    }

    // In-flight guard: one ad generation per user at a time (regulates traffic at scale)
    inFlight = await tryAcquireInFlight(user.id, 'ads')
    if (!inFlight.allowed) {
      const retry = inFlight.retryAfterSeconds ?? 15
      return NextResponse.json(
        {
          error: 'An ad is already being generated. Please wait for it to finish.',
          retryAfterSeconds: retry,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(retry), 'Cache-Control': 'no-store' },
        }
      )
    }

    // Check rate limit (per-minute; middleware also enforces for /api/ads/generate)
    const rateLimit = await checkRateLimit(user.id, 'ads')
    if (!rateLimit.allowed) {
      const retry = rateLimit.retryAfterSeconds ?? 60
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please wait a moment and try again.',
          retryAfterSeconds: retry,
          resetTime: rateLimit.resetTime,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(retry), 'Cache-Control': 'no-store' },
        }
      )
    }

    const body = await request.json().catch(() => null)
    const input = adGenerationSchema.parse(body)

    // Validate campaign if provided
    let campaignData = null
    if (input.campaignId) {
      const { data: campaign } = await service
        .from('campaigns')
        .select('*')
        .eq('id', input.campaignId)
        .single()

      if (!campaign) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
      }

      if (campaign.brand_id !== user.id) {
        return NextResponse.json(
          { error: 'Unauthorized - Campaign access denied' },
          { status: 403 }
        )
      }

      if (campaign.status === 'completed') {
        return NextResponse.json(
          { error: 'Cannot generate ads for completed campaigns' },
          { status: 400 }
        )
      }

      campaignData = { id: campaign.id, title: campaign.title }
    }

    // Build the generation input
    const generationInput: AdGenerationInput = {
      preset: input.preset as AdPresetId,
      campaignId: input.campaignId,
      productImage: input.productImage,
      influencerImage: input.influencerImage,
      lockFaceIdentity: input.lockFaceIdentity,
      characterType: input.characterType as CharacterType,
      animalType: input.animalType,
      characterStyle: input.characterStyle,
      characterAge: input.characterAge,
      aspectRatio: input.aspectRatio as AspectRatio | undefined,
      textOverlay: input.textOverlay
        ? {
            headline: input.textOverlay.headline,
            subline: input.textOverlay.subline,
            tagline: input.textOverlay.tagline,
            placement: input.textOverlay.placement as TextPlacement | undefined,
            fontStyle: input.textOverlay.fontStyle as FontStyle | undefined,
          }
        : undefined,
      headline: input.headline,
      ctaType: input.ctaType as CtaType,
      captionTone: input.captionTone as CaptionTone,
      platforms: input.platforms as Platform[],
      subject: input.subject,
    }

    // Validate with business rules
    const validation = validateAdInput(generationInput)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // ── Face forensics (only when face-lock enabled) ──
    let forensicResult = null
    if (input.lockFaceIdentity && input.influencerImage) {
      if (process.env.NODE_ENV !== 'production') console.log('[AdsAPI] Running face forensics...')
      forensicResult = await buildForensicFaceAnchor({
        personImageBase64: input.influencerImage,
        garmentDescription: 'product from ad image',
      }).catch((err) => {
        console.warn('[AdsAPI] Face forensics failed:', err)
        return null
      })
    }

    // ── Build intelligent prompt with GPT-4o VISION ──
    // GPT-4o sees the product image directly — no separate analysis needed
    if (process.env.NODE_ENV !== 'production') console.log('[AdsAPI] Building prompt with GPT-4o vision...')

    const faceAnchorText = forensicResult?.faceAnchor || null

    const { prompt: rawCompositionPrompt, fallback } = await buildAdPrompt(
      generationInput,
      input.productImage || null,
      faceAnchorText
    )

    // Prepend a hard quality-enforcement preamble optimized for Gemini 3 Pro (Nano Banana Pro).
    const hasTextContent = !!(input.textOverlay && (input.textOverlay.headline || input.textOverlay.subline || input.textOverlay.tagline))
    const noTextRule = hasTextContent ? '' : ' CRITICAL: Do NOT include any text, letters, numbers, logos, watermarks, UI, or typography anywhere in the image.'
    const QUALITY_PREAMBLE = `Create one single, production-grade ad photograph for a premium brand campaign.
The result must be photoreal, commercial, and human-shot in style (not AI-looking, not illustration, not 3D render).
Use clean composition with a clear hero subject, natural anatomy, realistic hands, and physically correct lighting.
Preserve micro details: skin texture, fabric weave, material reflections, and true-to-life color.
Professional camera language: intentional framing, depth, and focus falloff with strong subject-product readability.
Output should feel editorial plus conversion-ready, suitable for top-tier social ads and landing pages.
Avoid low-quality artifacts: blur mush, warped geometry, duplicate limbs, extra fingers, over-smoothing, posterization, and noisy edges.
Return exactly one final ad image.${noTextRule}

`

    const compositionPrompt = QUALITY_PREAMBLE + rawCompositionPrompt

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[AdsAPI] Prompt built (${fallback ? 'fallback' : 'GPT-4o'}): ${compositionPrompt.length} chars`)
    }

    // Generate ad image with Gemini
    if (process.env.NODE_ENV !== 'production') console.log('[AdsAPI] Generating ad image...')

    let generatedImage = await generateIntelligentAdComposition(
      input.productImage,
      input.influencerImage,
      compositionPrompt,
      {
        lockFaceIdentity: input.lockFaceIdentity,
        aspectRatio: input.aspectRatio as AspectRatio | undefined,
      }
    )

    // Score first pass and optionally run a quality recovery pass.
    // In production, we default to one pass to avoid 504 timeouts.
    const enableRecoveryPass = process.env.AD_ENABLE_RECOVERY_PASS === 'true'

    let rating = await rateAdCreative(generatedImage, input.productImage, input.influencerImage).catch(
      () => ({ score: 75 })
    )
    let qualityScore = Number((rating as any)?.score || 75)

    if (enableRecoveryPass && qualityScore < 82 && timeRemaining() > 18_000) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[AdsAPI] Low quality score (${qualityScore}). Running recovery pass...`)
      }

      const recoveryPrompt = `${compositionPrompt}

QUALITY RECOVERY PASS:
- Increase realism and premium finish while preserving the same concept.
- Clean edges, natural skin/fabric texture, balanced dynamic range.
- Keep a single strong focal point with ad-ready composition.
- No warped hands, no malformed anatomy, no synthetic/plastic skin.`

      const candidateImage = await generateIntelligentAdComposition(
        input.productImage,
        input.influencerImage,
        recoveryPrompt,
        {
          lockFaceIdentity: input.lockFaceIdentity,
          aspectRatio: input.aspectRatio as AspectRatio | undefined,
        }
      )

      const candidateRating = await rateAdCreative(candidateImage, input.productImage, input.influencerImage).catch(
        () => ({ score: 75 })
      )
      const candidateScore = Number((candidateRating as any)?.score || 75)

      if (candidateScore > qualityScore) {
        generatedImage = candidateImage
        rating = candidateRating
        qualityScore = candidateScore
      }
    }

    // Post-generation: copy. If we are close to timeout, skip heavy extras and return image first.
    if (process.env.NODE_ENV !== 'production') console.log('[AdsAPI] Generating ad copy...')

    const brandData = (profile.brand_data as any) || {}
    const brandName =
      brandData.companyName || profile.full_name || undefined

    const copyVariants = timeRemaining() > 8_000
      ? await generateAdCopy(generatedImage, {
          productName: input.textOverlay?.headline || input.headline || 'fashion product',
          brandName,
          niche: input.preset,
        }).catch(() => [])
      : []

    let imageUrl: string | null = null
    try {
      let contentType = 'image/jpeg'
      let fileExtension = 'jpg'
      const mimeMatch = generatedImage.match(/^data:(image\/\w+);base64,/)
      if (mimeMatch) {
        contentType = mimeMatch[1]
        if (contentType === 'image/png') fileExtension = 'png'
        else if (contentType === 'image/webp') fileExtension = 'webp'
        else if (contentType === 'image/gif') fileExtension = 'gif'
      }

      const imagePath = `${user.id}/${Date.now()}.${fileExtension}`
      imageUrl = await saveUpload(
        generatedImage,
        imagePath,
        'ads',
        contentType
      )
    } catch (uploadErr) {
      // Upload failed but we still have the image — log and continue
      console.warn('[AdsAPI] Storage upload failed (non-fatal, returning inline image):', uploadErr)
    }

    // ── Save to DB (only if we have a URL) ──
    let adCreativeId: string | null = null
    if (imageUrl) {
      const { data: adCreative, error: insertError } = await service
        .from('ad_creatives')
        .insert({
          brand_id: user.id,
          image_url: imageUrl,
          title:
            input.textOverlay?.headline ||
            input.headline ||
            `${input.preset} Ad`,
          prompt: compositionPrompt,
          campaign_id: campaignData?.id || null,
          platform: input.platforms[0] || 'instagram',
          status: 'generated',
          rating: qualityScore,
        })
        .select()
        .single()

      if (insertError) {
        console.error('Ad creative insert error:', insertError)
      }
      adCreativeId = adCreative?.id || null
    }

    // Return image data inline for immediate display — works even if upload failed
    return NextResponse.json({
      id: adCreativeId || crypto.randomUUID(),
      imageUrl: imageUrl || null,
      imageBase64: generatedImage, // inline for immediate rendering — ALWAYS available
      copy: copyVariants,
      rating,
      qualityScore,
      preset: input.preset,
      promptUsed: fallback ? 'fallback' : 'gpt-4o',
    })
  } catch (error) {
    console.error('Ad generation error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof GeminiRateLimitError) {
      const retryAfterSeconds = Math.min(
        60,
        Math.ceil((error.retryAfterMs ?? 30_000) / 1000)
      ) || 30
      return NextResponse.json(
        {
          error: error.message || 'Rate limit reached. Please retry shortly.',
          code: 'RATE_LIMIT',
          retryAfterSeconds,
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

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  } finally {
    void inFlight?.release?.()
  }
}

