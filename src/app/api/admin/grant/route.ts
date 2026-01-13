import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/auth'
import crypto from 'crypto'

const schema = z
  .object({
    user_id: z.string().uuid(),
    code: z.string().min(6).max(128),
  })
  .strict()

function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

export async function POST(request: Request) {
  try {
    const signupCode = process.env.ADMIN_SIGNUP_CODE
    if (!signupCode) {
      return NextResponse.json(
        { error: 'ADMIN_SIGNUP_CODE is not configured' },
        { status: 500 }
      )
    }

    const body = await request.json().catch(() => null)
    const { user_id, code } = schema.parse(body)

    if (!safeEqual(code, signupCode)) {
      return NextResponse.json({ error: 'Invalid admin signup code' }, { status: 403 })
    }

    const service = createServiceClient()
    const { error } = await service.from('admin_users').upsert({ user_id })
    if (error) {
      return NextResponse.json({ error: 'Failed to grant admin access' }, { status: 500 })
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

