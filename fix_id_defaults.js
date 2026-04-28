const pg = require('pg');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  
  const tables = [
    'reference_photos',
    'identity_images', 
    'influencer_profiles',
    'brand_profiles',
    'user_profile_images',
  ];

  for (const table of tables) {
    try {
      await pool.query(`ALTER TABLE "${table}" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text`);
      console.log(`✅ ${table}: id default set`);
    } catch (e) {
      console.log(`❌ ${table}: ${e.message}`);
    }
  }

  await pool.end();
}

main();
