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
  /**
   * Prompt detail level. 'detailed' (default) uses the full fact-sheet
   * prompt. 'simple' uses a stripped-down prompt — useful as a fallback
   * when the detailed version triggers moderation or empty responses.
   */
  promptMode?: 'detailed' | 'simple'
  /**
   * Override the FLUX model. Defaults to FLUX_TRYON_MODEL env or
   * 'flux-2-pro'. Useful for fallback chains: try -pro first, then
   * -flex if -pro empties out.
   */
  modelOverride?: 'flux-2-pro' | 'flux-2-flex' | 'flux-2-max'
  /** Optional seed for reproducibility / re-roll diversity. */
  seed?: number
}

// Round to the nearest multiple of 64 — FLUX.2 requires width/height
// divisible by 64 (or at least min 64). Many FLUX deployments perform best
// when dims are multiples of 64.
function roundTo64(n: number): number {
  return Math.max(64, Math.round(n / 64) * 64)
}

// Aspect ratio → width/height map. FLUX.2 requires explicit dimensions.
// Used as a fallback when we can't read the input photo's actual size.
function aspectToWH(aspect: string | undefined, resolution: string | undefined): { width: number; height: number } {
  // Resolution scale multiplier ('1K' = 1, '2K' = 1.5)
  const scale = resolution === '2K' ? 1.5 : 1
  const baseShort = roundTo64(768 * scale)   // 768 (1K) or 1152 (2K)
  const baseLong = roundTo64(1024 * scale)   // 1024 (1K) or 1536 (2K)

  switch ((aspect || '4:5').toLowerCase()) {
    case '1:1':
      return { width: baseLong, height: baseLong }
    case '9:16':
      return { width: baseShort, height: roundTo64(baseShort * 16 / 9) }
    case '16:9':
      return { width: roundTo64(baseShort * 16 / 9), height: baseShort }
    case '3:4':
      return { width: baseShort, height: roundTo64(baseShort * 4 / 3) }
    case '4:3':
      return { width: roundTo64(baseShort * 4 / 3), height: baseShort }
    case '4:5':
    default:
      return { width: baseShort, height: roundTo64(baseShort * 5 / 4) }
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
/**
 * Build a SHORT prompt for fallback attempts. When the detailed prompt
 * triggers an empty response from FLUX (sometimes happens on dense
 * fact sheets that exhaust the model's attention budget), this stripped
 * version recovers ~70% of failures.
 */
function buildSimpleFluxPrompt(
  garmentIntel: GarmentIntelligence | null | undefined,
  userContext: string,
): string {
  const ctx = userContext ? ` ${userContext}` : ''
  const desc = garmentIntel?.description ||
    (garmentIntel ? `${garmentIntel.primaryColor || ''} ${garmentIntel.pattern || ''} ${garmentIntel.garmentType || 'garment'}`.trim() : 'the garment shown in image 2')

  const garmentType = (garmentIntel?.garmentType || '').toLowerCase()
  const coverage = garmentIntel?.coverage
  const isLower = coverage === 'lower_only' || /pants|jeans|skirt|trouser|short/.test(garmentType)
  const isFull = coverage === 'full_body' || ['co_ord_set', 'full_outfit', 'jumpsuit', 'suit', 'saree', 'lehenga'].includes(garmentType)

  const swapDirective = isFull
    ? 'Replace the full outfit with the garment from image 2.'
    : isLower
      ? 'Replace ONLY the lower garment (pants/jeans/skirt). Keep the top from image 1 unchanged.'
      : 'Replace ONLY the top (shirt/jacket). Keep the bottom from image 1 unchanged.'

  return `Edit image 1: swap the clothing only. Same person, same face, same pose, same framing as image 1. ${swapDirective} The new garment must match image 2 exactly — ${desc}. Photorealistic.${ctx}`.slice(0, 800)
}

function buildFluxClothingSwapPrompt(
  garmentIntel: GarmentIntelligence | null | undefined,
  strictProfile: StrictGarmentProfile | null | undefined,
  userContext: string,
): string {
  // No-intel fast path — still apply anti-zoom + identity guards
  if (!garmentIntel && !strictProfile) {
    const ctx = userContext ? ` ${userContext}` : ''
    return `Edit image 1 to swap clothing only. Keep the EXACT same camera framing, crop, zoom level, and composition as image 1 — do not zoom or recompose. The person stays identical: same face, hair, skin, body, pose. Replace their clothing with a 1:1 reproduction of the garment from image 2 — copy color, pattern, texture, and every detail pixel-for-pixel; do not redesign or modify it. Match the original photo's lighting and shadows. Photorealistic. No zoom, no recomposition, no different person, no extra garments.${ctx}`.slice(0, 1500)
  }

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
  if (strictProfile?.construction?.sleeves?.style && !['straight', 'fitted', 'other'].includes(strictProfile.construction.sleeves.style)) {
    featuresList.push(`${strictProfile.construction.sleeves.style} sleeves`)
  }
  if (strictProfile?.fabric?.drape && strictProfile.fabric.drape !== 'semi-structured') {
    featuresList.push(`${strictProfile.fabric.drape} drape`)
  }
  const features = featuresList.length > 0 ? ` Details: ${featuresList.slice(0, 5).join(', ')}.` : ''

  // Semantic anchor: Gemini's 1-sentence description of the product. Helps
  // FLUX disambiguate when the spec list alone is ambiguous (e.g.
  // "blue cotton top" vs. "blue ribbed cotton crop top with tie front").
  const semanticAnchor = garmentIntel?.description?.trim()
    ? ` This product is: ${garmentIntel.description.trim().replace(/\s+/g, ' ').slice(0, 160)}.`
    : ''

  // Gemini-suggested styling modifiers — these are tuned per-product
  // (e.g. "ensure the bell sleeves drape naturally", "keep the high
  // waistband visible above the hip"). Currently extracted but never
  // reached the prompt; wiring them in here closes the loop between
  // the intelligence panel shown in the UI and the actual generation.
  const styleHints = (garmentIntel?.promptModifiers || [])
    .map((m) => stripInjectionTokens(String(m || '')).trim())
    .filter((m) => m.length > 0 && m.length < 140)
    .slice(0, 3)
  const styleHintsBit = styleHints.length > 0 ? ` Styling notes: ${styleHints.join('; ')}.` : ''

  const garmentDesc = parts.length > 0 ? parts.join(', ') : 'the garment shown in image 2'

  // ── Coverage-aware swap instruction ──────────────────────────────────
  // The single most important fix for fidelity is telling FLUX EXACTLY
  // which body region to replace and which to leave alone. Otherwise
  // FLUX may:
  //   - For lower_only products (jeans/pants): generate a generic
  //     full outfit and skip showing the lower half entirely
  //   - For upper_only products: redesign the existing pants/skirt
  //   - For full_body / co_ord sets: copy only the top and ignore
  //     the matching bottom (or vice versa)
  //
  // Solution: produce a different swap directive per coverage type.

  const garmentTypeRaw = (garmentIntel?.garmentType || '').toLowerCase()
  const coverage = garmentIntel?.coverage || (garmentIntel ? 'upper_only' : null)
  const isFullSet =
    coverage === 'full_body' ||
    garmentTypeRaw === 'co_ord_set' ||
    garmentTypeRaw === 'full_outfit' ||
    garmentTypeRaw === 'jumpsuit' ||
    garmentTypeRaw === 'suit' ||
    garmentTypeRaw === 'saree' ||
    garmentTypeRaw === 'lehenga'

  let swapInstruction: string
  let framingNote = ''

  if (isFullSet) {
    // Full outfit: top + bottom (or full-body garment) — copy BOTH pieces 1:1.
    const topDesc = garmentIntel?.visibleTopInPhoto && garmentIntel.visibleTopInPhoto !== 'none'
      ? garmentIntel.visibleTopInPhoto
      : null
    const bottomDesc = garmentIntel?.visibleBottomInPhoto && garmentIntel.visibleBottomInPhoto !== 'none'
      ? garmentIntel.visibleBottomInPhoto
      : null

    if (topDesc && bottomDesc) {
      // Two distinct pieces shown together — call them out individually
      swapInstruction =
        `Replace the influencer's ENTIRE outfit (both top AND bottom) with a 1:1 reproduction of the matching set from image 2. ` +
        `TOP: ${topDesc}. BOTTOM: ${bottomDesc}. ` +
        `Both pieces must match image 2 pixel-for-pixel — same colors, fabrics, cuts, and details. ` +
        `Do not mix and match: copy BOTH pieces together as a coordinated set.`
    } else {
      // Full-body garment (dress, jumpsuit, saree, lehenga)
      swapInstruction =
        `Replace the influencer's entire outfit with a 1:1 reproduction of the full-body garment from image 2 — ${garmentDesc}.${features} ` +
        `Match every design detail pixel-for-pixel — same color, pattern, texture, cut, length, and silhouette. Do not redesign, modify, or stylize it.`
    }
    framingNote = `If the influencer's photo crops the lower body, expand the framing as little as possible — ideally show full body so the entire outfit is visible.`
  } else if (coverage === 'lower_only' || /pants|jeans|skirt|trouser|short/.test(garmentTypeRaw)) {
    // BOTTOM-ONLY: replace lower garment, KEEP the influencer's existing top.
    const topToKeep = garmentIntel?.visibleTopInPhoto && garmentIntel.visibleTopInPhoto !== 'none'
      ? `(image 2 shows the product paired with ${garmentIntel.visibleTopInPhoto} — IGNORE that top, the influencer's own top stays as-is)`
      : ''
    swapInstruction =
      `Replace ONLY the influencer's lower garment (pants/jeans/skirt) with a 1:1 reproduction of the product from image 2 — ${garmentDesc}.${features} ` +
      `Match the lower garment pixel-for-pixel — same color, wash, pattern, fit, length, pockets, and stitching. ` +
      `KEEP THE INFLUENCER'S EXISTING TOP exactly as it appears in image 1 — do NOT change, recolor, or redesign the top. ${topToKeep}`
    // Lower garments need the lower body visible
    framingNote =
      `IMPORTANT: the output MUST show the lower body so the swapped garment is visible. ` +
      `If image 1 crops at the waist, expand the framing downward to show the legs. ` +
      `Do not crop above the knee.`
  } else {
    // UPPER-ONLY (default): replace top, KEEP influencer's existing pants/skirt.
    const bottomToKeep = garmentIntel?.visibleBottomInPhoto && garmentIntel.visibleBottomInPhoto !== 'none'
      ? `(image 2 shows the product paired with ${garmentIntel.visibleBottomInPhoto} — IGNORE that bottom, the influencer's own bottom stays as-is)`
      : ''
    swapInstruction =
      `Replace ONLY the influencer's upper garment (top/shirt/jacket) with a 1:1 reproduction of the product from image 2 — ${garmentDesc}.${features} ` +
      `Match the upper garment pixel-for-pixel — same color, pattern, neckline, sleeves, fit, and details. ` +
      `KEEP THE INFLUENCER'S EXISTING BOTTOM WEAR (pants, skirt, jeans, or shorts) exactly as it appears in image 1 — do NOT change, recolor, or redesign the bottom. ${bottomToKeep}`
    // Even for upper-only swaps we want the FULL body visible so the
    // garment is shown in proper styling context. Without this hint FLUX
    // tends to crop tighter when the input is a half/full body shot.
    framingNote =
      `Preserve the full body if visible in image 1 — show the influencer head-to-toe (or as much as image 1 shows) so the top is seen with its bottom-wear context. Do not crop tighter than image 1.`
  }

  const userBit = userContext ? ` ${userContext}` : ''

  // Caption-style prompt with anti-zoom guards + coverage-aware swap +
  // negative-style tail. FLUX weights early phrases more heavily.
  const prompt = [
    // 1. EDIT mode + framing lock (anti-zoom)
    `Edit image 1 to swap clothing only. Keep the EXACT same camera framing, crop, zoom level, composition, and viewing angle as image 1. Do not zoom in or out. Do not recompose.`,
    // 2. Person identity lock
    `The person from image 1 stays IDENTICAL — same face, hair, skin tone, body, and pose unchanged.`,
    // 3. Coverage-aware swap directive
    swapInstruction,
    // 4. Framing exception when the lower body must be visible
    framingNote,
    // 5. Semantic anchor + per-product styling hints from garment intel
    `${semanticAnchor}${styleHintsBit}`.trim(),
    // 6. Realism + lighting consistency
    `Match image 1's lighting, fabric drape, and shadows. Photorealistic.`,
    // 7. Negative-style guards (FLUX responds best to these at the tail)
    `No recomposition, no extra garments, no different person, no random outfit changes to parts not being swapped, no text or watermarks, no AI artifacts.${userBit}`,
  ].filter(Boolean).join(' ').slice(0, 2000)

  return prompt
}

/**
 * Read the actual dimensions of the person photo and produce FLUX-ready
 * width/height that EXACTLY MATCH the input. FLUX preserves framing far
 * better when output dims mirror the input — anything else triggers
 * recomposition / unwanted zooms.
 *
 * Constraints:
 *   - dims rounded to multiples of 64 (FLUX requirement)
 *   - long edge capped at 1536 (FLUX.2 [pro] sweet spot, 2K equivalent)
 *   - short edge floored at 768 to keep details
 */
async function detectPersonDimensions(
  personBase64: string,
): Promise<{ width: number; height: number } | null> {
  try {
    const buf = Buffer.from(personBase64, 'base64')
    const meta = await sharp(buf).metadata()
    if (!meta.width || !meta.height) return null

    const srcW = meta.width
    const srcH = meta.height

    // Cap long edge at 1536, scale the short edge proportionally
    const MAX_LONG = 1536
    const scale = Math.min(1, MAX_LONG / Math.max(srcW, srcH))
    let outW = roundTo64(srcW * scale)
    let outH = roundTo64(srcH * scale)

    // Ensure short edge >= 768 for detail (when source is high-res enough)
    const SHORT_FLOOR = 768
    const shortEdge = Math.min(outW, outH)
    if (shortEdge < SHORT_FLOOR && Math.min(srcW, srcH) >= SHORT_FLOOR) {
      const upscale = SHORT_FLOOR / shortEdge
      outW = roundTo64(outW * upscale)
      outH = roundTo64(outH * upscale)
    }

    return { width: outW, height: outH }
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
  const promptMode = options.promptMode || 'detailed'
  const fluxPrompt = promptMode === 'simple'
    ? buildSimpleFluxPrompt(options.garmentIntel ?? null, userContext)
    : buildFluxClothingSwapPrompt(
        options.garmentIntel ?? null,
        options.strictGarmentProfile ?? null,
        userContext,
      )

  // Match output dims to the input person photo EXACTLY (rounded to
  // multiples of 64 + capped at 1536 long edge). Mirroring input dims
  // is the single biggest fix for unwanted zooms / framing changes —
  // when output dims differ from input, FLUX recomposes the scene.
  const detectedDims = await detectPersonDimensions(cleanPerson)
  const { width, height } =
    detectedDims || aspectToWH(options.aspectRatio || '4:5', options.resolution)

  // Optional face crop becomes input_image_3 (FLUX.2 supports up to 8 inputs)
  const inputImages = [cleanPerson, cleanGarment]
  if (options.faceCropBase64) {
    const cleanFace = options.faceCropBase64.replace(/^data:image\/[a-z+]+;base64,/, '')
    if (cleanFace.length > 100) inputImages.push(cleanFace)
  }

  if (isDev) {
    const dimsSource = detectedDims ? 'matched-input' : 'fallback-aspect'
    console.log(
      `🎨 FLUX.2 try-on → ${inputImages.length} inputs · ${width}x${height} (${dimsSource}) · prompt ${fluxPrompt.length} chars`,
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
        model: options.modelOverride,
        seed: options.seed,
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
