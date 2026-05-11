/**
 * CLEAN TRY-ON PIPELINE
 *
 * Single-purpose module that does ONE thing well: takes a garment image
 * and an influencer's photo pool, returns 3 clothing-swap outputs.
 *
 * Pipeline (no fallback chains, no retries, no multi-engine madness):
 *
 *   1. EXTRACT
 *      → If the garment image contains a person wearing it, extract a
 *        clean garment-only image. If it's already flat-lay, passthrough.
 *
 *   2. ORCHESTRATE
 *      → GPT-4o vision looks at the cleaned garment + the influencer's
 *        approved photos. Picks the 3 best photos AND writes a custom
 *        FLUX prompt for each.
 *
 *   3. SWAP (parallel x3)
 *      → For each selection: call FLUX-2 [pro] with
 *           input_image_1 = person photo
 *           input_image_2 = cleaned garment
 *           prompt = GPT-written prompt
 *        Returns the FLUX output as base64.
 *
 *   4. RETURN
 *      → 3 outputs (base64 + photoId + prompt + reasoning).
 *
 * That's the entire pipeline. No fallback engines, no quality retries.
 * If any step fails for a slot, that slot returns an error — the caller
 * decides how to surface it.
 */

import 'server-only'
import { preprocessGarmentImage } from '@/lib/tryon/garment-preprocessor'
import { orchestrateTryOn, type PhotoCandidate } from '@/lib/tryon/gpt-orchestrator'
import { flux2Generate, downloadFluxImage } from '@/lib/flux/client'
import { analyzeGarment } from '@/lib/tryon/garment-intel'
import sharp from 'sharp'

const isDev = process.env.NODE_ENV !== 'production'

export interface CleanTryOnInput {
  /** Garment image, raw base64 (no data: prefix) or with prefix */
  garmentImageBase64: string
  /**
   * Pool of approved influencer photos. Pass at least 3, up to 8.
   * GPT-4o picks the best 3 from this pool.
   */
  candidatePhotos: Array<{
    id: string
    /** Public URL — GPT-4o fetches it via the OpenAI image_url channel */
    imageUrl: string
    /** Base64 — needed to send to FLUX as input_image_1 */
    base64: string
    /** Optional metadata hints */
    bodyVisibility?: string
    framing?: string
    description?: string
  }>
  /** Product name + description for analyzer disambiguation. */
  productText?: string
  /** Output aspect ratio target ('4:5', '1:1', etc) */
  aspectRatio?: '1:1' | '4:5' | '3:4' | '9:16' | '16:9'
}

export interface CleanTryOnSlot {
  photoId: string
  prompt: string
  reasoning: string
  /** Generated try-on image, base64 with data URI prefix */
  outputBase64: string
  /** FLUX job id for debugging / cost tracking */
  jobId: string
  /** Seed used (for reproducibility) */
  seed?: number
  durationMs: number
}

export interface CleanTryOnFailure {
  photoId: string
  prompt: string
  reasoning: string
  error: string
  durationMs: number
}

export interface CleanTryOnResult {
  cleanedGarmentBase64: string
  /** True when preprocessing extracted a garment from an on-model photo */
  wasExtracted: boolean
  selections: Array<CleanTryOnSlot | CleanTryOnFailure>
  totalDurationMs: number
}

function strip(b64: string): string {
  return b64.replace(/^data:image\/[a-z+]+;base64,/, '')
}

// FLUX 2 requires width/height divisible by 64. Match the input photo's
// shape to avoid recomposition / unwanted zooms.
function roundTo64(n: number): number {
  return Math.max(64, Math.round(n / 64) * 64)
}

async function detectDims(personBase64: string): Promise<{ width: number; height: number } | null> {
  try {
    const buf = Buffer.from(personBase64, 'base64')
    const meta = await sharp(buf).metadata()
    if (!meta.width || !meta.height) return null
    const MAX_LONG = 1536
    const scale = Math.min(1, MAX_LONG / Math.max(meta.width, meta.height))
    let w = roundTo64(meta.width * scale)
    let h = roundTo64(meta.height * scale)
    const SHORT_FLOOR = 768
    const shortEdge = Math.min(w, h)
    if (shortEdge < SHORT_FLOOR && Math.min(meta.width, meta.height) >= SHORT_FLOOR) {
      const upscale = SHORT_FLOOR / shortEdge
      w = roundTo64(w * upscale)
      h = roundTo64(h * upscale)
    }
    return { width: w, height: h }
  } catch {
    return null
  }
}

function aspectFallback(aspectRatio: string | undefined): { width: number; height: number } {
  // FLUX 2 expects explicit width/height. Cover common cases.
  switch ((aspectRatio || '4:5').toLowerCase()) {
    case '1:1': return { width: 1024, height: 1024 }
    case '9:16': return { width: 768, height: 1344 }
    case '16:9': return { width: 1344, height: 768 }
    case '3:4': return { width: 832, height: 1088 }
    case '4:5':
    default: return { width: 832, height: 1024 }
  }
}

/**
 * Run the full clean pipeline. Throws only on catastrophic failure
 * (no garment, no photos, no OpenAI key). Individual slot failures
 * are surfaced in the result.
 */
export async function runCleanTryOn(input: CleanTryOnInput): Promise<CleanTryOnResult> {
  const t0 = Date.now()

  // Validate inputs
  const garmentClean = strip(input.garmentImageBase64)
  if (!garmentClean || garmentClean.length < 100) {
    throw new Error('Garment image is missing or too small')
  }
  if (!input.candidatePhotos || input.candidatePhotos.length < 3) {
    throw new Error('Need at least 3 candidate photos in the pool')
  }

  // ── STEP 1: EXTRACT CLEAN GARMENT ────────────────────────────────────
  if (isDev) console.log('🧼 [clean] Step 1: extract garment')
  const extractStart = Date.now()
  let cleanedGarment: string
  let wasExtracted = false
  try {
    const preprocessed = await preprocessGarmentImage(garmentClean, {
      fast: true,
      model: 'flash',
      sessionId: `clean-${Date.now()}`,
    })
    cleanedGarment = strip(preprocessed.processedImage)
    wasExtracted = preprocessed.wasExtracted
  } catch (e) {
    if (isDev) console.warn(`[clean] preprocessing failed, using raw garment: ${e instanceof Error ? e.message : e}`)
    cleanedGarment = garmentClean
    wasExtracted = false
  }
  if (isDev) console.log(`🧼 [clean] Step 1 done in ${Date.now() - extractStart}ms (extracted=${wasExtracted})`)

  // Run garment analysis in parallel with orchestration so we have intel
  // for the coverage hint in case downstream logic needs it. Cheap — runs
  // in the background while orchestrator does its thing.
  const intelPromise = analyzeGarment(cleanedGarment, input.productText).catch(() => null)

  // ── STEP 2: ORCHESTRATE — GPT-4o picks photos + writes prompts ──────
  if (isDev) console.log('🎬 [clean] Step 2: GPT-4o orchestrator')
  const orchestrateStart = Date.now()
  const candidates: PhotoCandidate[] = input.candidatePhotos.slice(0, 8).map((p) => ({
    id: p.id,
    imageUrl: p.imageUrl,
    bodyVisibility: p.bodyVisibility,
    framing: p.framing,
    description: p.description,
  }))

  const intel = await intelPromise
  const orchestrated = await orchestrateTryOn({
    garmentBase64: cleanedGarment,
    candidates,
    productText: input.productText,
    garmentSummary: intel?.description,
  })

  if (!orchestrated || orchestrated.selections.length < 3) {
    throw new Error('GPT-4o orchestrator failed to produce 3 selections — check OPENAI_API_KEY and try again')
  }
  if (isDev) console.log(`🎬 [clean] Step 2 done in ${Date.now() - orchestrateStart}ms — picked ${orchestrated.selections.length} photos`)

  // ── STEP 3: FLUX SWAPS (parallel) ────────────────────────────────────
  if (isDev) console.log('🎨 [clean] Step 3: FLUX swaps (3 parallel)')
  const fluxStart = Date.now()

  // Build a photo lookup so we can find the base64 by photoId
  const photoLookup = new Map(input.candidatePhotos.map((p) => [p.id, p.base64]))

  const slotPromises = orchestrated.selections.slice(0, 3).map(async (sel, idx): Promise<CleanTryOnSlot | CleanTryOnFailure> => {
    const slotStart = Date.now()
    const personBase64 = photoLookup.get(sel.photoId)
    if (!personBase64) {
      return {
        photoId: sel.photoId,
        prompt: sel.prompt,
        reasoning: sel.reasoning,
        error: 'Reference photo missing from pool — pipeline state mismatch',
        durationMs: Date.now() - slotStart,
      }
    }

    try {
      // Mirror the input photo's dimensions exactly (FLUX recomposes if
      // output dims differ from input dims). Fallback to aspect bucket
      // only when Sharp can't read metadata.
      const dims = (await detectDims(personBase64)) || aspectFallback(input.aspectRatio)

      // Stable per-slot seed → re-rolls produce distinct outputs
      const seed = Math.floor((Date.now() + idx * 7919) % 1_000_000_000)

      const result = await flux2Generate({
        prompt: sel.prompt,
        // input_image = person, input_image_2 = garment (FLUX 2 convention)
        inputImages: [personBase64, cleanedGarment],
        width: dims.width,
        height: dims.height,
        outputFormat: 'png',
        safetyTolerance: 2,
        timeoutMs: 150_000,
        model: 'flux-2-pro',
        seed,
      })

      // Download the signed URL (10-min TTL on FLUX URLs)
      const downloaded = await downloadFluxImage(result.imageUrl)
      const outputBase64 = `data:${downloaded.mime};base64,${downloaded.base64}`

      if (isDev) console.log(`✅ [clean] Slot ${idx + 1} done in ${Date.now() - slotStart}ms`)

      return {
        photoId: sel.photoId,
        prompt: sel.prompt,
        reasoning: sel.reasoning,
        outputBase64,
        jobId: result.jobId,
        seed: result.seed,
        durationMs: Date.now() - slotStart,
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (isDev) console.warn(`❌ [clean] Slot ${idx + 1} failed: ${msg.slice(0, 200)}`)
      return {
        photoId: sel.photoId,
        prompt: sel.prompt,
        reasoning: sel.reasoning,
        error: msg.slice(0, 400),
        durationMs: Date.now() - slotStart,
      }
    }
  })

  const slots = await Promise.all(slotPromises)
  if (isDev) console.log(`🎨 [clean] Step 3 done in ${Date.now() - fluxStart}ms`)

  return {
    cleanedGarmentBase64: cleanedGarment,
    wasExtracted,
    selections: slots,
    totalDurationMs: Date.now() - t0,
  }
}

/** Type guard */
export function isCleanTryOnSlotSuccess(s: CleanTryOnSlot | CleanTryOnFailure): s is CleanTryOnSlot {
  return 'outputBase64' in s
}
