/**
 * BRAND LAYOUT GUARD
 * 
 * Route-level authorization for /brand/* routes.
 * Uses getIdentity() which reads from profiles (SOURCE OF TRUTH).
 * 
 * Authorization Rules:
 * - Must be authenticated
 * - Must have role = 'brand'
 * - Must have completed onboarding
 */
import { getIdentity } from '@/lib/auth-state'
import { redirect } from 'next/navigation'
import BrandNavbar from '@/components/brand/BrandNavbar'
import BrandScrollReset from '@/components/brand/BrandScrollReset'
import { createClient } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function BrandLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const auth = await getIdentity()

  // Must be authenticated
  if (!auth.authenticated) {
    redirect('/login?from=brand')
  }

  if (!auth.identity) {
    redirect('/dashboard')
  }

  const { identity } = auth

  // Must be brand
  if (identity.role !== 'brand') {
    redirect('/dashboard')
  }

  // Must complete onboarding
  if (!identity.onboarding_completed) {
    redirect('/onboarding/brand')
  }

  return (
    <div data-brand-layout className="no-scrollbar">
      <BrandScrollReset />
      <main data-brand-main className="pt-20">
        {children}
      </main>
    </div>
  )
}
