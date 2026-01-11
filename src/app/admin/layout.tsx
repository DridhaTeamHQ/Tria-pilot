import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/auth'

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

  const bootstrapEmail = (process.env.ADMIN_BOOTSTRAP_EMAIL || 'team@dridhatechnologies.com')
    .toLowerCase()
    .trim()

  // Check if user is admin using RLS-protected query
  const { data: adminCheck } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', authUser.id)
    .single()

  if (!adminCheck) {
    // Bootstrap: allow the configured admin email to self-provision (requires service role key)
    if (authUser.email?.toLowerCase().trim() === bootstrapEmail) {
      try {
        const service = createServiceClient()
        await service.from('admin_users').upsert({ user_id: authUser.id })
        // Allow access after provisioning (avoid a second DB roundtrip)
        return <>{children}</>
      } catch (e) {
        return (
          <div className="min-h-screen bg-cream flex items-center justify-center px-6">
            <div className="max-w-xl w-full bg-white rounded-3xl border border-charcoal/10 p-8">
              <h1 className="text-2xl font-serif font-bold text-charcoal">Admin setup required</h1>
              <p className="text-charcoal/70 mt-3">
                Your account matches the bootstrap admin email, but the server can’t provision admin access because
                <code className="mx-1 px-2 py-0.5 rounded bg-cream border border-charcoal/10">SUPABASE_SERVICE_ROLE_KEY</code>
                isn’t set in production.
              </p>
              <p className="text-charcoal/70 mt-4">
                Fix: add <strong>SUPABASE_SERVICE_ROLE_KEY</strong> to Vercel env vars (server-only), redeploy, then
                reload <strong>/admin</strong>.
              </p>
            </div>
          </div>
        )
      }
    }

    // Not an admin - redirect to dashboard
    redirect('/dashboard')
  }

  return <>{children}</>
}
