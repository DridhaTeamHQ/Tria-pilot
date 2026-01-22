import { NextRequest, NextResponse } from 'next/server'
import { type EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/auth'

function sanitizeNext(next: string | null, requestUrl: URL): string {
  // Default: back to login with a success indicator
  const fallback = '/login?confirmed=true'
  if (!next) return fallback

  // Allow relative redirects only
  if (next.startsWith('/')) return next

  // Allow absolute URLs ONLY for same-origin (prevents open redirects)
  try {
    const nextUrl = new URL(next)
    if (nextUrl.origin === requestUrl.origin) {
      return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`
    }
  } catch {
    // ignore
  }

  return fallback
}

/**
 * Email Confirmation Handler
 * 
 * After email verification:
 * - For signup: Redirect to onboarding (not login) - server-side enforcement
 * - For password reset: Redirect to reset-password page
 * - For other types: Use the 'next' parameter or default to login
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const searchParams = requestUrl.searchParams

  const token_hash = searchParams.get('token_hash') ?? searchParams.get('token')
  const type = (searchParams.get('type') as EmailOtpType | null) ?? null
  const next = sanitizeNext(searchParams.get('next'), requestUrl)

  if (token_hash && type) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.verifyOtp({ token_hash, type })

    if (!error && data.user) {
      // For signup confirmations, we need to check if user needs onboarding
      if (type === 'signup') {
        // Get user role from Prisma to determine onboarding route
        try {
          const prisma = (await import('@/lib/prisma')).default
          const dbUser = await prisma.user.findUnique({
            where: { email: data.user.email!.toLowerCase().trim() },
            select: {
              role: true,
              influencerProfile: { select: { onboardingCompleted: true } },
              brandProfile: { select: { onboardingCompleted: true } },
            },
          })

          if (dbUser) {
            // User exists - check onboarding status
            // CRITICAL: After email confirmation, defaults must be:
            // - onboardingCompleted = false
            // - approvalStatus = 'none' (no entry in influencer_applications)
            // DO NOT set pending here, DO NOT redirect to /influencer/pending
            
            // DEFENSIVE: Assert correct defaults
            if (dbUser.role === 'INFLUENCER' && dbUser.influencerProfile) {
              const onboardingCompleted = dbUser.influencerProfile.onboardingCompleted ?? false
              
              // If onboarding is not completed, redirect to onboarding
              if (!onboardingCompleted) {
                // Force onboarding - sign out to prevent middleware redirects
                await supabase.auth.signOut()
                return NextResponse.redirect(new URL('/onboarding/influencer', requestUrl.origin))
              }
              
              // If onboarding is completed, check approval status
              // But don't redirect to pending here - let dashboard handle it
              // This ensures state is correct after email confirmation
            } else if (dbUser.role === 'BRAND' && dbUser.brandProfile) {
              const onboardingCompleted = dbUser.brandProfile.onboardingCompleted ?? false
              if (!onboardingCompleted) {
                // Force onboarding - sign out to prevent middleware redirects
                await supabase.auth.signOut()
                return NextResponse.redirect(new URL('/onboarding/brand', requestUrl.origin))
              }
            }
          } else {
            // User doesn't exist in Prisma yet - they'll be redirected to complete-profile on first login
            // Sign out to prevent middleware redirects
            await supabase.auth.signOut()
            return NextResponse.redirect(new URL('/login?confirmed=true', requestUrl.origin))
          }
        } catch (prismaError) {
          console.error('Error checking user onboarding status:', prismaError)
          // Fallback: sign out and redirect to login
          await supabase.auth.signOut()
          return NextResponse.redirect(new URL('/login?confirmed=true', requestUrl.origin))
        }
      }

      // For password reset and other types, use the next parameter
      // Sign out for signup to prevent middleware redirects
      if (type === 'signup') {
        await supabase.auth.signOut()
      }
      
      const redirectTo = new URL(next, requestUrl.origin)
      return NextResponse.redirect(redirectTo)
    }
  }

  // If verification failed, return user to login with an error flag
  return NextResponse.redirect(new URL('/login?error=confirmation_failed', requestUrl.origin))
}

