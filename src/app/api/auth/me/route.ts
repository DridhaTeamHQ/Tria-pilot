/**
 * GET /api/auth/me
 * 
 * READ-ONLY ENDPOINT:
 * - Fetches authenticated user from Supabase Auth
 * - Fetches profile from profiles table
 * - Returns { user, profile }
 * 
 * NEVER writes to profiles.
 * NEVER auto-creates missing profiles.
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

    // Handle auth errors
    if (authError) {
      if (!authError.message?.includes('Auth session missing')) {
        console.error('Auth error in /api/auth/me:', authError.message)
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch profile from profiles table (SOURCE OF TRUTH)
    const service = createServiceClient()
    const { data: profile, error: profileError } = await service
      .from('profiles')
      .select('id, email, role, onboarding_completed, approval_status, brand_data')
      .eq('id', authUser.id)
      .single()

    if (profileError) {
      console.error(`Profile error for ${authUser.id}:`, profileError)
      return NextResponse.json(
        { error: 'Profile not found', message: profileError.message },
        { status: 404 }
      )
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Normalize values to lowercase
    const role = (profile.role || 'influencer').toLowerCase()
    const approvalStatus = (profile.approval_status || 'none').toLowerCase()

    return NextResponse.json({
      user: {
        id: profile.id,
        email: profile.email,
        name: (profile.brand_data as any)?.companyName || null,
        role: role.toUpperCase(), // Backward compatibility
        slug: profile.email?.split('@')[0] || '',
      },
      profile: {
        id: profile.id,
        email: profile.email,
        role: role,
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
