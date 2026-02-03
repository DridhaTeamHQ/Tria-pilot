import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://twrqlnyhbowrmoybmyfv.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3cnFsbnloYm93cm1veWJteWZ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDM5NzEyNiwiZXhwIjoyMDc5OTczMTI2fQ.ye7i7XEToPeJt7IRD9cI3J8SaVK0ZPTpDKMj3u7qK-U"

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
