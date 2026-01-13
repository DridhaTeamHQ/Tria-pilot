import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { analyzeClothingImage, rateAdCreative, generateAdCopy } from '@/lib/openai'
import { generateIntelligentAdComposition } from '@/lib/gemini'
import { saveUpload } from '@/lib/storage'
import prisma from '@/lib/prisma'
import {
  generateAdPrompt,
  validateAdInput,
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
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: authUser.email! },
    })

    if (!dbUser || dbUser.role !== 'BRAND') {
      return NextResponse.json({ error: 'Unauthorized - Brand access required' }, { status: 403 })
    }

    // Check rate limit
    const rateLimit = checkRateLimit(dbUser.id, 'ads')
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
      const campaign = await prisma.campaign.findUnique({
        where: { id: input.campaignId },
      })

      if (!campaign) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
      }

      if (campaign.brandId !== dbUser.id) {
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

    // Generate ad copy
    const copyVariants = await generateAdCopy(generatedImage, {
      productName: productAnalysis?.garmentType,
      brandName: dbUser.name || undefined,
      niche: input.preset,
    })

    // Save image to storage
    const imagePath = `${dbUser.id}/${Date.now()}.jpg`
    const imageUrl = await saveUpload(generatedImage, imagePath, 'ads')

    // Determine regeneration limits based on mode (Self vs Assisted)
    const brandProfile = await prisma.brandProfile.findUnique({
      where: { userId: dbUser.id },
    })
    const isAssisted = false // TODO: Add mode field to BrandProfile
    const maxRegenerations = isAssisted ? 15 : 5

    // Create ad creative record with enhanced metadata
    const adCreative = await prisma.adCreative.create({
      data: {
        brandId: dbUser.id,
        imagePath: imageUrl,
        copy: copyVariants[0] || '',
        meta: {
          // Rating & quality
          rating: rating as any,
          qualityScore: (rating as any)?.score || 75,
          copyVariants: copyVariants as any,

          // Image analysis
          productAnalysis: productAnalysis as any,
          influencerAnalysis: influencerAnalysis as any,

          // Original input for regeneration
          stylePreset: input.preset,
          productImage: input.productImage,
          influencerImage: input.influencerImage,
          lockFaceIdentity: input.lockFaceIdentity,
          headline: input.headline,
          ctaType: input.ctaType,
          captionTone: input.captionTone,
          platforms: input.platforms,

          // Campaign association
          campaignId: campaignData?.id,
          campaignTitle: campaignData?.title,

          // Regeneration tracking
          regenerationCount: 0,
          maxRegenerations,
          lastRegenerationAt: null,
        },
      },
    })

    return NextResponse.json({
      id: adCreative.id,
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
