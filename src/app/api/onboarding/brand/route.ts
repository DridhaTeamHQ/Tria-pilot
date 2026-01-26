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
import { z } from 'zod'
import { nanoid } from 'nanoid'

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
 * SAFE: Ensures User and BrandProfile exist in Prisma
 * Uses smart lookup to handle edge cases where user may exist with same email
 * 
 * Strategy:
 * 1. Try to find user by authId first
 * 2. If not found, check by email (handles previous signup attempts)
 * 3. If user exists by email with different ID -> update their ID to match auth
 * 4. Create only as last resort
 */
async function ensureBrandProfile(authId: string, email: string) {
  // First: Try to find user by auth ID
  let dbUser = await prisma.user.findUnique({
    where: { id: authId },
    include: { brandProfile: true },
  })

  if (dbUser) {
    // User exists with correct ID - ensure they have a brand profile
    if (!dbUser.brandProfile) {
      console.log(`Creating BrandProfile for existing user ${authId}`)
      await prisma.brandProfile.create({
        data: {
          userId: authId,
          companyName: 'My Brand', // Required placeholder
          targetAudience: [],
          productTypes: [],
          onboardingCompleted: false,
        },
      })
      dbUser = await prisma.user.findUnique({
        where: { id: authId },
        include: { brandProfile: true },
      })
    }
    return dbUser
  }

  // Second: Check if user exists by email (edge case - previous signup with different ID)
  const existingByEmail = await prisma.user.findUnique({
    where: { email },
    include: { brandProfile: true },
  })

  if (existingByEmail) {
    // User exists with this email but different ID
    // Update their ID to match the current auth ID (link accounts)
    console.log(`Linking existing user ${existingByEmail.id} to auth ID ${authId}`)
    dbUser = await prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        id: authId  // Update to match Supabase auth ID
      },
      include: { brandProfile: true },
    })

    // Ensure they have a brand profile
    if (!dbUser.brandProfile) {
      await prisma.brandProfile.create({
        data: {
          userId: authId,
          companyName: 'My Brand',
          targetAudience: [],
          productTypes: [],
          onboardingCompleted: false,
        },
      })
      dbUser = await prisma.user.findUnique({
        where: { id: authId },
        include: { brandProfile: true },
      })
    }
    return dbUser
  }

  // Third: No user exists at all - create new user with profile
  console.log(`Creating new Prisma user for brand ${authId}`)
  dbUser = await prisma.user.create({
    data: {
      id: authId,
      email,
      role: 'BRAND',
      slug: `brand-${nanoid(8)}`,
      brandProfile: {
        create: {
          companyName: 'My Brand',
          targetAudience: [],
          productTypes: [],
          onboardingCompleted: false,
        },
      },
    },
    include: { brandProfile: true },
  })

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

    if (profile.role !== 'brand') {
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
          approval_status: 'approved',
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
