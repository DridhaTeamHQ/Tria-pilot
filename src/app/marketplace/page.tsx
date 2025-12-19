import { createClient } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { redirect } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import MarketplaceClient from '@/components/marketplace/MarketplaceClient'

// Cache products for 30 seconds to improve performance while staying fresh
const getProducts = unstable_cache(
  async (where: Prisma.ProductWhereInput) => {
    return prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        price: true,
        imagePath: true,
        brand: {
          select: {
            id: true,
            companyName: true,
            user: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
        },
        images: {
          select: {
            id: true,
            imagePath: true,
          },
          orderBy: {
            order: 'asc',
          },
          take: 4, // Limit images for carousel
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    })
  },
  ['marketplace-products'],
  { revalidate: 30, tags: ['products'] }
)

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; search?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  let dbUser
  try {
    dbUser = await prisma.user.findUnique({
      where: { email: authUser.email!.toLowerCase().trim() },
      select: { id: true, role: true },
    })
  } catch (error) {
    console.error('Database error fetching user:', error)
    redirect('/login')
  }

  if (!dbUser || dbUser.role !== 'INFLUENCER') {
    redirect('/')
  }

  // Build where clause
  const where: Prisma.ProductWhereInput = {}
  if (resolvedSearchParams.category && resolvedSearchParams.category !== 'all') {
    where.category = resolvedSearchParams.category
  }
  if (resolvedSearchParams.search) {
    where.OR = [
      { name: { contains: resolvedSearchParams.search, mode: 'insensitive' as const } },
      { description: { contains: resolvedSearchParams.search, mode: 'insensitive' as const } },
    ]
  }

  // Fetch cached products
  const products = await getProducts(where)

  const categories = ['All Products', 'Clothing', 'Accessories', 'Footwear', 'Beauty', 'Lifestyle']
  const activeCategory = resolvedSearchParams.category || 'all'

  // Transform products to ensure proper serialization for Client Components
  // Prisma Decimal must be converted to number for client-side rendering
  const transformedProducts = products.map(product => ({
    ...product,
    price: product.price ? Number(product.price) : 0, // Convert Decimal to number
    imagePath: product.imagePath || '',
  }))

  return (
    <MarketplaceClient
      products={transformedProducts}
      categories={categories}
      activeCategory={activeCategory}
    />
  )
}
