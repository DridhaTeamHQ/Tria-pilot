
import prisma from '@/lib/prisma'
import { User, UserRole } from '@prisma/client'

// Use string literals for AccountStatus if it's not exported by Prisma Client in this version
// or if it matches the DB enum directly.
type AccountStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'

/**
 * MANDATORY: Always sync Supabase Auth user with Prisma 'profiles' table.
 * ensuring the internal User record exists before any operation.
 */
export async function syncUser(sessionUser: {
    id: string;
    email?: string;
    user_metadata?: any
}): Promise<User> {
    if (!sessionUser.email) {
        throw new Error("Cannot sync user without email")
    }

    // Default role from metadata or fallback to INFLUENCER
    let role: UserRole = 'INFLUENCER'
    const metaRole = sessionUser.user_metadata?.role?.toUpperCase()

    // Validate role against UserRole enum
    if (metaRole === 'BRAND') role = 'BRAND'
    if (metaRole === 'ADMIN') role = 'ADMIN'

    console.log(`[SyncUser] Upserting user ${sessionUser.id} (${sessionUser.email}) as ${role}`)

    // UPSERT ensures atomic create-or-update
    const user = await prisma.user.upsert({
        where: { id: sessionUser.id },
        update: {
            email: sessionUser.email,
            updatedAt: new Date(),
        },
        create: {
            id: sessionUser.id,
            email: sessionUser.email,
            role: role,
            // Use explicit cast or string if Prisma type definitions are loose
            status: 'PENDING',
            slug: `${role.toLowerCase()}-${sessionUser.id.substring(0, 8)}`,
        }
    })

    return user
}
