/**
 * GET /api/auth/me
 *
 * MUST: Use auth.getUser() then getOrCreateUser (single source of truth for Prisma User).
 * Return { user, profile }.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import { getOrCreateUser } from '@/lib/prisma-user'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    // Handle auth errors gracefully
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ensure Prisma User exists (idempotent)
    const user = await getOrCreateUser({
      id: authUser.id,
      email: authUser.email ?? '',
      user_metadata: authUser.user_metadata,
    })

    // Fetch complete profile with relations
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        influencerProfile: true,
        brandProfile: true
      }
    })

    if (!dbUser) throw new Error("Sync failed")

    // Construct response matching frontend expectation
    return NextResponse.json(
      {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
          slug: dbUser.slug,
          status: dbUser.status, // mapped to approval_status in schema
        },
        profile: dbUser.influencerProfile || dbUser.brandProfile || null,
        // Helper flags
        requiresProfile: !dbUser.influencerProfile && !dbUser.brandProfile && dbUser.role !== 'ADMIN',
        onboardingCompleted: dbUser.influencerProfile?.onboardingCompleted ?? false
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=10, stale-while-revalidate=60',
        },
      }
    )
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
