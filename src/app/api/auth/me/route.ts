import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Optimized query - use indexed email field, minimal select
    const dbUser = await prisma.user.findUnique({
      where: { email: authUser.email!.toLowerCase().trim() }, // Normalize email
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        slug: true,
      },
    })

    if (!dbUser) {
      // Backward-compat: Auth session exists but user hasn't completed app profile yet.
      // Return 200 (so client hooks don't throw) and let the UI redirect to /complete-profile.
      return NextResponse.json(
        { user: null, requiresProfile: true, next: '/complete-profile' },
        {
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      )
    }

    // Add caching headers - user data is relatively stable
    return NextResponse.json(
      { user: dbUser },
      {
        headers: {
          'Cache-Control': 'private, max-age=300, stale-while-revalidate=600', // 5 min cache, 10 min stale
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

