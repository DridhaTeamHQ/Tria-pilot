import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 1. Check Legacy Product Table
        const { count: legacyProductCount, error: lpError } = await supabase
            .from('Product')
            .select('*', { count: 'exact', head: true })

        // 2. Check Legacy ProductImage Table
        const { count: legacyImageCount, error: liError } = await supabase
            .from('ProductImage')
            .select('*', { count: 'exact', head: true })

        // 3. Check New Product Table
        const { count: newProductCount, error: npError } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })

        // 4. Sample Legacy Data (Product + Images)
        const { data: sampleLegacy } = await supabase
            .from('Product')
            .select('id, name, brandId')
            .limit(2)

        let legacyDetails = []
        if (sampleLegacy) {
            for (const p of sampleLegacy) {
                const { data: imgs } = await supabase
                    .from('ProductImage')
                    .select('id, imagePath, isTryOnReference, order')
                    .eq('productId', p.id)
                legacyDetails.push({ product: p, images: imgs })
            }
        }

        // 5. Sample New Data
        const { data: sampleNew } = await supabase
            .from('products')
            .select('id, name, images, cover_image')
            .not('images', 'is', null)
            .limit(3)

        return NextResponse.json({
            counts: {
                legacyProducts: legacyProductCount,
                legacyImages: legacyImageCount,
                newProducts: newProductCount
            },
            errors: {
                legacyProduct: lpError?.message,
                legacyImage: liError?.message,
                newProduct: npError?.message
            },
            samples: {
                legacy: legacyDetails,
                new: sampleNew
            }
        })
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }
}
