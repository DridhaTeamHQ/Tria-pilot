/**
 * POST /api/photoshoot  — Beta "Full Image Generation" (photoshoot) mode
 *
 * SEPARATE from the clothing-swap try-on (/api/tryon, runCleanTryOn) which is
 * left completely untouched. Takes one source reference photo + a product
 * garment + a scene preset, and returns photoshoot variants of the SAME person
 * (face locked) wearing the garment in a fresh generated scene.
 *
 * Runs synchronously (Nano Banana via the photoshoot pipeline). Generation is
 * isolated so a failure here can never affect the clothing-swap path.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/auth'
import { getReferencePhotosByIds, fetchReferencePhotoAsBase64 } from '@/lib/reference-photos/service'
import { saveUpload } from '@/lib/storage'
import { runPhotoshoot, isPhotoshootSlotSuccess } from '@/lib/tryon/photoshoot-pipeline'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const bodySchema = z
  .object({
    referenceImageId: z.string().trim().min(1).max(120),
    garmentImageUrl: z.string().trim().min(1).max(4096).optional(),
    clothingImage: z.string().min(1).max(15_000_000).optional(),
    presetId: z.string().trim().min(1).max(60),
    customScene: z.string().trim().max(400).optional(),
    aspectRatio: z.enum(['1:1', '4:5', '3:4', '9:16']).optional().default('4:5'),
    variantCount: z.number().int().min(1).max(4).optional(),
  })
  .refine((v) => Boolean(v.garmentImageUrl || v.clothingImage), {
    message: 'A product garment (garmentImageUrl or clothingImage) is required.',
    path: ['garmentImageUrl'],
  })

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
    const input = parsed.data
    const service = createServiceClient()

    // ── Resolve the source person photo (base64) ──────────────────────
    const photos = await getReferencePhotosByIds(service, user.id, [input.referenceImageId])
    const personPhoto = photos[0]
    if (!personPhoto?.image_url) {
      return NextResponse.json({ error: 'Source photo not found' }, { status: 404 })
    }
    let personImageBase64: string
    try {
      personImageBase64 = await fetchReferencePhotoAsBase64(personPhoto.image_url)
    } catch {
      return NextResponse.json({ error: 'Could not load the source photo' }, { status: 502 })
    }

    // ── Resolve the garment (base64) ──────────────────────────────────
    let garmentImageBase64: string
    try {
      garmentImageBase64 = input.clothingImage
        ? input.clothingImage
        : await fetchReferencePhotoAsBase64(input.garmentImageUrl as string)
    } catch {
      return NextResponse.json({ error: 'Could not load the product garment image' }, { status: 502 })
    }

    // ── Generate ──────────────────────────────────────────────────────
    let result
    try {
      result = await runPhotoshoot({
        personImageBase64,
        garmentImageBase64,
        presetId: input.presetId,
        customScene: input.customScene,
        aspectRatio: input.aspectRatio,
        variantCount: input.variantCount,
      })
    } catch (genErr) {
      const msg = genErr instanceof Error ? genErr.message : 'Photoshoot generation failed'
      const lower = msg.toLowerCase()
      const overloaded =
        lower.includes('503') || lower.includes('unavailable') || lower.includes('overloaded') ||
        lower.includes('resource_exhausted') || lower.includes('quota') || lower.includes('deadline') ||
        lower.includes('timed out') || lower.includes('timeout')
      return NextResponse.json(
        { error: overloaded ? 'The image model is busy right now. Please try again in a moment.' : `Photoshoot failed: ${msg.slice(0, 200)}` },
        { status: overloaded ? 503 : 502, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    // ── Persist successful outputs ────────────────────────────────────
    const outputs: Array<{
      variant: number
      presetId: string
      label: string
      imageUrl?: string
      base64Image?: string
    }> = []
    const failures: Array<{ variant: number; error: string }> = []

    await Promise.all(
      result.selections.map(async (sel, idx) => {
        if (!isPhotoshootSlotSuccess(sel)) {
          failures.push({ variant: sel.variant, error: sel.error })
          return
        }
        let imageUrl: string | undefined
        try {
          const clean = sel.outputBase64.replace(/^data:image\/[a-z+]+;base64,/, '')
          const stored = await saveUpload(
            clean,
            `photoshoot/${user.id}/${Date.now()}-${idx + 1}.png`,
            'try-ons',
          )
          if (stored) imageUrl = stored
        } catch {
          /* fall back to base64 below */
        }
        outputs.push({
          variant: sel.variant,
          presetId: sel.presetId,
          label: `Look ${sel.variant + 1}`,
          imageUrl,
          base64Image: imageUrl ? undefined : sel.outputBase64,
        })
      }),
    )

    if (outputs.length === 0) {
      return NextResponse.json(
        { error: 'No photoshoot images could be generated. Please try again.', failures },
        { status: 502, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    outputs.sort((a, b) => a.variant - b.variant)
    return NextResponse.json({ outputs, failures }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[photoshoot] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
