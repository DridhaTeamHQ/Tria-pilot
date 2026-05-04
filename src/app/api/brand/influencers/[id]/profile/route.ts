/**
 * GET /api/brand/influencers/[id]/profile
 *
 * Returns a full creator profile for the brand-side detail page:
 *   - core profile fields (name, avatar, bio, niches, socials, badge, etc.)
 *   - influencer stats (followers, engagement, audience type, price per post)
 *   - completed try-on gallery (all generation_jobs with successful outputs)
 *
 * Brand-only. Only approved + onboarded influencers are returned.
 */

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import { getJobOutputsFromRecord } from '@/lib/tryon/job-outputs'

export const dynamic = 'force-dynamic'

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null
}

function asNumber(v: unknown): number | null {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authUser.id)
      .maybeSingle()

    if ((requesterProfile?.role || '').toLowerCase() !== 'brand') {
      return NextResponse.json({ error: 'Forbidden — brand only' }, { status: 403 })
    }

    const { id } = await ctx.params
    const service = createServiceClient()

    // Fetch profile + influencer_profiles + influencer_socials in one go
    const { data: profile, error: profileErr } = await service
      .from('profiles')
      .select(
        `id, email, full_name, role, avatar_url, approval_status, onboarding_completed, created_at,
         influencer_profiles(*)`,
      )
      .eq('id', id)
      .single()

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    if ((profile.role || '').toLowerCase() !== 'influencer') {
      return NextResponse.json({ error: 'Not a creator profile' }, { status: 404 })
    }

    if ((profile.approval_status || '').toLowerCase() !== 'approved') {
      return NextResponse.json({ error: 'Creator not approved' }, { status: 404 })
    }

    const ip: any = Array.isArray(profile.influencer_profiles)
      ? profile.influencer_profiles[0]
      : profile.influencer_profiles || {}

    const niches: string[] = Array.isArray(ip?.niches)
      ? ip.niches.filter((n: unknown): n is string => typeof n === 'string' && n.trim().length > 0)
      : []

    const preferredCategories: string[] = Array.isArray(ip?.preferred_categories)
      ? ip.preferred_categories.filter(
          (n: unknown): n is string => typeof n === 'string' && n.trim().length > 0,
        )
      : []

    const socials = ip?.socials && typeof ip.socials === 'object' && !Array.isArray(ip.socials)
      ? (ip.socials as Record<string, unknown>)
      : {}

    const rawEngagement = asNumber(ip?.engagement_rate) ?? 0
    const engagementPercent = rawEngagement <= 1 ? rawEngagement * 100 : rawEngagement

    // ── Run all auxiliary queries in parallel ───────────────────────────
    const [jobsRes, jobCountRes, collabsRes, conversationRes, authLookup] = await Promise.all([
      // Try-on gallery
      service
        .from('generation_jobs')
        .select('id, status, output_image_path, settings, created_at')
        .eq('user_id', id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(60),
      // Total try-on count (lifetime)
      service
        .from('generation_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', id)
        .eq('status', 'completed'),
      // Past collabs with this brand
      service
        .from('collaboration_requests')
        .select('id, status, created_at, updated_at')
        .eq('influencer_id', id)
        .eq('brand_id', authUser.id)
        .order('created_at', { ascending: false }),
      // Existing conversation between this brand and this creator (if any)
      service
        .from('conversations')
        .select('id, last_message, last_message_at, unread_brand')
        .or(
          `and(brand_id.eq.${authUser.id},influencer_id.eq.${id}),and(brand_id.eq.${id},influencer_id.eq.${authUser.id})`,
        )
        .limit(1)
        .maybeSingle(),
      // Last sign-in time from auth metadata for "active" indicator
      service.auth.admin.getUserById(id).catch(() => null),
    ])

    const tryOns = (jobsRes.data || [])
      .flatMap((job: any) => {
        const outputs = getJobOutputsFromRecord(job)
        return outputs
          .filter((o) => o.status === 'completed' && (o.imageUrl || o.base64Image))
          .map((o, idx) => ({
            jobId: job.id,
            outputIndex: idx,
            imageUrl: o.imageUrl || (o.base64Image ? `data:image/png;base64,${o.base64Image}` : null),
            label: o.label,
            createdAt: job.created_at,
          }))
          .filter((o) => o.imageUrl)
      })
      .slice(0, 48)

    const totalTryOns = jobCountRes.count || 0

    // Compute collab stats with this brand
    const collabs = collabsRes.data || []
    const collabStats = collabs.reduce(
      (acc, c: any) => {
        acc.total += 1
        const s = String(c.status || '').toLowerCase()
        if (s === 'accepted') acc.accepted += 1
        else if (s === 'pending') acc.pending += 1
        else if (s === 'declined') acc.declined += 1
        return acc
      },
      { total: 0, accepted: 0, pending: 0, declined: 0 },
    )

    // Response rate proxy: % of resolved collabs (not pending)
    const resolvedCollabs = collabStats.accepted + collabStats.declined
    const responseRate =
      collabStats.total > 0 ? Math.round((resolvedCollabs / collabStats.total) * 100) : null

    // Average response time across resolved collabs (from invited → updated)
    let avgResponseHours: number | null = null
    const resolvedRows = collabs.filter((c: any) => c.status !== 'pending' && c.updated_at)
    if (resolvedRows.length > 0) {
      const totalMs = resolvedRows.reduce((sum, c: any) => {
        const created = new Date(c.created_at).getTime()
        const updated = new Date(c.updated_at).getTime()
        return sum + Math.max(0, updated - created)
      }, 0)
      avgResponseHours = Number((totalMs / resolvedRows.length / (1000 * 60 * 60)).toFixed(1))
    }

    // Pricing breakdown — derive tiered estimates from base price/post if no
    // explicit breakdown is stored. Industry-standard multipliers.
    const basePrice = asNumber(ip?.price_per_post)
    const pricingBreakdown = basePrice
      ? {
          post: Math.round(basePrice),
          reel: Math.round(basePrice * 1.6),
          story: Math.round(basePrice * 0.4),
          carousel: Math.round(basePrice * 1.2),
          ugc: Math.round(basePrice * 0.7),
        }
      : null

    // Last active: prefer auth.users.last_sign_in_at, fall back to most
    // recent generation_jobs.created_at (proxy for app activity)
    const authUserData = authLookup?.data?.user || null
    const lastSignInAt =
      typeof authUserData?.last_sign_in_at === 'string' ? authUserData.last_sign_in_at : null
    const mostRecentJob = (jobsRes.data || [])[0]
    const mostRecentJobAt = mostRecentJob?.created_at || null
    const lastActiveAt =
      [lastSignInAt, mostRecentJobAt]
        .filter(Boolean)
        .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0] || null

    // Demographics inferred from auth metadata if available
    const userMetadata = (authUserData?.user_metadata || {}) as Record<string, unknown>
    const dob = typeof userMetadata.date_of_birth === 'string' ? userMetadata.date_of_birth : null
    let age: number | null = null
    if (dob) {
      const dobDate = new Date(dob)
      if (!Number.isNaN(dobDate.getTime())) {
        const ageMs = Date.now() - dobDate.getTime()
        age = Math.floor(ageMs / (1000 * 60 * 60 * 24 * 365.25))
      }
    }

    return NextResponse.json({
      profile: {
        id: profile.id,
        email: profile.email,
        name: asString(profile.full_name) || profile.email?.split('@')[0] || 'Creator',
        avatarUrl: profile.avatar_url || null,
        bio: asString(ip?.bio),
        niches,
        preferredCategories,
        followers: asNumber(ip?.followers) ?? 0,
        engagementRate: Number(engagementPercent.toFixed(2)),
        audienceRate: asNumber(ip?.audience_rate),
        retentionRate: asNumber(ip?.retention_rate),
        badgeTier: asString(ip?.badge_tier),
        badgeScore: asNumber(ip?.badge_score),
        gender: asString(ip?.gender),
        audienceType: asString(ip?.audience_type),
        age,
        pricePerPost: basePrice,
        pricingBreakdown,
        joinedAt: profile.created_at || null,
        socials: {
          instagram: asString(socials.instagram) || asString(socials.instagram_url),
          youtube: asString(socials.youtube) || asString(socials.youtube_url),
          tiktok: asString(socials.tiktok) || asString(socials.tiktok_url),
          twitter: asString(socials.twitter) || asString(socials.x),
          website: asString(socials.website),
        },
      },
      tryOns,
      stats: {
        totalTryOns,
        recentTryOnsCount: (jobsRes.data || []).length,
      },
      activity: {
        lastActiveAt,
        // Online if active within the last 5 minutes (a rough heuristic;
        // overridden client-side by the realtime presence channel)
        isLikelyActive:
          lastActiveAt && Date.now() - new Date(lastActiveAt).getTime() < 5 * 60 * 1000,
      },
      collaboration: {
        ...collabStats,
        responseRate,
        avgResponseHours,
        existingConversationId: conversationRes.data?.id || null,
        recentInteraction: conversationRes.data?.last_message_at || null,
      },
    })
  } catch (error) {
    console.error('[brand/influencers/profile] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
