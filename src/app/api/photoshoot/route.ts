/**
 * POST /api/photoshoot  — Beta "Full Image Generation" (photoshoot) mode
 *
 * SEPARATE from the clothing-swap try-on (/api/tryon, runCleanTryOn) which is
 * left completely untouched. Takes one source reference photo + a product
 * garment + a scene preset, and returns photoshoot variants of the SAME person
 * (face locked) wearing the garment in a fresh generated scene.
 *
 * Runs synchronously (Nano Banana via the photoshoot pipeline). Generation is
 * isolated so a failure here can never affect the clothing-swap path. The same
 * generation gate as /api/tryon (daily cap + cooldown + concurrency lock +
 * kill switch) guards cost; it honours TRYON_RATE_LIMIT_DISABLED.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/auth'
import { getReferencePhotosByIds, fetchReferencePhotoAsBase64 } from '@/lib/reference-photos/service'
import { saveUpload } from '@/lib/storage'
import { runPhotoshoot, isPhotoshootSlotSuccess } from '@/lib/tryon/photoshoot-pipeline'
import { checkGenerationGate, completeGeneration } from '@/lib/generation-limiter'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Same master switch as the clothing-swap route. Limiter is OFF unless the env
// is explicitly the string "false" (i.e. limits enabled) AND we're in prod or
// the limiter is force-enabled.
const RATE_LIMIT_DISABLED = process.env.TRYON_RATE_LIMIT_DISABLED !== 'false'
const LIMITER_ACTIVE =
  !RATE_LIMIT_DISABLED &&
  (process.env.NODE_ENV === 'production' || process.env.TRYON_LIMITER_ENABLED === 'true')

const bodySchema = z
  .object({
    // Multi-reference: 1-3 photos of the SAME person (different angles) for
    // stronger identity. `referenceImageId` (single) is still accepted for
    // backward compatibility.
    referenceImageIds: z.array(z.string().trim().min(1).max(120)).min(1).max(6).optional(),
    referenceImageId: z.string().trim().min(1).max(120).optional(),
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
  .refine((v) => Boolean((v.referenceImageIds && v.referenceImageIds.length) || v.referenceImageId), {
    message: 'At least one source photo is required.',
    path: ['referenceImageIds'],
  })

/**
 * GET /api/photoshoot — diagnostic. Reports whether the InsightFace face-swap
 * service is configured + reachable, so you can verify the chain without
 * digging through logs. Auth-gated.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = (process.env.FACE_SWAP_SERVICE_URL || '').trim()
  const flag = process.env.PHOTOSHOOT_FACE_RESTORE
  const result: Record<string, unknown> = {
    faceRestoreEnabled: Boolean(url) || flag === '1' || flag === 'true',
    faceSwapServiceUrlSet: Boolean(url),
    serviceHostMasked: url ? url.replace(/^(https?:\/\/[^/]{0,12}).*$/, '$1…') : null,
    serviceHealthy: false,
    health: null as unknown,
  }

  if (url) {
    try {
      const res = await fetch(`${url.replace(/\/$/, '')}/health`, {
        signal: AbortSignal.timeout(10_000),
        cache: 'no-store',
      })
      const body = await res.json().catch(() => null)
      result.serviceHealthy = res.ok
      result.health = body ?? `HTTP ${res.status}`
    } catch (e) {
      result.health = `unreachable: ${e instanceof Error ? e.message : String(e)}`
    }
  }

  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  let userId: string | null = null
  let gateRequestId: string | null = null
  let genResult: 'success' | 'failed' = 'failed'
  let variantCount = 3

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    userId = user.id

    const body = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      )
    }
    const input = parsed.data
    variantCount = input.variantCount ?? 3

    // ── Cost gate (daily cap + cooldown + one-at-a-time + kill switch) ──
    if (LIMITER_ACTIVE) {
      const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown'
      const gate = checkGenerationGate(userId, ip)
      if (!gate.allowed) {
        return NextResponse.json(
          {
            error: gate.blockReason || 'Generation limit reached. Please try again later.',
            code: 'GENERATION_LIMIT',
            remainingToday: gate.remainingToday,
          },
          { status: 429, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } },
        )
      }
      gateRequestId = gate.requestId
    }

    const service = createServiceClient()

    // ── Resolve the source person photos (base64) — multi-reference ───
    const requestedIds = (
      input.referenceImageIds && input.referenceImageIds.length
        ? input.referenceImageIds
        : input.referenceImageId
          ? [input.referenceImageId]
          : []
    ).slice(0, 6)
    const uniqueIds = Array.from(new Set(requestedIds))

    const photos = await getReferencePhotosByIds(service, userId, uniqueIds)
    // Keep the caller's order (the first id is the primary face source).
    const orderedPhotos = uniqueIds
      .map((id) => photos.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p?.image_url))
    if (orderedPhotos.length === 0) {
      return NextResponse.json({ error: 'Source photo not found' }, { status: 404 })
    }

    const personBase64s = (
      await Promise.all(
        orderedPhotos.map((p) =>
          fetchReferencePhotoAsBase64(p.image_url).catch(() => ''),
        ),
      )
    ).filter((b) => b && b.length > 100)
    if (personBase64s.length === 0) {
      return NextResponse.json({ error: 'Could not load the source photo' }, { status: 502 })
    }
    const personImageBase64 = personBase64s[0]
    const extraPersonImagesBase64 = personBase64s.slice(1)

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
        extraPersonImagesBase64,
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
      restoredVia?: 'insightface' | 'gemini' | null
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
            `photoshoot/${userId}/${Date.now()}-${idx + 1}.png`,
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
          restoredVia: sel.restoredVia ?? null,
        })
      }),
    )

    if (outputs.length === 0) {
      const allIdentityRejected =
        failures.length > 0 &&
        failures.every((failure) => /face consistency guard|identity could not be confirmed safely/i.test(failure.error))
      return NextResponse.json(
        {
          error: allIdentityRejected
            ? 'We could not produce a photoshoot image that preserved the face closely enough. Please retry with a clearer front-facing reference photo.'
            : 'No photoshoot images could be generated. Please try again.',
          failures,
          code: allIdentityRejected ? 'PHOTOSHOOT_FACE_GUARD_REJECTED' : 'PHOTOSHOOT_GENERATION_FAILED',
        },
        { status: allIdentityRejected ? 422 : 502, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    outputs.sort((a, b) => a.variant - b.variant)
    genResult = 'success'
    const successfulSlots = result.selections.filter(isPhotoshootSlotSuccess)
    const similarities = successfulSlots
      .map((s) => s.faceSimilarity)
      .filter((v): v is number => typeof v === 'number')
    const faceRestore = {
      configured: Boolean((process.env.FACE_SWAP_SERVICE_URL || '').trim()),
      methodsApplied: Array.from(new Set(successfulSlots.map((s) => s.restoredVia).filter(Boolean))),
      // Highest identity-similarity (0-1) across the looks — proof of how well
      // the swapped face matches the source.
      identitySimilarity: similarities.length ? Math.max(...similarities) : null,
    }
    return NextResponse.json(
      {
        outputs,
        failures,
        faceRestore,
        guardrails: {
          similarityValidationActive: Boolean((process.env.FACE_SWAP_SERVICE_URL || '').trim()) || process.env.PHOTOSHOOT_FACE_RESTORE === '1' || process.env.PHOTOSHOOT_FACE_RESTORE === 'true',
        },
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('[photoshoot] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  } finally {
    // ALWAYS release the session lock / record cost when a gate was acquired,
    // on every exit path (success, handled error, or thrown error).
    if (gateRequestId && userId) {
      try {
        completeGeneration(userId, gateRequestId, genResult, variantCount)
      } catch (e) {
        console.warn('[photoshoot] completeGeneration cleanup failed:', e)
      }
    }
  }
}
