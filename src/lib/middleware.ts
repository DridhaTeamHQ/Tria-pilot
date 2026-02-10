import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { applyApiRateLimit } from '@/lib/security/rate-limit-middleware'

/**
 * MIDDLEWARE: SESSION CHECK ONLY
 * 
 * This middleware handles:
 * 1. Session refresh (cookie management)
 * 2. Rate limiting
 * 3. Redirect to /login for protected routes (session existence only)
 * 
 * This middleware does NOT:
 * - Read profiles
 * - Check roles
 * - Check approval_status
 * - Perform any authorization logic
 * 
 * Authorization is handled at the ROUTE/LAYOUT level.
 */

// Public paths that don't require authentication
const PUBLIC_PATHS = new Set([
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/help',
    '/contact',
    '/about',
    '/privacy',
    '/terms',
])

// Public path prefixes
const PUBLIC_PREFIXES = [
    '/auth',
    '/api/auth',
    '/marketplace',
]

function isPublicPath(pathname: string): boolean {
    if (PUBLIC_PATHS.has(pathname)) return true
    return PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request })

    // Check env vars
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.warn('Supabase env vars missing, skipping session update')
        return supabaseResponse
    }

    // Create Supabase client with cookie handling
    const supabase = createServerClient(
        (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
        (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim(),
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Get user session (handles token refresh automatically)
    let user = null
    try {
        const { data: { user: authUser }, error } = await supabase.auth.getUser()

        if (error) {
            // Handle refresh token errors gracefully
            if (error.message?.includes('refresh_token') || error.message?.includes('Refresh Token')) {
                // Invalid/expired refresh token - continue as unauthenticated
                console.log('⚠️  Invalid refresh token, clearing session')
            } else if (!error.message?.includes('Auth session missing')) {
                // Log non-trivial errors
                console.warn('⚠️  Auth error:', error.message)
            }
        } else {
            user = authUser
        }
    } catch (error) {
        console.warn('⚠️  Auth check failed:', error instanceof Error ? error.message : String(error))
    }

    // Rate limiting (after session check for user-based limiting)
    const rateLimited = applyApiRateLimit(request, user?.id ?? null)
    if (rateLimited) {
        return rateLimited
    }

    const pathname = request.nextUrl.pathname

    // SESSION CHECK ONLY: Redirect to /login if not authenticated and accessing protected route
    if (!user && !isPublicPath(pathname)) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('redirect', pathname)
        return NextResponse.redirect(url)
    }

    // Authenticated users on root → redirect to /dashboard
    // (Let /dashboard page handle role-based routing)
    if (user && pathname === '/') {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
