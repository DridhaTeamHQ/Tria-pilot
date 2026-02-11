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
 * - posePolicy is ALWAYS "inherit" (inherit from Image 1).
 */

import 'server-only'
import { getOpenAI } from '@/lib/openai'
import { getPresetById } from './presets/index'

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
  /** Pose policy – ALWAYS "inherit" (from Image 1) */
  posePolicy: 'inherit'
  /** Face policy – ALWAYS "immutable" */
  facePolicy: 'immutable'
  /** Camera policy – ALWAYS "inherit" */
  cameraPolicy: 'inherit'
  /** Additional realism guidance for camera/lighting/depth (environment only) */
  realismGuidance?: string
  /** Explicit lighting blueprint for subject-scene harmonization */
  lightingBlueprint?: string
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

const SYSTEM_PROMPT = `You are a strict Scene Intelligence Engine for a virtual try-on system.

Your job: Given a user request (or preset name), output a JSON object describing the EMPTY ENVIRONMENT only.

ABSOLUTE RULES:
1. NEVER describe a person, face, body, pose, expression, or gaze.
2. NEVER use words: "portrait", "model", "fashion", "cinematic", "editorial", "stunning", "beautiful", "elegant".
3. Presets describe EMPTY locations — no people in them.
4. Lighting policy is "environment_coherent": describe physically plausible scene lighting that can harmonize subject + background as one photo.
5. posePolicy is ALWAYS "inherit" — the person's pose comes from Image 1, not from you.
6. facePolicy is ALWAYS "immutable" — the face is never altered.
7. cameraPolicy is ALWAYS "inherit" — camera angle comes from Image 1.
8. If you cannot resolve the user request to a safe environment, use fallback: { preset: "studio_gradient", reason: "<why>" }.

OUTPUT FORMAT (JSON only, no markdown, no explanation):
{
  "preset": "<preset_id>",
  "scenarioVariant": "<brief variant name>",
  "anchorZone": "<1-2 sentence description of the EMPTY environment>",
  "lightingMode": "environment_coherent",
  "posePolicy": "inherit",
  "facePolicy": "immutable",
  "cameraPolicy": "inherit"
}

Or with fallback:
{
  "preset": "studio_gradient",
  "scenarioVariant": "fallback",
  "anchorZone": "Clean gradient studio backdrop with soft even lighting",
  "lightingMode": "environment_coherent",
  "posePolicy": "inherit",
  "facePolicy": "immutable",
  "cameraPolicy": "inherit",
  "fallback": { "preset": "studio_gradient", "reason": "<reason>" }
}`

const VISION_REALISM_SYSTEM_PROMPT = `You are a realism cinematography planner for virtual try-on.
You must output JSON only:
{
  "anchorZone": "<empty environment description>",
  "realismGuidance": "<single sentence with camera realism + physically plausible lighting/depth>",
  "lightingBlueprint": "<single sentence with practical lighting blueprint: key/fill/rim direction, color temperature tendency, shadow softness>",
  "scenarioVariant": "<short variant name>"
}

Rules:
- Never describe person identity.
- No face/eye/gaze instructions.
- Keep camera realism practical (e.g. handheld smartphone or natural camera capture).
- Lighting must be physically plausible and the SAME for subject and background: subject must appear lit by the scene (e.g. same sky, same ambient or key lights), not as a cut-out.
- realismGuidance must explicitly state that the subject is grounded in the environment with coherent lighting and shadows (no pasted-on look).
- Include harmonization cues: ambient color spill, contact shadows, and subtle light wrap at subject edges.
- Mention depth layering (foreground/midground/background) briefly.
- Keep perspective and focal plane consistent with the uploaded person image.
- Avoid exaggerated blur, fake HDR glow, and over-processed backgrounds.
- Keep wording concise and production-safe.`

function toDataUrl(base64: string): string {
  if (base64.startsWith('data:image/')) return base64
  return `data:image/jpeg;base64,${base64}`
}

function buildPresetPolicy(presetId?: string, presetDescription?: string): PresetPolicy {
  const preset = presetId ? getPresetById(presetId) : undefined
  const anchorZone = (preset?.scene || presetDescription || 'Clean gradient studio backdrop with soft even ambient lighting.').trim()
  const baseLighting =
    (preset?.lighting ||
      'ambient practical lighting with coherent shadow direction and natural falloff').trim()
  const camera = (preset?.camera || 'natural perspective, realistic depth').trim()
  const presetAvoid = preset?.negative_bias?.trim() || undefined

  const realismGuidance = [
    'Single coherent photograph: subject lit by and grounded in the same environment.',
    `Use preset lighting logic: ${baseLighting}.`,
    'Apply environmental harmonization: ambient color spill and subtle edge light wrap on the subject.',
    `Keep perspective and depth consistent with preset camera intent: ${camera}.`,
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
    'keep subject and background in the same color-temperature space,',
    'add subtle ambient color spill and edge light wrap from the environment,',
    'preserve realistic falloff and contact shadows at feet/body edges.',
  ].join(' ')

  return {
    anchorZone,
    realismGuidance,
    lightingBlueprint,
    presetAvoid,
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
}): Promise<{ anchorZone: string; realismGuidance: string; lightingBlueprint: string; scenarioVariant: string }> {
  const openai = getOpenAI()

  const userText = `Selected environment preset: ${params.presetDescription}
Optional user request: ${params.userRequest || 'none'}

Refine the environment for photorealism. The person must appear lit by and grounded in this same environment (coherent lighting and shadows, no pasted-on look). Describe only environment and camera realism; do not describe the person.`

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
          presetAvoid: presetPolicy.presetAvoid,
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
          realismGuidance: presetPolicy.realismGuidance,
          lightingBlueprint: presetPolicy.lightingBlueprint,
          presetAvoid: presetPolicy.presetAvoid,
        }
      }
    }

    const openai = getOpenAI()

    const userMessage = `User request: "${userRequest || 'clean studio'}"
Available presets: ${input.availablePresets.join(', ')}

Resolve this to a strict scene config. Remember: describe the EMPTY environment only. No people. No face. No pose.`

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

    // Enforce immutable policies (safety net)
    parsed.lightingMode = 'environment_coherent'
    parsed.posePolicy = 'inherit'
    parsed.facePolicy = 'immutable'
    parsed.cameraPolicy = 'inherit'
    if (!parsed.realismGuidance) {
      parsed.realismGuidance =
        'Single coherent photograph: subject lit by and grounded in the same environment; shadows and highlights on the subject consistent with the scene; consistent perspective and depth; no pasted-on or cut-out look.'
    }
    if (!parsed.lightingBlueprint) {
      parsed.lightingBlueprint =
        'Match scene lighting on subject: natural key and fill from visible environment sources, coherent shadow direction and softness, and consistent color temperature between subject and background.'
    }
    if (!parsed.presetAvoid && presetId) {
      parsed.presetAvoid = buildPresetPolicy(presetId, presetDescription).presetAvoid
    }

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
        'Single coherent photograph: subject lit by and grounded in the same environment; shadows and highlights on the subject consistent with the scene; consistent perspective and depth; no pasted-on or cut-out look.',
      lightingBlueprint:
        'Match scene lighting on subject: natural key and fill from visible environment sources, coherent shadow direction and softness, and consistent color temperature between subject and background.',
      presetAvoid: 'No hard flash, no exaggerated color cast, no cut-out edges, no pasted subject appearance.',
      fallback: {
        preset: 'studio_gradient',
        reason: error instanceof Error ? error.message : 'Scene intel adapter error',
      },
    }
  }
}
