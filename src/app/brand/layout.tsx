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
 * 
 * NOTE: Brands do NOT require admin approval (auto-approved on signup).
 */
import { getIdentity } from '@/lib/auth-state'
import { redirect } from 'next/navigation'
import BrandNavbar from '@/components/brand/BrandNavbar'
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

  const { identity } = auth

  // Must be brand
  if (identity.role !== 'brand') {
    redirect('/dashboard')
  }

  // Must complete onboarding
  if (!identity.onboarding_completed) {
    redirect('/onboarding/brand')
  }

  // Fetch brand_data for navbar (uses standard client, NOT service client)
  let brandName = 'Brand'
  try {
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('brand_data')
      .eq('id', identity.id)
      .single()

    if (profile?.brand_data) {
      brandName = (profile.brand_data as { companyName?: string })?.companyName || 'Brand'
    }
  } catch {
    // Fallback to default name
  }

  return (
    <div className="min-h-screen bg-[#FDF6EC]">
      <BrandNavbar brandName={brandName} />
      <main className="pt-20 md:pt-16">
        {children}
      </main>
    </div>
  )
}
