import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'

type SupportedRole = 'brand' | 'influencer'

function normalizeRole(value: unknown): SupportedRole | null {
  if (typeof value !== 'string') return null
  const role = value.trim().toLowerCase()
  if (role === 'brand' || role === 'influencer') return role
  return null
}

function sanitizeNextPath(next: string | null): string {
  if (!next) return '/dashboard'
  const value = next.trim()

  // Allow only app-internal absolute paths.
  if (!value.startsWith('/') || value.startsWith('//')) {
    return '/dashboard'
  }

  if (value.includes('\r') || value.includes('\n')) {
    return '/dashboard'
  }

  return value
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = sanitizeNextPath(searchParams.get('next'))
  const roleFromQuery = normalizeRole(searchParams.get('role'))

  if (!code) {
    const missingCodeUrl = new URL('/login', request.nextUrl)
    missingCodeUrl.searchParams.set('error', 'missing_code')
    return NextResponse.redirect(missingCodeUrl)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data?.user) {
    console.error('OAuth Callback Error:', error)
    const errorUrl = new URL('/login', request.nextUrl)
    errorUrl.searchParams.set('error', 'oauth_failed')
    errorUrl.searchParams.set('details', error?.message || 'unknown_error')
    return NextResponse.redirect(errorUrl)
  }

  const fullName = data.user.user_metadata?.full_name || data.user.user_metadata?.name || ''
  const roleFromMetadata = normalizeRole(data.user.user_metadata?.role)
  const roleHint: SupportedRole = roleFromQuery || roleFromMetadata || 'influencer'

  const service = createServiceClient()
  const { data: existingProfile, error: existingProfileError } = await service
    .from('profiles')
    .select('id, role, onboarding_completed, approval_status, full_name')
    .eq('id', data.user.id)
    .maybeSingle()

  if (existingProfileError) {
    console.error('[AUTH CALLBACK] Failed to fetch existing profile:', existingProfileError)
  }

  const existingRole = normalizeRole(existingProfile?.role)
  const profilePayload: Record<string, unknown> = {
    id: data.user.id,
    email: data.user.email,
  }

  let shouldPersistProfile = !existingProfile

  if (fullName && (!existingProfile?.full_name || `${existingProfile.full_name}`.trim().length === 0)) {
    profilePayload.full_name = fullName
    shouldPersistProfile = true
  }

  // Only assign role when profile is new or currently missing/invalid.
  // Never overwrite an already valid role on login.
  if (!existingRole) {
    profilePayload.role = roleHint
    profilePayload.approval_status = roleHint === 'influencer' ? 'none' : 'approved'
    if (!existingProfile) {
      profilePayload.onboarding_completed = false
    }
    shouldPersistProfile = true
  }

  if (shouldPersistProfile) {
    const { error: profileError } = await service.from('profiles').upsert(profilePayload, {
      onConflict: 'id',
    })

    if (profileError) {
      console.error('[AUTH CALLBACK] Profile upsert error:', profileError)
    }
  }

  const redirectUrl = new URL(next, request.nextUrl)
  return NextResponse.redirect(redirectUrl)
}
