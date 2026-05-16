import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import { productSchema } from '@/lib/validation'
import { z } from 'zod'
import { sanitizeSearchTerm, asUuid } from '@/lib/security/sanitize'

const createProductSchema = productSchema
  .extend({
    category: z.string().trim().min(1).max(80),
    audience: z.string().trim().min(1).max(40),
    price: z.union([z.number(), z.string().trim()]).optional(),
  })
  .strict()

type ProductBrand = { id?: string | null; full_name?: string | null; brand_data?: Record<string, unknown> | null }

function toPublicBrand(brandValue: ProductBrand | ProductBrand[] | null | undefined) {
  const brand = Array.isArray(brandValue) ? brandValue[0] : brandValue
  const companyName =
    (brand?.brand_data?.companyName as string | undefined) ||
    brand?.full_name ||
    'Unknown Brand'

  return {
    id: brand?.id || null,
    full_name: brand?.full_name || null,
    brand_data: {
      companyName,
    },
  }
}

// POST Handler
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', authUser.id)
      .single()

    const role = (profile?.role || '').toLowerCase()
    if (!profile || role !== 'brand') {
      return NextResponse.json({ error: 'Unauthorized - Brand access required' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const parsed = createProductSchema.parse(body)
    const { name, description, category, link, tags, audience, images } = parsed

    let priceValue = parsed.price
    if (typeof priceValue === 'string') {
      priceValue = priceValue.trim() === '' ? 0 : Number(priceValue)
    }

    const coverImg = images?.find((img: any) => img.isCoverImage)
    const coverImage = coverImg?.imagePath || images?.[0]?.imagePath || ''
    const productImages = images?.map((i: any) => i.imagePath) || []

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        brand_id: profile.id,
        name,
        description,
        category,
        price: priceValue,
        link,
        tags: tags ? (Array.isArray(tags) ? tags : [tags]) : [],
        audience,
        cover_image: coverImage,
        images: productImages,
        active: true
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Product creation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET Handler - Returns LEGACY SHAPE with images array
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('id')

    // Single Product
    if (productId) {
      let supabase: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createServiceClient>
      try {
        supabase = createServiceClient()
      } catch {
        supabase = await createClient()
      }

      const { data: product, error } = await supabase
        .from('products')
        .select(`
            *,
            brand:brand_id (
                id, full_name, brand_data
            )
        `)
        .eq('id', productId)
        .single()

      if (error || !product) {
        // Fallback: Check Legacy 'Product' Table
        const { data: legacyProduct, error: legacyError } = await supabase
          .from('Product')
          .select(`
            id, name, description, category, link, audience, price, active, tags, "brandId", "createdAt", "updatedAt"
          `)
          .eq('id', productId)
          .single()

        if (legacyError || !legacyProduct) {
          return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        // Fetch Legacy ProductImage data
        const { data: legacyImages } = await supabase
          .from('ProductImage')
          .select('id, imagePath, order, isTryOnReference, isCoverImage')
          .eq('productId', productId)
          .order('order', { ascending: true })

        return NextResponse.json({
          ...legacyProduct,
          brand: { id: legacyProduct.brandId },
          images: legacyImages || []
        })
      }

      // Found in NEW table - try to find legacy images
      // 1. First try direct ID match (for non-migrated or correctly migrated items)
      let { data: legacyImages } = await supabase
        .from('ProductImage')
        .select('id, imagePath, order, isTryOnReference, isCoverImage')
        .eq('productId', productId)
        .order('order', { ascending: true })

      // 2. If no images found, it might be a migrated product with a mismatched ID (UUID vs CUID)
      // Try to find the legacy product by NAME to get its Legacy ID
      if (!legacyImages || legacyImages.length === 0) {
        const { data: legacyMatch } = await supabase
          .from('Product')
          .select('id')
          .eq('name', product.name) // Match by Name
          .single()

        if (legacyMatch) {
          const { data: foundImages } = await supabase
            .from('ProductImage')
            .select('id, imagePath, order, isTryOnReference, isCoverImage')
            .eq('productId', legacyMatch.id) // Use Legacy ID
            .order('order', { ascending: true })

          if (foundImages && foundImages.length > 0) {
            legacyImages = foundImages
          }
        }
      }

      let finalImages = []
      if (legacyImages && legacyImages.length > 0) {
        finalImages = legacyImages
      } else {
        // 3. Fallback: Synthesize from array if no legacy images found anywhere
        finalImages = (product.images || []).map((url: string, idx: number) => ({
          id: `img-${idx}`,
          imagePath: url,
          order: idx,
          isTryOnReference: idx === 0,
          isCoverImage: url === product.cover_image
        }))
      }

      return NextResponse.json({
        id: product.id,
        name: product.name,
        description: product.description,
        category: product.category,
        price: product.price,
        link: product.link,
        tags: product.tags,
        audience: product.audience,
        imagePath: product.cover_image,
        createdAt: product.created_at,
        updatedAt: product.updated_at,
        brand: {
          id: product.brand?.id,
          companyName: product.brand?.full_name || product.brand?.brand_data?.companyName || 'Unknown Brand'
        },
        images: finalImages
      }, {
        headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' }
      })
    }

    // List Products
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const brandId = searchParams.get('brandId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const from = (page - 1) * limit
    const to = from + limit - 1
    let authUser: { id: string } | null = null
    let supabase: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createServiceClient>

    if (brandId === 'current') {
      const sessionClient = await createClient()
      const { data: { user } } = await sessionClient.auth.getUser()
      authUser = user ? { id: user.id } : null
      supabase = sessionClient
    } else {
      try {
        supabase = createServiceClient()
      } catch {
        supabase = await createClient()
      }
    }

    let query = supabase
      .from('products')
      .select(`
        id,
        brand_id,
        name,
        description,
        category,
        price,
        link,
        tags,
        audience,
        active,
        created_at,
        updated_at,
        brand:brand_id (id, full_name, brand_data)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    // SECURITY: sanitize free-text search before interpolating into a
    // PostgREST `.or()` expression. Without this, `?search=,category.eq.x`
    // breaks out of the ilike clause and lets attackers add arbitrary
    // filters or perform regex DoS.
    if (search) {
      const safeSearch = sanitizeSearchTerm(search, 60)
      if (safeSearch) {
        query = query.or(`name.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%`)
      }
    }
    if (category) {
      // category is matched with `.eq` which is parameter-safe, but
      // cap length to avoid pathological inputs.
      query = query.eq('category', String(category).slice(0, 80))
    }
    if (brandId && brandId !== 'current') {
      // SECURITY: validate brandId is a UUID before passing it as a filter
      // value. `.eq` is parameter-safe, but a non-UUID value can produce
      // confusing 400s and may be used to fingerprint internals.
      const safeBrandId = asUuid(brandId)
      if (safeBrandId) query = query.eq('brand_id', safeBrandId)
    }
    if (brandId === 'current') {
      if (!authUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      query = query.eq('brand_id', authUser.id)
    }

    const { data: products, count, error } = await query
    if (error) throw error

    const sanitizedProducts = (products || []).map((product) => {
      return {
      ...product,
      cover_image: '',
      tryon_image: '',
      imagePath: '',
      images: [],
      brand: toPublicBrand(product.brand),
    }
    })

    return NextResponse.json({
      data: sanitizedProducts,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      }
    }, {
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' }
    })
  } catch (error) {
    console.error('Product fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH Handler
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
    const id = (body as Record<string, unknown>).id

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    // SECURITY: previously this route did `const { id, ...updateData } = body`
    // and passed updateData straight to .update() — which let a brand POST
    // `brand_id: '<other-uuid>'` to silently transfer their own product to
    // another brand. Strictly allowlist mutable fields here.
    const ALLOWED_FIELDS = [
      'name', 'description', 'category', 'tags', 'audience',
      'price', 'discount', 'stock', 'sku', 'try_on_compatible',
      'link', 'cover_image', 'tryon_image', 'images', 'active',
    ] as const
    const updateData: Record<string, unknown> = {}
    for (const field of ALLOWED_FIELDS) {
      if (field in (body as Record<string, unknown>)) {
        updateData[field] = (body as Record<string, unknown>)[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('products')
      .select('brand_id')
      .eq('id', id)
      .single()

    if (!existing || existing.brand_id !== authUser.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { data: updated, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

// DELETE Handler
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const { data, error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('brand_id', authUser.id)
      .select('id')

    if (error) throw error

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
