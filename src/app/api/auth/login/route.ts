import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import { loginSchema } from '@/lib/validation'
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
      
      // Provide more helpful error messages
      let errorMessage = error.message
      if (error.message.includes('Invalid login credentials') || error.message.includes('Invalid login')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.'
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Please verify your email address before signing in.'
      } else if (error.message.includes('Too many requests')) {
        errorMessage = 'Too many login attempts. Please try again later.'
      } else if (error.message.includes('User not found')) {
        errorMessage = 'Account not found. Please make sure you have registered an account.'
      }
      
      return NextResponse.json({ error: errorMessage }, { status: 401 })
    }

    if (!data.user) {
      console.error('Login error: No user returned from Supabase', { email })
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    // Admin users may not have an app profile in Prisma. If they are in admin_users, allow login.
    const { data: adminRow } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', data.user.id)
      .single()

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

    // Get full user data from database using normalized email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        influencerProfile: true,
        brandProfile: true,
      },
    })

    if (!user) {
      // Backward-compat: user exists in Supabase Auth but not in app DB.
      // Keep the Supabase session (already set via cookies) and send them to complete profile.
      return NextResponse.json(
        {
          error: 'Please complete your profile to continue.',
          requiresProfile: true,
          next: '/complete-profile',
        },
        { status: 409 }
      )
    }

    return NextResponse.json({ user, session: data.session }, { status: 200 })
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

