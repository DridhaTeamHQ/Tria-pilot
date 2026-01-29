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
  const isDev = process.env.NODE_ENV !== 'production'

  // Resolve role: param > metadata > default INFLUENCER
  let role: UserRole = UserRole.INFLUENCER
  const rawRole = (roleParam ?? user_metadata?.role ?? '').toString().toUpperCase()
  if (rawRole === 'BRAND') role = UserRole.BRAND
  else if (rawRole === 'ADMIN') role = 'ADMIN' as UserRole

  if (isDev) console.log('[getOrCreateUser] Lookup', { userId: id, email: normalizedEmail, resolvedRole: role })

  // 1. Find by Supabase auth id (normal case)
  const existingById = await prisma.user.findUnique({ where: { id } })
  if (existingById) {
    if (isDev) console.log('[getOrCreateUser] Found by id', { userId: id })
    return existingById
  }

  // 2. Find by email → link row to auth id so prisma.user.findUnique({ id: session.user.id }) returns a row
  const existingByEmail = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })
  if (existingByEmail) {
    const oldId = existingByEmail.id
    if (oldId === id) return existingByEmail
    if (isDev) console.log('[getOrCreateUser] Found by email, linking id', { authId: id, oldId, email: normalizedEmail })
    try {
      await prisma.$transaction([
        prisma.$executeRaw`UPDATE "InfluencerProfile" SET "userId" = ${id} WHERE "userId" = ${oldId}`,
        prisma.$executeRaw`UPDATE "BrandProfile" SET "userId" = ${id} WHERE "userId" = ${oldId}`,
        prisma.$executeRaw`UPDATE profiles SET id = ${id} WHERE id = ${oldId}`,
      ])
    } catch (linkErr) {
      console.error('[getOrCreateUser] Link by email failed', { authId: id, oldId, error: linkErr })
      return existingByEmail
    }
    const linked = await prisma.user.findUnique({ where: { id } })
    if (linked) return linked
    return existingByEmail
  }

  // 3. No user exists → create
  if (isDev) console.log('[getOrCreateUser] Creating Prisma User', { userId: id, email: normalizedEmail, role })
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

  if (isDev) console.log('[getOrCreateUser] Created', { userId: user.id, email: user.email })
  return user
}
