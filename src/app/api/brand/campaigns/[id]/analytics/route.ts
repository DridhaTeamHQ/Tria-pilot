/**
 * GET /api/brand/campaigns/[id]/analytics
 *
 * Returns a snapshot of campaign performance for a brand:
 *   - core metrics from the campaign row (spend, impressions, clicks, conversions)
 *   - derived: CTR, conversion rate, CPC, CPA, ROAS
 *   - roster: collaboration_requests for this brand (proxy for invited creators)
 *   - link analytics: top tracked links + clicks for the brand's products
 *   - 30-day click time-series
 */

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function safeNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function ratio(a: number, b: number): number {
  if (!b) return 0
  return Number(((a / b) * 100).toFixed(2))
}

function bucketByDay(dates: Array<string | Date>, days = 30): Array<{ date: string; count: number }> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const out: Array<{ date: string; count: number }> = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    out.push({ date: d.toISOString().slice(0, 10), count: 0 })
  }
  const indexByDate = new Map(out.map((b, i) => [b.date, i]))
  for (const dt of dates) {
    const key = new Date(dt).toISOString().slice(0, 10)
    const idx = indexByDate.get(key)
    if (idx != null) out[idx].count += 1
  }
  return out
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

    // ── Campaign row + ownership check ─────────────────────────────────
    const { data: campaign, error: campaignErr } = await service
      .from('campaigns')
      .select('id, brand_id, title, status, spend, impressions, clicks, conversions, daily_budget, total_budget, created_at, updated_at')
      .eq('id', campaignId)
      .single()

    if (campaignErr || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (campaign.brand_id !== authUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const spend = safeNumber(campaign.spend)
    const impressions = safeNumber(campaign.impressions)
    const clicks = safeNumber(campaign.clicks)
    const conversions = safeNumber(campaign.conversions)

    const ctr = ratio(clicks, impressions)
    const cvr = ratio(conversions, clicks)
    const cpc = clicks > 0 ? Number((spend / clicks).toFixed(2)) : 0
    const cpa = conversions > 0 ? Number((spend / conversions).toFixed(2)) : 0

    // ── Roster: collab requests created since campaign was created ─────
    const since = new Date(new Date(campaign.created_at).getTime() - 24 * 60 * 60 * 1000).toISOString()
    const { data: rosterRaw } = await service
      .from('collaboration_requests')
      .select(`id, status, created_at, influencer_id,
               influencer:influencer_id(id, full_name, avatar_url, influencer_profiles(followers, niches, badge_tier))`)
      .eq('brand_id', authUser.id)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(50)

    const roster = (rosterRaw || []).map((r: any) => {
      const ip = Array.isArray(r.influencer?.influencer_profiles)
        ? r.influencer.influencer_profiles[0]
        : r.influencer?.influencer_profiles
      return {
        invitationId: r.id,
        status: r.status,
        invitedAt: r.created_at,
        creator: r.influencer
          ? {
              id: r.influencer.id,
              name: r.influencer.full_name || 'Creator',
              avatarUrl: r.influencer.avatar_url || null,
              followers: ip?.followers ?? null,
              niches: Array.isArray(ip?.niches) ? ip.niches : [],
              badgeTier: ip?.badge_tier ?? null,
            }
          : null,
      }
    })

    const rosterCounts = roster.reduce(
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

    // ── Tracked link analytics for the brand's products ────────────────
    const { data: trackedLinks } = await service
      .from('tracked_links')
      .select('id, product_id, click_count, created_at, products!inner(brand_id, name)')
      .eq('products.brand_id', authUser.id)
      .order('click_count', { ascending: false })
      .limit(20)

    const topLinks = (trackedLinks || []).map((tl: any) => ({
      id: tl.id,
      productName: tl.products?.name || 'Product',
      clicks: safeNumber(tl.click_count),
      createdAt: tl.created_at,
    }))
    const totalLinkClicks = topLinks.reduce((s, l) => s + l.clicks, 0)

    // ── 30-day click time series from link_clicks for these tracked links ──
    let clickSeries: Array<{ date: string; count: number }> = bucketByDay([], 30)
    const linkIds = (trackedLinks || []).map((tl: any) => tl.id).filter(Boolean)
    if (linkIds.length > 0) {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const { data: linkClicks } = await service
        .from('link_clicks')
        .select('clicked_at')
        .in('tracked_link_id', linkIds)
        .gte('clicked_at', thirtyDaysAgo.toISOString())
        .limit(5000)
      clickSeries = bucketByDay((linkClicks || []).map((c: any) => c.clicked_at), 30)
    }

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        title: campaign.title,
        status: campaign.status,
        createdAt: campaign.created_at,
        updatedAt: campaign.updated_at,
      },
      metrics: {
        spend,
        impressions,
        clicks,
        conversions,
        ctr,         // %
        cvr,         // %
        cpc,         // INR
        cpa,         // INR
        dailyBudget: safeNumber(campaign.daily_budget),
        totalBudget: safeNumber(campaign.total_budget),
      },
      roster: {
        counts: rosterCounts,
        creators: roster,
      },
      links: {
        totalClicks: totalLinkClicks,
        top: topLinks,
        series: clickSeries,
      },
    })
  } catch (error) {
    console.error('[campaign-analytics] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
