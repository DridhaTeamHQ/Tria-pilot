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
import { analyzeClothingImage, rateAdCreative, generateAdCopy } from '@/lib/openai'
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

    // Check rate limit
    const rateLimit = checkRateLimit(user.id, 'ads')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', resetTime: rateLimit.resetTime },
        { status: 429 }
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

    // ── Parallel stage: product analysis + face forensics ──
    console.log('[AdsAPI] Starting parallel analysis...')

    const analysisPromises: Promise<any>[] = []

    // Product analysis
    const productAnalysisPromise = input.productImage
      ? analyzeClothingImage(input.productImage).catch((err) => {
          console.warn('[AdsAPI] Product analysis failed:', err)
          return null
        })
      : Promise.resolve(null)
    analysisPromises.push(productAnalysisPromise)

    // Face forensics (only when face-lock is enabled with influencer image)
    const faceAnchorPromise =
      input.lockFaceIdentity && input.influencerImage
        ? buildForensicFaceAnchor({
            personImageBase64: input.influencerImage,
            garmentDescription: 'product from ad image',
          }).catch((err) => {
            console.warn('[AdsAPI] Face forensics failed:', err)
            return null
          })
        : Promise.resolve(null)
    analysisPromises.push(faceAnchorPromise)

    const [productAnalysis, forensicResult] = await Promise.all(analysisPromises)

    // ── Build intelligent prompt with GPT-4o ──
    console.log('[AdsAPI] Building prompt with GPT-4o...')

    const faceAnchorText = forensicResult?.faceAnchor || null

    const { prompt: compositionPrompt, fallback } = await buildAdPrompt(
      generationInput,
      productAnalysis,
      faceAnchorText
    )

    console.log(
      `[AdsAPI] Prompt built (${fallback ? 'fallback' : 'GPT-4o'}): ${compositionPrompt.length} chars`
    )

    // ── Generate ad image with Gemini ──
    console.log('[AdsAPI] Generating ad image...')

    const generatedImage = await generateIntelligentAdComposition(
      input.productImage,
      input.influencerImage,
      compositionPrompt,
      { lockFaceIdentity: input.lockFaceIdentity }
    )

    // ── Post-generation: rate + copy (parallel) ──
    console.log('[AdsAPI] Rating and generating copy...')

    const brandData = (profile.brand_data as any) || {}
    const brandName =
      brandData.companyName || profile.full_name || undefined

    const [rating, copyVariants] = await Promise.all([
      rateAdCreative(generatedImage, input.productImage, input.influencerImage).catch(
        () => ({ score: 75 })
      ),
      generateAdCopy(generatedImage, {
        productName: productAnalysis?.garmentType,
        brandName,
        niche: input.preset,
      }).catch(() => []),
    ])

    // ── Save to storage ──
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
    const imageUrl = await saveUpload(
      generatedImage,
      imagePath,
      'ads',
      contentType
    )

    // ── Save to DB ──
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

    // Return image data inline for immediate display
    return NextResponse.json({
      id: adCreative?.id || crypto.randomUUID(),
      imageUrl,
      imageBase64: generatedImage, // inline for immediate rendering
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
  }
}
