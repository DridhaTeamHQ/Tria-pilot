const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const pg = require('pg');

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const tables = ['identity_images', 'user_profile_images'];
  
  for (const table of tables) {
    const res = await pool.query(
      `SELECT column_name, udt_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
      [table]
    );
    console.log(`\n=== ${table} ===`);
    if (res.rows.length === 0) console.log('  TABLE DOES NOT EXIST');
    else res.rows.forEach(r => console.log(`  ${r.column_name} (${r.udt_name})`));
  }
  
  await pool.end();
}

main().catch(console.error);
