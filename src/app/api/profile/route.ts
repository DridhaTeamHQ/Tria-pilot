/**
 * PROFILE API - SUPABASE ONLY
 * 
 * GET - Fetch user profile
 * PATCH - Update user name
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import { z } from 'zod'

const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
  })
  .strict()

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = createServiceClient()
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const { name } = updateProfileSchema.parse(body)

    // Update profile in Supabase
    const { data: updated, error } = await service
      .from('profiles')
      .update({ full_name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', authUser.id)
      .select()
      .single()

    if (error) {
      console.error('Profile update error:', error)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.full_name,
        role: updated.role,
      }
    })
  } catch (error) {
    console.error('Profile update error:', error)
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

    // Fetch profile from Supabase
    const { data: profile, error } = await service
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (error || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check for influencer_profiles data
    let influencerData = null
    if ((profile.role || '').toLowerCase() === 'influencer') {
      const { data: infProfile } = await service
        .from('influencer_profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .single()

      if (infProfile) {
        influencerData = {
          id: infProfile.id,
          bio: infProfile.bio,
          niches: infProfile.niches || [],
          socials: infProfile.socials || {},
          audienceType: infProfile.audience_type || [],
          preferredCategories: infProfile.preferred_categories || [],
          followers: infProfile.followers,
          engagementRate: infProfile.engagement_rate,
          audienceRate: infProfile.audience_rate,
          retentionRate: infProfile.retention_rate,
          badgeTier: infProfile.badge_tier,
          badgeScore: infProfile.badge_score,
          gender: infProfile.gender,
        }
      }
    }

    return NextResponse.json({
      user: {
        id: profile.id,
        name: profile.full_name,
        email: profile.email,
        role: (profile.role || 'influencer').toUpperCase(),
        createdAt: profile.created_at,
        influencerProfile: influencerData,
      }
    })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
