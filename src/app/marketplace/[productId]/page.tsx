import { createClient } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Camera, ExternalLink, Share2, ArrowLeft, Heart, Users } from 'lucide-react'
import ImageCarousel from '@/components/product/ImageCarousel'
import ProductRecommendations from '@/components/product/ProductRecommendations'
import RequestCollaborationButton from '@/components/collaborations/RequestCollaborationButton'
import FavoriteButton from '@/components/product/FavoriteButton'

export const dynamic = 'force-dynamic'

export default async function ProductDetailPage({ params }: any) {
  const { productId } = await params
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  // Optimized query - only select needed fields
  let dbUser
  try {
    dbUser = await prisma.user.findUnique({
      where: { email: authUser.email!.toLowerCase().trim() },
      select: {
        id: true,
        role: true,
      },
    })
  } catch (error) {
    console.error('Database error fetching user:', error)
    redirect('/login')
  }

  if (!dbUser || dbUser.role !== 'INFLUENCER') {
    redirect('/')
  }

  // Optimized query - use select instead of include
  let product
  try {
    product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        price: true,
        link: true,
        audience: true,
        tags: true,
        imagePath: true, // For backward compatibility
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
            order: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    })
  } catch (error) {
    console.error('Database error fetching product:', error)
    notFound()
  }

  if (!product) {
    notFound()
  }

  const productImages = product.images.length > 0
    ? product.images.map((img: { imagePath: string }) => img.imagePath)
    : product.imagePath
      ? [product.imagePath]
      : []

  return (
    <div className="min-h-screen bg-cream pt-24">
      <div className="container mx-auto px-6 py-8">
        {/* Back Link */}
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 text-sm text-charcoal/60 hover:text-charcoal mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Marketplace
        </Link>

        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          {/* Left: Image Carousel */}
          <div className="bg-white rounded-2xl border border-subtle overflow-hidden">
            <ImageCarousel images={productImages} />
          </div>

          {/* Right: Product Information */}
          <div className="space-y-6">
            {/* Category & Brand */}
            <div>
              <span className="inline-block px-3 py-1 text-xs font-semibold bg-peach/20 text-orange-700 rounded-full mb-3">
                {product.category?.toUpperCase() || 'CLOTHING'}
              </span>
              <p className="text-sm text-charcoal/60 mb-2">
                by {product.brand.user?.name || 'Brand'}
              </p>
            </div>

            {/* Title & Price */}
            <div>
              <h1 className="text-3xl font-serif text-charcoal mb-4">{product.name}</h1>
              {product.price && (
                <p className="text-2xl font-semibold text-charcoal">₹{Number(product.price).toLocaleString()}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <Link
                href={`/influencer/try-on?productId=${product.id}`}
                className="w-full py-4 bg-charcoal text-cream font-medium rounded-full flex items-center justify-center gap-2 hover:bg-charcoal/90 transition-colors"
              >
                <Camera className="w-5 h-5" />
                Try-On in Studio
              </Link>

              <RequestCollaborationButton
                productId={product.id}
                productName={product.name}
                brandName={product.brand.user?.name || 'Brand'}
              />

              <div className="flex flex-wrap gap-3">
                {product.link && (
                  <a
                    href={product.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[140px] py-3 border border-charcoal/20 text-charcoal rounded-full flex items-center justify-center gap-2 hover:bg-charcoal/5 transition-colors text-sm"
                  >
                    <ExternalLink className="w-4 h-4 flex-shrink-0" />
                    <span className="hidden sm:inline">View Original</span>
                    <span className="sm:hidden">Product</span>
                  </a>
                )}
                <FavoriteButton productId={product.id} />
                <button className="py-3 px-4 sm:px-6 border border-charcoal/20 text-charcoal rounded-full flex items-center gap-2 hover:bg-charcoal/5 transition-colors">
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Share</span>
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="pt-6 border-t border-subtle">
              <h2 className="text-lg font-semibold text-charcoal mb-3">Description</h2>
              <p className="text-charcoal/70 leading-relaxed">
                {product.description || 'No description available.'}
              </p>
            </div>

            {/* Tags */}
            {product.tags && (
              <div className="pt-4">
                <h2 className="text-sm font-semibold text-charcoal mb-3">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {product.tags.split(',').map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1 text-xs bg-cream rounded-full text-charcoal/70"
                    >
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Target Audience & Category */}
            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-subtle">
              {product.audience && (
                <div>
                  <p className="text-xs font-semibold text-charcoal/50 uppercase mb-1">Target Audience</p>
                  <p className="text-charcoal">{product.audience}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-charcoal/50 uppercase mb-1">Category</p>
                <p className="text-charcoal">{product.category || 'Uncategorized'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <ProductRecommendations productId={product.id} />
      </div>
    </div>
  )
}
