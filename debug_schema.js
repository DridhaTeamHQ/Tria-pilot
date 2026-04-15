const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing secret keys');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking tracked_links...');
    const { data: links, error: linksError } = await supabase.from('tracked_links').select('*').limit(1);
    if (linksError) {
        console.error('tracked_links error:', linksError.message);
    } else {
        console.log('tracked_links columns:', Object.keys(links[0] || {}).join(', '));
    }

    console.log('\nChecking affiliate_events...');
    const { data: events, error: eventsError } = await supabase.from('affiliate_events').select('*').limit(1);
    if (eventsError) {
        console.error('affiliate_events error:', eventsError.message);
    } else {
        console.log('affiliate_events columns:', Object.keys(events[0] || {}).join(', '));
    }

    console.log('\nChecking products relation...');
    const { data: joinTest, error: joinError } = await supabase
        .from('tracked_links')
        .select('id, product:product_id(id, name)')
        .limit(1);
    if (joinError) {
        console.error('Join error (product:product_id):', joinError.message);
        const { data: joinTest2, error: joinError2 } = await supabase
            .from('tracked_links')
            .select('id, products(id, name)')
            .limit(1);
        if (joinError2) {
            console.error('Join error (products):', joinError2.message);
        } else {
            console.log('Join success (products)');
        }
    } else {
        console.log('Join success (product:product_id)');
    }
}

checkSchema();
