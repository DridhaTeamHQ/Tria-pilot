/**
 * ADMIN DASHBOARD PAGE
 * 
 * DATA SOURCE: ONLY query profiles table
 * NEVER query auth.users or influencer_applications
 * 
 * Query: FROM profiles WHERE role = 'influencer'
 * 
 * FILTER LOGIC (IN CODE, NOT SQL):
 * - Draft: onboarding_completed === false
 * - Pending: onboarding_completed === true && approval_status === 'pending'
 * - Approved: approval_status === 'approved'
 * - Rejected: approval_status === 'rejected'
 */
import { createServiceClient } from '@/lib/auth'
import AdminDashboardClient from '../AdminDashboardClient'
import Link from 'next/link'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminPage() {
  const service = createServiceClient()

  // CRITICAL: Query profiles table – role is stored UPPERCASE (INFLUENCER) from register
  const { data: profiles, error } = await service
    .from('profiles')
    .select('*')
    .or('role.eq.INFLUENCER,role.eq.influencer')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching profiles:', {
      error: error.message,
      code: error.code,
      details: error.details,
    })
  }

  if (!profiles || profiles.length === 0) {
    return (
      <div className="min-h-screen bg-cream">
        <div className="container mx-auto px-6 py-12">
          <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-charcoal mb-2">Admin Dashboard</h1>
              <p className="text-charcoal/60">Review influencer applications and control access to influencer features.</p>
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
          <AdminDashboardClient initialApplications={[]} />
        </div>
      </div>
    )
  }

  // Fetch onboarding data from Prisma – match by profile id OR email (Prisma user id may differ if linked by email)
  const userIds = profiles.map((p: any) => p.id)
  const profileEmails = profiles.map((p: any) => (p.email || '').toString().toLowerCase().trim()).filter(Boolean)
  const influencers = await prisma.influencerProfile.findMany({
    where: {
      OR: [
        { userId: { in: userIds } },
        { user: { email: { in: profileEmails } } },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      },
    },
  })

  const norm = (e: string) => (e || '').toLowerCase().trim()

  // Enrich profiles with onboarding data (match by id or email so linked-by-email users appear)
  const enrichedApplications = profiles
    .map((profile: any) => {
      const influencer =
        influencers.find((inf) => inf.userId === profile.id) ??
        influencers.find((inf) => norm(inf.user.email) === norm(profile.email))

      if (!influencer || influencer.user.role !== 'INFLUENCER') {
        return null
      }

      // Determine status for display (normalize DB CAPS to lowercase for frontend)
      let displayStatus = (profile.approval_status || 'none').toString().toLowerCase()
      if (!profile.onboarding_completed) {
        displayStatus = 'none' // Draft = onboarding_completed === false
      }

      return {
        user_id: profile.id,
        email: profile.email,
        full_name: influencer.user.name,
        status: displayStatus,
        created_at: profile.created_at,
        updated_at: profile.updated_at || profile.created_at,
        reviewed_at: null,
        review_note: null,
        onboarding: {
          gender: influencer.gender,
          niches: Array.isArray(influencer.niches) ? (influencer.niches as string[]) : [],
          audienceType: Array.isArray(influencer.audienceType) ? (influencer.audienceType as string[]) : [],
          preferredCategories: Array.isArray(influencer.preferredCategories) ? (influencer.preferredCategories as string[]) : [],
          socials: typeof influencer.socials === 'object' && influencer.socials !== null ? (influencer.socials as Record<string, string>) : {},
          bio: influencer.bio,
          followers: influencer.followers,
          engagementRate: influencer.engagementRate ? Number(influencer.engagementRate) : null,
          audienceRate: influencer.audienceRate ? Number(influencer.audienceRate) : null,
          retentionRate: influencer.retentionRate ? Number(influencer.retentionRate) : null,
          badgeScore: influencer.badgeScore ? Number(influencer.badgeScore) : null,
          badgeTier: influencer.badgeTier,
          onboardingCompleted: influencer.onboardingCompleted,
        },
        user: influencer.user,
      }
    })
    .filter((app: any) => app !== null)

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

        <AdminDashboardClient initialApplications={enrichedApplications.filter((app): app is NonNullable<typeof app> => app !== null)} />
      </div>
    </div>
  )
}
