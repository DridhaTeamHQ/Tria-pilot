import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import {
    getAffiliateCommissionAmount,
    getAffiliateOrderCount,
    getAffiliateRevenueAmount,
    isRealAffiliateEvent,
} from '@/lib/affiliate/events'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = await createClient()
        const {
            data: { user: authUser },
        } = await supabase.auth.getUser()

        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const service = createServiceClient()
        const { data: influencerProfile } = await service
            .from('influencer_profiles')
            .select('affiliate_code')
            .eq('user_id', authUser.id)
            .maybeSingle()

        // 1. Fetch all tracked links for this influencer
        const { data: links, error: linksError } = await service
            .from('tracked_links')
            .select(`
        id,
        link_code,
        masked_url,
        original_url,
        productId:product_id,
        click_count,
        created_at,
        product:product_id (
          id,
          name,
          cover_image
        )
      `)
            .eq('influencer_id', authUser.id)
            .order('created_at', { ascending: false })

        if (linksError) {
            throw linksError
        }

        const linkIds = (links || []).map((link) => link.id)
        const { data: linkClicks, error: clicksError } = linkIds.length > 0
            ? await service
                .from('link_clicks')
                .select('tracked_link_id, clicked_at')
                .in('tracked_link_id', linkIds)
            : { data: [], error: null }

        if (clicksError) {
            console.warn('Analytics clicks error:', clicksError)
        }

        const clickStats = new Map<string, { count: number; lastClickedAt: string | null }>()
        for (const click of linkClicks || []) {
            const trackedLinkId = click.tracked_link_id
            if (!trackedLinkId) continue
            const current = clickStats.get(trackedLinkId) || { count: 0, lastClickedAt: null }
            current.count += 1
            if (!current.lastClickedAt || (click.clicked_at && click.clicked_at > current.lastClickedAt)) {
                current.lastClickedAt = click.clicked_at || current.lastClickedAt
            }
            clickStats.set(trackedLinkId, current)
        }

        // 2. Fetch all conversion events (purchases) for these links.
        // CRITICAL: exclude rows tagged metadata.source='simulation' so the
        // admin simulation tool cannot inflate real influencer payouts.
        const { data: rawEvents, error: eventsError } = await service
            .from('affiliate_events')
            .select('id, tracked_link_id, amount, event_type, created_at, metadata')
            .eq('influencer_id', authUser.id)
            .eq('event_type', 'purchase')

        if (eventsError) {
            throw eventsError
        }

        const events = (rawEvents || []).filter((row) => isRealAffiliateEvent(row as any))

        // 3. Process data
        const totalClicks = links.reduce((sum, link) => {
            const actualClicks = clickStats.get(link.id)?.count || 0
            return sum + Math.max(actualClicks, link.click_count || 0)
        }, 0)
        const totalProducts = links.length
        const totalRevenue = events.reduce((sum, event) => sum + getAffiliateRevenueAmount(event as any), 0)
        const totalEarnings = events.reduce((sum, event) => sum + getAffiliateCommissionAmount(event as any), 0)

        const processedProducts = links.map((link: any) => {
            const productEvents = events.filter((e) => e.tracked_link_id === link.id)
            const revenue = productEvents.reduce((sum, e) => sum + getAffiliateRevenueAmount(e as any), 0)
            const earnings = productEvents.reduce((sum, e) => sum + getAffiliateCommissionAmount(e as any), 0)
            const orders = productEvents.reduce((sum, e) => sum + getAffiliateOrderCount(e as any), 0)
            const actualClicks = clickStats.get(link.id)?.count || 0
            const clickCount = Math.max(actualClicks, link.click_count || 0)

            return {
                productId: link.productId,
                productName: link.product?.name || 'Unknown Product',
                productImage: link.product?.cover_image || null,
                maskedUrl: link.masked_url,
                originalUrl: link.original_url,
                linkCode: link.link_code,
                clickCount,
                uniqueClicks: clickCount,
                orderCount: orders,
                revenue: revenue,
                earnings: earnings,
                lastClickedAt: clickStats.get(link.id)?.lastClickedAt || null,
                createdAt: link.created_at,
            }
        })

        return NextResponse.json({
            affiliateTag: influencerProfile?.affiliate_code || null,
            totalClicks,
            totalProducts,
            totalRevenue,
            totalEarnings,
            totalOrders: processedProducts.reduce((sum, product) => sum + Number(product.orderCount || 0), 0),
            averageClicks: totalProducts > 0 ? totalClicks / totalProducts : 0,
            products: processedProducts,
        })
    } catch (error) {
        console.error('Analytics API error:', error)
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
    }
}
