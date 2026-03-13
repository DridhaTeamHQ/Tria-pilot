import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/auth'
import { getPublicSiteUrlFromRequest } from '@/lib/site-url'

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

    const supabase = await createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (error) {
      console.error('Forgot password resetPasswordForEmail error:', error)
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
