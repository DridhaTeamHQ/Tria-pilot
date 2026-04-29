/**
 * POST /api/campaigns/suggest-from-products
 *
 * Brand selects products → single call returns a complete campaign brief:
 *   1. AI-generated campaign strategy (objective, messaging, hooks, hashtags)
 *   2. Ranked creator recommendations from the platform
 *   3. Ad style suggestions per product (best presets + environment)
 *
 * This is the "smart campaign wizard" endpoint — the brand UI calls it
 * when a brand picks products from the dropdown and asks "what should I do?"
 *
 * Body:
 *   {
 *     productIds: string[],            // 1-20 products
 *     campaignGoal?: string,           // 'awareness' | 'conversions' | 'engagement' | 'launches'
 *     budget?: number,                 // optional INR budget hint
 *     timeline?: string,               // e.g. "2 weeks", "festive season"
 *     limit?: number,                  // creator results, default 8, max 20
 *     skipLLM?: boolean,               // cheap mode: skip GPT reranking + strategy
 *     filters?: {
 *       minFollowers?: number,
 *       maxPricePerPost?: number,
 *       niches?: string[],
 *       badgeTier?: string,
 *     }
 *   }
 *
 * Returns:
 *   {
 *     products: ProductContext[],
 *     campaign: CampaignBrief,
 *     creators: CreatorResult[],
 *     adStyles: AdStyleSuggestion[],
 *   }
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/auth'
import {
  rankCreators,
  type CreatorCandidate,
  type ProductContext,
  type BrandContext,
} from '@/lib/campaigns/creator-matchmaker'
import { analyseProductForScene } from '@/lib/ads/scene-intelligence'
import { getOpenAIKey } from '@/lib/config/api-keys'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'
export const maxDuration = 90

const bodySchema = z.object({
  productIds: z.array(z.string().uuid()).min(1).max(20),
  campaignGoal: z.enum(['awareness', 'conversions', 'engagement', 'launches']).optional(),
  budget: z.number().nonnegative().optional(),
  timeline: z.string().max(100).optional(),
  limit: z.number().int().min(1).max(20).optional(),
  skipLLM: z.boolean().optional(),
  filters: z
    .object({
      minFollowers: z.number().int().nonnegative().optional(),
      maxPricePerPost: z.number().nonnegative().optional(),
      niches: z.array(z.string()).optional(),
      badgeTier: z.string().optional(),
    })
    .optional(),
})

// ── Types ─────────────────────────────────────────────────────────────────

interface CampaignBrief {
  title: string
  objective: string
  targetAudience: string
  keyMessages: string[]
  contentHooks: string[]
  hashtagSuggestions: string[]
  dosDonts: { dos: string[]; donts: string[] }
  estimatedReach: string
  budgetAdvice: string
}

interface AdStyleSuggestion {
  productId: string
  productName: string
  topPreset: string
  presetName: string
  environment: string
  lightingMood: string
  priceTier: string
  suggestedCta: string
}

// ── Campaign strategy generation ──────────────────────────────────────────

async function generateCampaignBrief(
  products: ProductContext[],
  brand: BrandContext,
  goal: string,
  budget: number | undefined,
  timeline: string | undefined,
): Promise<CampaignBrief | null> {
  let apiKey: string
  try {
    apiKey = getOpenAIKey()
  } catch {
    return null
  }

  const openai = new OpenAI({ apiKey })

  const productList = products
    .map(p => `- ${p.name}${p.category ? ` [${p.category}]` : ''}${p.price ? ` ₹${p.price}` : ''}: ${p.description || 'no description'}${p.tags?.length ? ` | Tags: ${p.tags.join(', ')}` : ''}`)
    .join('\n')

  const budgetStr = budget ? `₹${budget.toLocaleString('en-IN')}` : 'not specified'

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a senior marketing strategist for an Indian creator commerce platform (similar to Nykaa + Myntra meets Instagram).
You write campaign briefs for Indian brands working with social media creators/influencers.
Return valid JSON only. No markdown, no prose outside JSON.`,
        },
        {
          role: 'user',
          content: `Create a campaign brief for this brand's product launch.

Brand: ${brand.companyName || 'unnamed'} (${brand.vertical || 'unknown vertical'}, ${brand.brandType || 'D2C'})
Target audience: ${brand.targetAudience || 'general Indian consumers'}
Budget: ${budgetStr}
Timeline: ${timeline || 'not specified'}
Campaign goal: ${goal}

Products:
${productList}

Return JSON:
{
  "title": "catchy campaign name (under 8 words)",
  "objective": "one sentence campaign objective",
  "targetAudience": "specific audience description (age, interests, platform)",
  "keyMessages": ["message 1", "message 2", "message 3"],
  "contentHooks": ["hook idea 1", "hook idea 2", "hook idea 3", "hook idea 4"],
  "hashtagSuggestions": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"],
  "dosDonts": {
    "dos": ["do this", "do this"],
    "donts": ["avoid this", "avoid this"]
  },
  "estimatedReach": "realistic reach estimate for the budget (e.g. '50K–200K impressions')",
  "budgetAdvice": "one sentence on how to allocate budget across creator tiers"
}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1000,
    })

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}')
    return parsed as CampaignBrief
  } catch (err) {
    console.warn('[suggest-from-products] campaign brief generation failed:', err)
    return null
  }
}

function buildFallbackBrief(
  products: ProductContext[],
  brand: BrandContext,
  goal: string,
): CampaignBrief {
  const productNames = products.map(p => p.name).join(', ')
  return {
    title: `${brand.companyName || 'Brand'} × Creator Campaign`,
    objective: `Drive ${goal} for ${productNames} through creator-led content.`,
    targetAudience: brand.targetAudience || 'Indian consumers on Instagram and YouTube',
    keyMessages: [
      `Authentic creator reviews of ${products[0]?.name || 'the product'}`,
      'Real-world styling and use cases',
      'Exclusive offers for creator audiences',
    ],
    contentHooks: [
      'Unboxing + first impressions reel',
      'Day-in-my-life featuring the product',
      'Before/after transformation content',
      'Challenge or trend integration',
    ],
    hashtagSuggestions: ['#Kiwikoo', `#${(brand.companyName || 'Brand').replace(/\s/g, '')}`, '#IndianFashion', '#OOTD', '#CreatorCollabs'],
    dosDonts: {
      dos: ['Encourage authentic reactions', 'Use product in natural context', 'Disclose paid partnership clearly'],
      donts: ['Over-script the creator', 'Use generic CTAs', 'Skip audience alignment check'],
    },
    estimatedReach: 'Depends on selected creators',
    budgetAdvice: 'Allocate 70% to macro creators for reach, 30% to micro creators for engagement.',
  }
}

// ── Main handler ──────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = createServiceClient()

    // Verify brand role
    const { data: profile } = await service
      .from('profiles')
      .select('role, full_name')
      .eq('id', authUser.id)
      .single()

    if ((profile?.role || '').toLowerCase() !== 'brand') {
      return NextResponse.json({ error: 'Forbidden — brand only' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const {
      productIds,
      campaignGoal = 'awareness',
      budget,
      timeline,
      limit = 8,
      skipLLM = false,
      filters,
    } = parsed.data

    // ── Fetch brand context ───────────────────────────────────────────────
    const { data: brandProfile } = await service
      .from('brand_profiles')
      .select('id, company_name, vertical, brand_type, target_audience, budget_range')
      .eq('user_id', authUser.id)
      .single()

    const brand: BrandContext = {
      companyName: brandProfile?.company_name || profile?.full_name || null,
      vertical: brandProfile?.vertical || null,
      brandType: brandProfile?.brand_type || null,
      targetAudience: brandProfile?.target_audience || null,
      budgetRange: brandProfile?.budget_range || (budget ? `₹${budget}` : null),
    }

    // ── Fetch + verify products ───────────────────────────────────────────
    const { data: productsRaw } = await service
      .from('products')
      .select('id, name, description, category, tags, audience, price, brand_id')
      .in('id', productIds)

    if (!productsRaw || productsRaw.length === 0) {
      return NextResponse.json({ error: 'No matching products found' }, { status: 404 })
    }

    const ownedBrandId = brandProfile?.id
    const ownedProducts = ownedBrandId
      ? productsRaw.filter(p => p.brand_id === ownedBrandId)
      : []

    if (ownedProducts.length === 0) {
      return NextResponse.json(
        { error: 'None of the requested products belong to your brand' },
        { status: 403 },
      )
    }

    const products: ProductContext[] = ownedProducts.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      tags: Array.isArray(p.tags) ? p.tags : [],
      audience: p.audience,
      price: p.price ? Number(p.price) : null,
    }))

    // ── Run all three tasks in parallel ──────────────────────────────────
    // 1. Campaign brief (LLM)
    // 2. Creator ranking
    // 3. Ad style analysis (deterministic, fast)

    // Creator fetch query
    let candidateQuery = service
      .from('influencer_profiles')
      .select(`
        user_id, bio, niches, socials, price_per_post, followers,
        audience_rate, retention_rate, badge_tier, badge_score,
        gender, audience_type, preferred_categories, engagement_rate,
        onboarding_completed,
        profiles!influencer_profiles_user_id_fkey(full_name, approval_status)
      `)
      .eq('onboarding_completed', true)

    if (filters?.minFollowers != null) candidateQuery = candidateQuery.gte('followers', filters.minFollowers)
    if (filters?.maxPricePerPost != null) candidateQuery = candidateQuery.lte('price_per_post', filters.maxPricePerPost)
    if (filters?.badgeTier) candidateQuery = candidateQuery.eq('badge_tier', filters.badgeTier)

    const [briefResult, candidatesResult] = await Promise.all([
      skipLLM
        ? Promise.resolve(null)
        : generateCampaignBrief(products, brand, campaignGoal, budget, timeline),
      candidateQuery.limit(500),
    ])

    // Ad style analysis — deterministic, no await needed per product
    const adStyles: AdStyleSuggestion[] = products.map(p => {
      const result = analyseProductForScene({
        name: p.name,
        description: p.description,
        category: p.category,
        tags: p.tags,
        price: p.price,
      })
      const top = result.topRecommendations[0]
      return {
        productId: p.id,
        productName: p.name,
        topPreset: top?.presetId ?? 'PERF_BEST_QUALITY',
        presetName: top?.presetName ?? 'Best Quality Pro',
        environment: top?.environment ?? '',
        lightingMood: top?.lightingMood ?? '',
        priceTier: result.priceTier,
        suggestedCta: result.suggestedCta,
      }
    })

    // Process creator candidates
    const rawCandidates = candidatesResult.data || []
    const approved = rawCandidates.filter((c: any) => {
      return String(c.profiles?.approval_status || '').toLowerCase() === 'approved'
    })

    let filteredCandidates = approved
    if (filters?.niches?.length) {
      const wanted = filters.niches.map((n: string) => n.toLowerCase())
      filteredCandidates = approved.filter((c: any) => {
        const niches = Array.isArray(c.niches) ? c.niches.map((n: string) => n.toLowerCase()) : []
        return wanted.some((w: string) => niches.includes(w))
      })
    }

    const candidates: CreatorCandidate[] = filteredCandidates.map((c: any) => ({
      userId: c.user_id,
      name: c.profiles?.full_name || null,
      bio: c.bio,
      niches: Array.isArray(c.niches) ? c.niches : [],
      followers: c.followers,
      engagementRate: c.engagement_rate ? Number(c.engagement_rate) : null,
      audienceRate: c.audience_rate ? Number(c.audience_rate) : null,
      retentionRate: c.retention_rate ? Number(c.retention_rate) : null,
      badgeTier: c.badge_tier,
      badgeScore: c.badge_score ? Number(c.badge_score) : null,
      gender: c.gender,
      audienceType: c.audience_type,
      preferredCategories: Array.isArray(c.preferred_categories) ? c.preferred_categories : [],
      pricePerPost: c.price_per_post ? Number(c.price_per_post) : null,
      socials: c.socials || {},
    }))

    const ranked =
      candidates.length > 0
        ? await rankCreators(candidates, brand, products, { limit, skipLLM })
        : []

    const candidateMap = new Map(candidates.map(c => [c.userId, c]))
    const creators = ranked.map(r => {
      const c = candidateMap.get(r.creatorId)
      return {
        ...r,
        profile: c
          ? {
              userId: c.userId,
              name: c.name,
              bio: c.bio,
              niches: c.niches,
              followers: c.followers,
              engagementRate: c.engagementRate,
              badgeTier: c.badgeTier,
              gender: c.gender,
              audienceType: c.audienceType,
              pricePerPost: c.pricePerPost,
            }
          : null,
      }
    })

    const campaignBrief = briefResult || buildFallbackBrief(products, brand, campaignGoal)

    return NextResponse.json({
      products,
      campaign: campaignBrief,
      creators: {
        totalCandidates: candidates.length,
        results: creators,
      },
      adStyles,
    })
  } catch (error) {
    console.error('[suggest-from-products] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
