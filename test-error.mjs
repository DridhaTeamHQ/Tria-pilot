import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      description,
      category,
      price,
      cover_image,
      tryon_image,
      brand_id,
      brand:brand_id (
        id,
        brand_data
      )
    `)
    .limit(1);

  if (error) {
    console.error("ERROR JSON:", JSON.stringify(error));
    console.error("ERROR RAW:", error);
  } else {
    console.log("SUCCESS!", data);
  }
}

test();
