/**
 * Server-side route guard for /influencer/pending
 * 
 * This page MUST require:
 * - onboardingCompleted === true
 * - approvalStatus === 'pending' (or null, which means not yet set)
 * 
 * If onboarding is not completed, redirect to onboarding.
 * This prevents impossible states where user sees pending screen before completing onboarding.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function checkPendingPageAccess(userId: string): Promise<{ allowed: boolean; redirectTo?: string }> {
  try {
    // Check onboarding completion status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        influencerProfile: {
          select: {
            onboardingCompleted: true,
          },
        },
      },
    })

    if (!user || user.role !== 'INFLUENCER' || !user.influencerProfile) {
      return { allowed: false, redirectTo: '/dashboard' }
    }

    // CRITICAL: Pending page requires onboarding to be completed
    if (!user.influencerProfile.onboardingCompleted) {
      // User hasn't completed onboarding - redirect to onboarding
      return { allowed: false, redirectTo: '/onboarding/influencer' }
    }

    // Check approval status
    const supabase = await createClient()
    const { data: application } = await supabase
      .from('influencer_applications')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle()

    // If approved, redirect to dashboard (will route to influencer dashboard)
    if (application?.status === 'approved') {
      return { allowed: false, redirectTo: '/dashboard' }
    }

    // Allow access if:
    // - onboardingCompleted === true
    // - approvalStatus === 'pending' OR null (not yet set)
    return { allowed: true }
  } catch (error) {
    console.error('Error checking pending page access:', error)
    // On error, redirect to dashboard for safety
    return { allowed: false, redirectTo: '/dashboard' }
  }
}
