import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { calculateBadge } from '@/lib/influencer/badge-calculator'
import { z } from 'zod'

const onboardingSchema = z
  .object({
    // Handle empty strings by transforming them to undefined
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

    const dbUser = await prisma.user.findUnique({
      where: { email: authUser.email! },
      include: { influencerProfile: true },
    })

    if (!dbUser || dbUser.role !== 'INFLUENCER' || !dbUser.influencerProfile) {
      return NextResponse.json({ error: 'Influencer profile not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => null)
    const data = onboardingSchema.parse(body)

    const badge = calculateBadge({
      followers: dbUser.influencerProfile.followers ?? 0,
      engagementRate: Number(dbUser.influencerProfile.engagementRate ?? 0),
      audienceRate: data.audienceRate ?? dbUser.influencerProfile.audienceRate?.toNumber?.() ?? 0,
      retentionRate: data.retentionRate ?? dbUser.influencerProfile.retentionRate?.toNumber?.() ?? 0,
    })

    // Update influencer profile
    const updated = await prisma.influencerProfile.update({
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
        badgeScore: badge.score,
        badgeTier: badge.tier,
        // Mark as completed if all required fields are present
        onboardingCompleted: Boolean(
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
        ),
      },
    })

    return NextResponse.json({ profile: updated, onboardingCompleted: updated.onboardingCompleted })
  } catch (error) {
    console.error('Onboarding error:', error)
    
    // Handle Zod validation errors with better messages
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      return NextResponse.json(
        { 
          error: `Validation error: ${firstError.path.join('.')} - ${firstError.message}`,
          details: error.errors 
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

    const dbUser = await prisma.user.findUnique({
      where: { email: authUser.email! },
      include: { influencerProfile: true },
    })

    if (!dbUser || dbUser.role !== 'INFLUENCER' || !dbUser.influencerProfile) {
      return NextResponse.json({ onboardingCompleted: false })
    }

    return NextResponse.json({
      onboardingCompleted: dbUser.influencerProfile.onboardingCompleted,
      profile: dbUser.influencerProfile,
    })
  } catch (error) {
    console.error('Onboarding check error:', error)
    return NextResponse.json({ onboardingCompleted: false })
  }
}

