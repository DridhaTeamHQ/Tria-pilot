const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const recentUser = users.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', recentUser.id)
        .single();

    fs.writeFileSync('temp_profile.json', JSON.stringify({ user: recentUser, profile }, null, 2));
}

check();
