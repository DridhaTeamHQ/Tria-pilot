import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function checkCount() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    const targetId = 'cbbfb839-4894-480f-9859-ab11bed76b91'

    const { data } = await supabase.from('products').select('images').eq('id', targetId).single()

    if (data) {
        const arr = data.images || []
        console.log(`IMAGE_COUNT: ${arr.length}`)
        console.log(`CONTENT: ${JSON.stringify(arr)}`)
    } else {
        console.log('Product NOT FOUND')
    }
}

checkCount()
