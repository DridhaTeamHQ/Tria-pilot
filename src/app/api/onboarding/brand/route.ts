/**
 * BRAND ONBOARDING API
 * 
 * CRITICAL: Users are created at SIGNUP, not during onboarding.
 * Onboarding ONLY UPDATES existing user data.
 * 
 * On submission:
 * 1. Find or link existing User/BrandProfile
 * 2. UPDATE (never create) user data with onboarding fields
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
import prisma from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/prisma-user'
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

/**
 * SAFE: Ensures User and BrandProfile exist in Prisma.
 * Uses getOrCreateUser (single source of truth); then ensure BrandProfile exists.
 */
async function ensureBrandProfile(authId: string, email: string, userMetadata?: { role?: string; name?: string }) {
  const user = await getOrCreateUser({
    id: authId,
    email,
    role: 'BRAND',
    user_metadata: userMetadata ?? undefined,
  })
  const prismaUserId = user.id

  let dbUser = await prisma.user.findUnique({
    where: { id: prismaUserId },
    include: { brandProfile: true },
  })
  if (!dbUser) throw new Error('User lost after getOrCreateUser (Impossible state)')

  if (!dbUser.brandProfile) {
    console.log('[ensureBrandProfile] Creating BrandProfile for userId', prismaUserId)
    await prisma.brandProfile.create({
      data: {
        userId: prismaUserId,
        companyName: 'My Brand',
        targetAudience: [],
        productTypes: [],
        onboardingCompleted: false,
      },
    })
    dbUser = await prisma.user.findUnique({
      where: { id: prismaUserId },
      include: { brandProfile: true },
    })
  }
  if (!dbUser) throw new Error('User lost after profile create')

  return dbUser
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

    // Get profile from profiles table (SOURCE OF TRUTH)
    const service = createServiceClient()
    const { data: profile, error: profileError } = await service
      .from('profiles')
      .select('id, email, role, onboarding_completed')
      .eq('id', authUser.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json({ error: 'Profile not found in database' }, { status: 404 })
    }

    if ((profile.role || '').toLowerCase() !== 'brand') {
      return NextResponse.json({ error: 'Not a brand account' }, { status: 403 })
    }

    // SAFE: Ensure Prisma records exist (handles all edge cases)
    const dbUser = await ensureBrandProfile(authUser.id, profile.email || authUser.email || '')

    if (!dbUser || !dbUser.brandProfile) {
      return NextResponse.json({ error: 'Failed to setup brand profile' }, { status: 500 })
    }

    const body = await request.json().catch(() => null)
    const data = onboardingSchema.parse(body)

    // Determine if onboarding is completed (RELAXED RULES)
    // Only require: company name
    // Other fields are optional for completion
    const isCompleted = Boolean(
      data.companyName && data.companyName.trim() !== ''
    )

    // UPDATE (never create) brand data
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
    // Brands do NOT need admin approval
    if (isCompleted && !profile.onboarding_completed) {
      await service
        .from('profiles')
        .update({
          onboarding_completed: true,
          approval_status: 'APPROVED',
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
      .select('email, onboarding_completed')
      .eq('id', authUser.id)
      .single()

    if (!profile) {
      return NextResponse.json({ onboardingCompleted: false })
    }

    // SAFE: Ensure Prisma records exist for GET as well
    const dbUser = await ensureBrandProfile(authUser.id, profile.email || authUser.email || '')

    return NextResponse.json({
      onboardingCompleted: profile.onboarding_completed || false,
      profile: dbUser?.brandProfile || null,
    })
  } catch (error) {
    console.error('Onboarding check error:', error)
    return NextResponse.json({ onboardingCompleted: false })
  }
}
