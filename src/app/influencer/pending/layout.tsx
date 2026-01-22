/**
 * Server-side layout guard for /influencer/pending
 * 
 * Enforces:
 * - onboarding_completed === true (redirect to onboarding if false)
 * - approval_status !== 'approved' (redirect to dashboard if approved)
 * 
 * Uses reusable auth guard helper for consistent logic.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/auth'
import { getProfile, getRedirectPath } from '@/lib/auth-guard'

export default async function InfluencerPendingLayout({
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

  if (!profile || profile.role !== 'influencer') {
    redirect('/dashboard')
  }

  // CRITICAL: Pending page requires onboarding to be completed
  // If onboarding is not completed, redirect to onboarding
  if (!profile.onboarding_completed) {
    redirect('/onboarding/influencer')
  }

  // If approved, redirect to dashboard (will route to influencer dashboard)
  if (profile.approval_status === 'approved') {
    redirect('/dashboard')
  }

  // Allow access if:
  // - onboarding_completed === true
  // - approval_status !== 'approved' (draft, pending, or rejected)
  return <>{children}</>
}
