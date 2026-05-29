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

const isDev = process.env.NODE_ENV !== 'production'

function strip(b64: string): string {
  return b64.replace(/^data:image\/[a-z+]+;base64,/, '')
}

export interface PhotoshootInput {
  /** Source person photo, base64 (with or without data: prefix). */
  personImageBase64: string
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
- The face/head in the output MUST be the SAME person shown in the reference photos (use the close-up face crop as the definitive identity reference). Reproduce that exact face — same features, skin tone, hair, facial hair, and any eyewear. Do NOT beautify, smooth, slim, re-age, or turn them into a different-looking model. Their friends must recognise them instantly.
- FRAMING (critical for identity): shoot a MEDIUM portrait from roughly the waist or chest up so the FACE IS LARGE and clearly resolved in the frame. Do NOT render a small full-body figure where the face loses detail. Keep the head facing roughly toward the camera; avoid extreme head turns.

DRESS THEM in the garment from the garment image — copy its exact color, pattern, texture, and cut. If the garment image shows a model, copy ONLY the garment, never that model's face.

BUILD THE NEW SCENE described in the prompt (background, pose, lighting). Keep lighting on the person physically consistent with the scene, and prefer soft, even light on the face over harsh flat flash that washes out features.

REALISM: real photographic skin texture, natural fabric drape, true-to-life color, real depth of field. No plastic/CGI skin, no video-game look, no warped or floating objects.

OUTPUT: one photorealistic photograph. No text, no borders, no watermark.`

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
  personB64: string
  faceCropB64: string | null
  garmentB64: string
  prompt: string
  aspectRatio: string
}): Promise<string> {
  // Full person photo FIRST (anchors a coherent subject — empirically the
  // ordering that preserved identity best), then the close-up face crop as the
  // definitive identity detail, then the garment.
  const contents: ContentListUnion = [
    { inlineData: { data: opts.personB64, mimeType: 'image/jpeg' } } as any,
    'Image 1 — the person (full photo): the SAME person, keep their exact face and identity.',
  ]
  if (opts.faceCropB64) {
    contents.push(
      { inlineData: { data: opts.faceCropB64, mimeType: 'image/jpeg' } } as any,
      'Image 2 — close-up of the SAME person\'s face: the definitive identity reference; the output face MUST match it exactly.',
    )
  }
  contents.push(
    { inlineData: { data: opts.garmentB64, mimeType: 'image/jpeg' } } as any,
    'Image — the garment to wear: copy its exact color, pattern, texture, and cut.',
    opts.prompt,
  )

  const imageConfig: ImageConfig = {
    aspectRatio: opts.aspectRatio as any,
    personGeneration: 'allow_adult',
  } as ImageConfig

  const config: GenerateContentConfig = {
    responseModalities: ['TEXT', 'IMAGE'],
    systemInstruction: FACE_LOCK_SYSTEM_INSTRUCTION,
    imageConfig,
    // 0.4 matched the earlier good results; identity comes from image ordering
    // + close framing, not from temperature.
    temperature: 0.4,
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
  const garmentRaw = strip(input.garmentImageBase64)
  if (!garmentRaw || garmentRaw.length < 100) throw new Error('Garment image is missing or too small')

  const preset = getPhotoshootPreset(input.presetId)
  if (!preset && !input.customScene) {
    throw new Error('Unknown photoshoot preset and no custom scene provided')
  }

  const aspectRatio = input.aspectRatio || '4:5'
  const variantCount = Math.max(1, Math.min(4, input.variantCount ?? 3))

  // ── Prep (parallel): clean garment, face crop, garment description ──
  const [cleanedGarment, faceCrop, garmentIntel] = await Promise.all([
    preprocessGarmentImage(garmentRaw, { fast: true, model: 'flash', sessionId: `photoshoot-${Date.now()}` })
      .then((p) => strip(p.processedImage))
      .catch(() => garmentRaw),
    extractFaceCrop(person, null)
      .then((r) => (r.success ? strip(r.faceCropBase64) : null))
      .catch(() => null),
    analyzeGarment(garmentRaw).catch(() => null),
  ])

  const garmentDesc =
    garmentIntel?.description ||
    [garmentIntel?.primaryColor, garmentIntel?.pattern && garmentIntel.pattern !== 'solid' ? garmentIntel.pattern : '', (garmentIntel?.garmentType || '').replace(/_/g, ' ')]
      .filter(Boolean)
      .join(' ')
      .trim()

  const sceneBlock = preset
    ? `SCENE: ${preset.scene}\nLIGHTING: ${preset.lighting}\nCAMERA: ${preset.camera}`
    : `SCENE: ${input.customScene}`
  const negative = preset?.negativeBias || 'no plastic skin, no AI smoothing, no distorted anatomy, no oversaturation'

  const buildPrompt = (variant: number): string =>
    [
      // Identity first — short and direct. The reference images do the heavy
      // lifting; the prompt just reminds the model to keep that person + frame close.
      `Photorealistic fashion photoshoot photo of the SAME person from the reference photos, keeping their exact face and identity, wearing the garment.`,
      sceneBlock,
      garmentDesc ? `GARMENT: ${garmentDesc}.` : '',
      `POSE: ${POSE_VARIATIONS[variant % POSE_VARIATIONS.length]}. Keep the face clearly visible and facing roughly toward the camera.`,
      preset && input.customScene ? `EXTRA DIRECTION: ${input.customScene}.` : '',
      // FRAMING last so it OVERRIDES any "full-body" wording in the preset camera:
      // a large, close face holds identity; a tiny full-body face drifts.
      `IMPORTANT FRAMING: regardless of the camera note above, shoot a MEDIUM portrait from roughly the waist or chest up so the face is LARGE and clearly visible — do not produce a small full-body figure.`,
      `Make it look like a real photograph (natural skin texture, soft even light on the face, real lighting). Avoid: ${negative}.`,
    ]
      .filter(Boolean)
      .join('\n')

  const presetId = preset?.id || 'custom'

  const runVariant = async (variant: number): Promise<PhotoshootSlot | PhotoshootFailure> => {
    const slotStart = Date.now()
    const prompt = buildPrompt(variant)
    try {
      const outputBase64 = await generateOneVariant({
        personB64: person,
        faceCropB64: faceCrop,
        garmentB64: cleanedGarment,
        prompt,
        aspectRatio,
      })
      if (isDev) console.log(`✅ [photoshoot] variant ${variant + 1} done in ${Date.now() - slotStart}ms`)
      return { variant, presetId, prompt, outputBase64, durationMs: Date.now() - slotStart }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (isDev) console.warn(`❌ [photoshoot] variant ${variant + 1} failed: ${msg.slice(0, 150)}`)
      return { variant, presetId, prompt, error: msg.slice(0, 400), durationMs: Date.now() - slotStart }
    }
  }

  const selections = await Promise.all(
    Array.from({ length: variantCount }, (_, i) => runVariant(i)),
  )

  return {
    cleanedGarmentBase64: cleanedGarment,
    selections,
    totalDurationMs: Date.now() - t0,
  }
}
