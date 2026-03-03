import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function getTrigger() {
    const { data, error } = await supabase.rpc('get_trigger_def')
    if (error) {
        // try direct sql
        console.log("Error running rpc, trying querying pg_proc directly using a raw query if possible, but supabase js doesn't support raw queries.")
        console.dir(error)
    }
}
getTrigger()
