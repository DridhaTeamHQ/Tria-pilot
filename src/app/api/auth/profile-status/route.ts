/**
 * GET /api/auth/profile-status
 * 
 * Returns current user's profile status for client-side routing checks.
 * Uses new auth state system.
 */
import { NextResponse } from 'next/server'
import { getAuthState } from '@/lib/auth-state'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const state = await getAuthState()

    if (state.type === 'unauthenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (state.type === 'authenticated_no_profile') {
      return NextResponse.json({
        role: null,
        onboarding_completed: false,
        approval_status: 'draft',
      })
    }

    // Extract profile from state
    const profile = 'profile' in state ? state.profile : null

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json({
      role: profile.role,
      onboarding_completed: profile.onboarding_completed,
      approval_status: profile.approval_status,
    })
  } catch (error) {
    console.error('Profile status error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
