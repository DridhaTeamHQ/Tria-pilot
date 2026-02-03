import { createServiceClient } from '@/lib/auth'
import AdminDashboardClient from '../AdminDashboardClient'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminPage() {
  const service = createServiceClient()

  const { data: profiles, error } = await service
    .from('profiles')
    .select('*, influencer_profiles(*)')
    .or('role.eq.INFLUENCER,role.eq.influencer')
    .order('created_at', { ascending: false })

  if (error || !profiles) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p>Failed to load admin dashboard.</p>
      </div>
    )
  }

  const enrichedApplications = profiles.map((p: any) => {
    const inf = p.influencer_profiles || {}
    let displayStatus = (p.approval_status || 'none').toLowerCase()
    if (!p.onboarding_completed) displayStatus = 'none'

    return {
      user_id: p.id,
      email: p.email,
      full_name: p.full_name,
      status: displayStatus,
      created_at: p.created_at,
      updated_at: p.updated_at,
      reviewed_at: null,
      review_note: null,
      onboarding: {
        gender: inf.gender,
        niches: inf.niches,
        bio: inf.bio,
        followers: inf.followers,
        engagementRate: inf.engagement_rate,
        audienceRate: inf.audience_rate,
        badgeScore: inf.badge_score,
        badgeTier: inf.badge_tier,
        onboardingCompleted: p.onboarding_completed
      },
      user: {
        id: p.id,
        email: p.email,
        name: p.full_name,
        role: p.role,
        createdAt: p.created_at
      }
    }
  })

  return (
    <div className="min-h-screen bg-cream">
      <div className="container mx-auto px-6 py-12">
        <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-charcoal mb-2">Admin Dashboard</h1>
            <p className="text-charcoal/60">Review influencer applications.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/?from=admin" className="px-5 py-2.5 rounded-full border border-charcoal/15 text-charcoal text-sm">Back to site</Link>
          </div>
        </div>
        <AdminDashboardClient initialApplications={enrichedApplications} dataSource="supabase-only" />
      </div>
    </div>
  )
}
