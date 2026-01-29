
import { PrismaClient } from '@prisma/client';

// Override with Direct URL for verification in process env
process.env.DATABASE_URL = "postgresql://postgres:0iu4i8p8JfnjqkPQ@db.twrqlnyhbowrmoybmyfv.supabase.co:5432/postgres";

const prisma = new PrismaClient();

async function verify() {
    try {
        console.log("Verifying Prisma Client with Direct URL...");
        const user = await prisma.user.findUnique({
            where: { email: 'verify_schema_fix@example.com' }
        });
        console.log("✅ findUnique executed successfully (User found: " + (user ? "YES" : "NO") + ")");
    } catch (e: any) {
        console.error("❌ Verification Failed Message:", e.message);
        console.error("❌ Full Error:", JSON.stringify(e, null, 2));
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

verify();
