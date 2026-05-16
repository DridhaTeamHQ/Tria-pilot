import { redirect } from 'next/navigation'
import { getIdentity } from '@/lib/auth-state'
import InfluencerOnboardingClient from './InfluencerOnboardingClient'

export default async function InfluencerOnboardingPage() {
  const auth = await getIdentity()

  if (!auth.authenticated) {
    redirect('/login?redirect=/onboarding/influencer')
  }

  if (!auth.identity) {
    redirect('/dashboard')
  }

  if (auth.identity.role !== 'influencer') {
    redirect('/dashboard')
  }

  if (auth.identity.onboarding_completed) {
    if (auth.identity.approval_status === 'approved') {
      redirect('/marketplace')
    }

    redirect('/influencer/pending')
  }

  return <InfluencerOnboardingClient />
}
