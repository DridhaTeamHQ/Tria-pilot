/**
 * Email Confirmation Handler
 * 
 * After email verification:
 * - Redirect to /login
 * - User logs in → dashboard route handles redirect based on profile state
 * 
 * CORRECT LOGIC AFTER LOGIN (in dashboard):
 * const profile = await getProfile(user.id);
 * if (!profile.onboarding_completed) {
 *   redirect('/onboarding');
 * }
 * if (profile.role === 'influencer' && profile.approval_status !== 'approved') {
 *   redirect('/influencer/pending');
 * }
 * redirect('/dashboard');
 */
import { NextRequest, NextResponse } from 'next/server'
import { type EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/auth'

function sanitizeNext(next: string | null, requestUrl: URL): string {
  const fallback = '/login?confirmed=true'
  if (!next) return fallback

  if (next.startsWith('/')) return next

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
      // After email confirmation, redirect to login
      // Dashboard route will handle routing based on profile state
      await supabase.auth.signOut() // Sign out to prevent middleware redirects
      return NextResponse.redirect(new URL('/login?confirmed=true', requestUrl.origin))
    }
  }

  // If verification failed, return user to login with an error flag
  return NextResponse.redirect(new URL('/login?error=confirmation_failed', requestUrl.origin))
}
