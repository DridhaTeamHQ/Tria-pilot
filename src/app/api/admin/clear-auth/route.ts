import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const supabase = await createServiceClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', authUser.id).single()
    if ((profile?.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    if (!body || body.confirm !== true) {
      return NextResponse.json({ error: 'Confirm required' }, { status: 400 })
    }

    // Clear Auth Users (Supabase Admin)
    let page = 1
    let totalDeleted = 0
    while (true) {
      const { data: users, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 })
      if (error || !users?.users?.length) break

      for (const user of users.users) {
        await supabase.auth.admin.deleteUser(user.id)
        totalDeleted++
      }
      if (users.users.length < 100) break
      page++
    }

    return NextResponse.json({
      success: true,
      deleted: { authUsers: totalDeleted, prismaUsers: 0 },
      message: 'Auth cleared (Prisma skipped)'
    })

  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
