/**
 * HYBRID TRY-ON PIPELINE
 *
 * Flash is used ONLY for garment extraction (identity is NOT trusted from Flash).
 * Nano Banana Pro generates the final influencer image.
 *
 * This pipeline is additive and only runs behind explicit flags.
 */

import 'server-only'
import { getOpenAI } from '@/lib/openai'
import { saveUpload } from '@/lib/storage'
import {
  createGarmentIfNotExists,
  getGarmentByHash,
  hashImageForGarment,
  type GarmentRow,
} from '@/lib/garments'
import { analyzeGarmentForensic, type GarmentAnalysis } from './face-analyzer'
import { detectHumanInClothingImage } from './human-body-detector'
import { extractGarmentWithFidelity } from './garment-extractor'
import {
  runProductionTryOnPipeline,
  type ProductionPipelineResult,
  type ProductionPipelineInput,
} from './production-tryon-pipeline'
import {
  runSceneIntelligence,
  type SceneIntelligenceInput,
  type SceneIntelligenceOutput,
} from './scene-intelligence-engine'
import {
  resolveAnchorZone,
  getPresetPromptText,
  type AnchorZoneResolution,
} from './anchor-zone-resolver'

export interface HybridTryOnInput {
  personImageBase64: string
  clothingImageBase64: string
  brandDna?: string
  preset?: {
    id?: string
    background_name?: string
    lighting_name?: string
    style_pack?: string
    background_focus?: string
  }
  userRequest?: string
  productId?: string | null
  identitySafe?: boolean
  // NEW: Pose and framing hints for Scene Intelligence
  inputPose?: 'standing' | 'sitting' | 'leaning'
  inputFraming?: 'close' | 'mid' | 'full'
}

export interface HybridTryOnResult extends ProductionPipelineResult {
  debug: ProductionPipelineResult['debug'] & {
    garmentHash: string
    garmentCacheHit: boolean
    garmentId?: string
    // NEW: Scene Intelligence debug info
    sceneIntelligence?: SceneIntelligenceOutput
    anchorZoneResolution?: AnchorZoneResolution
  }
}

function stripDataUrl(base64: string): string {
  return (base64 || '').replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '')
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch garment image: ${response.status} ${response.statusText}`)
  }
  const contentType = response.headers.get('content-type') || 'image/png'
  const buffer = Buffer.from(await response.arrayBuffer())
  return `data:${contentType};base64,${buffer.toString('base64')}`
}

// [LEGACY PROMPT GENERATION CODE REMOVED FOR NANO BANANA PRO MIGRATION]

const TRYON_SAFE_PRESET_STRIP_PATTERNS: RegExp[] = [
  /\bclean\b/gi,
  /\belegant\b/gi,
  /\beditorial\b/gi,
  /\bstylish\b/gi,
  /\bartistic\b/gi,
  /\bcreative\b/gi,
  /\baesthetic\b/gi,
  /\bfashion\b/gi,
  /\bportrait\b/gi,
  /\bstudio\b/gi,
  /\bperfect\b/gi,
  /\benhance\w*\b/gi,
  /\bsharp\b/gi,
  /\b(eyes?|gaze|look|expression|focus|focused|stare|emotion|emotional|intense|soft|calm|confident|cinematic)\b/gi,
]

function sanitizeTryOnSceneText(input: unknown, fallback: string): string {
  let value = String(input || fallback)
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  for (const pattern of TRYON_SAFE_PRESET_STRIP_PATTERNS) {
    value = value.replace(pattern, ' ')
  }

  value = value
    .replace(/\s*,\s*/g, ', ')
    .replace(/,\s*,+/g, ', ')
    .replace(/^\s*,\s*|\s*,\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  return value || fallback
}



// ═══════════════════════════════════════════════════════════════════════════════
// NEW: SCENE INTENT GENERATOR (Soft Guidance)
// ═══════════════════════════════════════════════════════════════════════════════

interface SceneIntent {
  environment: string
  lighting: string
}

async function generateHybridSceneIntent(params: {
  brandDna?: string
  preset?: HybridTryOnInput['preset']
  garmentMetadata: Record<string, unknown>
}): Promise<SceneIntent> {
  const openai = getOpenAI()
  const safePreset = {
    ...(params.preset || {}),
    background_name: sanitizeTryOnSceneText(params.preset?.background_name, 'modern minimal indoor space'),
    lighting_name: sanitizeTryOnSceneText(params.preset?.lighting_name, 'soft diffused daylight'),
  }

  console.log('SCENE INTENT GENERATION: STARTED')

  const inputPayload = {
    preset: safePreset,
    garment: params.garmentMetadata
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a scene director for a fashion shoot.
Output strictly clean JSON.

Schema:
{
  "environment": "One short sentence describing the location/background atmosphere",
  "lighting": "One short phrase describing the lighting mood"
}

RULES:
1. SCENE INTENT: Describe the FEEL of the place, not rigid rules.
2. ENVIRONMENT: Keep it broad and atmospheric (e.g., "Modern minimal living room with warm wood tones").
3. LIGHTING: Keep it soft and flattering (e.g., "Diffused morning sunlight", "Cinematic golden hour").
4. FORBIDDEN: NEVER describe the person, face, body, pose, eyes, gaze, or expression.
5. FORBIDDEN WORDS: face, look, stare, handsome, beautiful, perfect, sharp, detailed, portrait.
`
        },
        {
          role: 'user',
          content: JSON.stringify(inputPayload)
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 150,
      temperature: 0.2 // Slight creativity for "feel"
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('No content')

    const parsed = JSON.parse(content)
    return {
      environment: parsed.environment || safePreset.background_name,
      lighting: parsed.lighting || safePreset.lighting_name
    }

  } catch (error) {
    console.warn('Scene intent generation failed, using defaults')
    return {
      environment: safePreset.background_name,
      lighting: safePreset.lighting_name
    }
  }
}



async function extractGarmentWithFlashGuard(
  clothingImageBase64: string,
  garmentAnalysis?: GarmentAnalysis
): Promise<string> {
  const maxAttempts = 2

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const extraction = await extractGarmentWithFidelity({
        clothingImageBase64,
        garmentAnalysis,
        model: 'gemini-2.5-flash-image',
      })

      const detection = await detectHumanInClothingImage(extraction.image)
      if (detection.containsHuman || detection.containsFace || detection.bodyType === 'mannequin') {
        if (attempt < maxAttempts) {
          console.warn(`Hybrid garment extraction rejected (human/face detected). Retrying (${attempt + 1}/${maxAttempts})...`)
          continue
        }
        throw new Error('Flash extraction still contains human anatomy after retry')
      }

      return extraction.image
    } catch (error) {
      if (attempt >= maxAttempts) {
        throw error
      }
      console.warn(`Hybrid garment extraction failed. Retrying (${attempt + 1}/${maxAttempts})...`, error)
    }
  }

  throw new Error('Garment extraction failed after retry')
}

async function resolveGarmentAsset(params: {
  clothingImageBase64: string
  productId?: string | null
}): Promise<{
  garment: GarmentRow | null
  garmentMetadata: Record<string, unknown>
  cleanGarmentBase64: string
  garmentHash: string
  cacheHit: boolean
}> {
  const rawBase64 = stripDataUrl(params.clothingImageBase64)
  const garmentHash = hashImageForGarment(rawBase64)

  // Garments are cached to avoid repeated Flash extraction costs across requests.
  const existing = await getGarmentByHash(garmentHash)
  if (existing) {
    const cleanGarmentBase64 = await fetchImageAsBase64(existing.clean_garment_image_url)
    return {
      garment: existing,
      garmentMetadata: (existing.garment_metadata || {}) as Record<string, unknown>,
      cleanGarmentBase64,
      garmentHash,
      cacheHit: true,
    }
  }

  const garmentAnalysis = await analyzeGarmentForensic(params.clothingImageBase64)
  // Flash is NOT trusted for identity. We use Flash ONLY to isolate the garment.
  const extractedGarmentBase64 = await extractGarmentWithFlashGuard(
    params.clothingImageBase64,
    garmentAnalysis
  )

  const cleanPath = `garments/${garmentHash}.png`
  const sourcePath = `garments/source/${garmentHash}.jpg`

  const [cleanUrl, sourceUrl] = await Promise.all([
    saveUpload(extractedGarmentBase64, cleanPath, 'garments', 'image/png'),
    saveUpload(params.clothingImageBase64, sourcePath, 'garments', 'image/jpeg'),
  ])

  const { garment } = await createGarmentIfNotExists({
    product_id: params.productId ?? null,
    image_hash: garmentHash,
    clean_garment_image_url: cleanUrl,
    source_image_url: sourceUrl,
    garment_metadata: garmentAnalysis as unknown as Record<string, unknown>,
    verified: false, // default: unverified until human QA
  })

  const canonicalCleanBase64 =
    garment.clean_garment_image_url === cleanUrl
      ? extractedGarmentBase64
      : await fetchImageAsBase64(garment.clean_garment_image_url)

  return {
    garment,
    garmentMetadata: (garment.garment_metadata || {}) as Record<string, unknown>,
    cleanGarmentBase64: canonicalCleanBase64,
    garmentHash,
    cacheHit: false,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function runHybridTryOnPipeline(
  input: HybridTryOnInput
): Promise<HybridTryOnResult> {
  // FINAL RENDER ENGINE (MUST NOT BE FLASH)
  console.log('FINAL_RENDER_ENGINE: nano-banana-pro')

  const garmentAsset = await resolveGarmentAsset({
    clothingImageBase64: input.clothingImageBase64,
    productId: input.productId ?? null,
  })

  // ═══════════════════════════════════════════════════════════════════════════════
  // SCENE INTELLIGENCE LAYER (NEW)
  // ═══════════════════════════════════════════════════════════════════════════════

  // Default pose/framing if not provided (safe defaults)
  const inputPose = input.inputPose || 'standing'
  const inputFraming = input.inputFraming || 'mid'

  // Derive garment type from metadata
  const garmentType = String(
    (garmentAsset.garmentMetadata as Record<string, unknown>)?.garment_type ||
    (garmentAsset.garmentMetadata as Record<string, unknown>)?.category ||
    'top'
  )

  // Call Scene Intelligence Engine
  const sceneIntel = await runSceneIntelligence({
    selectedPreset: input.preset?.id || input.preset?.background_name || 'minimal_living_room',
    inputPose,
    inputFraming,
    garmentType,
    environmentRiskFlags: [],
  })

  // Validate anchor zone in code (GPT is advisory, code is authoritative)
  const anchorResolution = resolveAnchorZone(
    sceneIntel.fallback.used ? sceneIntel.fallback.preset! : sceneIntel.preset,
    sceneIntel.anchorZone,
    inputPose
  )

  // Determine final preset to use
  const finalPresetKey = anchorResolution.fallbackUsed
    ? anchorResolution.fallbackPreset!
    : sceneIntel.preset

  // Log fallback if triggered
  if (anchorResolution.fallbackUsed) {
    console.warn(
      `SCENE INTELLIGENCE: Fallback triggered. Reason: ${anchorResolution.reason}`
    )
    if (sceneIntel.userRecommendation) {
      console.log(`USER_RECOMMENDATION: ${sceneIntel.userRecommendation}`)
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SIMPLIFIED PROMPT ASSEMBLY — DIRECT PRESET INJECTION
  // ═══════════════════════════════════════════════════════════════════════════════
  // 
  // REWRITTEN: Bypasses all complex authority/permission layers.
  // The preset scene description goes DIRECTLY to Gemini.
  // ═══════════════════════════════════════════════════════════════════════════════

  // Get preset ID from input
  const presetId = input.preset?.id || input.preset?.background_name || null

  // Directly fetch the preset from the registry
  const { getPresetById } = await import('./presets/index')
  const presetData = presetId ? getPresetById(presetId) : null

  // Log preset lookup
  console.log('═══════════════════════════════════════════════════════════════════════════════')
  console.log('PRESET SYSTEM (SIMPLIFIED):')
  console.log(`  Preset ID: ${presetId || 'NONE'}`)
  console.log(`  Preset Found: ${presetData ? 'YES' : 'NO'}`)
  if (presetData) {
    console.log(`  Scene: ${presetData.scene.substring(0, 80)}...`)
    console.log(`  Lighting: ${presetData.lighting.substring(0, 60)}...`)
  }
  console.log('═══════════════════════════════════════════════════════════════════════════════')

  // 1. IDENTITY (LOCKED) - Always first
  const identityLine =
    'Preserve the identity from Image 1 exactly. Do not reinterpret the face.'

  // 2. SCENE - DIRECT INJECTION (no authority checks!)
  let sceneLine: string
  if (presetData) {
    // Use the FULL scene description from the preset
    sceneLine = `SCENE: ${presetData.scene}`
  } else if (input.preset?.background_name) {
    // Fallback to background_name if no registry match
    sceneLine = `SCENE: ${input.preset.background_name}`
  } else {
    // No preset - neutral scene
    sceneLine = ''
  }

  // 3. GARMENT - Always the same
  const garmentLine = 'Apply the clothing from Image 2 onto the person in Image 1.'

  // 4. LIGHTING - DIRECT INJECTION (no authority checks!)
  let lightingLine: string
  if (presetData) {
    // Use the FULL lighting description from the preset
    lightingLine = `LIGHTING: ${presetData.lighting}`
  } else if (input.preset?.lighting_name) {
    // Fallback to lighting_name if no registry match
    lightingLine = `LIGHTING: ${input.preset.lighting_name}`
  } else {
    // No preset - neutral lighting
    lightingLine = 'Soft natural daylight.'
  }

  // 5. CAMERA - Photorealistic
  const cameraLine = 'Photorealistic, 8k, highly detailed.'

  // Build final prompt - filter out empty lines
  const promptParts = [identityLine, sceneLine, garmentLine, lightingLine, cameraLine].filter(
    (line) => line.trim() !== ''
  )
  const finalPrompt = promptParts.join('\n\n')

  // Log the final prompt for debugging
  console.log('═══════════════════════════════════════════════════════════════════════════════')
  console.log('FINAL PROMPT BEING SENT TO GEMINI:')
  console.log(finalPrompt)
  console.log('═══════════════════════════════════════════════════════════════════════════════')

  // DO NOT TOUCH: identity-sensitive framework
  const productionInput: ProductionPipelineInput = {
    personImageBase64: input.personImageBase64,
    garmentImageBase64: garmentAsset.cleanGarmentBase64,
    sceneDescription: sceneLine,
    preset: input.preset,
    userRequest: input.userRequest,
    promptOverride: finalPrompt, // The Text Prompt
    scenePlan: {
      environment: sceneLine,
      lighting: lightingLine,
    },
    identitySafe: true, // Always safe now
    renderEngine: 'nano-banana-pro',
  }

  const result = await runProductionTryOnPipeline(productionInput)

  return {
    ...result,
    debug: {
      ...result.debug,
      garmentHash: garmentAsset.garmentHash,
      garmentCacheHit: garmentAsset.cacheHit,
      garmentId: garmentAsset.garment?.id,
      sceneIntelligence: sceneIntel,
      anchorZoneResolution: anchorResolution,
    },
  }
}
