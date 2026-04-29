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
        `id, email, full_name, role, avatar_url, approval_status, onboarding_completed,
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

    // ── Try-on gallery ─────────────────────────────────────────────────
    const { data: jobs } = await service
      .from('generation_jobs')
      .select('id, status, output_image_path, settings, created_at')
      .eq('user_id', id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(60)

    const tryOns = (jobs || [])
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
      .slice(0, 48) // cap to keep payload reasonable

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
        pricePerPost: asNumber(ip?.price_per_post),
        socials: {
          instagram: asString(socials.instagram) || asString(socials.instagram_url),
          youtube: asString(socials.youtube) || asString(socials.youtube_url),
          tiktok: asString(socials.tiktok) || asString(socials.tiktok_url),
          twitter: asString(socials.twitter) || asString(socials.x),
          website: asString(socials.website),
        },
      },
      tryOns,
    })
  } catch (error) {
    console.error('[brand/influencers/profile] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
