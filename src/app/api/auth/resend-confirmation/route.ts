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

    // Resend confirmation email using magic link (doesn't require password)
    // This will send a confirmation email if the user hasn't confirmed yet
    const { error } = await service.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/confirm?next=/login?confirmed=true`,
      },
    })

    if (error) {
      console.error('Resend confirmation error:', error)
      // Try alternative method - resend via user update
      try {
        await service.auth.admin.updateUserById(user.id, {
          email_confirm: false, // This will trigger a new confirmation email
        })
      } catch (updateError) {
        return NextResponse.json(
          { error: 'Failed to resend confirmation email. Please try again later.' },
          { status: 500 }
        )
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
