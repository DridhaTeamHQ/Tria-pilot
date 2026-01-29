/**
 * GET /api/auth/me
 * 
 * MUST:
 * - Use auth.getUser()
 * - Fetch profile by id from profiles table
 * - Return { user, profile }
 * 
 * NEVER refresh token manually
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import { fetchProfile } from '@/lib/auth-state'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    // Handle auth errors gracefully
    if (authError) {
      if (
        authError.message?.includes('refresh_token') ||
        authError.message?.includes('Auth session missing') ||
        authError.message?.includes('JWT')
      ) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      console.error('Auth error in /api/auth/me:', authError.message)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch profile from profiles table (SOURCE OF TRUTH)
    const profile = await fetchProfile(authUser.id)

    if (!profile) {
      // User exists in auth but no profile → needs profile completion
      return NextResponse.json(
        {
          user: {
            id: authUser.id,
            email: authUser.email?.toLowerCase().trim() || '',
            name: null,
            role: null,
            slug: null,
          },
          profile: null,
          requiresProfile: true,
          next: '/complete-profile',
        },
        {
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      )
    }

    // Return user + profile
    return NextResponse.json(
      {
        user: {
          id: profile.id,
          email: profile.email,
          name: null, // Name is stored in InfluencerProfile/BrandProfile, not profiles
          role: profile.role.toUpperCase(), // Convert to uppercase for backward compatibility
          slug: profile.email.split('@')[0], // Generate slug from email
          status: profile.approval_status,
        },
        profile: {
          id: profile.id,
          email: profile.email,
          role: profile.role,
          onboarding_completed: profile.onboarding_completed,
          approval_status: profile.approval_status,
        },
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
        },
      }
    )
  } catch (error) {
    console.error('Get user error:', error)

    if (
      error instanceof Error &&
      (error.message.includes("Can't reach database") ||
        error.message.includes('Connection') ||
        error.message.includes('timeout'))
    ) {
      return NextResponse.json(
        { error: 'Database connection error. Please try again later.' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
