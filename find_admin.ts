import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function findAdmin() {
    const { data, error } = await supabase
        .from('profiles')
        .select('email, role')
        .eq('role', 'admin')

    console.log("Admins:", JSON.stringify(data, null, 2))
}
findAdmin()
