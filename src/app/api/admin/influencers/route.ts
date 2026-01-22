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

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') // 'draft' | 'pending' | 'approved' | 'rejected' | null
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc'

    // Query profiles table: WHERE role = 'influencer'
    let query = service.from('profiles').select('*').eq('role', 'influencer')

    // Apply status filter
    if (statusFilter === 'draft') {
      // Draft tab: onboarding_completed = false (approval_status = 'none')
      query = query.eq('onboarding_completed', false)
    } else if (statusFilter && ['pending', 'approved', 'rejected'].includes(statusFilter)) {
      // Other tabs: filter by approval_status
      query = query.eq('approval_status', statusFilter)
    }

    // Apply sorting
    if (sortBy === 'created_at') {
      query = query.order('created_at', { ascending: order === 'asc' })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data: profiles, error } = await query

    if (error) {
      console.error('Error fetching profiles:', error)
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json([])
    }

    // Fetch onboarding data from Prisma
    const userIds = profiles.map((p: any) => p.id)
    const influencers = await prisma.influencerProfile.findMany({
      where: {
        userId: { in: userIds },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
        },
      },
    })

    // Enrich profiles with onboarding data
    const enriched = profiles
      .map((profile: any) => {
        const influencer = influencers.find((inf) => inf.userId === profile.id)

        if (!influencer || influencer.user.role !== 'INFLUENCER') {
          return null
        }

        // Determine status for display
        // Draft: onboarding_completed = false (approval_status = 'none')
        // Other: use approval_status directly
        let displayStatus = profile.approval_status || 'none'
        if (!profile.onboarding_completed) {
          displayStatus = 'none' // Draft = 'none' (not 'draft')
        }

        return {
          user_id: profile.id,
          email: profile.email,
          full_name: influencer.user.name,
          status: displayStatus,
          created_at: profile.created_at,
          updated_at: profile.updated_at || profile.created_at,
          reviewed_at: null,
          review_note: null,
          onboarding: {
            gender: influencer.gender,
            niches: influencer.niches,
            audienceType: influencer.audienceType,
            preferredCategories: influencer.preferredCategories,
            socials: influencer.socials,
            bio: influencer.bio,
            followers: influencer.followers,
            engagementRate: influencer.engagementRate,
            audienceRate: influencer.audienceRate,
            retentionRate: influencer.retentionRate,
            badgeScore: influencer.badgeScore,
            badgeTier: influencer.badgeTier,
            onboardingCompleted: influencer.onboardingCompleted,
          },
          user: influencer.user,
        }
      })
      .filter((app: any) => app !== null)

    // Apply sorting that requires Prisma data
    if (sortBy === 'badgeScore' || sortBy === 'followers' || sortBy === 'engagementRate') {
      enriched.sort((a: any, b: any) => {
        const aVal = a.onboarding?.[sortBy] ?? 0
        const bVal = b.onboarding?.[sortBy] ?? 0
        const aNum = typeof aVal === 'object' && aVal !== null ? Number(aVal) : Number(aVal) || 0
        const bNum = typeof bVal === 'object' && bVal !== null ? Number(bVal) : Number(bVal) || 0
        return order === 'asc' ? aNum - bNum : bNum - aNum
      })
    }

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

    if (!profile || profile.role !== 'admin') {
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
