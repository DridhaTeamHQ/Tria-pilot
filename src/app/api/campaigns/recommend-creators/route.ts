/**
 * POST /api/campaigns/recommend-creators
 *
 * Brand picks one or more products → returns ranked creators on the platform
 * who are the best fit, with match scores, reasoning, and outreach angles.
 *
 * Used by the brand campaign-creation UI dropdown flow:
 *   1. Brand selects products from their catalog
 *   2. UI calls this endpoint
 *   3. UI displays ranked creator list with match scores
 *   4. Brand picks creators → campaign is created
 *
 * Body:
 *   {
 *     productIds: string[],                  // products to promote
 *     limit?: number,                        // default 10, max 50
 *     skipLLM?: boolean,                     // for cheap mode
 *     filters?: {
 *       minFollowers?: number,
 *       maxPricePerPost?: number,
 *       gender?: string,
 *       audienceType?: string,
 *       niches?: string[],
 *       badgeTier?: string,
 *     }
 *   }
 *
 * Returns:
 *   {
 *     products: ProductContext[],            // products that were considered
 *     totalCandidates: number,
 *     creators: Array<CreatorMatchScore & { profile: PublicCreatorProfile }>
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

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const bodySchema = z.object({
  productIds: z.array(z.string().uuid()).min(1).max(20),
  limit: z.number().int().min(1).max(50).optional(),
  skipLLM: z.boolean().optional(),
  filters: z
    .object({
      minFollowers: z.number().int().nonnegative().optional(),
      maxPricePerPost: z.number().nonnegative().optional(),
      gender: z.string().optional(),
      audienceType: z.string().optional(),
      niches: z.array(z.string()).optional(),
      badgeTier: z.string().optional(),
    })
    .optional(),
})

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
      .select('role, approval_status, full_name')
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
        { status: 400 }
      )
    }
    const { productIds, limit = 10, skipLLM = false, filters } = parsed.data

    // ── Fetch brand context ─────────────────────────────────────────────
    const { data: brandProfile } = await service
      .from('brand_profiles')
      .select('company_name, vertical, brand_type, target_audience, budget_range')
      .eq('user_id', authUser.id)
      .single()

    const brand: BrandContext = {
      companyName: brandProfile?.company_name || profile?.full_name || null,
      vertical: brandProfile?.vertical || null,
      brandType: brandProfile?.brand_type || null,
      targetAudience: brandProfile?.target_audience || null,
      budgetRange: brandProfile?.budget_range || null,
    }

    // ── Fetch + verify products belong to this brand ────────────────────
    const { data: productsRaw, error: productsErr } = await service
      .from('products')
      .select('id, name, description, category, tags, audience, price, brand_id')
      .in('id', productIds)

    if (productsErr || !productsRaw || productsRaw.length === 0) {
      return NextResponse.json({ error: 'No matching products found' }, { status: 404 })
    }

    // Ownership check via brand_profiles.id mapping
    const { data: brandIdRow } = await service
      .from('brand_profiles')
      .select('id')
      .eq('user_id', authUser.id)
      .single()
    const ownedBrandId = brandIdRow?.id
    const ownedProducts = ownedBrandId
      ? productsRaw.filter(p => p.brand_id === ownedBrandId)
      : []

    if (ownedProducts.length === 0) {
      return NextResponse.json(
        { error: 'None of the requested products belong to your brand' },
        { status: 403 }
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

    // ── Fetch creator candidate pool ────────────────────────────────────
    let candidateQuery = service
      .from('influencer_profiles')
      .select(`
        user_id,
        bio,
        niches,
        socials,
        price_per_post,
        followers,
        audience_rate,
        retention_rate,
        badge_tier,
        badge_score,
        gender,
        audience_type,
        preferred_categories,
        engagement_rate,
        identity_setup_complete,
        onboarding_completed,
        profiles!influencer_profiles_user_id_fkey(full_name, approval_status)
      `)
      .eq('onboarding_completed', true)

    // Apply optional filters
    if (filters?.minFollowers != null) {
      candidateQuery = candidateQuery.gte('followers', filters.minFollowers)
    }
    if (filters?.maxPricePerPost != null) {
      candidateQuery = candidateQuery.lte('price_per_post', filters.maxPricePerPost)
    }
    if (filters?.gender) {
      candidateQuery = candidateQuery.eq('gender', filters.gender)
    }
    if (filters?.audienceType) {
      candidateQuery = candidateQuery.eq('audience_type', filters.audienceType)
    }
    if (filters?.badgeTier) {
      candidateQuery = candidateQuery.eq('badge_tier', filters.badgeTier)
    }

    const { data: rawCandidates, error: candErr } = await candidateQuery.limit(500)
    if (candErr) {
      console.error('[recommend-creators] candidate fetch error:', candErr)
      return NextResponse.json({ error: 'Failed to fetch creators' }, { status: 500 })
    }

    // Filter to approved creators only
    const approved = (rawCandidates || []).filter((c: any) => {
      const status = String(c.profiles?.approval_status || '').toLowerCase()
      return status === 'approved'
    })

    // Optional niche pre-filter
    let filteredCandidates = approved
    if (filters?.niches?.length) {
      const wanted = filters.niches.map(n => n.toLowerCase())
      filteredCandidates = approved.filter((c: any) => {
        const niches = Array.isArray(c.niches) ? c.niches.map((n: string) => n.toLowerCase()) : []
        return wanted.some(w => niches.includes(w))
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

    if (candidates.length === 0) {
      return NextResponse.json({
        products,
        totalCandidates: 0,
        creators: [],
        message: 'No approved creators match the filters.',
      })
    }

    // ── Rank ────────────────────────────────────────────────────────────
    const ranked = await rankCreators(candidates, brand, products, { limit, skipLLM })

    // Hydrate response with public profile snippets
    const candidateMap = new Map(candidates.map(c => [c.userId, c]))
    const enriched = ranked.map(r => {
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

    return NextResponse.json({
      products,
      totalCandidates: candidates.length,
      creators: enriched,
    })
  } catch (error) {
    console.error('[recommend-creators] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
