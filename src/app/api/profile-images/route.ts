import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/auth'
import { saveUpload } from '@/lib/storage'

const BUCKET = 'profile-images'
const MAX_PROFILE_IMAGES = 10

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

export async function GET() {
  try {
    const userId = await getDbUserId()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = prisma as any
    const images = await db.userProfileImage.findMany({
      where: { userId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        imageUrl: true,
        label: true,
        isPrimary: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ images })
  } catch (error) {
    console.error('Profile images GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch profile images' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getDbUserId()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => null)
    const imageBase64: unknown = body?.imageBase64
    const label: unknown = body?.label
    const makePrimary: unknown = body?.makePrimary

    if (typeof imageBase64 !== 'string' || imageBase64.replace(/^data:image\/\w+;base64,/, '').length < 200) {
      return NextResponse.json({ error: 'Invalid image' }, { status: 400 })
    }

    const db = prisma as any
    const existingCount = await db.userProfileImage.count({ where: { userId } })
    if (existingCount >= MAX_PROFILE_IMAGES) {
      return NextResponse.json({ error: `You can only store up to ${MAX_PROFILE_IMAGES} images` }, { status: 400 })
    }

    const id = crypto.randomUUID()
    const imagePath = `${userId}/${id}.jpg`
    const imageUrl = await saveUpload(imageBase64, imagePath, BUCKET, 'image/jpeg')

    const shouldBePrimary = Boolean(makePrimary) || existingCount === 0

    const created = await db.$transaction(async (tx: any) => {
      if (shouldBePrimary) {
        await tx.userProfileImage.updateMany({
          where: { userId },
          data: { isPrimary: false },
        })
      }

      return await tx.userProfileImage.create({
        data: {
          id,
          userId,
          imagePath,
          imageUrl,
          label: typeof label === 'string' ? label.slice(0, 60) : null,
          isPrimary: shouldBePrimary,
        },
        select: {
          id: true,
          imageUrl: true,
          label: true,
          isPrimary: true,
          createdAt: true,
        },
      })
    })

    return NextResponse.json({ image: created })
  } catch (error) {
    console.error('Profile images POST error:', error)
    return NextResponse.json({ error: 'Failed to upload profile image' }, { status: 500 })
  }
}


