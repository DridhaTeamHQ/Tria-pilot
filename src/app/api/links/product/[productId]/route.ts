import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { generateLinkCode } from '@/lib/links/generator'
import { getMaskedUrl, validateOriginalUrl } from '@/lib/links/utils'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
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

    const { productId } = await params

    // Get product
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

    if (!validateOriginalUrl(product.link)) {
      return NextResponse.json(
        { error: 'Invalid product URL' },
        { status: 400 }
      )
    }

    // Check if tracked link already exists
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
        originalUrl: existingLink.originalUrl,
        productId: product.id,
        productName: product.name,
      })
    }

    // Create new tracked link
    const linkCode = await generateLinkCode()
    // Get origin from request headers for proper URL generation
    const origin = request.headers.get('origin') || request.headers.get('host')
    const requestOrigin = origin 
      ? (origin.startsWith('http') ? origin : `https://${origin}`)
      : undefined
    const maskedUrl = getMaskedUrl(linkCode, requestOrigin)

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
      originalUrl: trackedLink.originalUrl,
      productId: product.id,
      productName: product.name,
    })
  } catch (error) {
    console.error('Get product link error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

