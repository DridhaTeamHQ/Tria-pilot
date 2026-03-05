import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'

export async function GET(request: NextRequest) {
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
      console.log('[AUTH CALLBACK] Extracted name:', fullName, 'from metadata:', JSON.stringify(data.user.user_metadata))

      // Use service client for profile operations (bypasses RLS)
      const service = createServiceClient()

      // If a role is specified (from Google Signup), explicitly set it in profiles
      if (role && (role === 'brand' || role === 'influencer')) {
        const approvalStatus = role === 'influencer' ? 'none' : 'approved'
        const { error: profileError } = await service.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email,
          role: role,
          full_name: fullName,
          onboarding_completed: false,
          approval_status: approvalStatus,
        }, { onConflict: 'id' })

        if (profileError) {
          console.error('[AUTH CALLBACK] Profile upsert error:', profileError)
        } else {
          console.log('[AUTH CALLBACK] Profile upserted successfully with role:', role, 'name:', fullName)
        }
      } else {
        // If login without role, just ensure their name is updated if it was missing
        if (fullName) {
          const { error: updateError } = await service.from('profiles').update({ full_name: fullName }).eq('id', data.user.id).is('full_name', null)
          if (updateError) {
            console.error('[AUTH CALLBACK] Name update error:', updateError)
          }
        }
      }

      // Upon successful login, redirect to the dashboard (or appropriate page).
      // The dashboard route handles onboarding redirect if needed.
      const redirectUrl = new URL(next, request.nextUrl)
      console.log('[AUTH CALLBACK] SUCCESS - redirecting to:', redirectUrl.toString())
      return NextResponse.redirect(redirectUrl)
    } else {
      console.error('OAuth Callback Error:', error)
      const errorMsg = error?.message || 'unknown_error'
      const errorUrl = new URL('/login', request.nextUrl)
      errorUrl.searchParams.set('error', 'oauth_failed')
      errorUrl.searchParams.set('details', errorMsg)
      return NextResponse.redirect(errorUrl)
    }
  }

  // return the user to an error page with instructions
  const missingCodeUrl = new URL('/login', request.nextUrl)
  missingCodeUrl.searchParams.set('error', 'missing_code')
  return NextResponse.redirect(missingCodeUrl)
}

