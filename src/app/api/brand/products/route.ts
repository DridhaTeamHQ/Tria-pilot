/**
 * PRODUCTS API
 * 
 * GET - List products for authenticated brand
 * POST - Create new product
 * 
 * Uses Supabase only - no Prisma
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import { z } from 'zod'

const productSchema = z.object({
    name: z.string().min(1, 'Product name is required'),
    description: z.string().optional(),
    category: z.string().optional(),
    price: z.number().optional(),
    link: z.string().url().optional().or(z.literal('')),
    tags: z.array(z.string()).optional(),
    audience: z.string().optional(),
    cover_image: z.string().optional(),
    tryon_image: z.string().optional(),
    images: z.array(z.string()).optional(),
})


export async function GET() {
    try {
        const supabase = await createClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get brand profile
        const service = createServiceClient()
        const { data: profile } = await service
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || profile.role !== 'brand') {
            return NextResponse.json({ error: 'Only brands can access products' }, { status: 403 })
        }

        // Fetch products for this brand
        const { data: products, error: productsError } = await service
            .from('products')
            .select('*')
            .eq('brand_id', user.id)
            .order('created_at', { ascending: false })

        if (productsError) {
            console.error('Products fetch error:', productsError)
            return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
        }

        return NextResponse.json({ products: products || [] })
    } catch (error) {
        console.error('Products API error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get brand profile
        const service = createServiceClient()
        const { data: profile } = await service
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || profile.role !== 'brand') {
            return NextResponse.json({ error: 'Only brands can create products' }, { status: 403 })
        }

        const body = await request.json()
        const parsed = productSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid product data', details: parsed.error.flatten() },
                { status: 400 }
            )
        }

        const productData = {
            brand_id: user.id,
            name: parsed.data.name,
            description: parsed.data.description || null,
            category: parsed.data.category || null,
            price: parsed.data.price || null,
            link: parsed.data.link || null,
            tags: parsed.data.tags || [],
            audience: parsed.data.audience || null,
            cover_image: parsed.data.cover_image || null,
            tryon_image: parsed.data.tryon_image || null,
            images: parsed.data.images || [],
            active: true,
        }


        const { data: product, error: insertError } = await service
            .from('products')
            .insert(productData)
            .select()
            .single()

        if (insertError) {
            console.error('Product insert error:', insertError)
            return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
        }

        return NextResponse.json({ product }, { status: 201 })
    } catch (error) {
        console.error('Products API error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        )
    }
}
