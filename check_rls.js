const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data, error } = await supabase.rpc('get_policies', { table_name: 'profiles' });

    if (error) {
        // If RPC doesn't exist, try querying pg_policies directly
        const { data: policies, error: pgError } = await supabase.from('pg_policies').select('*').eq('tablename', 'profiles');
        if (pgError) {
            console.error('Error fetching policies:', pgError);
            // Fallback: just try an anonymous insert to see if it fails
            process.exit(1);
        }
        console.log('Policies for profiles:');
        console.dir(policies, { depth: null });
    } else {
        console.log('Policies for profiles:');
        console.dir(data, { depth: null });
    }
}

main();
