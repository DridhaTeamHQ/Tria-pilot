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
import { analyzeGarment } from '@/lib/tryon/garment-intel'
import { generateTryOnDirect } from '@/lib/nanobanana'

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
    /**
     * Optional tight face crop of this person, base64. When supplied it's
     * passed to FLUX as input_image_3 — a dedicated identity anchor that
     * dramatically reduces face drift on full-body garment swaps.
     */
    faceCropBase64?: string
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

  // VARIETY ROTATION — without this the orchestrator always converges on
  // the same "best 3" photos, so every generation looks identical. We
  // shuffle the approved pool and, when there are more than 5 photos,
  // pass only a RANDOM WINDOW of them. Different window each run → the
  // orchestrator literally cannot keep picking the same 3 → the user
  // gets variety across generations.
  const shuffledPool = [...input.candidatePhotos]
  for (let i = shuffledPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffledPool[i], shuffledPool[j]] = [shuffledPool[j], shuffledPool[i]]
  }
  // Window: if the pool is large, only show a random 5 so picks rotate.
  // 5 still gives the orchestrator real choice while forcing variety.
  const orchestratorPool = shuffledPool.length > 5 ? shuffledPool.slice(0, 5) : shuffledPool
  if (isDev) {
    console.log(`🎲 [clean] variety window: ${orchestratorPool.length}/${input.candidatePhotos.length} photos → ${orchestratorPool.map((p) => p.id.slice(0, 6)).join(', ')}`)
  }

  const candidates: PhotoCandidate[] = orchestratorPool.slice(0, 8).map((p) => ({
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
    graphicPlacement: intel?.graphicPlacement,
    visibleTopInPhoto: intel?.visibleTopInPhoto,
    visibleBottomInPhoto: intel?.visibleBottomInPhoto,
  })

  if (!orchestrated || orchestrated.selections.length < 3) {
    throw new Error('GPT-4o orchestrator failed to produce 3 selections — check OPENAI_API_KEY and try again')
  }
  if (isDev) console.log(`🎬 [clean] Step 2 done in ${Date.now() - orchestrateStart}ms — picked ${orchestrated.selections.length} photos`)

  // ── STEP 3: GEMINI SWAPS (3 parallel) ────────────────────────────────
  // Gemini-only. FLUX removed entirely from the influencer pipeline.
  // Each of the 3 slots runs an independent Gemini Nano Banana call.
  if (isDev) console.log('🎨 [clean] Step 3: Gemini swaps (3 parallel)')
  const swapStart = Date.now()

  const photoLookup = new Map(input.candidatePhotos.map((p) => [p.id, p.base64]))

  const runGeminiSlot = async (
    sel: typeof orchestrated.selections[number],
    idx: number,
  ): Promise<CleanTryOnSlot | CleanTryOnFailure> => {
    const slotStart = Date.now()
    const photoRecord = input.candidatePhotos.find((p) => p.id === sel.photoId)
    const personBase64 = photoRecord?.base64 || photoLookup.get(sel.photoId)
    if (!personBase64) {
      return {
        photoId: sel.photoId, prompt: sel.prompt, reasoning: sel.reasoning,
        error: 'Reference photo missing from pool', durationMs: Date.now() - slotStart,
      }
    }
    const faceCropBase64 = photoRecord?.faceCropBase64
    const hasFace = Boolean(faceCropBase64 && faceCropBase64.length > 100)

    // Orchestrator's "change X to Y, keep Z" prompt + identity/fidelity guards.
    const swapPrompt = (
      `${sel.prompt} ` +
      `Keep the person's face, hair, skin tone, body and pose identical to image 1. ` +
      (hasFace ? `Image 3 is a close-up of this exact person's face — the output face MUST match image 3 precisely; do not generate a different face. ` : '') +
      `Reproduce the garment's full pattern, embroidery, prints and texture detail from image 2 faithfully — do not simplify or wash out intricate motifs. ` +
      `Photorealistic, natural fabric drape, no overlay or sticker effect.`
    ).slice(0, 1500)

    // 2 attempts — Gemini occasionally returns empty under load.
    const MAX_ATTEMPTS = 2
    let lastErr = 'unknown error'
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const prevEngine = process.env.TRYON_ENGINE
      process.env.TRYON_ENGINE = 'gemini'
      try {
        if (isDev && attempt > 1) console.log(`   🔁 Slot ${idx + 1} Gemini retry ${attempt}`)
        const out = await generateTryOnDirect({
          personImageBase64: personBase64,
          garmentImageBase64: cleanedGarment,
          faceCropBase64: hasFace ? faceCropBase64 : undefined,
          prompt: swapPrompt,
          aspectRatio: input.aspectRatio || '4:5',
          model: 'gemini-3.1-flash-image-preview',
          garmentIntel: intel,
        } as any)
        if (!out || out.length < 100) throw new Error('Gemini returned empty output')
        if (isDev) console.log(`✅ [clean] Slot ${idx + 1} done in ${Date.now() - slotStart}ms`)
        return {
          photoId: sel.photoId, prompt: sel.prompt, reasoning: sel.reasoning,
          outputBase64: out, jobId: `gemini-${Date.now()}-${idx}`,
          durationMs: Date.now() - slotStart,
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        lastErr = msg
        const isUserActionable = /moderat|safety filter|invalid (person|garment)|401|403/i.test(msg)
        if (isUserActionable || attempt >= MAX_ATTEMPTS) {
          if (isDev) console.warn(`❌ [clean] Slot ${idx + 1} Gemini failed: ${msg.slice(0, 150)}`)
          break
        }
        if (isDev) console.warn(`⚠️ Slot ${idx + 1} Gemini attempt ${attempt} failed: ${msg.slice(0, 100)}`)
        await new Promise((r) => setTimeout(r, 1000 + Math.floor(Math.random() * 600)))
      } finally {
        if (prevEngine === undefined) delete process.env.TRYON_ENGINE
        else process.env.TRYON_ENGINE = prevEngine
      }
    }

    return {
      photoId: sel.photoId, prompt: sel.prompt, reasoning: sel.reasoning,
      error: lastErr.slice(0, 400), durationMs: Date.now() - slotStart,
    }
  }

  // Fire all 3 slots in parallel.
  const slots = await Promise.all(
    orchestrated.selections.slice(0, 3).map((sel, idx) => runGeminiSlot(sel, idx))
  )
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
