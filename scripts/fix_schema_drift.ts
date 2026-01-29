
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const connectionString = "postgresql://postgres.twrqlnyhbowrmoybmyfv:0iu4i8p8JfnjqkPQ@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";
const pool = new Pool({ connectionString });

async function migrate() {
    try {
        console.log("Starting Migration...");

        // 1. Create Enum AccountStatus
        console.log("Creating Type: AccountStatus...");
        await pool.query(`
            DO $$ BEGIN
                CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // 2. Add Columns to profiles
        console.log("Altering Table: profiles...");

        // approval_status
        await pool.query(`
            ALTER TABLE "profiles" 
            ADD COLUMN IF NOT EXISTS "approval_status" "AccountStatus" DEFAULT 'PENDING';
        `);

        // slug
        await pool.query(`
            ALTER TABLE "profiles" 
            ADD COLUMN IF NOT EXISTS "slug" TEXT;
        `);

        // Add unique constraint to slug safely
        await pool.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_slug_key') THEN
                    ALTER TABLE "profiles" ADD CONSTRAINT "profiles_slug_key" UNIQUE ("slug");
                END IF;
            END $$;
        `);

        // createdAt
        await pool.query(`
            ALTER TABLE "profiles" 
            ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
        `);

        // updatedAt
        await pool.query(`
            ALTER TABLE "profiles" 
            ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);
        `);

        console.log("Migration Complete.");

    } catch (e) {
        console.error("Migration Failed:", e);
    } finally {
        await pool.end();
    }
}

migrate();
