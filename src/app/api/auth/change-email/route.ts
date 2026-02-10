import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/auth'
import { getPublicSiteUrlFromRequest, buildAuthConfirmUrl } from '@/lib/site-url'

const schema = z
  .object({
    newEmail: z.string().trim().toLowerCase().email().max(320),
    password: z.string().min(1).max(128),
  })
  .strict()

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const { newEmail, password } = schema.parse(body)

    // Re-authenticate by password to confirm identity (security)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authUser.email,
      password,
    })

    if (signInError) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 400 })
    }

    const emailRedirectTo = buildAuthConfirmUrl(
      getPublicSiteUrlFromRequest(request),
      '/settings/profile?email_changed=true'
    )

    const { error: updateError } = await supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo }
    )
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
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

