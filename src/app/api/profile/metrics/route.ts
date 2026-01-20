import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { calculateBadge } from '@/lib/influencer/badge-calculator'
import { z } from 'zod'

const schema = z
  .object({
    audienceRate: z.number().min(0).max(100),
    retentionRate: z.number().min(0).max(100),
  })
  .strict()

export async function PATCH(request: Request) {
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
    const data = schema.parse(body)

    const badge = calculateBadge({
      followers: dbUser.influencerProfile.followers ?? 0,
      engagementRate: Number(dbUser.influencerProfile.engagementRate ?? 0),
      audienceRate: data.audienceRate,
      retentionRate: data.retentionRate,
    })

    const updated = await prisma.influencerProfile.update({
      where: { id: dbUser.influencerProfile.id },
      data: {
        audienceRate: data.audienceRate,
        retentionRate: data.retentionRate,
        badgeScore: badge.score,
        badgeTier: badge.tier,
      },
      select: {
        audienceRate: true,
        retentionRate: true,
        badgeScore: true,
        badgeTier: true,
      },
    })

    return NextResponse.json({ profile: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    console.error('Profile metrics update error:', error)
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

    const dbUser = await prisma.user.findUnique({
      where: { email: authUser.email! },
      include: { influencerProfile: true },
    })

    if (!dbUser || dbUser.role !== 'INFLUENCER' || !dbUser.influencerProfile) {
      return NextResponse.json({ error: 'Influencer profile not found' }, { status: 404 })
    }

    return NextResponse.json({
      profile: {
        audienceRate: dbUser.influencerProfile.audienceRate,
        retentionRate: dbUser.influencerProfile.retentionRate,
        badgeScore: dbUser.influencerProfile.badgeScore,
        badgeTier: dbUser.influencerProfile.badgeTier,
      },
    })
  } catch (error) {
    console.error('Profile metrics fetch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
