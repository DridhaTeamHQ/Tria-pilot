import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { createLinkSchema } from '@/lib/validation'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Optimized - only select needed fields
    const dbUser = await prisma.user.findUnique({
      where: { email: authUser.email! },
      select: { id: true },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Optimized query - use select instead of include, reduce nested queries
    const favorites = await prisma.favorite.findMany({
      where: {
        userId: dbUser.id,
      },
      select: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            price: true,
            link: true,
            audience: true,
            createdAt: true,
            brand: {
              select: {
                id: true,
                companyName: true,
                user: {
                  select: {
                    name: true,
                    slug: true,
                  },
                },
              },
            },
            images: {
              where: {
                isCoverImage: true,
              },
              take: 1,
              select: {
                id: true,
                imagePath: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Add caching headers - favorites don't change frequently
    return NextResponse.json(
      favorites.map((f: any) => f.product),
      {
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=120', // 1 min cache
        },
      }
    )
  } catch (error) {
    console.error('Get favorites error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Optimized - only select needed fields
    const dbUser = await prisma.user.findUnique({
      where: { email: authUser.email! },
      select: { id: true },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => null)
    const { productId } = createLinkSchema.parse(body)

    // Check if already favorited
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId: dbUser.id,
          productId,
        },
      },
    })

    if (existing) {
      return NextResponse.json({ message: 'Already favorited' })
    }

    const favorite = await prisma.favorite.create({
      data: {
        userId: dbUser.id,
        productId,
      },
    })

    return NextResponse.json(favorite, { status: 201 })
  } catch (error) {
    console.error('Add favorite error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Optimized - only select needed fields
    const dbUser = await prisma.user.findUnique({
      where: { email: authUser.email! },
      select: { id: true },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    }

    await prisma.favorite.delete({
      where: {
        userId_productId: {
          userId: dbUser.id,
          productId,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove favorite error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

