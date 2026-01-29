/**
 * SINGLE SOURCE OF TRUTH: Prisma User provisioning.
 *
 * Supabase Auth creates users in auth.users. The app uses Prisma for the
 * application DB (profiles table). A Prisma User row MUST exist before
 * creating InfluencerProfile or BrandProfile (FK constraint).
 *
 * Use getOrCreateUser() whenever you have a Supabase session and need
 * the corresponding Prisma User. Never create profiles without ensuring
 * the User exists first.
 */
import prisma from '@/lib/prisma'
import { User, UserRole } from '@prisma/client'

export type GetOrCreateUserInput = {
  id: string
  email: string
  role?: 'influencer' | 'brand' | 'admin' | 'INFLUENCER' | 'BRAND' | 'ADMIN'
  name?: string | null
  user_metadata?: { role?: string; name?: string } | null
}

/**
 * Get existing Prisma User by id, or create one if missing.
 * Idempotent: safe to call on every request; does not duplicate users.
 *
 * Logs: session id, lookup result, and create when it happens.
 */
export async function getOrCreateUser(input: GetOrCreateUserInput): Promise<User> {
  const { id, email, role: roleParam, name: nameParam, user_metadata } = input

  if (!id || !email) {
    console.error('[getOrCreateUser] Missing id or email', { id: id ?? null, email: email ?? null })
    throw new Error('Cannot get or create user without id and email')
  }

  const normalizedEmail = email.trim().toLowerCase()

  // Resolve role: param > metadata > default INFLUENCER (use enum; ADMIN exists in DB but may be omitted from generated enum)
  let role: UserRole = UserRole.INFLUENCER
  const rawRole = (roleParam ?? user_metadata?.role ?? '').toString().toUpperCase()
  if (rawRole === 'BRAND') role = UserRole.BRAND
  else if (rawRole === 'ADMIN') role = 'ADMIN' as UserRole

  console.log('[getOrCreateUser] Lookup', { userId: id, email: normalizedEmail, resolvedRole: role })

  // 1. Find by Supabase auth id (normal case)
  const existingById = await prisma.user.findUnique({
    where: { id },
  })
  if (existingById) {
    console.log('[getOrCreateUser] Found by id', { userId: id })
    return existingById
  }

  // 2. Find by email (user exists from earlier sign-up / different auth id → avoid unique constraint on email)
  const existingByEmail = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })
  if (existingByEmail) {
    console.log('[getOrCreateUser] Found by email (id mismatch), linking', {
      authId: id,
      prismaId: existingByEmail.id,
      email: normalizedEmail,
    })
    // Optionally sync id so Prisma user matches auth (requires updating FKs; skip for now to avoid complexity)
    return existingByEmail
  }

  // 3. No user exists → create
  console.log('[getOrCreateUser] Creating Prisma User', { userId: id, email: normalizedEmail, role })
  const name = nameParam ?? user_metadata?.name ?? null

  const user = await prisma.user.create({
    data: {
      id,
      email: normalizedEmail,
      name: name || undefined,
      role,
      slug: `${role.toLowerCase()}-${id.substring(0, 8)}`,
    },
  })

  console.log('[getOrCreateUser] Created', { userId: user.id, email: user.email })
  return user
}
