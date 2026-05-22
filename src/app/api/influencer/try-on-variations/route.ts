import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/auth'
import { flux2Generate, downloadFluxImage } from '@/lib/flux/client'
import { assertSafeReferenceUrl } from '@/lib/reference-photos/service'
import { saveUpload } from '@/lib/storage'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const bodySchema = z.object({
  personImageUrl: z.string().url().optional(),
  personImageDataUrl: z.string().min(20).max(30_000_000).optional(),
  garmentImageUrl: z.string().url().optional(),
  garmentImageDataUrl: z.string().min(20).max(30_000_000).optional(),
  productName: z.string().max(200).optional(),
  productCategory: z.string().max(120).optional(),
  productDescription: z.string().max(2000).optional(),
}).refine(
  (value) => Boolean(value.personImageUrl || value.personImageDataUrl) && Boolean(value.garmentImageUrl || value.garmentImageDataUrl),
  { message: 'Both person and garment images are required' }
)

type VariationSpec = {
  id: string
  label: string
  note: string
  prompt: string
}

function normalizeCategory(category?: string) {
  return String(category || '').trim().toLowerCase()
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const safeUrl = assertSafeReferenceUrl(url)
  const res = await fetch(safeUrl.toString(), {
    signal: AbortSignal.timeout(20_000),
    redirect: 'error',
  })
  if (!res.ok) {
    throw new Error(`Failed to load reference image (${res.status})`)
  }
  const contentType = (res.headers.get('content-type') || '').toLowerCase()
  if (!contentType.startsWith('image/')) {
    throw new Error('Reference URL did not return an image')
  }
  return Buffer.from(await res.arrayBuffer()).toString('base64')
}

async function resolveBase64(url?: string, dataUrl?: string): Promise<string> {
  if (dataUrl) {
    return dataUrl.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '')
  }
  if (!url) throw new Error('Missing image input')
  return fetchImageAsBase64(url)
}

function buildVariationSpecs(productName?: string, productCategory?: string, productDescription?: string): VariationSpec[] {
  const category = normalizeCategory(productCategory)
  const descriptor = [productName, productCategory, productDescription].filter(Boolean).join(' · ')

  const colorDirection = category.includes('dress') || category.includes('fashion') || category.includes('women')
    ? 'Shift the garment into a fresh editorial colorway with richer contrast and a polished, premium palette.'
    : 'Shift the garment into an alternate colorway that feels wearable, high-contrast, and social-ready.'

  const stylingDirection = category.includes('accessor') || category.includes('beauty')
    ? 'Keep the item family the same but make the styling variation slightly more elevated and glossy for creator content.'
    : 'Keep the garment family the same but make the styling variation slightly more styled-up and campaign-ready.'

  return [
    {
      id: 'colorway',
      label: 'Alternate Colorway',
      note: 'A second palette option for a different posting moment.',
      prompt: [
        'Create a photoreal alternate outfit variation on the same person.',
        colorDirection,
        'Preserve the exact same face, body, pose, camera framing, background, and garment silhouette.',
        'This must feel like the same product family, not a completely different outfit.',
        descriptor ? `Product context: ${descriptor}.` : '',
      ].filter(Boolean).join(' '),
    },
    {
      id: 'styled',
      label: 'Styled-Up Variation',
      note: 'A slightly more elevated version for a second reel or story.',
      prompt: [
        'Create a second photoreal styling variation on the same person.',
        stylingDirection,
        'Preserve the exact same face, body, pose, camera framing, background, and overall product identity.',
        'Keep the look believable, creator-friendly, and ready for social posting.',
        descriptor ? `Product context: ${descriptor}.` : '',
      ].filter(Boolean).join(' '),
    },
  ]
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const {
      personImageUrl,
      personImageDataUrl,
      garmentImageUrl,
      garmentImageDataUrl,
      productName,
      productCategory,
      productDescription,
    } = parsed.data

    const [personBase64, garmentBase64] = await Promise.all([
      resolveBase64(personImageUrl, personImageDataUrl),
      resolveBase64(garmentImageUrl, garmentImageDataUrl),
    ])

    const specs = buildVariationSpecs(productName, productCategory, productDescription)

    const variations = await Promise.all(
      specs.map(async (spec, index) => {
        const result = await flux2Generate({
          prompt: spec.prompt,
          inputImages: [personBase64, garmentBase64],
          outputFormat: 'jpeg',
          width: 1024,
          height: 1280,
        })

        let imageUrl = result.imageUrl
        try {
          const downloaded = await downloadFluxImage(result.imageUrl)
          const mime = downloaded.mime || 'image/jpeg'
          const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg'
          const persisted = await saveUpload(
            Buffer.from(downloaded.base64, 'base64'),
            `${user.id}/variations/${Date.now()}-${index}-${spec.id}.${ext}`,
            'try-ons',
            mime,
          )
          if (persisted) imageUrl = persisted
        } catch (persistError) {
          console.warn('[try-on-variations] persist failed:', persistError)
        }

        return {
          id: spec.id,
          label: spec.label,
          note: spec.note,
          imageUrl,
        }
      })
    )

    return NextResponse.json({ variations })
  } catch (error) {
    console.error('[try-on-variations] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate variations' },
      { status: 500 },
    )
  }
}
