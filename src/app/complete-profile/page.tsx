import { redirect } from 'next/navigation'
import { getIdentity } from '@/lib/auth-state'

export default async function CompleteProfilePage() {
  const auth = await getIdentity()

  if (!auth.authenticated) {
    redirect('/register')
  }

  redirect('/dashboard')
}
