import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    // Handle auth errors gracefully
    if (authError) {
      // If it's a session/refresh error, return 401
      if (authError.message?.includes('refresh_token') || 
          authError.message?.includes('Auth session missing') ||
          authError.message?.includes('JWT')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      // For other errors, log and return 401
      console.error('Auth error in /api/auth/me:', authError.message)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin users may not have an app profile in Prisma.
    // If they are in admin_users, treat them as authenticated without requiring /complete-profile.
    const { data: adminRow } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', authUser.id)
      .single()

    if (adminRow) {
      return NextResponse.json(
        {
          user: {
            id: authUser.id,
            email: authUser.email?.toLowerCase().trim() || '',
            name: null,
            role: 'ADMIN',
            slug: 'admin',
          },
        },
        {
          headers: {
            'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
          },
        }
      )
    }

    // Normalize email for database lookup
    const normalizedEmail = authUser.email!.toLowerCase().trim()
    
    // Optimized query - use indexed email field, minimal select
    const dbUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
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
      // This happens when:
      // 1. User was created in Supabase Auth but Prisma user creation failed
      // 2. User registered before Prisma sync was implemented
      // 3. User's email in Supabase doesn't match Prisma (normalization issue)
      // Return 200 (so client hooks don't throw) and let the UI redirect to /complete-profile.
      console.log(`User ${normalizedEmail} (${authUser.id}) authenticated but missing in Prisma - requires profile completion`)
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
    
    // If it's a database connection error, return 500
    if (error instanceof Error && (
      error.message.includes('Can\'t reach database') ||
      error.message.includes('Connection') ||
      error.message.includes('timeout')
    )) {
      return NextResponse.json(
        { error: 'Database connection error. Please try again later.' },
        { status: 503 }
      )
    }
    
    // For other errors, return 500
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

