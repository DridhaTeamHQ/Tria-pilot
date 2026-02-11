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
import { getAllStylePresets } from './style-presets'

const MAIN_RENDER_MODEL = 'gemini-3-pro-image-preview' as const

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

  try {
    // ═════════════════════════════════════════════════════════════════════════
    // STAGE 1: Scene Intelligence
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n━━━ STAGE 1: Scene Intelligence ━━━')

    const presetNames = getAllStylePresets().map(p => p.id)

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
          characterSummary: 'single subject from Image 1',
          poseSummary: 'inherit pose and head angle from Image 1',
          appearanceSummary: 'preserve stable hairstyle and accessories from Image 1',
          bodyAnchor:
            'preserve original body build, weight, shoulder width, torso mass, and limb proportions exactly as visible in Image 1',
          garmentOnPersonGuidance:
            'garment follows original shoulder slope and torso drape from Image 1 — do not slim or reshape body',
        }
      ),
    ])

    console.log(`   preset=${sceneConfig.preset}`)
    console.log(`   anchorZone="${sceneConfig.anchorZone.substring(0, 80)}"`)
    if (sceneConfig.lightingBlueprint) {
      console.log(`   lightingBlueprint="${sceneConfig.lightingBlueprint.substring(0, 90)}"`)
    }
    if (sceneConfig.presetAvoid) {
      console.log(`   presetAvoid="${sceneConfig.presetAvoid.substring(0, 90)}"`)
    }
    console.log(`   facePolicy=${sceneConfig.facePolicy}`)

    // ═════════════════════════════════════════════════════════════════════════
    // STAGE 2: Compact Prompt
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n━━━ STAGE 2: Compact Prompt ━━━')

    const promptInput = {
      garmentDescription: input.garmentDescription,
      preset: sceneConfig.anchorZone,
      lighting: sceneConfig.lightingMode,
      realismGuidance: sceneConfig.realismGuidance,
      lightingBlueprint: sceneConfig.lightingBlueprint,
      presetAvoid: sceneConfig.presetAvoid,
      garmentOnPersonGuidance: forensicAnchor.garmentOnPersonGuidance,
      faceForensicAnchor: forensicAnchor.faceAnchor,
      characterSummary: forensicAnchor.characterSummary,
      poseSummary: forensicAnchor.poseSummary,
      appearanceSummary: forensicAnchor.appearanceSummary,
      bodyAnchor: forensicAnchor.bodyAnchor,
      faceBox: personFace
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

    console.log(`   prompt (${prompt.length} chars):`)
    console.log(`   "${prompt}"`)

    // ═════════════════════════════════════════════════════════════════════════
    // STAGE 3: Nano Banana Pro Rendering
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n━━━ STAGE 3: Nano Banana Pro ━━━')
    const aspectRatio = input.aspectRatio || '1:1'
    console.log(`   aspectRatio=${aspectRatio}`)

    let generatedImage = await generateTryOnDirect({
      personImageBase64: input.personImageBase64,
      garmentImageBase64: input.garmentImageBase64,
      // Keep the transport simple: person + prompt + garment.
      faceCropBase64: undefined,
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

    if (driftAssessment.shouldRetry || sceneAssessment.shouldRetry) {
      retried = true
      const retryReasons = [
        driftAssessment.shouldRetry ? `face:${driftAssessment.reason}` : null,
        sceneAssessment.shouldRetry ? `scene:${sceneAssessment.reason}` : null,
      ]
        .filter(Boolean)
        .join(', ')
      console.warn(`   ⚠️ Quality retry triggered (${retryReasons}), retrying once with stricter controls`)
      const retryPrompt = buildForensicPrompt({
        ...promptInput,
        retryMode: true,
        sceneCorrectionGuidance: sceneAssessment.correctionGuidance,
      })

      generatedImage = await generateTryOnDirect({
        personImageBase64: input.personImageBase64,
        garmentImageBase64: input.garmentImageBase64,
        faceCropBase64: undefined,
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
    }

    const genTime = Date.now() - startTime
    console.log(`   Generated in ${(genTime / 1000).toFixed(1)}s`)

    console.log('\n━━━ PIPELINE COMPLETE ━━━')
    console.log(`   Total: ${((Date.now() - startTime) / 1000).toFixed(1)}s`)

    return {
      success: true,
      image: generatedImage,
      generationTimeMs: Date.now() - startTime,
      promptUsed: prompt,
      debug: {
        model: MAIN_RENDER_MODEL,
        sceneConfig,
        forensicAnchor,
        personFace,
        retried,
        driftAssessment,
        sceneAssessment,
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
  // Do NOT retry when we failed to detect a face in the output (e.g. detector parse error).
  // Retry only when we have both faces and clear geometry drift — otherwise we double-hit the API for no reason.
  if (!generatedFace) {
    return { shouldRetry: false, reason: 'generated_face_unknown' }
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
