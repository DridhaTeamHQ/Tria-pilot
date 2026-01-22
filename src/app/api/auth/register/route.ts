/**
 * REGISTRATION API
 * 
 * CRITICAL: On signup success:
 * INSERT INTO profiles (id, email, role)
 * VALUES (auth.user.id, auth.user.email, selectedRole)
 * ON CONFLICT (id) DO NOTHING;
 * 
 * ❌ STOP creating users in:
 * - public.User
 * - influencer_applications
 * 
 * profiles table is the ONLY source of truth.
 */
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/auth'
import { z } from 'zod'

const registerSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().trim().toLowerCase().email().max(320),
    role: z.enum(['influencer', 'brand']), // Use lowercase to match profiles table
    name: z.string().trim().max(120).optional(),
  })
  .strict()

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const parsed = registerSchema.parse(body)
    const email = parsed.email.trim().toLowerCase()
    const { id, role, name } = parsed

    const service = createServiceClient()

    // CRITICAL: ONLY create profile in profiles table
    // Use upsert to handle idempotency (ON CONFLICT DO NOTHING)
    const { data: profile, error } = await service
      .from('profiles')
      .upsert(
        {
          id, // auth.users.id
          email,
          role,
          onboarding_completed: false,
          approval_status: 'none', // Default to 'none' (not 'draft')
        },
        {
          onConflict: 'id', // If profile exists, do nothing (idempotent)
        }
      )
      .select()
      .single()

    if (error) {
      console.error('Error creating profile:', error)
      return NextResponse.json(
        { error: 'Failed to create profile' },
        { status: 500 }
      )
    }

    // Return profile (not User)
    return NextResponse.json(
      {
        profile,
        message: 'Profile created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)

    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as { issues: Array<{ path: string[]; message: string }> }
      const firstError = zodError.issues[0]
      if (firstError) {
        return NextResponse.json(
          { error: `Invalid ${firstError.path.join('.')}: ${firstError.message}` },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
