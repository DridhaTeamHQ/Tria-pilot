import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import { createLinkSchema } from '@/lib/validation'
import prisma from '@/lib/prisma'
import { generateLinkCode } from '@/lib/links/generator'
import { getMaskedUrl, validateOriginalUrl } from '@/lib/links/utils'

export const dynamic = 'force-dynamic'

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

    const body = await request.json()
    const { productId } = createLinkSchema.parse(body)

    // Get product to validate it exists and get original URL
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        link: true,
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (!product.link) {
      return NextResponse.json(
        { error: 'Product does not have a link' },
        { status: 400 }
      )
    }

    // Validate original URL
    if (!validateOriginalUrl(product.link)) {
      return NextResponse.json(
        { error: 'Invalid product URL' },
        { status: 400 }
      )
    }

    // Check if tracked link already exists for this influencer + product
    const existingLink = await prisma.trackedLink.findUnique({
      where: {
        influencerId_productId: {
          influencerId: dbUser.influencerProfile.id,
          productId: product.id,
        },
      },
    })

    if (existingLink) {
      return NextResponse.json({
        maskedUrl: existingLink.maskedUrl,
        linkCode: existingLink.linkCode,
        productId: product.id,
        productName: product.name,
      })
    }

    // Generate unique link code
    const linkCode = await generateLinkCode()
    const maskedUrl = getMaskedUrl(linkCode)

    // Create new tracked link
    const trackedLink = await prisma.trackedLink.create({
      data: {
        influencerId: dbUser.influencerProfile.id,
        productId: product.id,
        originalUrl: product.link,
        maskedUrl,
        linkCode,
      },
    })

    return NextResponse.json({
      maskedUrl: trackedLink.maskedUrl,
      linkCode: trackedLink.linkCode,
      productId: product.id,
      productName: product.name,
    })
  } catch (error) {
    console.error('Link creation error:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

