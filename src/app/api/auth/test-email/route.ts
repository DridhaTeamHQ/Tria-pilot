import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/auth'

/**
 * Test endpoint to check email configuration
 * POST /api/auth/test-email
 * Body: { email: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || !body.email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const email = body.email.trim().toLowerCase()
    const service = createServiceClient()

    // Check Supabase email configuration
    const config = {
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    }

    // Try to send a test confirmation email
    const { data, error } = await service.auth.admin.generateLink({
      type: 'signup',
      email: email,
      password: 'TempPassword123!', // Temporary password for testing
      options: {
        redirectTo: `${config.siteUrl}/auth/confirm?next=/login?confirmed=true`,
      },
    })

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        config,
        details: {
          code: error.status,
          message: error.message,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      config,
      link: data?.properties?.action_link,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        config: {
          siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
      },
      { status: 500 }
    )
  }
}
