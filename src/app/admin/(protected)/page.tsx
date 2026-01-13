import { createServiceClient } from '@/lib/auth'
import AdminDashboardClient from '../AdminDashboardClient'
import Link from 'next/link'

export default async function AdminPage() {
  const supabase = createServiceClient()

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
        <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-charcoal mb-2">Admin Dashboard</h1>
            <p className="text-charcoal/60">
              Review influencer applications and control access to influencer features.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-5 py-2.5 rounded-full border border-charcoal/15 text-charcoal text-sm font-medium hover:bg-charcoal/5 transition-colors"
            >
              Back to site
            </Link>
          </div>
        </div>

        <AdminDashboardClient initialApplications={applications || []} />
      </div>
    </div>
  )
}

