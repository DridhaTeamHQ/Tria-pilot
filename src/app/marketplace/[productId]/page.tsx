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
          <div className="bg-white rounded-xl border-[3px] border-black overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
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

            {/* Title & Price Box */}
            <div className="bg-white border-[3px] border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-8 relative">
              <div className="absolute -top-3 -left-3 bg-[#FFD93D] px-4 py-1 border-[3px] border-black text-xs font-bold uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                {product.brand.user?.name || 'Brand'}
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-charcoal mb-4 uppercase leading-[0.9] mt-2">{product.name}</h1>
              {product.price && (
                <div className="inline-block bg-black text-white px-4 py-2 text-2xl font-bold font-mono">
                  ₹{Number(product.price).toLocaleString()}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <Link
                href={`/influencer/try-on?productId=${product.id}`}
                className="w-full py-4 bg-[#FFD93D] text-black font-bold text-lg border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                <Camera className="w-6 h-6" />
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
                    className="flex-1 min-w-[140px] py-3 bg-white border-[3px] border-black text-charcoal font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-sm uppercase tracking-wider"
                  >
                    <ExternalLink className="w-4 h-4 flex-shrink-0" />
                    <span className="hidden sm:inline">View Original</span>
                    <span className="sm:hidden">Product</span>
                  </a>
                )}
                <FavoriteButton productId={product.id} />
                <button className="py-3 px-4 sm:px-6 bg-white border-[3px] border-black text-charcoal font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all uppercase tracking-wider">
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Share</span>
                </button>
              </div>
            </div>

            {/* Description & Details Box */}
            <div className="mt-12 border-[3px] border-black p-8 bg-white relative">
              <div className="absolute -top-4 left-8 bg-white px-4 border-[3px] border-black text-sm font-bold uppercase tracking-widest">
                Specification
              </div>

              <h2 className="text-xl font-black uppercase mb-4 text-charcoal">About the Product</h2>
              <p className="text-charcoal/80 leading-relaxed text-lg font-medium">
                {product.description || 'No description available.'}
              </p>

              {/* Tags */}
              {product.tags && (
                <div className="mt-8 pt-8 border-t-[3px] border-black/10">
                  <h2 className="text-sm font-bold uppercase mb-4 text-charcoal/50 tracking-wider">Tags</h2>
                  <div className="flex flex-wrap gap-2">
                    {product.tags.split(',').map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-1 text-xs font-bold bg-white border-[2px] border-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-default"
                      >
                        #{tag.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Target Audience & Category */}
              <div className="grid grid-cols-2 gap-6 mt-8 pt-8 border-t-[3px] border-black/10">
                {product.audience && (
                  <div>
                    <p className="text-xs font-bold text-charcoal/40 uppercase mb-2 tracking-widest">Target Audience</p>
                    <p className="text-charcoal font-bold text-lg">{product.audience}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-charcoal/40 uppercase mb-2 tracking-widest">Category</p>
                  <p className="text-charcoal font-bold text-lg">{product.category || 'Uncategorized'}</p>
                </div>
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
