import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import prisma from '@/lib/prisma'

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
      select: { id: true, role: true },
    })

    // Only brands can access influencer marketplace
    if (!dbUser || dbUser.role !== 'BRAND') {
      return NextResponse.json({ error: 'Unauthorized - Brand access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const niche = searchParams.get('niche')
    const audience = searchParams.get('audience')
    const gender = searchParams.get('gender')
    const category = searchParams.get('category')
    const badge = searchParams.get('badge')
    const sortBy = searchParams.get('sortBy') || 'followers'
    const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100) // Max 100 per page
    const skip = (page - 1) * limit

    const where: any = {
      portfolioVisibility: true,
      onboardingCompleted: true,
    }

    if (gender) {
      where.gender = gender
    }

    const orderBy: any = {}
    if (sortBy === 'followers') {
      orderBy.followers = order
    } else if (sortBy === 'price') {
      orderBy.pricePerPost = order
    } else if (sortBy === 'engagement') {
      orderBy.engagementRate = order
    } else if (sortBy === 'badge') {
      orderBy.badgeScore = order
    } else {
      orderBy.createdAt = 'desc'
    }

    // Fetch influencers with pagination
    let influencers = await prisma.influencerProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            slug: true,
            email: true,
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    })

    // Filter by JSON fields in memory (PostgreSQL JSON filtering is complex, so we do it here)
    if (niche) {
      influencers = influencers.filter((inf: any) => {
        const niches = inf.niches as string[]
        return Array.isArray(niches) && niches.includes(niche)
      })
    }

    if (audience) {
      influencers = influencers.filter((inf: any) => {
        const audienceType = inf.audienceType as string[]
        return Array.isArray(audienceType) && audienceType.includes(audience)
      })
    }

    if (category) {
      influencers = influencers.filter((inf: any) => {
        const categories = inf.preferredCategories as string[]
        return Array.isArray(categories) && categories.includes(category)
      })
    }

    if (badge) {
      influencers = influencers.filter((inf: any) => inf.badgeTier === badge)
    }

    // Get all user IDs for batch queries
    const userIds = influencers.map((inf: any) => inf.userId)

    // Batch fetch portfolios for all influencers
    const portfolios = await prisma.portfolio.findMany({
      where: {
        userId: { in: userIds },
        visibility: true,
      },
      select: {
        userId: true,
        imagePath: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Batch fetch collaboration counts
    // Note: influencerId in CollaborationRequest is User.id, not InfluencerProfile.id
    const collaborationCounts = await prisma.collaborationRequest.groupBy({
      by: ['influencerId'],
      where: {
        influencerId: { in: userIds }, // userIds are User.id values
        status: 'accepted',
      },
      _count: {
        id: true,
      },
    })

    // Create maps for O(1) lookup
    const portfolioMap = new Map<string, string[]>()
    portfolios.forEach((p: any) => {
      if (!portfolioMap.has(p.userId)) {
        portfolioMap.set(p.userId, [])
      }
      const userPortfolios = portfolioMap.get(p.userId)!
      if (userPortfolios.length < 2) {
        userPortfolios.push(p.imagePath)
      }
    })

    const collabCountMap = new Map<string, number>()
    collaborationCounts.forEach((c: any) => {
      collabCountMap.set(c.influencerId, c._count.id)
    })

    // Combine data efficiently
    const influencersWithPortfolio = influencers.map((influencer: any) => ({
      ...influencer,
      portfolioPreview: portfolioMap.get(influencer.userId) || [],
      collaborationCount: collabCountMap.get(influencer.userId) || 0,
    }))

    // Get total count for pagination
    const totalCount = await prisma.influencerProfile.count({ where })

    return NextResponse.json({
      data: influencersWithPortfolio,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error) {
    console.error('Influencer fetch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

