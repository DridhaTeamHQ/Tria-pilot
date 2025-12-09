import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import { generateProductRecommendations } from '@/lib/openai'
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

    // Optimized query - only select needed fields
    const dbUser = await prisma.user.findUnique({
      where: { email: authUser.email!.toLowerCase().trim() },
      select: {
        id: true,
        role: true,
        influencerProfile: {
          select: {
            bio: true,
            niches: true,
          },
        },
      },
    })

    if (!dbUser || dbUser.role !== 'INFLUENCER') {
      return NextResponse.json(
        { error: 'Unauthorized - Influencer access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    // Optimized - only get products we need, use select instead of include
    // For productId-based recommendations, only fetch similar products
    if (productId) {
      const currentProduct = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          category: true,
          brandId: true,
          audience: true,
        },
      })

      if (!currentProduct) {
        return NextResponse.json([], {
          headers: {
            'Cache-Control': 'public, max-age=600, stale-while-revalidate=1800',
          },
        })
      }

      // Get similar products only (much faster than all products)
      const similarProducts = await prisma.product.findMany({
        where: {
          OR: [
            { category: currentProduct.category },
            { brandId: currentProduct.brandId },
            { audience: currentProduct.audience },
          ],
          id: { not: productId },
        },
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          price: true,
          link: true,
          audience: true,
          brand: {
            select: {
              id: true,
              companyName: true,
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
          images: {
            where: { isCoverImage: true },
            take: 1,
            select: {
              id: true,
              imagePath: true,
            },
          },
        },
        take: 8,
      })

      return NextResponse.json(similarProducts, {
        headers: {
          'Cache-Control': 'public, max-age=600, stale-while-revalidate=1800',
        },
      })
    }

    // For AI recommendations, we still need all products but optimize the query
    const allProducts = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        brand: {
          select: {
            id: true,
            companyName: true,
            user: {
              select: {
                name: true,
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
      take: 100, // Limit to 100 products for AI recommendations (much faster)
    })

    let recommendedProducts

    if (productId) {
      // Get similar products based on productId
      const currentProduct = allProducts.find((p: any) => p.id === productId)
      if (!currentProduct) {
        return NextResponse.json([])
      }

      // Filter out current product and find similar ones
      const similarProducts = allProducts
        .filter((p: any) => p.id !== productId)
        .filter((p: any) => {
          // Same category
          if (p.category === currentProduct.category) return true
          // Same brand
          if (p.brandId === currentProduct.brandId) return true
          // Similar audience
          if (p.audience === currentProduct.audience) return true
          return false
        })
        .slice(0, 8)

      recommendedProducts = similarProducts
    } else {
      // Generate AI recommendations for user
      const recommendations = await generateProductRecommendations(
        {
          bio: dbUser.influencerProfile?.bio || undefined,
          niches: (dbUser.influencerProfile?.niches as string[]) || [],
        },
        allProducts.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description || undefined,
          category: p.category || undefined,
        }))
      )

      // Sort by match score and return top 10
      const sorted = recommendations.sort((a, b) => b.matchScore - a.matchScore).slice(0, 10)

      // Get full product details
      recommendedProducts = sorted.map((rec: any) => {
        const product = allProducts.find((p: any) => p.id === rec.productId)
        return product
      }).filter(Boolean)
    }

    // Recommendations can be cached for longer
    return NextResponse.json(recommendedProducts || [], {
      headers: {
        'Cache-Control': 'public, max-age=600, stale-while-revalidate=1800', // 10 min cache, 30 min stale
      },
    })
  } catch (error) {
    console.error('Product recommendation error:', error)
    // Fallback to category-based recommendations
    try {
      const { searchParams } = new URL(request.url)
      const productId = searchParams.get('productId')
      
      if (productId) {
        const product = await prisma.product.findUnique({
          where: { id: productId },
        })
        
        if (product) {
          const similar = await prisma.product.findMany({
            where: {
              category: product.category,
              id: { not: productId },
            },
            include: {
              brand: {
                include: {
                  user: {
                    select: { name: true },
                  },
                },
              },
              images: {
                where: { isCoverImage: true },
                take: 1,
              },
            },
            take: 8,
          })
          return NextResponse.json(similar)
        }
      }
    } catch (fallbackError) {
      console.error('Fallback recommendation error:', fallbackError)
    }
    
    return NextResponse.json([])
  }
}

