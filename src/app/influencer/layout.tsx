import { redirect } from 'next/navigation'
import { createClient } from '@/lib/auth'
import { getProfile, getRedirectPath } from '@/lib/auth-guard'

/**
 * Influencer Layout Guard
 * 
 * Uses reusable auth guard helper for consistent routing logic.
 * Enforces:
 * - onboarding_completed === true (redirect to onboarding if false)
 * - approval_status === 'approved' (redirect to pending if not approved)
 */
export default async function InfluencerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  // Fetch profile using guard helper
  const profile = await getProfile(authUser.id)

  if (!profile) {
    redirect('/dashboard')
  }

  // CRITICAL: Only allow influencers
  if (profile.role !== 'influencer') {
    redirect('/dashboard')
  }

  // Use guard helper to determine redirect
  const redirectPath = getRedirectPath(profile)

  if (redirectPath) {
    redirect(redirectPath)
  }

  // All checks passed - allow access
  return <>{children}</>
}
