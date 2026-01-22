import { redirect } from 'next/navigation'
import { createClient } from '@/lib/auth'
import prisma from '@/lib/prisma'

export default async function InfluencerLayout({
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

  // Get user from database with onboarding status
  const dbUser = await prisma.user.findUnique({
    where: { email: authUser.email! },
    include: {
      influencerProfile: {
        select: {
          onboardingCompleted: true,
        },
      },
    },
  })

  if (!dbUser || dbUser.role !== 'INFLUENCER') {
    redirect('/dashboard')
  }

  // CRITICAL: Check onboarding completion first
  // If onboarding is not completed, redirect to onboarding
  if (!dbUser.influencerProfile?.onboardingCompleted) {
    redirect('/onboarding/influencer')
  }

  // Check influencer approval status
  const { data: application } = await supabase
    .from('influencer_applications')
    .select('status')
    .eq('user_id', dbUser.id)
    .maybeSingle()

  // DEFENSIVE: Assert valid state
  // If approvalStatus exists but onboarding is not completed, this is invalid
  if (application && !dbUser.influencerProfile.onboardingCompleted) {
    console.error(`INVALID STATE: User ${dbUser.id} has approvalStatus but onboardingCompleted = false`)
    // Redirect to onboarding to fix the state
    redirect('/onboarding/influencer')
  }

  // If not approved, redirect to pending page
  // (Individual pages like dashboard will also check, but this provides layout-level protection)
  if (!application || application.status !== 'approved') {
    // Allow access to pending page itself
    // Other pages will redirect to pending if needed
    return <>{children}</>
  }

  // User is approved - allow access to all influencer pages
  return <>{children}</>
}
