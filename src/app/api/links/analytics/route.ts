import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'

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

        const linkIds = links.map((link) => link.id).filter(Boolean)

        const { data: clickRows, error: clickRowsError } = linkIds.length
            ? await service
                .from('link_clicks')
                .select('tracked_link_id, created_at, ip_address')
                .in('tracked_link_id', linkIds)
            : { data: [], error: null as any }

        if (clickRowsError) {
            throw clickRowsError
        }

        // 2. Fetch all conversion events (purchases) for these links
        const { data: events, error: eventsError } = await service
            .from('affiliate_events')
            .select('id, tracked_link_id, amount, event_type, created_at')
            .eq('influencer_id', authUser.id)
            .eq('event_type', 'purchase')

        if (eventsError) {
            throw eventsError
        }

        const clickSummaryByLink = new Map<string, {
            clicks: number
            uniqueIpAddresses: Set<string>
            lastClickedAt: string | null
        }>()
        for (const row of clickRows || []) {
            const current = clickSummaryByLink.get(row.tracked_link_id) || {
                clicks: 0,
                lastClickedAt: null,
                uniqueIpAddresses: new Set<string>(),
            }
            current.clicks += 1
            if (row.ip_address) {
                current.uniqueIpAddresses.add(row.ip_address)
            }
            if (!current.lastClickedAt || new Date(row.created_at) > new Date(current.lastClickedAt)) {
                current.lastClickedAt = row.created_at
            }
            clickSummaryByLink.set(row.tracked_link_id, current)
        }

        // 3. Process data
        const totalClicks = links.reduce((sum, link) => {
            const summary = clickSummaryByLink.get(link.id)
            return sum + (summary?.clicks ?? link.click_count ?? 0)
        }, 0)
        const totalProducts = links.length
        const totalRevenue = events.reduce((sum, event) => sum + Number(event.amount || 0), 0)
        const totalEarnings = totalRevenue * 0.05 // 5% commission

        const processedProducts = links.map((link: any) => {
            const productEvents = events.filter((e) => e.tracked_link_id === link.id)
            const revenue = productEvents.reduce((sum, e) => sum + Number(e.amount || 0), 0)
            const earnings = revenue * 0.05 // 5% commission
            const clickSummary = clickSummaryByLink.get(link.id)

            return {
                productId: link.productId,
                productName: link.product?.name || 'Unknown Product',
                productImage: link.product?.cover_image || null,
                maskedUrl: link.masked_url,
                originalUrl: link.original_url,
                linkCode: link.link_code,
                clickCount: clickSummary?.clicks ?? link.click_count ?? 0,
                uniqueClicks: clickSummary?.uniqueIpAddresses.size ?? link.click_count ?? 0,
                revenue: revenue,
                earnings: earnings,
                lastClickedAt: clickSummary?.lastClickedAt ?? null,
                createdAt: link.created_at,
            }
        })

        return NextResponse.json({
            totalClicks,
            totalProducts,
            totalRevenue,
            totalEarnings,
            averageClicks: totalProducts > 0 ? totalClicks / totalProducts : 0,
            products: processedProducts,
        })
    } catch (error) {
        console.error('Analytics API error:', error)
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
    }
}
