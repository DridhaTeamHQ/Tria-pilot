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

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

function getProjectRefFromUrl(url: string | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const host = u.hostname // e.g. abcdefg.supabase.co
    const ref = host.split('.')[0]
    return ref || null
  } catch {
    return null
  }
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

    // These must all point to the SAME Supabase project for admin provisioning to work.
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Supabase public env vars are not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)' },
        { status: 500 }
      )
    }

    const body = await request.json().catch(() => null)
    const { user_id, code } = schema.parse(body)

    if (!safeEqual(code, signupCode)) {
      return NextResponse.json({ error: 'Invalid admin signup code' }, { status: 403 })
    }

    const service = createServiceClient()

    // Ensure the auth user exists before inserting FK row into public.admin_users.
    // This also catches common misconfiguration where frontend signs up against a different project
    // than the server (service role) is connected to.
    let authUserExists = false
    let lastAuthError: string | null = null
    for (let i = 0; i < 5; i++) {
      const { data, error } = await service.auth.admin.getUserById(user_id)
      if (data?.user) {
        authUserExists = true
        break
      }
      lastAuthError = error?.message || null
      await sleep(250)
    }

    if (!authUserExists) {
      const ref = getProjectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
      return NextResponse.json(
        {
          error: 'Auth user not found in this Supabase project.',
          hint:
            'This usually means your Vercel env vars are mismatched. Make sure NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are from the SAME Supabase project.',
          projectRef: ref,
          details: lastAuthError,
        },
        { status: 500 }
      )
    }

    const { error } = await service
      .from('admin_users')
      .upsert({ user_id }, { onConflict: 'user_id' })

    if (error) {
      // Common causes:
      // - SUPABASE_SERVICE_ROLE_KEY not set or incorrect (will show auth error)
      // - Table/RLS misconfiguration (will show RLS violation)
      console.error('Admin grant error:', error)
      return NextResponse.json(
        {
          error: error.message || 'Failed to grant admin access',
          hint: (error as any).hint || (error as any).details || null,
        },
        { status: 500 }
      )
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

