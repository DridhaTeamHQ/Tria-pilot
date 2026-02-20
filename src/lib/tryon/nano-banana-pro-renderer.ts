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
import { getAllPresetIds, getPresetById } from './presets/index'
import { extractFaceCrop } from './face-crop'
import { computeMicroFaceDrift, getDriftRetryParams } from './micro-face-drift'
import { getPresetExampleGuidance, getRequestExampleGuidance } from './presets/example-prompts-reference'
import { getPresetStrengthProfile } from './preset-strength-profile'

const MAIN_RENDER_MODEL = 'gemini-3-pro-image-preview' as const
const ENABLE_QUALITY_RETRY = process.env.TRYON_ENABLE_QUALITY_RETRY !== 'false'
const MICRO_DRIFT_RETRY_THRESHOLD = 22
const ULTRA_FACE_LOCK_IOU_MIN = 0.68
const ULTRA_FACE_LOCK_CENTER_MAX = 55
const ULTRA_FACE_LOCK_SIZE_DELTA_MAX = 0.14
const ULTRA_FACE_LOCK_PRESETS = new Set([
  'urban_gas_station_night',
  'street_mcdonalds_bmw_night',
  'studio_crimson_noir',
  'golden_hour_bedroom',
])
const NO_SYNTHETIC_BLUR_PRESETS = new Set([
  'urban_gas_station_night',
  'street_mcdonalds_bmw_night',
  'studio_crimson_noir',
  'golden_hour_bedroom',
  'outdoor_kerala_theyyam_gtr',
  'studio_bw_minimalist_portrait',
  'home_cozy_teddy_selfie',
  'travel_scene_lock_realism',
  'street_elevator_mirror_chic',
  'editorial_sky_negative_space',
  'editorial_night_garden_flash',
  'studio_white_brick_bench',
  'editorial_newspaper_set',
  'editorial_court_geometric_sun',
  'studio_window_blind_portrait',
  'editorial_dark_study_set',
  'studio_orange_director_chair',
  'studio_green_red_gel_editorial',
  'studio_red_seamless_profile',
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

    const [sceneConfig, personFace, forensicAnchor, faceCropResult] = await Promise.all([
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
      detectFaceCoordinates(input.personImageBase64),
      withTimeout(
        buildForensicFaceAnchor({
          personImageBase64: input.personImageBase64,
          garmentDescription: input.garmentDescription,
        }),
        5000,
        {
          faceAnchor:
            'preserve exact eye geometry, nose bridge and tip, lip contour, jawline, skin texture, facial hair pattern, and eyewear geometry',
          eyesAnchor:
            'almond eye shape, medium inter-eye spacing, dark brown iris color, forward gaze direction, stable eyelid crease and brow geometry',
          characterSummary: 'single subject from Image 1',
          poseSummary: 'inherit pose and head angle from Image 1',
          appearanceSummary: 'preserve stable hairstyle and accessories from Image 1',
          bodyAnchor:
            'preserve original body build, weight, shoulder width, torso mass, and limb proportions exactly as visible in Image 1',
          garmentOnPersonGuidance:
            'garment follows original shoulder slope and torso drape from Image 1 — do not slim or reshape body',
        }
      ),
      withTimeout(
        extractFaceCrop(input.personImageBase64),
        3000,
        { success: false, faceCropBase64: '' }
      ),
    ])

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
    const resolvedPreset = getPresetById(resolvedPresetId || '')
    const presetFaceGuard = getPresetFaceGuard(resolvedPresetId)
    const presetOpticalGuard = getPresetOpticalGuard(resolvedPresetId)
    const strengthProfile = getPresetStrengthProfile({
      presetId: resolvedPresetId,
      category: resolvedPreset?.category,
    })
    const faceSpatialLock = getFaceSpatialLock(personFace)

    const promptInput = {
      garmentDescription: input.garmentDescription,
      preset: sceneConfig.anchorZone,
      lighting: sceneConfig.lightingMode,
      realismGuidance: sceneConfig.realismGuidance,
      lightingBlueprint: sceneConfig.lightingBlueprint,
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
          : undefined
      ),
      colorGradingGuidance: sanitizeEnvironmentGuidance(exampleGuidance?.colorGrading),
      cameraGuidance: [
        sanitizeEnvironmentGuidance(exampleGuidance?.camera),
        presetOpticalGuard.cameraGuidance,
      ].filter(Boolean).join(' '),
      poseInferenceGuidance: sanitizeEnvironmentGuidance(exampleGuidance?.poseInference),
      additionalAvoidTerms: Array.from(
        new Set([
          ...(presetGuidance?.avoidTerms || []),
          ...(requestGuidance?.avoidTerms || []),
          ...presetFaceGuard.additionalAvoidTerms,
          ...presetOpticalGuard.additionalAvoidTerms,
        ])
      ),
      identityPriorityRules: Array.from(
        new Set([
          ...sanitizeIdentityRules([...(presetGuidance?.identityRules || []), ...(requestGuidance?.identityRules || [])]),
          'Preset style, grading, and mood controls apply to scene and garment only, never to facial geometry or face skin texture.',
          'Night or moody rendering must not reshape jaw, cheeks, eyes, or brows, and must not beautify or airbrush the face.',
          ...presetFaceGuard.identityPriorityRules,
        ])
      ),
      identityCorrectionGuidance: presetFaceGuard.identityCorrectionGuidance,
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
      retryMode: false,
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

    const [generatedFace, generatedSceneAssessment] = await Promise.all([
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
    ])
    driftAssessment = assessFaceDrift(personFace, generatedFace)
    driftAssessment = tightenDriftAssessmentForUltraFaceLock(
      driftAssessment,
      isUltraFaceLockPreset
    )
    sceneAssessment = generatedSceneAssessment
    const firstPassImage = generatedImage
    const firstPassFace = generatedFace
    const firstPassDriftAssessment = driftAssessment
    const firstPassSceneAssessment = sceneAssessment
    const hasTrustedSourceFace = Boolean(faceSpatialLock)
    try {
      const refBuffer = base64ToBuffer(input.personImageBase64)
      const genBuffer = base64ToBuffer(generatedImage)
      microDrift = await computeMicroFaceDrift(refBuffer, genBuffer)
      if (
        hasTrustedSourceFace &&
        generatedFace &&
        microDrift.success &&
        microDrift.driftPercent >= MICRO_DRIFT_RETRY_THRESHOLD
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
      firstPassMicroDrift.driftPercent >= MICRO_DRIFT_RETRY_THRESHOLD
    )
    const hardFaceFailure = hasTrustedSourceFace && firstPassDriftAssessment.reason === 'generated_face_unknown'
    const geometryRetrySignal = Boolean(
      hasTrustedSourceFace &&
      firstPassFace &&
      firstPassDriftAssessment.shouldRetry &&
      firstPassMicroDriftSevere
    )
    const hasRetrySignal = hardFaceFailure || geometryRetrySignal
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
        driftRetryParams.emphasis ? `micro-face:${driftRetryParams.emphasis}` : null,
      ]
        .filter(Boolean)
        .join(', ')
      console.warn(`   ⚠️ Quality retry triggered (${retryReasons}), retrying once with stricter controls`)
      const retryPrompt = buildForensicPrompt({
        ...promptInput,
        retryMode: true,
        sceneCorrectionGuidance: sceneAssessment.correctionGuidance,
        identityCorrectionGuidance: driftRetryParams.emphasis || undefined,
      })

      generatedImage = await generateTryOnDirect({
        personImageBase64: input.personImageBase64,
        garmentImageBase64: input.garmentImageBase64,
        faceCropBase64: faceCropResult.success ? faceCropResult.faceCropBase64 : undefined,
        prompt: retryPrompt,
        aspectRatio,
        resolution: '2K',
      })

      const [retryFace, retrySceneAssessment] = await Promise.all([
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
      ])
      driftAssessment = assessFaceDrift(personFace, retryFace)
      driftAssessment = tightenDriftAssessmentForUltraFaceLock(
        driftAssessment,
        isUltraFaceLockPreset
      )
      sceneAssessment = retrySceneAssessment
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
        retryFace,
        retryDriftAssessment: driftAssessment,
        retryMicroDrift,
        retrySceneAssessment: sceneAssessment,
      })

      if (!useRetry) {
        generatedImage = firstPassImage
        driftAssessment = firstPassDriftAssessment
        sceneAssessment = firstPassSceneAssessment
        microDrift = firstPassMicroDrift
        console.warn('   ↩️ Keeping first pass output (retry did not improve identity).')
      } else {
        microDrift = retryMicroDrift
      }
    } else if (ENABLE_QUALITY_RETRY && hasRetrySignal && !canRetryInTime) {
      console.warn(
        `   ⚠️ Skipping retry to avoid timeout (elapsed=${elapsedBeforeRetryMs}ms, budget=${retryBudgetMs}ms)`
      )
    }

    const genTime = Date.now() - startTime
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
        retried,
        driftAssessment,
        microDrift,
        driftRetryParams,
        sceneAssessment,
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
  if (area < 0.03 || area > 0.24) return false
  if (aspect < 0.75 || aspect > 1.6) return false
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
  if (area < 0.015 || area > 0.32) return false
  if (aspect < 0.65 || aspect > 1.8) return false
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
  retryFace: FaceCoordinates | null
  retryDriftAssessment: ReturnType<typeof assessFaceDrift>
  retryMicroDrift: Awaited<ReturnType<typeof computeMicroFaceDrift>> | null
  retrySceneAssessment: SceneQualityAssessment
}): boolean {
  const {
    firstFace,
    firstDriftAssessment,
    firstMicroDrift,
    firstSceneAssessment,
    retryFace,
    retryDriftAssessment,
    retryMicroDrift,
    retrySceneAssessment,
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

  // Default to preserving first pass identity.
  return false
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
  ]
  const sharedAvoid = [
    'face reshape',
    'jawline edit',
    'eye restyle',
    'beauty retouch',
    'skin denoise face',
    'face tone remap',
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
      'Optical behavior: maintain medium-to-deep focus with legible background materials and edges; avoid synthetic portrait-mode blur.',
    additionalAvoidTerms: [
      'gaussian background blur',
      'fake bokeh circles',
      'portrait mode cutout blur',
      'blur wall background',
      'depth blur artifacts',
      'smudged background textures',
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
      'Single coherent photograph: subject lit by and grounded in the same environment; shadows and highlights on the subject consistent with the scene; consistent perspective and depth; no pasted-on or cut-out look.',
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
