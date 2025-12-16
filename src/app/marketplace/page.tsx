import { createClient } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingBag, Search, Filter } from 'lucide-react'

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

  const where: any = {}
  if (resolvedSearchParams.category && resolvedSearchParams.category !== 'all') {
    where.category = resolvedSearchParams.category
  }
  if (resolvedSearchParams.search) {
    where.OR = [
      { name: { contains: resolvedSearchParams.search, mode: 'insensitive' } },
      { description: { contains: resolvedSearchParams.search, mode: 'insensitive' } },
    ]
  }

  // Optimized query - use select instead of include, limit results
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
        imagePath: true, // Keep for backward compatibility
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
        where: {
          isCoverImage: true,
        },
        take: 1,
        select: {
          id: true,
          imagePath: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 50, // Limit to 50 products initially - add pagination later
  })

  const categories = ['All Products', 'Clothing', 'Accessories', 'Footwear', 'Beauty', 'Lifestyle']
  const activeCategory = resolvedSearchParams.category || 'all'

  return (
    <div className="min-h-screen bg-cream pt-24">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-serif text-charcoal mb-2">
            Discover <span className="italic">Products</span>
          </h1>
          <p className="text-charcoal/60">
            Find perfect collaboration opportunities tailored to your niche
          </p>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 text-sm text-charcoal/60">
            <Filter className="w-4 h-4" />
            <span>Filter by Category</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const categoryValue = category === 'All Products' ? 'all' : category.toLowerCase()
              const isActive = activeCategory === categoryValue
              return (
                <Link
                  key={category}
                  href={`/marketplace?category=${categoryValue}`}
                  className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${isActive
                    ? 'bg-charcoal text-cream'
                    : 'bg-white border border-subtle text-charcoal/70 hover:border-charcoal/30 hover:text-charcoal'
                    }`}
                >
                  {category}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Product Count */}
        <p className="text-sm text-charcoal/60 mb-6">
          {products.length} {products.length === 1 ? 'product' : 'products'} found
        </p>

        {/* Product Grid */}
        {products.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-subtle p-16 text-center">
            <ShoppingBag className="w-16 h-16 text-charcoal/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-charcoal mb-2">No products found</h3>
            <p className="text-charcoal/60">Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const coverImage = product.images[0]?.imagePath || product.imagePath || null
              return (
                <Link key={product.id} href={`/marketplace/${product.id}`}>
                  <div className="group bg-white rounded-2xl border border-subtle overflow-hidden hover:shadow-lg hover:border-charcoal/20 transition-all">
                    {/* Image */}
                    <div className="aspect-[4/5] bg-cream overflow-hidden relative">
                      {coverImage ? (
                        <Image
                          src={coverImage}
                          alt={product.name}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-12 h-12 text-charcoal/20" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <h3 className="font-semibold text-charcoal line-clamp-2 mb-1 group-hover:text-charcoal/80 transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-sm text-charcoal/60 line-clamp-2 mb-4">
                        {product.description || 'No description'}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs px-3 py-1 bg-cream rounded-full text-charcoal/70">
                          {product.category || 'Uncategorized'}
                        </span>
                        <span className="text-sm text-charcoal/50">
                          by {product.brand.user?.name || 'Brand'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
