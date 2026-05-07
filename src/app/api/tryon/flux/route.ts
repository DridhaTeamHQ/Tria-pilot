/**
 * POST /api/tryon/flux
 *
 * FLUX-based clothing swap for the influencer try-on flow.
 *
 * Two modes:
 *   - mode: 'fill'    — uses flux-pro-1.0-fill (mask-based inpainting).
 *                        Best quality. Requires a mask of the existing
 *                        garment.
 *   - mode: 'kontext' — uses flux-kontext-pro (text-guided image edit).
 *                        Faster, no mask needed, slightly lower fidelity.
 *
 * Body:
 *   {
 *     mode?: 'fill' | 'kontext',     // default 'fill'
 *     personImageUrl: string,         // public URL of the influencer photo
 *     maskUrl?: string,               // required for 'fill' mode — same dims as personImage
 *     garmentDescription: string,     // text prompt describing the new garment
 *     productId?: string,             // optional — used to attribute the generation
 *     seed?: number,
 *     persist?: boolean,              // default true — download + save to Supabase storage
 *   }
 *
 * Returns:
 *   {
 *     imageUrl: string,           // permanent Supabase URL if persisted, else FLUX signed URL
 *     fluxSignedUrl: string,      // raw FLUX URL (10-min TTL)
 *     mode: 'fill' | 'kontext',
 *     jobId: string,
 *     seed?: number,
 *   }
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/auth'
import { fluxFill, fluxKontext, flux2Generate, downloadFluxImage, FluxError } from '@/lib/flux/client'
import { reserveUserSlot, UserConcurrencyError, getUserConcurrencyCap } from '@/lib/flux/user-concurrency'
import { assertSafeReferenceUrl } from '@/lib/reference-photos/service'
import {
  stripInjectionTokens,
} from '@/lib/security/prompt-injection'
import { ipRateLimit } from '@/lib/security/ip-rate-limit'

export const dynamic = 'force-dynamic'
export const maxDuration = 180

const bodySchema = z.object({
  // 'flux2'   — FLUX.2 [pro], image-conditioned generation. Default.
  //              No mask needed. Best instruction-following, multi-image
  //              support (up to 4 reference photos via garmentImageUrls).
  // 'fill'    — flux-pro-1.0-fill. Mask-based inpainting. Highest fidelity
  //              when you have a clean garment mask.
  // 'kontext' — flux-kontext-pro. Older image-to-image edit, kept for
  //              compatibility.
  mode: z.enum(['flux2', 'fill', 'kontext']).default('flux2'),
  personImageUrl: z.string().url(),
  maskUrl: z.string().url().optional(),
  /**
   * Optional product / reference garment images to condition FLUX.2 on.
   * FLUX.2 accepts up to 8 images TOTAL — the person photo counts as
   * one, so `garmentImageUrls` can hold up to 7 additional refs.
   * Ignored in fill/kontext modes.
   */
  garmentImageUrls: z.array(z.string().url()).max(7).optional(),
  garmentDescription: z.string().trim().min(3).max(2000),
  productId: z.string().uuid().optional(),
  /**
   * Output dimensions for FLUX.2 mode. Both must be >=64 if set.
   * If unset, BFL picks defaults based on input. (FLUX.2 doesn't
   * support aspect_ratio — only explicit width/height.)
   */
  width: z.number().int().min(64).max(2048).optional(),
  height: z.number().int().min(64).max(2048).optional(),
  /** Output format. Default jpeg per FLUX.2 spec. */
  outputFormat: z.enum(['jpeg', 'png', 'webp']).default('jpeg'),
  seed: z.number().int().min(0).max(2 ** 31 - 1).optional(),
  persist: z.boolean().default(true),
})

async function fetchAsBase64(url: string): Promise<string> {
  const safeUrl = assertSafeReferenceUrl(url)
  const res = await fetch(safeUrl.toString(), {
    signal: AbortSignal.timeout(15_000),
    redirect: 'error',
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`)
  }
  const contentType = (res.headers.get('content-type') || '').toLowerCase()
  if (!contentType.startsWith('image/')) {
    throw new Error(`Not an image: ${url} (got ${contentType})`)
  }
  const buf = await res.arrayBuffer()
  if (buf.byteLength > 25 * 1024 * 1024) {
    throw new Error(`Image too large: ${url}`)
  }
  return Buffer.from(buf).toString('base64')
}

function buildClothingSwapPrompt(rawDescription: string): string {
  // SECURITY: garment descriptions are user-controlled and flow into the
  // FLUX prompt. Strip injection tokens before embedding.
  const cleaned = stripInjectionTokens(rawDescription).slice(0, 500)
  // Wrap with stabilizing context. Keep face, identity, pose, background.
  return [
    'Photorealistic clothing replacement on a person.',
    `Replace the masked garment with: ${cleaned}.`,
    'Preserve face, hair, skin tone, identity, body shape, and pose exactly.',
    'Match natural lighting, drape, fabric folds, and shadows of the original photo.',
    'No text, no watermarks, no logos unless described.',
  ].join(' ')
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Per-user rate limit — FLUX calls cost real money. 30 generations
    // per hour per user is plenty for legitimate use, blocks runaway
    // automation.
    const rl = ipRateLimit(`flux-tryon:${authUser.id}`, 30, 60 * 60_000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many try-on requests. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } },
      )
    }

    // Per-user concurrency cap — prevents one user from monopolizing
    // every key in the pool with simultaneous requests. Distinct from
    // the hourly rate limit above (which counts total requests/hour).
    let userSlot: { release: () => void }
    try {
      userSlot = reserveUserSlot(authUser.id)
    } catch (e) {
      if (e instanceof UserConcurrencyError) {
        return NextResponse.json(
          {
            error: `You already have ${e.current} try-on${e.current === 1 ? '' : 's'} in progress. Please wait for them to finish.`,
            cap: getUserConcurrencyCap(),
          },
          { status: 429, headers: { 'Retry-After': '20' } },
        )
      }
      throw e
    }

    try {
    const body = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const {
      mode,
      personImageUrl,
      maskUrl,
      garmentImageUrls,
      garmentDescription,
      productId,
      width,
      height,
      outputFormat,
      seed,
      persist,
    } = parsed.data

    if (mode === 'fill' && !maskUrl) {
      return NextResponse.json(
        { error: 'maskUrl is required when mode is "fill"' },
        { status: 400 },
      )
    }

    // Fetch input images server-side (validates SSRF + content type)
    const personBase64 = await fetchAsBase64(personImageUrl)
    const maskBase64 = mode === 'fill' && maskUrl ? await fetchAsBase64(maskUrl) : null

    // Garment reference images are FLUX.2-only; fetch only when mode='flux2'
    let garmentRefBase64s: string[] = []
    if (mode === 'flux2' && garmentImageUrls && garmentImageUrls.length > 0) {
      garmentRefBase64s = await Promise.all(garmentImageUrls.map(fetchAsBase64))
    }

    const prompt = buildClothingSwapPrompt(garmentDescription)

    // Generate
    let result: { imageUrl: string; seed?: number; jobId: string }
    if (mode === 'fill') {
      result = await fluxFill({
        imageBase64: personBase64,
        maskBase64: maskBase64!,
        prompt,
        seed,
        steps: 50,
      })
    } else if (mode === 'kontext') {
      result = await fluxKontext({
        imageBase64: personBase64,
        prompt,
        seed,
      })
    } else {
      // Default: flux-2-pro with image conditioning.
      // Person photo first, then up to 7 garment refs (FLUX.2 caps at 8 total).
      const allInputs = [personBase64, ...garmentRefBase64s].slice(0, 8)
      result = await flux2Generate({
        prompt,
        inputImages: allInputs,
        width,
        height,
        outputFormat,
        seed,
      })
    }

    // Persist to Supabase storage so the URL doesn't expire after 10 min
    let permanentUrl: string | null = null
    if (persist) {
      try {
        const downloaded = await downloadFluxImage(result.imageUrl)
        const fileName = `${Date.now()}-flux-${mode}-${result.jobId.slice(0, 8)}.png`
        const storagePath = `${authUser.id}/${fileName}`
        const buffer = Buffer.from(downloaded.base64, 'base64')

        const service = createServiceClient()
        const uploadBucket = (process.env.FLUX_OUTPUT_BUCKET || 'try-ons').toLowerCase()
        const { data: uploaded, error: uploadErr } = await service.storage
          .from(uploadBucket)
          .upload(storagePath, buffer, {
            contentType: downloaded.mime,
            upsert: false,
          })

        if (!uploadErr && uploaded) {
          const { data: urlData } = service.storage.from(uploadBucket).getPublicUrl(uploaded.path)
          permanentUrl = urlData.publicUrl
        } else {
          console.warn('[flux/tryon] persist upload failed:', uploadErr)
        }
      } catch (persistErr) {
        // Non-fatal — caller can still use the signed URL within 10 min
        console.warn('[flux/tryon] persist failed:', persistErr)
      }
    }

    return NextResponse.json({
      imageUrl: permanentUrl || result.imageUrl,
      fluxSignedUrl: result.imageUrl,
      mode,
      jobId: result.jobId,
      seed: result.seed,
      productId: productId || null,
      persisted: Boolean(permanentUrl),
    })
    } finally {
      userSlot.release()
    }
  } catch (error) {
    if (error instanceof FluxError) {
      const lower = (error.message || '').toLowerCase()

      // Pool saturation — clear, actionable response with retry hint
      if (error.status === 503 && lower.includes('saturated')) {
        return NextResponse.json(
          {
            error: 'Our AI is at full capacity right now. Please wait a moment and try again.',
            code: 'POOL_SATURATED',
            retryAfterSeconds: 15,
          },
          { status: 503, headers: { 'Retry-After': '15' } },
        )
      }

      // Content moderation
      if (error.status === 400 && lower.includes('moderat')) {
        return NextResponse.json(
          {
            error: 'The image or prompt was blocked by content moderation. Please try a different photo or wording.',
            code: 'MODERATION',
          },
          { status: 400 },
        )
      }

      // Generation timeout
      if (error.status === 504) {
        return NextResponse.json(
          {
            error: 'Generation took too long. The AI service may be slow — please try again.',
            code: 'GENERATION_TIMEOUT',
            retryAfterSeconds: 5,
          },
          { status: 504, headers: { 'Retry-After': '5' } },
        )
      }

      // Auth failure (config issue, not user error)
      if (error.status === 401 || error.status === 403) {
        console.error('[flux/tryon] FLUX auth failure — check FLUX_API_KEYS config')
        return NextResponse.json(
          { error: 'AI service is temporarily unavailable. Our team has been notified.', code: 'CONFIG_ERROR' },
          { status: 503 },
        )
      }

      // Generic FLUX error
      const statusCode = (error.status && error.status >= 500) ? 502 : (error.status || 500)
      return NextResponse.json(
        {
          error: 'Image generation failed. Please try again in a moment.',
          code: 'GENERATION_FAILED',
          retryAfterSeconds: 10,
        },
        { status: statusCode },
      )
    }

    console.error('[flux/tryon] error:', error)
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (error instanceof Error ? error.message : 'Internal server error'),
        code: 'INTERNAL_ERROR',
      },
      { status: 500 },
    )
  }
}
