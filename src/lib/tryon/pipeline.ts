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
 * FAST TRY-ON PIPELINE
 * 
 * Single API call to Gemini with Higgsfield Soul inspired prompting.
 * Now supports multiple identity reference images for better face consistency.
 */
export async function runTryOnPipelineV3(params: {
  subjectImageBase64: string
  clothingRefBase64: string
  identityImagesBase64?: string[]
  preset?: TryOnPresetInput
  userRequest?: string
  quality: TryOnQualityOptions
}): Promise<TryOnPipelineResult> {
  const startTime = Date.now()
  
  const { 
    subjectImageBase64, 
    clothingRefBase64,
    identityImagesBase64,
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

  const identityCount = (identityImagesBase64 || []).length

  console.log(`\n========== TRY-ON PIPELINE ==========`)
  console.log(`🎨 Preset ID: ${presetId || 'none'}`)
  console.log(`📸 Background: "${backgroundName}"`)
  console.log(`💡 Lighting: "${lightingName}"`)
  console.log(`🎯 Quality: ${quality.quality}`)
  console.log(`👤 Identity images: ${identityCount + 1} (1 main + ${identityCount} extra)`)
  console.log(`=====================================\n`)

  // Single render call with preset ID for scene lookup
  // Pass identity images for multi-reference support
  const image = await renderTryOnFast({
    subjectImageBase64,
    garmentImageBase64: clothingRefBase64,
    identityImagesBase64,
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
      identityImagesUsed: identityCount + 1,
    },
  }
}
