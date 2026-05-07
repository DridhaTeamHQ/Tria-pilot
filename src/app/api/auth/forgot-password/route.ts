import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/auth'
import { getPublicSiteUrlFromRequest } from '@/lib/site-url'
import { sendEmail } from '@/lib/email/supabase-email'
import { buildPasswordResetEmail, buildVerifyOtpUrl } from '@/lib/email/auth-email'

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

    const siteUrl = getPublicSiteUrlFromRequest(request)
    const redirectTo = `${siteUrl}/reset-password`

    let delivered = false

    try {
      const service = createServiceClient()
      const { data, error } = await service.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo },
      })

      if (error) {
        console.error('Forgot password generateLink error:', error)
      } else {
        const properties = data?.properties
        const resetUrl =
          properties?.hashed_token && properties.verification_type
            ? buildVerifyOtpUrl(siteUrl, {
                tokenHash: properties.hashed_token,
                type: properties.verification_type,
              })
            : properties?.action_link

        if (!resetUrl) {
          console.error('Forgot password generateLink returned no usable reset link')
        } else {
          const template = buildPasswordResetEmail({ resetUrl })
          const result = await sendEmail({
            to: email,
            subject: template.subject,
            html: template.html,
            text: template.text,
          })

          if (result.ok) {
            delivered = true
          } else {
            console.error('Forgot password custom email send failed:', result.error)
          }
        }
      }
    } catch (error) {
      console.error('Forgot password custom email pipeline error:', error)
    }

    if (!delivered) {
      const supabase = await createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })

      if (error) {
        console.error('Forgot password resetPasswordForEmail error:', error)
      }
    }

    // Keep this endpoint enumeration-safe and avoid surfacing provider rate limits
    // as a broken UI. Delivery failures are logged server-side for diagnostics.
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
