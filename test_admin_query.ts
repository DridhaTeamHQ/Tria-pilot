import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function testQuery() {
    console.log("Testing Admin query...")
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*, influencer_profiles(*)')
        .or('role.eq.INFLUENCER,role.eq.influencer')
        .order('created_at', { ascending: false })
        .limit(2)

    if (error) {
        console.error("QUERY ERROR:", error)
    } else {
        console.log("QUERY SUCCESS!")
        console.log("Data count:", profiles.length)
        if (profiles.length > 0) {
            console.log("First profile's influencer_profiles type:", Array.isArray(profiles[0].influencer_profiles) ? "ARRAY" : typeof profiles[0].influencer_profiles)
            console.log("First profile sample:", JSON.stringify(profiles[0], null, 2))
        }
    }
}

testQuery()
