import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import { fetchProfile } from '@/lib/auth-state'

export interface AuthContext {
  authUser: { id: string; email: string }
  dbUser: { id: string; role: 'INFLUENCER' | 'BRAND' | 'ADMIN'; email: string }
}

/**
 * Middleware to authenticate and get user context
 * Returns null if unauthorized, or AuthContext if authorized
 */
export async function getAuthContext(request: NextRequest): Promise<AuthContext | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser || !authUser.email) {
      return null
    }

    const profile = await fetchProfile(authUser.id)

    if (!profile) {
      return null
    }

    return {
      authUser: {
        id: authUser.id,
        email: authUser.email,
      },
      dbUser: {
        id: profile.id,
        role: profile.role.toUpperCase() as 'INFLUENCER' | 'BRAND' | 'ADMIN', // Normalize to existing type
        email: profile.email,
      },
    }
  } catch (error) {
    console.error('Auth middleware error:', error)
    return null
  }
}

/**
 * Middleware helper to require authentication
 */
export function requireAuth(handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return handler(request, context)
  }
}

/**
 * Middleware helper to require specific role
 */
export function requireRole(
  role: 'INFLUENCER' | 'BRAND',
  handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const context = await getAuthContext(request)
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (context.dbUser.role !== role) {
      return NextResponse.json({ error: `Unauthorized - ${role} access required` }, { status: 403 })
    }
    return handler(request, context)
  }
}

