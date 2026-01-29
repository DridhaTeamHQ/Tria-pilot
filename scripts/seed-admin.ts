import dotenv from 'dotenv';
import path from 'path';

// Load env vars from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createServiceClient } from '@/lib/auth';

async function main() {
    const service = createServiceClient();
    const email = 'admin@tria.so';
    const password = 'AdminSecurePassword123!';

    console.log(`Seeding Admin: ${email}`);

    let userId;

    // 1. Try to create user
    const { data: createData, error: createError } = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: 'Super Admin' }
    });

    if (!createError && createData.user) {
        userId = createData.user.id;
        console.log(`Created new Auth User: ${userId}`);
    } else if (createError?.message.includes('already has been registered')) {
        console.log('User already exists, finding ID...');
        // List users to find ID (limit 1, filter by email if possible, or list all)
        // listUsers doesn't support filter by email directly in all versions, but we can try.
        // Actually, listUsers allows page params.
        const { data: listData, error: listError } = await service.auth.admin.listUsers({ perPage: 1000 });
        if (listError) {
            console.error('Failed to list users:', listError.message);
            process.exit(1);
        }
        const existing = listData.users.find(u => u.email === email);
        if (existing) {
            userId = existing.id;
            console.log(`Found Existing User ID: ${userId}`);
        } else {
            console.error('User reported as existing but not found in list.');
            process.exit(1);
        }
    } else {
        console.error('Auth Create Error:', createError?.message);
        process.exit(1);
    }

    if (!userId) {
        console.error('Failed to resolve User ID');
        process.exit(1);
    }

    // 2. Create/Update Profile with STRICT CAPS
    console.log('Upserting Profile...');
    const { error: profileError } = await service
        .from('profiles')
        .upsert({
            id: userId,
            email,
            role: 'ADMIN', // Explicitly Uppercase
            approval_status: 'APPROVED', // Explicitly Uppercase
            onboarding_completed: true,
            name: 'Super Admin'
        });

    if (profileError) {
        console.error('Profile Upsert Error:', profileError.message);
        process.exit(1);
    }

    console.log('✅ Admin Seeded Successfully');
    console.log(`Credentials: ${email} / ${password}`);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
