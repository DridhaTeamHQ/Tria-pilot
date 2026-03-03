import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/auth'

/**
 * Diagnostic endpoint to check user status in Supabase Profile
 * Helps debug authentication issues
 * 
 * Usage: POST /api/auth/diagnose
 * Body: { email: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || !body.email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const email = body.email.trim().toLowerCase()
    const service = createServiceClient()

    // Check Supabase Auth users
    const { data: authUsers, error: authError } = await service.auth.admin.listUsers()

    const supabaseUser = authUsers?.users?.find(
      (u: any) => u.email?.toLowerCase().trim() === email
    )

    // Check Supabase profiles table (SOURCE OF TRUTH)
    const { data: profile } = await service
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle()

    // Check influencer profile if exists
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
        emailConfirmed: supabaseUser?.email_confirmed_at ? true : false,
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
      influencerProfile: influencerProfile,
      status: {
        inAuth: !!supabaseUser,
        inProfile: !!profile,
        emailConfirmed: supabaseUser?.email_confirmed_at ? true : false,
        needsProfile: !!supabaseUser && !profile,
        canLogin: !!supabaseUser && !!profile,
      },
      recommendations: getRecommendations(supabaseUser, profile),
    })
  } catch (error) {
    console.error('Diagnostic error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

function getRecommendations(supabaseUser: any, profile: any): string[] {
  const recommendations: string[] = []

  if (!supabaseUser) {
    recommendations.push('User does not exist in Supabase Auth. They need to register first.')
  } else if (!supabaseUser.email_confirmed_at) {
    recommendations.push('User email is not confirmed. They need to verify their email address.')
  }

  if (supabaseUser && !profile) {
    recommendations.push('User exists in Auth but missing Profile. They should log in to trigger auto-creation or visit /complete-profile.')
  }

  if (supabaseUser && profile) {
    recommendations.push('Account looks healthy. Login should work.')
  }

  return recommendations
}
