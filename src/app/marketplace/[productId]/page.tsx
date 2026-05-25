import { createServiceClient } from '@/lib/auth'
import { getIdentity } from '@/lib/auth-state'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Camera, ExternalLink, ShoppingBag, Users, Star } from 'lucide-react'
import ImageCarousel from '@/components/product/ImageCarousel'
import RequestCollaborationButton from '@/components/collaborations/RequestCollaborationButton'
import FavoriteButton from '@/components/product/FavoriteButton'
import ProductShareButton from '@/components/product/ProductShareButton'
import { AffiliateLinkDisplay } from '@/components/marketplace/AffiliateLinkDisplay'

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
    redirect('/dashboard')
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
    <div className="relative min-h-screen bg-[#FAFAF8]">
      {/* Aesthetic background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-[#FFD93D]/15 blur-3xl" />
        <div className="absolute top-1/2 -right-16 h-56 w-56 rounded-full bg-[#A78BFA]/12 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-48 w-48 rounded-full bg-[#B4F056]/12 blur-3xl" />
      </div>

      <div className="relative z-10 w-full pt-[100px] px-4 sm:px-6 lg:px-8 pb-8 max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,45%)_minmax(0,55%)] lg:gap-12">

          {/* LEFT: Image Gallery */}
          <div className="w-full">
            <div className="overflow-hidden rounded-2xl border-2 border-black bg-white p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] lg:sticky lg:top-[96px]">
              <ImageCarousel images={images} />
            </div>
          </div>

          {/* RIGHT: Product Info */}
          <div className="flex flex-col space-y-6 lg:py-4">

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-[#FFD93D] border-2 border-black rounded-lg text-[9px] font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{brandName}</span>
              <span className="flex items-center gap-1 px-2 py-0.5 bg-black text-white text-[8px] font-black uppercase tracking-widest rounded-md">
                <Star className="w-2.5 h-2.5" strokeWidth={3} /> Verified
              </span>
              <span className="flex items-center gap-1 px-2 py-0.5 bg-[#FF8C69]/15 border border-[#FF8C69]/40 text-[#EA580C] text-[8px] font-black uppercase tracking-widest rounded-md">
                <ShoppingBag className="w-2.5 h-2.5" strokeWidth={3} /> {product.category || 'Clothing'}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-xl font-black leading-tight text-black sm:text-3xl">
              {product.name}
            </h1>

            {/* Price */}
            {product.price && (
              <div>
                <span className="inline-block px-5 py-2 bg-black text-white rounded-xl text-xl font-black">
                  ₹{Number(product.price).toLocaleString()}
                </span>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
              <Link
                href={`/influencer/try-on?productId=${product.id}`}
                className="flex w-full items-center justify-center gap-2 border-[3px] border-black bg-[#FFD93D] py-3 rounded-xl text-xs font-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all uppercase tracking-widest"
              >
                <Camera className="w-4 h-4" strokeWidth={3} />
                Try-On in Studio
              </Link>
              <RequestCollaborationButton
                productId={product.id}
                productName={product.name}
                brandName={brandName}
              />
            </div>

            {/* Affiliate Link */}
            <div className="pt-2">
              <AffiliateLinkDisplay productId={product.id} />
            </div>

            <hr className="border-2 border-black/10" />

            {/* Actions Row */}
            <div className="flex items-center gap-3 sm:gap-4 py-2 w-full">
              {product.link && (
                <div className="flex-1 min-w-0">
                  <a
                    href={product.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-[42px] w-full items-center justify-center gap-2 border-[3px] border-black bg-[#F5F5F0] px-3 py-2 text-xs font-bold uppercase tracking-wider text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                  >
                    <ExternalLink className="w-4 h-4 shrink-0" />
                    <span className="truncate">Original</span>
                  </a>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <FavoriteButton productId={product.id} />
              </div>
              <div className="flex-1 min-w-0">
                <ProductShareButton productName={product.name} />
              </div>
            </div>

            <hr className="border-2 border-black/10" />

            {/* Bottom Details Grid */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 pt-2 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-black/40">Specification</p>
                <h3 className="mb-2 text-sm font-black uppercase text-black">About the Product</h3>
                <p className="text-sm font-medium leading-relaxed text-black/70">
                  {product.description || 'No description available.'}
                </p>
              </div>

              <div className="space-y-6">
                {product.audience && (
                  <div>
                    <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-black/40">Target Audience</p>
                    <p className="text-sm font-bold text-black">{product.audience}</p>
                  </div>
                )}
                <div>
                  <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-black/40">Category</p>
                  <p className="text-sm font-bold text-black">{product.category || 'Clothing'}</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
