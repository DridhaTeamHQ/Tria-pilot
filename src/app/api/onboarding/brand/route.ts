/**
 * BRAND ONBOARDING API
 * 
 * On submission:
 * 1. Save brand data (upsert BrandProfile)
 * 2. Update profiles:
 *    UPDATE profiles
 *    SET onboarding_completed = true,
 *        approval_status = 'approved'
 *    WHERE id = user.id;
 * 
 * ⚠️ Brands do NOT need admin approval
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import prisma from '@/lib/prisma'
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
    const { data: profile } = await service
      .from('profiles')
      .select('id, role, onboarding_completed')
      .eq('id', authUser.id)
      .single()

    if (!profile || profile.role !== 'brand') {
      return NextResponse.json({ error: 'Brand profile not found' }, { status: 404 })
    }

    // Get Prisma user for BrandProfile (details only)
    const dbUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: { brandProfile: true },
    })

    if (!dbUser || !dbUser.brandProfile) {
      return NextResponse.json({ error: 'Brand profile not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => null)
    const data = onboardingSchema.parse(body)

    // Determine if onboarding is completed
    const isCompleted = Boolean(
      data.companyName &&
        data.brandType &&
        data.targetAudience &&
        data.targetAudience.length > 0 &&
        data.productTypes &&
        data.productTypes.length > 0 &&
        data.vertical &&
        data.budgetRange
    )

    // 1. Save brand data (upsert BrandProfile)
    await prisma.brandProfile.update({
      where: { id: dbUser.brandProfile.id },
      data: {
        ...(data.companyName && { companyName: data.companyName }),
        ...(data.brandType && { brandType: data.brandType }),
        ...(data.targetAudience && { targetAudience: data.targetAudience }),
        ...(data.productTypes && { productTypes: data.productTypes }),
        ...(data.website !== undefined && { website: data.website || null }),
        ...(data.vertical && { vertical: data.vertical }),
        ...(data.budgetRange && { budgetRange: data.budgetRange }),
        onboardingCompleted: isCompleted,
      },
    })

    // 2. CRITICAL: Update profiles table when onboarding completes
    // Brands do NOT need admin approval - set approval_status = 'approved'
    if (isCompleted && !profile.onboarding_completed) {
      await service
        .from('profiles')
        .update({
          onboarding_completed: true,
          approval_status: 'approved', // Brands get immediate approval
        })
        .eq('id', authUser.id)
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

export async function GET(request: Request) {
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
      .select('onboarding_completed')
      .eq('id', authUser.id)
      .single()

    if (!profile) {
      return NextResponse.json({ onboardingCompleted: false })
    }

    // Get brand details from Prisma
    const dbUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: { brandProfile: true },
    })

    return NextResponse.json({
      onboardingCompleted: profile.onboarding_completed || false,
      profile: dbUser?.brandProfile || null,
    })
  } catch (error) {
    console.error('Onboarding check error:', error)
    return NextResponse.json({ onboardingCompleted: false })
  }
}
