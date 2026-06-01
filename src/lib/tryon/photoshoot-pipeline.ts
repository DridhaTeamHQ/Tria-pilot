/**
 * PHOTOSHOOT PIPELINE (Beta "Full Image Generation" mode)
 *
 * Separate from the clothing-swap pipeline (clean-tryon.ts). Takes a person's
 * photo + a product garment + a scene preset, and generates fresh photoshoot
 * images: the SAME person (face locked) wearing the garment, in a brand-new
 * scene/pose/lighting.
 *
 * Face consistency is the hard part. We lock identity with:
 *   - a tight FACE CROP passed as a dedicated identity-anchor image, and
 *   - a hard face-lock system instruction,
 * generated on Nano Banana (Gemini image), which is strong at subject
 * consistency. Pro is tried first (quality) with a Flash fallback (rate-limit
 * resilience). An optional InsightFace face-restore backstop can be layered
 * on later via face-restore.ts if drift remains.
 */

import 'server-only'
import type { ContentListUnion, GenerateContentConfig, ImageConfig } from '@google/genai'
import { geminiGenerateContent } from '@/lib/gemini/executor'
import { extractFaceCrop } from '@/lib/tryon/face-crop'
import { preprocessGarmentImage } from '@/lib/tryon/garment-preprocessor'
import { analyzeGarment } from '@/lib/tryon/garment-intel'
import { getPhotoshootPreset } from '@/lib/tryon/photoshoot-presets'
import { restoreFaceIdentity } from '@/lib/tryon/face-restore'
import { detectFaceCoordinates, type FaceCoordinates } from '@/lib/tryon/face-coordinates'
import { getOpenAI } from '@/lib/openai'

const isDev = process.env.NODE_ENV !== 'production'

/**
 * GPT-4o picks the SINGLE best face reference from the candidates. Passing
 * multiple face photos confuses both the generator and the swap, so we choose
 * the clearest, most front-facing, unobstructed face and use only that one.
 * Falls back to the first photo on any error.
 */
async function pickBestFaceIndex(images: string[]): Promise<number> {
  if (images.length <= 1) return 0
  try {
    const openai = getOpenAI()
    const resp = await openai.chat.completions.create(
      {
        model: 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 5,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `These are photos of the SAME person. Pick the SINGLE best one to use as the face reference for AI generation + face swap. STRONGLY prefer a photo where the person looks STRAIGHT AT THE CAMERA — a front-facing, level head (NOT turned to the side, NOT a profile, NOT tilted, NOT looking away), with BOTH eyes clearly visible, no sunglasses, even lighting, sharp focus, and the face large in the frame. A straight, front-facing face matters far more than the pose, background, or outfit — a turned or angled face is a bad choice even if the photo is prettier. Reply with ONLY the 0-based index number (e.g. "0").`,
              },
              ...images.map((b64) => ({
                type: 'image_url' as const,
                image_url: {
                  url: b64.startsWith('data:') ? b64 : `data:image/jpeg;base64,${b64}`,
                  detail: 'low' as const,
                },
              })),
            ],
          },
        ],
      },
      { timeout: 15_000 },
    )
    const txt = resp.choices?.[0]?.message?.content?.trim() || '0'
    const m = txt.match(/\d+/)
    const idx = m ? parseInt(m[0], 10) : 0
    return idx >= 0 && idx < images.length ? idx : 0
  } catch (e) {
    if (isDev) console.warn(`[photoshoot] face selection failed, using first photo: ${e instanceof Error ? e.message : e}`)
    return 0
  }
}

/**
 * FORENSIC FACIAL PROFILE (Google Veo / Imagen technique).
 * GPT-4o extracts an objective, feature-by-feature description of THIS person's
 * face (face shape, jaw, eyes, NOSE, lips, brows, beard, skin). Injecting it
 * into the generation prompt anchors the generated face to the real person's
 * specific features (esp. the nose) BEFORE the swap — so the swap has a
 * near-correct target and drifts far less. Empty string on any failure.
 */
async function extractFacialProfile(image: string): Promise<string> {
  try {
    const openai = getOpenAI()
    const resp = await openai.chat.completions.create(
      {
        model: 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 230,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Describe ONLY this person's face, objectively and specifically, as one compact paragraph for an exact identity match. Cover: face shape and jawline; cheekbones and forehead; eye shape, spacing and color; eyebrow shape and thickness; NOSE shape, width, bridge and tip; lip shape and fullness; facial hair (beard/moustache style + density) if any; hairline and hairstyle; skin tone/complexion; and any distinguishing marks (moles, dimples, scars). No clothing, no background, no opinions — only factual facial features.`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`,
                  detail: 'high' as const,
                },
              },
            ],
          },
        ],
      },
      { timeout: 20_000 },
    )
    return (resp.choices?.[0]?.message?.content || '').trim()
  } catch (e) {
    if (isDev) console.warn(`[photoshoot] facial profile extraction failed: ${e instanceof Error ? e.message : e}`)
    return ''
  }
}

// Optional face-restore post-pass for a hard identity lock. OFF by default
// (adds latency + a face-detect call). Activates when an InsightFace service
// is configured (best quality) OR when explicitly enabled to use the Gemini
// restore fallback.
const FACE_RESTORE_ENABLED =
  Boolean((process.env.FACE_SWAP_SERVICE_URL || '').trim()) ||
  process.env.PHOTOSHOOT_FACE_RESTORE === '1' ||
  process.env.PHOTOSHOOT_FACE_RESTORE === 'true'

function readSimilarityThreshold(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number.parseFloat(raw)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(0, Math.min(1, parsed))
}

const PHOTOSHOOT_REROLL_MIN_FACE_SIMILARITY = readSimilarityThreshold('PHOTOSHOOT_REROLL_MIN_FACE_SIMILARITY', 0.62)
const PHOTOSHOOT_HARD_MIN_FACE_SIMILARITY = readSimilarityThreshold('PHOTOSHOOT_HARD_MIN_FACE_SIMILARITY', 0.58)
const PHOTOSHOOT_WARN_MIN_FACE_SIMILARITY = readSimilarityThreshold('PHOTOSHOOT_WARN_MIN_FACE_SIMILARITY', 0.68)

// The forensic facial-text technique helps Imagen, but Google's own Nano Banana
// guidance is the opposite — long face-text DILUTES the image reference. So it's
// OFF by default for our Nano Banana pipeline (enable to A/B test only).
const FORENSIC_PROFILE_ENABLED = process.env.PHOTOSHOOT_FORENSIC_PROFILE === '1'

function strip(b64: string): string {
  return b64.replace(/^data:image\/[a-z+]+;base64,/, '')
}

export interface PhotoshootInput {
  /** Primary source person photo (used for the face crop), base64. */
  personImageBase64: string
  /**
   * Additional reference photos of the SAME person from different angles.
   * Multi-reference is the #1 identity technique: it gives the model a 3D
   * understanding of the head and dramatically cuts face drift.
   */
  extraPersonImagesBase64?: string[]
  /** Product garment image, base64. May be a flat-lay or worn-on-model. */
  garmentImageBase64: string
  /** Curated scene preset id (see photoshoot-presets.ts). */
  presetId: string
  /** Optional free-text extra direction appended to the scene prompt. */
  customScene?: string
  aspectRatio?: '1:1' | '4:5' | '3:4' | '9:16'
  /** How many variants to generate (default 3). */
  variantCount?: number
}

export interface PhotoshootSlot {
  variant: number
  presetId: string
  prompt: string
  /** Generated image, base64 data URL. */
  outputBase64: string
  /** Which face-restore method was applied, if any (diagnostic). */
  restoredVia?: 'insightface' | 'gemini' | null
  /** InsightFace identity similarity AFTER swap (0-1), for diagnostics. */
  faceSimilarity?: number | null
  durationMs: number
}

export interface PhotoshootFailure {
  variant: number
  presetId: string
  prompt: string
  error: string
  durationMs: number
}

export interface PhotoshootResult {
  cleanedGarmentBase64: string
  selections: Array<PhotoshootSlot | PhotoshootFailure>
  totalDurationMs: number
}

export function isPhotoshootSlotSuccess(s: PhotoshootSlot | PhotoshootFailure): s is PhotoshootSlot {
  return 'outputBase64' in s
}

// Per-variant pose direction so the 3 outputs differ — but kept GENTLE with the
// face toward camera. Big head turns / off-camera gazes are a top cause of face
// drift, so all variations keep the face clearly visible and matchable.
const POSE_VARIATIONS = [
  'a relaxed, confident standing pose facing the camera, weight on one leg, calm natural expression',
  'a natural three-quarter stance facing the camera, hands relaxed at the sides',
  'a poised pose with one hand near the waist, shoulders square, looking toward the camera',
  'a calm editorial stance facing the camera, steady direct gaze',
]

// Kept deliberately SHORT and identity-first. Google's own guidance: the model
// preserves identity from the reference IMAGE, not from long text descriptions
// of facial features — and a long, background-heavy prompt dilutes the face.
const FACE_LOCK_SYSTEM_INSTRUCTION = `You are generating a photorealistic PHOTOSHOOT photograph of a REAL, specific person. It must look like a genuine camera photo, never an AI render.

KEEP THE PERSON — TOP PRIORITY:
- The face/head in the output MUST be the SAME person shown in the reference images — the FIRST image is a close-up identity anchor of their face, the next is a wider view of the same person. Treat the close-up as the definitive identity reference and study it carefully. Maintain the EXACT same facial features as the references — same eye shape, nose shape, jawline contour, cheekbones, skin tone and skin texture, hair, facial hair, and any eyewear. Do NOT beautify, smooth, slim, re-age, or average them into a different-looking model. Their friends must recognise them instantly.
- BODY (do NOT reimagine): keep the person's REAL body type, build, weight, height and natural proportions from the reference photos — same shoulder width, torso, waist, arms and overall figure and skin tone. Do NOT slim them down, make them taller, more "model-like", curvier, or otherwise idealize/alter their physique. Reproduce the actual person, not an improved version.
- FRAMING (critical for identity): shoot a MEDIUM portrait from roughly the waist or chest up so the FACE IS LARGE and clearly resolved in the frame. Do NOT render a small full-body figure where the face loses detail. Keep the head facing roughly toward the camera; avoid extreme head turns.

DRESS THEM in the garment from the garment image — copy its exact color, pattern, texture, and cut. If the garment image shows a model, copy ONLY the garment, never that model's face.

BUILD THE NEW SCENE described in the prompt (background, pose, lighting). Keep lighting on the person physically consistent with the scene, and prefer soft, even light on the face over harsh flat flash that washes out features.

REALISM: real photographic skin texture, natural fabric drape, true-to-life color, real depth of field. No plastic/CGI skin, no video-game look, no warped or floating objects.

OUTPUT: one photorealistic photograph. No text, no borders, no watermark.`

// Hard FACE LOCK block appended to EVERY generation prompt (kept verbatim).
const FACE_LOCK_BLOCK = `IMPORTANT - FACE LOCK
Keep the subject's real face exactly the same as the reference image.
Do NOT change facial structure, jawline, eyes shape, nose, lips, skin tone, beard, hairline, age, or expression.
Maintain 100% identity accuracy.
No beautification, no face swapping, no AI alteration.
Preserve natural skin texture, pores, asymmetry, and imperfections.`

function resolveModelsToTry(): string[] {
  // Default to Flash: it has ~10 RPM/key + higher concurrency, so parallel
  // variants on a single Gemini key succeed. Pro (better quality) is opt-in
  // via PHOTOSHOOT_MODEL; when chosen we still fall back to Flash on
  // capacity/rate-limit errors.
  const configured = (process.env.PHOTOSHOOT_MODEL || '').trim()
  const FLASH = 'gemini-3.1-flash-image-preview'
  const PRO = 'gemini-3-pro-image-preview'
  if (configured === PRO || configured === 'pro') return [PRO, FLASH]
  if (configured && configured !== FLASH && configured !== 'flash') return [configured, FLASH]
  return [FLASH]
}

function extractImageFromResponse(response: any): string | null {
  if (response?.data) return `data:image/png;base64,${response.data}`
  const candidate = response?.candidates?.[0]
  const parts = candidate?.content?.parts
  if (Array.isArray(parts)) {
    for (const part of parts) {
      if (part?.inlineData?.mimeType?.startsWith('image/')) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
      }
    }
  }
  return null
}

async function generateOneVariant(opts: {
  personImages: string[]
  faceCropB64: string | null
  garmentB64: string
  prompt: string
  aspectRatio: string
}): Promise<string> {
  // IMAGE ORDER + SANDWICH:
  // Nano Banana attends most strongly to images at the START and END of the
  // content list. Power users report noticeably better identity transfer when
  // the same identity reference is sent at BOTH positions ("sandwich").
  // We sandwich the face crop: first image (strongest weight), then wider
  // person reference (body proportions), then garment, then face crop AGAIN
  // right before the final prompt (recency lock).
  const contents: ContentListUnion = []
  if (opts.faceCropB64) {
    contents.push(
      { inlineData: { data: opts.faceCropB64, mimeType: 'image/jpeg' } } as any,
      'IDENTITY ANCHOR — close-up of the person\'s face. The output face MUST match this exactly: same eye shape, nose, jawline, lips, skin tone, facial hair and every feature. This is the definitive identity reference.',
    )
  }
  opts.personImages.forEach((img, i) => {
    contents.push(
      { inlineData: { data: img, mimeType: 'image/jpeg' } } as any,
      `Reference photo ${i + 1} of the SAME person — wider view for body proportions, build, skin tone and overall identity. Keep this exact face and body.`,
    )
  })
  contents.push(
    { inlineData: { data: opts.garmentB64, mimeType: 'image/jpeg' } } as any,
    'The garment to wear: copy its exact color, pattern, texture, and cut. Ignore any face/model in this garment image.',
  )
  // SANDWICH: face crop again right before the prompt — recency reinforcement
  // for the identity signal. Removes "almost the right person" drift.
  if (opts.faceCropB64) {
    contents.push(
      { inlineData: { data: opts.faceCropB64, mimeType: 'image/jpeg' } } as any,
      'FINAL IDENTITY CHECK — this is the same face as the very first image. The output face must match this person, not a similar-looking model.',
    )
  }
  contents.push(opts.prompt)

  const imageConfig: ImageConfig = {
    aspectRatio: opts.aspectRatio as any,
    personGeneration: 'allow_adult',
  } as ImageConfig

  const config: GenerateContentConfig = {
    responseModalities: ['TEXT', 'IMAGE'],
    systemInstruction: FACE_LOCK_SYSTEM_INSTRUCTION,
    imageConfig,
    // 0.3 — Imagen guidance is that temperatures above 0.3 introduce facial
    // feature variability. Was 0.4; identity comes from image ordering + close
    // framing + low temperature.
    temperature: 0.3,
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ] as any,
  }

  const modelsToTry = resolveModelsToTry()
  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i]
    const isFinal = i === modelsToTry.length - 1
    // Pro model supports an explicit imageSize; Flash does not.
    if (model.includes('pro-image')) (config.imageConfig as ImageConfig).imageSize = '2K' as any
    else delete (config.imageConfig as ImageConfig).imageSize
    try {
      const response = await geminiGenerateContent({ model, contents, config })
      const image = extractImageFromResponse(response)
      if (image) return image
      if (!isFinal) {
        if (isDev) console.warn(`⚠️ [photoshoot] ${model} returned empty — trying fallback`)
        continue
      }
      throw new Error('Image model returned no image')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const lower = msg.toLowerCase()
      const switchable =
        msg.includes('429') || msg.includes('503') || msg.includes('504') ||
        lower.includes('rate limit') || lower.includes('resource_exhausted') ||
        lower.includes('quota') || lower.includes('unavailable') ||
        lower.includes('overloaded') || lower.includes('deadline')
      if (switchable && !isFinal) {
        if (isDev) console.warn(`⚠️ [photoshoot] ${model} ${msg.slice(0, 80)} — switching to fallback`)
        continue
      }
      throw err
    }
  }
  throw new Error('No image generated')
}

export async function runPhotoshoot(input: PhotoshootInput): Promise<PhotoshootResult> {
  const t0 = Date.now()

  const person = strip(input.personImageBase64)
  if (!person || person.length < 100) throw new Error('Source person image is missing or too small')
  // Candidate face photos of the SAME person.
  const extraPersons = (input.extraPersonImagesBase64 || [])
    .map(strip)
    .filter((b) => b && b.length > 100)
  const candidatePersonImages = Array.from(new Set([person, ...extraPersons])).slice(0, 6)
  // Passing MULTIPLE face references confuses the generator and the swap.
  // Have GPT pick the SINGLE clearest, most front-facing face and use ONLY that
  // — both as the generation reference and as the face-swap source.
  const bestIdx = candidatePersonImages.length > 1 ? await pickBestFaceIndex(candidatePersonImages) : 0
  const selectedPerson = candidatePersonImages[bestIdx] ?? person
  const refImages = [selectedPerson]
  if (isDev) console.log(`🧑 [photoshoot] using face #${bestIdx} of ${candidatePersonImages.length} as the single reference`)
  const garmentRaw = strip(input.garmentImageBase64)
  if (!garmentRaw || garmentRaw.length < 100) throw new Error('Garment image is missing or too small')

  const preset = getPhotoshootPreset(input.presetId)
  if (!preset && !input.customScene) {
    throw new Error('Unknown photoshoot preset and no custom scene provided')
  }

  const aspectRatio = input.aspectRatio || '4:5'
  const variantCount = Math.max(1, Math.min(4, input.variantCount ?? 3))

  // ── Prep (parallel): clean garment, face crop, garment desc, face profile ──
  const [cleanedGarment, faceCrop, garmentIntel, facialProfile] = await Promise.all([
    preprocessGarmentImage(garmentRaw, { fast: true, model: 'flash', sessionId: `photoshoot-${Date.now()}` })
      .then((p) => strip(p.processedImage))
      .catch(() => garmentRaw),
    extractFaceCrop(selectedPerson, null)
      .then((r) => (r.success ? strip(r.faceCropBase64) : null))
      .catch(() => null),
    analyzeGarment(garmentRaw).catch(() => null),
    FORENSIC_PROFILE_ENABLED ? extractFacialProfile(selectedPerson) : Promise.resolve(''),
  ])
  if (isDev && facialProfile) console.log(`🧬 [photoshoot] facial profile: ${facialProfile.slice(0, 120)}…`)

  // ── PRE-FLIGHT: face crop quality check ───────────────────────────────
  // If the face crop is missing or too small, InsightFace's face detector
  // will likely fail to find a face on the generated output, so the swap
  // silently skips and the user sees raw Gemini face drift. Surface this
  // loudly so the cause is obvious in the logs, not invisible.
  if (!faceCrop) {
    console.warn(`⚠️ [photoshoot] NO face crop could be extracted from the reference photo — Gemini will rely solely on the wide reference and InsightFace may not lock identity. Suggest using a clearer front-facing source photo.`)
  } else if (faceCrop.length < 20_000) {
    // Base64 length < 20KB → likely sub-200px crop. Won't blow up, but warn.
    console.warn(`⚠️ [photoshoot] face crop is very small (~${Math.round(faceCrop.length / 1024)}KB base64) — InsightFace identity transfer may be weaker than ideal.`)
  } else if (isDev) {
    console.log(`✅ [photoshoot] face crop ready (${Math.round(faceCrop.length / 1024)}KB base64)`)
  }

  const garmentDesc =
    garmentIntel?.description ||
    [garmentIntel?.primaryColor, garmentIntel?.pattern && garmentIntel.pattern !== 'solid' ? garmentIntel.pattern : '', (garmentIntel?.garmentType || '').replace(/_/g, ' ')]
      .filter(Boolean)
      .join(' ')
      .trim()

  // Keep the scene text LEAN. Long verbose SCENE+LIGHTING+CAMERA paragraphs
  // dominate the prompt and dilute the face reference in Nano Banana — which is
  // what made the face drift. Use just the scene line + a short light note;
  // framing is enforced separately below.
  const sceneBlock = preset
    ? `Scene: ${preset.scene} Soft, even, flattering light on the face.`
    : `Scene: ${input.customScene}`
  const negative = preset?.negativeBias || 'no plastic skin, no AI smoothing, no distorted anatomy, no oversaturation'

  const buildPrompt = (variant: number): string =>
    [
      // Identity first — short and direct. The reference images do the heavy
      // lifting; the prompt just reminds the model to keep that person + frame close.
      `Photorealistic fashion photoshoot photo of the SAME person from the reference image, wearing the garment. 100% the SAME face — identical facial structure, same face shape, jawline, eye shape, nose, lips, skin tone and texture as the reference. Do not change, beautify, or swap the face.`,
      // Forensic facial description (Google Veo/Imagen technique) — anchors the
      // exact features (esp. the nose) so the generated face matches before swap.
      facialProfile ? `THE PERSON'S EXACT FACE (reproduce precisely): ${facialProfile}` : '',
      sceneBlock,
      garmentDesc ? `GARMENT: ${garmentDesc}.` : '',
      `POSE: ${POSE_VARIATIONS[variant % POSE_VARIATIONS.length]}. Keep the face clearly visible and facing roughly toward the camera.`,
      preset && input.customScene ? `EXTRA DIRECTION: ${input.customScene}.` : '',
      // FRAMING last so it OVERRIDES any "full-body" wording in the preset camera:
      // a large, close face holds identity; a tiny full-body face drifts.
      `IMPORTANT FRAMING: regardless of the camera note above, shoot a MEDIUM portrait from roughly the waist or chest up so the face is LARGE and clearly visible — do not produce a small full-body figure.`,
      `Make it look like a real photograph (natural skin texture, soft even light on the face, real lighting). Avoid: ${negative}, no face change, no different face, no altered facial features.`,
      // FACE LOCK appended last (strongest recency) on every generation.
      FACE_LOCK_BLOCK,
    ]
      .filter(Boolean)
      .join('\n')

  const presetId = preset?.id || 'custom'

  // Default face box used when client-side detection is imperfect. The
  // InsightFace service does its OWN face detection server-side, so we must
  // never SKIP the swap just because the Gemini detector returned nothing —
  // we pass a best-effort box and let the service handle it.
  const DEFAULT_FACE_BOX: FaceCoordinates = { ymin: 120, xmin: 280, ymax: 620, xmax: 720, confidence: 0.4 }

  // The InsightFace service self-detects faces server-side and ignores the
  // coordinates we pass, so when it's configured we SKIP the (slow, billable)
  // Gemini face-detection entirely — fewer calls, less latency, fewer failure
  // points. Detection is only worthwhile for the Gemini-only fallback path.
  const INSIGHTFACE_CONFIGURED = Boolean((process.env.FACE_SWAP_SERVICE_URL || '').trim())

  // Detect the source person's face ONCE (reused across variants) — only when
  // we'd actually use it (Gemini fallback path).
  let personFace: FaceCoordinates | null = null
  if (FACE_RESTORE_ENABLED && !INSIGHTFACE_CONFIGURED) {
    personFace = await detectFaceCoordinates(selectedPerson, { allowHeuristicFallback: true }).catch(() => null)
  }

  // Post-pass: paste the real face back onto the generated image (InsightFace
  // when FACE_SWAP_SERVICE_URL is set, else Gemini restore fallback). Safe
  // no-op on any failure. Fires whenever the feature is enabled.
  const maybeRestoreFace = async (
    generated: string,
  ): Promise<{ image: string; method: 'insightface' | 'gemini' | null; similarity: number | null }> => {
    if (!FACE_RESTORE_ENABLED) return { image: generated, method: null, similarity: null }
    try {
      // Skip Gemini detection when InsightFace handles detection itself.
      const generatedFace = INSIGHTFACE_CONFIGURED
        ? DEFAULT_FACE_BOX
        : (await detectFaceCoordinates(generated, { allowHeuristicFallback: true }).catch(() => null)) ||
          DEFAULT_FACE_BOX
      const restored = await restoreFaceIdentity({
        generatedImageBase64: generated,
        personImageBase64: selectedPerson,
        faceCropBase64: faceCrop || undefined,
        // All OTHER candidate photos of the same person → averaged identity
        // on the service so the swap doesn't depend on a single photo.
        sourceImagesBase64: candidatePersonImages.filter((b) => b !== selectedPerson),
        generatedFace,
        personFace: personFace || DEFAULT_FACE_BOX,
        aspectRatio,
      })
      if (restored.success && restored.restoredImageBase64 && restored.restoredImageBase64.length > 100) {
        const method = (restored.method as 'insightface' | 'gemini') || null
        const similarity = typeof restored.identitySimilarityAfter === 'number' ? restored.identitySimilarityAfter : null
        console.log(`🔁 [photoshoot] face-restored via ${method || 'unknown'} (identity similarity: ${similarity ?? 'n/a'})`)
        const img = restored.restoredImageBase64
        return { image: img.startsWith('data:') ? img : `data:image/png;base64,${img}`, method, similarity }
      }
      console.warn(`⚠️ [photoshoot] face-restore returned no image (success=${restored.success}, err=${restored.error || 'n/a'})`)
    } catch (e) {
      console.warn(`⚠️ [photoshoot] face-restore threw: ${e instanceof Error ? e.message : e}`)
    }
    return { image: generated, method: null, similarity: null }
  }

  const runVariant = async (variant: number): Promise<PhotoshootSlot | PhotoshootFailure> => {
    const slotStart = Date.now()
    const prompt = buildPrompt(variant)
    try {
      let outputBase64 = await generateOneVariant({
        personImages: refImages,
        faceCropB64: faceCrop,
        garmentB64: cleanedGarment,
        prompt,
        aspectRatio,
      })
      const restored = await maybeRestoreFace(outputBase64)
      outputBase64 = restored.image
      if (isDev) console.log(`✅ [photoshoot] variant ${variant + 1} done in ${Date.now() - slotStart}ms (face-restore: ${restored.method || 'none'})`)
      return { variant, presetId, prompt, outputBase64, restoredVia: restored.method, faceSimilarity: restored.similarity, durationMs: Date.now() - slotStart }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (isDev) console.warn(`❌ [photoshoot] variant ${variant + 1} failed: ${msg.slice(0, 150)}`)
      return { variant, presetId, prompt, error: msg.slice(0, 400), durationMs: Date.now() - slotStart }
    }
  }

  // BEST-OF-N AUTO-CURATION (research-universal "batch and curate"):
  // when InsightFace gives us a per-image identity-similarity score, generate a
  // few EXTRA variants, then keep the highest-matching ones. Beats the 10-20%
  // drift everyone hits, automatically. Without the swap (no score) we just
  // generate the target count.
  //
  // Pool size bumped from +2 to +3 — a wider candidate pool gives the
  // similarity sorter more options to find a high-match output. Capped at 7
  // total so per-request cost stays bounded.
  const curate = FACE_RESTORE_ENABLED && variantCount >= 1
  const poolCount = curate ? Math.min(variantCount + 3, 7) : variantCount

  let allSlots = await Promise.all(
    Array.from({ length: poolCount }, (_, i) => runVariant(i)),
  )

  // AUTO RE-ROLL on low similarity. When InsightFace IS running but every
  // variant came back with poor identity match (best < 0.5), keeping the
  // least-bad still ships a face that drifted. Instead, generate 2 extra
  // variants with a stronger identity-focused prompt and merge them in
  // before curating. Only fires when face restore is enabled and we have
  // similarity scores to judge by — caps the extra cost at 2 variants and
  // ~25-30s additional wall time, well within the 300s function budget.
  if (curate) {
    const scoredSuccesses = allSlots
      .filter(isPhotoshootSlotSuccess)
      .map((s) => s.faceSimilarity)
      .filter((v): v is number => typeof v === 'number')
    const bestSoFar = scoredSuccesses.length ? Math.max(...scoredSuccesses) : null
    if (bestSoFar !== null && bestSoFar < PHOTOSHOOT_REROLL_MIN_FACE_SIMILARITY) {
      console.warn(`🔁 [photoshoot] best similarity ${bestSoFar.toFixed(2)} < ${PHOTOSHOOT_REROLL_MIN_FACE_SIMILARITY.toFixed(2)} — auto re-rolling 2 extra variants with stronger identity prompt`)
      // Override buildPrompt for re-rolls by wrapping the variant runner.
      const reRollVariant = async (variant: number): Promise<PhotoshootSlot | PhotoshootFailure> => {
        const slotStart = Date.now()
        // Pre-pend a maximum-strength identity directive to the regular prompt.
        const basePrompt = buildPrompt(variant)
        const strongerPrompt =
          `MAXIMUM IDENTITY LOCK — the face/head in the output MUST be the exact person from the reference images. Do NOT generate a "similar looking" or "model-style" face. The previous attempts drifted; this attempt must match feature-for-feature: same nose width and bridge, same eye spacing, same jawline curvature, same lip shape, same hairline, same facial hair. Reproduce the real person, not an idealized version.\n\n` +
          basePrompt
        try {
          let outputBase64 = await generateOneVariant({
            personImages: refImages,
            faceCropB64: faceCrop,
            garmentB64: cleanedGarment,
            prompt: strongerPrompt,
            aspectRatio,
          })
          const restored = await maybeRestoreFace(outputBase64)
          outputBase64 = restored.image
          if (isDev) console.log(`✅ [photoshoot] RE-ROLL variant ${variant + 1} done in ${Date.now() - slotStart}ms (sim: ${restored.similarity?.toFixed(2) ?? 'n/a'})`)
          return { variant, presetId, prompt: strongerPrompt, outputBase64, restoredVia: restored.method, faceSimilarity: restored.similarity, durationMs: Date.now() - slotStart }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          return { variant, presetId, prompt: strongerPrompt, error: msg.slice(0, 400), durationMs: Date.now() - slotStart }
        }
      }
      const reRolls = await Promise.all([
        reRollVariant(poolCount),
        reRollVariant(poolCount + 1),
      ])
      allSlots = [...allSlots, ...reRolls]
    }
  }

  let selections: Array<PhotoshootSlot | PhotoshootFailure>
  if (curate) {
    const successes = allSlots.filter(isPhotoshootSlotSuccess)
    const failures = allSlots.filter((s): s is PhotoshootFailure => !isPhotoshootSlotSuccess(s))
    // Rank by face similarity (highest first); slots without a score sink last.
    successes.sort((a, b) => (b.faceSimilarity ?? -1) - (a.faceSimilarity ?? -1))
    const scored = successes.filter((s): s is PhotoshootSlot & { faceSimilarity: number } => typeof s.faceSimilarity === 'number')
    const rejectedForIdentity: PhotoshootFailure[] = scored
      .filter((slot) => slot.faceSimilarity < PHOTOSHOOT_HARD_MIN_FACE_SIMILARITY)
      .map((slot) => ({
        variant: slot.variant,
        presetId: slot.presetId,
        prompt: slot.prompt,
        error: `Rejected by photoshoot face consistency guard: similarity ${slot.faceSimilarity.toFixed(2)} < ${PHOTOSHOOT_HARD_MIN_FACE_SIMILARITY.toFixed(2)}. Facial structure drifted too far from the source.`,
        durationMs: slot.durationMs,
      }))
    const unscoredValidationFailures: PhotoshootFailure[] =
      successes.length > 0 && scored.length === 0
        ? successes.map((slot) => ({
            variant: slot.variant,
            presetId: slot.presetId,
            prompt: slot.prompt,
            error: 'Rejected by photoshoot face consistency guard: face validation score unavailable, so identity could not be confirmed safely.',
            durationMs: slot.durationMs,
          }))
        : []
    const kept = scored
      .filter((slot) => slot.faceSimilarity >= PHOTOSHOOT_HARD_MIN_FACE_SIMILARITY)
      .slice(0, variantCount)
    // Re-index so the UI shows clean "Look 1/2/3".
    kept.forEach((s, i) => { s.variant = i })

    // Always log similarity scores, not just in dev — these are the single
    // most important diagnostic for face-consistency complaints.
    const scores = successes.map((s) => s.faceSimilarity).filter((v): v is number => typeof v === 'number')
    if (scores.length) {
      const best = Math.max(...scores)
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length
      const allStr = successes.map((s) => (s.faceSimilarity ?? 0).toFixed(2)).join(', ')
      console.log(`🏆 [photoshoot] curated ${kept.length}/${successes.length} — similarities: [${allStr}] best=${best.toFixed(2)} avg=${avg.toFixed(2)}`)
      // Loud warning when even the BEST variant is a poor identity match —
      // means face-swap is on but Gemini's source faces are too far off.
      // Common causes: face-crop too small, reference photo low-res, or
      // InsightFace service unhealthy and silently degrading.
      if (best < PHOTOSHOOT_WARN_MIN_FACE_SIMILARITY) {
        console.warn(`⚠️ [photoshoot] LOW IDENTITY MATCH — best similarity ${best.toFixed(2)} < ${PHOTOSHOOT_WARN_MIN_FACE_SIMILARITY.toFixed(2)}. Faces will look almost right but drift. Check FACE_SWAP_SERVICE_URL health and face-crop quality.`)
      }
    } else {
      // No InsightFace scores at all → face-swap silently skipped every variant.
      // This is the #1 cause of "faces don't match" complaints in prod.
      console.warn(`⚠️ [photoshoot] NO face-similarity scores returned across ${successes.length} variants — InsightFace is NOT running. Faces will drift. Verify FACE_SWAP_SERVICE_URL is set and the Render service is awake.`)
    }
    selections = kept.length ? kept : [...rejectedForIdentity, ...unscoredValidationFailures, ...failures].slice(0, variantCount)
    // If everything failed, still surface the failures so the caller sees why.
    if (!kept.length && failures.length && selections.length === 0) selections = failures.slice(0, variantCount)
  } else {
    selections = allSlots.slice(0, variantCount)
  }

  return {
    cleanedGarmentBase64: cleanedGarment,
    selections,
    totalDurationMs: Date.now() - t0,
  }
}
