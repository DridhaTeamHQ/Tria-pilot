/**
 * CAMPAIGNS API
 * 
 * GET - List campaigns for authenticated brand
 * POST - Create new campaign
 * 
 * Uses Supabase only - NO Prisma
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import { z } from 'zod'

const campaignSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  goals: z.array(z.string()).optional(),
  targetAudience: z.string().optional(),
  budget: z.number().optional(),
  timeline: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = createServiceClient()

    // Verify brand role
    const { data: profile } = await service
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'brand') {
      return NextResponse.json({ error: 'Only brands can create campaigns' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const parsed = campaignSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid campaign data', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { title, goals, targetAudience, budget, timeline } = parsed.data

    // Generate campaign brief
    const brief = `Campaign: ${title}\n\nGoals: ${goals?.join(', ') || 'Brand awareness'}\nTarget Audience: ${targetAudience || 'General'}\nBudget: ${budget ? `₹${budget}` : 'TBD'}\nTimeline: ${timeline || 'Flexible'}`

    const { data: campaign, error: insertError } = await service
      .from('campaigns')
      .insert({
        brand_id: user.id,
        title,
        brief,
        strategy: {
          goals,
          targetAudience,
          budget,
          timeline,
        },
        status: 'draft',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Campaign insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
    }

    // Transform to match expected format
    return NextResponse.json({
      id: campaign.id,
      title: campaign.title,
      brief: campaign.brief,
      status: campaign.status,
      createdAt: campaign.created_at,
    })
  } catch (error) {
    console.error('Campaign creation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = createServiceClient()

    // Verify brand role
    const { data: profile } = await service
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'brand') {
      return NextResponse.json([]) // Return empty for non-brands
    }

    const { data: campaigns, error } = await service
      .from('campaigns')
      .select('*')
      .eq('brand_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Campaign fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
    }

    // Transform to match expected format for frontend
    const transformed = (campaigns || []).map(c => ({
      id: c.id,
      title: c.title,
      brief: c.brief,
      status: c.status,
      mode: 'SELF',
      createdAt: c.created_at,
    }))

    return NextResponse.json(transformed)
  } catch (error) {
    console.error('Campaign fetch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
