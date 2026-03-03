/**
 * AUTHORITATIVE ROUTING RULES
 * 
 * This enforces routing based on auth state.
 * Used in layouts and route handlers.
 * 
 * NOTE: These are DEPRECATED. Route-level authorization should be done
 * directly in layouts using getIdentity().
 */

import { redirect } from 'next/navigation'
import { getIdentity, type AuthResult } from './auth-state'

/**
 * @deprecated Use getIdentity() directly in layouts
 * Enforce routing rules for a route
 */
export async function enforceRouting(currentPath: string): Promise<void> {
  const auth = await getIdentity()

  if (!auth.authenticated) {
    redirect('/login')
  }

  // Route-level authorization should be in the layout, not here
}

/**
 * @deprecated Use getIdentity() directly
 * Require authentication - returns auth result or redirects to login
 */
export async function requireAuth(): Promise<AuthResult & { authenticated: true }> {
  const auth = await getIdentity()
  if (!auth.authenticated) {
    redirect('/login')
  }
  return auth as AuthResult & { authenticated: true }
}
