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
      .select('id, email, role, onboarding_completed, approval_status, brand_data')
      .eq('id', authUser.id)
      .maybeSingle()

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

    return NextResponse.json({
      user: {
        id: profile.id,
        email: profile.email,
        name: (profile.brand_data as Record<string, unknown> | null)?.companyName || null,
        role: role.toUpperCase(),
        slug: profile.email?.split('@')[0] || '',
      },
      profile: {
        id: profile.id,
        email: profile.email,
        role,
        onboarding_completed: Boolean(profile.onboarding_completed),
        approval_status: approvalStatus,
        brand_data: profile.brand_data || null,
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
