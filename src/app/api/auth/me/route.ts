/**
 * GET /api/auth/me
 *
 * MUST: Use auth.getUser() then getOrCreateUser (single source of truth for Prisma User).
 * Upserts Prisma User so prisma.user.findUnique({ id: session.user.id }) returns a row.
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import { getOrCreateUser } from '@/lib/prisma-user'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = createServiceClient()
    const { data: profileRow } = await service
      .from('profiles')
      .select('role')
      .eq('id', authUser.id)
      .maybeSingle()
    const roleFromProfile = profileRow?.role?.toString().toUpperCase()
    const roleForPrisma = (roleFromProfile ?? authUser.user_metadata?.role ?? undefined) as
      | 'influencer'
      | 'brand'
      | 'INFLUENCER'
      | 'BRAND'
      | 'ADMIN'
      | undefined

    const user = await getOrCreateUser({
      id: authUser.id,
      email: authUser.email ?? '',
      role: roleForPrisma,
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
