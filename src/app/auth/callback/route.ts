import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/dashboard'
  const role = searchParams.get('role')

  console.log('[AUTH CALLBACK] Hit callback route. code exists:', !!code, 'next:', next, 'role:', role, 'origin:', origin)

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    console.log('[AUTH CALLBACK] exchangeCodeForSession result:', error ? `ERROR: ${error.message}` : `SUCCESS user=${data?.user?.id}`)

    if (!error && data?.user) {
      const fullName = data.user.user_metadata?.full_name || data.user.user_metadata?.name || ''

      // If a role is specified (from Google Signup), explicitly set it in profiles
      if (role && (role === 'brand' || role === 'influencer')) {
        const approvalStatus = role === 'influencer' ? 'none' : 'approved'
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email,
          role: role,
          full_name: fullName,
          onboarding_completed: false,
          approval_status: approvalStatus,
        }, { onConflict: 'id' })

        if (profileError) {
          console.error('Profile upsert error:', profileError)
        }
      } else {
        // If login without role, just ensure their name is updated if it was missing
        if (fullName) {
          await supabase.from('profiles').update({ full_name: fullName }).eq('id', data.user.id).is('full_name', null)
        }
      }

      // Upon successful login, redirect to the dashboard (or appropriate page).
      // The dashboard route handles onboarding redirect if needed.
      console.log('[AUTH CALLBACK] SUCCESS - redirecting to:', `${origin}${next}`)
      return NextResponse.redirect(`${origin}${next}`)
    } else {
      console.error('OAuth Callback Error:', error)
      const errorMsg = error?.message || 'unknown_error'
      return NextResponse.redirect(`${origin}/login?error=oauth_failed&details=${encodeURIComponent(errorMsg)}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=missing_code`)
}
