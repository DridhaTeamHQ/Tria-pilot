import { createClient } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { redirect } from 'next/navigation'
import MarketplaceClient from '@/components/marketplace/MarketplaceClient'

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

  // Fetch products with ALL images for carousel effect
  const products = await prisma.product.findMany({
    where,
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      price: true,
      link: true,
      audience: true,
      imagePath: true,
      createdAt: true,
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
        take: 5, // Limit to 5 images for carousel
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 50,
  })

  const categories = ['All Products', 'Clothing', 'Accessories', 'Footwear', 'Beauty', 'Lifestyle']
  const activeCategory = resolvedSearchParams.category || 'all'

  // Transform products to match client component expected type
  const transformedProducts = products.map(product => ({
    ...product,
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
