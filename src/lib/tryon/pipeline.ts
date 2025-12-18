import { renderTryOnFast } from './renderer'

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
  }
}

/**
 * FAST TRY-ON PIPELINE (PHASE 3 ARCHITECTURE)
 * 
 * Single API call to Gemini with:
 * - Image 1: Person (identity source, pixel-level)
 * - Image 2: Garment (visual reference only, no face/identity)
 * - Prompt controls role separation, pose, scene, and style
 * - Exactly 2 images sent to Gemini
 */
export async function runTryOnPipelineV3(params: {
  subjectImageBase64: string
  clothingRefBase64: string
  preset?: TryOnPresetInput
  userRequest?: string
  quality: TryOnQualityOptions
}): Promise<TryOnPipelineResult> {
  const startTime = Date.now()
  
  const { 
    subjectImageBase64, 
    clothingRefBase64,
    preset, 
    userRequest,
    quality 
  } = params

  // Extract preset values - ID is critical for scene lookup in renderer
  const presetId = preset?.id
  const backgroundName = preset?.background_name || 'keep the original background'
  const lightingName = preset?.lighting_name || 'natural lighting'

  // Build scene instruction
  let sceneInstruction = backgroundName
  if (userRequest && userRequest.trim()) {
    sceneInstruction = `${sceneInstruction}. ${userRequest}`
  }

  console.log(`\n========== TRY-ON PIPELINE (PHASE 3 ARCHITECTURE) ==========`)
  console.log(`🎨 Preset ID: ${presetId || 'none'}`)
  console.log(`📸 Background: "${backgroundName}"`)
  console.log(`💡 Lighting: "${lightingName}"`)
  console.log(`🎯 Quality: ${quality.quality}`)
  console.log(`🔒 Identity: Pixel-level from Image 1 only`)
  console.log(`👗 Garment: Visual reference from Image 2 (no face/identity)`)
  console.log(`📸 Images to Gemini: 2 (person + garment)`)
  console.log(`=====================================\n`)

  // Single render call - PHASE 3: Image 1 (person) + Image 2 (garment)
  const image = await renderTryOnFast({
    subjectImageBase64, // Image 1: Person
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
      identityImagesUsed: 1, // Image 1 is person (identity source)
    },
  }
}
