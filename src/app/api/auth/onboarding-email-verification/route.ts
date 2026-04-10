import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/auth'
import { sendEmail } from '@/lib/email/supabase-email'
import { buildEmailOtpVerificationEmail } from '@/lib/email/auth-email'

const COOKIE_NAME = 'kiwikoo_onboarding_email_otp'
const OTP_TTL_MS = 10 * 60 * 1000

const sendSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
})

const verifySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  code: z.string().trim().regex(/^\d{6}$/),
})

function getSecret() {
  return (
    process.env.ONBOARDING_EMAIL_OTP_SECRET ||
    process.env.AUTH_OTP_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'kiwikoo-dev-onboarding-secret'
  )
}

function signPayload(payload: string) {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex')
}

function encodeToken(payload: Record<string, unknown>) {
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  return `${encodedPayload}.${signPayload(encodedPayload)}`
}

function decodeToken(token: string | undefined | null) {
  if (!token) return null
  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature) return null
  const expectedSignature = signPayload(encodedPayload)
  if (signature.length !== expectedSignature.length) {
    return null
  }
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null
  }

  try {
    return JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as {
      userId: string
      email: string
      code: string
      expiresAt: number
    }
  } catch {
    return null
  }
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const { email } = sendSchema.parse(body)
    const code = generateCode()

    const template = buildEmailOtpVerificationEmail({ code })
    const emailResult = await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    })

    if (!emailResult.ok) {
      return NextResponse.json({ error: emailResult.error || 'Failed to send verification code' }, { status: 500 })
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set(COOKIE_NAME, encodeToken({
      userId: authUser.id,
      email,
      code,
      expiresAt: Date.now() + OTP_TTL_MS,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: OTP_TTL_MS / 1000,
    })

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const { email, code } = verifySchema.parse(body)
    const cookieStore = await cookies()
    const token = decodeToken(cookieStore.get(COOKIE_NAME)?.value)

    if (!token || token.userId !== authUser.id || token.email !== email || token.code !== code) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 })
    }

    if (Date.now() > token.expiresAt) {
      return NextResponse.json({ error: 'Verification code expired' }, { status: 400 })
    }

    const service = createServiceClient()
    const nextMetadata = {
      ...(authUser.user_metadata || {}),
      onboarding_verified_email: email,
      onboarding_email_verified_at: new Date().toISOString(),
    }

    const updatePayload: Record<string, unknown> = {
      user_metadata: nextMetadata,
      email_confirm: true,
    }

    if ((authUser.email || '').trim().toLowerCase() !== email) {
      updatePayload.email = email
    }

    const { error: authUpdateError } = await service.auth.admin.updateUserById(authUser.id, updatePayload)
    if (authUpdateError) {
      return NextResponse.json({ error: authUpdateError.message || 'Failed to update email' }, { status: 500 })
    }

    const { error: profileUpdateError } = await service
      .from('profiles')
      .update({ email })
      .eq('id', authUser.id)

    if (profileUpdateError) {
      return NextResponse.json({ error: 'Failed to update profile email' }, { status: 500 })
    }

    const response = NextResponse.json({ success: true, email })
    response.cookies.set(COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid verification request' }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
