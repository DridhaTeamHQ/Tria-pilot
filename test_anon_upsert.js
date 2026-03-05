const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // USE ANON KEY

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const dummyId = '00000000-0000-0000-0000-000000000000';
    const { error } = await supabase
        .from('profiles')
        .upsert({
            id: dummyId,
            email: 'test@example.com',
            role: 'influencer'
        });

    if (error) {
        console.log('Anonymous upsert FAILED. This confirms RLS is blocking the signup upsert.');
        console.log('Error details:', error.message);
    } else {
        console.log('Anonymous upsert SUCCEEDED. RLS is not the issue.');
    }
}

main();
