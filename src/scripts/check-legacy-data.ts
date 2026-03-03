import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function checkData() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    console.log('--- DB ID Alignment Check ---')

    // 1. Fetch Legacy IDs
    const { data: legacyProds } = await supabase.from('Product').select('id, name').order('name')

    // 2. Fetch New IDs
    const { data: newProds } = await supabase.from('products').select('id, name, images').order('name')

    console.log(`Legacy Count: ${legacyProds?.length}, New Count: ${newProds?.length}`)

    // 3. Compare
    if (legacyProds && newProds) {
        let mismatchCount = 0
        let matchCount = 0

        console.log('\n--- Checking first 5 matches by Name ---')
        for (const lp of legacyProds.slice(0, 5)) {
            const matchingNew = newProds.find(np => np.name === lp.name)
            if (matchingNew) {
                const idMatch = matchingNew.id === lp.id
                if (idMatch) matchCount++
                else mismatchCount++

                console.log(`\nName: ${lp.name}`)
                console.log(`Legacy ID: ${lp.id}`)
                console.log(`New ID:    ${matchingNew.id}`)
                console.log(`IDs Match: ${idMatch ? 'YES' : 'NO'}`)

                // Check images for this ID
                const { count: imgCount } = await supabase.from('ProductImage').select('*', { count: 'exact', head: true }).eq('productId', lp.id)
                console.log(`Legacy Images for Legacy ID: ${imgCount}`)

                if (!idMatch) {
                    const { count: newIdImgCount } = await supabase.from('ProductImage').select('*', { count: 'exact', head: true }).eq('productId', matchingNew.id)
                    console.log(`Legacy Images for NEW ID: ${newIdImgCount}`)
                }

                console.log(`New Table Images Array Len: ${matchingNew.images?.length || 0}`)
            } else {
                console.log(`\nName: ${lp.name} - Not found in new table`)
            }
        }
        console.log(`\nTotal checked sample: Mismatched IDs: ${mismatchCount}, Matched IDs: ${matchCount}`)
    }
}

checkData()
