import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/auth'

export async function GET() {
    const service = createServiceClient()
    const email = 'admin@tria.so'
    const password = 'AdminSecurePassword123!'

    try {
        // 1. Create Supabase Auth User
        const { data: { user }, error: authError } = await service.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { name: 'Super Admin' }
        })

        let userId = user?.id

        if (authError) {
            if (authError.message.includes('already has been registered')) {
                // Fetch existing user if needed, or just look up profile
                // We can't get the ID easily without signing in or listing users.
                // Listing users requires service role.
                const { data: users } = await service.auth.admin.listUsers()
                const existing = users?.users.find(u => u.email === email)
                if (existing) userId = existing.id
            } else {
                return NextResponse.json({ error: authError.message }, { status: 500 })
            }
        }

        if (!userId) {
            return NextResponse.json({ error: 'Failed to resolve User ID' }, { status: 500 })
        }

        // 2. Create/Update Profile
        const { error: profileError } = await service
            .from('profiles')
            .upsert({
                id: userId,
                email,
                role: 'ADMIN', // Explicitly Uppercase
                approval_status: 'APPROVED', // Explicitly Uppercase
                onboarding_completed: true,
                name: 'Super Admin'
            })

        if (profileError) {
            return NextResponse.json({ error: `Profile Error: ${profileError.message}` }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: 'Admin user seeded successfully',
            credentials: { email, password }
        })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
