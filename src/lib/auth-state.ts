/**
 * SINGLE SOURCE AUTH STATE SYSTEM
 * 
 * This is the ONLY place where auth state is determined.
 * All components and routes use this system.
 * 
 * Database Truth (Supabase):
 * - auth.users (session)
 * - profiles table: id, email, role, onboarding_completed, approval_status
 */

import { createClient, createServiceClient } from '@/lib/auth'

export type UserRole = 'influencer' | 'brand' | 'admin'
export type ApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected'

export interface Profile {
  id: string
  email: string
  role: UserRole
  onboarding_completed: boolean
  approval_status: ApprovalStatus
}

/**
 * STRICT STATE MACHINE (NO NULLS, NO DEFAULTS)
 * 
 * These are the ONLY valid states:
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
    const approval_status: ApprovalStatus = (data.approval_status as ApprovalStatus) || 'draft'
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
 */
export async function getAuthState(): Promise<AuthState> {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    // No session → unauthenticated
    if (!session?.user) {
      return { type: 'unauthenticated' }
    }

    const userId = session.user.id
    const email = session.user.email || ''

    // Check if admin (admin_users table)
    const { data: adminRow } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (adminRow) {
      // Admin user - fetch profile
      const profile = await fetchProfile(userId)
      if (profile && profile.role === 'admin') {
        return { type: 'admin', profile }
      }
      // Admin might not have profile yet - create minimal profile
      return {
        type: 'admin',
        profile: {
          id: userId,
          email,
          role: 'admin',
          onboarding_completed: true,
          approval_status: 'approved',
        },
      }
    }

    // Fetch profile
    const profile = await fetchProfile(userId)

    if (!profile) {
      // User exists in auth but no profile → edge case
      return { type: 'authenticated_no_profile', userId, email }
    }

    // Map profile to exact state based on role + onboarding + approval
    if (profile.role === 'influencer') {
      if (!profile.onboarding_completed) {
        return { type: 'influencer_draft', profile }
      }
      if (profile.approval_status === 'pending') {
        return { type: 'influencer_pending', profile }
      }
      if (profile.approval_status === 'approved') {
        return { type: 'influencer_approved', profile }
      }
      // draft or rejected → show pending screen
      return { type: 'influencer_pending', profile }
    }

    if (profile.role === 'brand') {
      if (!profile.onboarding_completed) {
        return { type: 'brand_draft', profile }
      }
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
