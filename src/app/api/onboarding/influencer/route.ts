/**
 * INFLUENCER ONBOARDING API - SUPABASE ONLY
 * 
 * POST - Submit/update onboarding data
 * GET - Check onboarding status
 * 
 * Uses Supabase profiles and influencer_profiles tables only.
 * NO Prisma dependency.
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import { z } from 'zod'

const onboardingSchema = z
  .object({
    gender: z
      .union([z.enum(['Male', 'Female', 'Other']), z.literal(''), z.null()])
      .transform((val) => (val === '' || val === null ? undefined : val))
      .optional(),
    niches: z.array(z.string().trim().max(80)).max(30).optional(),
    audienceType: z.array(z.string().trim().max(80)).max(20).optional(),
    preferredCategories: z.array(z.string().trim().max(80)).max(50).optional(),
    socials: z.record(z.string().trim().max(80)).optional(),
    bio: z.string().trim().max(4000).optional(),
    audienceRate: z
      .union([z.number().min(0).max(1000), z.string(), z.null()])
      .transform((val) => {
        if (val === '' || val === null) return undefined
        const num = typeof val === 'string' ? parseFloat(val) : val
        return isNaN(num) || num < 0 || num > 1000 ? undefined : num
      })
      .optional(),
    retentionRate: z
      .union([z.number().min(0).max(100), z.string(), z.null()])
      .transform((val) => {
        if (val === '' || val === null) return undefined
        const num = typeof val === 'string' ? parseFloat(val) : val
        return isNaN(num) || num < 0 || num > 100 ? undefined : num
      })
      .optional(),
    followers: z
      .union([z.number().int().min(0).max(500000000), z.string(), z.null()])
      .transform((val) => {
        if (val === '' || val === null) return undefined
        const num = typeof val === 'string' ? parseInt(val, 10) : val
        if (isNaN(num) || num < 0 || num > 500000000) return undefined
        return num
      })
      .optional(),
    engagementRate: z
      .union([z.number().min(0).max(100), z.string(), z.null()])
      .transform((val) => {
        if (val === '' || val === null) return undefined
        const num = typeof val === 'string' ? parseFloat(val) : val
        if (isNaN(num)) return undefined
        return num > 1 ? num / 100 : num
      })
      .optional(),
  })
  .strict()

// Simple badge calculation
function calculateBadge(metrics: {
  followers: number
  engagementRate: number
  audienceRate: number
  retentionRate: number
}): { tier: string; score: number } {
  const { followers, engagementRate, audienceRate, retentionRate } = metrics

  // Calculate score based on metrics
  let score = 0

  // Followers scoring (0-40 points)
  if (followers >= 1000000) score += 40
  else if (followers >= 500000) score += 35
  else if (followers >= 100000) score += 30
  else if (followers >= 50000) score += 25
  else if (followers >= 10000) score += 20
  else if (followers >= 1000) score += 10
  else score += 5

  // Engagement rate scoring (0-30 points)
  const engRate = typeof engagementRate === 'number' ? engagementRate : 0
  if (engRate >= 0.1) score += 30 // 10%+
  else if (engRate >= 0.05) score += 25
  else if (engRate >= 0.03) score += 20
  else if (engRate >= 0.01) score += 15
  else score += 5

  // Audience/retention rate scoring (0-30 points)
  const audRate = typeof audienceRate === 'number' ? audienceRate : 0
  const retRate = typeof retentionRate === 'number' ? retentionRate : 0
  score += Math.min(15, Math.floor(audRate / 10) * 3)
  score += Math.min(15, Math.floor(retRate / 10) * 3)

  // Determine tier
  let tier = 'bronze'
  if (score >= 80) tier = 'diamond'
  else if (score >= 60) tier = 'gold'
  else if (score >= 40) tier = 'silver'

  return { tier, score }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = createServiceClient()

    // Get profile from profiles table
    const { data: profile, error: profileError } = await service
      .from('profiles')
      .select('id, email, role, onboarding_completed')
      .eq('id', authUser.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if ((profile.role || '').toLowerCase() !== 'influencer') {
      return NextResponse.json({ error: 'Not an influencer account' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const data = onboardingSchema.parse(body)

    // Get or create influencer profile
    let { data: infProfile, error: infError } = await service
      .from('influencer_profiles')
      .select('*')
      .eq('user_id', authUser.id)
      .single()

    if (infError || !infProfile) {
      // Create new influencer profile
      const { data: newProfile, error: createError } = await service
        .from('influencer_profiles')
        .insert({
          user_id: authUser.id,
          gender: data.gender,
          niches: data.niches || [],
          audience_type: data.audienceType || [],
          preferred_categories: data.preferredCategories || [],
          socials: data.socials || {},
          bio: data.bio,
          followers: data.followers,
          engagement_rate: data.engagementRate,
          audience_rate: data.audienceRate,
          retention_rate: data.retentionRate,
        })
        .select()
        .single()

      if (createError) {
        console.error('Failed to create influencer profile:', createError)
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
      }

      infProfile = newProfile
    } else {
      // Update existing influencer profile
      const updateData: Record<string, any> = {}
      if (data.gender) updateData.gender = data.gender
      if (data.niches) updateData.niches = data.niches
      if (data.audienceType) updateData.audience_type = data.audienceType
      if (data.preferredCategories) updateData.preferred_categories = data.preferredCategories
      if (data.socials) updateData.socials = data.socials
      if (data.bio) updateData.bio = data.bio
      if (data.audienceRate !== undefined) updateData.audience_rate = data.audienceRate
      if (data.retentionRate !== undefined) updateData.retention_rate = data.retentionRate
      if (data.followers !== undefined) updateData.followers = data.followers
      if (data.engagementRate !== undefined) updateData.engagement_rate = data.engagementRate

      if (Object.keys(updateData).length > 0) {
        const { data: updated, error: updateError } = await service
          .from('influencer_profiles')
          .update(updateData)
          .eq('user_id', authUser.id)
          .select()
          .single()

        if (updateError) {
          console.error('Failed to update influencer profile:', updateError)
          return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
        }

        infProfile = updated
      }
    }

    // Calculate badge
    const badge = calculateBadge({
      followers: data.followers ?? infProfile?.followers ?? 0,
      engagementRate: data.engagementRate ?? infProfile?.engagement_rate ?? 0,
      audienceRate: data.audienceRate ?? infProfile?.audience_rate ?? 0,
      retentionRate: data.retentionRate ?? infProfile?.retention_rate ?? 0,
    })

    // Update badge
    await service
      .from('influencer_profiles')
      .update({
        badge_tier: badge.tier,
        badge_score: badge.score,
      })
      .eq('user_id', authUser.id)

    // Check if onboarding is complete
    const hasGender = data.gender || infProfile?.gender
    const hasNiches = (data.niches && data.niches.length > 0) ||
      (Array.isArray(infProfile?.niches) && infProfile.niches.length > 0)
    const hasAudienceType = (data.audienceType && data.audienceType.length > 0) ||
      (Array.isArray(infProfile?.audience_type) && infProfile.audience_type.length > 0)
    const hasCategories = (data.preferredCategories && data.preferredCategories.length > 0) ||
      (Array.isArray(infProfile?.preferred_categories) && infProfile.preferred_categories.length > 0)
    const hasMetrics = (data.audienceRate !== undefined || infProfile?.audience_rate !== null) &&
      (data.retentionRate !== undefined || infProfile?.retention_rate !== null)

    const isCompleted = Boolean(hasGender && hasNiches && hasAudienceType && hasCategories && hasMetrics)

    // Update profiles table when onboarding completes
    if (isCompleted && !profile.onboarding_completed) {
      await service
        .from('profiles')
        .update({
          onboarding_completed: true,
          approval_status: 'pending',
        })
        .eq('id', authUser.id)
    }

    return NextResponse.json({
      success: true,
      onboardingCompleted: isCompleted,
      redirectTo: isCompleted ? '/influencer/pending' : null,
    })
  } catch (error) {
    console.error('Onboarding error:', error)

    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      return NextResponse.json(
        {
          error: `Validation error: ${firstError.path.join('.')} - ${firstError.message}`,
          details: error.errors,
        },
        { status: 400 }
      )
    }

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
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = createServiceClient()

    // Get profile status
    const { data: profile } = await service
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', authUser.id)
      .single()

    if (!profile) {
      return NextResponse.json({ onboardingCompleted: false })
    }

    // Get influencer profile data
    const { data: infProfile } = await service
      .from('influencer_profiles')
      .select('*')
      .eq('user_id', authUser.id)
      .single()

    return NextResponse.json({
      onboardingCompleted: profile.onboarding_completed || false,
      profile: infProfile ? {
        gender: infProfile.gender,
        niches: infProfile.niches,
        audienceType: infProfile.audience_type,
        preferredCategories: infProfile.preferred_categories,
        socials: infProfile.socials,
        bio: infProfile.bio,
        followers: infProfile.followers,
        engagementRate: infProfile.engagement_rate,
        audienceRate: infProfile.audience_rate,
        retentionRate: infProfile.retention_rate,
        badgeTier: infProfile.badge_tier,
        badgeScore: infProfile.badge_score,
      } : null,
    })
  } catch (error) {
    console.error('Onboarding check error:', error)
    return NextResponse.json({ onboardingCompleted: false })
  }
}
