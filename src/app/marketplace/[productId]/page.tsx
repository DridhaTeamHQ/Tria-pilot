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
    <div className="relative h-screen overflow-hidden bg-[#FAFAF8]">
      {/* Aesthetic background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-[#FFD93D]/15 blur-3xl" />
        <div className="absolute top-1/2 -right-16 h-56 w-56 rounded-full bg-[#A78BFA]/12 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-48 w-48 rounded-full bg-[#B4F056]/12 blur-3xl" />
      </div>

      {/* Main content — fixed to viewport */}
      <div className="relative z-10 h-full flex flex-col pt-[80px]">
        <div className="flex-1 min-h-0 container mx-auto px-4 sm:px-6 py-2">
          <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4 lg:gap-6">

            {/* ═══ LEFT: Image Gallery (Amazon style thumbnails + main) ═══ */}
            <div className="h-full min-h-0 rounded-2xl border-2 border-black bg-white shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] overflow-hidden p-3">
              <ImageCarousel images={images} />
            </div>

            {/* ═══ RIGHT: Product Info ═══ */}
            <div className="h-full min-h-0 overflow-y-auto px-4 -mx-4 space-y-5 pb-10">

              {/* ── Card 1: Title + Price ── */}
              <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center flex-wrap gap-2 mb-3">
                  <span className="px-3 py-1 bg-[#FFD93D] border-2 border-black rounded-lg text-[9px] font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{brandName}</span>
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-black text-white text-[8px] font-black uppercase tracking-widest rounded-md">
                    <Star className="w-2.5 h-2.5" strokeWidth={3} /> Verified
                  </span>
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-[#FF8C69]/15 border border-[#FF8C69]/40 text-[#EA580C] text-[8px] font-black uppercase tracking-widest rounded-md">
                    <ShoppingBag className="w-2.5 h-2.5" strokeWidth={3} /> {product.category || 'Product'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <h1 className="text-2xl sm:text-3xl font-black text-black leading-tight tracking-tight">{product.name}</h1>
                  {product.price && (
                    <span className="shrink-0 px-5 py-2 bg-black text-white rounded-xl text-xl font-black">
                      ₹{Number(product.price).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* ── Card 2: CTA Buttons ── */}
              <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="grid grid-cols-2 gap-3">
                <Link
                  href={`/influencer/try-on?productId=${product.id}`}
                  className="flex w-full items-center justify-center gap-2 border-2 border-black bg-[#FFD93D] py-3 rounded-xl text-xs font-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all uppercase tracking-widest"
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
              </div>

              {/* ── Card 3: Affiliate Link ── */}
              <AffiliateLinkDisplay productId={product.id} />

              {/* ── Card 4: Actions Row ── */}
              <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="grid grid-cols-3 gap-3">
                  {product.link ? (
                    <a
                      href={product.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 border-2 border-black bg-[#F5F5F0] py-2.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" strokeWidth={3} />
                      Original
                    </a>
                  ) : <div />}
                  <FavoriteButton productId={product.id} />
                  <ProductShareButton productName={product.name} />
                </div>
              </div>

              {/* ── Card 5: Specification ── */}
              <div className="bg-white border-2 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="px-5 py-2.5 bg-[#F5F5F0] border-b-2 border-black">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black/60">Specification</span>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <h2 className="text-sm font-black uppercase text-black mb-2">About the Product</h2>
                    <p className="text-sm leading-relaxed text-black/55 font-medium">
                      {product.description || 'No description available.'}
                    </p>
                  </div>

                  {tagsArray.length > 0 && (
                    <div className="pt-3 border-t-2 border-black/5">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {tagsArray.map((tag: string, i: number) => (
                          <span key={i} className="px-3 py-1 bg-[#B4F056]/15 border border-[#B4F056]/40 rounded-lg text-[9px] font-black text-black/60 uppercase tracking-wider">#{tag.trim()}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t-2 border-black/5 grid grid-cols-2 gap-4">
                    {product.audience && (
                      <div>
                        <p className="text-[10px] font-black text-black/40 uppercase tracking-widest mb-1">Target Audience</p>
                        <p className="text-sm font-bold text-black">{product.audience}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] font-black text-black/40 uppercase tracking-widest mb-1">Category</p>
                      <p className="text-sm font-bold text-black">{product.category || 'Uncategorized'}</p>
                    </div>
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
