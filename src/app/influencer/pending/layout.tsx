/**
 * Server-side layout guard for /influencer/pending
 * 
 * Enforces:
 * - onboardingCompleted === true (redirect to onboarding if false)
 * - approvalStatus !== 'approved' (redirect to dashboard if approved)
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/auth'
import prisma from '@/lib/prisma'

export default async function InfluencerPendingLayout({
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

  // Get user from database
  const dbUser = await prisma.user.findUnique({
    where: { email: authUser.email!.toLowerCase().trim() },
    include: {
      influencerProfile: {
        select: {
          onboardingCompleted: true,
        },
      },
    },
  })

  if (!dbUser || dbUser.role !== 'INFLUENCER' || !dbUser.influencerProfile) {
    redirect('/dashboard')
  }

  // CRITICAL: Pending page requires onboarding to be completed
  // If onboarding is not completed, redirect to onboarding
  if (!dbUser.influencerProfile.onboardingCompleted) {
    redirect('/onboarding/influencer')
  }

  // Check approval status
  const { data: application } = await supabase
    .from('influencer_applications')
    .select('status')
    .eq('user_id', dbUser.id)
    .maybeSingle()

  // If approved, redirect to dashboard (will route to influencer dashboard)
  if (application?.status === 'approved') {
    redirect('/dashboard')
  }

  // Allow access if:
  // - onboardingCompleted === true
  // - approvalStatus === 'pending' OR null (not yet set, but onboarding is done)
  return <>{children}</>
}
