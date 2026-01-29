
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Pooler URL
const connectionString = "postgresql://postgres.twrqlnyhbowrmoybmyfv:0iu4i8p8JfnjqkPQ@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";
const pool = new Pool({ connectionString });

async function inspectConstraints() {
    try {
        console.log("--- Constraints on InfluencerProfile ---");
        const res = await pool.query(`
            SELECT conname, pg_get_constraintdef(c.oid)
            FROM pg_constraint c
            JOIN pg_namespace n ON n.oid = c.connamespace
            WHERE n.nspname = 'public' 
            AND c.conrelid = 'public."InfluencerProfile"'::regclass;
        `);
        console.table(res.rows);

        console.log("\n--- Checking Users (profiles) table ---");
        // Check if profiles table exists and has IDs
        const resProfiles = await pool.query(`SELECT COUNT(*) FROM profiles`);
        console.log("Profiles count:", resProfiles.rows[0].count);

    } catch (e) {
        console.error("Inspection Failed:", e);
    } finally {
        await pool.end();
    }
}

inspectConstraints();
