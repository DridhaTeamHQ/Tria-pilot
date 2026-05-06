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
import { fluxFill, fluxKontext, downloadFluxImage, FluxError } from '@/lib/flux/client'
import { assertSafeReferenceUrl } from '@/lib/reference-photos/service'
import {
  stripInjectionTokens,
} from '@/lib/security/prompt-injection'
import { ipRateLimit } from '@/lib/security/ip-rate-limit'

export const dynamic = 'force-dynamic'
export const maxDuration = 180

const bodySchema = z.object({
  mode: z.enum(['fill', 'kontext']).default('fill'),
  personImageUrl: z.string().url(),
  maskUrl: z.string().url().optional(),
  garmentDescription: z.string().trim().min(3).max(2000),
  productId: z.string().uuid().optional(),
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

    const body = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { mode, personImageUrl, maskUrl, garmentDescription, productId, seed, persist } =
      parsed.data

    if (mode === 'fill' && !maskUrl) {
      return NextResponse.json(
        { error: 'maskUrl is required when mode is "fill"' },
        { status: 400 },
      )
    }

    // Fetch input images server-side (validates SSRF + content type)
    const personBase64 = await fetchAsBase64(personImageUrl)
    const maskBase64 = mode === 'fill' && maskUrl ? await fetchAsBase64(maskUrl) : null

    const prompt = buildClothingSwapPrompt(garmentDescription)

    // Generate
    const result =
      mode === 'fill'
        ? await fluxFill({
            imageBase64: personBase64,
            maskBase64: maskBase64!,
            prompt,
            seed,
            steps: 50,
          })
        : await fluxKontext({
            imageBase64: personBase64,
            prompt,
            seed,
          })

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
  } catch (error) {
    if (error instanceof FluxError) {
      const statusCode = error.status === 400 ? 400 : error.status === 504 ? 504 : 502
      return NextResponse.json(
        {
          error:
            error.status === 400 && error.message.includes('moderat')
              ? 'Your prompt or images were rejected by content moderation.'
              : 'Image generation failed. Please try again.',
        },
        { status: statusCode },
      )
    }

    console.error('[flux/tryon] error:', error)
    return NextResponse.json(
      { error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (error instanceof Error ? error.message : 'Internal server error') },
      { status: 500 },
    )
  }
}
