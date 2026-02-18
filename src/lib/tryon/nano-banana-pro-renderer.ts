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
import { getAllPresetIds } from './presets/index'
import { extractFaceCrop } from './face-crop'
import { computeMicroFaceDrift, getDriftRetryParams } from './micro-face-drift'
import { getPresetExampleGuidance, getRequestExampleGuidance } from './presets/example-prompts-reference'
import { getPresetStrengthProfile } from './preset-strength-profile'

const MAIN_RENDER_MODEL = 'gemini-3-pro-image-preview' as const
const ENABLE_QUALITY_RETRY = process.env.TRYON_ENABLE_QUALITY_RETRY === 'true'
const MICRO_DRIFT_RETRY_THRESHOLD = 40

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
    const strengthProfile = getPresetStrengthProfile({
      presetId: resolvedPresetId,
    })

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
      styleGuidance: exampleGuidance
        ? `${exampleGuidance.vibe} ${exampleGuidance.scene}`
        : undefined,
      colorGradingGuidance: exampleGuidance?.colorGrading,
      cameraGuidance: exampleGuidance?.camera,
      poseInferenceGuidance: exampleGuidance?.poseInference,
      additionalAvoidTerms: Array.from(
        new Set([...(presetGuidance?.avoidTerms || []), ...(requestGuidance?.avoidTerms || [])])
      ),
      identityPriorityRules: Array.from(
        new Set([...(presetGuidance?.identityRules || []), ...(requestGuidance?.identityRules || [])])
      ),
      strengthProfile,
      hasFaceReference: Boolean(faceCropResult.success && faceCropResult.faceCropBase64),
      faceBox: personFace && isFaceBoxSafeForSpatialLock(personFace)
        ? {
            ymin: personFace.ymin,
            xmin: personFace.xmin,
            ymax: personFace.ymax,
            xmax: personFace.xmax,
          }
        : undefined,
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
    sceneAssessment = generatedSceneAssessment
    const firstPassImage = generatedImage
    const firstPassFace = generatedFace
    const firstPassDriftAssessment = driftAssessment
    const firstPassSceneAssessment = sceneAssessment
    const hasTrustedSourceFace = Boolean(personFace && isFaceBoxSafeForSpatialLock(personFace))
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

  const drift = iou < 0.45 || centerDistance > 90 || sizeDelta > 0.22
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
