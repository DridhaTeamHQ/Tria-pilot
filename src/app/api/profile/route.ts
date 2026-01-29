import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
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
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => null)
    const { name } = updateProfileSchema.parse(body)

    const updated = await prisma.user.update({
      where: { id: dbUser.id },
      data: { name: name.trim() },
    })

    return NextResponse.json({ user: updated })
  } catch (error) {
    console.error('Profile update error:', error)
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
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        influencerProfile: {
          select: {
            id: true,
            bio: true,
            niches: true,
            socials: true,
            audienceType: true,
            preferredCategories: true,
            followers: true,
            engagementRate: true,
            audienceRate: true,
            retentionRate: true,
            badgeTier: true,
            badgeScore: true,
            gender: true,
          }
        }
      }
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user: dbUser })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

