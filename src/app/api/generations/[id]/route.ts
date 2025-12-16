import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/auth'
import { deleteUpload } from '@/lib/storage'

const BUCKET = 'try-ons'

async function getDbUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser?.email) return null

  const db = prisma as any
  const dbUser = await db.user.findUnique({
    where: { email: authUser.email.toLowerCase().trim() },
    select: { id: true },
  })

  return dbUser?.id ?? null
}

function inferTryOnStorageKey(params: { outputImagePath?: string | null; userId: string; jobId: string }): string {
  const fallback = `tryon/${params.userId}/${params.jobId}.png`
  const raw = params.outputImagePath
  if (!raw) return fallback

  // If DB already contains a storage key, use it directly.
  if (!raw.startsWith('http')) return raw

  // If DB contains a public URL, extract object key after bucket segment.
  const marker = '/try-ons/'
  const idx = raw.indexOf(marker)
  if (idx >= 0) {
    const key = raw.slice(idx + marker.length)
    return key || fallback
  }

  return fallback
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getDbUserId()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await ctx.params
    const db = prisma as any

    const existing = await db.generationJob.findFirst({
      where: { id, userId },
      select: { id: true, outputImagePath: true },
    })

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Delete DB row first (authoritative). Storage delete is best-effort after.
    await db.generationJob.delete({ where: { id } })

    // Best-effort storage cleanup (non-fatal if missing)
    try {
      const key = inferTryOnStorageKey({ outputImagePath: existing.outputImagePath, userId, jobId: id })
      await deleteUpload(key, BUCKET)
    } catch (storageErr) {
      console.warn('Failed to delete try-on image from storage (non-fatal):', storageErr)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Generations DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete generation' }, { status: 500 })
  }
}


