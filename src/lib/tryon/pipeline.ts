import { renderTryOnFast } from './renderer'
import {
  cropIdentityRegion,
  extractIdentitySimple
} from './identity-cropper'
import {
  getOrCacheIdentity,
  getCacheStats
} from './identity-cache'

export interface TryOnQualityOptions {
  quality: 'fast' | 'high'
  aspectRatio?: string
  resolution?: string
}

export interface TryOnPresetInput {
  id?: string  // Preset ID for Higgsfield-style scene lookup in renderer
  pose_name?: string
  lighting_name?: string
  background_name?: string
  style_pack?: string
  background_focus?: string
  identity_lock?: 'normal' | 'high'
}

export interface TryOnPipelineResult {
  image: string
  debug: {
    shootPlanText: string
    usedGarmentExtraction: boolean
    timeMs: number
    preset?: string
    identityImagesUsed?: number
    identityCached?: boolean
    identityHash?: string
  }
}

/**
 * FAST TRY-ON PIPELINE (PHASE 4 ARCHITECTURE)
 * 
 * IDENTITY PRESERVATION SYSTEM:
 * - Identity cropping: crop to upper body (head → mid-torso)
 * - Session cache: reuse identity across generations
 * - HEAD_SCALE_LOCK, CAMERA_CONSTRAINT, POSE_INHERITANCE active
 * 
 * Single API call to Gemini with:
 * - Image 1: Person (cropped identity, cached)
 * - Image 2: Garment (visual reference only)
 */
export async function runTryOnPipelineV3(params: {
  subjectImageBase64: string
  clothingRefBase64: string
  preset?: TryOnPresetInput
  userRequest?: string
  quality: TryOnQualityOptions
  /** Enable identity cropping (recommended for 90%+ consistency) */
  useIdentityCropping?: boolean
  /** User ID for session cache (enables character memory) */
  userId?: string
}): Promise<TryOnPipelineResult> {
  const startTime = Date.now()

  const {
    subjectImageBase64,
    clothingRefBase64,
    preset,
    userRequest,
    quality,
    useIdentityCropping = true,  // Default ON for identity preservation
    userId = 'anonymous'
  } = params

  // ═══════════════════════════════════════════════════════════════
  // IDENTITY CROPPING & CACHING
  // ═══════════════════════════════════════════════════════════════

  let processedIdentityImage = subjectImageBase64
  let identityHash: string | undefined
  let identityCached = false

  if (useIdentityCropping) {
    try {
      // Try full cropping with Sharp
      const cropped = await cropIdentityRegion(subjectImageBase64)

      // Cache by (userId + identityHash)
      const cached = getOrCacheIdentity(userId, cropped)

      processedIdentityImage = cached.croppedImageBase64
      identityHash = cached.identityHash
      identityCached = cached.useCount > 1

      console.log(`🔒 IDENTITY SYSTEM:`)
      console.log(`   Cropping: ✓ (upper body)`)
      console.log(`   Hash: ${identityHash}`)
      console.log(`   Cached: ${identityCached ? '✓ (reused)' : '✗ (new)'}`)
      console.log(`   Use count: ${cached.useCount}`)
    } catch (e) {
      // Fallback to simple extraction (just hash, no crop)
      console.warn('⚠️ Identity cropping failed, using fallback')
      const simple = extractIdentitySimple(subjectImageBase64)
      identityHash = simple.identityHash
      processedIdentityImage = subjectImageBase64
    }
  }

  // Extract preset values - ID is critical for scene lookup in renderer
  const presetId = preset?.id
  const backgroundName = preset?.background_name || 'keep the original background'
  const lightingName = preset?.lighting_name || 'natural lighting'

  // Build scene instruction
  let sceneInstruction = backgroundName
  if (userRequest && userRequest.trim()) {
    sceneInstruction = `${sceneInstruction}. ${userRequest}`
  }

  console.log(`\n========== TRY-ON PIPELINE (PHASE 4 - IDENTITY PRESERVATION) ==========`)
  console.log(`🎨 Preset ID: ${presetId || 'none'}`)
  console.log(`📸 Background: "${backgroundName}"`)
  console.log(`💡 Lighting: "${lightingName}"`)
  console.log(`🎯 Quality: ${quality.quality}`)
  console.log(`🔒 HEAD_SCALE_LOCK: ✓`)
  console.log(`📷 CAMERA_CONSTRAINT: ✓`)
  console.log(`🧍 POSE_INHERITANCE: ✓`)
  console.log(`👔 GARMENT_ISOLATION: ✓`)
  console.log(`📊 Cache stats: ${JSON.stringify(getCacheStats())}`)
  console.log(`=====================================\n`)

  // Single render call - PHASE 4: Cropped identity + Garment
  const image = await renderTryOnFast({
    subjectImageBase64: processedIdentityImage, // Image 1: Cropped identity
    garmentImageBase64: clothingRefBase64, // Image 2: Garment (visual reference)
    backgroundInstruction: sceneInstruction,
    lightingInstruction: lightingName,
    quality: quality.quality,
    aspectRatio: quality.aspectRatio,
    resolution: quality.resolution,
    stylePresetId: presetId,
  })

  const elapsed = Date.now() - startTime
  console.log(`✅ Pipeline completed in ${(elapsed / 1000).toFixed(1)}s`)

  return {
    image,
    debug: {
      shootPlanText: sceneInstruction,
      usedGarmentExtraction: false,
      timeMs: elapsed,
      preset: presetId,
      identityImagesUsed: 1,
      identityCached,
      identityHash,
    },
  }
}
