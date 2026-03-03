import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function verifyLookup() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    console.log('--- Verifying Lookup Logic ---')

    const targetId = 'cbbfb839-4894-480f-9859-ab11bed76b91'
    console.log(`Checking Product ID: ${targetId}`)

    // 1. Fetch from New Table
    const { data: newProd } = await supabase.from('products').select('*').eq('id', targetId).single()
    if (!newProd) {
        console.log('Product NOT FOUND in new table!')
        return
    }
    console.log(`Found in New Table. Name: "${newProd.name}"`)
    const imgArray = newProd.images || []
    console.log(`New Table Images Count: ${imgArray.length}`)
    console.log(`Cover Image: ${newProd.cover_image}`)

    // Check if cover image is in images array
    const includesCover = newProd.cover_image && imgArray.includes(newProd.cover_image)
    console.log(`Images array includes cover? ${includesCover}`)

    // 2. Try Direct Match
    const { data: legacyImages } = await supabase.from('ProductImage').select('id').eq('productId', targetId)
    console.log(`Direct Legacy Images Found: ${legacyImages?.length}`)

    // 3. Try Name Fallback
    console.log('Attempting Name Fallback...')
    const { data: legacyMatch } = await supabase.from('Product').select('id, name').eq('name', newProd.name).single()

    if (legacyMatch) {
        console.log(`Found Legacy Match! ID: ${legacyMatch.id}`)
        console.log(`Legacy Name: "${legacyMatch.name}"`)

        const { data: foundImages } = await supabase.from('ProductImage').select('id, imagePath').eq('productId', legacyMatch.id)
        console.log(`Legacy Images via Name Match: ${foundImages?.length}`)
        if (foundImages) console.log(foundImages)
    } else {
        console.log('NO Legacy Match found by Name!')

        // Debug: Search for similar names?
        const { data: similar } = await supabase.from('Product').select('id, name').ilike('name', `%${newProd.name.substring(0, 10)}%`).limit(5)
        console.log('Similar Legacy Names:', similar)
    }
}

verifyLookup()
