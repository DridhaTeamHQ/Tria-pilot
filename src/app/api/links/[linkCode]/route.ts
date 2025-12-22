import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { extractClickMetadata } from '@/lib/links/tracker'
import { sanitizeRedirectUrl } from '@/lib/links/utils'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ linkCode: string }> }
) {
  try {
    const { linkCode } = await params

    // Find tracked link by code
    const trackedLink = await prisma.trackedLink.findUnique({
      where: { linkCode },
      include: {
        product: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!trackedLink) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    if (!trackedLink.isActive) {
      return NextResponse.json({ error: 'Link is inactive' }, { status: 410 })
    }

    // Extract click metadata
    const clickMetadata = await extractClickMetadata(request)

    // Create click record (don't await to avoid blocking redirect)
    prisma.linkClick
      .create({
        data: {
          trackedLinkId: trackedLink.id,
          ipAddress: clickMetadata.ipAddress,
          userAgent: clickMetadata.userAgent,
          referrer: clickMetadata.referrer,
          deviceType: clickMetadata.deviceType,
          country: clickMetadata.country,
        },
      })
      .catch((error) => {
        console.error('Failed to record click:', error)
        // Don't throw - we still want to redirect even if tracking fails
      })

    // Increment click count (also don't await)
    prisma.trackedLink
      .update({
        where: { id: trackedLink.id },
        data: {
          clickCount: {
            increment: 1,
          },
        },
      })
      .catch((error) => {
        console.error('Failed to increment click count:', error)
      })

    // Sanitize redirect URL
    const redirectUrl = sanitizeRedirectUrl(trackedLink.originalUrl)

    if (!redirectUrl) {
      return NextResponse.json(
        { error: 'Invalid redirect URL' },
        { status: 500 }
      )
    }

    // Redirect to original URL (301 permanent redirect)
    return NextResponse.redirect(redirectUrl, { status: 301 })
  } catch (error) {
    console.error('Link redirect error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

