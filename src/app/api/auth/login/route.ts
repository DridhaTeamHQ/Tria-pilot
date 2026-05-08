/**
 * LOGIN API - SUPABASE ONLY
 *
 * Handles user login with Supabase Auth.
 * NO Prisma dependency - uses Supabase profiles table only.
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import { loginSchema } from '@/lib/validation'
import {
  emailLocalPart,
  isEmailIdentifier,
  normalizeIdentifier,
  usernameToSyntheticEmail,
} from '@/lib/auth-username'

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
    approval_status: role === 'brand' ? 'approved' : 'pending',
    full_name: (user.user_metadata?.name as string) || (user.user_metadata?.full_name as string) || (user.email ? emailLocalPart(user.email) : null),
    avatar_url: null,
  }
}

async function signInByCandidates(
  supabase: SupabaseSessionClient,
  candidateEmails: string[],
  password: string
) {
  let lastError: { message?: string; status?: number } | null = null

  for (const email of candidateEmails) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error && data.user) {
      return { data, emailUsed: email, error: null }
    }
    lastError = error
  }

  return { data: null, emailUsed: null, error: lastError }
}

/**
 * SECURITY: constant-time floor for login responses. Reduces timing-based
 * username enumeration — without this, a successful username lookup
 * (which performs an extra `ilike` query against profiles) takes longer
 * than a no-such-user lookup, letting an attacker probe whether a username
 * exists by measuring response time.
 *
 * The floor is short enough not to harm UX but long enough to mask the
 * SQL roundtrip + Supabase Auth call timing variance. Combined with the
 * per-IP rate limit on /api/auth/, enumeration becomes impractical.
 */
const LOGIN_RESPONSE_FLOOR_MS = 350

async function withTimingFloor<T>(work: Promise<T>): Promise<T> {
  const start = Date.now()
  try {
    return await work
  } finally {
    const elapsed = Date.now() - start
    const remaining = LOGIN_RESPONSE_FLOOR_MS - elapsed
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining))
    }
  }
}

export async function POST(request: Request) {
  return withTimingFloor(handleLogin(request))
}

async function handleLogin(request: Request) {
  try {
    const body = await request.json().catch(() => null)

    if (!body) {
      return NextResponse.json(
        { error: 'Request body is required' },
        { status: 400 }
      )
    }

    const { identifier: rawIdentifier, password, rememberMe = true, portalRole } = loginSchema.parse(body)
    const identifier = normalizeIdentifier(rawIdentifier)

    const supabase = await createClient()
    let candidateEmails = isEmailIdentifier(identifier)
      ? [identifier]
      : [usernameToSyntheticEmail(identifier)]

    if (!isEmailIdentifier(identifier)) {
      try {
        const lookupClient = getPrivilegedClient(supabase)
        const { data: profileMatches, error: profileMatchError } = await lookupClient
          .from('profiles')
          .select('email')
          .or(`email.ilike.${identifier}@%,full_name.eq.${identifier}`)
          .limit(5)

        if (!profileMatchError && Array.isArray(profileMatches) && profileMatches.length > 0) {
          const emailsFromProfiles = profileMatches
            .map((row) => row.email)
            .filter((value): value is string => typeof value === 'string' && value.length > 0)

          candidateEmails = Array.from(new Set([...candidateEmails, ...emailsFromProfiles]))
        }
      } catch (candidateLookupError) {
        console.warn('Username candidate lookup failed; using synthetic email fallback only:', candidateLookupError)
      }
    }

    const signInResult = await signInByCandidates(supabase, candidateEmails, password)

    void rememberMe

    if (!signInResult.data || !signInResult.data.user) {
      const error = signInResult.error
      const lowerMessage = (error?.message || '').toLowerCase()

      let errorMessage = 'Invalid username/email or password.'
      let statusCode = 401
      let errorCode:
        | 'USER_NOT_FOUND'
        | 'INVALID_PASSWORD'
        | 'INVALID_CREDENTIALS'
        | 'EMAIL_NOT_CONFIRMED'
        | 'RATE_LIMITED'
        | null = null

      if (lowerMessage.includes('email not confirmed') || lowerMessage.includes('email_not_confirmed')) {
        errorMessage = 'Please verify your email address before signing in. Check your inbox for the confirmation link.'
        statusCode = 403
        errorCode = 'EMAIL_NOT_CONFIRMED'
      } else if (lowerMessage.includes('too many requests')) {
        errorMessage = 'Too many login attempts. Please try again later.'
        statusCode = 429
        errorCode = 'RATE_LIMITED'
      } else if (lowerMessage.includes('invalid login credentials') || lowerMessage.includes('invalid credentials')) {
        errorMessage = 'Invalid username/email or password.'
        statusCode = 401
        errorCode = 'INVALID_CREDENTIALS'
      }

      return NextResponse.json(
        {
          error: errorMessage,
          errorCode,
          noUserFound: false,
        },
        { status: statusCode }
      )
    }

    const data = signInResult.data
    const email = signInResult.emailUsed || data.user.email || identifier

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

    if (portalRole && normalizedRole !== portalRole) {
      await supabase.auth.signOut()

      return NextResponse.json(
        {
          error: `This account belongs to the ${normalizedRole} portal.`,
          errorCode: 'ROLE_MISMATCH',
          requestedRole: portalRole,
          actualRole: normalizedRole,
        },
        { status: 403 }
      )
    }

    if (normalizedRole === 'influencer') {
      try {
        await profileClient
          .from('influencer_profiles')
          .upsert(
            {
              user_id: data.user.id,
              niches: [],
              socials: {},
            },
            { onConflict: 'user_id' }
          )
      } catch (influencerProfileError) {
        console.warn('Influencer profile scaffold failed during login:', influencerProfileError)
      }
    }

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
    }, { status: 200 })
  } catch (error) {
    console.error('Login error:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Please provide a valid username/email and password' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

