/**
 * CENTRAL DASHBOARD ROUTE
 * 
 * This is the SINGLE ENTRY POINT for all authenticated users.
 * Routes users to their role-specific dashboard based on profiles table.
 * 
 * Flow:
 * 1. Check auth session
 * 2. Fetch profile from Supabase profiles table
 * 3. Route based on role:
 *    - admin → /admin
 *    - brand (onboarding incomplete) → /onboarding/brand
 *    - brand (active) → /brand/dashboard
 *    - influencer (onboarding incomplete) → /onboarding/influencer
 *    - influencer (pending approval) → /influencer/pending
 *    - influencer (approved) → /influencer/dashboard
 */
import { createClient, createServiceClient } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  console.log('[DASHBOARD] getUser result:', authUser ? `authenticated uid=${authUser.id}` : 'NOT authenticated')

  // Not authenticated → login
  if (!authUser) {
    console.log('[DASHBOARD] Redirecting to /login (not authenticated)')
    redirect('/login')
  }

  // Fetch profile from profiles table (SOURCE OF TRUTH)
  const service = createServiceClient()
  const { data: profile, error } = await service
    .from('profiles')
    .select('role, onboarding_completed, approval_status')
    .eq('id', authUser.id)
    .single()

  // No profile → complete profile setup
  if (error || !profile) {
    console.error('Dashboard: No profile found for user', authUser.id, error)
    redirect('/complete-profile')
  }

  // Normalize role to lowercase
  const role = ((profile.role || 'influencer') as string).trim().toLowerCase()
  const onboardingComplete = Boolean(profile.onboarding_completed)
  const approvalStatus = ((profile.approval_status || 'none') as string).trim().toLowerCase()

  console.log('Dashboard routing:', { role, onboardingComplete, approvalStatus })

  // ADMIN - goes to admin dashboard
  if (role === 'admin') {
    redirect('/admin')
  }

  // BRAND - check onboarding
  if (role === 'brand') {
    if (!onboardingComplete) {
      redirect('/onboarding/brand')
    }
    redirect('/brand/dashboard')
  }

  // INFLUENCER - check onboarding and approval
  if (role === 'influencer') {
    if (!onboardingComplete) {
      redirect('/onboarding/influencer')
    }
    if (approvalStatus !== 'approved') {
      redirect('/influencer/pending')
    }
    redirect('/influencer/dashboard')
  }

  // Unknown role → recover to profile completion instead of landing ambiguity
  redirect('/complete-profile')
}
