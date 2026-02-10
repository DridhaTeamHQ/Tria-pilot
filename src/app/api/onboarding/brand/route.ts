/**
 * BRAND ONBOARDING API
 * 
 * CRITICAL: This endpoint uses Supabase profiles as source of truth.
 * Onboarding data is stored in profiles JSONB column (brand_data).
 * 
 * On submission:
 * 1. Verify user exists in profiles
 * 2. Store/update brand onboarding data
 * 3. Update profiles:
 *    UPDATE profiles
 *    SET onboarding_completed = true,
 *        approval_status = 'approved'
 *    WHERE id = user.id;
 * 
 * ⚠️ Brands do NOT need admin approval
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import { z } from 'zod'

const onboardingSchema = z
  .object({
    companyName: z.string().trim().max(120).optional(),
    brandType: z.string().trim().max(80).optional(),
    targetAudience: z.array(z.string().trim().max(80)).max(20).optional(),
    productTypes: z.array(z.string().trim().max(80)).max(50).optional(),
    website: z.string().trim().url().max(2048).optional().or(z.literal('')),
    vertical: z.string().trim().max(120).optional(),
    budgetRange: z.string().trim().max(80).optional(),
  })
  .strict()

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get profile from profiles table (SOURCE OF TRUTH)
    const service = createServiceClient()
    const { data: profile, error: profileError } = await service
      .from('profiles')
      .select('id, email, role, onboarding_completed, brand_data')
      .eq('id', authUser.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json({ error: 'Profile not found in database' }, { status: 404 })
    }

    if ((profile.role || '').toLowerCase() !== 'brand') {
      return NextResponse.json({ error: 'Not a brand account' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const data = onboardingSchema.parse(body)

    // Determine if onboarding is completed (RELAXED RULES)
    // Only require: company name
    const isCompleted = Boolean(
      data.companyName && data.companyName.trim() !== ''
    )

    // Merge with existing brand_data
    const existingData = (profile.brand_data as Record<string, unknown>) || {}
    const newBrandData = {
      ...existingData,
      ...(data.companyName && { companyName: data.companyName }),
      ...(data.brandType && { brandType: data.brandType }),
      ...(data.targetAudience && { targetAudience: data.targetAudience }),
      ...(data.productTypes && { productTypes: data.productTypes }),
      ...(data.website !== undefined && { website: data.website || null }),
      ...(data.vertical && { vertical: data.vertical }),
      ...(data.budgetRange && { budgetRange: data.budgetRange }),
    }

    // Update profiles table with brand data
    const updateData: Record<string, unknown> = {
      brand_data: newBrandData,
    }

    // Mark onboarding as completed if all required fields present
    if (isCompleted && !profile.onboarding_completed) {
      updateData.onboarding_completed = true
      updateData.approval_status = 'approved' // Brands auto-approved
    }

    const { error: updateError } = await service
      .from('profiles')
      .update(updateData)
      .eq('id', authUser.id)

    if (updateError) {
      console.error('Profile update error:', updateError)
      return NextResponse.json({ error: 'Failed to save brand data' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      onboardingCompleted: isCompleted,
      redirectTo: isCompleted ? '/dashboard' : null,
    })
  } catch (error) {
    console.error('Onboarding error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
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

    // Get from profiles table (SOURCE OF TRUTH)
    const service = createServiceClient()
    const { data: profile } = await service
      .from('profiles')
      .select('email, role, onboarding_completed, brand_data')
      .eq('id', authUser.id)
      .single()

    if (!profile) {
      return NextResponse.json({ onboardingCompleted: false })
    }

    if ((profile.role || '').toLowerCase() !== 'brand') {
      return NextResponse.json({ error: 'Not a brand account' }, { status: 403 })
    }

    // Return brand data from profiles
    const brandData = (profile.brand_data as Record<string, unknown>) || {}

    return NextResponse.json({
      onboardingCompleted: profile.onboarding_completed || false,
      profile: {
        companyName: brandData.companyName || '',
        brandType: brandData.brandType || '',
        targetAudience: brandData.targetAudience || [],
        productTypes: brandData.productTypes || [],
        website: brandData.website || '',
        vertical: brandData.vertical || '',
        budgetRange: brandData.budgetRange || '',
      },
    })
  } catch (error) {
    console.error('Onboarding check error:', error)
    return NextResponse.json({ onboardingCompleted: false })
  }
}
