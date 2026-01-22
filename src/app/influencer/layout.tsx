/**
 * INFLUENCER LAYOUT GUARD
 * 
 * Enforces routing based on auth state.
 * Only approved influencers can access influencer routes.
 */
import { getAuthState, getRedirectPath } from '@/lib/auth-state'
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

  // Check if redirect is needed
  const redirectPath = getRedirectPath(state, '/influencer')

  if (redirectPath) {
    redirect(redirectPath)
  }

  return <>{children}</>
}
