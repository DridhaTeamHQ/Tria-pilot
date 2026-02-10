/**
 * AD GENERATION API - CREATIVE ORCHESTRATOR VERSION
 * 
 * Generates brand-grade AI ad creatives using the Creative Decision Engine.
 * 
 * Flow:
 * 1. Validate inputs
 * 2. Call Creative Orchestrator (analyze → build contract → render)
 * 3. Rate the ad
 * 4. Generate copy variants
 * 5. Save to storage and database
 * 
 * "We are not building a prompt generator.
 * We are building a creative decision engine that compiles brand intent,
 * presets, and image analysis into a strict JSON contract for NanoBanana Pro."
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { rateAdCreative, generateAdCopy } from '@/lib/openai'
import { saveUpload } from '@/lib/storage'
import { z } from 'zod'

// Import Creative Orchestrator
import {
  orchestrateAdCreation,
  mapLegacyPreset,
  type OrchestratorInput,
  type PresetId,
  ContractValidationError,
  LowConfidenceError,
} from '@/lib/creative_orchestrator'

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

// Updated schema with new preset IDs (supports both legacy and new)
const adGenerationSchema = z
  .object({
    // Preset selection (required) - supports both legacy and new IDs
    preset: z.string().min(1),

    // Campaign association (optional)
    campaignId: z.string().max(100).optional(),

    // Image inputs (product required, influencer optional)
    productImage: z.string().min(1).max(15_000_000),
    influencerImage: z.string().min(1).max(15_000_000).optional(),
    aiInfluencerId: z.string().optional(),  // NEW: AI influencer selection

    // Legacy field - backward compatibility
    lockFaceIdentity: z.boolean().optional().default(false),

    // Text controls
    headline: z.string().trim().max(60).optional(),
    ctaType: z.enum(['shop_now', 'learn_more', 'explore', 'buy_now']).default('shop_now'),
    captionTone: z.enum(['casual', 'premium', 'confident']).optional(),

    // Platform selection
    platforms: z.array(z.enum(['instagram', 'facebook', 'google', 'tiktok', 'influencer'])).min(1),

    // Legacy subject field - backward compatibility
    subject: z.object({
      gender: z.enum(['male', 'female', 'unisex']).optional(),
      ageRange: z.string().trim().max(40).optional(),
      pose: z.string().trim().max(120).optional(),
      expression: z.string().trim().max(120).optional(),
    }).optional(),

    // User constraints (optional)
    constraints: z.object({
      mood: z.string().optional(),
      targetAudience: z.string().optional(),
      productVisibility: z.enum(['dominant', 'balanced', 'lifestyle']).optional(),
    }).optional(),
  })

// ═══════════════════════════════════════════════════════════════════════════════
// API HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: Request) {
  try {
    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 1: Authentication & Authorization
    // ═══════════════════════════════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 2: Parse and Validate Input
    // ═══════════════════════════════════════════════════════════════════════════
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

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

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 3: Map preset (legacy compatibility)
    // ═══════════════════════════════════════════════════════════════════════════
    const presetId = mapLegacyPreset(input.preset)
    console.log(`[AdGenerate] Preset: ${input.preset} → ${presetId}`)

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 4: Run Creative Orchestrator
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('[AdGenerate] Starting Creative Orchestrator...')

    const orchestratorInput: OrchestratorInput = {
      productImage: input.productImage,
      influencerImage: input.influencerImage,
      aiInfluencerId: input.aiInfluencerId,
      presetId: presetId as PresetId,
      constraints: {
        platform: input.platforms[0] as any,
        mood: input.constraints?.mood,
        targetAudience: input.constraints?.targetAudience,
        productVisibility: input.constraints?.productVisibility,
        headline: input.headline,
        cta: input.ctaType,
      },
    }

    let result
    try {
      result = await orchestrateAdCreation(orchestratorInput)
    } catch (error) {
      if (error instanceof ContractValidationError) {
        console.error('[AdGenerate] Contract validation failed:', error.details)
        return NextResponse.json(
          { error: 'Creative contract validation failed', details: error.details },
          { status: 400 }
        )
      }
      if (error instanceof LowConfidenceError) {
        console.warn('[AdGenerate] Low confidence, used safe preset')
        // Continue with result from fallback
      }
      throw error
    }

    const { image: generatedImage, contract, metadata } = result

    console.log(`[AdGenerate] Generation complete. Confidence: ${metadata.confidenceScore}`)

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 5: Rate the Ad
    // ═══════════════════════════════════════════════════════════════════════════
    const rating = await rateAdCreative(generatedImage, input.productImage, input.influencerImage)

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 6: Generate Ad Copy
    // ═══════════════════════════════════════════════════════════════════════════
    const brandData = profile.brand_data as any || {}
    const brandName = brandData.companyName || profile.full_name || undefined

    const copyVariants = await generateAdCopy(generatedImage, {
      productName: contract.product.category,
      brandName,
      niche: contract.ad_type,
    })

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 7: Save Image to Storage
    // ═══════════════════════════════════════════════════════════════════════════
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
    const imageUrl = await saveUpload(generatedImage, imagePath, 'ads', contentType)

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 8: Save to Database
    // ═══════════════════════════════════════════════════════════════════════════
    const { data: adCreative, error: insertError } = await service
      .from('ad_creatives')
      .insert({
        brand_id: user.id,
        image_url: imageUrl,
        title: input.headline || `${contract.ad_type} Ad`,
        prompt: JSON.stringify(contract),  // Store the contract as JSON
        campaign_id: campaignData?.id || null,
        platform: input.platforms[0] || 'instagram',
        status: 'generated',
        rating: (rating as any)?.score || metadata.confidenceScore,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[AdGenerate] Database insert error:', insertError)
      // Still return success since ad was generated
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 9: Return Response
    // ═══════════════════════════════════════════════════════════════════════════
    return NextResponse.json({
      id: adCreative?.id || crypto.randomUUID(),
      imageUrl,
      copy: copyVariants,
      rating,
      qualityScore: (rating as any)?.score || metadata.confidenceScore,

      // New fields from Creative Orchestrator
      contract: {
        ad_type: contract.ad_type,
        brand_tier: contract.brand_tier,
        confidence_score: contract.confidence_score,
        negative_constraints: contract.negative_constraints,
      },
      metadata: {
        presetUsed: metadata.presetUsed,
        modelUsed: metadata.modelUsed,
        warnings: metadata.warnings,
      },
    })
  } catch (error) {
    console.error('[AdGenerate] Error:', error)

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
