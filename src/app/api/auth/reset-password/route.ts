import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/auth'
import { type EmailOtpType } from '@supabase/supabase-js'

const schema = z.object({
  password: z.string().min(8),
  token_hash: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const body = await request.json()
    const { password, token_hash, type } = schema.parse(body)

    // If token is provided, verify it (supports direct /reset-password?token_hash=... links).
    if (token_hash && type) {
      const otpType = type as EmailOtpType
      const { error: otpError } = await supabase.auth.verifyOtp({
        token_hash,
        type: otpType,
      })
      if (otpError) {
        return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 })
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Reset session not found. Please use the link from your email again.' },
        { status: 401 }
      )
    }

    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

