/**
 * INFLUENCER ONBOARDING API
 * 
 * On submission MUST:
 * 1. Save influencer data (upsert InfluencerProfile)
 * 2. Update profiles (THIS IS CRITICAL):
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
      .union([z.number().min(0).max(1), z.string(), z.null()])
      .transform((val) => {
        if (val === '' || val === null) return undefined
        const num = typeof val === 'string' ? parseFloat(val) : val
        if (!isNaN(num) && num > 1) return num / 100
        return isNaN(num) ? undefined : num
      })
      .optional(),
  })
  .strict()

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
    const { data: profile } = await service
      .from('profiles')
      .select('id, role, onboarding_completed')
      .eq('id', authUser.id)
      .single()

    if (!profile || profile.role !== 'influencer') {
      return NextResponse.json({ error: 'Influencer profile not found' }, { status: 404 })
    }

    // Get Prisma user for InfluencerProfile (details only)
    const dbUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: { influencerProfile: true },
    })

    if (!dbUser || !dbUser.influencerProfile) {
      return NextResponse.json({ error: 'Influencer profile not found' }, { status: 404 })
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
    const isCompleted = Boolean(
      data.gender &&
        data.niches &&
        data.niches.length > 0 &&
        data.audienceType &&
        data.audienceType.length > 0 &&
        data.preferredCategories &&
        data.preferredCategories.length > 0 &&
        data.socials &&
        Object.keys(data.socials).length > 0 &&
        data.bio &&
        data.audienceRate !== undefined &&
        data.retentionRate !== undefined
    )

    // 1. Save influencer data (upsert InfluencerProfile)
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

    // 2. CRITICAL: Update profiles table when onboarding completes
    // This is where data was being lost before
    if (isCompleted && !profile.onboarding_completed) {
      await service
        .from('profiles')
        .update({
          onboarding_completed: true,
          approval_status: 'pending', // Set to pending ONLY when onboarding completes
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

export async function GET(request: Request) {
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
      .select('onboarding_completed')
      .eq('id', authUser.id)
      .single()

    if (!profile) {
      return NextResponse.json({ onboardingCompleted: false })
    }

    // Get influencer details from Prisma
    const dbUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: { influencerProfile: true },
    })

    return NextResponse.json({
      onboardingCompleted: profile.onboarding_completed || false,
      profile: dbUser?.influencerProfile || null,
    })
  } catch (error) {
    console.error('Onboarding check error:', error)
    return NextResponse.json({ onboardingCompleted: false })
  }
}
