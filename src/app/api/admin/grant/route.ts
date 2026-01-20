import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/auth'
import crypto from 'crypto'

const schema = z
  .object({
    code: z.string().min(6).max(128),
    user_id: z.string().uuid().optional(),
    email: z.string().trim().toLowerCase().email().max(320).optional(),
    password: z.string().min(8).max(128).optional(),
  })
  .strict()
  .refine(
    (data) => data.user_id || (data.email && data.password),
    { message: 'Provide user_id or email + password' }
  )

function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

function getProjectRefFromUrl(url: string | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const host = u.hostname // e.g. abcdefg.supabase.co
    const ref = host.split('.')[0]
    return ref || null
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const signupCode = process.env.ADMIN_SIGNUP_CODE
    if (!signupCode) {
      return NextResponse.json(
        { error: 'ADMIN_SIGNUP_CODE is not configured' },
        { status: 500 }
      )
    }

    // These must all point to the SAME Supabase project for admin provisioning to work.
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Supabase public env vars are not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)' },
        { status: 500 }
      )
    }

    const body = await request.json().catch(() => null)
    const { user_id, email, password, code } = schema.parse(body)

    if (!safeEqual(code, signupCode)) {
      return NextResponse.json({ error: 'Invalid admin signup code' }, { status: 403 })
    }

    // Verify service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          error: 'SUPABASE_SERVICE_ROLE_KEY is not configured',
          hint: 'Add SUPABASE_SERVICE_ROLE_KEY to your .env.local file. Get it from Supabase Dashboard → Settings → API → service_role key (secret)',
        },
        { status: 500 }
      )
    }

    const service = createServiceClient()

    // Verify environment variables are from the same project
    const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const publicRef = getProjectRefFromUrl(publicUrl)
    
    // Test service role connection by trying to list users (limited to 1)
    let serviceRoleWorks = false
    try {
      const { data: testData, error: testError } = await service.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      })
      serviceRoleWorks = !testError && testData !== null
    } catch (testErr) {
      console.warn('Service role connection test failed:', testErr)
    }

    let resolvedUserId = user_id || null
    const normalizedEmail = email?.trim().toLowerCase()

    // If no user_id provided, create the admin user via service role
    if (!resolvedUserId && normalizedEmail && password) {
      const { data: created, error: createError } = await service.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
      })

      if (createError) {
        // If user already exists, try to find them by email
        if (
          createError.message?.toLowerCase().includes('already registered') ||
          createError.message?.toLowerCase().includes('already exists')
        ) {
          try {
            const { data: listData } = await service.auth.admin.listUsers({
              page: 1,
              perPage: 1000,
            })
            const existing = listData?.users?.find(
              (u) => u.email?.toLowerCase() === normalizedEmail
            )
            if (existing?.id) {
              resolvedUserId = existing.id
            }
          } catch (listErr) {
            console.warn('Failed to find existing admin user by email:', listErr)
          }
        }

        if (!resolvedUserId) {
          return NextResponse.json(
            { error: createError.message || 'Failed to create admin user' },
            { status: 400 }
          )
        }
      } else if (created?.user?.id) {
        resolvedUserId = created.user.id
      }
    }

    if (!resolvedUserId) {
      return NextResponse.json(
        { error: 'Admin user could not be created or found.' },
        { status: 500 }
      )
    }

    // Try multiple approaches to verify user exists and get user data
    // Approach 1: Try getUserById (most direct)
    // Approach 2: Try listing users and finding by email (if we have email from frontend)
    // Approach 3: Just try to insert and handle foreign key errors
    
    let authUserExists = false
    let authUser: any = null
    let lastAuthError: string | null = null
    let lastErrorCode: string | null = null
    
    // First, try to get user by ID with retries
    for (let i = 0; i < 5; i++) {
      const { data, error } = await service.auth.admin.getUserById(resolvedUserId)
      if (data?.user) {
        authUserExists = true
        authUser = data.user
        break
      }
      lastAuthError = error?.message || null
      lastErrorCode = error?.status?.toString() || null
      
      // Short delay between retries
      if (i < 4) await sleep(300)
    }
    
    // If getUserById failed, try listing users (this sometimes works when getUserById doesn't)
    if (!authUserExists) {
      try {
        const { data: listData, error: listError } = await service.auth.admin.listUsers({
          page: 1,
          perPage: 1000, // Get enough to find our user
        })
        
        if (!listError && listData?.users) {
          const foundUser = listData.users.find(u => u.id === resolvedUserId)
          if (foundUser) {
            authUserExists = true
            authUser = foundUser
            console.log('Found user via listUsers instead of getUserById')
          }
        }
      } catch (listErr) {
        console.warn('listUsers fallback failed:', listErr)
      }
    }
    
    // If user exists, auto-confirm them (admin users don't need email confirmation)
    if (authUserExists && authUser) {
      if (authUser.email_confirmed_at === null) {
        try {
          await service.auth.admin.updateUserById(resolvedUserId, {
            email_confirm: true,
          })
          console.log('Auto-confirmed admin user email')
        } catch (confirmError) {
          console.warn('Failed to auto-confirm admin user:', confirmError)
          // Continue anyway - user exists
        }
      }
    }

    // If user still not found, try to insert anyway - Supabase will give us a better error
    // if it's a foreign key constraint issue, which means the user truly doesn't exist
    // If it succeeds, the user exists but wasn't visible via admin API (edge case)
    if (!authUserExists) {
      console.warn('User not found via admin API, attempting direct insert to test...')
      
      // Try to insert - if user exists, this will work. If not, we'll get a foreign key error
      const { error: insertError } = await service
        .from('admin_users')
        .upsert({ user_id: resolvedUserId }, { onConflict: 'user_id' })
      
      if (insertError) {
        // Check if it's a foreign key constraint error (user doesn't exist)
        if (insertError.message?.includes('foreign key') || 
            insertError.message?.includes('violates foreign key') ||
            insertError.code === '23503') {
          const ref = getProjectRefFromUrl(publicUrl)
          
          let errorDetails: Record<string, any> = {
            error: 'Auth user not found in this Supabase project.',
            hint: 'The user was created in Supabase Auth, but cannot be found by the admin API. This can happen if: (1) There is a replication delay (try again in a few seconds), (2) Email confirmation is required and the user hasn\'t confirmed yet, or (3) The user was created in a different Supabase project.',
            projectRef: ref,
            details: lastAuthError || insertError.message,
            errorCode: lastErrorCode,
            suggestion: 'Try waiting 5-10 seconds and registering again, or check Supabase Dashboard → Authentication → Users to verify the user was created.',
          }

          if (!serviceRoleWorks) {
            errorDetails.hint = 'Service role key cannot connect to Supabase. Verify SUPABASE_SERVICE_ROLE_KEY is correct.'
            errorDetails.serviceRoleConnection = 'failed'
          } else {
            errorDetails.serviceRoleConnection = 'working'
          }

          console.error('Admin grant - Auth user not found:', {
            user_id: resolvedUserId,
            publicRef: ref,
            lastAuthError,
            insertError: insertError.message,
            serviceRoleWorks,
          })

          return NextResponse.json(errorDetails, { status: 500 })
        }
        // Some other error - return it
        throw insertError
      }
      
      // Insert succeeded! User exists but wasn't visible via admin API
      console.log('User exists (insert succeeded), but was not visible via admin API')
      return NextResponse.json({ success: true, note: 'User granted admin access (insert method)' })
    }

    const { error } = await service
      .from('admin_users')
      .upsert({ user_id: resolvedUserId }, { onConflict: 'user_id' })

    if (error) {
      // Common causes:
      // - SUPABASE_SERVICE_ROLE_KEY not set or incorrect (will show auth error)
      // - Table/RLS misconfiguration (will show RLS violation)
      console.error('Admin grant error:', error)
      return NextResponse.json(
        {
          error: error.message || 'Failed to grant admin access',
          hint: (error as any).hint || (error as any).details || null,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

