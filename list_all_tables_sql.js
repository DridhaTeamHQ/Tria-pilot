const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const sql = `
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'storage', 'auth', 'graphql', 'realtime')
ORDER BY table_schema, table_name;
`;

async function listTables() {
    console.log('Listing all tables via SQL...');
    const { data, error } = await supabase.rpc('execute_sql', { sql });

    if (error) {
        console.error('SQL Execution failed:', error.message);
    } else {
        console.table(data);
    }
}

listTables();
