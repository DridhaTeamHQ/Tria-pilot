import type { TryOnQualityOptions } from './types'
import { generateShootPlanV3 } from './director'
import { extractGarmentOnlyImage } from './garment-extractor'
import { renderTryOnV3 } from './renderer'
import { verifyTryOnImage } from './verifier'
import { analyzeSubjectPhoto } from './photo-analyzer'
import { selectRealismRecipe } from './realism-selector'
import { analyzeGarment, type GarmentAnalysis } from './garment-analyzer'

export async function runTryOnPipelineV3(params: {
  subjectImageBase64: string
  clothingRefBase64: string
  identityImagesBase64?: string[]
  preset?: {
    pose_name: string
    lighting_name: string
    background_name: string
    style_pack?: any
    background_focus?: any
    identity_lock?: 'normal' | 'high'
  }
  userRequest?: string
  quality: TryOnQualityOptions
}): Promise<{
  image: string
  debug: {
    shootPlanText: string
    usedGarmentExtraction: boolean
    verify?: any
    realismRecipeId?: string
    realismWhy?: string
    retryCount?: number
    retryReason?: string
    garmentAnalysis?: GarmentAnalysis
  }
}> {
  const { subjectImageBase64, clothingRefBase64, identityImagesBase64 = [], preset, userRequest, quality } = params

  const pose_name = preset?.pose_name || 'keep the subject pose unchanged'
  const lighting_name = preset?.lighting_name || 'match the original photo lighting'
  const background_name = preset?.background_name || 'keep the original background'
  const stylePack = preset?.style_pack
  const backgroundFocus = preset?.background_focus
  const identityLock = preset?.identity_lock || 'normal'

  // Step 0: Parallel analysis - subject photo AND garment
  let photoConstraints = ''
  let garmentAnalysis: GarmentAnalysis | undefined
  
  const [photoAnalysisResult, garmentAnalysisResult] = await Promise.allSettled([
    analyzeSubjectPhoto(subjectImageBase64),
    analyzeGarment(clothingRefBase64),
  ])
  
  if (photoAnalysisResult.status === 'fulfilled') {
    const analysis = photoAnalysisResult.value
    photoConstraints = [
      analysis.camera_summary,
      analysis.lighting_summary,
    ].filter(Boolean).join(' | ')
  } else {
    photoConstraints = 'Match original lighting and camera angle.'
  }
  
  if (garmentAnalysisResult.status === 'fulfilled') {
    garmentAnalysis = garmentAnalysisResult.value
    console.log(`🎽 Garment analysis: ${garmentAnalysis.garment_type}, ${garmentAnalysis.sleeve_type}, ${garmentAnalysis.neckline}, ${garmentAnalysis.primary_color}`)
  }

  // Step 0.5: Select a realism recipe
  const { recipe: realismRecipe, selection: realismSelection } = await selectRealismRecipe({
    preset: preset ? { pose_name, lighting_name, background_name, style_pack: String(stylePack || ''), background_focus: String(backgroundFocus || '') } : undefined,
    photoConstraintsText: photoConstraints,
    userRequest,
  })

  // Step 1: Generate simple scene description
  const shootPlan = await generateShootPlanV3({
    pose_name,
    lighting_name,
    background_name,
    userRequest,
    photoConstraints,
    stylePack,
    backgroundFocus,
    realismRecipe,
    selectedRecipeWhy: realismSelection.why,
  })

  // Step 1.5: Garment extraction with intelligent prompting based on analysis
  let garmentOnly = clothingRefBase64
  let usedGarmentExtraction = false
  try {
    garmentOnly = await extractGarmentOnlyImage({
      clothingImageBase64: clothingRefBase64,
      model: quality.quality === 'high' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image',
    })
    usedGarmentExtraction = true
  } catch {
    garmentOnly = clothingRefBase64
  }

  // Step 2: First render attempt WITH garment analysis
  let output = await renderTryOnV3({
    subjectImageBase64,
    garmentImageBase64: garmentOnly,
    garmentBackupImageBase64: clothingRefBase64,
    identityImagesBase64,
    stylePack,
    backgroundFocus,
    shootPlan,
    opts: quality,
    extraStrict: identityLock === 'high',
    garmentAnalysis, // Pass analysis to renderer
  })

  // Step 3: Verify and retry if needed
  let retryCount = 0
  let retryReason = ''
  
  try {
    const verify = await verifyTryOnImage({
      outputImageBase64: output,
      subjectImageBase64,
      garmentRefBase64: clothingRefBase64,
    })

    // Check for face drift (critical issue)
    const faceDrifted = 
      verify.face_geometry_match === 'different' ||
      verify.face_geometry_match === 'close' ||
      !verify.identity_preserved ||
      verify.identity_fidelity !== 'high' ||
      verify.subject_color_preserved === false

    // Check for garment issues
    const garmentFailed = 
      !verify.garment_applied ||
      verify.original_outfit_still_present ||
      verify.garment_fidelity === 'low'

    // Check for pose changes
    const poseFailed = verify.pose_preserved === false

    // Check for AI look
    const looksAI = 
      verify.looks_ai_generated === true ||
      verify.background_has_grain === false

    // Determine if retry needed
    const needsRetry = !verify.ok || faceDrifted || garmentFailed || poseFailed || looksAI

    if (needsRetry) {
      retryCount = 1
      
      // Build retry reason for debugging
      const reasons: string[] = []
      if (faceDrifted) reasons.push('face_drift')
      if (garmentFailed) reasons.push('garment_failed')
      if (poseFailed) reasons.push('pose_changed')
      if (looksAI) reasons.push('ai_look')
      retryReason = reasons.join(', ')

      // If garment failed, re-extract with PRO model
      if (garmentFailed) {
        try {
          garmentOnly = await extractGarmentOnlyImage({
            clothingImageBase64: clothingRefBase64,
            model: 'gemini-3-pro-image-preview',
          })
          usedGarmentExtraction = true
        } catch {
          // keep previous
        }
      }

      // Create a simplified retry plan that prioritizes face preservation
      const retryShootPlan = faceDrifted
        ? {
            ...shootPlan,
            // If face drifted, keep original background to reduce editing scope
            scene_text: 'Keep the original background from the photo. Focus only on changing the clothing.',
          }
        : shootPlan

      // Retry with extraStrict mode and subject image as additional identity ref
      output = await renderTryOnV3({
        subjectImageBase64,
        garmentImageBase64: garmentOnly,
        garmentBackupImageBase64: clothingRefBase64,
        // Always include subject as identity anchor on retry
        identityImagesBase64: [subjectImageBase64, ...identityImagesBase64],
        stylePack,
        backgroundFocus,
        shootPlan: retryShootPlan,
        // Upgrade to high quality on retry if was fast
        opts: quality.quality === 'fast' ? { ...quality, quality: 'high' } : quality,
        extraStrict: true,
        garmentAnalysis,
      })

      // Verify retry result
      try {
        const verify2 = await verifyTryOnImage({
          outputImageBase64: output,
          subjectImageBase64,
          garmentRefBase64: clothingRefBase64,
        })

        // If still failing on garment, do a final "clothing only" attempt
        if (!verify2.garment_applied || verify2.original_outfit_still_present) {
          retryCount = 2
          retryReason += ', clothing_fallback'

          // Minimal edit - just change clothes, keep everything else
          const minimalPlan = {
            ...shootPlan,
            scene_text: 'Keep the exact same background and lighting from the original photo. Only change the clothing.',
          }

          output = await renderTryOnV3({
            subjectImageBase64,
            garmentImageBase64: garmentOnly,
            garmentBackupImageBase64: clothingRefBase64,
            identityImagesBase64: [subjectImageBase64, ...identityImagesBase64],
            stylePack,
            backgroundFocus,
            shootPlan: minimalPlan,
            opts: { ...quality, quality: 'high' },
            extraStrict: true,
            garmentAnalysis,
          })
        }
      } catch {
        // Ignore verify2 errors
      }

      return {
        image: output,
        debug: {
          shootPlanText: shootPlan.prompt_text,
          usedGarmentExtraction,
          verify,
          realismRecipeId: realismRecipe.id,
          realismWhy: realismSelection.why,
          retryCount,
          retryReason,
          garmentAnalysis,
        },
      }
    }

    // Success on first try
    return {
      image: output,
      debug: {
        shootPlanText: shootPlan.prompt_text,
        usedGarmentExtraction,
        verify,
        realismRecipeId: realismRecipe.id,
        realismWhy: realismSelection.why,
        retryCount: 0,
        garmentAnalysis,
      },
    }
  } catch {
    // Verifier failed, return the image anyway
    return {
      image: output,
      debug: {
        shootPlanText: shootPlan.prompt_text,
        usedGarmentExtraction,
        realismRecipeId: realismRecipe.id,
        realismWhy: realismSelection.why,
        garmentAnalysis,
      },
    }
  }
}
