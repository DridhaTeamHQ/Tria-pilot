import { createClient } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'

/**
 * Dashboard Route - Central routing hub for authenticated users
 * 
 * Flow (in order):
 * 1. Check authentication → redirect to /login if not authenticated
 * 2. Check if admin → redirect to /admin
 * 3. Check if Prisma user exists → redirect to /complete-profile if missing
 * 4. Check email verification → redirect to /login with message if not verified
 * 5. Check onboarding completion → redirect to onboarding page if incomplete
 * 6. Check approval (influencers only) → redirect to /influencer/pending if not approved
 * 7. Redirect to role-specific dashboard
 */
export default async function Dashboard() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  // STEP 1: Admin users may not have an app profile in Prisma.
  // If they are in admin_users, send them to the admin dashboard.
  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', authUser.id)
    .maybeSingle()

  if (adminRow) {
    redirect('/admin')
  }

  // STEP 2: Check if Prisma user exists (backward compatibility)
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
    // User exists in Supabase Auth but not in Prisma - needs profile completion
    redirect('/complete-profile')
  }

  // STEP 3: Check email verification (critical - must be verified before proceeding)
  // Note: Supabase handles email verification, we check email_confirmed_at
  if (!authUser.email_confirmed_at) {
    // Email not verified - redirect to login with message
    // The login page will show appropriate message
    redirect('/login?error=email_not_confirmed')
  }

  // STEP 4: Check onboarding completion
  if (user.role === 'INFLUENCER') {
    const profile = user.influencerProfile
    const onboardingCompleted = profile && 'onboardingCompleted' in profile ? profile.onboardingCompleted : false
    
    if (!profile || !onboardingCompleted) {
      redirect('/onboarding/influencer')
    }
    
    // STEP 5: Check approval status (influencers only)
    const { data: application } = await supabase
      .from('influencer_applications')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle()
    
    if (!application || application.status !== 'approved') {
      redirect('/influencer/pending')
    }
    
    // All checks passed - redirect to influencer dashboard
    redirect('/influencer/dashboard')
    
  } else if (user.role === 'BRAND') {
    const profile = user.brandProfile
    const onboardingCompleted = profile && 'onboardingCompleted' in profile ? profile.onboardingCompleted : false
    
    if (!profile || !onboardingCompleted) {
      redirect('/onboarding/brand')
    }
    
    // Brands don't need approval - redirect to brand dashboard
    redirect('/brand/dashboard')
  }

  // If role is neither INFLUENCER nor BRAND, this is an error
  console.error('User has invalid role:', user.role)
  redirect('/')
}

