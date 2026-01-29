
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const connectionString = "postgresql://postgres.twrqlnyhbowrmoybmyfv:0iu4i8p8JfnjqkPQ@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";
const pool = new Pool({ connectionString });

async function installTrigger() {
    try {
        console.log("Installing 'handle_new_user' Function and Trigger...");

        // 1. Create Function
        // Uses SECURITY DEFINER to bypass RLS during insertion
        await pool.query(`
            CREATE OR REPLACE FUNCTION public.handle_new_user()
            RETURNS trigger 
            LANGUAGE plpgsql
            SECURITY DEFINER SET search_path = public
            AS $$
            BEGIN
              INSERT INTO public.profiles (
                  id, 
                  email, 
                  role, 
                  "createdAt", 
                  "updatedAt", 
                  approval_status,
                  slug
              )
              VALUES (
                  new.id,
                  new.email,
                  -- Default to INFLUENCER if role not provided in metadata
                  -- Use explicit cast to "UserRole" enum
                  COALESCE((new.raw_user_meta_data->>'role')::"UserRole", 'INFLUENCER'::"UserRole"),
                  NOW(),
                  NOW(),
                  'PENDING'::"AccountStatus",
                  LOWER(
                      COALESCE(
                          new.raw_user_meta_data->>'name', 
                          SUBSTRING(new.email FROM 1 FOR POSITION('@' IN new.email)-1), 
                          'user'
                      ) || '-' || SUBSTRING(new.id::text FROM 1 FOR 8)
                  )
              );
              RETURN new;
            END;
            $$;
        `);
        console.log("Function created.");

        // 2. Create Trigger
        // We drop first to ensure clean state if replacing
        await pool.query(`
            DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
            CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
        `);
        console.log("Trigger created on auth.users.");

    } catch (e) {
        console.error("Installation Failed:", e);
    } finally {
        await pool.end();
    }
}

installTrigger();
