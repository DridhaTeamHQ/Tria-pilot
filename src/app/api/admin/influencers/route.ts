/**
 * ADMIN INFLUENCER MANAGEMENT API
 * 
 * GET: Query profiles table WHERE role = 'influencer'
 * Tabs:
 * - Pending → approval_status = 'pending'
 * - Approved → approval_status = 'approved'
 * - Rejected → approval_status = 'rejected'
 * - Draft → onboarding_completed = false
 * 
 * PATCH: Update approval_status in profiles table
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { sendEmail } from '@/lib/email/supabase-email'
import { buildInfluencerApprovalEmail, buildInfluencerRejectionEmail } from '@/lib/email/templates'
import { getPublicSiteUrlFromRequest } from '@/lib/site-url'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const updateSchema = z
  .object({
    user_id: z.string().uuid(),
    status: z.enum(['approved', 'rejected']),
    review_note: z.string().trim().max(2000).nullable().optional(),
  })
  .strict()

/**
 * GET /api/admin/influencers
 * 
 * Query: FROM profiles WHERE role = 'influencer'
 * 
 * Tabs:
 * - status=pending → approval_status = 'pending'
 * - status=approved → approval_status = 'approved'
 * - status=rejected → approval_status = 'rejected'
 * - status=draft → onboarding_completed = false
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin access - use profiles.role === 'admin' (SOURCE OF TRUTH)
    const service = createServiceClient()
    const { data: profile } = await service
      .from('profiles')
      .select('role')
      .eq('id', authUser.id)
      .single()

    const role = (profile?.role || '').toLowerCase()
    if (!profile || role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') // 'none' | 'pending' | 'approved' | 'rejected' | null
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc'

    // Query optimized View directly
    let query = service.from('admin_influencers_view').select('*')

    // Apply status filter
    if (statusFilter === 'none') {
      // Draft tab: onboarding_completed = false
      query = query.eq('onboarding_completed', false)
    } else if (statusFilter && ['pending', 'approved', 'rejected'].includes(statusFilter)) {
      // Other tabs: filter by approval_status
      query = query.eq('status', statusFilter)
    }

    // Apply sorting (Now efficiently handled by DB View)
    const sortFieldMap: Record<string, string> = {
      created_at: 'created_at',
      followers: 'followers',
      engagementRate: 'engagement_rate',
      badgeScore: 'badge_score',
    }
    const dbSortField = sortFieldMap[sortBy] || 'created_at'

    // Handle specific sort fields or default
    query = query.order(dbSortField, { ascending: order === 'asc' })

    const { data: rows, error } = await query

    if (error) {
      console.error('Error fetching profiles from view:', error)
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json([])
    }

    // Transform flat view data to expected nested structure
    // This maintains backward compatibility with the frontend
    const enriched = rows.map((row) => {
      // Determine status for display
      let displayStatus = row.status || 'none'
      if (!row.onboarding_completed) {
        displayStatus = 'none'
      }

      return {
        user_id: row.user_id,
        email: row.email,
        full_name: row.name, // Name from profiles
        status: displayStatus,
        created_at: row.created_at,
        updated_at: row.created_at, // View doesn't have updated_at, fallback to created_at
        reviewed_at: null,
        review_note: null,
        onboarding: {
          gender: row.gender,
          niches: row.niches,
          audienceType: row.audience_type,
          preferredCategories: row.preferred_categories,
          socials: row.socials,
          bio: row.bio,
          followers: row.followers,
          engagementRate: row.engagement_rate,
          audienceRate: row.audience_rate,
          retentionRate: row.retention_rate,
          badgeScore: row.badge_score,
          badgeTier: row.badge_tier,
          onboardingCompleted: row.onboarding_completed,
          portfolioVisibility: row.portfolio_visibility,
        },
        user: {
          id: row.user_id,
          email: row.email,
          name: row.name,
          role: row.role,
          createdAt: row.created_at,
        },
      }
    })

    return NextResponse.json(enriched)
  } catch (error) {
    console.error('Admin list error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/influencers
 * 
 * Update approval_status in profiles table.
 * After update, refresh list from DB (no optimistic updates).
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin access - use profiles.role === 'admin' (SOURCE OF TRUTH)
    const service = createServiceClient()
    const { data: profile } = await service
      .from('profiles')
      .select('role')
      .eq('id', authUser.id)
      .single()

    const role = (profile?.role || '').toLowerCase()
    if (!profile || role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const { user_id, status, review_note } = updateSchema.parse(body)

    // Update profiles table
    const approvalStatus = status === 'approved' ? 'approved' : 'rejected'

    const { data: profileUpdated, error: profileError } = await service
      .from('profiles')
      .update({
        approval_status: approvalStatus,
      })
      .eq('id', user_id)
      .select()
      .single()

    if (profileError) {
      console.error('Error updating profile:', profileError)
      return NextResponse.json({ error: 'Failed to update application' }, { status: 500 })
    }

    // Send email notification (best-effort)
    try {
      const recipient = await prisma.user.findUnique({
        where: { id: user_id },
        select: { email: true, name: true },
      })

      if (recipient?.email) {
        const baseUrl = getPublicSiteUrlFromRequest(request)
        const template =
          status === 'approved'
            ? buildInfluencerApprovalEmail({ name: recipient.name, baseUrl })
            : buildInfluencerRejectionEmail({ name: recipient.name, baseUrl, reviewNote: review_note })

        await sendEmail({
          to: recipient.email,
          subject: template.subject,
          html: template.html,
          text: template.text,
        })
      }
    } catch (mailError) {
      console.warn('Failed to send influencer status email:', mailError)
    }

    // Return updated profile (client will refresh list from DB)
    return NextResponse.json(profileUpdated)
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
