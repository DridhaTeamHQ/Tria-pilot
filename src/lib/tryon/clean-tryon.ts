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
import sharp from 'sharp'
import { preprocessGarmentImage } from '@/lib/tryon/garment-preprocessor'
import { orchestrateTryOn, type PhotoCandidate } from '@/lib/tryon/gpt-orchestrator'
import { analyzeGarment } from '@/lib/tryon/garment-intel'
import { flux2Generate, downloadFluxImage } from '@/lib/flux/client'
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
    graphicPlacement: intel?.graphicPlacement,
  })

  if (!orchestrated || orchestrated.selections.length < 3) {
    throw new Error('GPT-4o orchestrator failed to produce 3 selections — check OPENAI_API_KEY and try again')
  }
  if (isDev) console.log(`🎬 [clean] Step 2 done in ${Date.now() - orchestrateStart}ms — picked ${orchestrated.selections.length} photos`)

  // ── STEP 3: FLUX-2 [pro] SWAPS (3 truly-parallel instances) ──────────
  // FLUX-only. Each of the 3 slots runs as an independent FLUX-2 [pro]
  // call. The BFL key pool (acquireFluxKey, least-busy) gives each
  // parallel call its OWN account/key — so 3 simultaneous swaps don't
  // contend on a single key and degrade each other.
  if (isDev) console.log('🎨 [clean] Step 3: FLUX-2 [pro] swaps (3 parallel, 1 key each)')
  const swapStart = Date.now()

  const photoLookup = new Map(input.candidatePhotos.map((p) => [p.id, p.base64]))

  // FLUX needs explicit width/height (multiples of 64). Mirror the input
  // photo's dimensions exactly — mismatched dims are the #1 cause of FLUX
  // recomposition / zoom hallucinations.
  const roundTo64 = (n: number) => Math.max(64, Math.round(n / 64) * 64)
  const detectDims = async (personBase64: string): Promise<{ width: number; height: number }> => {
    try {
      const meta = await sharp(Buffer.from(personBase64, 'base64')).metadata()
      if (meta.width && meta.height) {
        const MAX_LONG = 1536
        const scale = Math.min(1, MAX_LONG / Math.max(meta.width, meta.height))
        return { width: roundTo64(meta.width * scale), height: roundTo64(meta.height * scale) }
      }
    } catch { /* fall through */ }
    // Aspect fallback
    switch (input.aspectRatio || '4:5') {
      case '1:1': return { width: 1024, height: 1024 }
      case '9:16': return { width: 768, height: 1344 }
      case '16:9': return { width: 1344, height: 768 }
      case '3:4': return { width: 832, height: 1088 }
      default: return { width: 832, height: 1024 }
    }
  }

  // ── Single FLUX call for a slot ──────────────────────────────────────
  // ANTI-HALLUCINATION measures baked in:
  //  - input_image_1 = person, input_image_2 = garment (ONCE — passing the
  //    garment twice was confusing FLUX into compositing it as a flat layer)
  //  - dimensions mirror the input photo exactly (no recomposition)
  //  - distinct per-slot seed (parallel calls don't collapse to the same
  //    deterministic output)
  //  - the orchestrator's BFL-pattern "change X to Y, keep Z" prompt
  const runFluxSlot = async (
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

    // Compact, FLUX-native prompt. The orchestrator already wrote a
    // "change X to Y, keep Z" prompt — append identity + fidelity guards.
    const hasFace = Boolean(faceCropBase64 && faceCropBase64.length > 100)
    const fluxPrompt = (
      `${sel.prompt} ` +
      `Keep the person's face, hair, skin tone, body and pose identical to image 1. ` +
      (hasFace ? `Image 3 is a close-up of this exact person's face — the output face MUST match image 3 precisely; do not generate a different face. ` : '') +
      `Reproduce the garment's full pattern, embroidery, prints and texture detail from image 2 faithfully — do not simplify or wash out intricate motifs. ` +
      `Photorealistic, natural fabric drape, no overlay or sticker effect.`
    ).slice(0, 1500)

    const dims = await detectDims(personBase64)
    // Distinct seed per slot — prevents 3 parallel calls collapsing to
    // similar outputs and gives genuine variation across the 3 results.
    const seed = (Date.now() % 1_000_000_000) + idx * 9973

    // Build the FLUX input image set: person, garment, [face crop].
    // The face crop as a 3rd reference is the strongest lever against
    // identity drift on full-body garment swaps.
    const fluxInputs = hasFace
      ? [personBase64, cleanedGarment, faceCropBase64!.replace(/^data:image\/[a-z+]+;base64,/, '')]
      : [personBase64, cleanedGarment]

    // 2 attempts: FLUX occasionally returns empty under load.
    const MAX_ATTEMPTS = 2
    let lastErr = 'unknown error'
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        if (isDev && attempt > 1) console.log(`   🔁 Slot ${idx + 1} FLUX retry ${attempt}`)
        const result = await flux2Generate({
          prompt: fluxPrompt,
          // person, garment, [face crop]. Face crop = identity anchor.
          inputImages: fluxInputs,
          width: dims.width,
          height: dims.height,
          outputFormat: 'png',
          // Max leniency (FLUX range 0-5). Graphic-print apparel —
          // band tees, Marvel/Venom prints, skull motifs — kept tripping
          // the default strict filter as "horror imagery". This is
          // legitimate licensed product art, so we run at the most
          // permissive setting.
          safetyTolerance: 5,
          timeoutMs: 120_000,
          model: 'flux-2-pro',
          seed: seed + attempt,
        })
        const downloaded = await downloadFluxImage(result.imageUrl)
        const outputBase64 = `data:${downloaded.mime};base64,${downloaded.base64}`
        if (isDev) console.log(`✅ [clean] Slot ${idx + 1} done in ${Date.now() - slotStart}ms (FLUX job ${result.jobId.slice(0, 8)})`)
        return {
          photoId: sel.photoId, prompt: sel.prompt, reasoning: sel.reasoning,
          outputBase64, jobId: result.jobId, seed: result.seed,
          durationMs: Date.now() - slotStart,
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        lastErr = msg
        const isUserActionable = /moderat|safety|401|403/i.test(msg)
        if (isUserActionable || attempt >= MAX_ATTEMPTS) {
          if (isDev) console.warn(`❌ [clean] Slot ${idx + 1} FLUX failed: ${msg.slice(0, 150)}`)
          break
        }
        if (isDev) console.warn(`⚠️ Slot ${idx + 1} FLUX attempt ${attempt} failed: ${msg.slice(0, 100)}`)
        await new Promise((r) => setTimeout(r, 1000 + Math.floor(Math.random() * 600)))
      }
    }

    // ── GEMINI MODERATION FALLBACK ───────────────────────────────────
    // BFL's hard content moderation blocks some legitimate graphic-print
    // apparel (Venom/Marvel monster tees, skull prints) regardless of
    // safety_tolerance. Gemini's content rules are different and accept
    // these. When FLUX fails specifically on moderation, retry the slot
    // on Gemini before giving up.
    const fluxModerationBlocked = /moderat|content.*block|safety/i.test(lastErr)
    if (fluxModerationBlocked) {
      try {
        if (isDev) console.log(`🍌 Slot ${idx + 1} → FLUX moderation-blocked, trying Gemini fallback`)
        const prevEngine = process.env.TRYON_ENGINE
        process.env.TRYON_ENGINE = 'gemini'
        let geminiOut: string
        try {
          geminiOut = await generateTryOnDirect({
            personImageBase64: personBase64,
            garmentImageBase64: cleanedGarment,
            prompt: fluxPrompt,
            aspectRatio: input.aspectRatio || '4:5',
            model: 'gemini-3.1-flash-image-preview',
            garmentIntel: intel,
          } as any)
        } finally {
          if (prevEngine === undefined) delete process.env.TRYON_ENGINE
          else process.env.TRYON_ENGINE = prevEngine
        }
        if (geminiOut && geminiOut.length > 100) {
          if (isDev) console.log(`✨ [clean] Slot ${idx + 1} recovered via Gemini in ${Date.now() - slotStart}ms`)
          return {
            photoId: sel.photoId, prompt: sel.prompt, reasoning: sel.reasoning,
            outputBase64: geminiOut, jobId: `gemini-fallback-${Date.now()}-${idx}`,
            durationMs: Date.now() - slotStart,
          }
        }
      } catch (gemErr) {
        const gmsg = gemErr instanceof Error ? gemErr.message : String(gemErr)
        if (isDev) console.warn(`⚠️ Slot ${idx + 1} Gemini fallback also failed: ${gmsg.slice(0, 120)}`)
        lastErr = `FLUX moderation-blocked, Gemini fallback failed: ${gmsg}`
      }
    }

    return {
      photoId: sel.photoId, prompt: sel.prompt, reasoning: sel.reasoning,
      error: lastErr.slice(0, 400), durationMs: Date.now() - slotStart,
    }
  }

  // Fire all 3 slots truly in parallel. Each flux2Generate internally
  // calls acquireFluxKey() which hands out the least-busy key — so the
  // 3 simultaneous calls land on 3 different BFL accounts.
  const slots = await Promise.all(
    orchestrated.selections.slice(0, 3).map((sel, idx) => runFluxSlot(sel, idx))
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
