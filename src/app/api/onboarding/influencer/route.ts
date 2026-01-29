/**
 * INFLUENCER ONBOARDING API
 * 
 * CRITICAL: Users are created at SIGNUP, not during onboarding.
 * Onboarding ONLY UPDATES existing user data.
 * 
 * On submission MUST:
 * 1. Find or link existing User/InfluencerProfile
 * 2. UPDATE (never create) user data with onboarding fields
 * 3. Update profiles table:
 *    UPDATE profiles
 *    SET onboarding_completed = true,
 *        approval_status = 'pending'
 *    WHERE id = user.id;
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { calculateBadge } from '@/lib/influencer/badge-calculator'
import { z } from 'zod'
import { getOrCreateUser } from '@/lib/prisma-user'

const onboardingSchema = z
  .object({
    gender: z
      .union([z.enum(['Male', 'Female', 'Other']), z.literal(''), z.null()])
      .transform((val) => (val === '' || val === null ? undefined : val))
      .optional(),
    niches: z.array(z.string().trim().max(80)).max(30).optional(),
    audienceType: z.array(z.string().trim().max(80)).max(20).optional(),
    preferredCategories: z.array(z.string().trim().max(80)).max(50).optional(),
    socials: z.record(z.string().trim().max(80)).optional(),
    bio: z.string().trim().max(4000).optional(),
    audienceRate: z
      .union([z.number().min(0).max(100), z.string(), z.null()])
      .transform((val) => {
        if (val === '' || val === null) return undefined
        const num = typeof val === 'string' ? parseFloat(val) : val
        return isNaN(num) ? undefined : num
      })
      .optional(),
    retentionRate: z
      .union([z.number().min(0).max(100), z.string(), z.null()])
      .transform((val) => {
        if (val === '' || val === null) return undefined
        const num = typeof val === 'string' ? parseFloat(val) : val
        return isNaN(num) ? undefined : num
      })
      .optional(),
    followers: z
      .union([z.number().int().min(0), z.string(), z.null()])
      .transform((val) => {
        if (val === '' || val === null) return undefined
        const num = typeof val === 'string' ? parseInt(val, 10) : val
        return isNaN(num) ? undefined : num
      })
      .optional(),
    engagementRate: z
      .union([z.number().min(0).max(100), z.string(), z.null()])
      .transform((val) => {
        if (val === '' || val === null) return undefined
        const num = typeof val === 'string' ? parseFloat(val) : val
        if (isNaN(num)) return undefined
        // Convert percentage to decimal for storage (5.5% -> 0.055)
        return num > 1 ? num / 100 : num
      })
      .optional(),
  })
  .strict()

/**
 * SAFE: Ensures User and InfluencerProfile exist in Prisma.
 * Uses getOrCreateUser (single source of truth); never create profile without existing User.
 */
async function ensureInfluencerProfile(authId: string, email: string, userMetadata?: { role?: string; name?: string }) {
  // 1. Ensure Prisma User exists (by id or by email – getOrCreateUser returns same row either way)
  const user = await getOrCreateUser({
    id: authId,
    email,
    user_metadata: userMetadata ?? undefined,
  })
  // Use user.id (may differ from authId if user was found by email) for all Prisma lookups
  const prismaUserId = user.id

  // 2. Ensure InfluencerProfile exists
  const existingProfile = await prisma.influencerProfile.findUnique({
    where: { userId: prismaUserId },
  })

  if (!existingProfile) {
    console.log('[ensureInfluencerProfile] Creating InfluencerProfile for userId', prismaUserId)
    try {
      await prisma.influencerProfile.create({
        data: {
          userId: prismaUserId,
          niches: [],
          socials: {},
          audienceType: [],
          preferredCategories: [],
          onboardingCompleted: false,
        },
      })
    } catch (e: unknown) {
      console.error('[ensureInfluencerProfile] InfluencerProfile create failed', { userId: prismaUserId, error: e })
      throw e
    }
  }

  const finalUser = await prisma.user.findUnique({
    where: { id: prismaUserId },
    include: { influencerProfile: true },
  })
  if (!finalUser) throw new Error('User lost after sync (Impossible state)')
  return finalUser
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get profile from profiles table (SOURCE OF TRUTH)
    const service = createServiceClient()
    const { data: profile, error: profileError } = await service
      .from('profiles')
      .select('id, email, role, onboarding_completed')
      .eq('id', authUser.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json({ error: 'Profile not found in database' }, { status: 404 })
    }

    if ((profile.role || '').toLowerCase() !== 'influencer') {
      return NextResponse.json({ error: 'Not an influencer account' }, { status: 403 })
    }

    // SAFE: Ensure Prisma User then InfluencerProfile
    const dbUser = await ensureInfluencerProfile(
      authUser.id,
      profile.email || authUser.email || '',
      authUser.user_metadata as { role?: string; name?: string } | undefined
    )

    if (!dbUser || !dbUser.influencerProfile) {
      return NextResponse.json({ error: 'Failed to setup influencer profile' }, { status: 500 })
    }

    const body = await request.json().catch(() => null)
    const data = onboardingSchema.parse(body)

    // Calculate badge
    const finalFollowers = data.followers ?? dbUser.influencerProfile.followers ?? 0
    const finalEngagementRate =
      data.engagementRate !== undefined
        ? Number(data.engagementRate)
        : Number(dbUser.influencerProfile.engagementRate ?? 0)
    const finalAudienceRate = data.audienceRate ?? dbUser.influencerProfile.audienceRate?.toNumber?.() ?? 0
    const finalRetentionRate = data.retentionRate ?? dbUser.influencerProfile.retentionRate?.toNumber?.() ?? 0

    const badge = calculateBadge({
      followers: finalFollowers,
      engagementRate: finalEngagementRate,
      audienceRate: finalAudienceRate,
      retentionRate: finalRetentionRate,
    })

    // Determine if onboarding is completed
    const existingProfile = dbUser.influencerProfile

    const hasGender = data.gender || existingProfile.gender
    const hasNiches = (data.niches && data.niches.length > 0) ||
      (Array.isArray(existingProfile.niches) && (existingProfile.niches as string[]).length > 0)
    const hasAudienceType = (data.audienceType && data.audienceType.length > 0) ||
      (Array.isArray(existingProfile.audienceType) && (existingProfile.audienceType as string[]).length > 0)
    const hasCategories = (data.preferredCategories && data.preferredCategories.length > 0) ||
      (Array.isArray(existingProfile.preferredCategories) && (existingProfile.preferredCategories as string[]).length > 0)
    const hasMetrics = (data.audienceRate !== undefined || existingProfile.audienceRate !== null) &&
      (data.retentionRate !== undefined || existingProfile.retentionRate !== null)

    const isCompleted = Boolean(hasGender && hasNiches && hasAudienceType && hasCategories && hasMetrics)

    // UPDATE (never create) influencer data
    await prisma.influencerProfile.update({
      where: { id: dbUser.influencerProfile.id },
      data: {
        ...(data.gender && { gender: data.gender }),
        ...(data.niches && { niches: data.niches }),
        ...(data.audienceType && { audienceType: data.audienceType }),
        ...(data.preferredCategories && { preferredCategories: data.preferredCategories }),
        ...(data.socials && { socials: data.socials }),
        ...(data.bio && { bio: data.bio }),
        ...(data.audienceRate !== undefined && { audienceRate: data.audienceRate }),
        ...(data.retentionRate !== undefined && { retentionRate: data.retentionRate }),
        ...(data.followers !== undefined && { followers: data.followers }),
        ...(data.engagementRate !== undefined && { engagementRate: data.engagementRate }),
        badgeScore: badge.score,
        badgeTier: badge.tier,
        onboardingCompleted: isCompleted,
      },
    })

    // CRITICAL: Update profiles table when onboarding completes
    if (isCompleted && !profile.onboarding_completed) {
      await service
        .from('profiles')
        .update({
          onboarding_completed: true,
          approval_status: 'pending',
        })
        .eq('id', authUser.id)
    }

    return NextResponse.json({
      success: true,
      onboardingCompleted: isCompleted,
      redirectTo: isCompleted ? '/influencer/pending' : null,
    })
  } catch (error) {
    console.error('Onboarding error:', error)

    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      return NextResponse.json(
        {
          error: `Validation error: ${firstError.path.join('.')} - ${firstError.message}`,
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get from profiles table (SOURCE OF TRUTH)
    const service = createServiceClient()
    const { data: profile } = await service
      .from('profiles')
      .select('email, onboarding_completed')
      .eq('id', authUser.id)
      .single()

    if (!profile) {
      return NextResponse.json({ onboardingCompleted: false })
    }

    // SAFE: Ensure Prisma User then InfluencerProfile for GET (idempotent)
    const dbUser = await ensureInfluencerProfile(
      authUser.id,
      profile.email || authUser.email || '',
      authUser.user_metadata as { role?: string; name?: string } | undefined
    )

    return NextResponse.json({
      onboardingCompleted: profile.onboarding_completed || false,
      profile: dbUser?.influencerProfile || null,
    })
  } catch (error) {
    console.error('Onboarding check error:', error)
    return NextResponse.json({ onboardingCompleted: false })
  }
}
