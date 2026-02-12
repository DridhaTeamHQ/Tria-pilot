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
import { compositeFacePixels, estimateFaceBox, extractFacePixels, type FaceBox } from './face-pixel-copy'

// NEW MODULES
// import { runIntelligentPreAnalysis } from './intelligence/intelligent-pipeline'
// import { runSceneIntelligence, SceneIntelligenceOutput } from './intelligence/scene-intelligence-engine'
// import { resolveAnchorZone, AnchorZoneResolution } from './intelligence/anchor-zone-resolver'
import { generateWithNanoBananaPro } from './nano-banana-pro-renderer'

const GARMENT_EXTRACT_MODEL = 'gemini-2.5-flash-image' as const

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
      detectFaceCoordinates(personImageBase64),
      detectFaceCoordinates(generatedBase64),
    ])

    const sourceBox = sourceFace
      ? normalizedFaceToBox(sourceFace, origMeta.width, origMeta.height)
      : estimateFaceBox(origMeta.width, origMeta.height)

    const fallbackTarget = mapSourceBoxToTarget(sourceBox, origMeta.width, origMeta.height, genMeta.width, genMeta.height)
    const targetBox = targetFace
      ? normalizedFaceToBox(targetFace, genMeta.width, genMeta.height)
      : fallbackTarget

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
    // Build a concise description from the analysis
    const parts: string[] = []
    if (garmentAnalysis.primaryColor) parts.push(garmentAnalysis.primaryColor)
    if (garmentAnalysis.garmentType) parts.push(garmentAnalysis.garmentType)
    if (garmentAnalysis.necklineType) parts.push(`with ${garmentAnalysis.necklineType} neckline`)
    if (garmentAnalysis.patternType && garmentAnalysis.patternType !== 'solid') parts.push(`${garmentAnalysis.patternType} pattern`)
    if (garmentAnalysis.fabricType) parts.push(`in ${garmentAnalysis.fabricType}`)
    garmentDescription = parts.join(' ') || 'garment from reference image'
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

  const faceLock = await applyDeterministicFaceLock(input.personImageBase64, renderResult.image)

  // 3. Return Result
  return {
    success: true,
    image: faceLock.image,
    status: 'PASS',
    warnings: faceLock.applied ? [] : [`Face lock fallback: ${faceLock.reason || 'not applied'}`],
    debug: {
      stages: ['garment_extraction', 'strict_renderer'],
      totalTimeMs: Date.now() - startTime,
      faceOverwritten: faceLock.applied,
      promptUsed: renderResult.promptUsed,
      rendererDebug: {
        ...renderResult.debug,
        deterministicFaceLock: {
          applied: faceLock.applied,
          reason: faceLock.reason || null,
        },
      }
    }
  }
}
