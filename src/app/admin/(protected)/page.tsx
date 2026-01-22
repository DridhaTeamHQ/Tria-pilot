import { createServiceClient } from '@/lib/auth'
import AdminDashboardClient from '../AdminDashboardClient'
import Link from 'next/link'
import prisma from '@/lib/prisma'

// Force dynamic rendering for admin dashboard
export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  // CRITICAL: Force dynamic rendering and no caching for admin dashboard
  // Admin must see fresh data from database, not cached responses
  const service = createServiceClient()

  // Fetch applications from Supabase (fresh data, no cache)
  const { data: applicationsData, error } = await service
    .from('influencer_applications')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching applications from Supabase:', {
      error: error.message,
      code: error.code,
      details: error.details,
    })
  }

  // CRITICAL: Enrich with Prisma onboarding data using batch query (more efficient)
  // Query must match exactly:
  // - role === 'INFLUENCER'
  // - onboardingCompleted === true
  // - approvalStatus IN ('pending', 'approved', 'rejected') (from influencer_applications.status)
  const userIds = (applicationsData || []).map((app: any) => app.user_id)
  
  // Fetch influencers with onboardingCompleted === true in batch (more efficient than individual queries)
  const influencers = await prisma.influencerProfile.findMany({
    where: {
      userId: { in: userIds },
      onboardingCompleted: true, // CRITICAL: Only show influencers who completed onboarding
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true, // CRITICAL: Include role to filter out brands
          createdAt: true,
        },
      },
    },
  })

  // DEFENSIVE: Log if we have applications but no matching influencers
  if (applicationsData && applicationsData.length > 0 && influencers.length === 0) {
    console.warn('Admin page: Found applications but no matching influencers with onboardingCompleted=true', {
      applicationUserIds: userIds,
      applicationCount: applicationsData.length,
    })
  }

  // Merge Supabase application data with Prisma onboarding data
  const enrichedApplications = (applicationsData || [])
    .map((app: any) => {
      const influencer = influencers.find((inf) => inf.userId === app.user_id)

      // Skip if influencer not found or role is not INFLUENCER (could be a brand)
      if (!influencer || influencer.user.role !== 'INFLUENCER') {
        return null
      }

      // DEFENSIVE: Assert valid state
      if (!influencer.onboardingCompleted) {
        console.error(`INVALID STATE: Application ${app.user_id} has approvalStatus but onboardingCompleted = false`)
        return null
      }

      return {
        ...app,
        onboarding: {
          gender: influencer.gender,
          niches: influencer.niches,
          audienceType: influencer.audienceType,
          preferredCategories: influencer.preferredCategories,
          socials: influencer.socials,
          bio: influencer.bio,
          followers: influencer.followers,
          engagementRate: influencer.engagementRate,
          audienceRate: influencer.audienceRate,
          retentionRate: influencer.retentionRate,
          badgeScore: influencer.badgeScore,
          badgeTier: influencer.badgeTier,
          onboardingCompleted: influencer.onboardingCompleted,
        },
        user: influencer.user,
      }
    })
    .filter((app: any) => app !== null) // Remove null entries

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
              href="/?from=admin"
              className="px-5 py-2.5 rounded-full border border-charcoal/15 text-charcoal text-sm font-medium hover:bg-charcoal/5 transition-colors"
            >
              Back to site
            </Link>
          </div>
        </div>

        <AdminDashboardClient initialApplications={enrichedApplications || []} />
      </div>
    </div>
  )
}

