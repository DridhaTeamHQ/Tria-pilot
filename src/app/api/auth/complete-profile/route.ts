import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { createClient, createServiceClient } from '@/lib/auth'

const schema = z
  .object({
    role: z.enum(['INFLUENCER', 'BRAND']),
    name: z.string().trim().min(1).max(120),
  })
  .strict()

function makeSlug(email: string) {
  const baseSlug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-')
  return `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const { role, name } = schema.parse(body)
    const email = authUser.email.toLowerCase().trim()

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ user: existing })
    }

    const user = await prisma.user.create({
      data: {
        id: authUser.id, // keep aligned with auth.users.id
        email,
        role,
        slug: makeSlug(email),
        name,
        ...(role === 'INFLUENCER'
          ? {
              influencerProfile: { create: { niches: [], socials: {} } },
            }
          : {
              brandProfile: { create: { companyName: name } },
            }),
      },
    })

    // For influencers, create a pending application (use service role because this endpoint might run with limited RLS)
    if (role === 'INFLUENCER') {
      try {
        const service = createServiceClient()
        await service.from('influencer_applications').upsert({
          user_id: authUser.id,
          email,
          full_name: name,
          status: 'pending',
        })
      } catch (e) {
        console.error('Failed to create influencer application:', e)
      }
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Complete profile error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

