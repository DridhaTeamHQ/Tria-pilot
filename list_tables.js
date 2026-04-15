const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
    const tables = ['link_clicks', 'payouts', 'payout', 'tracked_links', 'affiliate_events'];
    for (const table of tables) {
        const { error: tableError } = await supabase.from(table).select('*').limit(1);
        if (tableError) {
            console.log(`Table ${table}: MISSING (${tableError.message})`);
        } else {
            console.log(`Table ${table}: EXISTS`);
        }
    }
}

listTables();
