import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/auth'
import { deleteUpload } from '@/lib/storage'

const BUCKET = 'profile-images'

async function getDbUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser?.email) return null

  const db = prisma as any
  const dbUser = await db.user.findUnique({
    where: { email: authUser.email },
    select: { id: true },
  })

  return dbUser?.id ?? null
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getDbUserId()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = prisma as any
    const { id } = await ctx.params
    const body = await request.json().catch(() => null)
    const label: unknown = body?.label
    const makePrimary: unknown = body?.makePrimary

    const existing = await db.userProfileImage.findFirst({
      where: { id, userId },
      select: { id: true },
    })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updated = await db.$transaction(async (tx: any) => {
      if (makePrimary === true) {
        await tx.userProfileImage.updateMany({ where: { userId }, data: { isPrimary: false } })
      }

      return await tx.userProfileImage.update({
        where: { id },
        data: {
          ...(typeof label === 'string' ? { label: label.slice(0, 60) } : {}),
          ...(makePrimary === true ? { isPrimary: true } : {}),
        },
        select: { id: true, imageUrl: true, label: true, isPrimary: true, createdAt: true },
      })
    })

    return NextResponse.json({ image: updated })
  } catch (error) {
    console.error('Profile images PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update profile image' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getDbUserId()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = prisma as any
    const { id } = await ctx.params
    const existing = await db.userProfileImage.findFirst({
      where: { id, userId },
      select: { id: true, imagePath: true, isPrimary: true },
    })

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await db.$transaction(async (tx: any) => {
      await tx.userProfileImage.delete({ where: { id } })
      if (existing.isPrimary) {
        const newest = await tx.userProfileImage.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        })
        if (newest) {
          await tx.userProfileImage.update({ where: { id: newest.id }, data: { isPrimary: true } })
        }
      }
    })

    // Storage delete after DB delete (best-effort)
    try {
      await deleteUpload(existing.imagePath, BUCKET)
    } catch (storageErr) {
      console.warn('Failed to delete profile image from storage (non-fatal):', storageErr)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Profile images DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete profile image' }, { status: 500 })
  }
}


