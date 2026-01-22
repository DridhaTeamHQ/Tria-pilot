/**
 * ADMIN PROTECTED LAYOUT
 * 
 * Admins are identified ONLY by: profiles.role === 'admin'
 * DO NOT check admin_users table
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/auth'
import { fetchProfile } from '@/lib/auth-state'

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/admin/login')
  }

  // Check admin access - use profiles.role === 'admin' (SOURCE OF TRUTH)
  const profile = await fetchProfile(authUser.id)

  if (!profile || profile.role !== 'admin') {
    redirect('/admin/login?error=not_admin')
  }

  return <>{children}</>
}
