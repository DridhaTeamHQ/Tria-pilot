import { createClient, createServiceClient } from '@/lib/auth'
import MarketplaceClient from '@/components/marketplace/MarketplaceClient'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// Define types that match MarketplaceClient expectations
interface ProductImage {
  id: string
  imagePath: string
}

interface ClientProduct {
  id: string
  name: string
  description: string | null
  category: string | null
  price: number
  imagePath: string
  brand: {
    id: string
    companyName: string | null
    user: {
      name: string | null
      slug: string | null
    } | null
  }
  images: ProductImage[]
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; search?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const cookieStore = await cookies()
  const hasAuthCookie = cookieStore
    .getAll()
    .some(cookie => cookie.name.startsWith('sb-') || cookie.name.includes('auth-token'))

  if (hasAuthCookie) {
    try {
      const sessionClient = await createClient()
      const { data: { user } } = await sessionClient.auth.getUser()
      if (user?.id) {
        const { data: profile } = await sessionClient
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        if (String(profile?.role || '').toLowerCase() === 'brand') {
          redirect('/brand/campaigns')
        }
      }
    } catch (authCheckError) {
      console.warn('Marketplace role redirect check failed:', authCheckError)
    }
  }

  // Use service client for public marketplace listing to avoid cookie/session overhead on every request.
  let supabase: any
  try {
    supabase = createServiceClient()
  } catch {
    // Fallback for environments where service role key is not configured.
    supabase = await createClient()
  }

  // Build products query - only fetch lightweight columns.
  // IMPORTANT: Do NOT fetch image columns here. Some rows contain inline
  // base64 data, which can make public listings multi-MB and timeout-prone.
  let query = supabase
    .from('products')
    .select(`
      id,
      name,
      description,
      category,
      price,
      cover_image,
      tryon_image,
      brand_id,
      brand:brand_id (
        id,
        brand_data
      )
    `)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(50)

  if (resolvedSearchParams.category && resolvedSearchParams.category !== 'all') {
    query = query.ilike('category', resolvedSearchParams.category)
  }

  if (resolvedSearchParams.search) {
    const search = resolvedSearchParams.search
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
  }

  // Just fetch products - NO auth check needed here.
  // /marketplace is already in PUBLIC_PREFIXES (middleware.ts line 40)
  const { data: products, error: productsError } = await query

  if (productsError) {
    console.error('Marketplace fetch error:', productsError)
  }

  const categories = ['All Products', 'Clothing', 'Accessories', 'Footwear', 'Beauty', 'Lifestyle']
  const activeCategory = resolvedSearchParams.category || 'all'

  const pickListingImage = (product: { cover_image?: unknown; tryon_image?: unknown }) => {
    const candidates = [product.cover_image, product.tryon_image]

    for (const candidate of candidates) {
      if (typeof candidate !== 'string') continue
      const trimmed = candidate.trim()
      if (!trimmed) continue

      // Keep listing payloads light: avoid very large inline base64 blobs.
      if (trimmed.startsWith('data:') && trimmed.length > 300 * 1024) continue

      return trimmed
    }

    return ''
  }

  // Transform to match Client Component interface
  const transformedProducts: ClientProduct[] = (products || []).map((p: any) => {
    const brandData = p.brand?.brand_data as Record<string, any> || {}
    const companyName = brandData.companyName || 'Unknown Brand'
    const imagePath = pickListingImage(p)

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      price: Number(p.price || 0),
      imagePath,
      brand: {
        id: p.brand?.id || 'unknown',
        companyName: companyName,
        user: {
          name: companyName,
          slug: null
        }
      },
      images: imagePath ? [{ id: `${p.id}-cover`, imagePath }] : []
    }
  })

  return (
    <MarketplaceClient
      products={transformedProducts}
      categories={categories}
      activeCategory={activeCategory}
    />
  )
}
