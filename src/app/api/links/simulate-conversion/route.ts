import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/links/simulate-conversion
 * 
 * Body: { linkCode: string, amount: number }
 * 
 * Demonstrates the conversion tracking by manually recording a purchase event.
 * In a real scenario, this would be a postback from a brand's storefront.
 */
export async function POST(request: Request) {
    try {
        const { linkCode, amount } = await request.json()

        if (!linkCode || !amount) {
            return NextResponse.json({ error: 'linkCode and amount are required' }, { status: 400 })
        }

        const service = createServiceClient()

        // 1. Find the tracked link
        const { data: link, error: linkError } = await service
            .from('tracked_links')
            .select('id, influencer_id, product_id')
            .eq('link_code', linkCode)
            .single()

        if (linkError || !link) {
            return NextResponse.json({ error: 'Link not found' }, { status: 404 })
        }

        // 2. Record the affiliate event
        const { error: eventError } = await service.from('affiliate_events').insert({
            influencer_id: link.influencer_id,
            product_id: link.product_id,
            tracked_link_id: link.id,
            event_type: 'purchase',
            amount: amount,
            currency: 'INR',
            metadata: { source: 'simulation', timestamp: new Date().toISOString() }
        })

        if (eventError) {
            throw eventError
        }

        return NextResponse.json({
            success: true,
            message: `Recorded purchase of Rs. ${amount} for link ${linkCode}`,
            influencerId: link.influencer_id
        })
    } catch (error) {
        console.error('Conversion simulation error:', error)
        return NextResponse.json({ error: 'Failed to record conversion' }, { status: 500 })
    }
}
