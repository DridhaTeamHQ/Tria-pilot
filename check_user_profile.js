const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, role, onboarding_completed, full_name')
        .ilike('email', '%sankalarohit%');

    if (error) {
        console.error('Error fetching profile:', error);
    } else {
        console.log('Profiles for user:');
        console.dir(data, { depth: null });
    }
}

main();
