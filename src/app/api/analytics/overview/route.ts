import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import {
  getAffiliateCommissionAmount,
  getAffiliateOrderCount,
  getAffiliateRevenueAmount,
  isRealAffiliateEvent,
} from '@/lib/affiliate/events'

export const dynamic = 'force-dynamic'

type Role = 'admin' | 'brand' | 'influencer'

type ProductRow = {
  id: string
  brand_id?: string | null
  name?: string | null
  category?: string | null
  price?: number | string | null
  active?: boolean | null
  created_at?: string | null
}

type LinkRow = {
  id: string
  influencer_id?: string | null
  product_id?: string | null
  click_count?: number | null
  created_at?: string | null
}

type EventRow = {
  id: string
  influencer_id?: string | null
  product_id?: string | null
  tracked_link_id?: string | null
  event_type?: string | null
  amount?: number | string | null
  created_at?: string | null
  metadata?: { source?: string } | null
}

type ClickRow = {
  tracked_link_id?: string | null
  clicked_at?: string | null
  device_type?: string | null
  country?: string | null
}

type CampaignRow = {
  id: string
  brand_id?: string | null
  title?: string | null
  status?: string | null
  spend?: number | string | null
  impressions?: number | null
  clicks?: number | null
  conversions?: number | null
  created_at?: string | null
}

function numberValue(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function dayKey(value?: string | null) {
  return value ? value.slice(0, 10) : 'Unknown'
}

function percent(part: number, total: number) {
  return total > 0 ? Number(((part / total) * 100).toFixed(2)) : 0
}

function normalizeRole(value: unknown): Role | null {
  const role = String(value || '').toLowerCase()
  if (role === 'admin' || role === 'brand' || role === 'influencer') return role
  return null
}

async function safeSelect<T>(
  query: PromiseLike<{ data: T[] | null; error: unknown }>,
  label: string,
) {
  const { data, error } = await query
  if (error) {
    console.warn(`[analytics-overview] ${label} unavailable`, error)
    return [] as T[]
  }
  return data || []
}

function groupByIdName(
  profiles: Array<{ id: string; full_name?: string | null; name?: string | null; email?: string | null; role?: string | null }>,
) {
  return Object.fromEntries(
    profiles.map((profile) => [
      profile.id,
      profile.full_name || profile.name || profile.email || 'Unknown',
    ]),
  )
}

function sortByValue<T extends Record<string, unknown>>(rows: T[], key: keyof T, limit = 8) {
  return rows.sort((a, b) => numberValue(b[key]) - numberValue(a[key])).slice(0, limit)
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const requestedDays = Number(url.searchParams.get('days') || 30)
    const days = [7, 30, 90, 365].includes(requestedDays) ? requestedDays : 30
    const start = new Date()
    start.setDate(start.getDate() - days)
    const startIso = start.toISOString()

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = createServiceClient()
    const { data: profile, error: profileError } = await service
      .from('profiles')
      .select('id, role, full_name, name, email')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const role = normalizeRole(profile.role)
    if (!role) {
      return NextResponse.json({ error: 'Unsupported role' }, { status: 403 })
    }

    const [products, links, events, clicks, campaigns, profiles, collaborations] = await Promise.all([
      safeSelect<ProductRow>(
        service.from('products').select('id, brand_id, name, category, price, active, created_at').limit(5000),
        'products',
      ),
      safeSelect<LinkRow>(
        service.from('tracked_links').select('id, influencer_id, product_id, click_count, created_at').limit(5000),
        'tracked_links',
      ),
      safeSelect<EventRow>(
        service
          .from('affiliate_events')
          .select('id, influencer_id, product_id, tracked_link_id, event_type, amount, created_at, metadata')
          .gte('created_at', startIso)
          .limit(5000),
        'affiliate_events',
      ),
      safeSelect<ClickRow>(
        service.from('link_clicks').select('tracked_link_id, clicked_at, device_type, country').gte('clicked_at', startIso).limit(5000),
        'link_clicks',
      ),
      safeSelect<CampaignRow>(
        service
          .from('campaigns')
          .select('id, brand_id, title, status, spend, impressions, conversions, created_at')
          .limit(2000),
        'campaigns',
      ),
      safeSelect<{ id: string; full_name?: string | null; name?: string | null; email?: string | null; role?: string | null }>(
        service.from('profiles').select('id, full_name, name, email, role').limit(5000),
        'profiles',
      ),
      safeSelect<{ id: string; brand_id?: string | null; influencer_id?: string | null; status?: string | null; created_at?: string | null }>(
        service.from('collaboration_requests').select('id, brand_id, influencer_id, status, created_at').limit(5000),
        'collaboration_requests',
      ),
    ])

    const scopedProducts =
      role === 'brand' ? products.filter((product) => product.brand_id === user.id) : products
    const scopedProductIds = new Set(scopedProducts.map((product) => product.id))

    const scopedLinks =
      role === 'influencer'
        ? links.filter((link) => link.influencer_id === user.id)
        : role === 'brand'
          ? links.filter((link) => link.product_id && scopedProductIds.has(link.product_id))
          : links
    const scopedLinkIds = new Set(scopedLinks.map((link) => link.id))

    const purchases = events.filter((event) => isRealAffiliateEvent(event))
    const scopedEvents =
      role === 'influencer'
        ? purchases.filter((event) => event.influencer_id === user.id)
        : role === 'brand'
          ? purchases.filter((event) => event.product_id && scopedProductIds.has(event.product_id))
          : purchases

    const scopedClicks = clicks.filter((click) => click.tracked_link_id && scopedLinkIds.has(click.tracked_link_id))
    const scopedCampaigns =
      role === 'brand' ? campaigns.filter((campaign) => campaign.brand_id === user.id) : campaigns
    const scopedCollaborations =
      role === 'influencer'
        ? collaborations.filter((item) => item.influencer_id === user.id)
        : role === 'brand'
          ? collaborations.filter((item) => item.brand_id === user.id)
          : collaborations

    const profileNames = groupByIdName(profiles)
    const productsById = Object.fromEntries(products.map((product) => [product.id, product]))
    const brandNames = profileNames
    const revenue = scopedEvents.reduce((sum, event) => sum + getAffiliateRevenueAmount(event), 0)
    const orders = scopedEvents.reduce((sum, event) => sum + getAffiliateOrderCount(event), 0)
    const linkClicks = scopedLinks.reduce((sum, link) => sum + numberValue(link.click_count), 0)
    const trackedClicks = scopedClicks.length
    const totalClicks = Math.max(linkClicks, trackedClicks)
    const spend = scopedCampaigns.reduce((sum, campaign) => sum + numberValue(campaign.spend), 0)
    const impressions = scopedCampaigns.reduce((sum, campaign) => sum + numberValue(campaign.impressions), 0)
    const campaignClicks = scopedCampaigns.reduce((sum, campaign) => sum + numberValue(campaign.clicks), 0)
    const conversions = Math.max(
      scopedCampaigns.reduce((sum, campaign) => sum + numberValue(campaign.conversions), 0),
      orders,
    )
    const commission = scopedEvents.reduce((sum, event) => sum + getAffiliateCommissionAmount(event), 0)

    const byDay = new Map<string, { day: string; clicks: number; orders: number; revenue: number }>()
    for (const click of scopedClicks) {
      const key = dayKey(click.clicked_at)
      const row = byDay.get(key) || { day: key, clicks: 0, orders: 0, revenue: 0 }
      row.clicks += 1
      byDay.set(key, row)
    }
    for (const event of scopedEvents) {
      const key = dayKey(event.created_at)
      const row = byDay.get(key) || { day: key, clicks: 0, orders: 0, revenue: 0 }
      row.orders += getAffiliateOrderCount(event)
      row.revenue += getAffiliateRevenueAmount(event)
      byDay.set(key, row)
    }

    const productStats = new Map<string, { id: string; name: string; category: string; clicks: number; orders: number; revenue: number }>()
    for (const link of scopedLinks) {
      if (!link.product_id) continue
      const product = productsById[link.product_id]
      const row = productStats.get(link.product_id) || {
        id: link.product_id,
        name: product?.name || 'Unknown product',
        category: product?.category || 'Uncategorized',
        clicks: 0,
        orders: 0,
        revenue: 0,
      }
      row.clicks += numberValue(link.click_count)
      productStats.set(link.product_id, row)
    }
    for (const event of scopedEvents) {
      if (!event.product_id) continue
      const product = productsById[event.product_id]
      const row = productStats.get(event.product_id) || {
        id: event.product_id,
        name: product?.name || 'Unknown product',
        category: product?.category || 'Uncategorized',
        clicks: 0,
        orders: 0,
        revenue: 0,
      }
      row.orders += getAffiliateOrderCount(event)
      row.revenue += getAffiliateRevenueAmount(event)
      productStats.set(event.product_id, row)
    }

    const influencerStats = new Map<string, { id: string; name: string; clicks: number; orders: number; revenue: number; commission: number }>()
    for (const link of scopedLinks) {
      if (!link.influencer_id) continue
      const row = influencerStats.get(link.influencer_id) || {
        id: link.influencer_id,
        name: profileNames[link.influencer_id] || 'Unknown influencer',
        clicks: 0,
        orders: 0,
        revenue: 0,
        commission: 0,
      }
      row.clicks += numberValue(link.click_count)
      influencerStats.set(link.influencer_id, row)
    }
    for (const event of scopedEvents) {
      if (!event.influencer_id) continue
      const row = influencerStats.get(event.influencer_id) || {
        id: event.influencer_id,
        name: profileNames[event.influencer_id] || 'Unknown influencer',
        clicks: 0,
        orders: 0,
        revenue: 0,
        commission: 0,
      }
      row.orders += getAffiliateOrderCount(event)
      row.revenue += getAffiliateRevenueAmount(event)
      row.commission += getAffiliateCommissionAmount(event)
      influencerStats.set(event.influencer_id, row)
    }

    const brandStats = new Map<string, { id: string; name: string; products: number; orders: number; revenue: number }>()
    for (const product of scopedProducts) {
      if (!product.brand_id) continue
      const row = brandStats.get(product.brand_id) || {
        id: product.brand_id,
        name: brandNames[product.brand_id] || 'Unknown brand',
        products: 0,
        orders: 0,
        revenue: 0,
      }
      row.products += 1
      brandStats.set(product.brand_id, row)
    }
    for (const event of scopedEvents) {
      const product = event.product_id ? productsById[event.product_id] : null
      if (!product?.brand_id) continue
      const row = brandStats.get(product.brand_id) || {
        id: product.brand_id,
        name: brandNames[product.brand_id] || 'Unknown brand',
        products: 0,
        orders: 0,
        revenue: 0,
      }
      row.orders += getAffiliateOrderCount(event)
      row.revenue += getAffiliateRevenueAmount(event)
      brandStats.set(product.brand_id, row)
    }

    const deviceStats = new Map<string, number>()
    const countryStats = new Map<string, number>()
    for (const click of scopedClicks) {
      const device = click.device_type || 'Unknown'
      const country = click.country || 'Unknown'
      deviceStats.set(device, (deviceStats.get(device) || 0) + 1)
      countryStats.set(country, (countryStats.get(country) || 0) + 1)
    }

    return NextResponse.json({
      role,
      viewer: {
        id: user.id,
        name: profile.full_name || profile.name || profile.email || 'User',
      },
      period: { days },
      kpis: {
        revenue,
        commission,
        orders,
        clicks: totalClicks,
        trackedClicks,
        products: scopedProducts.length,
        activeProducts: scopedProducts.filter((product) => product.active !== false).length,
        campaigns: scopedCampaigns.length,
        activeCampaigns: scopedCampaigns.filter((campaign) => campaign.status === 'active').length,
        collaborations: scopedCollaborations.length,
        pendingCollaborations: scopedCollaborations.filter((item) => item.status === 'pending').length,
        influencers: role === 'brand' ? influencerStats.size : profiles.filter((item) => normalizeRole(item.role) === 'influencer').length,
        brands: role === 'admin' ? profiles.filter((item) => normalizeRole(item.role) === 'brand').length : undefined,
        spend,
        impressions,
        ctr: percent(Math.max(campaignClicks, totalClicks), impressions),
        cvr: percent(orders, totalClicks),
        roas: spend > 0 ? Number((revenue / spend).toFixed(2)) : 0,
        aov: orders > 0 ? Number((revenue / orders).toFixed(2)) : 0,
      },
      series: Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day)),
      topProducts: sortByValue(Array.from(productStats.values()), 'revenue'),
      topInfluencers: sortByValue(Array.from(influencerStats.values()), 'revenue'),
      topBrands: sortByValue(Array.from(brandStats.values()), 'revenue'),
      devices: sortByValue(
        Array.from(deviceStats.entries()).map(([label, value]) => ({ label, value })),
        'value',
        6,
      ),
      countries: sortByValue(
        Array.from(countryStats.entries()).map(([label, value]) => ({ label, value })),
        'value',
        8,
      ),
      campaigns: sortByValue(
        scopedCampaigns.map((campaign) => ({
          id: campaign.id,
          title: campaign.title || 'Untitled campaign',
          status: campaign.status || 'draft',
          spend: numberValue(campaign.spend),
          impressions: numberValue(campaign.impressions),
          clicks: numberValue(campaign.clicks),
          conversions: numberValue(campaign.conversions),
        })),
        'impressions',
        6,
      ),
    })
  } catch (error) {
    console.error('[analytics-overview] error:', error)
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 })
  }
}
