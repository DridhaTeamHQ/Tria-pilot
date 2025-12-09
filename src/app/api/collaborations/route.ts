import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import { collaborationSchema } from '@/lib/validation'
import { generateCollaborationProposal } from '@/lib/openai'
import prisma from '@/lib/prisma'
import { z } from 'zod'

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
      include: {
        brandProfile: true,
        influencerProfile: true,
      },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { influencerId, brandId, productId, budget, timeline, goals, notes } = body

    let targetBrandId: string
    let targetInfluencerId: string

    if (dbUser.role === 'BRAND') {
      // Brand requesting collaboration with influencer
      if (!influencerId) {
        return NextResponse.json({ error: 'Influencer ID required' }, { status: 400 })
      }
      targetBrandId = dbUser.id
      targetInfluencerId = influencerId

      // Get influencer profile
      const influencer = await prisma.user.findUnique({
        where: { id: influencerId },
        include: {
          influencerProfile: true,
        },
      })

      if (!influencer || influencer.role !== 'INFLUENCER') {
        return NextResponse.json({ error: 'Influencer not found' }, { status: 404 })
      }

      // Generate AI proposal
      const message = await generateCollaborationProposal(
        {
          companyName: dbUser.brandProfile?.companyName || 'Our Brand',
          vertical: dbUser.brandProfile?.vertical || undefined,
          budgetRange: dbUser.brandProfile?.budgetRange || undefined,
        },
        {
          bio: influencer.influencerProfile?.bio || undefined,
          niches: (influencer.influencerProfile?.niches as string[]) || [],
          followers: influencer.influencerProfile?.followers || undefined,
        },
        {
          budget,
          timeline,
          goals,
          notes,
        }
      )

      // Create collaboration request
      const collaboration = await prisma.collaborationRequest.create({
        data: {
          brandId: targetBrandId,
          influencerId: targetInfluencerId,
          message,
          proposalDetails: {
            budget,
            timeline,
            goals,
            notes,
            productId,
          },
          status: 'pending',
        },
      })

    // Create notification for influencer
    if (dbUser.brandProfile) {
      await prisma.notification.create({
        data: {
          userId: targetInfluencerId,
          type: 'collab_request',
          content: `New collaboration request from ${dbUser.brandProfile.companyName || dbUser.name || 'a brand'}`,
          metadata: {
            requestId: collaboration.id,
          },
        },
      })
    }

      return NextResponse.json(collaboration, { status: 201 })
    } else if (dbUser.role === 'INFLUENCER') {
      // Influencer requesting collaboration with brand
      if (!brandId && !productId) {
        return NextResponse.json({ error: 'Brand ID or Product ID required' }, { status: 400 })
      }

      targetInfluencerId = dbUser.id

      // If productId provided, get brand from product
      if (productId) {
        const product = await prisma.product.findUnique({
          where: { id: productId },
          include: {
            brand: {
              include: {
                user: true,
              },
            },
          },
        })

        if (!product) {
          return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        targetBrandId = product.brand.userId
      } else if (brandId) {
        targetBrandId = brandId
      } else {
        return NextResponse.json({ error: 'Brand ID or Product ID required' }, { status: 400 })
      }

      // Get brand profile
      const brand = await prisma.user.findUnique({
        where: { id: targetBrandId },
        include: {
          brandProfile: true,
        },
      })

      if (!brand || brand.role !== 'BRAND') {
        return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
      }

      // Create simple collaboration request from influencer
      const message = notes || `I'm interested in collaborating with ${brand.brandProfile?.companyName || 'your brand'}. ${budget ? `Budget: ₹${budget}` : ''} ${timeline ? `Timeline: ${timeline}` : ''}`

      const collaboration = await prisma.collaborationRequest.create({
        data: {
          brandId: targetBrandId,
          influencerId: targetInfluencerId,
          message,
          proposalDetails: {
            budget,
            timeline,
            goals: goals || [],
            notes,
            productId,
          },
          status: 'pending',
        },
      })

      // Create notification for brand
      await prisma.notification.create({
        data: {
          userId: targetBrandId,
          type: 'collab_request',
          content: `New collaboration request from ${dbUser.name || 'an influencer'}`,
          metadata: {
            requestId: collaboration.id,
          },
        },
      })

      return NextResponse.json(collaboration, { status: 201 })
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
  } catch (error) {
    console.error('Collaboration creation error:', error)
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

    // Optimized - only select id
    const dbUser = await prisma.user.findUnique({
      where: { email: authUser.email!.toLowerCase().trim() },
      select: { id: true },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'sent' | 'received'

    // Optimized queries - use select instead of include
    let collaborations
    if (type === 'sent') {
      // Brands viewing requests they sent to influencers
      collaborations = await prisma.collaborationRequest.findMany({
        where: { brandId: dbUser.id },
        select: {
          id: true,
          message: true,
          status: true,
          proposalDetails: true,
          createdAt: true,
          influencer: {
            select: {
              id: true,
              name: true,
              slug: true,
              influencerProfile: {
                select: {
                  bio: true,
                  followers: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    } else {
      // Influencers viewing requests they received from brands (type === 'received' or no type)
      collaborations = await prisma.collaborationRequest.findMany({
        where: { influencerId: dbUser.id },
        select: {
          id: true,
          message: true,
          status: true,
          proposalDetails: true,
          createdAt: true,
          brand: {
            select: {
              id: true,
              name: true,
              slug: true,
              brandProfile: {
                select: {
                  companyName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    }

    // Add caching headers - collaborations don't change frequently
    return NextResponse.json(collaborations, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60', // 30 sec cache
      },
    })
  } catch (error) {
    console.error('Collaboration fetch error:', error)
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
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { id, status } = z
      .object({
        id: z.string(),
        status: z.enum(['accepted', 'declined']),
      })
      .parse(body)

    // Get collaboration request
    const collaboration = await prisma.collaborationRequest.findUnique({
      where: { id },
    })

    if (!collaboration) {
      return NextResponse.json({ error: 'Collaboration not found' }, { status: 404 })
    }

    // Only influencer can accept/decline
    if (collaboration.influencerId !== dbUser.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update status
    const updated = await prisma.collaborationRequest.update({
      where: { id },
      data: { status },
    })

    // Create notification for brand
    await prisma.notification.create({
      data: {
        userId: collaboration.brandId,
        type: `collab_${status}`,
        content: `Your collaboration request has been ${status}`,
        metadata: {
          requestId: id,
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Collaboration update error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

