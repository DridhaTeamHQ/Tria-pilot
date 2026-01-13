import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const socialsSchema = z
  .object({
    instagram: z.string().trim().max(80).optional(),
    tiktok: z.string().trim().max(80).optional(),
    youtube: z.string().trim().max(80).optional(),
    twitter: z.string().trim().max(80).optional(),
    facebook: z.string().trim().max(80).optional(),
    linkedin: z.string().trim().max(80).optional(),
    pinterest: z.string().trim().max(80).optional(),
    snapchat: z.string().trim().max(80).optional(),
  })
  .strict()

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
      return NextResponse.json({ error: 'Influencer profile not found' }, { status: 404 })
    }

    const socials = (dbUser.influencerProfile.socials as Record<string, string>) || {}

    return NextResponse.json({ socials })
  } catch (error) {
    console.error('Fetch socials error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

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
    const socials = socialsSchema.parse(body)

    // Clean up social media handles (remove @, trim whitespace)
    const cleanedSocials: Record<string, string> = {}
    for (const [platform, value] of Object.entries(socials)) {
      if (value && value.trim()) {
        // Remove @ symbol and trim
        cleanedSocials[platform] = value.trim().replace(/^@/, '')
      }
    }

    // Update influencer profile
    const updated = await prisma.influencerProfile.update({
      where: { id: dbUser.influencerProfile.id },
      data: {
        socials: cleanedSocials,
      },
    })

    return NextResponse.json({ socials: updated.socials })
  } catch (error) {
    console.error('Update socials error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid social media data', details: error.errors }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

