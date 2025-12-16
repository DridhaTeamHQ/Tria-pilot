import type { TryOnQualityOptions } from './types'
import { generateShootPlanV3 } from './director'
import { extractGarmentOnlyImage } from './garment-extractor'
import { renderTryOnV3 } from './renderer'
import { verifyTryOnImage } from './verifier'
import { analyzeSubjectPhoto } from './photo-analyzer'

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
  }
}> {
  const { subjectImageBase64, clothingRefBase64, identityImagesBase64 = [], preset, userRequest, quality } = params

  const pose_name = preset?.pose_name || 'keep the subject pose unchanged'
  const lighting_name = preset?.lighting_name || 'match the original photo lighting'
  const background_name = preset?.background_name || 'keep the original background'
  const stylePack = preset?.style_pack
  const backgroundFocus = preset?.background_focus
  const identityLock = preset?.identity_lock || 'normal'

  // Step 0: Analyze the subject photo for camera/light cues (prevents "AI perfect" backgrounds)
  let photoConstraints = ''
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
  } catch {
    photoConstraints =
      'Match original camera perspective and depth of field; add subtle sensor noise/film grain; avoid CGI-clean backgrounds; keep lighting direction and shadows consistent.'
  }

  // Step 1: Director (scene-only)
  const shootPlanRaw = await generateShootPlanV3({
    pose_name,
    lighting_name,
    background_name,
    userRequest,
    photoConstraints,
    stylePack,
    backgroundFocus,
  })

  // Inject photo constraints into the plan so the renderer always anchors to the real capture
  // (prevents day-subject + night-background mismatches, and keeps realism consistent).
  const shootPlan = {
    ...shootPlanRaw,
    prompt_text: `${shootPlanRaw.prompt_text}
PHOTO CONSTRAINTS (must match the original subject photo):
- ${photoConstraints}
- Keep time-of-day consistent with the subject photo unless the user explicitly requested otherwise.
- Prefer adapting the background/grade to match the subject lighting rather than re-lighting/rebuilding the face.`,
  }

  // Step 1.5: Garment extraction (critical to prevent pasted reference-person)
  let garmentOnly = clothingRefBase64
  let usedGarmentExtraction = false
  try {
    garmentOnly = await extractGarmentOnlyImage({
      clothingImageBase64: clothingRefBase64,
      model: quality.quality === 'high' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image',
    })
    usedGarmentExtraction = true
  } catch {
    // If extraction fails, proceed with original reference but rely on stricter prompt + verifier.
    garmentOnly = clothingRefBase64
  }

  // Step 2: Render try-on (attempt 1)
  let output = await renderTryOnV3({
    subjectImageBase64,
    garmentImageBase64: garmentOnly,
    garmentBackupImageBase64: clothingRefBase64,
    identityImagesBase64,
    stylePack,
    backgroundFocus,
    shootPlan,
    opts: quality,
    // For high-risk lighting presets (flash/neon/hard light), start stricter on attempt 1 to prevent face drift.
    extraStrict: identityLock === 'high',
  })

  // Step 3: Verify and retry once if we see the "cutout person / collage" failure
  try {
    const verify = await verifyTryOnImage({
      outputImageBase64: output,
      subjectImageBase64,
      garmentRefBase64: clothingRefBase64,
    })

    const needsRetryForIdentity =
      !verify.identity_preserved ||
      verify.identity_fidelity === 'low' ||
      (identityLock === 'high' && verify.identity_fidelity === 'medium') ||
      // Face consistency: on high-quality runs, treat medium drift as retry-worthy (one retry max).
      (quality.quality === 'high' && verify.identity_fidelity === 'medium')
    const needsRetryForNoTryOn = verify.output_is_unedited_copy || verify.original_outfit_still_present
    const needsRetryForScene =
      verify.scene_plausible === false ||
      verify.lighting_realism === 'low' ||
      verify.lighting_consistent === false ||
      verify.subject_color_preserved === false

    // If clothing is applied but fidelity is only medium, retry once (helps small failures).
    const needsRetryForGarmentQuality = verify.garment_applied && verify.garment_fidelity === 'medium'
    if (!verify.ok || needsRetryForIdentity || needsRetryForNoTryOn || needsRetryForScene || needsRetryForGarmentQuality) {
      // If garment wasn't applied OR fidelity is low, try a stronger path:
      // 1) re-extract garment using PRO image model (more reliable), then re-render extraStrict
      if (!verify.garment_applied || verify.garment_fidelity === 'low' || needsRetryForGarmentQuality) {
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

      // Retry with extraStrict prompt and downplayed scene changes (prevents collage + boosts clothing replace)
      output = await renderTryOnV3({
        subjectImageBase64,
        garmentImageBase64: garmentOnly,
        garmentBackupImageBase64: clothingRefBase64,
        // For identity drift: strengthen anchors by re-including the original subject as an extra identity ref.
        identityImagesBase64:
          needsRetryForIdentity || needsRetryForNoTryOn
            ? [subjectImageBase64, ...identityImagesBase64]
            : identityImagesBase64,
        stylePack,
        backgroundFocus,
        shootPlan,
        opts: quality,
        extraStrict: true,
      })

      // If the retry still fails to apply the garment, do one final fallback render that prioritizes clothing only.
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
CLOTHING-ONLY FALLBACK (highest priority):
- If background change conflicts with clothing replacement, KEEP the original background from image 1.
- Replace the outfit EXACTLY with the garment reference. Do not skip clothing replacement.`,
          }

          output = await renderTryOnV3({
            subjectImageBase64,
            garmentImageBase64: garmentOnly,
            garmentBackupImageBase64: clothingRefBase64,
            identityImagesBase64: [subjectImageBase64, ...identityImagesBase64],
            stylePack,
            backgroundFocus,
            shootPlan: clothingOnlyPlan,
            opts: quality,
            extraStrict: true,
          })
        }
      } catch {
        // ignore verify2 failures
      }

      return {
        image: output,
        debug: { shootPlanText: shootPlan.prompt_text, usedGarmentExtraction, verify },
      }
    }

    return {
      image: output,
      debug: { shootPlanText: shootPlan.prompt_text, usedGarmentExtraction, verify },
    }
  } catch {
    // If verifier fails, still return the image.
    return {
      image: output,
      debug: { shootPlanText: shootPlan.prompt_text, usedGarmentExtraction },
    }
  }
}


