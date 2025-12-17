import type { TryOnQualityOptions } from './types'
import { generateShootPlanV3 } from './director'
import { extractGarmentOnlyImage } from './garment-extractor'
import { renderTryOnV3 } from './renderer'
import { verifyTryOnImage } from './verifier'
import { analyzeSubjectPhoto } from './photo-analyzer'
import { selectRealismRecipe } from './realism-selector'

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
    initialQuality?: TryOnQualityOptions['quality']
    retryQuality?: TryOnQualityOptions['quality']
    usedQualityUpgrade?: boolean
    retryReason?: string
  }
}> {
  const { subjectImageBase64, clothingRefBase64, identityImagesBase64 = [], preset, userRequest, quality } = params

  const pose_name = preset?.pose_name || 'keep the subject pose unchanged'
  const lighting_name = preset?.lighting_name || 'match the original photo lighting'
  const background_name = preset?.background_name || 'keep the original background'
  const stylePack = preset?.style_pack
  const backgroundFocus = preset?.background_focus
  const identityLock = preset?.identity_lock || 'normal'

  // Step 0: Analyze the subject photo for camera/light cues
  let photoConstraints = ''
  let photoManifest: Record<string, unknown> | undefined
  try {
    const analysis = await analyzeSubjectPhoto(subjectImageBase64)
    photoConstraints = [
      analysis.pose_summary,
      analysis.camera_summary,
      analysis.lighting_summary,
      analysis.realism_constraints,
    ]
      .filter(Boolean)
      .join(' | ')
    photoManifest = analysis.camera_manifest as any
  } catch {
    photoConstraints =
      'Match original camera perspective and depth of field; add subtle sensor noise/film grain; avoid CGI-clean backgrounds; keep lighting direction and shadows consistent.'
  }

  // Step 0.5: Select a realism recipe
  const { recipe: realismRecipe, selection: realismSelection } = await selectRealismRecipe({
    preset: preset
      ? {
          pose_name,
          lighting_name,
          background_name,
          style_pack: String(stylePack || ''),
          background_focus: String(backgroundFocus || ''),
        }
      : undefined,
    photoConstraintsText: photoConstraints,
    photoManifest,
    userRequest,
  })

  // Step 1: Director (scene-only)
  const shootPlanRaw = await generateShootPlanV3({
    pose_name,
    lighting_name,
    background_name,
    userRequest,
    photoConstraints,
    photoManifest,
    stylePack,
    backgroundFocus,
    realismRecipe,
    selectedRecipeWhy: realismSelection.why,
  })

  // Inject photo constraints into the plan
  const shootPlan = {
    ...shootPlanRaw,
    prompt_text: `${shootPlanRaw.prompt_text}

═══════════════════════════════════════════════════════════════════
PHOTO CONSTRAINTS (ABSOLUTE - from original capture)
═══════════════════════════════════════════════════════════════════
${photoConstraints}

MANDATORY RULES:
- Keep time-of-day consistent with the subject photo
- Adapt background to match subject lighting (do NOT re-light the face)
- Add film grain / sensor noise matching the original capture
- Preserve all facial features exactly as in the original`,
  }

  // Step 1.5: Garment extraction
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

  // Step 2: Render try-on (attempt 1)
  const initialQuality: TryOnQualityOptions['quality'] = quality.quality
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
  })

  // Step 3: Verify and retry if needed
  try {
    const verify = await verifyTryOnImage({
      outputImageBase64: output,
      subjectImageBase64,
      garmentRefBase64: clothingRefBase64,
    })

    // ═══════════════════════════════════════════════════════════════════════════
    // STRICT RETRY CONDITIONS
    // ═══════════════════════════════════════════════════════════════════════════

    // FACE GEOMETRY CHECK (new - stricter than identity_fidelity alone)
    const needsRetryForFaceGeometry = 
      verify.face_geometry_match === 'different' ||
      (quality.quality === 'high' && verify.face_geometry_match === 'close') // High quality demands exact match

    // POSE CHECK (new)
    const needsRetryForPose = verify.pose_preserved === false

    // IDENTITY CHECK (existing but enhanced)
    const needsRetryForIdentity =
      !verify.identity_preserved ||
      verify.identity_fidelity === 'low' ||
      (identityLock === 'high' && verify.identity_fidelity === 'medium') ||
      (quality.quality === 'high' && verify.identity_fidelity === 'medium') ||
      needsRetryForFaceGeometry

    // GARMENT CHECK
    const needsRetryForNoTryOn = verify.output_is_unedited_copy || verify.original_outfit_still_present
    const needsRetryForGarmentQuality = verify.garment_applied && verify.garment_fidelity !== 'high'
    const needsRetryForGarment = !verify.garment_applied || needsRetryForGarmentQuality

    // REALISM CHECK (enhanced with grain check)
    const needsRetryForScene =
      verify.scene_plausible === false ||
      verify.lighting_realism === 'low' ||
      verify.lighting_consistent === false ||
      verify.subject_color_preserved === false ||
      verify.looks_ai_generated === true ||
      verify.background_detail_preserved === false ||
      verify.background_has_grain === false || // NEW: must have visible grain
      verify.dof_realistic === false

    // Determine retry reason for debugging
    const retryReasons: string[] = []
    if (needsRetryForFaceGeometry) retryReasons.push('face_geometry_drift')
    if (needsRetryForPose) retryReasons.push('pose_changed')
    if (needsRetryForIdentity) retryReasons.push('identity_drift')
    if (needsRetryForNoTryOn) retryReasons.push('garment_not_applied')
    if (needsRetryForGarment) retryReasons.push('garment_quality')
    if (needsRetryForScene) retryReasons.push('realism_issues')

    const needsRetry = !verify.ok || needsRetryForIdentity || needsRetryForPose || needsRetryForNoTryOn || needsRetryForScene || needsRetryForGarment

    if (needsRetry) {
      // Re-extract garment with PRO model if needed
      if (needsRetryForGarment || needsRetryForNoTryOn) {
        try {
          garmentOnly = await extractGarmentOnlyImage({
            clothingImageBase64: clothingRefBase64,
            model: 'gemini-3-pro-image-preview',
          })
          usedGarmentExtraction = true
        } catch {
          // keep previous garmentOnly
        }
      }

      // Build enhanced retry plan based on failure types
      let retryPlan = shootPlan
      
      if (needsRetryForFaceGeometry || needsRetryForPose || needsRetryForIdentity) {
        retryPlan = {
          ...retryPlan,
          prompt_text: `${retryPlan.prompt_text}

═══════════════════════════════════════════════════════════════════
FACE & POSE LOCK OVERRIDE (CRITICAL - previous attempt failed)
═══════════════════════════════════════════════════════════════════
THE FACE AND POSE MUST BE IDENTICAL TO THE ORIGINAL PHOTO.
Previous attempt had face/pose drift - this MUST be corrected.

FACE: Copy pixel-perfect from image 1:
- Exact eye shape, size, and spacing
- Exact nose bridge and nostril shape
- Exact lip shape and thickness
- Exact jawline and chin contour
- NO smoothing, NO beautification, NO changes

POSE: Copy exactly from image 1:
- Same head tilt and angle
- Same shoulder position
- Same arm placement
- Same body lean
- NO pose "improvements" or changes`,
        }
      }

      if (needsRetryForScene) {
        retryPlan = {
          ...retryPlan,
          prompt_text: `${retryPlan.prompt_text}

═══════════════════════════════════════════════════════════════════
REALISM OVERRIDE (CRITICAL - previous attempt looked fake)
═══════════════════════════════════════════════════════════════════
The output must look like a REAL PHOTOGRAPH, not AI generated.

REQUIRED IMPERFECTIONS:
- Visible film grain / sensor noise (ISO 400-800 equivalent)
- Slight lens vignette at corners
- Subtle chromatic aberration on contrast edges
- Natural bokeh (not perfect circles)
- Micro-texture preserved in background (no smeary blur)

FORBIDDEN:
- Plastic/waxy skin
- Perfect symmetry
- HDR glow or bloom
- Gaussian blur on background
- Over-clean/perfect surfaces`,
        }
      }

      // Upgrade to PRO model if fast quality failed
      const retryQuality: TryOnQualityOptions =
        quality.quality === 'fast' && (needsRetryForScene || needsRetryForGarment || needsRetryForIdentity)
          ? { ...quality, quality: 'high', resolution: quality.resolution || '2K' }
          : quality
      const usedQualityUpgrade = retryQuality.quality !== quality.quality

      output = await renderTryOnV3({
        subjectImageBase64,
        garmentImageBase64: garmentOnly,
        garmentBackupImageBase64: clothingRefBase64,
        // Always include original subject as identity anchor on retry
        identityImagesBase64: [subjectImageBase64, ...identityImagesBase64],
        stylePack,
        backgroundFocus,
        shootPlan: retryPlan,
        opts: retryQuality,
        extraStrict: true,
      })

      // Final fallback if garment still not applied
      try {
        const verify2 = await verifyTryOnImage({
          outputImageBase64: output,
          subjectImageBase64,
          garmentRefBase64: clothingRefBase64,
        })

        if (!verify2.garment_applied || verify2.original_outfit_still_present) {
          const clothingOnlyPlan = {
            ...shootPlan,
            prompt_text: `${shootPlan.prompt_text}

═══════════════════════════════════════════════════════════════════
CLOTHING-ONLY EMERGENCY FALLBACK
═══════════════════════════════════════════════════════════════════
CRITICAL: The garment MUST be applied. This is the highest priority.

INSTRUCTIONS:
1. KEEP the original background from image 1 (no scene change)
2. KEEP the exact pose from image 1
3. KEEP the exact face from image 1
4. ONLY change the clothing to match the garment reference
5. Apply realistic folds, draping, and shadows on the garment

If you cannot change the background AND apply the garment, PRIORITIZE THE GARMENT.`,
          }

          output = await renderTryOnV3({
            subjectImageBase64,
            garmentImageBase64: garmentOnly,
            garmentBackupImageBase64: clothingRefBase64,
            identityImagesBase64: [subjectImageBase64, ...identityImagesBase64],
            stylePack,
            backgroundFocus,
            shootPlan: clothingOnlyPlan,
            opts: retryQuality,
            extraStrict: true,
          })
        }
      } catch {
        // ignore verify2 failures
      }

      return {
        image: output,
        debug: {
          shootPlanText: shootPlan.prompt_text,
          usedGarmentExtraction,
          verify,
          realismRecipeId: realismRecipe.id,
          realismWhy: realismSelection.why,
          initialQuality,
          retryQuality: retryQuality.quality,
          usedQualityUpgrade,
          retryReason: retryReasons.join(', '),
        },
      }
    }

    // No retry needed - return successful result
    return {
      image: output,
      debug: {
        shootPlanText: shootPlan.prompt_text,
        usedGarmentExtraction,
        verify,
        realismRecipeId: realismRecipe.id,
        realismWhy: realismSelection.why,
        initialQuality,
        retryQuality: initialQuality,
        usedQualityUpgrade: false,
      },
    }
  } catch {
    // If verifier fails, still return the image
    return {
      image: output,
      debug: {
        shootPlanText: shootPlan.prompt_text,
        usedGarmentExtraction,
        realismRecipeId: realismRecipe.id,
        realismWhy: realismSelection.why,
        initialQuality,
      },
    }
  }
}
