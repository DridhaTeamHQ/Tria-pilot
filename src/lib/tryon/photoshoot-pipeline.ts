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

KEEP THE PERSON — THIS IS THE #1 PRIORITY:
- The face and head in the output MUST be the SAME person shown in the FIRST image (the face reference). Reproduce that exact face: same face shape, features, skin tone, hair, facial hair, and any eyewear. Do NOT beautify, smooth, slim, re-age, or average it into a different-looking model. Their friends must recognise them instantly.
- Keep the head facing roughly toward the camera so the face stays clearly visible and easy to match. Avoid extreme head rotations.

DRESS THEM in the garment from the garment image — copy its exact color, pattern, texture, and cut. If the garment image shows a model, copy ONLY the garment, never that model's face.

BUILD THE NEW SCENE described in the prompt (background, pose, lighting). Keep lighting on the person physically consistent with the scene.

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
  // Identity reference FIRST (research + Google guidance: put the character
  // reference first and label each image's role). When we have a tight face
  // crop, lead with it as the locked identity; otherwise lead with the full photo.
  const contents: ContentListUnion = []
  if (opts.faceCropB64) {
    contents.push(
      { inlineData: { data: opts.faceCropB64, mimeType: 'image/jpeg' } } as any,
      'Image 1 — the person\'s FACE: this is the locked identity. The output face must be this exact person.',
      { inlineData: { data: opts.personB64, mimeType: 'image/jpeg' } } as any,
      'Image 2 — the SAME person (full photo): use for body build, proportions, and skin tone.',
      { inlineData: { data: opts.garmentB64, mimeType: 'image/jpeg' } } as any,
      'Image 3 — the garment to wear: copy its exact color, pattern, texture, and cut.',
      opts.prompt,
    )
  } else {
    contents.push(
      { inlineData: { data: opts.personB64, mimeType: 'image/jpeg' } } as any,
      'Image 1 — the person: keep this exact face and identity in the output.',
      { inlineData: { data: opts.garmentB64, mimeType: 'image/jpeg' } } as any,
      'Image 2 — the garment to wear: copy its exact color, pattern, texture, and cut.',
      opts.prompt,
    )
  }

  const imageConfig: ImageConfig = {
    aspectRatio: opts.aspectRatio as any,
    personGeneration: 'allow_adult',
  } as ImageConfig

  const config: GenerateContentConfig = {
    responseModalities: ['TEXT', 'IMAGE'],
    systemInstruction: FACE_LOCK_SYSTEM_INSTRUCTION,
    imageConfig,
    // Moderate-low temperature: faithful to the references without the
    // occasional low-temp artifacts. Identity comes from the image + ordering,
    // not from cranking temperature.
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
      // Identity first — short and direct. The face reference image does the
      // heavy lifting; the prompt just reminds the model to keep that person.
      `Photorealistic fashion photoshoot photo of the SAME person from the face reference (Image 1), keeping their exact face and identity, wearing the garment.`,
      sceneBlock,
      garmentDesc ? `GARMENT: ${garmentDesc}.` : '',
      `POSE: ${POSE_VARIATIONS[variant % POSE_VARIATIONS.length]}. Keep the face clearly visible and facing roughly toward the camera.`,
      preset && input.customScene ? `EXTRA DIRECTION: ${input.customScene}.` : '',
      `Make it look like a real photograph (natural skin texture, real lighting). Avoid: ${negative}.`,
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
