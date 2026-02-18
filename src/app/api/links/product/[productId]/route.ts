import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/links/product/[productId]
 * Returns product link data (masked URL, etc.) when available.
 * Stub: returns 200 with null link fields when no link exists yet (avoids 404 noise).
 * TODO: implement real link creation/fetch from DB when link tracking is ready.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId } = await params
    if (!productId) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    }

    // Optional: resolve product name for display
    let productName: string | null = null
    try {
      const service = createServiceClient()
      const { data: product } = await service
        .from('products')
        .select('name')
        .eq('id', productId)
        .single()
      productName = product?.name ?? null
    } catch {
      // non-fatal
    }

    return NextResponse.json({
      maskedUrl: null,
      linkCode: null,
      originalUrl: null,
      productId,
      productName,
    })
  } catch (error) {
    console.error('Product link error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product link' },
      { status: 500 }
    )
  }
}
