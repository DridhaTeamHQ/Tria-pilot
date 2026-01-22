import { createServiceClient } from '@/lib/auth'
import AdminDashboardClient from '../AdminDashboardClient'
import Link from 'next/link'
import prisma from '@/lib/prisma'

// Force dynamic rendering for admin dashboard
export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const service = createServiceClient()

  // Fetch applications from Supabase
  const { data: applicationsData, error } = await service
    .from('influencer_applications')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching applications:', error)
  }

  // Enrich with Prisma onboarding data
  // CRITICAL: Only include influencers with onboardingCompleted === true
  // CRITICAL: Exclude brands (role !== 'INFLUENCER')
  const applications = (applicationsData || []).map(async (app: any) => {
    const influencer = await prisma.influencerProfile.findUnique({
      where: { userId: app.user_id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true, // Include role to filter out brands
            createdAt: true,
          },
        },
      },
    })

    // Skip if influencer not found or role is not INFLUENCER (could be a brand)
    if (!influencer || influencer.user.role !== 'INFLUENCER') {
      return null
    }

    // CRITICAL: Only include influencers who completed onboarding
    if (!influencer.onboardingCompleted) {
      // DEFENSIVE: Log invalid state but don't show in admin dashboard
      console.warn(`INVALID STATE: Application ${app.user_id} has approvalStatus but onboardingCompleted = false`)
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

  const enrichedApplications = (await Promise.all(applications)).filter((app: any) => app !== null)

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

