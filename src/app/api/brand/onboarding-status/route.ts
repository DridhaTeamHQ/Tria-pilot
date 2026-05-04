/**
 * GET /api/brand/onboarding-status
 *
 * Computes the brand's activation checklist state in one call. Used by the
 * dashboard onboarding card. Each item is computed lazily — checking only
 * what's needed via cheap COUNT queries.
 *
 * Items:
 *   1. profileComplete — brand_data has companyName + vertical
 *   2. productsAdded — at least 3 products
 *   3. creatorsDiscovered — has shortlisted any creator (signaled via UI; we
 *      approximate with: has at least 1 sent collab_request OR opened a chat)
 *   4. firstCampaign — has at least 1 campaign created
 *   5. trackingSet — has at least 1 tracked_link OR campaign metadata
 *      indicates conversions enabled (proxy)
 */

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name, brand_data')
      .eq('id', authUser.id)
      .maybeSingle()

    if ((profile?.role || '').toLowerCase() !== 'brand') {
      return NextResponse.json({ error: 'Forbidden — brand only' }, { status: 403 })
    }

    const service = createServiceClient()

    const brandData = (profile?.brand_data as Record<string, unknown>) || {}
    const companyName = typeof brandData.companyName === 'string' ? brandData.companyName.trim() : ''
    const vertical = typeof brandData.vertical === 'string' ? brandData.vertical.trim() : ''
    const targetAudience =
      typeof brandData.targetAudience === 'string' ? brandData.targetAudience.trim() : ''

    const profileComplete = Boolean(companyName && (vertical || targetAudience))

    const [productsRes, collabsRes, campaignsRes, linksRes] = await Promise.all([
      service.from('products').select('id', { count: 'exact', head: true }).eq('brand_id', authUser.id),
      service
        .from('collaboration_requests')
        .select('id', { count: 'exact', head: true })
        .eq('brand_id', authUser.id),
      service.from('campaigns').select('id', { count: 'exact', head: true }).eq('brand_id', authUser.id),
      service
        .from('tracked_links')
        .select('id, products!inner(brand_id)', { count: 'exact', head: true })
        .eq('products.brand_id', authUser.id),
    ])

    const productsCount = productsRes.count || 0
    const collabsCount = collabsRes.count || 0
    const campaignsCount = campaignsRes.count || 0
    const linksCount = linksRes.count || 0

    const items = [
      {
        id: 'profile',
        label: 'Complete your brand profile',
        description: 'Add company name, vertical, and target audience',
        done: profileComplete,
        cta: { label: 'Complete profile', href: '/brand/profile' },
      },
      {
        id: 'products',
        label: 'Add your first 3 products',
        description: `${productsCount}/3 products added`,
        done: productsCount >= 3,
        cta: { label: 'Add products', href: '/brand/products' },
      },
      {
        id: 'creators',
        label: 'Reach out to creators that fit your brand',
        description:
          collabsCount > 0 ? `${collabsCount} invitation${collabsCount === 1 ? '' : 's'} sent` : 'Find creators in your niche',
        done: collabsCount >= 1,
        cta: { label: 'Discover creators', href: '/brand/influencers' },
      },
      {
        id: 'campaign',
        label: 'Run your first campaign',
        description:
          campaignsCount > 0 ? `${campaignsCount} campaign${campaignsCount === 1 ? '' : 's'} created` : 'Build a campaign with the AI strategist',
        done: campaignsCount >= 1,
        cta: { label: 'Create campaign', href: '/brand/campaigns/new' },
      },
      {
        id: 'tracking',
        label: 'Set up tracking links',
        description:
          linksCount > 0 ? `${linksCount} tracked link${linksCount === 1 ? '' : 's'} live` : 'Track clicks + conversions per creator',
        done: linksCount >= 1,
        cta: { label: 'Open analytics', href: '/brand/dashboard' },
      },
    ]

    const completed = items.filter((i) => i.done).length
    const total = items.length
    const percent = Math.round((completed / total) * 100)

    return NextResponse.json({
      items,
      completed,
      total,
      percent,
      isFullyOnboarded: completed === total,
    })
  } catch (error) {
    console.error('[onboarding-status] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
