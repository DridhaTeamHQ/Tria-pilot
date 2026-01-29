
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Pooler URL
const connectionString = "postgresql://postgres.twrqlnyhbowrmoybmyfv:0iu4i8p8JfnjqkPQ@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";
const pool = new Pool({ connectionString });

async function checkTriggers() {
    try {
        console.log("Checking for 'profiles' creation triggers...");
        // Query pg_trigger for triggers on auth.users (requires permission, might fail via pooler if not superuser)
        // Alternatively check triggers on 'profiles' or functions.
        // Let's check for functions usually named 'handle_new_user' or similar
        const res = await pool.query(`
            SELECT proname, prosrc 
            FROM pg_proc 
            WHERE proname ILIKE '%handle_new_user%' OR proname ILIKE '%create_profile%';
        `);
        console.table(res.rows);
    } catch (e) {
        console.error("Trigger Check Failed:", e);
    } finally {
        await pool.end();
    }
}

checkTriggers();
