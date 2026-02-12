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
  let inFlight: { allowed: boolean; retryAfterSeconds?: number; release?: () => void } | null = null
  try {
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
    inFlight = tryAcquireInFlight(user.id, 'ads')
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
    const rateLimit = checkRateLimit(user.id, 'ads')
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
    // Uses narrative description style that Gemini responds best to.
    const hasTextContent = !!(input.textOverlay && (input.textOverlay.headline || input.textOverlay.subline || input.textOverlay.tagline))
    const noTextRule = hasTextContent ? '' : ' CRITICAL: Do NOT include ANY text, words, letters, numbers, brand names, slogans, or typography anywhere in the image. This is a photography-only image with ZERO written content.'
    const QUALITY_PREAMBLE = `Generate a stunning, campaign-grade photorealistic advertising photograph that could appear in Vogue, GQ, or a Nike global campaign. The image must look like it was captured by a professional photographer with high-end equipment — not AI-generated, not illustrated, not a digital render. Use a precise, intentional camera angle (down, side, low, high, or three-quarter as appropriate) for maximum impact. Every surface has realistic texture: skin has visible pores, fabric has weave, metal has accurate reflections. Anatomy is correct, hands are natural, proportions are human. Lighting is physically accurate with proper shadow falloff. Resolution 8K, tack-sharp focus on subject and product. No watermarks, no artifacts, no distortion, no extra limbs.${noTextRule}\n\n`

    const compositionPrompt = QUALITY_PREAMBLE + rawCompositionPrompt

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[AdsAPI] Prompt built (${fallback ? 'fallback' : 'GPT-4o'}): ${compositionPrompt.length} chars`)
    }

    // ── Generate ad image with Gemini ──
    if (process.env.NODE_ENV !== 'production') console.log('[AdsAPI] Generating ad image...')

    const generatedImage = await generateIntelligentAdComposition(
      input.productImage,
      input.influencerImage,
      compositionPrompt,
      {
        lockFaceIdentity: input.lockFaceIdentity,
        aspectRatio: input.aspectRatio as AspectRatio | undefined,
      }
    )

    // ── Post-generation: rate + copy (parallel) ──
    if (process.env.NODE_ENV !== 'production') console.log('[AdsAPI] Rating and generating copy...')

    const brandData = (profile.brand_data as any) || {}
    const brandName =
      brandData.companyName || profile.full_name || undefined

    const [rating, copyVariants] = await Promise.all([
      rateAdCreative(generatedImage, input.productImage, input.influencerImage).catch(
        () => ({ score: 75 })
      ),
      generateAdCopy(generatedImage, {
        productName: input.textOverlay?.headline || input.headline || 'fashion product',
        brandName,
        niche: input.preset,
      }).catch(() => []),
    ])

    // ── Save to storage (non-fatal — image is already generated) ──
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
          rating: (rating as any)?.score || 75,
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
      qualityScore: (rating as any)?.score || 75,
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

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  } finally {
    inFlight?.release?.()
  }
}
