import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import { loginSchema } from '@/lib/validation'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email: rawEmail, password } = loginSchema.parse(body)
    const rememberMe = typeof body?.rememberMe === 'boolean' ? body.rememberMe : true

    // Normalize email: trim whitespace and convert to lowercase
    const email = rawEmail.trim().toLowerCase()

    // Check if user exists in database first
    const dbUser = await prisma.user.findUnique({
      where: { email },
    })

    if (!dbUser) {
      console.error('Login attempt: User not found in database', { email })
      return NextResponse.json(
        { error: 'Invalid email or password. Please check your credentials.' },
        { status: 401 }
      )
    }

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
        userId: dbUser.id,
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
      console.error('Login error: No user returned from Supabase', { email, userId: dbUser.id })
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
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
      console.error('Login error: User not found in database after auth success', { email, authUserId: data.user.id })
      return NextResponse.json({ 
        error: 'User account not found. Please contact support.' 
      }, { status: 404 })
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

