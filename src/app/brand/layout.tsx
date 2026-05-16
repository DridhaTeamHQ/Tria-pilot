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

  // Fetch brand_data for navbar (uses standard client, NOT service client)
  let brandName = 'Brand'
  let avatarUrl: string | null = null
  try {
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('brand_data, avatar_url')
      .eq('id', identity.id)
      .single()

    if (profile?.brand_data) {
      brandName = (profile.brand_data as { companyName?: string })?.companyName || 'Brand'
    }
    avatarUrl = profile?.avatar_url || null
  } catch {
    // Fallback to default name
  }

  return (
    <div data-brand-layout className="relative h-dvh overflow-hidden bg-[#F9F8F4]">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-[#FF9B8F]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[35%] h-[35%] bg-[#B4F056]/15 rounded-full blur-[100px]" />
        <div className="absolute top-[20%] left-[-10%] w-[30%] h-[30%] bg-[#7DD3FC]/10 rounded-full blur-[110px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:32px_32px] opacity-30" />
      </div>

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <BrandNavbar brandName={brandName} avatarUrl={avatarUrl} />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
