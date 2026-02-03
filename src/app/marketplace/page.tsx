import { createClient } from '@/lib/auth'
import { getIdentity } from '@/lib/auth-state'
import { redirect } from 'next/navigation'
// import { unstable_cache } from 'next/cache' // Supabase has its own caching or we can use fetch cache
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

  // Use getIdentity for auth and role check
  const auth = await getIdentity()

  if (!auth.authenticated) {
    redirect('/login')
  }

  const { identity } = auth

  // Only influencers (pending or approved) can browse
  if (identity.role !== 'influencer') {
    // Redirect brands or others back to home or dashboard
    redirect('/')
  }

  // Build query using regular client - RLS allows reading active products
  const supabase = await createClient()
  let query = supabase
    .from('products')
    .select(`
      id,
      name,
      description,
      category,
      price,
      cover_image,
      images,
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
    // Simple search on name/description using ilike
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
  }

  const { data: products, error } = await query

  if (error) {
    console.error('Marketplace fetch error:', error)
    // Return empty list or error state
  }

  const categories = ['All Products', 'Clothing', 'Accessories', 'Footwear', 'Beauty', 'Lifestyle']
  const activeCategory = resolvedSearchParams.category || 'all'

  // Transform to match Client Component interface
  const transformedProducts: ClientProduct[] = (products || []).map((p: any) => {
    // Extract company name from brand_data jsonb or fallback to full_name
    const brandData = p.brand?.brand_data as Record<string, any> || {}
    const companyName = brandData.companyName || 'Unknown Brand'

    // Convert text[] images to object array
    const productImages: ProductImage[] = (p.images || []).map((url: string, index: number) => ({
      id: `${p.id}-img-${index}`,
      imagePath: url
    }))

    // Ensure cover image is in the list or use first image
    // If cover_image exists, use it as main imagePath
    const mainImage = p.cover_image || (productImages.length > 0 ? productImages[0].imagePath : '')

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
          slug: null // Slugs logic removed or not available in simple profile
        }
      },
      images: productImages
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
