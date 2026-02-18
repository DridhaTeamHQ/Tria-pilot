/**
 * HYBRID TRY-ON PIPELINE (Nano Banana Pro Architecture)
 *
 * MAIN ORCHESTRATOR
 *
 * Coordinates:
 * 1. Pre-Analysis (User & Garment Data)
 * 2. Scene Intelligence (GPT-4o mini)
 * 3. Anchor Zone Validation (Deterministic)
 * 4. Nano Banana Pro Rendering (Gemini 3 Pro)
 */

import 'server-only'
import { saveUpload } from '@/lib/storage'
import {
  createGarmentIfNotExists,
  getGarmentByHash,
  hashImageForGarment,
} from '@/lib/garments'
import sharp from 'sharp'
import { analyzeGarmentForensic, type GarmentAnalysis } from './face-analyzer'
import { extractGarmentWithFidelity } from './garment-extractor'
import { detectFaceCoordinates, type FaceCoordinates } from './face-coordinates'
import { compositeFacePixels, extractFacePixels, type FaceBox } from './face-pixel-copy'

// NEW MODULES
// import { runIntelligentPreAnalysis } from './intelligence/intelligent-pipeline'
// import { runSceneIntelligence, SceneIntelligenceOutput } from './intelligence/scene-intelligence-engine'
// import { resolveAnchorZone, AnchorZoneResolution } from './intelligence/anchor-zone-resolver'
import { generateWithNanoBananaPro } from './nano-banana-pro-renderer'

const GARMENT_EXTRACT_MODEL = 'gemini-2.5-flash-image' as const
// Disabled by default: pixel compositing can improve some failures but can also
// create visible artifacts/identity mismatch when target alignment is imperfect.
const ENABLE_DETERMINISTIC_FACE_LOCK = false
const FACE_LOCK_DRIFT_THRESHOLD = 34

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface HybridTryOnInput {
  personImageBase64: string
  clothingImageBase64: string
  aspectRatio?: '1:1' | '4:5' | '3:4' | '9:16'
  preset?: {
    id?: string
    background_name?: string
    lighting_name?: string
  }
  userRequest?: string
  productId?: string | null
  inputPose?: 'standing' | 'sitting' | 'leaning'
  inputFraming?: 'close' | 'mid' | 'full'
}

export interface HybridTryOnResult {
  success: boolean
  image: string
  status: string
  warnings: string[]
  debug: {
    stages: any[]
    totalTimeMs: number
    faceOverwritten: boolean
    sceneIntelligence?: any
    promptUsed?: string
    rendererDebug?: any
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Garment Resolution (Legacy kept for compatibility)
// ═══════════════════════════════════════════════════════════════

function stripDataUrl(base64: string): string {
  return (base64 || '').replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '')
}

function isWeakColorLabel(label: string): boolean {
  const v = (label || '').trim().toLowerCase()
  return !v || v === 'unknown' || v === 'neutral' || v === 'mixed' || v === 'multicolor'
}

function rgbToColorName(r: number, g: number, b: number): string {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min
  const lightness = (max + min) / 2

  let hue = 0
  if (delta > 0) {
    if (max === rn) hue = ((gn - bn) / delta) % 6
    else if (max === gn) hue = (bn - rn) / delta + 2
    else hue = (rn - gn) / delta + 4
    hue = Math.round(hue * 60)
    if (hue < 0) hue += 360
  }

  const saturation = max === 0 ? 0 : delta / max
  if (lightness < 0.12) return 'black'
  if (lightness > 0.9 && saturation < 0.14) return 'white'
  if (saturation < 0.14) return lightness < 0.5 ? 'charcoal gray' : 'light gray'

  if (hue >= 20 && hue < 45) return 'mustard yellow'
  if (hue >= 45 && hue < 68) return 'yellow'
  if (hue >= 68 && hue < 95) return 'olive green'
  if (hue >= 95 && hue < 160) return 'green'
  if (hue >= 160 && hue < 195) return 'teal'
  if (hue >= 195 && hue < 255) return 'blue'
  if (hue >= 255 && hue < 290) return 'purple'
  if (hue >= 290 && hue < 335) return 'magenta'
  return 'red'
}

async function estimateDominantGarmentColor(garmentImageBase64: string): Promise<string | null> {
  try {
    const clean = stripDataUrl(garmentImageBase64)
    const buffer = Buffer.from(clean, 'base64')
    const { data, info } = await sharp(buffer)
      .resize(48, 48, { fit: 'inside' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    let rSum = 0
    let gSum = 0
    let bSum = 0
    let wSum = 0
    for (let i = 0; i < data.length; i += info.channels) {
      const a = data[i + 3] / 255
      if (a < 0.05) continue
      const weight = a
      rSum += data[i] * weight
      gSum += data[i + 1] * weight
      bSum += data[i + 2] * weight
      wSum += weight
    }

    if (wSum < 1) return null
    const r = Math.round(rSum / wSum)
    const g = Math.round(gSum / wSum)
    const b = Math.round(bSum / wSum)
    return rgbToColorName(r, g, b)
  } catch {
    return null
  }
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  return `data:image/png;base64,${buffer.toString('base64')}`
}

function normalizedFaceToBox(face: FaceCoordinates, width: number, height: number): FaceBox {
  const x = Math.max(0, Math.floor((face.xmin / 1000) * width))
  const y = Math.max(0, Math.floor((face.ymin / 1000) * height))
  const right = Math.min(width, Math.ceil((face.xmax / 1000) * width))
  const bottom = Math.min(height, Math.ceil((face.ymax / 1000) * height))

  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
  }
}

function mapSourceBoxToTarget(source: FaceBox, sourceW: number, sourceH: number, targetW: number, targetH: number): FaceBox {
  const x = Math.max(0, Math.floor((source.x / Math.max(1, sourceW)) * targetW))
  const y = Math.max(0, Math.floor((source.y / Math.max(1, sourceH)) * targetH))
  const width = Math.max(1, Math.floor((source.width / Math.max(1, sourceW)) * targetW))
  const height = Math.max(1, Math.floor((source.height / Math.max(1, sourceH)) * targetH))
  return { x, y, width, height }
}

function isPlausibleTargetFace(
  sourceBox: FaceBox,
  targetBox: FaceBox,
  sourceW: number,
  sourceH: number,
  targetW: number,
  targetH: number
): boolean {
  const sourceAreaRatio = (sourceBox.width * sourceBox.height) / Math.max(1, sourceW * sourceH)
  const targetAreaRatio = (targetBox.width * targetBox.height) / Math.max(1, targetW * targetH)
  const sourceWidthRatio = sourceBox.width / Math.max(1, sourceW)
  const targetWidthRatio = targetBox.width / Math.max(1, targetW)
  const sourceHeightRatio = sourceBox.height / Math.max(1, sourceH)
  const targetHeightRatio = targetBox.height / Math.max(1, targetH)

  // Reject tiny detections (common when model invents a small face thumbnail in corner).
  if (targetAreaRatio < 0.015 || targetWidthRatio < 0.08 || targetHeightRatio < 0.08) {
    return false
  }

  // Reject extreme scale mismatch between source and target face size.
  const widthScale = targetWidthRatio / Math.max(0.0001, sourceWidthRatio)
  const heightScale = targetHeightRatio / Math.max(0.0001, sourceHeightRatio)
  const areaScale = targetAreaRatio / Math.max(0.0001, sourceAreaRatio)
  if (widthScale < 0.35 || widthScale > 2.8) return false
  if (heightScale < 0.35 || heightScale > 2.8) return false
  if (areaScale < 0.15 || areaScale > 6.5) return false

  return true
}

async function applyDeterministicFaceLock(personImageBase64: string, generatedBase64: string): Promise<{
  image: string
  applied: boolean
  reason?: string
}> {
  try {
    const originalBuffer = Buffer.from(stripDataUrl(personImageBase64), 'base64')
    const generatedBuffer = Buffer.from(stripDataUrl(generatedBase64), 'base64')

    const [origMeta, genMeta] = await Promise.all([
      sharp(originalBuffer).metadata(),
      sharp(generatedBuffer).metadata(),
    ])

    if (!origMeta.width || !origMeta.height || !genMeta.width || !genMeta.height) {
      return { image: generatedBase64, applied: false, reason: 'metadata_unavailable' }
    }

    const [sourceFace, targetFace] = await Promise.all([
      detectFaceCoordinates(personImageBase64, { allowHeuristicFallback: true }),
      detectFaceCoordinates(generatedBase64),
    ])

    // Never paste when we don't know where the face is in the generated image.
    // Using a fallback (e.g. scaled source box) causes the "ghost face" — a face
    // pasted at wrong coordinates (e.g. top-left). Only composite when we have
    // reliable target face detection.
    if (!targetFace) {
      return { image: generatedBase64, applied: false, reason: 'target_face_not_detected' }
    }

    if (!sourceFace) {
      return { image: generatedBase64, applied: false, reason: 'source_face_not_detected' }
    }

    const sourceBox = normalizedFaceToBox(sourceFace, origMeta.width, origMeta.height)

    const targetBox = normalizedFaceToBox(targetFace, genMeta.width, genMeta.height)
    if (!isPlausibleTargetFace(sourceBox, targetBox, origMeta.width, origMeta.height, genMeta.width, genMeta.height)) {
      return { image: generatedBase64, applied: false, reason: 'target_face_implausible' }
    }

    const faceData = await extractFacePixels(originalBuffer, sourceBox)
    if (!faceData) {
      return { image: generatedBase64, applied: false, reason: 'source_face_extract_failed' }
    }

    const composite = await compositeFacePixels(generatedBuffer, faceData, targetBox, true)
    if (!composite.success) {
      return { image: generatedBase64, applied: false, reason: composite.error || 'face_composite_failed' }
    }

    return {
      image: `data:image/png;base64,${composite.outputBuffer.toString('base64')}`,
      applied: composite.faceSourcedFromOriginal,
    }
  } catch (error) {
    return {
      image: generatedBase64,
      applied: false,
      reason: error instanceof Error ? error.message : 'face_lock_exception',
    }
  }
}

async function extractGarmentWithFlashGuard(
  clothingImageBase64: string,
  garmentAnalysis?: GarmentAnalysis
): Promise<string> {
  // Hard-locked: garment extraction always uses Gemini 2.5 Flash Image.
  const extraction = await extractGarmentWithFidelity({
    clothingImageBase64,
    garmentAnalysis,
    model: GARMENT_EXTRACT_MODEL,
  })
  return extraction.image
}

async function resolveGarmentAssetLocal(params: {
  clothingImageBase64: string
  productId?: string | null
}): Promise<{
  cleanGarmentBase64: string
  garmentDescription: string
}> {
  const rawBase64 = stripDataUrl(params.clothingImageBase64)
  const garmentHash = hashImageForGarment(rawBase64)

  // Always run garment analysis (needed for description even if image is cached)
  console.log('👕 Analyzing garment reference image...')
  let garmentAnalysis: GarmentAnalysis | null = null
  let garmentDescription = ''
  try {
    garmentAnalysis = await analyzeGarmentForensic(params.clothingImageBase64)
    const dominantColor = await estimateDominantGarmentColor(params.clothingImageBase64)
    // Trust sampled dominant color from the actual garment image for color fidelity.
    // GPT color labels can be semantically useful but are less reliable for exact hue.
    const sampledColor = (dominantColor || '').trim()
    const analyzedColor = (garmentAnalysis.primaryColor || '').trim()
    const primaryColor = sampledColor || analyzedColor
    // Build a concise description from the analysis
    const parts: string[] = []
    if (primaryColor) parts.push(primaryColor)
    if (garmentAnalysis.garmentType) parts.push(garmentAnalysis.garmentType)
    if (garmentAnalysis.necklineType) parts.push(`with ${garmentAnalysis.necklineType} neckline`)
    if (garmentAnalysis.patternType && garmentAnalysis.patternType !== 'solid') parts.push(`${garmentAnalysis.patternType} pattern`)
    if (garmentAnalysis.fabricType) parts.push(`in ${garmentAnalysis.fabricType}`)
    garmentDescription = parts.join(' ') || 'garment from reference image'
    if (sampledColor && analyzedColor && sampledColor.toLowerCase() !== analyzedColor.toLowerCase()) {
      console.log(`   Color fidelity: sampled="${sampledColor}", analyzed="${analyzedColor}" (using sampled)`)
    }
    console.log(`   Description: "${garmentDescription}"`)
  } catch (analysisErr) {
    console.warn('⚠️ Garment analysis failed, using generic description:', analysisErr)
    garmentDescription = 'garment from reference image'
  }

  // Check if we already have a clean extracted garment cached
  const existing = await getGarmentByHash(garmentHash)
  if (existing) {
    console.log('👕 Using cached clean garment from DB')
    return {
      cleanGarmentBase64: await fetchImageAsBase64(existing.clean_garment_image_url),
      garmentDescription,
    }
  }

  // Extract clean garment using Gemini 2.5 Flash Image (removes person, keeps garment)
  console.log('👕 Extracting clean garment with Gemini 2.5 Flash Image...')
  const extractedGarmentBase64 = await extractGarmentWithFlashGuard(
    params.clothingImageBase64,
    garmentAnalysis ?? undefined
  )
  console.log('👕 Clean garment extracted successfully')

  // Save to storage and DB (for future cache hits)
  const cleanPath = `garments/${garmentHash}.png`
  const sourcePath = `garments/source/${garmentHash}.jpg`
  const [cleanUrl, sourceUrl] = await Promise.all([
    saveUpload(extractedGarmentBase64, cleanPath, 'garments', 'image/png'),
    saveUpload(params.clothingImageBase64, sourcePath, 'garments', 'image/jpeg'),
  ])

  await createGarmentIfNotExists({
    product_id: params.productId ?? null,
    image_hash: garmentHash,
    clean_garment_image_url: cleanUrl,
    source_image_url: sourceUrl,
    garment_metadata: garmentAnalysis as unknown as Record<string, unknown>,
    verified: false,
  })

  return { cleanGarmentBase64: extractedGarmentBase64, garmentDescription }
}

// ═══════════════════════════════════════════════════════════════
// MAIN PIPELINE EXECUTION
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// MAIN PIPELINE EXECUTION (SIMPLIFIED FOR STRICT FACE AUTHORITY)
// ═══════════════════════════════════════════════════════════════

export async function runHybridTryOnPipeline(
  input: HybridTryOnInput
): Promise<HybridTryOnResult> {
  console.log('🚀 STARTED: Hybrid Try-On Pipeline (Strict Face Authority)')
  const startTime = Date.now()

  // ═══════════════════════════════════════════════════════════════
  // STEP 1: Garment Resolution (Gemini 2.5 Flash Image)
  //
  // - Analyzes clothing reference (GPT-4o mini → description)
  // - If person detected in reference → Flash extracts clean garment
  // - Returns: clean garment image + text description
  // ═══════════════════════════════════════════════════════════════
  const { cleanGarmentBase64, garmentDescription } = await resolveGarmentAssetLocal({
    clothingImageBase64: input.clothingImageBase64,
    productId: input.productId,
  })

  console.log(`👕 Garment ready: "${garmentDescription}"`)

  // STEP 2: Nano Banana Pro Rendering
  // - Final image model is hard-locked to gemini-3-pro-image-preview

  const renderResult = await generateWithNanoBananaPro({
    personImageBase64: input.personImageBase64,
    garmentImageBase64: cleanGarmentBase64,
    garmentDescription,
    aspectRatio: input.aspectRatio,
    presetId: input.preset?.id,
    // Pass the FULL scene description (not just the internal ID)
    userRequest: input.userRequest,
    presetDescription: input.preset?.background_name || input.preset?.id,
    lightingDescription: input.preset?.lighting_name,
  })

  if (!renderResult.success) {
    throw new Error('Nano Banana Pro rendering failed: ' + (renderResult.debug?.error || 'Unknown error'))
  }

  let finalImage = renderResult.image
  let faceOverwritten = false
  let faceLockReason: string | null = 'disabled'
  const warnings: string[] = []

  const microDriftPercent = Number(renderResult.debug?.microDrift?.driftPercent)
  const shouldFaceLockForDrift =
    Number.isFinite(microDriftPercent) && microDriftPercent >= FACE_LOCK_DRIFT_THRESHOLD
  const shouldFaceLockForUnknownFace =
    renderResult.debug?.driftAssessment?.reason === 'generated_face_unknown'
  const shouldApplyDeterministicFaceLock = shouldFaceLockForDrift || shouldFaceLockForUnknownFace

  if (ENABLE_DETERMINISTIC_FACE_LOCK && shouldApplyDeterministicFaceLock) {
    const faceLock = await applyDeterministicFaceLock(input.personImageBase64, renderResult.image)
    finalImage = faceLock.image
    faceOverwritten = faceLock.applied
    faceLockReason = faceLock.reason || null
    if (!faceLock.applied) {
      warnings.push(`Face lock fallback: ${faceLock.reason || 'not applied'}`)
    }
  } else if (ENABLE_DETERMINISTIC_FACE_LOCK) {
    faceLockReason = 'not_needed_low_drift'
  }

  // 3. Return Result
  return {
    success: true,
    image: finalImage,
    status: 'PASS',
    warnings,
    debug: {
      stages: ['garment_extraction', 'strict_renderer'],
      totalTimeMs: Date.now() - startTime,
      faceOverwritten,
      promptUsed: renderResult.promptUsed,
      rendererDebug: {
        ...renderResult.debug,
        deterministicFaceLock: {
          applied: faceOverwritten,
          reason: faceLockReason,
        },
      }
    }
  }
}
