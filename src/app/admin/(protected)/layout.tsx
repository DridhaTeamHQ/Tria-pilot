import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/auth'

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

  const service = createServiceClient()
  const { data: adminCheck } = await service
    .from('admin_users')
    .select('user_id')
    .eq('user_id', authUser.id)
    .single()

  if (!adminCheck) {
    redirect('/admin/login?error=not_admin')
  }

  return <>{children}</>
}

