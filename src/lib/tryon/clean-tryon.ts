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
import { generateTryOnDirect } from '@/lib/nanobanana'
import { analyzeGarment } from '@/lib/tryon/garment-intel'

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
  /**
   * Pre-computed garment intelligence. Pass this when the caller already
   * ran analyzeGarment — avoids a redundant 3-5s Gemini call in the
   * pipeline. If unset, the pipeline runs the analysis itself.
   */
  prebuiltIntel?: import('@/lib/tryon/garment-intel').GarmentIntelligence | null
  /**
   * Set true when the caller already ran preprocessGarmentImage and is
   * passing in the cleaned garment as garmentImageBase64. Skips body
   * detection + extraction inside the pipeline entirely — saves
   * 5-25 seconds depending on model.
   */
  garmentAlreadyPreprocessed?: boolean
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
  // Fast path: when the caller has already preprocessed the garment
  // (the /api/tryon route does this upstream), skip Step 1 entirely.
  // Saves 5-25 seconds (body detection + extraction) per request.
  if (isDev) console.log('🧼 [clean] Step 1: extract garment')
  const extractStart = Date.now()
  let cleanedGarment: string = garmentClean
  let wasExtracted = false

  if (input.garmentAlreadyPreprocessed) {
    if (isDev) console.log(`🧼 [clean] Step 1 SKIPPED — caller marked garment as already preprocessed`)
  } else {
    try {
      // Quick body check first so we can FORCE extraction when needed.
      const { detectHumanInClothingImage } = await import('@/lib/tryon/human-body-detector')
      const detection = await detectHumanInClothingImage(garmentClean).catch(() => null)
      const humanPresent =
        !!(detection && (detection.containsHuman || detection.containsFace || (detection.detectedParts || []).length > 0))

      if (isDev) console.log(`🧼 [clean] body check: humanPresent=${humanPresent} bodyType=${detection?.bodyType || 'unknown'}`)

      const preprocessed = await preprocessGarmentImage(garmentClean, {
        fast: true,
        // Flash extraction is 3-5x faster than Pro and quality is plenty
        // for try-on. Pro was adding 15-20s to every request for marginal
        // gain.
        model: 'flash',
        sessionId: `clean-${Date.now()}`,
        forceExtraction: humanPresent,
      })
      cleanedGarment = strip(preprocessed.processedImage)
      wasExtracted = preprocessed.wasExtracted
    } catch (e) {
      if (isDev) console.warn(`[clean] preprocessing failed, using raw garment: ${e instanceof Error ? e.message : e}`)
      cleanedGarment = garmentClean
      wasExtracted = false
    }
    if (isDev) console.log(`🧼 [clean] Step 1 done in ${Date.now() - extractStart}ms (extracted=${wasExtracted})`)
  }

  // Use pre-computed intel when caller provides it (saves a 3-5s call).
  // Falls through to a fresh analysis when missing.
  const intelPromise = input.prebuiltIntel
    ? Promise.resolve(input.prebuiltIntel)
    : analyzeGarment(cleanedGarment, input.productText).catch(() => null)

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

  // ── STEP 3: GEMINI SWAPS (parallel) ──────────────────────────────────
  if (isDev) console.log('🎨 [clean] Step 3: Gemini swaps (3 parallel) with auto-retry')
  const swapStart = Date.now()

  // Build a photo lookup so we can find the base64 by photoId
  const photoLookup = new Map(input.candidatePhotos.map((p) => [p.id, p.base64]))

  // Backup pool: photos that weren't picked but could substitute for a
  // permanently failing slot. Drawn from the candidate pool minus the
  // 3 already-selected photos.
  const selectedIds = new Set(orchestrated.selections.slice(0, 3).map((s) => s.photoId))
  const backupPool = input.candidatePhotos.filter((p) => !selectedIds.has(p.id) && p.base64.length > 100)

  // ── Single attempt: run Gemini once for a given (person, prompt) ─────
  const runGeminiOnce = async (personBase64: string, prompt: string): Promise<string> => {
    const prevEngine = process.env.TRYON_ENGINE
    process.env.TRYON_ENGINE = 'gemini'
    try {
      const out = await generateTryOnDirect({
        personImageBase64: personBase64,
        garmentImageBase64: cleanedGarment,
        prompt,
        aspectRatio: input.aspectRatio || '4:5',
        // Flash is ~5× faster than Pro (3-5s vs 20-25s per call) and from
        // production logs Pro returns empty more often, falling back to
        // Flash anyway. Skipping straight to Flash so each slot stays
        // well inside Vercel's 60s function timeout.
        model: 'gemini-3.1-flash-image-preview',
        garmentIntel: intel,
      } as any)
      if (!out || out.length < 100) {
        throw new Error('Gemini returned empty output')
      }
      return out
    } finally {
      if (prevEngine === undefined) delete process.env.TRYON_ENGINE
      else process.env.TRYON_ENGINE = prevEngine
    }
  }

  // ── Slot worker: tries primary photo with retry, then backup photos ──
  const runSlotWithFallback = async (
    sel: typeof orchestrated.selections[number],
    idx: number,
    backupQueue: typeof input.candidatePhotos,
  ): Promise<CleanTryOnSlot | CleanTryOnFailure> => {
    const slotStart = Date.now()
    const swapPrompt =
      `${sel.prompt}\n\n` +
      `IMPORTANT: This is a clothing edit only. Preserve the subject's identity (face, hair, skin tone) exactly as shown in image 1 — output the same person, not a different one.`

    // Build the attempt queue: primary photo → backup photos. Each gets
    // up to 2 tries to handle transient Gemini empty responses.
    const primaryPhoto = photoLookup.get(sel.photoId)
    const photoAttempts: Array<{ id: string; base64: string }> = []
    if (primaryPhoto) {
      photoAttempts.push({ id: sel.photoId, base64: primaryPhoto })
    }
    for (const bp of backupQueue) {
      photoAttempts.push({ id: bp.id, base64: bp.base64 })
    }

    const RETRIES_PER_PHOTO = 2
    let lastErr = 'unknown error'

    for (let photoIdx = 0; photoIdx < photoAttempts.length; photoIdx++) {
      const attempt = photoAttempts[photoIdx]
      for (let r = 0; r < RETRIES_PER_PHOTO; r++) {
        try {
          if (isDev && (photoIdx > 0 || r > 0)) {
            console.log(`   🔁 Slot ${idx + 1} attempt: photo=${attempt.id.slice(0, 8)} retry=${r + 1}`)
          }
          const output = await runGeminiOnce(attempt.base64, swapPrompt)
          if (isDev) {
            const tag = photoIdx === 0 && r === 0 ? '✅' : '✨'
            console.log(`${tag} [clean] Slot ${idx + 1} done in ${Date.now() - slotStart}ms${photoIdx > 0 ? ` (backup photo ${attempt.id.slice(0, 8)})` : ''}${r > 0 ? ` after ${r} retries` : ''}`)
          }
          return {
            photoId: attempt.id, // report the photo we actually used
            prompt: sel.prompt,
            reasoning: sel.reasoning,
            outputBase64: output,
            jobId: `gemini-${Date.now()}-${idx}`,
            durationMs: Date.now() - slotStart,
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          lastErr = msg
          // Don't retry user-actionable errors (moderation, auth) on the same photo
          const isUserActionable =
            msg.toLowerCase().includes('moderat') ||
            msg.toLowerCase().includes('safety filter') ||
            /401|403/.test(msg)
          if (isUserActionable) {
            if (isDev) console.warn(`⛔ Slot ${idx + 1} non-retryable: ${msg.slice(0, 150)}`)
            break // move to next photo (or fail) without further retries on this one
          }
          if (isDev) console.warn(`⚠️ Slot ${idx + 1} attempt failed: ${msg.slice(0, 100)}`)
          // Short backoff before retry
          if (r < RETRIES_PER_PHOTO - 1) {
            await new Promise((resolve) => setTimeout(resolve, 600 + Math.floor(Math.random() * 400)))
          }
        }
      }
      // All retries on this photo exhausted, brief pause before backup
      if (photoIdx < photoAttempts.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }

    if (isDev) console.warn(`❌ [clean] Slot ${idx + 1} failed after all attempts: ${lastErr.slice(0, 150)}`)
    return {
      photoId: sel.photoId,
      prompt: sel.prompt,
      reasoning: sel.reasoning,
      error: lastErr.slice(0, 400),
      durationMs: Date.now() - slotStart,
    }
  }

  // Run all 3 slots in parallel. Each slot has its own ordered backup
  // queue — round-robin assigned so different slots try different backups
  // if their primaries fail.
  const slotPromises = orchestrated.selections.slice(0, 3).map((sel, idx) => {
    // Each slot gets every backup in the pool, offset so they prefer
    // different backups when multiple slots need them.
    const offset = idx
    const orderedBackups = backupPool.slice(offset).concat(backupPool.slice(0, offset))
    return runSlotWithFallback(sel, idx, orderedBackups)
  })

  const slots = await Promise.all(slotPromises)
  if (isDev) console.log(`🎨 [clean] Step 3 done in ${Date.now() - swapStart}ms`)

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
