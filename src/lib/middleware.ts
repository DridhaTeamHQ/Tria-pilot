import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { applyApiRateLimit } from '@/lib/security/rate-limit-middleware'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.warn('Supabase env vars missing, skipping session update')
        return supabaseResponse
    }

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Get user, handling refresh token errors gracefully
    let user = null
    try {
        const {
            data: { user: authUser },
            error,
        } = await supabase.auth.getUser()

        if (error) {
            // Handle refresh token errors gracefully
            if (error.message?.includes('refresh_token') || error.message?.includes('Refresh Token')) {
                // Invalid/expired refresh token - clear cookies and continue as unauthenticated
                console.log('⚠️  Invalid refresh token, clearing session')
                // Don't throw - just continue as unauthenticated user
            } else if (error.message?.includes('Auth session missing')) {
                // This is normal for unauthenticated visitors (no session cookies yet).
                // Avoid noisy logs in dev/prod.
            } else {
                console.warn('⚠️  Auth error:', error.message)
            }
        } else {
            user = authUser
        }
    } catch (error) {
        // Catch any unexpected errors
        console.warn('⚠️  Auth check failed:', error instanceof Error ? error.message : String(error))
        // Continue as unauthenticated user
    }

    // Global API rate limiting (best-effort, IP + user-based)
    // Runs after session check so we can rate-limit by user id if authenticated.
    const rateLimited = applyApiRateLimit(request, user?.id ?? null)
    if (rateLimited) {
        return rateLimited
    }

    // Approval gate for influencers: allow only marketplace + support pages until approved.
    // NOTE: This is a middleware-level check. Individual pages also check approval status.
    // This prevents unauthorized access but dashboard route handles the full flow.
    if (user) {
        const pathname = request.nextUrl.pathname

        // Skip API routes, auth routes, onboarding, and complete-profile (these have their own guards)
        if (!pathname.startsWith('/api') && 
            !pathname.startsWith('/auth') && 
            !pathname.startsWith('/onboarding') &&
            !pathname.startsWith('/complete-profile') &&
            pathname !== '/dashboard') {
            
            const allowedExact = new Set([
                '/',
                '/help',
                '/contact',
                '/about',
                '/privacy',
                '/terms',
                '/influencer/pending',
                '/login',
                '/register',
                '/forgot-password',
                '/reset-password',
            ])
            const allowedPrefixes = ['/marketplace']

            const isAllowed =
                allowedExact.has(pathname) || allowedPrefixes.some((prefix) => pathname.startsWith(prefix))

            if (!isAllowed) {
                // Check if user is influencer and not approved
                const { data: application } = await supabase
                    .from('influencer_applications')
                    .select('status')
                    .eq('user_id', user.id)
                    .maybeSingle()

                if (application && application.status !== 'approved') {
                    const url = request.nextUrl.clone()
                    url.pathname = '/influencer/pending'
                    return NextResponse.redirect(url)
                }
            }
        }
    }

    // Authenticated users should not see the marketing homepage.
    // NOTE: We intentionally do NOT redirect /login or /register here because
    // users may be missing an app profile (Prisma) or be admins without a Prisma profile,
    // and forcing /dashboard can cause redirect loops.
    // Allow access to "/" if explicitly requested (e.g., "Back to site" from admin)
    if (user) {
        const pathname = request.nextUrl.pathname
        if (pathname === '/') {
            // Check if user explicitly wants to see homepage (from admin or query param)
            const fromParam = request.nextUrl.searchParams.get('from')
            const referer = request.headers.get('referer') || ''
            
            if (fromParam === 'admin' || referer.includes('/admin')) {
                // Admin navigating from admin area - allow homepage access
                return supabaseResponse
            }
            
            // Non-admin users or direct navigation: redirect to dashboard
            const url = request.nextUrl.clone()
            url.pathname = '/dashboard'
            return NextResponse.redirect(url)
        }
    }

    if (
        !user &&
        !request.nextUrl.pathname.startsWith('/login') &&
        !request.nextUrl.pathname.startsWith('/register') &&
        !request.nextUrl.pathname.startsWith('/auth') &&
        request.nextUrl.pathname !== '/'
    ) {
        // no user, potentially respond by redirecting the user to the login page
        // const url = request.nextUrl.clone()
        // url.pathname = '/login'
        // return NextResponse.redirect(url)
    }

    return supabaseResponse
}
