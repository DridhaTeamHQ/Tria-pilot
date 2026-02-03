/**
 * PRODUCT BY ID API
 * 
 * GET - Get single product
 * PUT - Update product
 * DELETE - Delete product
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import { z } from 'zod'

const updateSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    price: z.number().optional(),
    link: z.string().url().optional().or(z.literal('')),
    tags: z.array(z.string()).optional(),
    audience: z.string().optional(),
    cover_image: z.string().optional(),
    tryon_image: z.string().optional(),
    images: z.array(z.string()).optional(),
    active: z.boolean().optional(),
})


interface Params {
    params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: Params) {
    try {
        const { id } = await params
        const supabase = await createClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const service = createServiceClient()
        const { data: product, error } = await service
            .from('products')
            .select('*')
            .eq('id', id)
            .eq('brand_id', user.id)
            .single()

        if (error || !product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        return NextResponse.json({ product })
    } catch (error) {
        console.error('Product GET error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PUT(request: Request, { params }: Params) {
    try {
        const { id } = await params
        const supabase = await createClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const parsed = updateSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid data', details: parsed.error.flatten() },
                { status: 400 }
            )
        }

        const service = createServiceClient()

        // Verify ownership
        const { data: existing } = await service
            .from('products')
            .select('id')
            .eq('id', id)
            .eq('brand_id', user.id)
            .single()

        if (!existing) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        const { data: product, error } = await service
            .from('products')
            .update({
                ...parsed.data,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Product update error:', error)
            return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
        }

        return NextResponse.json({ product })
    } catch (error) {
        console.error('Product PUT error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: Params) {
    try {
        const { id } = await params
        const supabase = await createClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const service = createServiceClient()

        const { error } = await service
            .from('products')
            .delete()
            .eq('id', id)
            .eq('brand_id', user.id)

        if (error) {
            console.error('Product delete error:', error)
            return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Product DELETE error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
