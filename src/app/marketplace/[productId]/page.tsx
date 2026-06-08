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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-12">

          {/* LEFT: Image Gallery */}
          <div className="w-full lg:h-full">
            <div className="overflow-hidden rounded-3xl border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] lg:sticky lg:top-[110px] lg:mt-4 mb-4 h-[calc(100%-2rem)] flex flex-col justify-center">
              <ImageCarousel images={images} />
            </div>
          </div>

          {/* RIGHT: Product Info */}
          <div className="flex flex-col rounded-3xl border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden lg:mt-4 mb-4">
            
            {/* Top section with subtle background pattern or gradient */}
            <div className="bg-gradient-to-br from-white to-[#F5F5F0] p-6 sm:p-8 border-b-2 border-black/10">
              {/* Header: Badges & Price */}
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1.5 bg-[#FFD93D] border-2 border-black rounded-lg text-[10px] font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{brandName}</span>
                  <span className="flex items-center gap-1 px-2.5 py-1.5 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-md">
                    <Star className="w-3 h-3 text-[#FFD93D] fill-[#FFD93D]" strokeWidth={2} /> Verified
                  </span>
                  <span className="flex items-center gap-1 px-2.5 py-1.5 bg-[#F3F4F6] text-black border border-black/10 text-[10px] font-black uppercase tracking-widest rounded-md">
                    <ShoppingBag className="w-3 h-3" strokeWidth={2.5} /> {product.category || 'Clothing'}
                  </span>
                </div>
                
                {product.price && (
                  <div className="shrink-0 self-start sm:self-auto">
                    <span className="inline-flex items-center px-4 py-2 bg-black text-white rounded-xl text-xl font-black shadow-[3px_3px_0px_0px_#FFD93D] transform -rotate-1">
                      ₹{Number(product.price).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Title */}
              <h1 className="mt-6 text-2xl font-black leading-tight text-black sm:text-4xl">
                {product.name}
              </h1>

              {/* CTA Buttons */}
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Link
                  href={`/influencer/try-on?productId=${product.id}`}
                  className="flex w-full items-center justify-center gap-2 border-[3px] border-black bg-[#FFD93D] py-3.5 rounded-xl text-xs font-black text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all uppercase tracking-widest"
                >
                  <Camera className="w-5 h-5" strokeWidth={2.5} />
                  Try-On in Studio
                </Link>
                <RequestCollaborationButton
                  productId={product.id}
                  productName={product.name}
                  brandName={brandName}
                />
              </div>
            </div>

            {/* Middle section for Affiliate & Actions */}
            <div className="p-6 sm:p-8 bg-white">
              {/* Affiliate Link */}
              <div className="mb-6">
                <AffiliateLinkDisplay productId={product.id} />
              </div>

              {/* Actions Row in a nice rounded container */}
              <div className="flex items-center gap-3 sm:gap-4 w-full p-4 bg-[#FAFAF8] rounded-2xl border-2 border-black border-dashed">
                {product.link && (
                  <div className="flex-1 min-w-0">
                    <a
                      href={product.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-[42px] w-full items-center justify-center gap-2 border-[3px] border-black bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all rounded-lg"
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
            </div>

            {/* Bottom section: Details */}
            <div className="bg-[#212121] text-white p-6 sm:p-8">
              <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 mb-4 border border-white/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#B4F056]"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/80">Specification</span>
                  </div>
                  <h3 className="mb-2 text-sm font-black uppercase text-white">About the Product</h3>
                  <p className="text-sm font-medium leading-relaxed text-white/70">
                    {product.description || 'No description available.'}
                  </p>
                </div>

                <div className="space-y-6">
                  {product.audience && (
                    <div>
                      <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-white/40">Target Audience</p>
                      <p className="text-sm font-bold text-white">{product.audience}</p>
                    </div>
                  )}
                  <div>
                    <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-white/40">Category</p>
                    <p className="text-sm font-bold text-[#FFD93D]">{product.category || 'Clothing'}</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
