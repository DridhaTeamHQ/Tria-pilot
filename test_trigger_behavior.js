const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data, error } = await supabase.rpc('get_trigger_def'); // Or we can just query pg_proc but supabase RPC might not allow it directly if we don't have the RPC.
    // Instead, let's just create a dummy user in auth.users using admin API, and then read their profile!
    const testEmail = `test_trigger_${Date.now()}@example.com`;
    console.log('Creating test user:', testEmail);
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: 'password123',
        email_confirm: true,
    });

    if (userError) {
        console.error('Error creating user:', userError);
        return;
    }

    const userId = userData.user.id;
    console.log('Created user with ID:', userId);

    // Wait a moment for trigger
    await new Promise(r => setTimeout(r, 2000));

    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (profileError) {
        console.error('Error fetching profile:', profileError);
    } else {
        console.log('Created Profile:', profileData);
    }

    // Cleanup
    await supabase.auth.admin.deleteUser(userId);
    console.log('Cleaned up test user');
}

main();
