
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Override with direct URL for inspection
const connectionString = "postgresql://postgres.twrqlnyhbowrmoybmyfv:0iu4i8p8JfnjqkPQ@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";

const pool = new Pool({ connectionString });

async function inspect() {
    try {
        console.log("--- COLUMNS in profiles ---");
        const resCols = await pool.query(`
            SELECT column_name, data_type, udt_name, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'profiles'
        `);
        console.table(resCols.rows);

        console.log("\n--- ENUMS ---");
        const resEnums = await pool.query(`
            SELECT t.typname as enum_name, e.enumlabel as enum_value
            FROM pg_type t 
            JOIN pg_enum e ON t.oid = e.enumtypid 
            WHERE t.typname IN ('UserRole', 'AccountStatus', 'userrole', 'accountstatus');
        `);
        console.table(resEnums.rows);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

inspect();
