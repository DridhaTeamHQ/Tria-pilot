import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { tryAcquireInFlight } from '@/lib/traffic-guard'
import { generateIntelligentAdComposition } from '@/lib/gemini'
import { GeminiRateLimitError } from '@/lib/gemini/executor'
import { saveUpload } from '@/lib/storage'
import {
  type AdGenerationInput,
  type AdPresetId,
  type AspectRatio,
  type CharacterType,
  type Platform,
  type CtaType,
  resolveStylePackForPreset,
  validateAdInput,
} from '@/lib/ads/ad-styles'
import { buildAdPrompt } from '@/lib/ads/ad-prompt-builder'

export const maxDuration = 180

const curatedPresets = [
  { preset: 'PERF_BEST_QUALITY' as AdPresetId, label: 'Studio Hero' },
  { preset: 'PRODUCT_LIFESTYLE' as AdPresetId, label: 'Lifestyle Scene' },
  { preset: 'CINEMATIC_STUDIO_EDITORIAL' as AdPresetId, label: 'Editorial Spotlight' },
] as const

const requestSchema = z.object({
  productImage: z.string().min(1).max(15_000_000),
  productName: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
  description: z.string().trim().max(600).optional(),
})

function buildQualityPreamble() {
  return `Create one single, production-grade product image for an ecommerce-ready fashion catalog.
The result must be photoreal, premium, and cleanly composed with sharp product readability.
Preserve the exact product shape, material, trim, pattern, and color from the uploaded image.
Improve background, lighting, reflections, and presentation while keeping the product itself faithful.
Do NOT invent logos, typography, labels, extra accessories, or additional products unless physically implied by the source.
The composition should feel polished, premium, and conversion-ready for a brand storefront.
Return exactly one final product image. CRITICAL: Do NOT include any text, letters, numbers, logos, watermarks, UI, or typography anywhere in the image.

`
}

async function generateVisual({
  preset,
  productImage,
  productName,
  category,
  description,
  variationIndex,
}: {
  preset: AdPresetId
  productImage: string
  productName?: string
  category?: string
  description?: string
  variationIndex: number
}) {
  const generationInput: AdGenerationInput = {
    preset,
    variationIndex,
    stylePack: resolveStylePackForPreset(preset),
    productImage,
    strictRealism: true,
    characterType: 'none' as CharacterType,
    aspectRatio: '1:1' as AspectRatio,
    ctaType: 'shop_now' as CtaType,
    platforms: ['instagram'] as Platform[],
    headline: productName,
  }

  const validation = validateAdInput(generationInput)
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid generation input')
  }

  const { prompt: rawPrompt } = await buildAdPrompt(generationInput, productImage, null)
  const productContext = [productName, category, description].filter(Boolean).join(' • ')
  const compositionPrompt =
    buildQualityPreamble() +
    (productContext
      ? `PRODUCT CONTEXT: ${productContext}\n\n`
      : '') +
    rawPrompt

  return await generateIntelligentAdComposition(productImage, undefined, compositionPrompt, {
    lockFaceIdentity: false,
    aspectRatio: '1:1',
  })
}

export async function POST(request: Request) {
  let inFlight: { allowed: boolean; retryAfterSeconds?: number; release?: () => Promise<void> } | null = null

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = createServiceClient()
    const { data: profile } = await service
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'brand') {
      return NextResponse.json({ error: 'Unauthorized - Brand access required' }, { status: 403 })
    }

    inFlight = await tryAcquireInFlight(user.id, 'ads')
    if (!inFlight.allowed) {
      const retry = inFlight.retryAfterSeconds ?? 20
      return NextResponse.json(
        { error: 'Another product visual generation is already running.', retryAfterSeconds: retry },
        { status: 429, headers: { 'Retry-After': String(retry), 'Cache-Control': 'no-store' } }
      )
    }

    const rateLimit = await checkRateLimit(user.id, 'ads')
    if (!rateLimit.allowed) {
      const retry = rateLimit.retryAfterSeconds ?? 60
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a moment and try again.', retryAfterSeconds: retry },
        { status: 429, headers: { 'Retry-After': String(retry), 'Cache-Control': 'no-store' } }
      )
    }

    const body = await request.json().catch(() => null)
    const input = requestSchema.parse(body)

    const visuals: Array<{
      id: string
      label: string
      preset: AdPresetId
      imageUrl: string
      imageBase64: string
    }> = []

    const failures: string[] = []

    for (const [index, config] of curatedPresets.entries()) {
      try {
        const generatedImage = await generateVisual({
          preset: config.preset,
          productImage: input.productImage,
          productName: input.productName,
          category: input.category,
          description: input.description,
          variationIndex: index,
        })

        const imagePath = `${user.id}/product-visuals/${Date.now()}-${index + 1}.jpg`
        const imageUrl = await saveUpload(generatedImage, imagePath, 'products', 'image/jpeg')

        visuals.push({
          id: `${config.preset}-${index + 1}`,
          label: config.label,
          preset: config.preset,
          imageUrl,
          imageBase64: generatedImage,
        })
      } catch (error) {
        console.error(`[ProductVisuals] Failed for preset ${config.preset}:`, error)
        failures.push(config.label)
      }
    }

    if (visuals.length === 0) {
      return NextResponse.json(
        { error: 'We could not generate product visuals right now. Please try again in a moment.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      visuals,
      partial: failures.length > 0,
      failedLabels: failures,
    })
  } catch (error) {
    console.error('Product visuals generation error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }

    if (error instanceof GeminiRateLimitError) {
      const retryAfterSeconds = Math.min(60, Math.ceil((error.retryAfterMs ?? 30_000) / 1000)) || 30
      return NextResponse.json(
        {
          error: error.message || 'Rate limit reached. Please retry shortly.',
          retryAfterSeconds,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfterSeconds), 'Cache-Control': 'no-store' },
        }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  } finally {
    void inFlight?.release?.()
  }
}
