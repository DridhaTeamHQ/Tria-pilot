import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import { loginSchema } from '@/lib/validation'
import { getOrCreateUser } from '@/lib/prisma-user'
import prisma from '@/lib/prisma'

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
    // Note: actual session TTL is controlled by Supabase project settings.
    // We keep this flag for future use and UI behavior consistency.
    void rememberMe

    if (error) {
      console.error('Supabase auth error:', {
        message: error.message,
        status: error.status,
        email: email, // Log normalized email (not password)
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
        // If we can't check, continue with generic error
        console.warn('Could not check user existence:', checkError)
      }
      
      // Provide more helpful error messages based on actual user status
      let errorMessage = error.message
      let statusCode = 401
      
      if (error.message.includes('Invalid login credentials') || error.message.includes('Invalid login')) {
        if (userExists && !emailConfirmed) {
          errorMessage = 'Please verify your email address before signing in. Check your inbox for the confirmation link.'
          statusCode = 403 // Forbidden - account exists but not confirmed
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

    // STEP 1: Check email verification (enforce for all users except admins)
    // Admin users may not have an app profile in Prisma. If they are in admin_users, allow login.
    const { data: adminRow } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', data.user.id)
      .maybeSingle()

    if (adminRow) {
      // Admins bypass email verification and Prisma checks
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

    // STEP 2: For regular users, check email verification
    // Note: Supabase signInWithPassword will fail if email not confirmed (if email confirmations are enabled)
    // But we check explicitly here for clarity and to provide better error messages
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

    // STEP 3: Ensure Prisma User exists (getOrCreateUser); sign-in never creates a *new* auth user, only syncs app DB
    const user = await getOrCreateUser({
      id: data.user.id,
      email: data.user.email ?? email,
      user_metadata: data.user.user_metadata,
    })

    // STEP 4: Return user data with session (include profiles for redirect logic)
    const userWithProfiles = await prisma.user.findUnique({
      where: { id: user.id },
      include: { influencerProfile: true, brandProfile: true },
    })
    if (!userWithProfiles) {
      console.error('Login: getOrCreateUser returned user but findUnique failed', { userId: user.id })
      return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
    }

    // Return user data with session
    // Note: Frontend will handle redirects based on onboarding/approval status via /dashboard route
    return NextResponse.json({ user: userWithProfiles, session: data.session }, { status: 200 })
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

