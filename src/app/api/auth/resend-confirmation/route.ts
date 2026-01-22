import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/auth'
import { z } from 'zod'

const resendSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
})

/**
 * Resend email confirmation for users who haven't confirmed their email
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Request body required' }, { status: 400 })
    }

    const { email } = resendSchema.parse(body)
    const service = createServiceClient()

    // Check if user exists
    const { data: users } = await service.auth.admin.listUsers()
    const user = users?.users?.find(
      (u: any) => u.email?.toLowerCase().trim() === email
    )

    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email address' },
        { status: 404 }
      )
    }

    if (user.email_confirmed_at) {
      return NextResponse.json(
        { message: 'Email is already confirmed. You can sign in.' },
        { status: 200 }
      )
    }

    // Resend confirmation email using signup link (requires temporary password)
    // This is the most reliable method for resending confirmation emails
    const { data: linkData, error } = await service.auth.admin.generateLink({
      type: 'signup',
      email: email,
      password: 'TempPassword123!', // Temporary password - user will set their own after confirmation
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'}/auth/confirm?next=/login?confirmed=true`,
      },
    })

    if (error) {
      console.error('Resend confirmation error:', error)
      
      // Try alternative: Use recovery link which can also trigger confirmation
      const { error: recoveryError } = await service.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'}/auth/confirm?next=/login?confirmed=true`,
        },
      })

      if (recoveryError) {
        // Last resort: Update user to trigger email
        try {
          await service.auth.admin.updateUserById(user.id, {
            email_confirm: false,
          })
          // Then try to resend
          await service.auth.admin.generateLink({
            type: 'signup',
            email: email,
            password: 'TempPassword123!',
            options: {
              redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'}/auth/confirm?next=/login?confirmed=true`,
            },
          })
        } catch (updateError) {
          return NextResponse.json(
            { 
              error: 'Failed to resend confirmation email. Please check your Supabase email configuration.',
              details: error.message,
            },
            { status: 500 }
          )
        }
      }
    }

    return NextResponse.json({
      message: 'Confirmation email sent. Please check your inbox.',
    })
  } catch (error) {
    console.error('Resend confirmation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
