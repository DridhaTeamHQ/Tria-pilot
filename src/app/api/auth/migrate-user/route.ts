import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * Migration endpoint to sync existing Supabase Auth users to Prisma
 * This helps users who were created in Supabase but not in Prisma
 * 
 * Usage: POST /api/auth/migrate-user
 * Body: { email: string, role: 'INFLUENCER' | 'BRAND', name?: string }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Request body required' }, { status: 400 })
    }

    const { role, name } = body
    if (!role || !['INFLUENCER', 'BRAND'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const email = authUser.email!.toLowerCase().trim()

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ 
        user: existing,
        message: 'User already exists in database' 
      })
    }

    // Generate unique slug
    const baseSlug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-')
    const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`

    // Create user in Prisma
    const user = await prisma.user.create({
      data: {
        id: authUser.id, // Use Supabase Auth user ID
        email,
        role,
        slug: uniqueSlug,
        name: name?.trim() || null,
        ...(role === 'INFLUENCER'
          ? {
              influencerProfile: {
                create: {
                  niches: [],
                  socials: {},
                },
              },
            }
          : {
              brandProfile: {
                create: {
                  companyName: name?.trim() || 'New Brand',
                },
              },
            }),
      },
      include: {
        influencerProfile: role === 'INFLUENCER',
        brandProfile: role === 'BRAND',
      },
    })

    // Create influencer application if needed
    if (role === 'INFLUENCER') {
      try {
        const service = createServiceClient()
        await service.from('influencer_applications').upsert({
          user_id: authUser.id,
          email,
          full_name: name?.trim() || null,
          status: 'pending',
        })
      } catch (e) {
        console.error('Failed to create influencer application:', e)
        // Don't fail the migration if this fails
      }
    }

    return NextResponse.json({ 
      user,
      message: 'User migrated successfully' 
    })
  } catch (error) {
    console.error('User migration error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
