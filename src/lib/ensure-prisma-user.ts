// src/lib/ensure-prisma-user.ts
// MANDATORY: This function MUST run before any GenerationJob.create()
// It guarantees that a Prisma User row exists for the Supabase session user

import prisma from "@/lib/prisma"

interface SessionUser {
    id: string
    email?: string | null
}

/**
 * CRITICAL: Ensures a Prisma User row exists for the given Supabase session user.
 * 
 * This function MUST be called immediately before any operation that references User.id,
 * especially GenerationJob.create() which has a foreign key constraint.
 * 
 * @param sessionUser - The Supabase auth user (session.user)
 * @returns The Prisma User row (guaranteed to exist after this call)
 * @throws Error if sessionUser is invalid or upsert fails
 */
export async function ensurePrismaUser(sessionUser: SessionUser) {
    if (!sessionUser?.id) {
        throw new Error("No session user ID provided")
    }

    console.log("🔐 ensurePrismaUser called:", {
        sessionUserId: sessionUser.id,
        email: sessionUser.email,
    })

    // UPSERT: Create if not exists, update email if exists
    const user = await prisma.user.upsert({
        where: { id: sessionUser.id },
        update: {
            email: sessionUser.email ?? undefined,
        },
        create: {
            id: sessionUser.id,
            email: sessionUser.email ?? "",
            role: "INFLUENCER",
            status: "PENDING", // New users start as pending
        },
    })

    console.log("✅ ensurePrismaUser result:", {
        userId: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        userExists: true,
    })

    return user
}

/**
 * Verifies that a Prisma User row exists for the given ID.
 * Use this to log whether the user exists BEFORE creating a GenerationJob.
 */
export async function verifyUserExists(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    })

    console.log("🔍 USER EXISTS BEFORE GENERATION:", !!user, userId)

    return !!user
}
