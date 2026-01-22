/**
 * BRAND ONBOARDING API
 * 
 * On submission:
 * - Save brand data
 * - Set onboarding_completed = true
 * - approval_status remains unchanged (brands don't need approval)
 * - Redirect to dashboard
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

    const dbUser = await prisma.user.findUnique({
      where: { email: authUser.email! },
      include: { brandProfile: true },
    })

    if (!dbUser || dbUser.role !== 'BRAND' || !dbUser.brandProfile) {
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

    // Update brand profile
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

    // CRITICAL: Update profiles table when onboarding completes
    // Brands do NOT need approval - approval_status can stay as 'draft' or be set to 'approved'
    if (isCompleted && !dbUser.brandProfile.onboardingCompleted) {
      const service = createServiceClient()
      await service
        .from('profiles')
        .update({
          onboarding_completed: true,
          // approval_status remains unchanged (brands don't need approval)
        })
        .eq('id', dbUser.id)
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

    const dbUser = await prisma.user.findUnique({
      where: { email: authUser.email! },
      include: { brandProfile: true },
    })

    if (!dbUser || dbUser.role !== 'BRAND' || !dbUser.brandProfile) {
      return NextResponse.json({ onboardingCompleted: false })
    }

    return NextResponse.json({
      onboardingCompleted: dbUser.brandProfile.onboardingCompleted,
      profile: dbUser.brandProfile,
    })
  } catch (error) {
    console.error('Onboarding check error:', error)
    return NextResponse.json({ onboardingCompleted: false })
  }
}
