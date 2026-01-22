/**
 * GET /api/auth/profile-status
 * 
 * Returns current user's profile status for client-side routing checks.
 * Uses profiles table (or Prisma fallback) to get:
 * - role
 * - onboarding_completed
 * - approval_status
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import { getProfile } from '@/lib/auth-guard'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch profile using guard helper
    const profile = await getProfile(authUser.id)

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
