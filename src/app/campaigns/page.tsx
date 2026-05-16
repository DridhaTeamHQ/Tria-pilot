import { redirect } from 'next/navigation'
import { getIdentity } from '@/lib/auth-state'

export default async function CampaignsRedirectPage() {
  const auth = await getIdentity()

  if (!auth.authenticated) {
    redirect('/login?redirect=/brand/campaigns')
  }

  if (!auth.identity) {
    redirect('/dashboard')
  }

  if (auth.identity.role === 'brand') {
    redirect('/brand/campaigns')
  }

  redirect('/marketplace')
}
