import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import { buildSubscriptionProfileUpdate, razorpayRequest, verifyRazorpaySignature } from '@/lib/razorpay'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body?.subscriptionId || !body?.paymentId || !body?.signature) {
      return NextResponse.json({ error: 'Missing Razorpay verification payload.' }, { status: 400 })
    }

    const secret = (process.env.RAZORPAY_KEY_SECRET || '').trim()
    if (!secret) {
      return NextResponse.json({ error: 'Razorpay is not configured yet.' }, { status: 503 })
    }

    const signedPayload = `${body.paymentId}|${body.subscriptionId}`
    if (!verifyRazorpaySignature(signedPayload, body.signature, secret)) {
      return NextResponse.json({ error: 'Invalid Razorpay signature.' }, { status: 400 })
    }

    const subscription = await razorpayRequest<any>(`/subscriptions/${body.subscriptionId}`)
    const subscriptionUserId = String(subscription.notes?.user_id || '')

    // SECURITY: ownership must be PROVEN, not just "not contradicted".
    // Previously we only rejected when notes.user_id existed AND was a
    // different user — meaning a subscription with empty notes would
    // silently bind to whoever called this endpoint, allowing one user
    // to attach another user's plan tier to their own profile.
    if (!subscriptionUserId || subscriptionUserId !== user.id) {
      return NextResponse.json(
        { error: 'Subscription does not belong to this user.' },
        { status: 403 },
      )
    }

    const service = createServiceClient()

    // SECURITY: also verify the same razorpay_subscription_id isn't already
    // bound to a DIFFERENT user. Prevents a re-bind attack where a user
    // tries to claim ownership of a subscription that legitimately belongs
    // to someone else (mirrors the webhook hardening).
    const { data: priorOwner } = await service
      .from('profiles')
      .select('id')
      .eq('razorpay_subscription_id', body.subscriptionId)
      .maybeSingle()

    if (priorOwner && priorOwner.id !== user.id) {
      return NextResponse.json(
        { error: 'Subscription is bound to a different account.' },
        { status: 409 },
      )
    }

    const { data: profile, error } = await service
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single<any>()

    if (error || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    await service
      .from('profiles')
      .update(buildSubscriptionProfileUpdate(subscription, profile.role || 'influencer'))
      .eq('id', user.id)

    return NextResponse.json({ ok: true, status: subscription.status || 'authenticated' })
  } catch (error) {
    console.error('Billing verify error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
