/**
 * LOGIN API - SUPABASE ONLY
 * 
 * Handles user login with Supabase Auth.
 * NO Prisma dependency - uses Supabase profiles table only.
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import { loginSchema } from '@/lib/validation'

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

    // Normalize email: trim whitespace and convert to lowercase
    const email = rawEmail.trim().toLowerCase()

    const supabase = await createClient()

    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    // Optional: extend session duration when "Remember me" is enabled
    void rememberMe

    if (error) {
      console.error('Supabase auth error:', {
        message: error.message,
        status: error.status,
        email: email,
      })

      // Check if user exists in Supabase (for better error messages)
      let userExists = false
      let emailConfirmed = false
      try {
        const service = createServiceClient()
        const { data: users } = await service.auth.admin.listUsers()
        const foundUser = users?.users?.find(
          (u: any) => u.email?.toLowerCase().trim() === email
        )
        if (foundUser) {
          userExists = true
          emailConfirmed = !!foundUser.email_confirmed_at
        }
      } catch (checkError) {
        console.warn('Could not check user existence:', checkError)
      }

      // Provide more helpful error messages
      let errorMessage = error.message
      let statusCode = 401

      if (error.message.includes('Invalid login credentials') || error.message.includes('Invalid login')) {
        if (userExists && !emailConfirmed) {
          errorMessage = 'Please verify your email address before signing in. Check your inbox for the confirmation link.'
          statusCode = 403
        } else if (userExists) {
          errorMessage = 'Invalid password. Please check your password or use "Forgot Password" to reset it.'
        } else {
          errorMessage = 'No account found with this email. Please register first or check your email address.'
        }
      } else if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
        errorMessage = 'Please verify your email address before signing in. Check your inbox for the confirmation link.'
        statusCode = 403
      } else if (error.message.includes('Too many requests')) {
        errorMessage = 'Too many login attempts. Please try again later.'
        statusCode = 429
      } else if (error.message.includes('User not found')) {
        errorMessage = 'Account not found. Please make sure you have registered an account.'
      }

      return NextResponse.json({
        error: errorMessage,
        userExists,
        emailConfirmed,
        canResetPassword: userExists && emailConfirmed,
      }, { status: statusCode })
    }

    if (!data.user) {
      console.error('Login error: No user returned from Supabase', { email })
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    const service = createServiceClient()

    // Check if admin
    const { data: adminRow } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', data.user.id)
      .maybeSingle()

    if (adminRow) {
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

    // Check email verification
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

    // Get profile from Supabase profiles table (SOURCE OF TRUTH)
    let { data: profile, error: profileError } = await service
      .from('profiles')
      .select('id, email, role, onboarding_completed, approval_status, full_name, avatar_url')
      .eq('id', data.user.id)
      .single()

    // If profile doesn't exist, create it
    if (profileError || !profile) {
      const roleFromMetadata = data.user.user_metadata?.role?.toLowerCase() || 'influencer'

      const { data: newProfile, error: createError } = await service
        .from('profiles')
        .insert({
          id: data.user.id,
          email: data.user.email,
          role: roleFromMetadata,
          full_name: data.user.user_metadata?.name || data.user.user_metadata?.full_name || null,
          onboarding_completed: false,
          approval_status: 'none',
        })
        .select()
        .single()

      if (createError) {
        console.error('Failed to create profile:', createError)
        return NextResponse.json({ error: 'Failed to setup user profile' }, { status: 500 })
      }

      profile = newProfile
    }

    // Normalize role for frontend
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 500 })
    }

    const normalizedRole = (profile.role || 'influencer').toLowerCase()

    // Return user data compatible with frontend expectations
    return NextResponse.json({
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.full_name,
        role: normalizedRole.toUpperCase(), // Frontend expects UPPERCASE
        avatarUrl: profile.avatar_url,
        onboardingCompleted: profile.onboarding_completed,
        approvalStatus: profile.approval_status,
        // For backwards compatibility with frontend that checks influencerProfile/brandProfile
        influencerProfile: normalizedRole === 'influencer' ? {
          onboardingCompleted: profile.onboarding_completed
        } : null,
        brandProfile: normalizedRole === 'brand' ? {
          onboardingCompleted: profile.onboarding_completed
        } : null,
      },
      session: data.session,
    }, { status: 200 })
  } catch (error) {
    console.error('Login error:', error)

    // Handle validation errors
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
