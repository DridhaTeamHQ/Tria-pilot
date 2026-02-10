import { createClient } from '@/lib/auth'
import { redirect } from 'next/navigation'
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

  // Create Supabase client ONCE and run auth + data fetch in PARALLEL
  const supabase = await createClient()

  // Build products query
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
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
  }

  // PARALLEL: Fetch auth AND products at the same time
  // This is the key optimization — previously these were sequential
  const [authResult, productsResult] = await Promise.all([
    supabase.auth.getUser(),
    query,
  ])

  const { data: { user }, error: authError } = authResult
  const { data: products, error: productsError } = productsResult

  // Auth check — redirect if not logged in
  if (authError || !user) {
    redirect('/login')
  }

  // Quick role check — only need to read profile for role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'influencer') {
    redirect('/')
  }

  if (productsError) {
    console.error('Marketplace fetch error:', productsError)
  }

  const categories = ['All Products', 'Clothing', 'Accessories', 'Footwear', 'Beauty', 'Lifestyle']
  const activeCategory = resolvedSearchParams.category || 'all'

  // Transform to match Client Component interface
  const transformedProducts: ClientProduct[] = (products || []).map((p: any) => {
    const brandData = p.brand?.brand_data as Record<string, any> || {}
    const companyName = brandData.companyName || 'Unknown Brand'

    const productImages: ProductImage[] = (p.images || []).map((url: string, index: number) => ({
      id: `${p.id}-img-${index}`,
      imagePath: url
    }))

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
          slug: null
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
