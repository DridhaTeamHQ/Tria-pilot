import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Optimized - only select id
    const dbUser = await prisma.user.findUnique({
      where: { email: authUser.email!.toLowerCase().trim() },
      select: { id: true },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const unreadCount = await prisma.notification.count({
      where: { userId: dbUser.id, isRead: false },
    })

    // Add caching headers - notifications update frequently but can be cached briefly
    return NextResponse.json(
      {
        notifications,
        unreadCount,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=10, stale-while-revalidate=30', // 10s cache, 30s stale
        },
      }
    )
  } catch (error) {
    console.error('Notifications fetch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

