import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { sendEmail } from '@/lib/email/supabase-email'
import { buildInfluencerApprovalEmail, buildInfluencerRejectionEmail } from '@/lib/email/templates'
import { getPublicSiteUrlFromRequest } from '@/lib/site-url'
import { z } from 'zod'

// CRITICAL: Force dynamic rendering - no caching for admin data
// Admin must see fresh data from database, especially in multi-session scenarios
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
 * Returns influencer applications with full onboarding data for admin review.
 * Includes filters for: status, engagement rate, followers, niche, gender, platform.
 * Includes ranking data: badgeScore, badgeTier.
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

    // Enforce admin access via admin_users (service role to avoid RLS issues)
    const service = createServiceClient()
    const { data: adminCheck } = await service
      .from('admin_users')
      .select('user_id')
      .eq('user_id', authUser.id)
      .single()

    if (!adminCheck) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') // 'pending' | 'approved' | 'rejected' | null
    const sortBy = searchParams.get('sortBy') || 'created_at' // 'created_at' | 'badgeScore' | 'followers' | 'engagementRate'
    const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc'

    // CRITICAL: Admin dashboard must only show influencers who:
    // 1. Have role === 'INFLUENCER'
    // 2. Have onboardingCompleted === true
    // 3. Have approvalStatus IN ('pending', 'approved', 'rejected')
    // 
    // We fetch from influencer_applications first, then filter by onboarding completion
    let query = service
      .from('influencer_applications')
      .select('*')

    // Apply status filter
    if (statusFilter && ['pending', 'approved', 'rejected'].includes(statusFilter)) {
      query = query.eq('status', statusFilter)
    }

    // Apply sorting
    if (sortBy === 'created_at') {
      query = query.order('created_at', { ascending: order === 'asc' })
    } else {
      // For other sorts, we'll need to join with Prisma data
      query = query.order('created_at', { ascending: false })
    }

    const { data: applications, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
    }

    if (!applications || applications.length === 0) {
      return NextResponse.json([])
    }

    // CRITICAL: Fetch full onboarding data from Prisma for each application
    // Query must match exactly:
    // - role === 'INFLUENCER'
    // - onboardingCompleted === true
    // - approvalStatus IN ('pending', 'approved', 'rejected') (checked via influencer_applications.status)
    const userIds = applications.map((app: any) => app.user_id)
    
    // First, get all influencers with onboardingCompleted === true
    const influencers = await prisma.influencerProfile.findMany({
      where: {
        userId: { in: userIds },
        onboardingCompleted: true, // CRITICAL: Only show influencers who completed onboarding
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true, // CRITICAL: Include role to filter out brands
            createdAt: true,
          },
        },
      },
    })

    // DEFENSIVE: Log if we have applications but no matching influencers
    if (applications.length > 0 && influencers.length === 0) {
      console.warn('Admin query: Found applications but no matching influencers with onboardingCompleted=true', {
        applicationUserIds: userIds,
        applicationCount: applications.length,
      })
    }

    // Merge Supabase application data with Prisma onboarding data
    // CRITICAL: Only include applications where:
    // - User exists in Prisma
    // - Role is INFLUENCER (not BRAND)
    // - onboardingCompleted === true
    const enriched = applications
      .map((app: any) => {
        const influencer = influencers.find((inf) => inf.userId === app.user_id)
        
        // Skip if influencer not found or role is not INFLUENCER
        if (!influencer || influencer.user.role !== 'INFLUENCER') {
          return null
        }

        // DEFENSIVE: Assert valid state
        if (!influencer.onboardingCompleted) {
          console.error(`INVALID STATE: Application ${app.user_id} has approvalStatus but onboardingCompleted = false`)
          // Don't show in admin dashboard - this is an invalid state
          return null
        }

        return {
          ...app,
          // Full onboarding data
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
          // User data
          user: influencer.user,
        }
      })
      .filter((app: any) => app !== null) // Remove null entries

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

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin using service role to avoid RLS issues
    const service = createServiceClient()
    const { data: adminCheck } = await service
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
