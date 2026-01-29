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
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      redirect('/admin/login')
    }

    const profile = await fetchProfile(authUser.id)
    if (!profile || profile.role !== 'admin') {
      redirect('/admin/login?error=not_admin')
    }

    return <>{children}</>
  } catch (e) {
    console.error('Admin protected layout error:', e)
    redirect('/admin/login')
  }
}
