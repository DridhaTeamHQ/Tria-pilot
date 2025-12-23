import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import { linkAnalyticsQuerySchema } from '@/lib/validation'
import prisma from '@/lib/prisma'
import { getMaskedUrl } from '@/lib/links/utils'

export const dynamic = 'force-dynamic'

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
      where: { email: authUser.email!.toLowerCase().trim() },
      include: {
        influencerProfile: true,
      },
    })

    if (!dbUser || dbUser.role !== 'INFLUENCER' || !dbUser.influencerProfile) {
      return NextResponse.json(
        { error: 'Unauthorized - Influencer access required' },
        { status: 403 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const query = linkAnalyticsQuerySchema.parse({
      productId: searchParams.get('productId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    })

    // Build where clause
    const where: any = {
      influencerId: dbUser.influencerProfile.id,
      isActive: true,
    }

    if (query.productId) {
      where.productId = query.productId
    }

    // Get all tracked links for this influencer
    const trackedLinks = await prisma.trackedLink.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            imagePath: true,
            images: {
              where: { isCoverImage: true },
              select: { imagePath: true },
              take: 1,
            },
          },
        },
        clicks: {
          select: {
            clickedAt: true,
          },
          orderBy: {
            clickedAt: 'desc',
          },
          take: 1,
        },
        _count: {
          select: {
            clicks: true,
          },
        },
      },
      orderBy: {
        clickCount: 'desc',
      },
    })

    // Regenerate masked URLs dynamically based on current request origin
    const origin = request.headers.get('origin') || request.headers.get('host')
    const requestOrigin = origin 
      ? (origin.startsWith('http') ? origin : `https://${origin}`)
      : undefined

    // Calculate unique clicks (by hashed IP)
    const productsWithStats = await Promise.all(
      trackedLinks.map(async (link) => {
        // Get unique click count (distinct IP addresses)
        const uniqueClicks = await prisma.linkClick.groupBy({
          by: ['ipAddress'],
          where: {
            trackedLinkId: link.id,
            ipAddress: {
              not: null,
            },
          },
        })

        // Regenerate masked URL dynamically
        const currentMaskedUrl = getMaskedUrl(link.linkCode, requestOrigin)
        
        // Update stored URL if it's different (fixes old localhost links)
        if (link.maskedUrl !== currentMaskedUrl) {
          await prisma.trackedLink.update({
            where: { id: link.id },
            data: { maskedUrl: currentMaskedUrl },
          }).catch((err) => {
            console.error('Failed to update masked URL:', err)
            // Don't throw - continue with current URL
          })
        }

        return {
          productId: link.productId,
          productName: link.product.name,
          productImage:
            link.product.images[0]?.imagePath || link.product.imagePath,
          maskedUrl: currentMaskedUrl,
          originalUrl: link.originalUrl,
          linkCode: link.linkCode,
          clickCount: link.clickCount,
          uniqueClicks: uniqueClicks.length,
          lastClickedAt: link.clicks[0]?.clickedAt || null,
          createdAt: link.createdAt,
        }
      })
    )

    // Calculate totals
    const totalClicks = trackedLinks.reduce((sum, link) => sum + link.clickCount, 0)
    const totalProducts = trackedLinks.length
    const averageClicks = totalProducts > 0 ? totalClicks / totalProducts : 0

    return NextResponse.json({
      totalClicks,
      totalProducts,
      averageClicks: Math.round(averageClicks * 100) / 100,
      products: productsWithStats,
    })
  } catch (error) {
    console.error('Analytics fetch error:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

