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

/**
 * Fallback function to process applications from influencer_applications table
 * Used when profiles table doesn't exist
 */
async function processApplicationsFallback(
  applications: any[],
  sortBy: string,
  order: 'asc' | 'desc'
): Promise<NextResponse> {
  const userIds = applications.map((app: any) => app.user_id)
  
  const influencers = await prisma.influencerProfile.findMany({
    where: {
      userId: { in: userIds },
      onboardingCompleted: true, // Only show completed in fallback mode
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

  const enriched = applications
    .map((app: any) => {
      const influencer = influencers.find((inf) => inf.userId === app.user_id)
      
      if (!influencer || influencer.user.role !== 'INFLUENCER') {
        return null
      }

      return {
        ...app,
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

  // Apply sorting
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
}

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

    // CRITICAL: Admin dashboard must show influencers using profiles table
    // Query conditions:
    // - role = 'influencer'
    // - approval_status IN ('draft', 'pending', 'approved', 'rejected')
    // 
    // DO NOT filter by onboarding_completed in admin list
    // Admin should see all influencers regardless of onboarding status
    let query = service
      .from('profiles')
      .select('*')
      .eq('role', 'influencer')
      .in('approval_status', ['draft', 'pending', 'approved', 'rejected'])

    // Apply status filter
    if (statusFilter && ['draft', 'pending', 'approved', 'rejected'].includes(statusFilter)) {
      query = query.eq('approval_status', statusFilter)
    }

    // Apply sorting
    if (sortBy === 'created_at') {
      query = query.order('created_at', { ascending: order === 'asc' })
    } else {
      // For other sorts, we'll need to join with Prisma data
      query = query.order('created_at', { ascending: false })
    }

    const { data: profiles, error } = await query

    if (error) {
      // Fallback: If profiles table doesn't exist, use influencer_applications
      console.warn('profiles table query failed, using influencer_applications fallback:', error.message)
      
      let fallbackQuery = service
        .from('influencer_applications')
        .select('*')

      if (statusFilter && ['pending', 'approved', 'rejected'].includes(statusFilter)) {
        fallbackQuery = fallbackQuery.eq('status', statusFilter)
      }

      if (sortBy === 'created_at') {
        fallbackQuery = fallbackQuery.order('created_at', { ascending: order === 'asc' })
      } else {
        fallbackQuery = fallbackQuery.order('created_at', { ascending: false })
      }

      const { data: applications, error: fallbackError } = await fallbackQuery

      if (fallbackError) {
        return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
      }

      if (!applications || applications.length === 0) {
        return NextResponse.json([])
      }

      // Continue with fallback logic (existing code below)
      return await processApplicationsFallback(applications, sortBy, order)
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json([])
    }

    // Process profiles data
    const userIds = profiles.map((p: any) => p.id)

    // Fetch full onboarding data from Prisma for each profile
    // DO NOT filter by onboarding_completed - admin should see all influencers
    const influencers = await prisma.influencerProfile.findMany({
      where: {
        userId: { in: userIds },
        // CRITICAL: DO NOT filter by onboardingCompleted here
        // Admin should see all influencers regardless of onboarding status
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

    // DEFENSIVE: Log if we have profiles but no matching influencers
    if (profiles.length > 0 && influencers.length === 0) {
      console.warn('Admin query: Found profiles but no matching influencers in Prisma', {
        profileUserIds: userIds,
        profileCount: profiles.length,
      })
    }

    // Merge profiles data with Prisma onboarding data
    const enriched = profiles
      .map((profile: any) => {
        const influencer = influencers.find((inf) => inf.userId === profile.id)
        
        // Skip if influencer not found or role is not INFLUENCER
        if (!influencer || influencer.user.role !== 'INFLUENCER') {
          return null
        }

        return {
          user_id: profile.id,
          email: profile.email,
          full_name: influencer.user.name,
          status: profile.approval_status, // Use approval_status from profiles table
          created_at: profile.created_at,
          updated_at: profile.updated_at || profile.created_at,
          reviewed_at: null, // Will be set when admin reviews
          review_note: null,
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

    // CRITICAL: Update profiles table with approval_status
    // Map status from influencer_applications format to profiles format
    const approvalStatus = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending'

    // Try to update profiles table first
    const { data: profileUpdated, error: profileError } = await service
      .from('profiles')
      .update({
        approval_status: approvalStatus,
      })
      .eq('id', user_id)
      .select()
      .single()

    if (profileError) {
      // Fallback: Update influencer_applications if profiles table doesn't exist
      console.warn('profiles table update failed, using influencer_applications fallback:', profileError.message)
      
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

      // Return updated application data
      return NextResponse.json(updated)
    }

    // Profiles table update succeeded
    // Also update influencer_applications for backward compatibility
    await service
      .from('influencer_applications')
      .upsert(
        {
          user_id,
          status,
          reviewed_at: new Date().toISOString(),
          review_note: review_note || null,
        },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single()

    // Return updated profile data
    const updated = profileUpdated

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
