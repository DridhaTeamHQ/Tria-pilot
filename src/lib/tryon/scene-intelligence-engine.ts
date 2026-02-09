/**
 * SCENE INTELLIGENCE ENGINE
 *
 * Calls GPT-4o mini to analyze input metadata and return a STRICT JSON object.
 * This layer resolves preset-pose conflicts BEFORE prompt assembly.
 *
 * DO NOT TOUCH: This is an identity-critical decision layer.
 */

import 'server-only'
import { getOpenAI } from '@/lib/openai'
import { type PresetAuthority, getPresetAuthority, computeRewritePermissions } from './anchor-zone-resolver'

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT / OUTPUT INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SceneIntelligenceInput {
    selectedPreset: string
    inputPose: 'standing' | 'sitting' | 'leaning'
    inputFraming: 'close' | 'mid' | 'full'
    garmentType: string
    environmentRiskFlags?: string[]
}

export interface SceneIntelligenceOutput {
    preset: string
    scenarioVariant: string
    anchorZone: string
    cameraPolicy: {
        mode: 'inherit'
        allowAdjustment: boolean
    }
    lightingPolicy: {
        facePriority: true
        environmentAdapt: boolean
    }
    eyeSafety: 'strict'
    posePolicy: 'locked'
    fallback: {
        used: boolean
        preset: string | null
        reason: string | null
    }
    userRecommendation: string | null
    // NEW: Preset Authority System fields
    presetAuthority: PresetAuthority
    allowBackgroundRewrite: boolean
    allowLightingRewrite: boolean
    backgroundStrength: 'none' | 'soft' | 'full'
}

// ═══════════════════════════════════════════════════════════════════════════════
// GPT-4o MINI SYSTEM PROMPT (Identity-Critical)
// ═══════════════════════════════════════════════════════════════════════════════

const SCENE_INTELLIGENCE_SYSTEM_PROMPT = `You are a Scene Intelligence Engine for an AI Try-On system.

Your ONLY job is to analyze inputs and output a STRICT JSON object.
You must NOT write natural language explanations.
You must NOT write image prompts.
You must NOT describe people, faces, poses, expressions, or clothing.

You operate under these ABSOLUTE RULES:

1. Identity, face, eyes, and expression are LOCKED and must never be modified.
2. Pose and camera framing come ONLY from the input image.
3. Presets describe EMPTY ENVIRONMENTS ONLY.
4. You NEVER describe a person, pose, gaze, or facial feature.
5. You NEVER use words like: portrait, cinematic, fashion, model, candid, dramatic.
6. You ONLY choose from provided presets, scenario variants, and anchor zones.
7. If a preset conflicts with the input pose, you must auto-resolve.
8. If no valid resolution exists, you must fallback to a studio preset and recommend a change.

INPUTS YOU RECEIVE:
- selected_preset
- input_pose (standing / sitting / leaning)
- input_framing (close / mid / full)
- garment_type
- environment_risk_flags

YOUR OUTPUT MUST MATCH THIS SCHEMA EXACTLY:

{
  "preset": string,
  "scenario_variant": string,
  "anchor_zone": string,
  "camera_policy": {
    "mode": "inherit",
    "allow_adjustment": boolean
  },
  "lighting_policy": {
    "face_priority": true,
    "environment_adapt": true
  },
  "eye_safety": "strict",
  "pose_policy": "locked",
  "fallback": {
    "used": boolean,
    "preset": string | null,
    "reason": string | null
  },
  "user_recommendation": string | null
}

DECISION LOGIC YOU MUST FOLLOW:

- Always keep face_priority = true
- Always keep eye_safety = strict
- Never invent new poses or camera angles
- If input_pose = sitting AND preset = street:
    → choose anchor_zone = footpath_bench OR sidewalk_edge
- If no anchor_zone is compatible:
    → fallback.used = true
    → fallback.preset = "studio_gradient"
    → user_recommendation = suggest a compatible preset
- Keep outputs concise and deterministic`

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT OUTPUT (Used on GPT failure)
// ═══════════════════════════════════════════════════════════════════════════════

function getDefaultSceneIntelligenceOutput(input: SceneIntelligenceInput): SceneIntelligenceOutput {
    // Default to lighting_only (safest)
    const authority = getPresetAuthority('studio_gradient')
    const permissions = computeRewritePermissions(authority)

    return {
        preset: 'studio_gradient',
        scenarioVariant: 'neutral_backdrop',
        anchorZone: input.inputPose === 'sitting' ? 'center_sit' : 'center_stand',
        cameraPolicy: { mode: 'inherit', allowAdjustment: false },
        lightingPolicy: { facePriority: true, environmentAdapt: false },
        eyeSafety: 'strict',
        posePolicy: 'locked',
        fallback: {
            used: true,
            preset: 'studio_gradient',
            reason: 'GPT-4o mini call failed or returned invalid JSON',
        },
        userRecommendation: 'Using studio backdrop for safety. Consider selecting a different preset.',
        // NEW: Preset Authority fields (safe defaults)
        presetAuthority: authority,
        allowBackgroundRewrite: permissions.allowBackgroundRewrite,
        allowLightingRewrite: permissions.allowLightingRewrite,
        backgroundStrength: permissions.backgroundStrength,
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function runSceneIntelligence(
    input: SceneIntelligenceInput
): Promise<SceneIntelligenceOutput> {
    const openai = getOpenAI()

    console.log('SCENE INTELLIGENCE: STARTED')
    console.log('SCENE INTELLIGENCE INPUT:', JSON.stringify(input, null, 2))

    const userPayload = {
        selected_preset: input.selectedPreset,
        input_pose: input.inputPose,
        input_framing: input.inputFraming,
        garment_type: input.garmentType,
        environment_risk_flags: input.environmentRiskFlags || [],
    }

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: SCENE_INTELLIGENCE_SYSTEM_PROMPT },
                { role: 'user', content: JSON.stringify(userPayload) },
            ],
            response_format: { type: 'json_object' },
            max_tokens: 300,
            temperature: 0, // Deterministic
        })

        const content = response.choices[0]?.message?.content
        if (!content) {
            console.warn('SCENE INTELLIGENCE: No content returned, using fallback')
            return getDefaultSceneIntelligenceOutput(input)
        }

        const parsed = JSON.parse(content)

        // Normalize snake_case from GPT to camelCase
        const output: SceneIntelligenceOutput = {
            preset: parsed.preset || input.selectedPreset,
            scenarioVariant: parsed.scenario_variant || 'default',
            anchorZone: parsed.anchor_zone || 'center_stand',
            cameraPolicy: {
                mode: 'inherit',
                allowAdjustment: parsed.camera_policy?.allow_adjustment ?? false,
            },
            // LOCKED: Face priority is ALWAYS true
            lightingPolicy: {
                facePriority: true,
                environmentAdapt: parsed.lighting_policy?.environment_adapt ?? true,
            },
            // LOCKED: Eye safety is ALWAYS strict
            eyeSafety: 'strict',
            // LOCKED: Pose is ALWAYS locked
            posePolicy: 'locked',
            fallback: {
                used: parsed.fallback?.used ?? false,
                preset: parsed.fallback?.preset ?? null,
                reason: parsed.fallback?.reason ?? null,
            },
            userRecommendation: parsed.user_recommendation ?? null,
            // NEW: Compute Preset Authority from resolved preset
            presetAuthority: (() => {
                const finalPreset = parsed.fallback?.used ? (parsed.fallback?.preset || 'studio_gradient') : (parsed.preset || input.selectedPreset)
                return getPresetAuthority(finalPreset)
            })(),
            allowBackgroundRewrite: (() => {
                const finalPreset = parsed.fallback?.used ? (parsed.fallback?.preset || 'studio_gradient') : (parsed.preset || input.selectedPreset)
                return computeRewritePermissions(getPresetAuthority(finalPreset)).allowBackgroundRewrite
            })(),
            allowLightingRewrite: (() => {
                const finalPreset = parsed.fallback?.used ? (parsed.fallback?.preset || 'studio_gradient') : (parsed.preset || input.selectedPreset)
                return computeRewritePermissions(getPresetAuthority(finalPreset)).allowLightingRewrite
            })(),
            backgroundStrength: (() => {
                const finalPreset = parsed.fallback?.used ? (parsed.fallback?.preset || 'studio_gradient') : (parsed.preset || input.selectedPreset)
                return computeRewritePermissions(getPresetAuthority(finalPreset)).backgroundStrength
            })(),
        }

        console.log('SCENE INTELLIGENCE OUTPUT:', JSON.stringify(output, null, 2))
        return output
    } catch (error) {
        console.error('SCENE INTELLIGENCE: Error calling GPT-4o mini', error)
        return getDefaultSceneIntelligenceOutput(input)
    }
}
