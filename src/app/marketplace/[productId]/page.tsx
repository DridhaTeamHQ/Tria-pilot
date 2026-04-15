import { createServiceClient } from '@/lib/auth'
import { getIdentity } from '@/lib/auth-state'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Camera, ExternalLink, ArrowLeft } from 'lucide-react'
import ImageCarousel from '@/components/product/ImageCarousel'
import ProductRecommendations from '@/components/product/ProductRecommendations'
import RequestCollaborationButton from '@/components/collaborations/RequestCollaborationButton'
import FavoriteButton from '@/components/product/FavoriteButton'
import ProductShareButton from '@/components/product/ProductShareButton'

export default async function ProductDetailPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params

  const authPromise = getIdentity()

  let service: ReturnType<typeof createServiceClient> | null = null
  try {
    service = createServiceClient()
  } catch {
    service = null
  }

  if (!service) {
    notFound()
  }

  const productPromise = service
    .from('products')
    .select(`
      id,
      name,
      description,
      category,
      price,
      link,
      audience,
      tags,
      cover_image,
      tryon_image,
      brand_id,
      brand:brand_id (
        id,
        full_name,
        brand_data
      )
    `)
    .eq('id', productId)
    .single()

  const [auth, productRes] = await Promise.all([authPromise, productPromise])

  if (!auth.authenticated) {
    redirect('/login')
  }

  if (!auth.identity) {
    redirect('/complete-profile')
  }

  if (auth.identity.role !== 'influencer') {
    redirect('/')
  }

  const { data: product, error } = productRes

  if (error || !product) {
    console.error('Database error fetching product:', error)
    notFound()
  }

  const images = Array.from(new Set([product.cover_image, product.tryon_image].filter((img): img is string => {
    if (typeof img !== 'string' || !img) return false
    if (!img.startsWith('data:')) return true
    return img.length <= 300 * 1024
  })))

  const brandFn = product.brand
  const brandObj = Array.isArray(brandFn) ? brandFn[0] : brandFn
  const brandData = (brandObj?.brand_data || {}) as Record<string, any>
  const brandName = brandData.companyName || brandObj?.full_name || 'Brand'

  const tagsArray = Array.isArray(product.tags) ? product.tags : []

  return (
    <div className="min-h-screen bg-cream pt-20 sm:pt-24">
      <div className="container mx-auto px-4 py-5 sm:px-6 sm:py-8">
        <Link
          href="/marketplace"
          className="mb-5 inline-flex items-center gap-2 text-sm text-charcoal/60 transition-colors hover:text-charcoal sm:mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Marketplace
        </Link>

        <div className="mb-12 grid gap-6 lg:grid-cols-2 lg:gap-10 xl:gap-12 sm:mb-16">
          <div className="overflow-hidden rounded-2xl border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:rounded-xl sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <ImageCarousel images={images} />
          </div>

          <div className="space-y-5 sm:space-y-6">
            <div>
              <span className="mb-3 inline-block rounded-full bg-peach/20 px-3 py-1 text-[11px] font-semibold text-orange-700 sm:text-xs">
                {product.category?.toUpperCase() || 'CLOTHING'}
              </span>
              <p className="mb-1 text-sm text-charcoal/60">
                by {brandName}
              </p>
            </div>

            <div className="relative border-[3px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:mb-8 sm:p-8 sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className="mb-3 inline-block border-[3px] border-black bg-[#FFD93D] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:absolute sm:-left-3 sm:-top-3 sm:mb-0 sm:px-4 sm:text-xs">
                {brandName}
              </div>
              <h1 className="mt-1 text-[clamp(2rem,9vw,4.5rem)] font-black uppercase leading-[0.9] text-charcoal sm:mt-2">
                {product.name}
              </h1>
              {product.price && (
                <div className="mt-4 inline-block bg-black px-4 py-2 text-xl font-bold text-white sm:text-2xl">
                  Rs. {Number(product.price).toLocaleString()}
                </div>
              )}
            </div>

            <div className="space-y-3 pt-1 sm:pt-4">
              <Link
                href={`/influencer/try-on?productId=${product.id}`}
                className="flex min-h-[56px] w-full items-center justify-center gap-2 border-[3px] border-black bg-[#FFD93D] px-4 py-3 text-center text-base font-bold text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none sm:min-h-[60px] sm:py-3.5 sm:text-lg"
              >
                <Camera className="w-5 h-5" />
                Try-On in Studio
              </Link>

              <RequestCollaborationButton
                productId={product.id}
                productName={product.name}
                brandName={brandName}
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {product.link && (
                  <a
                    href={product.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-[56px] w-full items-center justify-center gap-2 border-[3px] border-black bg-white px-3 py-3 text-center text-sm font-bold uppercase tracking-wider text-charcoal shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none sm:min-h-[60px] sm:py-2.5"
                  >
                    <ExternalLink className="w-4 h-4 flex-shrink-0" />
                    <span>View Original</span>
                  </a>
                )}
                <FavoriteButton productId={product.id} />
                <ProductShareButton productName={product.name} />
              </div>
            </div>

            <div className="relative mt-8 border-[3px] border-black bg-white p-4 sm:mt-12 sm:p-8">
              <div className="mb-4 inline-block border-[3px] border-black bg-white px-4 text-xs font-bold uppercase tracking-[0.18em] sm:absolute sm:-top-4 sm:left-8 sm:mb-0 sm:text-sm">
                Specification
              </div>

              <h2 className="mb-4 text-lg font-black uppercase text-charcoal sm:text-xl">About the Product</h2>
              <p className="text-base font-medium leading-relaxed text-charcoal/80 sm:text-lg">
                {product.description || 'No description available.'}
              </p>

              {tagsArray.length > 0 && (
                <div className="mt-6 border-t-[3px] border-black/10 pt-6 sm:mt-8 sm:pt-8">
                  <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-charcoal/50 sm:text-sm">Tags</h2>
                  <div className="flex flex-wrap gap-2">
                    {tagsArray.map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="cursor-default border-[2px] border-black bg-white px-3 py-1 text-[11px] font-bold text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none sm:text-xs"
                      >
                        #{tag.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 grid grid-cols-1 gap-5 border-t-[3px] border-black/10 pt-6 sm:mt-8 sm:grid-cols-2 sm:gap-6 sm:pt-8">
                {product.audience && (
                  <div>
                    <p className="text-xs font-bold text-charcoal/40 uppercase mb-2 tracking-widest">Target Audience</p>
                    <p className="text-base font-bold text-charcoal sm:text-lg">{product.audience}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-charcoal/40 uppercase mb-2 tracking-widest">Category</p>
                  <p className="text-base font-bold text-charcoal sm:text-lg">{product.category || 'Uncategorized'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ProductRecommendations productId={product.id} />
      </div>
    </div>
  )
}
