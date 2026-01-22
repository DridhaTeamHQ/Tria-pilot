/**
 * Reusable Auth Guard Helper
 * 
 * Fetches profile from Supabase profiles table and determines routing based on:
 * - role
 * - onboarding_completed
 * - approval_status
 * 
 * This is the single source of truth for auth-based routing decisions.
 * 
 * CRITICAL: Uses Supabase profiles table with approval_status column.
 * Values: 'draft' | 'pending' | 'approved' | 'rejected'
 * Treats null/missing as 'draft'.
 */

import { createClient, createServiceClient } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'

export type ApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected'
export type UserRole = 'influencer' | 'brand' | 'admin'

export interface ProfileData {
  id: string
  email: string
  role: UserRole
  onboarding_completed: boolean
  approval_status: ApprovalStatus
}

/**
 * Fetch user profile from Supabase profiles table
 * Falls back to Prisma if profiles table doesn't exist or fails
 */
export async function getProfile(userId: string): Promise<ProfileData | null> {
  try {
    // First try Supabase profiles table
    const service = createServiceClient()
    const { data, error } = await service
      .from('profiles')
      .select('id, email, role, onboarding_completed, approval_status')
      .eq('id', userId)
      .single()

    if (!error && data) {
      // Normalize approval_status: treat null/missing as 'draft'
      const approvalStatus: ApprovalStatus = (data.approval_status as ApprovalStatus) || 'draft'

      return {
        id: data.id,
        email: data.email,
        role: data.role as UserRole,
        onboarding_completed: data.onboarding_completed ?? false,
        approval_status: approvalStatus,
      }
    }

    // Fallback: Use Prisma + influencer_applications if profiles table doesn't exist
    console.warn('profiles table not found or error, falling back to Prisma:', error?.message)
    return await getProfileFromPrisma(userId)
  } catch (error) {
    console.error('Exception fetching profile:', error)
    // Fallback to Prisma
    return await getProfileFromPrisma(userId)
  }
}

/**
 * Fallback: Get profile from Prisma + influencer_applications
 * This maintains backward compatibility
 */
async function getProfileFromPrisma(userId: string): Promise<ProfileData | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        influencerProfile: { select: { onboardingCompleted: true } },
        brandProfile: { select: { onboardingCompleted: true } },
      },
    })

    if (!user) {
      return null
    }

    // Map Prisma role to profiles role format
    const role: UserRole = user.role === 'INFLUENCER' ? 'influencer' : user.role === 'BRAND' ? 'brand' : 'admin'

    // Get onboarding status
    const onboardingCompleted =
      role === 'influencer'
        ? user.influencerProfile?.onboardingCompleted ?? false
        : user.brandProfile?.onboardingCompleted ?? false

    // Get approval status from influencer_applications (for influencers only)
    let approvalStatus: ApprovalStatus = 'draft'
    if (role === 'influencer') {
      const supabase = await createClient()
      const { data: application } = await supabase
        .from('influencer_applications')
        .select('status')
        .eq('user_id', userId)
        .maybeSingle()

      if (application?.status) {
        // Map influencer_applications.status to approval_status
        const status = application.status as string
        if (status === 'pending' || status === 'approved' || status === 'rejected') {
          approvalStatus = status as ApprovalStatus
        } else {
          approvalStatus = 'draft'
        }
      } else {
        // No application entry = draft
        approvalStatus = 'draft'
      }
    } else {
      // Brands don't need approval - default to 'approved' if onboarding completed
      approvalStatus = onboardingCompleted ? 'approved' : 'draft'
    }

    return {
      id: user.id,
      email: user.email,
      role,
      onboarding_completed: onboardingCompleted,
      approval_status: approvalStatus,
    }
  } catch (error) {
    console.error('Exception fetching profile from Prisma:', error)
    return null
  }
}

/**
 * Get profile by email (fallback if needed)
 */
export async function getProfileByEmail(email: string): Promise<ProfileData | null> {
  try {
    const service = createServiceClient()
    const { data, error } = await service
      .from('profiles')
      .select('id, email, role, onboarding_completed, approval_status')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (!error && data) {
      const approvalStatus: ApprovalStatus = (data.approval_status as ApprovalStatus) || 'draft'

      return {
        id: data.id,
        email: data.email,
        role: data.role as UserRole,
        onboarding_completed: data.onboarding_completed ?? false,
        approval_status: approvalStatus,
      }
    }

    // Fallback to Prisma
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        influencerProfile: { select: { onboardingCompleted: true } },
        brandProfile: { select: { onboardingCompleted: true } },
      },
    })

    if (!user) {
      return null
    }

    const role: UserRole = user.role === 'INFLUENCER' ? 'influencer' : user.role === 'BRAND' ? 'brand' : 'admin'
    const onboardingCompleted =
      role === 'influencer'
        ? user.influencerProfile?.onboardingCompleted ?? false
        : user.brandProfile?.onboardingCompleted ?? false

    let approvalStatus: ApprovalStatus = 'draft'
    if (role === 'influencer') {
      const supabase = await createClient()
      const { data: application } = await supabase
        .from('influencer_applications')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle()

      if (application?.status) {
        const status = application.status as string
        if (status === 'pending' || status === 'approved' || status === 'rejected') {
          approvalStatus = status as ApprovalStatus
        }
      }
    } else {
      approvalStatus = onboardingCompleted ? 'approved' : 'draft'
    }

    return {
      id: user.id,
      email: user.email,
      role,
      onboarding_completed: onboardingCompleted,
      approval_status: approvalStatus,
    }
  } catch (error) {
    console.error('Exception fetching profile by email:', error)
    return null
  }
}

/**
 * Determine redirect path based on profile state
 * 
 * CRITICAL RULES (must match user requirements):
 * - influencer:
 *   - if onboarding_completed === false → redirect to /onboarding/influencer
 *   - if onboarding_completed === true AND approval_status === 'pending' → /influencer/pending
 *   - if approval_status === 'approved' → full access (return null)
 *   - if approval_status === 'draft' or 'rejected' → /influencer/pending
 * - brand:
 *   - if onboarding_completed === false → /onboarding/brand
 *   - otherwise full access (return null) - NO approval required
 * - admin:
 *   - full access (return null)
 */
export function getRedirectPath(profile: ProfileData | null, currentPath?: string): string | null {
  if (!profile) {
    return '/login' // No profile found
  }

  // Admin always has full access
  if (profile.role === 'admin') {
    return null
  }

  // Brand logic - NO approval required
  if (profile.role === 'brand') {
    if (!profile.onboarding_completed) {
      // Don't redirect if already on brand onboarding page
      if (currentPath === '/onboarding/brand') {
        return null
      }
      return '/onboarding/brand'
    }
    // Brand has full access after onboarding - no approval needed
    return null
  }

  // Influencer logic - REQUIRES approval
  if (profile.role === 'influencer') {
    // CRITICAL: First check onboarding completion
    // If onboarding is not completed, MUST redirect to onboarding
    // DO NOT show approval screen before onboarding is done
    if (!profile.onboarding_completed) {
      // Don't redirect if already on influencer onboarding page
      if (currentPath === '/onboarding/influencer') {
        return null
      }
      return '/onboarding/influencer'
    }

    // CRITICAL: Second check approval status
    // Only 'approved' status grants full access
    // All other statuses (draft, pending, rejected) → pending page
    if (profile.approval_status !== 'approved') {
      // Don't redirect if already on pending page
      if (currentPath === '/influencer/pending') {
        return null
      }
      return '/influencer/pending'
    }

    // Approved influencer - full access
    return null
  }

  // Unknown role - redirect to home
  return '/'
}

/**
 * Require specific approval status
 */
export function requireApprovalStatus(
  profile: ProfileData | null,
  requiredStatus: ApprovalStatus
): void {
  if (!profile) {
    redirect('/login')
  }

  if (profile.approval_status !== requiredStatus) {
    const redirectPath = getRedirectPath(profile)
    if (redirectPath) {
      redirect(redirectPath)
    }
  }
}

/**
 * Check if user can access a route based on profile state
 */
export function canAccessRoute(profile: ProfileData | null, route: string): boolean {
  if (!profile) {
    return false
  }

  // Admin can access everything
  if (profile.role === 'admin') {
    return true
  }

  // Public routes
  const publicRoutes = ['/', '/login', '/register', '/marketplace', '/help', '/contact', '/about', '/privacy', '/terms']
  if (publicRoutes.includes(route) || route.startsWith('/marketplace/')) {
    return true
  }

  // Brand routes
  if (profile.role === 'brand') {
    if (!profile.onboarding_completed && route !== '/onboarding/brand') {
      return false
    }
    return route.startsWith('/brand') || route === '/onboarding/brand'
  }

  // Influencer routes
  if (profile.role === 'influencer') {
    if (!profile.onboarding_completed) {
      return route === '/onboarding/influencer'
    }

    if (profile.approval_status !== 'approved') {
      return route === '/influencer/pending' || route.startsWith('/marketplace')
    }

    return route.startsWith('/influencer') || route === '/onboarding/influencer'
  }

  return false
}
