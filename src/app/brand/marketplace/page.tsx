import { createClient } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users } from 'lucide-react'
import InfluencerFilters from '@/components/influencer/InfluencerFilters'
import InfluencerMarketplaceClient from '@/components/influencer/InfluencerMarketplaceClient'

export default async function BrandMarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{
    niche?: string
    audience?: string
    gender?: string
    category?: string
    badge?: string
    sortBy?: string
    order?: string
  }>
}) {
  const resolvedSearchParams = await searchParams
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: authUser.email! },
  })

  // Only brands can access influencer marketplace
  if (!dbUser || dbUser.role !== 'BRAND') {
    redirect('/')
  }

  // Build query params for API
  const params = new URLSearchParams()
  if (resolvedSearchParams.niche) params.set('niche', resolvedSearchParams.niche)
  if (resolvedSearchParams.audience) params.set('audience', resolvedSearchParams.audience)
  if (resolvedSearchParams.gender) params.set('gender', resolvedSearchParams.gender)
  if (resolvedSearchParams.category) params.set('category', resolvedSearchParams.category)
  if (resolvedSearchParams.badge) params.set('badge', resolvedSearchParams.badge)
  if (resolvedSearchParams.sortBy) params.set('sortBy', resolvedSearchParams.sortBy)
  if (resolvedSearchParams.order) params.set('order', resolvedSearchParams.order)

  // Fetch influencers server-side
  const where: any = {
    portfolioVisibility: true,
    onboardingCompleted: true,
  }

  if (resolvedSearchParams.gender) {
    where.gender = resolvedSearchParams.gender
  }

  const orderBy: any = {}
  if (resolvedSearchParams.sortBy === 'followers') {
    orderBy.followers = resolvedSearchParams.order || 'desc'
  } else if (resolvedSearchParams.sortBy === 'price') {
    orderBy.pricePerPost = resolvedSearchParams.order || 'desc'
  } else if (resolvedSearchParams.sortBy === 'engagement') {
    orderBy.engagementRate = resolvedSearchParams.order || 'desc'
  } else if (resolvedSearchParams.sortBy === 'badge') {
    orderBy.badgeScore = resolvedSearchParams.order || 'desc'
  } else {
    orderBy.createdAt = 'desc'
  }

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
  })

  // Filter by JSON fields (niche, audience, category) in memory since Prisma doesn't support array_contains for JSON
  if (resolvedSearchParams.niche) {
    influencers = influencers.filter((inf: any) => {
      const niches = inf.niches as string[]
      return Array.isArray(niches) && niches.includes(resolvedSearchParams.niche!)
    })
  }

  if (resolvedSearchParams.audience) {
    influencers = influencers.filter((inf: any) => {
      const audience = inf.audienceType as string[]
      return Array.isArray(audience) && audience.includes(resolvedSearchParams.audience!)
    })
  }

  if (resolvedSearchParams.category) {
    influencers = influencers.filter((inf: any) => {
      const categories = inf.preferredCategories as string[]
      return Array.isArray(categories) && categories.includes(resolvedSearchParams.category!)
    })
  }

  if (resolvedSearchParams.badge) {
    influencers = influencers.filter((inf: any) => inf.badgeTier === resolvedSearchParams.badge)
  }

  // Batch fetch portfolios and collaboration counts to avoid N+1 queries
  const userIds = influencers.map((inf: any) => inf.userId)

  const [portfolios, collaborationCounts] = await Promise.all([
    prisma.portfolio.findMany({
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
    }),
    prisma.collaborationRequest.groupBy({
      by: ['influencerId'],
      where: {
        influencerId: { in: userIds },
        status: 'accepted',
      },
      _count: {
        id: true,
      },
    }),
  ])

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
  const influencersWithData = influencers.map((influencer: any) => ({
    ...influencer,
    portfolioPreview: portfolioMap.get(influencer.userId) || [],
    collaborationCount: collabCountMap.get(influencer.userId) || 0,
  }))

  return (
    <div className="min-h-screen bg-cream pt-24 pb-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-7 w-7 text-zinc-900 dark:text-zinc-100" />
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Discover Influencers</h1>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 text-base ml-10">
            Find the perfect influencers for your brand collaborations
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <InfluencerFilters />
          </div>

          {/* Influencer Grid */}
          <div className="lg:col-span-3">
            <InfluencerMarketplaceClient
              influencers={influencersWithData.map((inf: any) => ({
                ...inf,
                bio: inf.bio ?? undefined,
                followers: inf.followers ?? undefined,
                pricePerPost: inf.pricePerPost ? Number(inf.pricePerPost) : undefined,
                engagementRate: inf.engagementRate ? Number(inf.engagementRate) : undefined,
                badgeScore: inf.badgeScore ? Number(inf.badgeScore) : undefined,
                badgeTier: inf.badgeTier ?? undefined,
                user: {
                  ...inf.user!,
                  name: inf.user?.name ?? undefined,
                },
              }))}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

