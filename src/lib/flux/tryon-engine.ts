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
import sharp from 'sharp'
import { flux2Generate, downloadFluxImage, FluxError } from './client'
import { stripInjectionTokens } from '@/lib/security/prompt-injection'
import type { GarmentIntelligence } from '@/lib/tryon/garment-intel'
import type { StrictGarmentProfile } from '@/lib/tryon/garment-strict-schema'

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
  /**
   * Optional strict profile with hex colors, motif description, fabric
   * specs. When supplied, locks color + pattern fidelity even harder
   * than the basic intel.
   */
  strictGarmentProfile?: StrictGarmentProfile | null
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
 *
 * Priority of garment specs (most → least specific):
 *   1. strictGarmentProfile (hex colors + motif description + fabric)
 *   2. garmentIntel (color name + pattern + material + cut)
 *   3. Image-only fallback (just "the garment in image 2")
 *
 * Strategy:
 *   - Anchor identity: "the person from image 1"
 *   - Describe the garment in CONCRETE specs (FLUX generalizes "the garment in image 2")
 *   - End with negative-style guards ("no extra layers", "no different person")
 *   - Cap at ~600 chars — FLUX.2 sweet spot
 */
function buildFluxClothingSwapPrompt(
  garmentIntel: GarmentIntelligence | null | undefined,
  strictProfile: StrictGarmentProfile | null | undefined,
  userContext: string,
): string {
  // Build the concrete garment description, prioritizing strict profile
  const parts: string[] = []

  if (strictProfile) {
    // ── Strict profile path: most specific ──────────────────────────
    const baseColor = strictProfile.base_color
    if (baseColor?.name) {
      const hex = baseColor.hex ? ` (${baseColor.hex})` : ''
      parts.push(`${baseColor.name}${hex}`)
    }
    if (strictProfile.secondary_colors?.length) {
      const secondaryNames = strictProfile.secondary_colors
        .slice(0, 2)
        .map((c) => `${c.name}${c.hex ? ` (${c.hex})` : ''}`)
        .join(' and ')
      parts.push(`with ${secondaryNames} accents`)
    }
    if (strictProfile.pattern?.exists && strictProfile.pattern.type !== 'solid') {
      const motif = strictProfile.pattern.motif_description?.slice(0, 80)
      const scaleAndDensity = `${strictProfile.pattern.motif_scale} ${strictProfile.pattern.repeat_density}`
      parts.push(motif ? `${strictProfile.pattern.type} pattern (${motif}, ${scaleAndDensity})` : strictProfile.pattern.type)
    }
    if (strictProfile.fabric?.material && strictProfile.fabric.material !== 'other') {
      const finish = strictProfile.fabric.surface_finish && strictProfile.fabric.surface_finish !== 'matte'
        ? ` ${strictProfile.fabric.surface_finish.replace('_', ' ')}`
        : ''
      parts.push(`${strictProfile.fabric.material}${finish}`)
    }
    parts.push(strictProfile.garment_type.replace(/_/g, ' '))
    const construction = strictProfile.construction
    if (construction?.length && !['waist', 'hip'].includes(construction.length)) {
      parts.push(`${construction.length.replace(/_/g, ' ')} length`)
    }
    if (construction?.neckline && construction.neckline !== 'other') {
      parts.push(`${construction.neckline} neckline`)
    }
    if (construction?.sleeves?.length && construction.sleeves.length !== 'sleeveless') {
      parts.push(`${construction.sleeves.length} sleeves`)
    } else if (construction?.sleeves?.length === 'sleeveless') {
      parts.push('sleeveless')
    }
  } else if (garmentIntel) {
    // ── Basic intel path: less specific but still grounded ──────────
    const colorBit =
      garmentIntel.secondaryColor && garmentIntel.secondaryColor !== garmentIntel.primaryColor
        ? `${garmentIntel.primaryColor} and ${garmentIntel.secondaryColor}`
        : garmentIntel.primaryColor
    if (colorBit) parts.push(colorBit)
    if (garmentIntel.pattern && garmentIntel.pattern !== 'solid') parts.push(garmentIntel.pattern)
    if (garmentIntel.material && garmentIntel.material !== 'other') parts.push(garmentIntel.material)
    parts.push(garmentIntel.garmentType.replace(/_/g, ' '))
    if (garmentIntel.fit && garmentIntel.fit !== 'regular') parts.push(`${garmentIntel.fit} fit`)
    if (garmentIntel.length && !['waist', 'hip'].includes(garmentIntel.length)) {
      parts.push(`${garmentIntel.length} length`)
    }
    if (garmentIntel.neckline && garmentIntel.neckline !== 'other') {
      parts.push(`${garmentIntel.neckline} neckline`)
    }
    if (garmentIntel.sleeves && !['other', 'none'].includes(garmentIntel.sleeves)) {
      parts.push(`${garmentIntel.sleeves} sleeves`)
    }
  }

  // Build features list — combine intel keyFeatures with strict construction details
  const featuresList: string[] = []
  if (garmentIntel?.keyFeatures?.length) {
    featuresList.push(...garmentIntel.keyFeatures.slice(0, 3))
  }
  if (strictProfile?.construction?.waist && strictProfile.construction.waist !== 'straight') {
    featuresList.push(`${strictProfile.construction.waist} waist`)
  }
  const features = featuresList.length > 0 ? ` Details: ${featuresList.slice(0, 4).join(', ')}.` : ''

  // Bottom wear hint
  let bottomBit = ''
  if (garmentIntel?.coverage === 'upper_only') {
    if (garmentIntel.visibleBottomInPhoto && garmentIntel.visibleBottomInPhoto !== 'none') {
      bottomBit = ` Pair with ${garmentIntel.visibleBottomInPhoto}.`
    } else if (garmentIntel.bottomWearSuggestion && garmentIntel.bottomWearSuggestion !== 'included') {
      bottomBit = ` Pair with ${garmentIntel.bottomWearSuggestion}.`
    }
  }

  const garmentDesc = parts.length > 0 ? parts.join(', ') : 'the garment shown in image 2'
  const userBit = userContext ? ` ${userContext}` : ''

  // Caption-style prompt with negative-style guards at the end.
  // FLUX responds well to "no X, no Y" lists at the tail.
  const prompt = [
    `Photorealistic edit: dress the person from image 1 in the exact garment shown in image 2 — a ${garmentDesc}.${features}${bottomBit}`,
    `Replace ALL existing clothing on the affected body area with this garment only.`,
    `Preserve the person's face, hair, skin tone, body shape, pose, and background exactly. Match natural lighting, fabric drape, and shadows.`,
    `No layering, no extra garments, no different person, no text or watermarks, no AI artifacts.${userBit}`,
  ].join(' ').slice(0, 1500)

  return prompt
}

/**
 * Read the actual aspect ratio of the person photo to keep FLUX dimensions
 * natural. Falls back to the requested aspect when sharp can't read it.
 */
async function detectPersonAspect(personBase64: string): Promise<string | null> {
  try {
    const buf = Buffer.from(personBase64, 'base64')
    const meta = await sharp(buf).metadata()
    if (!meta.width || !meta.height) return null
    const ratio = meta.width / meta.height
    if (ratio > 1.6) return '16:9'
    if (ratio > 1.2) return '4:3'
    if (ratio > 0.95 && ratio < 1.05) return '1:1'
    if (ratio > 0.7) return '4:5'
    if (ratio > 0.6) return '3:4'
    return '9:16'
  } catch {
    return null
  }
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
  // strictGarmentProfile (preferred) or garmentIntel. Sanitize the user's
  // smart-prompt context against prompt-injection before embedding.
  const userContext = stripInjectionTokens(options.prompt || '').slice(0, 400)
  const fluxPrompt = buildFluxClothingSwapPrompt(
    options.garmentIntel ?? null,
    options.strictGarmentProfile ?? null,
    userContext,
  )

  // Auto-detect the person photo's natural aspect — keeps the output's
  // crop natural instead of forcing a 4:5 framing on a 9:16 selfie.
  // Falls back to the requested aspectRatio when detection fails.
  const detectedAspect = await detectPersonAspect(cleanPerson)
  const finalAspect = detectedAspect || options.aspectRatio || '4:5'
  const { width, height } = aspectToWH(finalAspect, options.resolution)

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
