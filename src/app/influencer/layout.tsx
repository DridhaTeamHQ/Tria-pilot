/**
 * INFLUENCER LAYOUT GUARD
 * 
 * Enforces routing based on auth state.
 * Only approved influencers can access influencer routes.
 * 
 * NOTE: /influencer/pending has its own layout guard that ensures
 * only influencer_pending users can access it.
 */
import { getAuthState } from '@/lib/auth-state'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function InfluencerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const state = await getAuthState()

  // Must be authenticated
  if (state.type === 'unauthenticated') {
    redirect('/login')
  }

  // Must be influencer
  if (
    state.type !== 'influencer_draft' &&
    state.type !== 'influencer_pending' &&
    state.type !== 'influencer_approved'
  ) {
    redirect('/dashboard')
  }

  // Drafts must complete onboarding
  if (state.type === 'influencer_draft') {
    redirect('/onboarding/influencer')
  }

  // Pending and approved users can proceed
  // - Pending users: child layouts will handle /pending vs other routes
  // - Approved users: full access to all influencer routes
  return <>{children}</>
}
