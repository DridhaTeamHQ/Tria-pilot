import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * Diagnostic endpoint to check user status in Supabase and Prisma
 * Helps debug authentication issues
 * 
 * Usage: POST /api/auth/diagnose
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

    // Check Supabase Auth users
    const { data: authUsers, error: authError } = await service.auth.admin.listUsers()
    
    const supabaseUser = authUsers?.users?.find(
      (u: any) => u.email?.toLowerCase().trim() === email
    )

    // Check Prisma database
    const prismaUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        createdAt: true,
      },
    })

    // Check influencer application if exists
    let influencerApp = null
    if (supabaseUser) {
      const { data: app } = await service
        .from('influencer_applications')
        .select('*')
        .eq('user_id', supabaseUser.id)
        .maybeSingle()
      influencerApp = app
    }

    return NextResponse.json({
      email,
      supabase: {
        exists: !!supabaseUser,
        userId: supabaseUser?.id || null,
        emailConfirmed: supabaseUser?.email_confirmed_at ? true : false,
        createdAt: supabaseUser?.created_at || null,
        lastSignIn: supabaseUser?.last_sign_in_at || null,
        confirmedAt: supabaseUser?.email_confirmed_at || null,
      },
      prisma: {
        exists: !!prismaUser,
        userId: prismaUser?.id || null,
        role: prismaUser?.role || null,
        name: prismaUser?.name || null,
        createdAt: prismaUser?.createdAt || null,
      },
      influencerApplication: influencerApp,
      status: {
        inSupabase: !!supabaseUser,
        inPrisma: !!prismaUser,
        emailConfirmed: supabaseUser?.email_confirmed_at ? true : false,
        needsProfileCompletion: !!supabaseUser && !prismaUser,
        canLogin: !!supabaseUser && (supabaseUser.email_confirmed_at ? true : false),
      },
      recommendations: getRecommendations(supabaseUser, prismaUser),
    })
  } catch (error) {
    console.error('Diagnostic error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

function getRecommendations(supabaseUser: any, prismaUser: any): string[] {
  const recommendations: string[] = []

  if (!supabaseUser) {
    recommendations.push('User does not exist in Supabase Auth. They need to register first.')
  } else if (!supabaseUser.email_confirmed_at) {
    recommendations.push('User email is not confirmed. They need to verify their email address.')
  }

  if (supabaseUser && !prismaUser) {
    recommendations.push('User exists in Supabase but not in Prisma. They should visit /complete-profile to sync their account.')
  }

  if (supabaseUser && prismaUser) {
    recommendations.push('User exists in both systems. Login should work if password is correct.')
  }

  return recommendations
}
