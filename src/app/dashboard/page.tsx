/**
 * CENTRAL DASHBOARD ROUTE
 * 
 * CORRECT LOGIC AFTER LOGIN:
 * const profile = await getProfile(user.id);
 * if (!profile.onboarding_completed) {
 *   redirect('/onboarding');
 * }
 * if (profile.role === 'influencer' && profile.approval_status !== 'approved') {
 *   redirect('/influencer/pending');
 * }
 * redirect('/dashboard');
 * 
 * Uses new auth state system for routing.
 * This is the single entry point for authenticated users.
 */
import { getAuthState, getRedirectPath } from '@/lib/auth-state'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const state = await getAuthState()

  // Unauthenticated → login
  if (state.type === 'unauthenticated') {
    redirect('/login')
  }

  // Authenticated but no profile → complete profile
  if (state.type === 'authenticated_no_profile') {
    redirect('/complete-profile')
  }

  // Check if user should be redirected based on state
  const redirectPath = getRedirectPath(state, '/dashboard')

  if (redirectPath) {
    redirect(redirectPath)
  }

  // All checks passed - redirect to role-specific dashboard
  if (state.type === 'influencer_approved') {
    redirect('/influencer/dashboard')
  }

  if (state.type === 'brand_active') {
    redirect('/brand/dashboard')
  }

  if (state.type === 'admin') {
    redirect('/admin')
  }

  // Fallback
  redirect('/')
}
