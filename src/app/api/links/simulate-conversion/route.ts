import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const bodySchema = z
    .object({
        linkCode: z.string().min(1).max(64),
        amount: z.number().positive().max(10_000_000),
    })
    .strict()

/**
 * POST /api/links/simulate-conversion
 *
 * SECURITY-CRITICAL: this endpoint inserts a `purchase` event into
 * `affiliate_events`, which directly drives influencer commission payouts
 * via the analytics endpoint. Without strict gating it allows free money
 * minting.
 *
 * Hard rules:
 *   1. Disabled in production unless ALLOW_AFFILIATE_SIMULATION=true is
 *      explicitly set (escape hatch for staging).
 *   2. Requires authenticated admin user.
 *   3. Validated input schema.
 *   4. Always tagged with metadata.source='simulation' so payout logic can
 *      filter it out from real revenue.
 *
 * Real conversions must come from a signed brand-storefront postback —
 * never from this endpoint.
 */
export async function POST(request: Request) {
    try {
        // ── Environment gate ─────────────────────────────────────────────────
        const isProd = process.env.NODE_ENV === 'production'
        const explicitlyAllowed = process.env.ALLOW_AFFILIATE_SIMULATION === 'true'
        if (isProd && !explicitlyAllowed) {
            return NextResponse.json(
                { error: 'Simulation endpoint is disabled in production.' },
                { status: 404 }
            )
        }

        // ── Auth gate: must be admin ─────────────────────────────────────────
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const service = createServiceClient()
        const { data: profile } = await service
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if ((profile?.role || '').toLowerCase() !== 'admin') {
            return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
        }

        // ── Input validation ─────────────────────────────────────────────────
        const json = await request.json().catch(() => null)
        const parsed = bodySchema.safeParse(json)
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
        }
        const { linkCode, amount } = parsed.data

        // ── Lookup tracked link ──────────────────────────────────────────────
        const { data: link, error: linkError } = await service
            .from('tracked_links')
            .select('id, influencer_id, product_id')
            .eq('link_code', linkCode)
            .single()

        if (linkError || !link) {
            return NextResponse.json({ error: 'Link not found' }, { status: 404 })
        }

        // ── Insert simulation event (clearly tagged) ─────────────────────────
        const { error: eventError } = await service.from('affiliate_events').insert({
            influencer_id: link.influencer_id,
            product_id: link.product_id,
            tracked_link_id: link.id,
            event_type: 'purchase',
            amount,
            currency: 'INR',
            metadata: {
                source: 'simulation',
                simulated_by_admin: user.id,
                timestamp: new Date().toISOString(),
            },
        })

        if (eventError) throw eventError

        return NextResponse.json({
            success: true,
            message: `Simulated purchase of Rs. ${amount} for link ${linkCode}`,
            influencerId: link.influencer_id,
            simulatedBy: user.id,
        })
    } catch (error) {
        console.error('Conversion simulation error:', error)
        return NextResponse.json({ error: 'Failed to record conversion' }, { status: 500 })
    }
}
