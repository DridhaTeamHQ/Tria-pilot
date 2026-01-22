import { createClient } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getProfile, getRedirectPath } from '@/lib/auth-guard'

/**
 * Dashboard Route - Central routing hub for authenticated users
 * 
 * Uses reusable auth guard helper for consistent routing logic.
 * 
 * Flow (in order):
 * 1. Check authentication → redirect to /login if not authenticated
 * 2. Check if admin → redirect to /admin
 * 3. Fetch profile from Supabase profiles table (or Prisma fallback)
 * 4. Check email verification → redirect to /login with message if not verified
 * 5. Use guard helper to determine redirect based on role, onboarding, approval_status
 * 6. Redirect to role-specific dashboard if all checks pass
 */
export default async function Dashboard() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  // STEP 1: Check if admin (admin_users table check)
  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', authUser.id)
    .maybeSingle()

  if (adminRow) {
    redirect('/admin')
  }

  // STEP 2: Check email verification (critical - must be verified before proceeding)
  if (!authUser.email_confirmed_at) {
    redirect('/login?error=email_not_confirmed')
  }

  // STEP 3: Fetch profile using guard helper
  // This reads from Supabase profiles table (or Prisma fallback)
  const profile = await getProfile(authUser.id)

  if (!profile) {
    // Profile not found - might need profile completion
    // Check if Prisma user exists as fallback
    const prisma = (await import('@/lib/prisma')).default
    const prismaUser = await prisma.user.findUnique({
      where: { email: authUser.email!.toLowerCase().trim() },
    })

    if (!prismaUser) {
      // User exists in Supabase Auth but not in database - needs profile completion
      redirect('/complete-profile')
    }

    // Prisma user exists but no profile - this is a data inconsistency
    // Try to create profile or redirect to complete-profile
    redirect('/complete-profile')
  }

  // STEP 4: Use guard helper to determine redirect path
  const redirectPath = getRedirectPath(profile)

  if (redirectPath) {
    redirect(redirectPath)
  }

  // STEP 5: All checks passed - redirect to role-specific dashboard
  if (profile.role === 'influencer') {
    redirect('/influencer/dashboard')
  } else if (profile.role === 'brand') {
    redirect('/brand/dashboard')
  } else if (profile.role === 'admin') {
    redirect('/admin')
  }

  // Unknown role - redirect to home
  redirect('/')
}

