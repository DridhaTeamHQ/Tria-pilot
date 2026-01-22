/**
 * AUTHORITATIVE ROUTING RULES
 * 
 * This enforces routing based on auth state.
 * Used in middleware, layouts, and route handlers.
 */

import { redirect } from 'next/navigation'
import { getAuthState, getRedirectPath, type AuthState } from './auth-state'

/**
 * Enforce routing rules for a route
 * 
 * Call this in server components, layouts, and API routes.
 */
export async function enforceRouting(currentPath: string): Promise<void> {
  const state = await getAuthState()
  const redirectPath = getRedirectPath(state, currentPath)

  if (redirectPath) {
    redirect(redirectPath)
  }
}

/**
 * Require authentication
 * Returns auth state or redirects to login
 */
export async function requireAuth() {
  const state = await getAuthState()
  if (state.type === 'unauthenticated') {
    redirect('/login')
  }
  return state
}

/**
 * Require specific state
 */
export async function requireState(
  requiredType: AuthState['type'],
  redirectTo?: string
): Promise<AuthState> {
  const state = await getAuthState()
  if (state.type !== requiredType) {
    redirect(redirectTo || '/login')
  }
  return state
}
