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
import { normalizeAmazonStoreId, normalizeAmazonTrackingId } from '@/lib/affiliate/amazon'
import { getGenerationTagFromDob, normalizeDateOfBirth } from '@/lib/profile-demographics'

const ALLOWED_SOCIAL_PLATFORMS = ['instagram', 'youtube', 'snapchat', 'facebook'] as const

const onboardingSchema = z
  .object({
    firstName: z.string().trim().max(120).optional(),
    lastName: z.string().trim().max(120).optional(),
    dateOfBirth: z.string().trim().max(40).optional(),
    gender: z
      .union([z.enum(['Male', 'Female', 'Other']), z.literal(''), z.null()])
      .transform((val) => (val === '' || val === null ? undefined : val))
      .optional(),
    niches: z.array(z.string().trim().max(80)).max(30).optional(),
    audienceType: z.array(z.string().trim().max(80)).max(20).optional(),
    preferredCategories: z.array(z.string().trim().max(80)).max(50).optional(),
    socials: z.record(z.string().trim().max(80)).optional(),
    affiliateStoreId: z.string().trim().max(64).optional(),
    affiliateCode: z.string().trim().max(64).optional(),
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

function normalizeSocials(raw: unknown): Record<string, string> {
  const input = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const normalized: Record<string, string> = {}
  for (const platform of ALLOWED_SOCIAL_PLATFORMS) {
    const value = input[platform]
    const trimmed = typeof value === 'string' ? value.trim() : ''
    if (trimmed) normalized[platform] = trimmed
  }
  return normalized
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
    let { data: profile, error: profileError } = await service
      .from('profiles')
      .select('id, email, role, onboarding_completed, approval_status, full_name')
      .eq('id', authUser.id)
      .maybeSingle()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Auto-create profile row if missing (e.g. after schema migration)
    // SECURITY: do NOT trust user_metadata.role — that field is settable by
    // the user during signup (`options.data.role`). If we read it here we
    // give the user a way to self-assign brand role + auto-approval. Always
    // hardcode the role to 'influencer' since this is the influencer-only
    // onboarding endpoint, and always start pending.
    if (!profile) {
      const meta = (authUser.user_metadata || {}) as Record<string, unknown>
      const { data: created, error: createErr } = await service
        .from('profiles')
        .upsert({
          id: authUser.id,
          email: authUser.email || '',
          role: 'influencer',
          full_name: meta.name || meta.username || '',
          onboarding_completed: false,
          approval_status: 'pending',
        }, { onConflict: 'id' })
        .select('id, email, role, onboarding_completed, approval_status, full_name')
        .single()

      if (createErr || !created) {
        console.error('Profile auto-create error:', createErr)
        return NextResponse.json({ error: 'Failed to initialize profile' }, { status: 500 })
      }
      profile = created
    }

    if ((profile.role || '').toLowerCase() !== 'influencer') {
      return NextResponse.json({ error: 'Not an influencer account' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const data = onboardingSchema.parse(body)
    const normalizedSocials = normalizeSocials(data.socials)
    const normalizedAffiliateStoreId = normalizeAmazonStoreId(data.affiliateStoreId) || null
    const normalizedAffiliateCode = normalizeAmazonTrackingId(data.affiliateCode) || null
    const fullName = [data.firstName?.trim(), data.lastName?.trim()].filter(Boolean).join(' ').trim()
    const normalizedDateOfBirth = normalizeDateOfBirth(data.dateOfBirth)


    const currentMetadata = (authUser.user_metadata || {}) as Record<string, unknown>
    const nextMetadata: Record<string, unknown> = {
      ...currentMetadata,
      date_of_birth: normalizedDateOfBirth,
      generation_tag: getGenerationTagFromDob(normalizedDateOfBirth),
    }

    const metadataNeedsUpdate =
      currentMetadata.date_of_birth !== nextMetadata.date_of_birth ||
      currentMetadata.generation_tag !== nextMetadata.generation_tag

    if (metadataNeedsUpdate) {
      const { error: metadataError } = await service.auth.admin.updateUserById(authUser.id, {
        user_metadata: nextMetadata,
      })

      if (metadataError) {
        console.error('Failed to update influencer demographics metadata:', metadataError)
        return NextResponse.json({ error: 'Failed to save date of birth' }, { status: 500 })
      }
    }

    if (fullName && fullName !== String(profile.full_name || '').trim()) {
      const { error: profileUpdateError } = await service
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', authUser.id)

      if (profileUpdateError) {
        console.error('Failed to update profile name:', profileUpdateError)
        return NextResponse.json({ error: 'Failed to save your name' }, { status: 500 })
      }
    }

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
          socials: normalizedSocials,
          affiliate_store_id: normalizedAffiliateStoreId,
          affiliate_code: normalizedAffiliateCode,
          bio: data.bio,
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
      if (data.socials) updateData.socials = normalizedSocials
      if (typeof data.affiliateStoreId !== 'undefined') updateData.affiliate_store_id = normalizedAffiliateStoreId
      if (typeof data.affiliateCode !== 'undefined') updateData.affiliate_code = normalizedAffiliateCode
      if (data.bio) updateData.bio = data.bio

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

    // Check if onboarding is complete
    const hasFullName = fullName || profile.full_name
    const hasDateOfBirth = Boolean(normalizedDateOfBirth || currentMetadata.date_of_birth)
    const hasGender = data.gender || infProfile?.gender
    const hasCategories = (data.preferredCategories && data.preferredCategories.length > 0) ||
      (Array.isArray(infProfile?.preferred_categories) && infProfile.preferred_categories.length > 0)
    const existingSocials = normalizeSocials(infProfile?.socials)
    const hasSocials = Object.keys(normalizedSocials).length > 0 || Object.keys(existingSocials).length > 0

    const isCompleted = Boolean(hasFullName && hasDateOfBirth && hasGender && hasCategories && hasSocials)

    const currentApprovalStatus = String(profile.approval_status || 'none').toLowerCase()
    const isResubmission = currentApprovalStatus === 'rejected'

    // Update profiles table when onboarding completes.
    // Rejected creators should be able to edit and resubmit back into review.
    if (isCompleted) {
      const profileUpdate: Record<string, unknown> = {}

      if (!profile.onboarding_completed) {
        profileUpdate.onboarding_completed = true
      }

      if (isResubmission || currentApprovalStatus === 'none') {
        profileUpdate.approval_status = 'pending'
      }

      if (Object.keys(profileUpdate).length > 0) {
        await service
          .from('profiles')
          .update(profileUpdate)
          .eq('id', authUser.id)
      }
    }

    const redirectTo = isCompleted
      ? isResubmission
        ? '/influencer/pending?resubmitted=1'
        : '/influencer/pending'
      : null

    return NextResponse.json({
      success: true,
      onboardingCompleted: isCompleted,
      redirectTo,
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
      .select('onboarding_completed, approval_status, email, full_name')
      .eq('id', authUser.id)
      .maybeSingle()

    if (!profile) {
      return NextResponse.json({ onboardingCompleted: false })
    }

    // Get influencer profile data
    const { data: infProfile } = await service
      .from('influencer_profiles')
      .select('*')
      .eq('user_id', authUser.id)
      .maybeSingle()

    const { data: authLookup } = await service.auth.admin.getUserById(authUser.id)
    const metadata = (authLookup.user?.user_metadata || authUser.user_metadata || {}) as Record<string, unknown>
    const dateOfBirth = normalizeDateOfBirth(metadata.date_of_birth)
    const generationTag = getGenerationTagFromDob(dateOfBirth)

    return NextResponse.json({
      onboardingCompleted: profile.onboarding_completed || false,
      approvalStatus: (profile.approval_status || 'none').toLowerCase(),
      email: profile.email || '',
      fullName: profile.full_name || '',
      dateOfBirth,
      generationTag,
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
        affiliateStoreId: normalizeAmazonStoreId(infProfile.affiliate_store_id),
        affiliateCode: normalizeAmazonTrackingId(infProfile.affiliate_code),
      } : null,
    })
  } catch (error) {
    console.error('Onboarding check error:', error)
    return NextResponse.json({ onboardingCompleted: false })
  }
}
