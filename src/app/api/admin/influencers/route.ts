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

    // Query profiles table (role stored UPPERCASE in Supabase); no view required
    const { data: profiles, error: profilesError } = await service
      .from('profiles')
      .select('*')
      .or('role.eq.INFLUENCER,role.eq.influencer')
      .order('created_at', { ascending: order === 'desc' })

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json([])
    }

    // Enrich with Prisma InfluencerProfile – match by profile id OR email (Prisma user id may differ if linked by email)
    const userIds = profiles.map((p: { id: string }) => p.id)
    const profileEmails = profiles
      .map((p: { email?: string }) => (p.email || '').toString().toLowerCase().trim())
      .filter(Boolean)
    const influencerProfiles = await prisma.influencerProfile.findMany({
      where: {
        OR: [
          { userId: { in: userIds } },
          { user: { email: { in: profileEmails } } },
        ],
      },
      include: {
        user: { select: { id: true, email: true, name: true, role: true, createdAt: true } },
      },
    })

    const norm = (e: string) => (e || '').toLowerCase().trim()

    let enriched = profiles
      .map((profile: Record<string, unknown>) => {
        const inf =
          influencerProfiles.find((i) => i.userId === profile.id) ??
          influencerProfiles.find((i) => norm(i.user.email) === norm(String(profile.email ?? '')))
        if (!inf || inf.user.role !== 'INFLUENCER') return null

        const approvalStatus = (profile.approval_status as string) || 'none'
        let displayStatus = approvalStatus.toString().toLowerCase()
        if (!profile.onboarding_completed) displayStatus = 'none'

        // Apply status filter in code
        if (statusFilter === 'none' && displayStatus !== 'none') return null
        if (statusFilter === 'pending' && displayStatus !== 'pending') return null
        if (statusFilter === 'approved' && displayStatus !== 'approved') return null
        if (statusFilter === 'rejected' && displayStatus !== 'rejected') return null

        return {
          user_id: profile.id,
          email: profile.email,
          full_name: inf.user.name,
          status: displayStatus,
          created_at: profile.created_at,
          updated_at: profile.updated_at ?? profile.created_at,
          reviewed_at: null,
          review_note: null,
          onboarding: {
            gender: inf.gender,
            niches: Array.isArray(inf.niches) ? inf.niches : [],
            audienceType: Array.isArray(inf.audienceType) ? inf.audienceType : [],
            preferredCategories: Array.isArray(inf.preferredCategories) ? inf.preferredCategories : [],
            socials: typeof inf.socials === 'object' && inf.socials ? inf.socials : {},
            bio: inf.bio,
            followers: inf.followers,
            engagementRate: inf.engagementRate ? Number(inf.engagementRate) : null,
            audienceRate: inf.audienceRate ? Number(inf.audienceRate) : null,
            retentionRate: inf.retentionRate ? Number(inf.retentionRate) : null,
            badgeScore: inf.badgeScore ? Number(inf.badgeScore) : null,
            badgeTier: inf.badgeTier,
            onboardingCompleted: inf.onboardingCompleted,
            portfolioVisibility: inf.portfolioVisibility,
          },
          user: {
            id: inf.user.id,
            email: inf.user.email,
            name: inf.user.name,
            role: inf.user.role,
            createdAt: inf.user.createdAt,
          },
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)

    // Sort in code (profiles from Supabase may not support all sort fields)
    const sortKey = sortBy === 'created_at' ? 'created_at' : sortBy
    enriched.sort((a, b) => {
      let aVal: number | string = 0
      let bVal: number | string = 0
      if (sortKey === 'created_at') {
        aVal = new Date(String(a.created_at)).getTime()
        bVal = new Date(String(b.created_at)).getTime()
      } else if (sortKey === 'badgeScore') {
        aVal = a.onboarding?.badgeScore ?? 0
        bVal = b.onboarding?.badgeScore ?? 0
      } else if (sortKey === 'followers') {
        aVal = a.onboarding?.followers ?? 0
        bVal = b.onboarding?.followers ?? 0
      } else if (sortKey === 'engagementRate') {
        aVal = a.onboarding?.engagementRate ?? 0
        bVal = b.onboarding?.engagementRate ?? 0
      }
      const diff = Number(aVal) - Number(bVal)
      return order === 'asc' ? diff : -diff
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
