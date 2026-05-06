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

export interface FluxTryOnOptions {
  personImageBase64: string
  garmentImageBase64: string
  prompt: string
  aspectRatio?: string         // accepted for signature compat — converted to width/height
  resolution?: string          // accepted for signature compat
  faceCropBase64?: string      // optional 3rd image (face anchor)
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

const SYSTEM_PROMPT_TEMPLATE = `Photorealistic virtual try-on. Edit the FIRST image so the person wears the clothing from the SECOND image exactly.

IDENTITY (CRITICAL):
- Same person from input_image — preserve face, hair, skin tone, body proportions, and pose precisely.
- Do NOT generate a different person.

GARMENT REPLACEMENT (STRIP-AND-REPLACE):
- Remove the person's existing clothing in the affected area.
- Apply ONLY the garment shown in input_image_2 — copy color, pattern, texture, collar, sleeves, hem, fit, fabric exactly.
- Do not blend, layer, or mix the original clothing with the new garment.
- If input_image_2 shows a model, ignore their face — copy only the garment.

REALISM:
- Natural fabric drape, realistic shadows, lighting consistent with the original photo.
- No AI artifacts, no CGI look, no text or watermarks.

ADDITIONAL CONTEXT:
{{USER_PROMPT}}`

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

  // Build the FLUX prompt — embed the user's smart prompt as additional
  // context, sanitize it for prompt-injection.
  const userContext = stripInjectionTokens(options.prompt || '').slice(0, 1500)
  const fluxPrompt = SYSTEM_PROMPT_TEMPLATE.replace(
    '{{USER_PROMPT}}',
    userContext || '(none)',
  )

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

  // Single-attempt call with retry on transient errors.
  // FLUX.2 is generally reliable but content moderation occasionally
  // bounces a request — retry once with a slight prompt adjustment.
  let lastErr: unknown = null
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await flux2Generate({
        prompt: fluxPrompt,
        inputImages,
        width,
        height,
        outputFormat: 'png',
        safetyTolerance: 2,
        timeoutMs: 150_000, // FLUX.2 typically 8-20s; allow plenty of headroom
      })

      // Download the signed URL into base64 (10-min TTL on FLUX URLs;
      // the upstream pipeline uploads to Supabase storage immediately)
      const downloaded = await downloadFluxImage(result.imageUrl)

      if (isDev) {
        console.log(
          `✅ FLUX.2 try-on success · job ${result.jobId} · seed ${result.seed ?? 'n/a'} · ${downloaded.base64.length} bytes`,
        )
      }

      return `data:${downloaded.mime};base64,${downloaded.base64}`
    } catch (err) {
      lastErr = err
      // Retry on transient 5xx / timeout. Don't retry on moderation rejection.
      if (err instanceof FluxError) {
        const isModeration = err.status === 400 && err.message.toLowerCase().includes('moderat')
        if (isModeration) throw err
        if (attempt === 0 && isDev) {
          console.warn('⚠️ FLUX.2 attempt 1 failed, retrying:', err.message)
        }
      }
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error('FLUX try-on failed after retries')
}
