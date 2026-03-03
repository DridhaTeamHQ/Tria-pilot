import { createClient } from '@/lib/auth'
import MarketplaceClient from '@/components/marketplace/MarketplaceClient'

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

  const supabase = await createClient()

  // Build products query — only fetch lightweight columns.
  // IMPORTANT: Do NOT fetch `images` here. That column contains base64 data
  // (multi-MB per product) and is only needed on the product detail page.
  // `cover_image` is kept because most products store a short Supabase URL there.
  let query = supabase
    .from('products')
    .select(`
      id,
      name,
      description,
      category,
      price,
      cover_image,
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
    query = query.eq('category', resolvedSearchParams.category)
  }

  if (resolvedSearchParams.search) {
    const search = resolvedSearchParams.search
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
  }

  // Just fetch products — NO auth check needed here.
  // /marketplace is already in PUBLIC_PREFIXES (middleware.ts line 40)
  const { data: products, error: productsError } = await query

  if (productsError) {
    console.error('Marketplace fetch error:', productsError)
  }

  const categories = ['All Products', 'Clothing', 'Accessories', 'Footwear', 'Beauty', 'Lifestyle']
  const activeCategory = resolvedSearchParams.category || 'all'

  // Transform to match Client Component interface
  const transformedProducts: ClientProduct[] = (products || []).map((p: any) => {
    const brandData = p.brand?.brand_data as Record<string, any> || {}
    const companyName = brandData.companyName || 'Unknown Brand'

    // Use cover_image directly — it's usually a Supabase storage URL.
    // Use cover_image directly — it's usually a Supabase storage URL.
    // Allow base64 images even if they are large, as a fallback for failed storage uploads.
    // We check for very large payloads (>5MB) to avoid complete page failure, but standard gens are ~1-3MB.
    let mainImage = p.cover_image || ''
    if (mainImage.startsWith('data:') && mainImage.length > 5 * 1024 * 1024) {
      // If > 5MB, it might be too heavy for initial load, but better than nothing?
      // For now, let's allow it but warn.
      console.warn(`[Marketplace] Large base64 image encountered for product ${p.id}`)
    }

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      price: Number(p.price || 0),
      imagePath: mainImage,
      brand: {
        id: p.brand?.id || 'unknown',
        companyName: companyName,
        user: {
          name: companyName,
          slug: null
        }
      },
      // Don't pass images on listing — they're only needed on detail page
      images: []
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
