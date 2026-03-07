import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/auth'
import { z } from 'zod'
import crypto from 'crypto'

const resendSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
})

/**
 * Resend email confirmation.
 * Uses a generic response to avoid account enumeration.
 */
export async function POST(request: Request) {
  const genericOk = {
    message: 'If an account exists and is pending confirmation, a confirmation email has been sent.',
  }

  try {
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Request body required' }, { status: 400 })
    }

    const { email } = resendSchema.parse(body)
    const service = createServiceClient()

    const { data: users } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const user = users?.users?.find((u: any) => u.email?.toLowerCase().trim() === email)

    if (!user || user.email_confirmed_at) {
      return NextResponse.json(genericOk)
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_VERCEL_URL ||
      'http://localhost:3000'

    const tempPassword = `${crypto.randomBytes(12).toString('base64url')}Aa1!`

    const { error } = await service.auth.admin.generateLink({
      type: 'signup',
      email,
      password: tempPassword,
      options: {
        redirectTo: `${siteUrl}/auth/confirm?next=/login?confirmed=true`,
      },
    })

    if (error) {
      console.error('Resend confirmation error:', error)
      return NextResponse.json(genericOk)
    }

    return NextResponse.json(genericOk)
  } catch (error) {
    console.error('Resend confirmation error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
