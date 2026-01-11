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

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const searchParams = requestUrl.searchParams

  const token_hash = searchParams.get('token_hash') ?? searchParams.get('token')
  const type = (searchParams.get('type') as EmailOtpType | null) ?? null
  const next = sanitizeNext(searchParams.get('next'), requestUrl)

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })

    if (!error) {
      const redirectTo = new URL(next, requestUrl.origin)
      return NextResponse.redirect(redirectTo)
    }
  }

  // If verification failed, return user to login with an error flag
  return NextResponse.redirect(new URL('/login?error=confirmation_failed', requestUrl.origin))
}

