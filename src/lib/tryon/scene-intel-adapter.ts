/**
 * SCENE INTELLIGENCE ADAPTER (Stage 1)
 *
 * Resolves user intent → strict scene config using GPT-4o.
 *
 * RULES:
 * - Output is STRICT JSON ONLY (SceneIntelOutput).
 * - NEVER describes the person.
 * - Presets describe EMPTY environments only.
 * - If preset conflicts with inherited pose → fallback to studio_gradient.
 * - No "portrait", "model", "fashion", "cinematic" language.
 * - lightingMode is ALWAYS "environment_coherent" (scene-consistent harmonization).
 * - facePolicy is ALWAYS "immutable".
 * - posePolicy stays source-compatible while allowing safe preset-driven variation.
 */

import 'server-only'
import { getOpenAI } from '@/lib/openai'
import { getPresetById } from './presets/index'
import { getPresetExampleGuidance, getRequestExampleGuidance } from './presets/example-prompts-reference'

const PROMPT_INTEL_MODEL = process.env.TRYON_PROMPT_MODEL?.trim() || 'gpt-4o'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SceneIntelOutput {
  /** Resolved preset id (e.g. "studio_gradient", "india_street", "modern_cafe") */
  preset: string
  /** Scenario variant within the preset */
  scenarioVariant: string
  /** Anchor zone description – describes the EMPTY environment around the subject */
  anchorZone: string
  /** Lighting mode – ALWAYS "environment_coherent" (scene-consistent harmonization) */
  lightingMode: 'environment_coherent'
  /** Pose policy – source-compatible with safe preset-driven variation */
  posePolicy: 'inherit'
  /** Face policy – ALWAYS "immutable" */
  facePolicy: 'immutable'
  /** Camera policy – ALWAYS "inherit" */
  cameraPolicy: 'inherit'
  /** Additional realism guidance for camera/lighting/depth (environment only) */
  realismGuidance?: string
  /** Explicit lighting blueprint for subject-scene harmonization */
  lightingBlueprint?: string
  /** Camera treatment inferred from preset + source image */
  cameraGuidance?: string
  /** Safe pose envelope inferred from preset + source image */
  poseGuidance?: string
  /** Additional scene-level realism cues from vision analysis */
  sceneGuidance?: string
  /** Preset-specific elements to avoid (from curated preset metadata) */
  presetAvoid?: string
  /** Fallback info if preset was rejected */
  fallback?: {
    preset: 'studio_gradient'
    reason: string
  }
}

export interface SceneIntelInput {
  userRequest?: string
  presetId?: string
  presetDescription?: string
  personImageBase64?: string
  availablePresets: string[]
}

interface PresetPolicy {
  anchorZone: string
  realismGuidance: string
  lightingBlueprint: string
  presetAvoid?: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT (GPT-4o)
// ═══════════════════════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = [
  'You are a scene intelligence engine for a virtual try-on system.',
  'Return one JSON object that describes the empty environment only.',
  '',
  'Rules:',
  '- Never describe a person, face, body, pose, expression, or gaze.',
  '- Do not use portrait, model, fashion, cinematic, editorial, stunning, beautiful, or elegant.',
  '- Presets describe empty locations only.',
  '- lightingMode must always be "environment_coherent".',
  '- posePolicy must always be "inherit".',
  '- facePolicy must always be "immutable".',
  '- cameraPolicy must always be "inherit".',
  '- If the request is unsafe or cannot be resolved, use the studio_gradient fallback.',
  '',
  'Return JSON only:',
  '{',
  '  "preset": "<preset_id>",',
  '  "scenarioVariant": "<brief variant name>",',
  '  "anchorZone": "<1-2 sentence description of the empty environment>",',
  '  "lightingMode": "environment_coherent",',
  '  "posePolicy": "inherit",',
  '  "facePolicy": "immutable",',
  '  "cameraPolicy": "inherit"',
  '}',
  '',
  'Fallback shape:',
  '{',
  '  "preset": "studio_gradient",',
  '  "scenarioVariant": "fallback",',
  '  "anchorZone": "Clean gradient studio backdrop with soft even lighting.",',
  '  "lightingMode": "environment_coherent",',
  '  "posePolicy": "inherit",',
  '  "facePolicy": "immutable",',
  '  "cameraPolicy": "inherit",',
  '  "fallback": { "preset": "studio_gradient", "reason": "<reason>" }',
  '}',
].join('\n')

const VISION_REALISM_SYSTEM_PROMPT = [
  'You are a realism planner for virtual try-on scene construction.',
  'Return JSON only:',
  '{',
  '  "anchorZone": "<empty environment description>",',
  '  "realismGuidance": "<single sentence about camera realism and physically plausible integration>",',
  '  "lightingBlueprint": "<single sentence about practical lighting direction, color temperature, and shadow softness>",',
  '  "cameraGuidance": "<single sentence about practical camera angle, focal behavior, and depth rendering>",',
  '  "poseGuidance": "<single sentence about safe preset-compatible posture variation without changing identity or body proportions>",',
  '  "sceneGuidance": "<single sentence about material realism, background detail, and scene grounding>",',
  '  "scenarioVariant": "<short variant name>"',
  '}',
  '',
  'Rules:',
  '- Never describe person identity.',
  '- Do not include face, eye, or gaze instructions.',
  '- Keep camera language practical and production-safe.',
  '- The subject must appear lit by the same environment as the background.',
  '- Explicitly ground the subject with coherent lighting, shadows, ambient spill, and subtle edge wrap.',
  '- Mention depth layering briefly.',
  '- Keep perspective and focal plane consistent with the uploaded person image.',
  '- Infer a safe pose envelope from the uploaded person image and preset: allow natural scene-compatible variation, but never alter body proportions, identity, or recognizability.',
  '- Camera guidance may adapt angle and depth behavior to the preset, but must stay compatible with the uploaded person image.',
  '- Avoid exaggerated blur, fake HDR glow, plastic textures, and over-processed backgrounds.',
  '- Keep the environment photoreal, materially believable, and naturally captured.',
].join('\n')

function toDataUrl(base64: string): string {
  if (base64.startsWith('data:image/')) return base64
  return `data:image/jpeg;base64,${base64}`
}

function buildPresetPolicy(presetId?: string, presetDescription?: string): PresetPolicy {
  const preset = presetId ? getPresetById(presetId) : undefined
  const exampleGuidance = getPresetExampleGuidance(presetId)
  const anchorZone = (preset?.scene || presetDescription || 'Clean gradient studio backdrop with soft even ambient lighting.').trim()
  const baseLighting =
    (preset?.lighting ||
      'ambient practical lighting with coherent shadow direction and natural falloff').trim()
  const camera = (preset?.camera || 'natural perspective, realistic depth').trim()
  const presetAvoid = preset?.negative_bias?.trim() || undefined

  const realismGuidance = [
    'Single coherent photograph: subject lit by and grounded in the same environment.',
    `Use preset lighting logic: ${baseLighting}.`,
    exampleGuidance?.vibe ? `Target vibe from successful references: ${exampleGuidance.vibe}.` : '',
    exampleGuidance?.scene ? `Reference scene characteristics: ${exampleGuidance.scene}.` : '',
    'Apply environmental harmonization: ambient color spill and subtle edge light wrap on the subject.',
    `Keep perspective and depth consistent with preset camera intent: ${camera}.`,
    exampleGuidance?.camera ? `Camera treatment from references: ${exampleGuidance.camera}.` : '',
    exampleGuidance?.colorGrading
      ? `Color treatment from references: ${exampleGuidance.colorGrading}.`
      : '',
    'Background materials must remain photoreal with natural texture variation and subtle imperfections, not synthetic or overly smooth.',
    'Maintain natural camera rendering with consistent micro-contrast and light grain so subject and background share the same capture characteristics.',
    'Preserve natural contact shadows and local ambient occlusion where the body meets nearby surfaces.',
    'Avoid cut-out or pasted-on appearance.',
    presetAvoid ? `Avoid per preset: ${presetAvoid}.` : '',
  ]
    .filter(Boolean)
    .join(' ')

  const lightingBlueprint = [
    `Lighting blueprint from preset "${presetId || 'custom'}":`,
    'derive key/fill/rim from visible scene sources,',
    `match highlight and shadow direction to "${baseLighting}",`,
    exampleGuidance?.lighting ? `reference lighting behavior: ${exampleGuidance.lighting},` : '',
    'keep subject and background in the same color-temperature space,',
    'add subtle ambient color spill and edge light wrap from the environment,',
    'preserve realistic falloff and contact shadows at feet/body edges.',
  ].join(' ')

  return {
    anchorZone,
    realismGuidance,
    lightingBlueprint,
    presetAvoid:
      [presetAvoid, ...(exampleGuidance?.avoidTerms || [])]
        .filter(Boolean)
        .join('; ') || undefined,
  }
}

function mergeGuidance(primary: string, secondary?: string): string {
  if (!secondary?.trim()) return primary
  return `${secondary.trim()} ${primary}`
}

async function buildVisionRealismGuidance(params: {
  personImageBase64?: string
  presetDescription: string
  userRequest?: string
}): Promise<{
  anchorZone: string
  realismGuidance: string
  lightingBlueprint: string
  cameraGuidance: string
  poseGuidance: string
  sceneGuidance: string
  scenarioVariant: string
}> {
  const openai = getOpenAI()

  const userText = [
    `Selected environment preset: ${params.presetDescription}`,
    `Optional user request: ${params.userRequest || 'none'}`,
    '',
    'Refine this environment for photorealism.',
    'The subject must look lit by and grounded in the same environment.',
    'Describe only environment and camera realism.',
    'Do not describe the person.',
  ].join('\n')

  const content: any[] = [{ type: 'text', text: userText }]
  if (params.personImageBase64) {
    content.push({
      type: 'image_url',
      image_url: {
        url: toDataUrl(params.personImageBase64),
        detail: 'high',
      },
    })
  }

  const response = await openai.chat.completions.create({
    model: PROMPT_INTEL_MODEL,
    messages: [
      { role: 'system', content: VISION_REALISM_SYSTEM_PROMPT },
      { role: 'user', content },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 280,
  })

  const raw = response.choices[0]?.message?.content || '{}'
  const parsed = JSON.parse(raw) as {
    anchorZone?: string
    realismGuidance?: string
    lightingBlueprint?: string
    cameraGuidance?: string
    poseGuidance?: string
    sceneGuidance?: string
    scenarioVariant?: string
  }

  return {
    anchorZone: (parsed.anchorZone || params.presetDescription).trim(),
    realismGuidance: (
      parsed.realismGuidance ||
      'Single coherent photograph: subject lit by and grounded in the same environment; shadows and highlights on the subject consistent with the scene; consistent perspective and depth; no pasted-on or cut-out look.'
    ).trim(),
    lightingBlueprint: (
      parsed.lightingBlueprint ||
      'Match scene lighting on subject: natural key and fill from visible environment sources, coherent shadow direction and softness, and consistent color temperature between subject and background.'
    ).trim(),
    cameraGuidance: (
      parsed.cameraGuidance ||
      'Keep camera angle and focal behavior compatible with the source image while adapting framing and depth naturally to the preset. Avoid synthetic portrait blur and preserve believable lens response.'
    ).trim(),
    poseGuidance: (
      parsed.poseGuidance ||
      'Allow only safe preset-compatible posture variation from the source image: natural body angle shifts, relaxed hand placement, and environment-fit seated or standing behavior without changing body proportions or recognizability.'
    ).trim(),
    sceneGuidance: (
      parsed.sceneGuidance ||
      'Keep background materials sharp enough to feel real, preserve natural texture variation, and ground the subject with coherent scale, depth, and surface interaction.'
    ).trim(),
    scenarioVariant: (parsed.scenarioVariant || 'preset_refined').trim(),
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resolve user request to a strict scene config via GPT-4o.
 *
 * @param userRequest - User's scene/preset request (e.g. "co-working space" or "india_street")
 * @param availablePresets - List of available preset IDs for grounding
 * @returns SceneIntelOutput — strict JSON config
 */
export async function getStrictSceneConfig(
  input: SceneIntelInput
): Promise<SceneIntelOutput> {
  try {
    const userRequest = (input.userRequest || '').trim()
    const requestGuidance = getRequestExampleGuidance(userRequest)

    const presetId = (input.presetId || '').trim()
    const presetDescription = (input.presetDescription || '').trim()

    // Deterministic preset path: if preset description is provided, it is the
    // authoritative environment and must not be replaced by fallback.
    if (presetDescription.length > 0) {
      const deterministicPreset = presetId || 'preset_selected'
      const presetPolicy = buildPresetPolicy(deterministicPreset, presetDescription)
      try {
        const refined = await buildVisionRealismGuidance({
          personImageBase64: input.personImageBase64,
          presetDescription,
          userRequest,
        })
        return {
          preset: deterministicPreset,
          scenarioVariant: refined.scenarioVariant || 'preset_locked',
          anchorZone: refined.anchorZone || presetPolicy.anchorZone,
          lightingMode: 'environment_coherent',
          posePolicy: 'inherit',
          facePolicy: 'immutable',
          cameraPolicy: 'inherit',
          realismGuidance: mergeGuidance(presetPolicy.realismGuidance, refined.realismGuidance),
          lightingBlueprint: mergeGuidance(presetPolicy.lightingBlueprint, refined.lightingBlueprint),
          cameraGuidance: refined.cameraGuidance,
          poseGuidance: refined.poseGuidance,
          sceneGuidance: refined.sceneGuidance,
          presetAvoid: [presetPolicy.presetAvoid, ...(requestGuidance?.avoidTerms || [])]
            .filter(Boolean)
            .join('; ') || undefined,
        }
      } catch {
        return {
          preset: deterministicPreset,
          scenarioVariant: 'preset_locked',
          anchorZone: presetPolicy.anchorZone,
          lightingMode: 'environment_coherent',
          posePolicy: 'inherit',
          facePolicy: 'immutable',
          cameraPolicy: 'inherit',
          realismGuidance: mergeGuidance(
            presetPolicy.realismGuidance,
            requestGuidance
              ? `Reference vibe hints: ${requestGuidance.vibe}. Scene cues: ${requestGuidance.scene}.`
              : undefined
          ),
          lightingBlueprint: mergeGuidance(
            presetPolicy.lightingBlueprint,
            requestGuidance?.lighting
              ? `Reference lighting hints: ${requestGuidance.lighting}.`
              : undefined
          ),
          cameraGuidance:
            'Keep camera angle compatible with the source image and preset. Preserve believable lens response and avoid synthetic blur or over-stylized depth effects.',
          poseGuidance:
            'Allow safe preset-compatible posture variation only when needed by the environment. Preserve recognizability, body proportions, and natural anatomy.',
          sceneGuidance:
            'Keep the subject grounded in the environment with realistic material texture, contact cues, and coherent depth.',
          presetAvoid: [presetPolicy.presetAvoid, ...(requestGuidance?.avoidTerms || [])]
            .filter(Boolean)
            .join('; ') || undefined,
        }
      }
    }

    const openai = getOpenAI()

    const requestHint = requestGuidance
      ? `\nReference style hints from successful examples:\n- vibe: ${requestGuidance.vibe}\n- scene cues: ${requestGuidance.scene}\n- lighting cues: ${requestGuidance.lighting}`
      : ''

    const userMessage = [
      `User request: "${userRequest || 'clean studio'}"`,
      `Available presets: ${input.availablePresets.join(', ')}`,
      requestHint.trim(),
      '',
      'Resolve this to a strict scene config.',
      'Describe the empty environment only.',
      'No people, no face, no pose.',
    ]
      .filter(Boolean)
      .join('\n')

    const response = await openai.chat.completions.create({
      model: PROMPT_INTEL_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.1,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    })

    const raw = response.choices[0]?.message?.content || ''
    const parsed = JSON.parse(raw) as SceneIntelOutput
    const resolvedPresetId = (parsed.preset || '').trim()
    const resolvedPresetPolicy = resolvedPresetId
      ? buildPresetPolicy(resolvedPresetId, getPresetById(resolvedPresetId)?.scene || '')
      : undefined

    // Enforce immutable policies (safety net)
    parsed.lightingMode = 'environment_coherent'
    parsed.posePolicy = 'inherit'
    parsed.facePolicy = 'immutable'
    parsed.cameraPolicy = 'inherit'
    if (resolvedPresetPolicy?.anchorZone) {
      parsed.anchorZone = mergeGuidance(
        resolvedPresetPolicy.anchorZone,
        parsed.anchorZone
      )
    }
    if (!parsed.realismGuidance) {
      parsed.realismGuidance =
        'Single coherent photograph: subject lit by and grounded in the same environment; shadows and highlights on the subject consistent with the scene; consistent perspective and depth; no pasted-on or cut-out look. Keep realistic background texture and camera grain consistency.'
    }
    if (resolvedPresetPolicy?.realismGuidance) {
      parsed.realismGuidance = mergeGuidance(
        resolvedPresetPolicy.realismGuidance,
        parsed.realismGuidance
      )
    }
    if (!parsed.lightingBlueprint) {
      parsed.lightingBlueprint =
        'Match scene lighting on subject: natural key and fill from visible environment sources, coherent shadow direction and softness, and consistent color temperature between subject and background.'
    }
    if (resolvedPresetPolicy?.lightingBlueprint) {
      parsed.lightingBlueprint = mergeGuidance(
        resolvedPresetPolicy.lightingBlueprint,
        parsed.lightingBlueprint
      )
    }
    if (!parsed.cameraGuidance) {
      parsed.cameraGuidance =
        'Keep camera angle compatible with the source image and preset. Preserve believable lens response and avoid synthetic blur or over-stylized depth effects.'
    }
    if (!parsed.poseGuidance) {
      parsed.poseGuidance =
        'Allow safe preset-compatible posture variation only when needed by the environment. Preserve recognizability, body proportions, and natural anatomy.'
    }
    if (!parsed.sceneGuidance) {
      parsed.sceneGuidance =
        'Keep the subject grounded in the environment with realistic material texture, contact cues, and coherent depth.'
    }
    const fallbackPresetAvoid = resolvedPresetPolicy?.presetAvoid ||
      (presetId ? buildPresetPolicy(presetId, presetDescription).presetAvoid : undefined)
    parsed.presetAvoid = [fallbackPresetAvoid, parsed.presetAvoid, ...(requestGuidance?.avoidTerms || [])]
      .filter(Boolean)
      .join('; ') || undefined

    console.log(`🎬 Scene Intel: preset=${parsed.preset} zone="${parsed.anchorZone.substring(0, 60)}..."`)

    return parsed
  } catch (error) {
    console.error('⚠️ Scene Intel Adapter failed, using fallback:', error)

    // Deterministic fallback — never fail the pipeline
    return {
      preset: 'studio_gradient',
      scenarioVariant: 'fallback',
      anchorZone: 'Clean gradient studio backdrop with soft even ambient lighting.',
      lightingMode: 'environment_coherent',
      posePolicy: 'inherit',
      facePolicy: 'immutable',
      cameraPolicy: 'inherit',
      realismGuidance:
        'Single coherent photograph: subject lit by and grounded in the same environment; shadows and highlights on the subject consistent with the scene; consistent perspective and depth; no pasted-on or cut-out look. Keep realistic background texture and camera grain consistency.',
      lightingBlueprint:
        'Match scene lighting on subject: natural key and fill from visible environment sources, coherent shadow direction and softness, and consistent color temperature between subject and background.',
      cameraGuidance:
        'Keep camera angle compatible with the source image and preset. Preserve believable lens response and avoid synthetic blur or over-stylized depth effects.',
      poseGuidance:
        'Allow safe preset-compatible posture variation only when needed by the environment. Preserve recognizability, body proportions, and natural anatomy.',
      sceneGuidance:
        'Keep the subject grounded in the environment with realistic material texture, contact cues, and coherent depth.',
      presetAvoid: 'No hard flash, no exaggerated color cast, no cut-out edges, no pasted subject appearance.',
      fallback: {
        preset: 'studio_gradient',
        reason: error instanceof Error ? error.message : 'Scene intel adapter error',
      },
    }
  }
}
