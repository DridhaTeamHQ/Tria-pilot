import { createClient } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'

export default async function Dashboard() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  // Optimized query - only select needed fields for redirect logic
  const user = await prisma.user.findUnique({
    where: { email: authUser.email!.toLowerCase().trim() },
    select: {
      id: true,
      role: true,
      email: true,
      influencerProfile: {
        select: {
          onboardingCompleted: true,
        },
      },
      brandProfile: {
        select: {
          onboardingCompleted: true,
        },
      },
    },
  })

  if (!user) {
    redirect('/login')
  }

  // Debug: Log user role for troubleshooting
  console.log('Dashboard redirect - User role:', user.role, 'Email:', user.email)

  // Check onboarding completion
  if (user.role === 'INFLUENCER') {
    const profile = user.influencerProfile
    // TypeScript workaround: Prisma types may not include onboardingCompleted in inferred type
    const onboardingCompleted = profile && 'onboardingCompleted' in profile ? profile.onboardingCompleted : false
    if (!profile || !onboardingCompleted) {
      redirect('/onboarding/influencer')
    }
    redirect('/influencer/dashboard')
  } else if (user.role === 'BRAND') {
    const profile = user.brandProfile
    // TypeScript workaround: Prisma types may not include onboardingCompleted in inferred type
    const onboardingCompleted = profile && 'onboardingCompleted' in profile ? profile.onboardingCompleted : false
    if (!profile || !onboardingCompleted) {
      redirect('/onboarding/brand')
    }
    redirect('/brand/dashboard')
  }

  // If role is neither, redirect to home
  console.error('User has invalid role:', user.role)
  redirect('/')
}

