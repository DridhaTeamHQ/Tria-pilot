import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/dashboard'
  const role = searchParams.get('role')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data?.user) {
      // If a role is specified (from Google Signup), explicitly set it in profiles
      if (role && (role === 'brand' || role === 'influencer')) {
        const approvalStatus = role === 'influencer' ? 'none' : 'approved'
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email,
          role: role,
          onboarding_completed: false,
          approval_status: approvalStatus,
        }, { onConflict: 'id' })

        if (profileError) {
          console.error('Profile upsert error:', profileError)
        }
      }

      // Upon successful login, redirect to the dashboard (or appropriate page).
      // The dashboard route handles onboarding redirect if needed.
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
}
