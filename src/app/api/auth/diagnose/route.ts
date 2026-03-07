import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'

/**
 * Diagnostic endpoint to check user status in Supabase Profile.
 * PRODUCTION SAFETY:
 * - Disabled by default (ENABLE_DEBUG_AUTH_ENDPOINTS=true to enable)
 * - Requires authenticated admin user
 */
export async function POST(request: Request) {
  if (process.env.ENABLE_DEBUG_AUTH_ENDPOINTS !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: actorProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authUser.id)
      .maybeSingle()

    if ((actorProfile?.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    if (!body || !body.email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const email = String(body.email).trim().toLowerCase()
    const service = createServiceClient()

    const { data: authUsers } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const supabaseUser = authUsers?.users?.find(
      (u: any) => u.email?.toLowerCase().trim() === email
    )

    const { data: profile } = await service
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle()

    let influencerProfile = null
    if (profile && (profile.role || '').toLowerCase() === 'influencer') {
      const { data: ip } = await service
        .from('influencer_profiles')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle()
      influencerProfile = ip
    }

    return NextResponse.json({
      email,
      supabaseAuth: {
        exists: !!supabaseUser,
        userId: supabaseUser?.id || null,
        emailConfirmed: !!supabaseUser?.email_confirmed_at,
        createdAt: supabaseUser?.created_at || null,
        lastSignIn: supabaseUser?.last_sign_in_at || null,
      },
      profile: {
        exists: !!profile,
        userId: profile?.id || null,
        role: profile?.role || null,
        onboardingCompleted: profile?.onboarding_completed || false,
        approvalStatus: profile?.approval_status || null,
      },
      influencerProfile,
      status: {
        inAuth: !!supabaseUser,
        inProfile: !!profile,
        emailConfirmed: !!supabaseUser?.email_confirmed_at,
        needsProfile: !!supabaseUser && !profile,
        canLogin: !!supabaseUser && !!profile,
      },
    })
  } catch (error) {
    console.error('Diagnostic error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
