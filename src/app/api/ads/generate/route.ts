/**
 * AD GENERATION API
 * 
 * Generates AI-powered ad creatives
 * Uses Supabase only - NO Prisma
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { analyzeClothingImage, rateAdCreative, generateAdCopy } from '@/lib/openai'
import { generateIntelligentAdComposition } from '@/lib/gemini'
import { saveUpload } from '@/lib/storage'
import {
  generateAdPrompt,
  type AdGenerationInput,
  type AdPresetId,
  type Platform,
  type CtaType,
  type CaptionTone,
} from '@/lib/ads/ad-styles'
import { z } from 'zod'

// Schema for the new preset-based generation
const adGenerationSchema = z
  .object({
    preset: z.enum(['UGC_CANDID', 'PRODUCT_LIFESTYLE', 'STUDIO_POSTER', 'PREMIUM_EDITORIAL']),
    campaignId: z.string().max(100).optional(),
    productImage: z.string().min(1).max(15_000_000).optional(),
    influencerImage: z.string().min(1).max(15_000_000).optional(),
    lockFaceIdentity: z.boolean().optional().default(false),
    headline: z.string().trim().max(60).optional(),
    ctaType: z.enum(['shop_now', 'learn_more', 'explore', 'buy_now']).default('shop_now'),
    captionTone: z.enum(['casual', 'premium', 'confident']).optional(),
    platforms: z.array(z.enum(['instagram', 'facebook', 'google', 'influencer'])).min(1),
    subject: z.object({
      gender: z.enum(['male', 'female', 'unisex']).optional(),
      ageRange: z.string().trim().max(40).optional(),
      pose: z.string().trim().max(120).optional(),
      expression: z.string().trim().max(120).optional(),
    }).strict().optional(),
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
      return NextResponse.json({ error: 'Unauthorized - Brand access required' }, { status: 403 })
    }

    // Check rate limit
    const rateLimit = checkRateLimit(user.id, 'ads')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          resetTime: rateLimit.resetTime,
        },
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
        return NextResponse.json({ error: 'Unauthorized - Campaign access denied' }, { status: 403 })
      }

      if (campaign.status === 'completed') {
        return NextResponse.json({ error: 'Cannot generate ads for completed campaigns' }, { status: 400 })
      }

      campaignData = { id: campaign.id, title: campaign.title }
    }

    // Validate headline word count
    if (input.headline) {
      const wordCount = input.headline.trim().split(/\s+/).length
      if (wordCount > 6) {
        return NextResponse.json({ error: 'Headline cannot exceed 6 words' }, { status: 400 })
      }
    }

    // Analyze images if provided
    let productAnalysis = null
    let influencerAnalysis = null

    if (input.productImage) {
      productAnalysis = await analyzeClothingImage(input.productImage)
    }

    if (input.influencerImage) {
      influencerAnalysis = await analyzeClothingImage(input.influencerImage)
    }

    // Generate prompt using preset system (NO free-form prompts from brands)
    const generationInput: AdGenerationInput = {
      preset: input.preset as AdPresetId,
      campaignId: input.campaignId,
      productImage: input.productImage,
      influencerImage: input.influencerImage,
      lockFaceIdentity: input.lockFaceIdentity,
      headline: input.headline,
      ctaType: input.ctaType as CtaType,
      captionTone: input.captionTone as CaptionTone,
      platforms: input.platforms as Platform[],
      subject: input.subject,
    }

    const compositionPrompt = generateAdPrompt(generationInput)

    // Generate ad composition
    const generatedImage = await generateIntelligentAdComposition(
      input.productImage,
      input.influencerImage,
      compositionPrompt
    )

    // Rate the ad
    const rating = await rateAdCreative(generatedImage, input.productImage, input.influencerImage)

    // Get brand name from profile
    const brandData = profile.brand_data as any || {}
    const brandName = brandData.companyName || profile.full_name || undefined

    // Generate ad copy
    const copyVariants = await generateAdCopy(generatedImage, {
      productName: productAnalysis?.garmentType,
      brandName,
      niche: input.preset,
    })

    // Save image to storage
    // Extract MIME type from data URI if present
    let contentType = 'image/jpeg'
    let fileExtension = 'jpg'
    const mimeMatch = generatedImage.match(/^data:(image\/\w+);base64,/)
    if (mimeMatch) {
      contentType = mimeMatch[1]
      // Map content type to extension
      if (contentType === 'image/png') fileExtension = 'png'
      else if (contentType === 'image/webp') fileExtension = 'webp'
      else if (contentType === 'image/gif') fileExtension = 'gif'
    }

    const imagePath = `${user.id}/${Date.now()}.${fileExtension}`
    const imageUrl = await saveUpload(generatedImage, imagePath, 'ads', contentType)

    // Create ad creative record in Supabase
    const { data: adCreative, error: insertError } = await service
      .from('ad_creatives')
      .insert({
        brand_id: user.id,
        image_url: imageUrl,
        title: input.headline || `${input.preset} Ad`,
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
      // Still return success since ad was generated
    }

    return NextResponse.json({
      id: adCreative?.id || crypto.randomUUID(),
      imageUrl,
      copy: copyVariants,
      rating,
      qualityScore: (rating as any)?.score || 75,
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
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
