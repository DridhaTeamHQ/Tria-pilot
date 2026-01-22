import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * Admin endpoint to clear all authentication data
 * 
 * WARNING: This is a destructive operation!
 * 
 * POST /api/admin/clear-auth
 * Body: { 
 *   confirm: true,
 *   includePrisma?: boolean 
 * }
 */
export async function POST(request: Request) {
  try {
    // Verify admin access
    const supabase = await createServiceClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: adminRow } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', authUser.id)
      .single()

    if (!adminRow) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    if (!body || body.confirm !== true) {
      return NextResponse.json(
        { error: 'Must confirm with { confirm: true }' },
        { status: 400 }
      )
    }

    const includePrisma = body.includePrisma === true

    console.log('🧹 Starting auth data cleanup...')

    // 1. Delete all Supabase Auth users
    let page = 1
    let totalDeleted = 0
    const deletedUserIds: string[] = []

    while (true) {
      const { data: users, error } = await supabase.auth.admin.listUsers({
        page,
        perPage: 100,
      })

      if (error) {
        console.error('Error fetching users:', error)
        break
      }

      if (!users?.users || users.users.length === 0) {
        break
      }

      for (const user of users.users) {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
        if (deleteError) {
          console.error(`Failed to delete user ${user.email}:`, deleteError.message)
        } else {
          deletedUserIds.push(user.id)
          totalDeleted++
        }
      }

      if (users.users.length < 100) {
        break
      }
      page++
    }

    // 2. Clear Supabase tables
    const tables = ['influencer_applications', 'admin_users']
    for (const table of tables) {
      try {
        await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
      } catch (err) {
        console.error(`Error clearing ${table}:`, err)
      }
    }

    // 3. Optionally clear Prisma data
    let prismaDeleted = 0
    if (includePrisma) {
      try {
        // Delete all users (cascade will handle related records)
        const result = await prisma.user.deleteMany({})
        prismaDeleted = result.count
      } catch (err) {
        console.error('Error clearing Prisma data:', err)
      }
    }

    console.log(`✅ Cleanup complete: ${totalDeleted} auth users deleted`)

    return NextResponse.json({
      success: true,
      deleted: {
        authUsers: totalDeleted,
        prismaUsers: prismaDeleted,
        tables: tables.length,
      },
      message: 'Authentication data cleared successfully',
    })
  } catch (error) {
    console.error('Clear auth error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
