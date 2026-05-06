/**
 * FLUX TRY-ON ENGINE
 *
 * Drop-in replacement for `generateTryOnDirect()` (the Gemini-based
 * pipeline) that uses FLUX.2 [pro] for clothing swap. Same signature,
 * same return shape (base64 string), so the inline + queued pipelines
 * call it without further changes.
 *
 * FLUX.2 conditioning order for clothing swap:
 *   input_image    = person photo
 *   input_image_2  = garment photo
 *   prompt         = stabilized swap instructions
 */

import 'server-only'
import { flux2Generate, downloadFluxImage, FluxError } from './client'
import { stripInjectionTokens } from '@/lib/security/prompt-injection'
import type { GarmentIntelligence } from '@/lib/tryon/garment-intel'

export interface FluxTryOnOptions {
  personImageBase64: string
  garmentImageBase64: string
  prompt: string
  aspectRatio?: string         // accepted for signature compat — converted to width/height
  resolution?: string          // accepted for signature compat
  faceCropBase64?: string      // optional 3rd image (face anchor)
  /**
   * Optional structured garment intelligence (color, pattern, material,
   * fit, sleeves, etc.). When supplied, we ground the prompt in concrete
   * garment specifics — dramatically improves fidelity vs. relying on
   * the model's interpretation of the reference image alone.
   */
  garmentIntel?: GarmentIntelligence | null
}

// Aspect ratio → width/height map. FLUX.2 requires explicit dimensions.
function aspectToWH(aspect: string | undefined, resolution: string | undefined): { width: number; height: number } {
  // Resolution scale multiplier ('1K' = 1, '2K' = 1.5)
  const scale = resolution === '2K' ? 1.5 : 1
  const baseShort = Math.round(768 * scale)   // 768 (1K) or 1152 (2K)
  const baseLong = Math.round(1024 * scale)   // 1024 (1K) or 1536 (2K)

  switch ((aspect || '4:5').toLowerCase()) {
    case '1:1':
      return { width: baseLong, height: baseLong }
    case '9:16':
      return { width: baseShort, height: Math.round(baseShort * 16 / 9) }
    case '16:9':
      return { width: Math.round(baseShort * 16 / 9), height: baseShort }
    case '3:4':
      return { width: baseShort, height: Math.round(baseShort * 4 / 3) }
    case '4:3':
      return { width: Math.round(baseShort * 4 / 3), height: baseShort }
    case '4:5':
    default:
      return { width: baseShort, height: Math.round(baseShort * 5 / 4) }
  }
}

/**
 * Build a tight, FLUX.2-friendly prompt for clothing swap.
 *
 * FLUX.2 responds best to short, direct prompts that explicitly reference
 * image positions and describe the target garment in concrete terms.
 * The verbose "system instruction" style that works for Gemini actually
 * confuses FLUX.2 — it pattern-matches stylistic phrases instead of
 * following the swap directive.
 *
 * Strategy:
 *   1. Anchor identity to image 1: "the person from image 1"
 *   2. Describe the garment in CONCRETE specs from garmentIntel — not
 *      "the garment from image 2" (FLUX.2 generalizes those)
 *   3. End with the swap action and lighting/realism note
 *   4. Keep total length under ~600 chars
 */
function buildFluxClothingSwapPrompt(
  garmentIntel: GarmentIntelligence | null | undefined,
  userContext: string,
): string {
  if (!garmentIntel) {
    // Fallback: minimal swap directive without specifics
    const ctx = userContext ? ` ${userContext}` : ''
    return `Photorealistic edit: dress the person from image 1 in the exact garment shown in image 2. Preserve their face, hair, skin tone, pose, and background unchanged. Match the garment's color, pattern, fit, and details precisely.${ctx}`.slice(0, 1500)
  }

  // Build a concise garment description from intel
  const parts: string[] = []
  // Color + pattern + material first — most visually distinctive
  const colorBit = garmentIntel.secondaryColor && garmentIntel.secondaryColor !== garmentIntel.primaryColor
    ? `${garmentIntel.primaryColor} and ${garmentIntel.secondaryColor}`
    : garmentIntel.primaryColor
  if (colorBit) parts.push(colorBit)
  if (garmentIntel.pattern && garmentIntel.pattern !== 'solid') parts.push(garmentIntel.pattern)
  if (garmentIntel.material && garmentIntel.material !== 'other') parts.push(garmentIntel.material)
  // Garment type + cut
  parts.push(garmentIntel.garmentType.replace(/_/g, ' '))
  if (garmentIntel.fit && garmentIntel.fit !== 'regular') parts.push(`${garmentIntel.fit} fit`)
  if (garmentIntel.length && !['waist', 'hip'].includes(garmentIntel.length)) {
    parts.push(`${garmentIntel.length} length`)
  }
  // Neckline + sleeves for tops
  if (garmentIntel.neckline && garmentIntel.neckline !== 'other') {
    parts.push(`${garmentIntel.neckline} neckline`)
  }
  if (garmentIntel.sleeves && !['other', 'none'].includes(garmentIntel.sleeves)) {
    parts.push(`${garmentIntel.sleeves} sleeves`)
  }

  const garmentDesc = parts.join(', ')
  const features =
    garmentIntel.keyFeatures && garmentIntel.keyFeatures.length > 0
      ? ` Details: ${garmentIntel.keyFeatures.slice(0, 4).join(', ')}.`
      : ''

  // Bottom wear hint when product is a top with visible bottom in product photo
  let bottomBit = ''
  if (garmentIntel.coverage === 'upper_only') {
    if (garmentIntel.visibleBottomInPhoto && garmentIntel.visibleBottomInPhoto !== 'none') {
      bottomBit = ` Pair with ${garmentIntel.visibleBottomInPhoto}.`
    } else if (garmentIntel.bottomWearSuggestion && garmentIntel.bottomWearSuggestion !== 'included') {
      bottomBit = ` Pair with ${garmentIntel.bottomWearSuggestion}.`
    }
  }

  const userBit = userContext ? ` ${userContext}` : ''

  // FLUX.2 prefers <600 char prompts. Keep this tight.
  const prompt = [
    `Photorealistic edit: dress the person from image 1 in the exact garment shown in image 2 — a ${garmentDesc}.${features}${bottomBit}`,
    `Replace ALL existing clothing on the affected body area with this garment only — no layering, no mixing.`,
    `Preserve the person's face, hair, skin tone, body shape, pose, and background exactly. Match natural lighting, fabric drape, and shadows.${userBit}`,
  ].join(' ').slice(0, 1500)

  return prompt
}

export async function generateTryOnFlux(options: FluxTryOnOptions): Promise<string> {
  const isDev = process.env.NODE_ENV !== 'production'

  const cleanPerson = options.personImageBase64.replace(/^data:image\/[a-z+]+;base64,/, '')
  const cleanGarment = options.garmentImageBase64.replace(/^data:image\/[a-z+]+;base64,/, '')

  if (!cleanPerson || cleanPerson.length < 100) {
    throw new Error('Invalid person image')
  }
  if (!cleanGarment || cleanGarment.length < 100) {
    throw new Error('Invalid garment image')
  }

  // Build the FLUX prompt grounded in concrete garment specifics from
  // garmentIntel. Sanitize the user's smart-prompt context against
  // prompt-injection before embedding.
  // Strip the verbose system-instruction prefix that the Gemini path
  // builds — FLUX.2 doesn't need (and is confused by) those imperatives.
  const userContext = stripInjectionTokens(options.prompt || '').slice(0, 400)
  const fluxPrompt = buildFluxClothingSwapPrompt(options.garmentIntel ?? null, userContext)

  const { width, height } = aspectToWH(options.aspectRatio, options.resolution)

  // Optional face crop becomes input_image_3 (FLUX.2 supports up to 8 inputs)
  const inputImages = [cleanPerson, cleanGarment]
  if (options.faceCropBase64) {
    const cleanFace = options.faceCropBase64.replace(/^data:image\/[a-z+]+;base64,/, '')
    if (cleanFace.length > 100) inputImages.push(cleanFace)
  }

  if (isDev) {
    console.log(
      `🎨 FLUX.2 try-on → ${inputImages.length} inputs · ${width}x${height} · prompt ${fluxPrompt.length} chars`,
    )
  }

  // Retry loop with exponential backoff on transient failures.
  // - Moderation rejections fail fast (no retry, attacker can't burn budget)
  // - 4xx auth errors fail fast (config issue, no retry helps)
  // - 5xx / timeouts / network errors retry up to 3 times with backoff
  const MAX_ATTEMPTS = 3
  let lastErr: unknown = null

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = await flux2Generate({
        prompt: fluxPrompt,
        inputImages,
        width,
        height,
        outputFormat: 'png',
        safetyTolerance: 2,
        timeoutMs: 150_000, // FLUX.2 typically 8-20s; allow headroom
      })

      // Download the signed URL into base64 (10-min TTL on FLUX URLs).
      // Wrap with its own retry — sometimes the BFL CDN takes a beat to
      // serve the result even after Ready.
      let downloaded
      let downloadAttempt = 0
      while (true) {
        try {
          downloaded = await downloadFluxImage(result.imageUrl)
          break
        } catch (dlErr) {
          downloadAttempt++
          if (downloadAttempt >= 3) throw dlErr
          await new Promise((r) => setTimeout(r, 800 * downloadAttempt))
        }
      }

      if (isDev) {
        console.log(
          `✅ FLUX.2 try-on success · attempt ${attempt} · job ${result.jobId} · seed ${result.seed ?? 'n/a'} · ${downloaded.base64.length} bytes`,
        )
      }

      return `data:${downloaded.mime};base64,${downloaded.base64}`
    } catch (err) {
      lastErr = err

      // Categorize the failure
      let category: 'moderation' | 'auth' | 'transient' | 'unknown' = 'unknown'
      let message = err instanceof Error ? err.message : 'unknown error'

      if (err instanceof FluxError) {
        const lower = message.toLowerCase()
        if (lower.includes('moderat')) category = 'moderation'
        else if (err.status === 401 || err.status === 403) category = 'auth'
        else if (err.status === 504 || err.status === 502 || err.status === 503 || err.status === 429) category = 'transient'
        else if (lower.includes('timed out') || lower.includes('timeout')) category = 'transient'
        else if (err.status && err.status >= 500) category = 'transient'
      } else if (err instanceof Error) {
        const lower = message.toLowerCase()
        if (lower.includes('fetch') || lower.includes('econnrefused') || lower.includes('socket') || lower.includes('timeout')) {
          category = 'transient'
        }
      }

      // Fail fast on non-transient errors
      if (category === 'moderation') {
        if (isDev) console.warn(`❌ FLUX.2 moderation rejection — failing fast: ${message}`)
        throw err
      }
      if (category === 'auth') {
        if (isDev) console.error(`❌ FLUX.2 auth failure — check FLUX_API_KEY: ${message}`)
        throw err
      }

      // Last attempt — re-throw
      if (attempt >= MAX_ATTEMPTS) {
        if (isDev) console.error(`❌ FLUX.2 failed after ${MAX_ATTEMPTS} attempts: ${message}`)
        throw err
      }

      // Exponential backoff: 1s, 3s, 6s
      const backoffMs = Math.min(6000, 1000 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 500))
      if (isDev) {
        console.warn(
          `⚠️ FLUX.2 attempt ${attempt}/${MAX_ATTEMPTS} failed (${category}): ${message} — retrying in ${backoffMs}ms`,
        )
      }
      await new Promise((r) => setTimeout(r, backoffMs))
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error('FLUX try-on failed after retries')
}
