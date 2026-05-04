/**
 * GET /api/brand/campaigns/[id]/roster
 *
 * Returns the creators invited to a specific campaign.
 *
 * Linkage: collaboration_requests.proposal_details JSONB stores
 * `campaignId` for invitations created from a campaign context. This
 * endpoint filters by that key. Falls back to "recent collabs" when no
 * campaign-tagged collabs exist (legacy data created before the field).
 *
 * Brand-only.
 */

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authUser.id)
      .maybeSingle()

    if ((profile?.role || '').toLowerCase() !== 'brand') {
      return NextResponse.json({ error: 'Forbidden — brand only' }, { status: 403 })
    }

    const { id: campaignId } = await ctx.params
    const service = createServiceClient()

    // Verify campaign ownership
    const { data: campaign } = await service
      .from('campaigns')
      .select('id, brand_id, title, status, created_at')
      .eq('id', campaignId)
      .single()

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (campaign.brand_id !== authUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Pull collabs for this brand. We filter further in JS so we can match
    // both campaign-tagged collabs (proposal_details.campaignId === id) AND
    // surface "recent" collabs as a fallback if the brand never tagged any.
    const { data: collabs, error: collabErr } = await service
      .from('collaboration_requests')
      .select(`
        id, status, message, proposal_details, created_at, updated_at,
        influencer:influencer_id(
          id, full_name, email, avatar_url,
          influencer_profiles(followers, engagement_rate, niches, badge_tier, price_per_post)
        )
      `)
      .eq('brand_id', authUser.id)
      .order('created_at', { ascending: false })
      .limit(200)

    if (collabErr) {
      console.error('[campaign roster] collab fetch error:', collabErr)
      return NextResponse.json({ error: 'Failed to load roster' }, { status: 500 })
    }

    const tagged = (collabs || []).filter((c: any) => {
      const pd = (c.proposal_details || {}) as Record<string, unknown>
      return pd.campaignId === campaignId
    })

    const explicit = tagged.length > 0
    const source = explicit
      ? tagged
      : // Fallback: collabs created within 30 days of the campaign start, capped to 50
        (collabs || [])
          .filter((c: any) => {
            const created = new Date(c.created_at).getTime()
            const campaignStart = new Date(campaign.created_at).getTime()
            return created >= campaignStart - 86400_000 && created <= Date.now()
          })
          .slice(0, 50)

    const roster = source.map((c: any) => {
      const ip = Array.isArray(c.influencer?.influencer_profiles)
        ? c.influencer.influencer_profiles[0]
        : c.influencer?.influencer_profiles
      const erRaw = Number(ip?.engagement_rate ?? 0)
      const er = erRaw <= 1 ? erRaw * 100 : erRaw
      return {
        invitationId: c.id,
        status: c.status,
        message: c.message,
        invitedAt: c.created_at,
        respondedAt: c.updated_at,
        creator: c.influencer
          ? {
              id: c.influencer.id,
              name: c.influencer.full_name || 'Creator',
              email: c.influencer.email || null,
              avatarUrl: c.influencer.avatar_url || null,
              followers: typeof ip?.followers === 'number' ? ip.followers : null,
              engagementRate: Number.isFinite(er) ? Number(er.toFixed(2)) : null,
              niches: Array.isArray(ip?.niches) ? ip.niches : [],
              badgeTier: ip?.badge_tier || null,
              pricePerPost: ip?.price_per_post ? Number(ip.price_per_post) : null,
            }
          : null,
      }
    })

    const counts = roster.reduce(
      (acc, r) => {
        acc.total += 1
        const s = String(r.status || '').toLowerCase()
        if (s === 'pending') acc.pending += 1
        else if (s === 'accepted') acc.accepted += 1
        else if (s === 'declined') acc.declined += 1
        return acc
      },
      { total: 0, pending: 0, accepted: 0, declined: 0 },
    )

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        title: campaign.title,
        status: campaign.status,
      },
      roster,
      counts,
      isExplicitlyLinked: explicit,
    })
  } catch (error) {
    console.error('[campaign roster] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
