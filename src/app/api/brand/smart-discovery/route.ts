/**
 * GET /api/brand/smart-discovery
 *
 * AI-powered "creators perfect for you right now" — proactively scans the
 * platform, picks the brand's products, runs the same matchmaker that the
 * campaign strategist uses, returns the top vetted creators with a
 * personalized reason.
 *
 * Designed to live on the brand dashboard. Daily cache via stable response.
 */

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import { rankCreators, type CreatorCandidate, type ProductContext, type BrandContext } from '@/lib/campaigns/creator-matchmaker'
import { vetCreator, trustLabel } from '@/lib/campaigns/vetting'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

interface SmartPick {
  creatorId: string
  name: string | null
  avatarUrl: string | null
  niches: string[]
  followers: number | null
  engagementRate: number | null
  pricePerPost: number | null
  badgeTier: string | null
  matchScore: number
  trustScore: number
  trustLabel: string
  trustTone: 'green' | 'yellow' | 'orange' | 'red'
  reason: string
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name, brand_data')
      .eq('id', authUser.id)
      .maybeSingle()

    if ((profile?.role || '').toLowerCase() !== 'brand') {
      return NextResponse.json({ error: 'Forbidden — brand only' }, { status: 403 })
    }

    const service = createServiceClient()
    const brandData = (profile?.brand_data || {}) as Record<string, unknown>

    const brand: BrandContext = {
      companyName: (brandData.companyName as string) || profile?.full_name || null,
      vertical: (brandData.vertical as string) || null,
      brandType: (brandData.brandType as string) || null,
      targetAudience: (brandData.targetAudience as string) || null,
      budgetRange: (brandData.budgetRange as string) || null,
    }

    // Pick the 5 most recent products to use as context
    const { data: productsRaw } = await service
      .from('products')
      .select('id, name, description, category, tags, audience, price')
      .eq('brand_id', authUser.id)
      .order('created_at', { ascending: false })
      .limit(5)

    if (!productsRaw || productsRaw.length === 0) {
      return NextResponse.json({
        picks: [],
        reason: 'no_products',
        message: 'Add products to your catalog to get personalized creator recommendations.',
      })
    }

    const products: ProductContext[] = productsRaw.map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      tags: Array.isArray(p.tags) ? p.tags : [],
      audience: p.audience,
      price: p.price ? Number(p.price) : null,
    }))

    // Pull the candidate pool — keep tight to keep this endpoint fast
    const { data: rawCandidates } = await service
      .from('influencer_profiles')
      .select(
        `user_id, bio, niches, socials, price_per_post, followers,
         audience_rate, retention_rate, badge_tier, badge_score,
         gender, audience_type, preferred_categories, engagement_rate,
         onboarding_completed,
         profiles!influencer_profiles_user_id_fkey(full_name, approval_status, avatar_url)`,
      )
      .eq('onboarding_completed', true)
      .limit(300)

    const approved = (rawCandidates || []).filter(
      (c: any) => String(c.profiles?.approval_status || '').toLowerCase() === 'approved',
    )

    const candidates: CreatorCandidate[] = approved.map((c: any) => ({
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
        picks: [],
        reason: 'no_creators',
        message: 'No approved creators on the platform right now.',
      })
    }

    // Rank — skip LLM rerank to keep this fast (dashboard widget should be snappy)
    const ranked = await rankCreators(candidates, brand, products, { limit: 12, skipLLM: true })

    const candidateMap = new Map(approved.map((c: any) => [c.user_id, c]))

    const picks: SmartPick[] = ranked
      .map((r) => {
        const raw: any = candidateMap.get(r.creatorId)
        if (!raw) return null
        const ip = raw // already flat
        const erRaw = Number(ip?.engagement_rate ?? 0)
        const erPct = erRaw <= 1 ? erRaw * 100 : erRaw

        const vetting = vetCreator({
          followers: ip?.followers ?? null,
          engagementRate: erPct,
          audienceRate: ip?.audience_rate ?? null,
          retentionRate: ip?.retention_rate ?? null,
          badgeTier: ip?.badge_tier ?? null,
          badgeScore: ip?.badge_score ?? null,
          bio: ip?.bio ?? null,
          niches: Array.isArray(ip?.niches) ? ip.niches : [],
          socials: ip?.socials ?? null,
          onboardingCompleted: true,
        })

        const trust = trustLabel(vetting.trustScore)

        // Pick a personalized reason — first niche match takes priority
        const productNiches = new Set<string>()
        for (const p of products) {
          if (p.category) productNiches.add(p.category.toLowerCase())
          for (const t of p.tags) productNiches.add(t.toLowerCase())
        }
        const matchedNiche = Array.isArray(ip?.niches)
          ? (ip.niches as string[]).find((n) => productNiches.has(n.toLowerCase()))
          : null

        let reason: string
        if (matchedNiche && r.matchScore >= 70) {
          reason = `${r.matchScore}% fit · ${matchedNiche} creator with high engagement`
        } else if (vetting.trustScore >= 80) {
          reason = `Verified creator · ${trust.label.toLowerCase()} on Kiwikoo`
        } else if (matchedNiche) {
          reason = `Active in ${matchedNiche} — niche match for your products`
        } else {
          reason = r.reason || 'Strong match for your brand context'
        }

        return {
          creatorId: r.creatorId,
          name: raw.profiles?.full_name || null,
          avatarUrl: raw.profiles?.avatar_url || null,
          niches: Array.isArray(ip?.niches) ? ip.niches : [],
          followers: ip?.followers ?? null,
          engagementRate: Number(erPct.toFixed(2)),
          pricePerPost: ip?.price_per_post ? Number(ip.price_per_post) : null,
          badgeTier: ip?.badge_tier ?? null,
          matchScore: r.matchScore,
          trustScore: vetting.trustScore,
          trustLabel: trust.label,
          trustTone: trust.tone,
          reason,
        } as SmartPick
      })
      .filter(Boolean) as SmartPick[]

    // Filter: only return creators who pass vetting (trust >= 55) AND have a strong match
    const filtered = picks.filter((p) => p.trustScore >= 55 && p.matchScore >= 50).slice(0, 6)

    return NextResponse.json({
      picks: filtered,
      contextProductCount: products.length,
    })
  } catch (err) {
    console.error('[smart-discovery] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
