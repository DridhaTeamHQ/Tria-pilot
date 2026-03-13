import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/auth'
import { getPublicSiteUrlFromRequest } from '@/lib/site-url'
import { sendEmail } from '@/lib/email/supabase-email'
import {
  buildPasswordResetEmail,
  buildResetPasswordUrl,
} from '@/lib/email/auth-email'

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
})

export async function POST(request: Request) {
  const genericOk = {
    message: 'If an account exists for that email, a password reset link has been sent.',
  }

  try {
    const body = await request.json().catch(() => null)
    const { email } = schema.parse(body)

    const service = createServiceClient()
    const { data: users } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const user = users?.users?.find((entry) => entry.email?.trim().toLowerCase() === email)

    if (!user?.email) {
      return NextResponse.json(genericOk)
    }

    const siteUrl = getPublicSiteUrlFromRequest(request)
    const redirectTo = `${siteUrl}/reset-password`
    const { data, error } = await service.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo,
      },
    })

    if (error || !data?.properties?.hashed_token) {
      if (error) {
        console.error('Forgot password generateLink error:', error)
      }
      return NextResponse.json(genericOk)
    }

    const resetUrl = buildResetPasswordUrl(siteUrl, {
      tokenHash: data.properties.hashed_token,
      type: data.properties.verification_type,
    })

    const template = buildPasswordResetEmail({ resetUrl })
    const result = await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    })

    if (!result.ok) {
      const fallbackClient = await createClient()
      const { error: fallbackError } = await fallbackClient.auth.resetPasswordForEmail(email, {
        redirectTo,
      })

      if (fallbackError) {
        console.error('Forgot password fallback reset email failed:', fallbackError)
      }
    }

    return NextResponse.json(genericOk)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
