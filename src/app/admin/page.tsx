import { createServiceClient } from '@/lib/auth'
import AdminDashboardClient from './AdminDashboardClient'

export default async function AdminPage() {
  const supabase = createServiceClient()
  
  // Fetch influencer applications (AdminLayout enforces access; service role avoids RLS misconfig issues)
  const { data: applications, error } = await supabase
    .from('influencer_applications')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching applications:', error)
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="container mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-charcoal mb-2">
            Admin Dashboard
          </h1>
          <p className="text-charcoal/60">
            Manage influencer applications and approvals
          </p>
        </div>

        <AdminDashboardClient initialApplications={applications || []} />
      </div>
    </div>
  )
}
