import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import { campaignSchema } from '@/lib/validation'
import { checkRateLimit } from '@/lib/rate-limit'
import { z } from 'zod'
import prisma from '@/lib/prisma'

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
    })

    if (!dbUser || dbUser.role !== 'BRAND') {
      return NextResponse.json({ error: 'Unauthorized - Brand access required' }, { status: 403 })
    }

    // Check rate limit
    const rateLimit = checkRateLimit(dbUser.id, 'campaigns')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          resetTime: rateLimit.resetTime,
        },
        { status: 429 }
      )
    }

    const body = await request.json().catch(() => null)
    const { title, goals, targetAudience, budget, timeline } = campaignSchema.parse(body)

    // Generate campaign brief (simplified - in production, use OpenAI)
    const brief = `Campaign: ${title}\n\nGoals: ${goals?.join(', ') || 'Brand awareness'}\nTarget Audience: ${targetAudience || 'General'}\nBudget: ${budget ? `$${budget}` : 'TBD'}\nTimeline: ${timeline || 'Flexible'}`

    const campaign = await prisma.campaign.create({
      data: {
        brandId: dbUser.id,
        title,
        brief,
        assets: [],
        metadata: {
          goals,
          targetAudience,
          budget,
          timeline,
        },
        status: 'draft',
      },
    })

    return NextResponse.json(campaign)
  } catch (error) {
    console.error('Campaign creation error:', error)
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
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const campaigns = await prisma.campaign.findMany({
      where: {
        brandId: dbUser.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(campaigns)
  } catch (error) {
    console.error('Campaign fetch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

