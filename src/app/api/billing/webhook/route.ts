import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/auth'
import { buildSubscriptionProfileUpdate, verifyRazorpaySignature } from '@/lib/razorpay'

export async function POST(request: Request) {
  try {
    const signature = request.headers.get('x-razorpay-signature')
    const secret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim()

    if (!signature || !secret) {
      return NextResponse.json({ error: 'Missing webhook signature or secret.' }, { status: 400 })
    }

    const payload = await request.text()
    if (!verifyRazorpaySignature(payload, signature, secret)) {
      return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 })
    }

    const event = JSON.parse(payload)
    const subscription = event?.payload?.subscription?.entity

    if (!subscription?.id) {
      return NextResponse.json({ ok: true, ignored: true })
    }

    const service = createServiceClient()
    const claimedUserId = String(subscription.notes?.user_id || '')
    const fallbackRole = String(subscription.notes?.role || 'influencer').toLowerCase()
    const update = buildSubscriptionProfileUpdate(subscription, fallbackRole)

    // ── Resolve target user safely ────────────────────────────────────────
    // Always prefer matching by razorpay_subscription_id — this is the only
    // field we know is bound to a real user (set when checkout was created).
    // The notes.user_id is attacker-controllable in some flows, so we only
    // accept it AFTER cross-checking that the subscription_id already
    // belongs to that user.
    const { data: ownerRow } = await service
      .from('profiles')
      .select('id')
      .eq('razorpay_subscription_id', subscription.id)
      .maybeSingle()

    let targetUserId: string | null = null

    if (ownerRow?.id) {
      // Subscription is already bound to a profile — use that.
      targetUserId = ownerRow.id

      // If the notes claim a different user_id, that's a tampering attempt.
      if (claimedUserId && claimedUserId !== ownerRow.id) {
        console.warn(
          `[billing/webhook] notes.user_id (${claimedUserId}) does not match owner (${ownerRow.id}) for subscription ${subscription.id} — ignoring claim`
        )
      }
    } else if (claimedUserId) {
      // First-time subscription: no row owns this subscription_id yet.
      // Verify the claimed user exists and doesn't already have a different
      // subscription bound, then bind this one to them.
      const { data: claimedUserRow } = await service
        .from('profiles')
        .select('id, razorpay_subscription_id')
        .eq('id', claimedUserId)
        .maybeSingle()

      if (
        claimedUserRow?.id &&
        (!claimedUserRow.razorpay_subscription_id ||
          claimedUserRow.razorpay_subscription_id === subscription.id)
      ) {
        targetUserId = claimedUserRow.id
      } else {
        console.warn(
          `[billing/webhook] cannot bind subscription ${subscription.id} to user ${claimedUserId} (already has subscription or user not found)`
        )
      }
    }

    if (!targetUserId) {
      console.warn(`[billing/webhook] no target user resolved for subscription ${subscription.id}`)
      return NextResponse.json({ ok: true, ignored: true, reason: 'no target user' })
    }

    const { error } = await service.from('profiles').update(update).eq('id', targetUserId)
    if (error) throw error

    return NextResponse.json({ ok: true, event: event.event || null })
  } catch (error) {
    console.error('Billing webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
