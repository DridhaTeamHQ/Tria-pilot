/**
 * LOGIN API - SUPABASE ONLY
 *
 * Handles user login with Supabase Auth.
 * NO Prisma dependency - uses Supabase profiles table only.
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import { loginSchema } from '@/lib/validation'

type SupabaseSessionClient = Awaited<ReturnType<typeof createClient>>
type SupabasePrivilegedClient = SupabaseSessionClient | ReturnType<typeof createServiceClient>

interface ProfileRow {
  id: string
  email: string | null
  role: string | null
  onboarding_completed: boolean | null
  approval_status: string | null
  full_name: string | null
  avatar_url: string | null
}

function getPrivilegedClient(supabase: SupabaseSessionClient): SupabasePrivilegedClient {
  try {
    return createServiceClient()
  } catch (serviceError) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not set; falling back to session client for login profile fetch:', serviceError)
    return supabase
  }
}

function normalizeRole(rawRole: unknown): 'influencer' | 'brand' {
  const value = String(rawRole || '').trim().toLowerCase()
  return value === 'brand' ? 'brand' : 'influencer'
}

function buildFallbackProfile(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }): ProfileRow {
  const role = normalizeRole(user.user_metadata?.role)
  return {
    id: user.id,
    email: user.email || null,
    role,
    onboarding_completed: false,
    approval_status: role === 'brand' ? 'approved' : 'none',
    full_name: (user.user_metadata?.name as string) || (user.user_metadata?.full_name as string) || null,
    avatar_url: null,
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)

    if (!body) {
      return NextResponse.json(
        { error: 'Request body is required' },
        { status: 400 }
      )
    }

    const { email: rawEmail, password, rememberMe = true } = loginSchema.parse(body)
    const email = rawEmail.trim().toLowerCase()

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    void rememberMe

    if (error) {
      console.error('Supabase auth error:', {
        message: error.message,
        status: error.status,
        email,
      })

      const lowerMessage = (error.message || '').toLowerCase()
      let errorMessage = 'Invalid email or password.'
      let statusCode = 401
      let errorCode: 'USER_NOT_FOUND' | 'INVALID_PASSWORD' | 'EMAIL_NOT_CONFIRMED' | 'RATE_LIMITED' | null = null

      if (lowerMessage.includes('email not confirmed') || lowerMessage.includes('email_not_confirmed')) {
        errorMessage = 'Please verify your email address before signing in. Check your inbox for the confirmation link.'
        statusCode = 403
        errorCode = 'EMAIL_NOT_CONFIRMED'
      } else if (lowerMessage.includes('too many requests')) {
        errorMessage = 'Too many login attempts. Please try again later.'
        statusCode = 429
        errorCode = 'RATE_LIMITED'
      } else if (lowerMessage.includes('invalid login credentials') || lowerMessage.includes('invalid credentials')) {
        try {
          const lookupClient = getPrivilegedClient(supabase)
          const { data: profile, error: profileLookupError } = await lookupClient
            .from('profiles')
            .select('id')
            .ilike('email', email)
            .maybeSingle()

          if (!profileLookupError && !profile) {
            errorMessage = 'No user found with this email. Please sign up first.'
            statusCode = 404
            errorCode = 'USER_NOT_FOUND'
          } else if (!profileLookupError && profile) {
            errorMessage = 'Incorrect password. Please try again.'
            statusCode = 401
            errorCode = 'INVALID_PASSWORD'
          }
        } catch {
          errorMessage = 'Invalid email or password.'
          statusCode = 401
          errorCode = null
        }
      }

      return NextResponse.json(
        {
          error: errorMessage,
          errorCode,
          noUserFound: errorCode === 'USER_NOT_FOUND',
        },
        { status: statusCode }
      )
    }

    if (!data.user) {
      console.error('Login error: No user returned from Supabase', { email })
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    if (!data.user.email_confirmed_at) {
      return NextResponse.json(
        {
          error: 'Please verify your email address before signing in. Check your inbox for the confirmation link.',
          emailConfirmed: false,
          requiresEmailVerification: true,
        },
        { status: 403 }
      )
    }

    let isAdmin = false
    try {
      const { data: adminRow, error: adminError } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', data.user.id)
        .maybeSingle()

      if (!adminError && adminRow) {
        isAdmin = true
      }
    } catch (adminLookupError) {
      console.warn('Admin lookup skipped:', adminLookupError)
    }

    if (isAdmin) {
      return NextResponse.json(
        {
          user: {
            id: data.user.id,
            email,
            name: null,
            role: 'ADMIN',
            slug: 'admin',
          },
          session: data.session,
        },
        { status: 200 }
      )
    }

    const profileClient = getPrivilegedClient(supabase)
    let profile: ProfileRow | null = null

    try {
      const { data: fetchedProfile, error: fetchError } = await profileClient
        .from('profiles')
        .select('id, email, role, onboarding_completed, approval_status, full_name, avatar_url')
        .eq('id', data.user.id)
        .maybeSingle()

      if (!fetchError && fetchedProfile) {
        profile = fetchedProfile as ProfileRow
      }
    } catch (fetchError) {
      console.warn('Profile fetch failed during login:', fetchError)
    }

    if (!profile) {
      const fallback = buildFallbackProfile(data.user)

      try {
        const { data: createdProfile, error: createError } = await profileClient
          .from('profiles')
          .insert({
            id: fallback.id,
            email: fallback.email,
            role: fallback.role,
            full_name: fallback.full_name,
            onboarding_completed: fallback.onboarding_completed,
            approval_status: fallback.approval_status,
          })
          .select('id, email, role, onboarding_completed, approval_status, full_name, avatar_url')
          .maybeSingle()

        if (!createError && createdProfile) {
          profile = createdProfile as ProfileRow
        } else {
          console.warn('Profile create failed during login, using fallback:', createError)
        }
      } catch (createError) {
        console.warn('Profile create threw during login, using fallback:', createError)
      }

      if (!profile) {
        profile = fallback
      }
    }

    const normalizedRole = (profile.role || 'influencer').toLowerCase()

    return NextResponse.json({
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.full_name,
        role: normalizedRole.toUpperCase(),
        avatarUrl: profile.avatar_url,
        onboardingCompleted: Boolean(profile.onboarding_completed),
        approvalStatus: profile.approval_status || 'none',
        influencerProfile: normalizedRole === 'influencer' ? {
          onboardingCompleted: Boolean(profile.onboarding_completed),
        } : null,
        brandProfile: normalizedRole === 'brand' ? {
          onboardingCompleted: Boolean(profile.onboarding_completed),
        } : null,
      },
      session: data.session,
    }, { status: 200 })
  } catch (error) {
    console.error('Login error:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Please provide a valid email and password' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
