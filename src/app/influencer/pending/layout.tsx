/**
 * INFLUENCER PENDING LAYOUT GUARD
 *
 * Enforces:
 * - Must have completed onboarding
 * - Must not be approved yet
 */
import { getIdentity } from '@/lib/auth-state'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function InfluencerPendingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const auth = await getIdentity()

  if (!auth.authenticated) {
    redirect('/login')
  }

  if (!auth.identity) {
    redirect('/dashboard')
  }

  const { identity } = auth

  if (identity.role !== 'influencer') {
    redirect('/dashboard')
  }

  if (!identity.onboarding_completed) {
    redirect('/onboarding/influencer')
  }

  if (identity.approval_status === 'approved') {
    redirect('/marketplace')
  }

  return <>{children}</>
}
