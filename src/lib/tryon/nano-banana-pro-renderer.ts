/**
 * NANO BANANA PRO RENDERER (Simplified Pipeline)
 *
 * This is the ONLY renderer in the production pipeline.
 * It orchestrates a minimal 3-stage flow:
 *
 *  STAGE 1 — Scene Intelligence
 *  STAGE 2 — Compact Prompt Builder
 *  STAGE 3 — Nano Banana Pro Rendering (Gemini 3 Pro Image)
 *
 * Intentionally avoids heavy post-processing guardrails.
 */

import 'server-only'
import { generateTryOnDirect } from '@/lib/nanobanana'
import { buildForensicPrompt } from './forensic-prompt'
import { detectFaceCoordinates, type FaceCoordinates } from './face-coordinates'
import { buildForensicFaceAnchor } from './face-forensics'
import { getStrictSceneConfig } from './scene-intel-adapter'
import { assessSceneRealism, type SceneQualityAssessment } from './scene-quality-check'
import { assessIdentityAndComposition, type IdentityCompositionAssessment } from './identity-composition-check'
import { getAllPresetIds, getPresetById } from './presets/index'
import { extractFaceCrop } from './face-crop'
import { computeMicroFaceDrift, getDriftRetryParams } from './micro-face-drift'
import { getPresetExampleGuidance, getRequestExampleGuidance } from './presets/example-prompts-reference'
import { getPresetStrengthProfile } from './preset-strength-profile'

const MAIN_RENDER_MODEL = 'gemini-3-pro-image-preview' as const
const ENABLE_QUALITY_RETRY = process.env.TRYON_ENABLE_QUALITY_RETRY !== 'false'
const GLOBAL_FACE_IDENTITY_MIN = 90
const GLOBAL_BODY_CONSISTENCY_MIN = 86
const GLOBAL_COMPOSITION_MIN = 74
const GLOBAL_BACKGROUND_MIN = 74
const MICRO_DRIFT_RETRY_THRESHOLD = 14
const FINAL_MICRO_DRIFT_MAX_DEFAULT = 18
const FINAL_MICRO_DRIFT_MAX_COMPLEX = 15
const FINAL_MICRO_DRIFT_MAX_ULTRA = 10
const ULTRA_FACE_LOCK_IOU_MIN = 0.68
const ULTRA_FACE_LOCK_CENTER_MAX = 55
const ULTRA_FACE_LOCK_SIZE_DELTA_MAX = 0.14
const ULTRA_FACE_LOCK_PRESETS = new Set([
  'urban_gas_station_night',
  'street_mcdonalds_bmw_night',
  'street_porsche_panamera_residential',
  'street_ramen_booth_snapshot',
  'night_beach_streetwear',
  'garden_oak_bench_golden_hour',
  'paris_eiffel_flash_night',
  'indian_influencer_daylight_fullbody',
  'studio_white_wall_saree_shadow',
  'studio_industrial_window_chair',
  'studio_crimson_noir',
  'golden_hour_bedroom',
])
const COMPLEX_BACKGROUND_PRESETS = new Set([
  'urban_gas_station_night',
  'street_mcdonalds_bmw_night',
  'paris_eiffel_flash_night',
  'studio_crimson_noir',
  'golden_hour_bedroom',
  'outdoor_kerala_theyyam_gtr',
  'editorial_night_garden_flash',
  'editorial_newspaper_set',
  'editorial_court_geometric_sun',
  'editorial_dark_study_set',
  'studio_green_red_gel_editorial',
  'studio_red_seamless_profile',
])
const NO_SYNTHETIC_BLUR_PRESETS = new Set([
  'urban_gas_station_night',
  'street_mcdonalds_bmw_night',
  'street_porsche_panamera_residential',
  'night_beach_streetwear',
  'garden_oak_bench_golden_hour',
  'street_ramen_booth_snapshot',
  'paris_eiffel_flash_night',
  'studio_crimson_noir',
  'golden_hour_bedroom',
  'outdoor_kerala_theyyam_gtr',
  'studio_bw_minimalist_portrait',
  'home_cozy_teddy_selfie',
  'travel_scene_lock_realism',
  'street_elevator_mirror_chic',
  'indian_influencer_daylight_fullbody',
  'editorial_sky_negative_space',
  'editorial_night_garden_flash',
  'studio_white_wall_saree_shadow',
  'studio_white_brick_bench',
  'editorial_newspaper_set',
  'editorial_court_geometric_sun',
  'studio_window_blind_portrait',
  'editorial_dark_study_set',
  'studio_industrial_window_chair',
  'studio_orange_director_chair',
  'studio_green_red_gel_editorial',
  'studio_red_seamless_profile',
])
const GLOBAL_OPTICAL_AVOID_TERMS = [
  'gaussian background blur',
  'fake bokeh circles',
  'portrait mode cutout blur',
  'blur wall background',
  'depth blur artifacts',
  'smudged background textures',
  'mushy background',
  'background haze behind subject',
  'generative depth fog',
  'lens blur smear',
  'halo around subject edges',
  'edge matte halo',
  'mismatched perspective',
  'disconnected foreground',
  'fake reflective surfaces',
  'warped vehicle reflections',
]

const REFLECTIVE_SURFACE_PRESETS = new Set([
  'urban_gas_station_night',
  'street_mcdonalds_bmw_night',
  'street_porsche_panamera_residential',
  'outdoor_kerala_theyyam_gtr',
])

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface NanoBananaProInput {
  personImageBase64: string
  garmentImageBase64: string
  aspectRatio?: '1:1' | '4:5' | '3:4' | '9:16'
  garmentDescription?: string
  userRequest?: string
  presetId?: string
  presetDescription?: string
  lightingDescription?: string
  researchContext?: string
  webResearchContext?: string
}

export interface NanoBananaProResult {
  success: boolean
  image: string
  generationTimeMs: number
  promptUsed: string
  debug: any
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateWithNanoBananaPro(
  input: NanoBananaProInput
): Promise<NanoBananaProResult> {
  const startTime = Date.now()
  const isDev = process.env.NODE_ENV !== 'production'

  try {
    // ═════════════════════════════════════════════════════════════════════════
    // STAGE 1: Scene Intelligence
    // ═════════════════════════════════════════════════════════════════════════
    if (isDev) console.log('\n━━━ STAGE 1: Scene Intelligence ━━━')

    const presetNames = getAllPresetIds()

    const [sceneConfig, personFace, forensicAnchor] = await Promise.all([
      withTimeout(
        getStrictSceneConfig({
          userRequest: input.userRequest,
          presetId: input.presetId,
          presetDescription: input.presetDescription,
          personImageBase64: input.personImageBase64,
          availablePresets: presetNames,
        }),
        7000,
        buildSceneFallback(input)
      ),
      detectFaceCoordinates(input.personImageBase64, { allowHeuristicFallback: true }),
      withTimeout(
        buildForensicFaceAnchor({
          personImageBase64: input.personImageBase64,
          garmentDescription: input.garmentDescription,
        }),
        10000,
        {
          faceAnchor:
            'preserve exact face shape width and fullness, eye geometry, nose bridge and tip, lip contour, jawline, skin texture with visible pores, facial hair density and pattern, and eyewear geometry',
          eyesAnchor:
            'almond eye shape, medium inter-eye spacing, dark brown iris color, forward gaze direction, stable eyelid crease and brow geometry',
          characterSummary: 'single subject from Image 1',
          poseSummary: 'inherit pose and head angle from Image 1',
          appearanceSummary: 'preserve stable hairstyle and accessories from Image 1',
          bodyAnchor:
            'preserve original body build, weight, shoulder width, torso mass, and limb proportions exactly as visible in Image 1',
          garmentOnPersonGuidance:
            'garment follows original shoulder slope and torso drape from Image 1 — do not slim or reshape body. Do NOT slim or narrow the face. Do NOT thin the beard.',
        }
      ),
    ])

    // Extract face crop AFTER detection so we can use the detected face box for a tight crop.
    // This adds ~50-100ms (sharp only) but produces a much better identity signal.
    const faceCropResult = await withTimeout(
      extractFaceCrop(input.personImageBase64, personFace),
      3000,
      { success: false, faceCropBase64: '' }
    )

    if (isDev) {
      console.log(`   preset=${sceneConfig.preset}`)
      console.log(`   anchorZone="${sceneConfig.anchorZone.substring(0, 80)}"`)
      if (sceneConfig.lightingBlueprint) console.log(`   lightingBlueprint="${sceneConfig.lightingBlueprint.substring(0, 90)}"`)
      if (sceneConfig.presetAvoid) console.log(`   presetAvoid="${sceneConfig.presetAvoid.substring(0, 90)}"`)
      console.log(`   facePolicy=${sceneConfig.facePolicy}`)
    }

    // ═════════════════════════════════════════════════════════════════════════
    // STAGE 2: Compact Prompt
    // ═════════════════════════════════════════════════════════════════════════
    if (isDev) console.log('\n━━━ STAGE 2: Compact Prompt ━━━')

    const presetGuidance = getPresetExampleGuidance(sceneConfig.preset || input.presetId)
    const requestGuidance = getRequestExampleGuidance(input.userRequest)
    const exampleGuidance = presetGuidance || requestGuidance
    const resolvedPresetId = sceneConfig.preset || input.presetId
    const isUltraFaceLockPreset = ULTRA_FACE_LOCK_PRESETS.has((resolvedPresetId || '').toLowerCase())
    const isComplexBackgroundPreset = COMPLEX_BACKGROUND_PRESETS.has((resolvedPresetId || '').toLowerCase())
    const resolvedPreset = getPresetById(resolvedPresetId || '')
    const presetFaceGuard = getPresetFaceGuard(resolvedPresetId)
    const presetOpticalGuard = getPresetOpticalGuard(resolvedPresetId)
    const strengthProfile = getPresetStrengthProfile({
      presetId: resolvedPresetId,
      category: resolvedPreset?.category,
    })
    const faceSpatialLock = getFaceSpatialLock(personFace)
    const presetLightingGuidance = buildPresetLightingGuidance(
      input.lightingDescription,
      resolvedPreset?.lighting
    )
    const presetColorGuidance = buildPresetColorGuidance(
      exampleGuidance?.colorGrading,
      input.lightingDescription,
      resolvedPreset?.scene
    )
    const presetSurfaceGuidance = buildPresetSurfaceGuidance(
      resolvedPresetId,
      resolvedPreset?.scene
    )
    const identityCorrectionGuidance = [
      presetFaceGuard.identityCorrectionGuidance,
      !faceSpatialLock
        ? 'Face detection confidence is limited in this run. Prioritize exact source identity signals (eyes, nose-lip relation, jawline, beard/skin texture) and avoid any beautification or age/complexion shift.'
        : undefined,
    ]
      .filter(Boolean)
      .join(' ')

    const promptInput = {
      garmentDescription: input.garmentDescription,
      preset: sceneConfig.anchorZone,
      lighting: sceneConfig.lightingMode,
      realismGuidance: [
        sceneConfig.realismGuidance,
        sceneConfig.sceneGuidance,
        'The face must share the same scene lighting, shadow falloff, color temperature, and lens response as the body and background so there is no sticker or cut-out effect.',
        'Foreground, subject, and background must read as one coherent photograph with stable perspective, believable depth layering, and no generic Gemini blur haze.',
        presetSurfaceGuidance,
      ].join(' '),
      lightingBlueprint: [sceneConfig.lightingBlueprint, presetLightingGuidance].filter(Boolean).join(' '),
      presetAvoid: sceneConfig.presetAvoid,
      garmentOnPersonGuidance: forensicAnchor.garmentOnPersonGuidance,
      faceForensicAnchor: forensicAnchor.faceAnchor,
      eyesAnchor: forensicAnchor.eyesAnchor,
      characterSummary: forensicAnchor.characterSummary,
      poseSummary: forensicAnchor.poseSummary,
      appearanceSummary: forensicAnchor.appearanceSummary,
      bodyAnchor: forensicAnchor.bodyAnchor,
      styleGuidance: sanitizeEnvironmentGuidance(
        exampleGuidance
          ? `${exampleGuidance.vibe} ${exampleGuidance.scene} Lighting intent: ${exampleGuidance.lighting}.`
          : presetLightingGuidance
      ),
      colorGradingGuidance: presetColorGuidance,
      cameraGuidance: [
        sanitizeEnvironmentGuidance(sceneConfig.cameraGuidance),
        sanitizeEnvironmentGuidance(exampleGuidance?.camera),
        presetOpticalGuard.cameraGuidance,
      ].filter(Boolean).join(' '),
      poseInferenceGuidance: [
        sanitizeEnvironmentGuidance(sceneConfig.poseGuidance),
        sanitizeEnvironmentGuidance(exampleGuidance?.poseInference),
      ].filter(Boolean).join(' '),
      researchContext: input.researchContext,
      webResearchContext: input.webResearchContext,
      additionalAvoidTerms: Array.from(
        new Set([
          ...(presetGuidance?.avoidTerms || []),
          ...(requestGuidance?.avoidTerms || []),
          ...GLOBAL_OPTICAL_AVOID_TERMS,
          ...presetFaceGuard.additionalAvoidTerms,
          ...presetOpticalGuard.additionalAvoidTerms,
        ])
      ),
      identityPriorityRules: Array.from(
        new Set([
          ...sanitizeIdentityRules([...(presetGuidance?.identityRules || []), ...(requestGuidance?.identityRules || [])]),
          'Preset style, grading, and mood controls apply to scene and garment only, never to facial geometry or face skin texture.',
          'Night or moody rendering must not reshape jaw, cheeks, eyes, or brows, and must not beautify or airbrush the face.',
          'If scene detail conflicts with identity preservation, simplify scene detail before altering any face geometry or face texture.',
          'Preserve perceived age from the source face exactly; no de-aging, youthification, or wrinkle cleanup.',
          'Preserve source skin luminance and undertone on the face; no whitening, brightening, fairness shift, or complexion rewrite.',
          ...presetFaceGuard.identityPriorityRules,
        ])
      ),
      identityCorrectionGuidance: identityCorrectionGuidance || undefined,
      strengthProfile,
      hasFaceReference: Boolean(faceCropResult.success && faceCropResult.faceCropBase64),
      faceBox: faceSpatialLock
        ? {
            ymin: faceSpatialLock.box.ymin,
            xmin: faceSpatialLock.box.xmin,
            ymax: faceSpatialLock.box.ymax,
            xmax: faceSpatialLock.box.xmax,
          }
        : undefined,
      faceSpatialLockQuality: faceSpatialLock?.quality,
      aspectRatio: input.aspectRatio || '1:1',
      retryMode: true,
      sceneCorrectionGuidance: undefined as string | undefined,
    }
    const prompt = buildForensicPrompt(promptInput)

    if (isDev) {
      console.log(`   prompt (${prompt.length} chars):`)
      console.log(`   "${prompt}"`)
    }

    // ═════════════════════════════════════════════════════════════════════════
    // STAGE 3: Nano Banana Pro Rendering
    // ═════════════════════════════════════════════════════════════════════════
    if (isDev) console.log('\n━━━ STAGE 3: Nano Banana Pro ━━━')
    const aspectRatio = input.aspectRatio || '1:1'
    if (isDev) console.log(`   aspectRatio=${aspectRatio}`)

    let generatedImage = await generateTryOnDirect({
      personImageBase64: input.personImageBase64,
      garmentImageBase64: input.garmentImageBase64,
      // Secondary identity reference improves eye geometry and face fidelity without post-processing.
      faceCropBase64: faceCropResult.success ? faceCropResult.faceCropBase64 : undefined,
      prompt,
      aspectRatio,
      resolution: '2K',
    })

    // One-shot retry strategy for face drift: keep base pipeline simple,
    // only escalate when geometry drift is likely.
    let retried = false
    let driftAssessment: ReturnType<typeof assessFaceDrift> = {
      shouldRetry: false,
      reason: 'not_checked',
    }
    let microDrift: Awaited<ReturnType<typeof computeMicroFaceDrift>> | null = null
    let driftRetryParams = { temperatureAdjust: 0, realismBias: 0, emphasis: '' }
    let sceneAssessment: SceneQualityAssessment = buildSceneAssessmentFallback()
    let identityCompositionAssessment: IdentityCompositionAssessment = buildIdentityCompositionFallback()

    const [generatedFace, generatedSceneAssessment, generatedIdentityCompositionAssessment] = await Promise.all([
      detectFaceCoordinates(generatedImage),
      withTimeout(
        assessSceneRealism({
          generatedImageBase64: generatedImage,
          anchorZone: sceneConfig.anchorZone,
          realismGuidance: sceneConfig.realismGuidance,
          expectedLightingBlueprint: sceneConfig.lightingBlueprint,
          expectedPresetAvoid: sceneConfig.presetAvoid,
        }),
        5000,
        buildSceneAssessmentFallback()
      ),
      withTimeout(
        assessIdentityAndComposition({
          sourceImageBase64: input.personImageBase64,
          generatedImageBase64: generatedImage,
          faceCropBase64: faceCropResult.success ? faceCropResult.faceCropBase64 : undefined,
          presetId: resolvedPresetId,
          anchorZone: sceneConfig.anchorZone,
        }),
        6000,
        buildIdentityCompositionFallback()
      ),
    ])
    driftAssessment = assessFaceDrift(personFace, generatedFace)
    driftAssessment = tightenDriftAssessmentForUltraFaceLock(
      driftAssessment,
      isUltraFaceLockPreset
    )
    sceneAssessment = generatedSceneAssessment
    identityCompositionAssessment = generatedIdentityCompositionAssessment
    const firstPassImage = generatedImage
    const firstPassFace = generatedFace
    let finalDetectedFace: FaceCoordinates | null = generatedFace
    const firstPassDriftAssessment = driftAssessment
    const firstPassSceneAssessment = sceneAssessment
    // If a face was detected at all, we should still allow retry logic.
    // Spatial lock quality only controls bbox lock strictness, not whether we retry.
    const hasTrustedSourceFace = Boolean(personFace)
    const microDriftRetryThreshold = isUltraFaceLockPreset
      ? 8
      : isComplexBackgroundPreset
        ? 14
        : MICRO_DRIFT_RETRY_THRESHOLD
    try {
      const refBuffer = base64ToBuffer(input.personImageBase64)
      const genBuffer = base64ToBuffer(generatedImage)
      microDrift = await computeMicroFaceDrift(refBuffer, genBuffer)
      if (
        hasTrustedSourceFace &&
        generatedFace &&
        microDrift.success &&
        microDrift.driftPercent >= microDriftRetryThreshold
      ) {
        driftRetryParams = getDriftRetryParams(microDrift)
      }
    } catch (microErr) {
      console.warn('⚠️ Micro face drift check failed:', microErr)
      microDrift = null
      driftRetryParams = { temperatureAdjust: 0, realismBias: 0, emphasis: '' }
    }
    const firstPassMicroDrift = microDrift

    const firstPassMicroDriftSevere = Boolean(
      firstPassMicroDrift?.success &&
      firstPassMicroDrift.driftPercent >= microDriftRetryThreshold
    )
    const hardFaceFailure = hasTrustedSourceFace && firstPassDriftAssessment.reason === 'generated_face_unknown'
    const geometryRetrySignal = Boolean(
      hasTrustedSourceFace &&
      firstPassFace &&
      firstPassDriftAssessment.shouldRetry &&
      firstPassMicroDriftSevere
    )
    const microOnlyRetrySignal = Boolean(
      hasTrustedSourceFace &&
      firstPassMicroDrift?.success &&
      firstPassMicroDrift.driftPercent >= microDriftRetryThreshold
    )
    const hasRetrySignal = hardFaceFailure || geometryRetrySignal || microOnlyRetrySignal
      || identityCompositionAssessment.shouldRetry
    const elapsedBeforeRetryMs = Date.now() - startTime
    // Keep production reliable: avoid second full model pass when we're already near timeout.
    const retryBudgetMs = process.env.NODE_ENV === 'production' ? 45_000 : 120_000
    const canRetryInTime = elapsedBeforeRetryMs < retryBudgetMs

    if (!hasTrustedSourceFace && isDev) {
      console.warn('   ⚠️ Skipping retry: source face detection is not trustworthy in this run.')
    }

    if (ENABLE_QUALITY_RETRY && hasRetrySignal && canRetryInTime) {
      retried = true
      const retryReasons = [
        driftAssessment.shouldRetry ? `face:${driftAssessment.reason}` : null,
        sceneAssessment.shouldRetry ? `scene:${sceneAssessment.reason}` : null,
        identityCompositionAssessment.shouldRetry ? `identity:${identityCompositionAssessment.reason}` : null,
        driftRetryParams.emphasis ? `micro-face:${driftRetryParams.emphasis}` : null,
      ]
        .filter(Boolean)
        .join(', ')
      console.warn(`   ⚠️ Quality retry triggered (${retryReasons}), retrying once with stricter controls`)
      const retryIdentityCorrectionGuidance = buildRetryIdentityCorrectionGuidance({
        baseIdentityCorrectionGuidance: promptInput.identityCorrectionGuidance,
        microDriftEmphasis: driftRetryParams.emphasis,
        hasHardFaceFailure: hardFaceFailure,
        isComplexBackgroundPreset,
        identityCompositionGuidance: identityCompositionAssessment.identityCorrectionGuidance,
      })
      const retrySceneCorrectionGuidance = [
        sceneAssessment.correctionGuidance,
        identityCompositionAssessment.compositionCorrectionGuidance,
        isComplexBackgroundPreset
          ? 'When scene complexity conflicts with identity, simplify distant background detail and preserve legible real textures instead of adding stylized blur or glow.'
          : undefined,
      ]
        .filter(Boolean)
        .join(' ')
        .trim()
      const retryPrompt = buildForensicPrompt({
        ...promptInput,
        retryMode: true,
        sceneCorrectionGuidance: retrySceneCorrectionGuidance || undefined,
        identityCorrectionGuidance: retryIdentityCorrectionGuidance || undefined,
      })

      generatedImage = await generateTryOnDirect({
        personImageBase64: input.personImageBase64,
        garmentImageBase64: input.garmentImageBase64,
        faceCropBase64: faceCropResult.success ? faceCropResult.faceCropBase64 : undefined,
        prompt: retryPrompt,
        aspectRatio,
        resolution: '2K',
      })

      const [retryFace, retrySceneAssessment, retryIdentityCompositionAssessment] = await Promise.all([
        detectFaceCoordinates(generatedImage),
        withTimeout(
          assessSceneRealism({
            generatedImageBase64: generatedImage,
            anchorZone: sceneConfig.anchorZone,
            realismGuidance: sceneConfig.realismGuidance,
            expectedLightingBlueprint: sceneConfig.lightingBlueprint,
            expectedPresetAvoid: sceneConfig.presetAvoid,
          }),
          5000,
          buildSceneAssessmentFallback()
        ),
        withTimeout(
          assessIdentityAndComposition({
            sourceImageBase64: input.personImageBase64,
            generatedImageBase64: generatedImage,
            faceCropBase64: faceCropResult.success ? faceCropResult.faceCropBase64 : undefined,
            presetId: resolvedPresetId,
            anchorZone: sceneConfig.anchorZone,
          }),
          6000,
          buildIdentityCompositionFallback()
        ),
      ])
      driftAssessment = assessFaceDrift(personFace, retryFace)
      driftAssessment = tightenDriftAssessmentForUltraFaceLock(
        driftAssessment,
        isUltraFaceLockPreset
      )
      sceneAssessment = retrySceneAssessment
      identityCompositionAssessment = retryIdentityCompositionAssessment
      let retryMicroDrift: Awaited<ReturnType<typeof computeMicroFaceDrift>> | null = null
      try {
        const refBuffer = base64ToBuffer(input.personImageBase64)
        const retryBuffer = base64ToBuffer(generatedImage)
        retryMicroDrift = await computeMicroFaceDrift(refBuffer, retryBuffer)
      } catch (microErr) {
        console.warn('⚠️ Micro face drift re-check failed:', microErr)
        retryMicroDrift = null
      }
      const useRetry = shouldUseRetryCandidate({
        firstFace: firstPassFace,
        firstDriftAssessment: firstPassDriftAssessment,
        firstMicroDrift: firstPassMicroDrift,
        firstSceneAssessment: firstPassSceneAssessment,
        firstIdentityCompositionAssessment: generatedIdentityCompositionAssessment,
        retryFace,
        retryDriftAssessment: driftAssessment,
        retryMicroDrift,
        retrySceneAssessment: sceneAssessment,
        retryIdentityCompositionAssessment,
      })

      if (!useRetry) {
        generatedImage = firstPassImage
        driftAssessment = firstPassDriftAssessment
        sceneAssessment = firstPassSceneAssessment
        identityCompositionAssessment = generatedIdentityCompositionAssessment
        microDrift = firstPassMicroDrift
        finalDetectedFace = firstPassFace
        console.warn('   ↩️ Keeping first pass output (retry did not improve identity).')
      } else {
        microDrift = retryMicroDrift
        finalDetectedFace = retryFace
      }
    } else if (ENABLE_QUALITY_RETRY && hasRetrySignal && !canRetryInTime) {
      console.warn(
        `   ⚠️ Skipping retry to avoid timeout (elapsed=${elapsedBeforeRetryMs}ms, budget=${retryBudgetMs}ms)`
      )
    }

    const genTime = Date.now() - startTime
    const finalMicroDrift = microDrift?.success ? microDrift.driftPercent : null
    const finalDriftMax = isUltraFaceLockPreset
      ? FINAL_MICRO_DRIFT_MAX_ULTRA
      : isComplexBackgroundPreset
        ? FINAL_MICRO_DRIFT_MAX_COMPLEX
        : FINAL_MICRO_DRIFT_MAX_DEFAULT
    const finalFaceFailure = Boolean(
      hasTrustedSourceFace &&
      (
        driftAssessment.reason === 'generated_face_unknown' ||
        driftAssessment.shouldRetry ||
        (typeof finalMicroDrift === 'number' && finalMicroDrift >= finalDriftMax)
      )
    )
    const identityCompositionGateFailed =
      identityCompositionAssessment.scores.faceIdentity < GLOBAL_FACE_IDENTITY_MIN ||
      identityCompositionAssessment.scores.bodyConsistency < GLOBAL_BODY_CONSISTENCY_MIN ||
      identityCompositionAssessment.scores.compositionQuality < GLOBAL_COMPOSITION_MIN ||
      identityCompositionAssessment.scores.backgroundIntegrity < GLOBAL_BACKGROUND_MIN
    const faceConsistencyGate = finalFaceFailure
      ? {
          failed: true,
          reason: driftAssessment.reason || 'unknown',
          microDriftPercent: finalMicroDrift,
          threshold: finalDriftMax,
        }
      : {
          failed: false,
          reason: 'passed',
          microDriftPercent: finalMicroDrift,
          threshold: finalDriftMax,
        }

    const globalIdentityGate = {
      failed: identityCompositionGateFailed,
      thresholds: {
        faceIdentity: GLOBAL_FACE_IDENTITY_MIN,
        bodyConsistency: GLOBAL_BODY_CONSISTENCY_MIN,
        compositionQuality: GLOBAL_COMPOSITION_MIN,
        backgroundIntegrity: GLOBAL_BACKGROUND_MIN,
      },
      scores: identityCompositionAssessment.scores,
      reason: identityCompositionGateFailed ? 'identity_composition_below_global_floor' : 'passed',
    }

    if (finalFaceFailure || identityCompositionGateFailed) {
      return {
        success: false,
        image: generatedImage,
        generationTimeMs: Date.now() - startTime,
        promptUsed: prompt,
        debug: {
          model: MAIN_RENDER_MODEL,
          sceneConfig,
          exampleGuidance,
          strengthProfile,
          presetGuidance,
          requestGuidance,
          forensicAnchor,
          personFace,
          finalDetectedFace,
          retried,
          driftAssessment,
          microDrift,
          driftRetryParams,
          sceneAssessment,
          identityCompositionAssessment,
          faceConsistencyGate,
          globalIdentityGate,
          failureReason: 'identity_preservation_gate_failed',
          recoverable: true,
          faceCropUsed: Boolean(faceCropResult.success && faceCropResult.faceCropBase64),
        },
      }
    }

    if (isDev) {
      console.log(`   Generated in ${(genTime / 1000).toFixed(1)}s`)
      console.log('\n━━━ PIPELINE COMPLETE ━━━')
      console.log(`   Total: ${((Date.now() - startTime) / 1000).toFixed(1)}s`)
    }

    return {
      success: true,
      image: generatedImage,
      generationTimeMs: Date.now() - startTime,
      promptUsed: prompt,
      debug: {
        model: MAIN_RENDER_MODEL,
        sceneConfig,
        exampleGuidance,
        strengthProfile,
        presetGuidance,
        requestGuidance,
        forensicAnchor,
        personFace,
        finalDetectedFace,
        retried,
        driftAssessment,
        microDrift,
        driftRetryParams,
        sceneAssessment,
        identityCompositionAssessment,
        faceConsistencyGate,
        globalIdentityGate,
        researchContextChars: input.researchContext?.length || 0,
        webResearchContextChars: input.webResearchContext?.length || 0,
        faceCropUsed: Boolean(faceCropResult.success && faceCropResult.faceCropBase64),
        faceFreezeStatus: 'disabled',
        eyeCompositeStatus: 'disabled',
      },
    }
  } catch (error) {
    console.error('🍌 Nano Banana Pro FAILED:', error)
    return {
      success: false,
      image: '',
      generationTimeMs: Date.now() - startTime,
      promptUsed: '',
      debug: { error: error instanceof Error ? error.message : String(error) },
    }
  }
}

function isFaceBoxSafeForSpatialLock(face: FaceCoordinates): boolean {
  const w = Math.max(1, face.xmax - face.xmin)
  const h = Math.max(1, face.ymax - face.ymin)
  const area = (w * h) / 1_000_000
  const aspect = h / w
  const edgeMargin = Math.min(face.xmin, face.ymin, 1000 - face.xmax, 1000 - face.ymax)
  if (face.confidence < 0.75) return false
  // Allow large close-up faces (common in portrait/cropped influencer photos).
  if (area < 0.02 || area > 0.7) return false
  if (aspect < 0.58 || aspect > 1.8) return false
  if (edgeMargin < 15) return false
  return true
}

function isFaceBoxUsableForSpatialLock(face: FaceCoordinates): boolean {
  const w = Math.max(1, face.xmax - face.xmin)
  const h = Math.max(1, face.ymax - face.ymin)
  const area = (w * h) / 1_000_000
  const aspect = h / w
  const edgeMargin = Math.min(face.xmin, face.ymin, 1000 - face.xmax, 1000 - face.ymax)
  if (face.confidence < 0.62) return false
  if (area < 0.01 || area > 0.78) return false
  if (aspect < 0.5 || aspect > 2.0) return false
  if (edgeMargin < 6) return false
  return true
}

function getFaceSpatialLock(face: FaceCoordinates | null): {
  quality: 'strict' | 'relaxed'
  box: { ymin: number; xmin: number; ymax: number; xmax: number }
} | null {
  if (!face) return null
  if (isFaceBoxSafeForSpatialLock(face)) {
    return {
      quality: 'strict',
      box: { ymin: face.ymin, xmin: face.xmin, ymax: face.ymax, xmax: face.xmax },
    }
  }
  if (isFaceBoxUsableForSpatialLock(face)) {
    return {
      quality: 'relaxed',
      box: { ymin: face.ymin, xmin: face.xmin, ymax: face.ymax, xmax: face.xmax },
    }
  }
  return null
}

function base64ToBuffer(dataUrlOrBase64: string): Buffer {
  const cleaned = (dataUrlOrBase64 || '').replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '')
  return Buffer.from(cleaned, 'base64')
}

function assessFaceDrift(
  personFace: FaceCoordinates | null,
  generatedFace: FaceCoordinates | null
): {
  shouldRetry: boolean
  reason: string
  metrics?: {
    iou: number
    centerDistance: number
    sizeDelta: number
  }
} {
  if (!personFace) {
    return { shouldRetry: false, reason: 'person_face_missing' }
  }
  // Retry once when output face detection fails (e.g. parser hiccup / weak detection),
  // because this commonly correlates with identity drift.
  if (!generatedFace) {
    return { shouldRetry: true, reason: 'generated_face_unknown' }
  }

  const iou = faceIoU(personFace, generatedFace)
  const centerDistance = faceCenterDistance(personFace, generatedFace)
  const sizeDelta = faceSizeDelta(personFace, generatedFace)

  const drift = iou < 0.58 || centerDistance > 70 || sizeDelta > 0.18
  return {
    shouldRetry: drift,
    reason: drift ? 'geometry_drift' : 'stable',
    metrics: { iou, centerDistance, sizeDelta },
  }
}

function shouldUseRetryCandidate(args: {
  firstFace: FaceCoordinates | null
  firstDriftAssessment: ReturnType<typeof assessFaceDrift>
  firstMicroDrift: Awaited<ReturnType<typeof computeMicroFaceDrift>> | null
  firstSceneAssessment: SceneQualityAssessment
  firstIdentityCompositionAssessment: IdentityCompositionAssessment
  retryFace: FaceCoordinates | null
  retryDriftAssessment: ReturnType<typeof assessFaceDrift>
  retryMicroDrift: Awaited<ReturnType<typeof computeMicroFaceDrift>> | null
  retrySceneAssessment: SceneQualityAssessment
  retryIdentityCompositionAssessment: IdentityCompositionAssessment
}): boolean {
  const {
    firstFace,
    firstDriftAssessment,
    firstMicroDrift,
    firstSceneAssessment,
    firstIdentityCompositionAssessment,
    retryFace,
    retryDriftAssessment,
    retryMicroDrift,
    retrySceneAssessment,
    retryIdentityCompositionAssessment,
  } = args

  // Never replace a valid detected face with an undetected one.
  if (firstFace && !retryFace) return false
  if (!firstFace && retryFace) return true

  const firstDrift = firstMicroDrift?.driftPercent
  const retryDrift = retryMicroDrift?.driftPercent
  if (typeof firstDrift === 'number' && typeof retryDrift === 'number') {
    // Require meaningful improvement to avoid flip-flopping between similar outputs.
    if (retryDrift <= firstDrift - 2.5) return true
    if (retryDrift >= firstDrift - 1.0) return false
  }

  // If first pass face is stable and retry still drifts, keep first.
  if (!firstDriftAssessment.shouldRetry && retryDriftAssessment.shouldRetry) return false

  // Scene-only improvement can win, but only when retry is not worse on face geometry.
  if (firstSceneAssessment.shouldRetry && !retrySceneAssessment.shouldRetry) {
    return !retryDriftAssessment.shouldRetry
  }

  const firstIdentityMin = Math.min(
    firstIdentityCompositionAssessment.scores.faceIdentity,
    firstIdentityCompositionAssessment.scores.bodyConsistency,
    firstIdentityCompositionAssessment.scores.compositionQuality,
    firstIdentityCompositionAssessment.scores.backgroundIntegrity
  )
  const retryIdentityMin = Math.min(
    retryIdentityCompositionAssessment.scores.faceIdentity,
    retryIdentityCompositionAssessment.scores.bodyConsistency,
    retryIdentityCompositionAssessment.scores.compositionQuality,
    retryIdentityCompositionAssessment.scores.backgroundIntegrity
  )
  if (retryIdentityMin >= firstIdentityMin + 4 && !retryDriftAssessment.shouldRetry) return true
  if (retryIdentityMin <= firstIdentityMin - 1) return false

  // Default to preserving first pass identity.
  return false
}

function buildRetryIdentityCorrectionGuidance(args: {
  baseIdentityCorrectionGuidance?: string
  microDriftEmphasis?: string
  hasHardFaceFailure: boolean
  isComplexBackgroundPreset: boolean
  identityCompositionGuidance?: string
}): string {
  return [
    args.baseIdentityCorrectionGuidance,
    args.microDriftEmphasis,
    args.identityCompositionGuidance,
    args.hasHardFaceFailure
      ? 'Hard identity correction: lock face age, skin luminance, and facial geometry to source exactly; no beautification or complexion shift.'
      : undefined,
    args.isComplexBackgroundPreset
      ? 'Complex scene rule: preserve source face first; if needed reduce background stylistic intensity before any face-region change.'
      : undefined,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()
}

function faceIoU(a: FaceCoordinates, b: FaceCoordinates): number {
  const x1 = Math.max(a.xmin, b.xmin)
  const y1 = Math.max(a.ymin, b.ymin)
  const x2 = Math.min(a.xmax, b.xmax)
  const y2 = Math.min(a.ymax, b.ymax)
  const w = Math.max(0, x2 - x1)
  const h = Math.max(0, y2 - y1)
  const inter = w * h
  const areaA = Math.max(1, (a.xmax - a.xmin) * (a.ymax - a.ymin))
  const areaB = Math.max(1, (b.xmax - b.xmin) * (b.ymax - b.ymin))
  const union = areaA + areaB - inter
  return union > 0 ? inter / union : 0
}

function faceCenterDistance(a: FaceCoordinates, b: FaceCoordinates): number {
  const ax = (a.xmin + a.xmax) / 2
  const ay = (a.ymin + a.ymax) / 2
  const bx = (b.xmin + b.xmax) / 2
  const by = (b.ymin + b.ymax) / 2
  return Math.hypot(ax - bx, ay - by)
}

function faceSizeDelta(a: FaceCoordinates, b: FaceCoordinates): number {
  const aw = Math.max(1, a.xmax - a.xmin)
  const ah = Math.max(1, a.ymax - a.ymin)
  const bw = Math.max(1, b.xmax - b.xmin)
  const bh = Math.max(1, b.ymax - b.ymin)
  const wr = aw / bw
  const hr = ah / bh
  return Math.max(Math.abs(1 - wr), Math.abs(1 - hr))
}

function buildSceneAssessmentFallback(): SceneQualityAssessment {
  return {
    shouldRetry: false,
    reason: 'scene_check_timeout',
    scores: {
      poseNaturalness: 85,
      lightingCoherence: 85,
      backgroundQuality: 85,
      compositionBalance: 85,
    },
  }
}

function tightenDriftAssessmentForUltraFaceLock(
  assessment: ReturnType<typeof assessFaceDrift>,
  enabled: boolean
): ReturnType<typeof assessFaceDrift> {
  if (!enabled || !assessment.metrics) return assessment
  const { iou, centerDistance, sizeDelta } = assessment.metrics
  const ultraDrift =
    iou < ULTRA_FACE_LOCK_IOU_MIN ||
    centerDistance > ULTRA_FACE_LOCK_CENTER_MAX ||
    sizeDelta > ULTRA_FACE_LOCK_SIZE_DELTA_MAX
  if (!ultraDrift) return assessment
  return {
    shouldRetry: true,
    reason: 'ultra_lock_geometry_drift',
    metrics: assessment.metrics,
  }
}

function sanitizeEnvironmentGuidance(value?: string): string | undefined {
  if (!value?.trim()) return undefined
  const normalized = value
    .replace(/\s+/g, ' ')
    .trim()
  const blocked = [
    'change face',
    'replace face',
    'swap face',
    'face from image',
    'do not change face',
    'keep face',
    'face 100%',
    'identical to reference photo',
    'beautify',
    'skin smoothing',
  ]
  const sentences = normalized.split(/[.!?]\s+/)
  const safe = sentences.filter((sentence) => {
    const lower = sentence.toLowerCase()
    return !blocked.some(token => lower.includes(token))
  })
  return safe.join(' ').trim() || undefined
}

function buildIdentityCompositionFallback(): IdentityCompositionAssessment {
  return {
    shouldRetry: false,
    reason: 'identity_composition_check_timeout',
    scores: {
      faceIdentity: 85,
      bodyConsistency: 85,
      compositionQuality: 85,
      backgroundIntegrity: 85,
    },
  }
}

function buildPresetLightingGuidance(
  lightingDescription?: string,
  fallbackLighting?: string
): string | undefined {
  const source = sanitizeEnvironmentGuidance(lightingDescription || fallbackLighting)
  if (!source) return undefined
  return `Preset lighting priority: ${source}. Apply this lighting logic across face, skin, clothing, and background with consistent direction, shadow softness, and color temperature.`
}

function buildPresetColorGuidance(
  exampleColorGuidance?: string,
  lightingDescription?: string,
  sceneDescription?: string
): string | undefined {
  const parts = [
    sanitizeEnvironmentGuidance(exampleColorGuidance),
    sanitizeEnvironmentGuidance(lightingDescription)
      ? `Use the selected preset's lighting palette and white-balance behavior: ${sanitizeEnvironmentGuidance(lightingDescription)}.`
      : undefined,
    sanitizeEnvironmentGuidance(sceneDescription)
      ? `Scene palette should feel native to this environment: ${sanitizeEnvironmentGuidance(sceneDescription)}.`
      : undefined,
    'Keep the image photorealistic with natural skin tones, controlled contrast, believable ambient color spill, cohesive highlight-shadow color separation, and readable foreground/background material detail.'
  ].filter(Boolean)

  return parts.join(' ')
}

function buildPresetSurfaceGuidance(
  presetId?: string,
  sceneDescription?: string
): string | undefined {
  const id = (presetId || '').trim().toLowerCase()
  const scene = sanitizeEnvironmentGuidance(sceneDescription)

  if (REFLECTIVE_SURFACE_PRESETS.has(id)) {
    return 'Reflective materials must behave physically correctly: preserve believable car-paint, glass, asphalt, and metal reflections, keep contour lines straight, and avoid warped mirror-like artifacts or showroom CGI sheen.'
  }

  if (scene && /(car|vehicle|glass|window|wet|metal)/i.test(scene)) {
    return 'Surfaces in the scene must keep readable real-world reflections and material texture. Avoid plastic gloss, warped highlights, and disconnected reflections.'
  }

  return 'Keep material response physically plausible across foreground and background surfaces, with readable texture and no smeared edge transitions.'
}

function sanitizeIdentityRules(rules: string[]): string[] {
  const forbidden = ['replace face', 'swap face', 'face from image 3', 'change identity']
  return rules
    .map(rule => rule.trim())
    .filter(Boolean)
    .filter((rule) => {
      const lower = rule.toLowerCase()
      return !forbidden.some(token => lower.includes(token))
    })
}

function getPresetFaceGuard(presetId?: string): {
  identityPriorityRules: string[]
  additionalAvoidTerms: string[]
  identityCorrectionGuidance?: string
} {
  const id = (presetId || '').trim().toLowerCase()
  if (!ULTRA_FACE_LOCK_PRESETS.has(id)) {
    return {
      identityPriorityRules: [],
      additionalAvoidTerms: [],
    }
  }

  const sharedRules = [
    'Ultra face-lock preset: preserve face geometry exactly at source proportions and pixel-level texture fidelity.',
    'Do not apply mood grade or stylization to eyes, nose, lips, cheeks, jawline, or brow shape.',
    'Keep natural pore detail and facial micro-contrast from source; do not smooth, contour, or beautify.',
    'Preserve original body proportions, shoulder width, torso width, limb thickness, and natural weight distribution exactly as seen in the source image.',
  ]
  const sharedAvoid = [
    'face reshape',
    'jawline edit',
    'eye restyle',
    'beauty retouch',
    'skin denoise face',
    'face tone remap',
    'body slimming',
    'limb reshaping',
  ]

  if (id === 'golden_hour_bedroom') {
    return {
      identityPriorityRules: [
        ...sharedRules,
        'For striped blind shadows, keep face planes unchanged and avoid shadow-driven face warping.',
      ],
      additionalAvoidTerms: [...sharedAvoid, 'striped shadow warping on face'],
      identityCorrectionGuidance:
        'Golden-hour blind lighting may affect scene mood, but face geometry and pore texture must remain source-identical.',
    }
  }

  if (id === 'studio_crimson_noir') {
    return {
      identityPriorityRules: [
        ...sharedRules,
        'Crimson low-key grading must remain background-dominant and must not recolor facial anatomy unnaturally.',
      ],
      additionalAvoidTerms: [...sharedAvoid, 'crimson face cast clipping'],
      identityCorrectionGuidance:
        'Neo-noir treatment should deepen background and clothing contrast while keeping face topology and tonal identity stable.',
    }
  }

  if (id === 'paris_eiffel_flash_night') {
    return {
      identityPriorityRules: [
        ...sharedRules,
        'For Paris flash-night scenes, keep the flash effect on skin and hoodie realistic but do not let flash contrast sharpen or stylize facial anatomy.',
        'Preserve exact face topology under hard flash: no jaw tightening, no cheek hollowing, no brow-eye restyling, and no skin cleanup.',
      ],
      additionalAvoidTerms: [
        ...sharedAvoid,
        'hard flash face stylization',
        'paris night identity drift',
        'flash sharpened jawline',
      ],
      identityCorrectionGuidance:
        'Hard flash and warm night practicals may change exposure, but face geometry, skin texture, and perceived identity must remain source-identical.',
    }
  }

  return {
    identityPriorityRules: sharedRules,
    additionalAvoidTerms: sharedAvoid,
    identityCorrectionGuidance:
      'Night preset: preserve exact face topology and avoid any beauty or cinematic grading on the face region.',
  }
}

function getPresetOpticalGuard(presetId?: string): {
  cameraGuidance?: string
  additionalAvoidTerms: string[]
} {
  const id = (presetId || '').trim().toLowerCase()
  if (!NO_SYNTHETIC_BLUR_PRESETS.has(id)) {
    return {
      additionalAvoidTerms: [],
    }
  }

  return {
    cameraGuidance:
      'Optical behavior: maintain medium-to-deep focus with legible foreground and background materials, realistic depth transitions, and no synthetic portrait-mode blur.',
    additionalAvoidTerms: [
      'gaussian background blur',
      'fake bokeh circles',
      'portrait mode cutout blur',
      'blur wall background',
      'depth blur artifacts',
      'smudged background textures',
      'mushy background',
      'background haze behind subject',
      'halo around subject edges',
    ],
  }
}

function buildSceneFallback(input: NanoBananaProInput) {
  const anchor = input.presetDescription || 'Clean gradient studio backdrop with soft even ambient lighting.'
  return {
    preset: input.presetId || 'studio_gradient',
    scenarioVariant: 'timeout_fallback',
    anchorZone: anchor,
    lightingMode: 'environment_coherent' as const,
    posePolicy: 'inherit' as const,
    facePolicy: 'immutable' as const,
    cameraPolicy: 'inherit' as const,
    realismGuidance:
      'Single coherent photograph: subject lit by and grounded in the same environment; shadows and highlights on the subject consistent with the scene; consistent perspective and depth; no pasted-on or cut-out look; no generic blurred-background haze; clear foreground-midground-background composition.',
    lightingBlueprint:
      'Match scene lighting on subject: natural key and fill from visible environment sources, coherent shadow direction and softness, and consistent color temperature between subject and background.',
    presetAvoid: 'No hard flash, no exaggerated color cast, no cut-out edges, no pasted subject appearance.',
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
