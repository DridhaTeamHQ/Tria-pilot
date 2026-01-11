import { redirect } from 'next/navigation'
import { createClient } from '@/lib/auth'

export default async function AdminLayout({
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

  // Check if user is admin using RLS-protected query
  const { data: adminCheck } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', authUser.id)
    .single()

  if (!adminCheck) {
    // Not an admin - redirect to dashboard
    redirect('/dashboard')
  }

  return <>{children}</>
}
