/**
 * SINGLE SOURCE AUTH STATE SYSTEM
 * 
 * This is the ONLY place where auth state is determined.
 * All components and routes use this system.
 * 
 * Database Truth (Supabase):
 * - auth.users → authentication ONLY
 * - profiles → role, onboarding, approval (SOURCE OF TRUTH)
 * - InfluencerProfile → influencer details ONLY
 * - BrandProfile → brand details ONLY
 * 
 * profiles table is the ONLY source of truth:
 * - role: 'influencer' | 'brand' | 'admin'
 * - onboarding_completed: boolean
 * - approval_status: 'none' | 'pending' | 'approved' | 'rejected'
 */

import { createClient, createServiceClient } from '@/lib/auth'

export type UserRole = 'influencer' | 'brand' | 'admin'
export type ApprovalStatus = 'none' | 'pending' | 'approved' | 'rejected'

export interface Profile {
  id: string
  email: string
  role: UserRole
  onboarding_completed: boolean
  approval_status: ApprovalStatus
}

/**
 * CANONICAL USER STATE MACHINE
 * 
 * Influencer:
 * - Just signed up: onboarding_completed=false, approval_status='none' → influencer_draft
 * - Onboarding submitted: onboarding_completed=true, approval_status='pending' → influencer_pending
 * - Approved: onboarding_completed=true, approval_status='approved' → influencer_approved
 * - Rejected: onboarding_completed=true, approval_status='rejected' → influencer_pending (blocked)
 * 
 * Brand:
 * - Signed up: onboarding_completed=false, approval_status='none' → brand_draft
 * - Onboarding done: onboarding_completed=true, approval_status='approved' → brand_active
 * 
 * Admin:
 * - role='admin' → admin (onboarding/approval ignored)
 */
export type AuthState =
  | { type: 'unauthenticated' }
  | { type: 'authenticated_no_profile'; userId: string; email: string }
  | { type: 'influencer_draft'; profile: Profile }
  | { type: 'influencer_pending'; profile: Profile }
  | { type: 'influencer_approved'; profile: Profile }
  | { type: 'brand_draft'; profile: Profile }
  | { type: 'brand_active'; profile: Profile }
  | { type: 'admin'; profile: Profile }

/**
 * SINGLE SOURCE: Fetch profile from Supabase profiles table
 * 
 * This is the ONLY function that reads profiles.
 * NO component should query profile directly.
 */
export async function fetchProfile(userId: string): Promise<Profile | null> {
  try {
    const service = createServiceClient()
    const { data, error } = await service
      .from('profiles')
      .select('id, email, role, onboarding_completed, approval_status')
      .eq('id', userId)
      .single()

    if (error || !data) {
      return null
    }

    // Normalize: ensure exact types (no nulls)
    const role = (data.role as UserRole) || 'influencer'
    // Normalize approval_status: null/missing → 'none'
    const approval_status: ApprovalStatus = (data.approval_status as ApprovalStatus) || 'none'
    const onboarding_completed = Boolean(data.onboarding_completed)

    return {
      id: data.id,
      email: data.email,
      role,
      onboarding_completed,
      approval_status,
    }
  } catch (error) {
    console.error('Error fetching profile:', error)
    return null
  }
}

/**
 * SINGLE SOURCE: Get auth state from session + profile
 * 
 * This is the ONLY function that determines auth state.
 * Used everywhere: routes, components, API handlers.
 * 
 * CRITICAL: Admin is determined by profiles.role === 'admin'
 * DO NOT check admin_users table.
 */
export async function getAuthState(): Promise<AuthState> {
  try {
    const supabase = await createClient()
    // SECURITY: Use getUser() NOT getSession()
    // getSession() reads from cookies (can be tampered)
    // getUser() validates with Supabase Auth server (secure)
    const { data: { user }, error } = await supabase.auth.getUser()

    // No user or auth error → unauthenticated
    if (error || !user) {
      return { type: 'unauthenticated' }
    }

    const userId = user.id
    const email = user.email || ''

    // Fetch profile from profiles table (SOURCE OF TRUTH)
    const profile = await fetchProfile(userId)

    if (!profile) {
      // User exists in auth but no profile → edge case
      return { type: 'authenticated_no_profile', userId, email }
    }

    // CRITICAL: Admin is determined by profiles.role === 'admin'
    // DO NOT check admin_users table
    if (profile.role === 'admin') {
      return { type: 'admin', profile }
    }

    // Map profile to exact state based on role + onboarding + approval
    if (profile.role === 'influencer') {
      if (!profile.onboarding_completed) {
        // Just signed up: onboarding_completed=false, approval_status='none'
        return { type: 'influencer_draft', profile }
      }
      if (profile.approval_status === 'pending') {
        // Onboarding submitted: onboarding_completed=true, approval_status='pending'
        return { type: 'influencer_pending', profile }
      }
      if (profile.approval_status === 'approved') {
        // Approved: onboarding_completed=true, approval_status='approved'
        return { type: 'influencer_approved', profile }
      }
      // rejected or none → show pending screen (blocked)
      return { type: 'influencer_pending', profile }
    }

    if (profile.role === 'brand') {
      if (!profile.onboarding_completed) {
        // Signed up: onboarding_completed=false
        return { type: 'brand_draft', profile }
      }
      // Onboarding done: onboarding_completed=true, approval_status='approved'
      return { type: 'brand_active', profile }
    }

    // Unknown role → treat as unauthenticated
    return { type: 'unauthenticated' }
  } catch (error) {
    console.error('Error getting auth state:', error)
    return { type: 'unauthenticated' }
  }
}

/**
 * Get redirect path based on auth state
 * Returns null if user should stay on current route
 */
export function getRedirectPath(state: AuthState, currentPath: string): string | null {
  switch (state.type) {
    case 'unauthenticated':
      // Can access: /login, /register, public pages
      const publicPaths = ['/login', '/register', '/', '/marketplace', '/help', '/contact', '/about', '/privacy', '/terms']
      if (publicPaths.includes(currentPath) || currentPath.startsWith('/marketplace/')) {
        return null
      }
      return '/login'

    case 'authenticated_no_profile':
      return '/complete-profile'

    case 'influencer_draft':
      // FORCED to onboarding
      if (currentPath === '/onboarding/influencer') {
        return null
      }
      return '/onboarding/influencer'

    case 'influencer_pending':
      // FORCED to pending page
      if (currentPath === '/influencer/pending') {
        return null
      }
      // Allow marketplace (read-only)
      if (currentPath.startsWith('/marketplace')) {
        return null
      }
      return '/influencer/pending'

    case 'influencer_approved':
      // Full access - no redirect
      return null

    case 'brand_draft':
      // FORCED to onboarding
      if (currentPath === '/onboarding/brand') {
        return null
      }
      return '/onboarding/brand'

    case 'brand_active':
      // Full access - no redirect
      return null

    case 'admin':
      // Admin can only access /admin routes
      if (currentPath.startsWith('/admin')) {
        return null
      }
      return '/admin'
  }
}

/**
 * Check if user can access a route
 */
export function canAccessRoute(state: AuthState, route: string): boolean {
  const redirectPath = getRedirectPath(state, route)
  return redirectPath === null
}
