/**
 * GET /api/auth/me
 *
 * READ-ONLY ENDPOINT:
 * - Fetches authenticated user from Supabase Auth
 * - Fetches profile from profiles table
 * - Returns { user, profile }
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      if (!authError.message?.includes('Auth session missing')) {
        console.error('Auth error in /api/auth/me:', authError.message)
      }
      return NextResponse.json({ user: null, profile: null })
    }

    if (!authUser) {
      return NextResponse.json({ user: null, profile: null })
    }

    let profileClient: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createServiceClient> = supabase
    try {
      profileClient = createServiceClient()
    } catch (serviceError) {
      console.warn('Service role unavailable in /api/auth/me; falling back to session client:', serviceError)
      profileClient = supabase
    }

    const { data: profile, error: profileError } = await profileClient
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle<any>()

    if (profileError || !profile) {
      console.warn(`Profile missing/unreadable for ${authUser.id}:`, profileError?.message || 'not found')

      const fallbackRole = String(authUser.user_metadata?.role || 'influencer').toLowerCase() === 'brand'
        ? 'brand'
        : 'influencer'

      return NextResponse.json({
        user: {
          id: authUser.id,
          email: authUser.email || '',
          name: (authUser.user_metadata?.name as string) || (authUser.user_metadata?.full_name as string) || null,
          role: fallbackRole.toUpperCase(),
          slug: authUser.email?.split('@')[0] || '',
        },
        profile: null,
      })
    }

    const role = (profile.role || 'influencer').toLowerCase()
    const approvalStatus = (profile.approval_status || 'none').toLowerCase()
    const subscription = {
      provider: profile.subscription_provider || null,
      role: profile.subscription_role || role,
      tier: profile.subscription_tier || null,
      status: profile.subscription_status || 'inactive',
      plan_id: profile.subscription_plan_id || null,
      current_period_end: profile.subscription_current_period_end || null,
      cancel_at_period_end: Boolean(profile.subscription_cancel_at_period_end),
      has_customer: Boolean(profile.razorpay_customer_id),
      subscription_id: profile.razorpay_subscription_id || null,
    }

    return NextResponse.json({
      user: {
        id: profile.id,
        email: profile.email,
        name: (profile.brand_data as Record<string, unknown> | null)?.companyName || profile.full_name || null,
        role: role.toUpperCase(),
        slug: profile.email?.split('@')[0] || '',
        subscription,
      },
      profile: {
        id: profile.id,
        email: profile.email,
        role,
        onboarding_completed: Boolean(profile.onboarding_completed),
        approval_status: approvalStatus,
        brand_data: profile.brand_data || null,
        subscription,
      },
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
