import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { calculateBadge } from '@/lib/influencer/badge-calculator'
import { z } from 'zod'

const onboardingSchema = z
  .object({
    // Handle empty strings by transforming them to undefined
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
      .union([z.number().min(0).max(100), z.string(), z.null()])
      .transform((val) => {
        if (val === '' || val === null) return undefined
        const num = typeof val === 'string' ? parseFloat(val) : val
        return isNaN(num) ? undefined : num
      })
      .optional(),
    retentionRate: z
      .union([z.number().min(0).max(100), z.string(), z.null()])
      .transform((val) => {
        if (val === '' || val === null) return undefined
        const num = typeof val === 'string' ? parseFloat(val) : val
        return isNaN(num) ? undefined : num
      })
      .optional(),
    // Add followers and engagementRate for ranking
    followers: z
      .union([z.number().int().min(0), z.string(), z.null()])
      .transform((val) => {
        if (val === '' || val === null) return undefined
        const num = typeof val === 'string' ? parseInt(val, 10) : val
        return isNaN(num) ? undefined : num
      })
      .optional(),
    engagementRate: z
      .union([z.number().min(0).max(1), z.string(), z.null()])
      .transform((val) => {
        if (val === '' || val === null) return undefined
        const num = typeof val === 'string' ? parseFloat(val) : val
        // If > 1, assume it's a percentage and convert (e.g., 5.5% -> 0.055)
        if (!isNaN(num) && num > 1) return num / 100
        return isNaN(num) ? undefined : num
      })
      .optional(),
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
      include: { influencerProfile: true },
    })

    if (!dbUser || dbUser.role !== 'INFLUENCER' || !dbUser.influencerProfile) {
      return NextResponse.json({ error: 'Influencer profile not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => null)
    const data = onboardingSchema.parse(body)

    // Calculate badge using updated or existing values
    const finalFollowers = data.followers ?? dbUser.influencerProfile.followers ?? 0
    const finalEngagementRate = data.engagementRate !== undefined 
      ? Number(data.engagementRate) 
      : Number(dbUser.influencerProfile.engagementRate ?? 0)
    const finalAudienceRate = data.audienceRate ?? dbUser.influencerProfile.audienceRate?.toNumber?.() ?? 0
    const finalRetentionRate = data.retentionRate ?? dbUser.influencerProfile.retentionRate?.toNumber?.() ?? 0

    const badge = calculateBadge({
      followers: finalFollowers,
      engagementRate: finalEngagementRate,
      audienceRate: finalAudienceRate,
      retentionRate: finalRetentionRate,
    })

    // Determine if onboarding is completed (all required fields present)
    const isCompleted = Boolean(
      data.gender &&
      data.niches &&
      data.niches.length > 0 &&
      data.audienceType &&
      data.audienceType.length > 0 &&
      data.preferredCategories &&
      data.preferredCategories.length > 0 &&
      data.socials &&
      Object.keys(data.socials).length > 0 &&
      data.bio &&
      data.audienceRate !== undefined &&
      data.retentionRate !== undefined
    )

    // CRITICAL: Update influencer profile with onboarding data
    // This write must succeed for admin to see the application
    // Ensure all data is persisted correctly
    const updated = await prisma.influencerProfile.update({
      where: { id: dbUser.influencerProfile.id },
      data: {
        ...(data.gender && { gender: data.gender }),
        ...(data.niches && { niches: data.niches }),
        ...(data.audienceType && { audienceType: data.audienceType }),
        ...(data.preferredCategories && { preferredCategories: data.preferredCategories }),
        ...(data.socials && { socials: data.socials }),
        ...(data.bio && { bio: data.bio }),
        ...(data.audienceRate !== undefined && { audienceRate: data.audienceRate }),
        ...(data.retentionRate !== undefined && { retentionRate: data.retentionRate }),
        ...(data.followers !== undefined && { followers: data.followers }),
        ...(data.engagementRate !== undefined && { engagementRate: data.engagementRate }),
        badgeScore: badge.score,
        badgeTier: badge.tier,
        onboardingCompleted: isCompleted, // CRITICAL: Must be set to true when onboarding completes
      },
    })

    // DEFENSIVE: Verify the write succeeded
    if (!updated || updated.onboardingCompleted !== isCompleted) {
      console.error('CRITICAL: Onboarding write failed or incomplete', {
        userId: dbUser.id,
        expectedCompleted: isCompleted,
        actualCompleted: updated?.onboardingCompleted,
      })
      // Don't throw - continue to create application entry
    } else {
      console.log('Onboarding data persisted successfully', {
        userId: dbUser.id,
        onboardingCompleted: updated.onboardingCompleted,
      })
    }

    // CRITICAL STATE TRANSITION: Set approval_status = 'pending' ONLY when onboarding completes
    // This is the ONLY place where 'pending' should be set
    // State model: onboardingCompleted = true → approval_status = 'pending'
    if (isCompleted && !dbUser.influencerProfile.onboardingCompleted) {
      try {
        const { createServiceClient } = await import('@/lib/auth')
        const service = createServiceClient()
        
        // CRITICAL: Update profiles table with approval_status = 'pending'
        // Try profiles table first (if it exists)
        const { data: profileData, error: profileError } = await service
          .from('profiles')
          .update({
            onboarding_completed: true,
            approval_status: 'pending', // Set to pending ONLY when onboarding completes
          })
          .eq('id', dbUser.id)
          .select()
          .single()

        if (profileError) {
          // Profiles table might not exist or update failed - fallback to influencer_applications
          console.warn('profiles table update failed, using influencer_applications fallback:', profileError.message)
          
          // Fallback: Update influencer_applications (backward compatibility)
          const { data: appData, error: appError } = await service
            .from('influencer_applications')
            .upsert(
              {
                user_id: dbUser.id, // CRITICAL: Use Prisma user.id (matches auth.users.id)
                email: dbUser.email,
                full_name: dbUser.name || null,
                status: 'pending', // Set to pending ONLY when onboarding completes
              },
              {
                onConflict: 'user_id', // Update if exists, create if not
              }
            )
            .select()
            .single()

          if (appError) {
            console.error('Failed to create/update influencer application status:', {
              error: appError,
              userId: dbUser.id,
              email: dbUser.email,
            })
          } else {
            console.log('Successfully created/updated influencer application (fallback):', {
              userId: dbUser.id,
              status: appData?.status,
            })
          }
        } else {
          console.log('Successfully updated profiles table:', {
            userId: dbUser.id,
            approval_status: profileData?.approval_status,
            onboarding_completed: profileData?.onboarding_completed,
          })
        }
      } catch (appError) {
        console.error('Exception updating approval status:', {
          error: appError,
          userId: dbUser.id,
          email: dbUser.email,
        })
      }
    }

    return NextResponse.json({ profile: updated, onboardingCompleted: updated.onboardingCompleted })
  } catch (error) {
    console.error('Onboarding error:', error)
    
    // Handle Zod validation errors with better messages
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      return NextResponse.json(
        { 
          error: `Validation error: ${firstError.path.join('.')} - ${firstError.message}`,
          details: error.errors 
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
      include: { influencerProfile: true },
    })

    if (!dbUser || dbUser.role !== 'INFLUENCER' || !dbUser.influencerProfile) {
      return NextResponse.json({ onboardingCompleted: false })
    }

    return NextResponse.json({
      onboardingCompleted: dbUser.influencerProfile.onboardingCompleted,
      profile: dbUser.influencerProfile,
    })
  } catch (error) {
    console.error('Onboarding check error:', error)
    return NextResponse.json({ onboardingCompleted: false })
  }
}

