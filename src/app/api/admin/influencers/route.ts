import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import { z } from 'zod'

const updateSchema = z
  .object({
    user_id: z.string().uuid(),
    status: z.enum(['approved', 'rejected']),
    review_note: z.string().trim().max(2000).nullable().optional(),
  })
  .strict()

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Enforce admin access via admin_users
    const { data: adminCheck } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', authUser.id)
      .single()

    if (!adminCheck) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const service = createServiceClient()
    const { data, error } = await service
      .from('influencer_applications')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Admin list error:', error)
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

    // Check if user is admin using RLS-protected query
    const { data: adminCheck } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', authUser.id)
      .single()

    if (!adminCheck) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const { user_id, status, review_note } = updateSchema.parse(body)

    // Update application. Use service role to avoid RLS misconfig blocking admin actions.
    const service = createServiceClient()
    const { data: updated, error } = await service
      .from('influencer_applications')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        review_note: review_note || null,
      })
      .eq('user_id', user_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating application:', error)
      return NextResponse.json({ error: 'Failed to update application' }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Admin update error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
