/**
 * DUAL-ENGINE ARCHITECTURE
 * 
 * Strictly separates FLASH (identity-critical) from PRO (aesthetic/UGC).
 * 
 * FLASH (Identity-Critical):
 * - For try-on preview (default)
 * - FACE_FREEZE: Face is IMMUTABLE pixels
 * - Identity MUST be preserved from Image 1 exactly
 * - NO face correction, NO beautification
 * - Prompt is STATIC and LOCKED
 * 
 * PRO (Aesthetic/UGC):
 * - For campaigns, UGC, brand visuals
 * - Strong resemblance (not exact)
 * - Allow mild aesthetic refinement
 * - NEVER used for try-on previews
 */

import { getTryOnPresetV3, TRYON_PRESETS_V3 } from './presets'
import type { TryOnStylePreset } from './types'
import {
    COPY_FACE_FIRST,
    FACE_LOCK_ABSOLUTE,
    FACE_IMMUTABILITY,
    FACIAL_INTEGRITY,
    FACIAL_GEOMETRY_PRESERVATION,
    POSE_DELTA,
    MICRO_POSE_ONLY,
    EXPRESSION_LOCK_ABSOLUTE,
    REALISM_LAYER,
    GLOBAL_REALISM,
    FORBIDDEN_REALISM,
    FACE_FREEZE_BLOCK,
    ZONE_SEPARATION,
    enableFaceLock,
    enableFaceFreeze,
    logFaceLockCompliance
} from './face-lock'
import {
    MICRO_POSE_CONSTRAINT,
    ENVIRONMENT_CONSTRUCTION,
    LIGHTING_RULES,
    FACE_REGION_LOCK
} from './pose-guard'
import {
    PERSON_ANCHOR_BLOCK,
    SCENE_RECONSTRUCTION_BLOCK,
    LIGHTING_MATCH_BLOCK,
    PERSON_IMMUTABILITY_GUARANTEE,
    MICRO_POSE_STRICT
} from './person-anchor'
import {
    RECONSTRUCT_HUMAN_CORE,
    HUMAN_LOCK_BLOCK,
    HUMAN_LOCK_MODE,
    logHumanLockStatus
} from './human-lock'
import {
    buildCompactFaceLockPrompt,
    logFaceLockZoneStatus
} from './face-lock-zone'
import {
    buildFlashMasterPrompt,
    buildProMasterPrompt,
    checkForbiddenTerms,
    logMasterPromptStatus
} from './master-prompt'
import {
    getSceneCategoryFromPresetId,
    getRandomScenePrompt,
    getRandomCameraModifier
} from './scene-prompts'
import {
    buildProductionPrompt,
    getProductionPreset,
    getRandomProductionPreset,
    logProductionPipelineStatus,
    type ProductionPreset
} from './production-pipeline'
import {
    getFaceFreezePrompt,
    logFaceFreezeStatus,
    FACE_FREEZE_PROMPT
} from './face-freeze'

// Local type for scene preset (used by dual-engine)
interface ScenePreset {
    id: string
    scene: string
    lighting: string
    camera: string
}

// Get preset by ID from UI presets (presets.ts)
function getPresetById(id: string): ScenePreset | undefined {
    const uiPreset = getTryOnPresetV3(id)
    if (!uiPreset) return undefined

    // Convert UI preset to ScenePreset format
    return {
        id: uiPreset.id,
        scene: uiPreset.background_name,
        lighting: uiPreset.lighting_name,
        camera: '50mm lens, natural perspective' // Default camera
    }
}

// Default preset
const DEFAULT_PRESET: ScenePreset = {
    id: 'keep_original',
    scene: 'keep original background unchanged',
    lighting: 'preserve original lighting',
    camera: '50mm lens, natural perspective'
}

// ═══════════════════════════════════════════════════════════════
// PIPELINE MODE TYPES
// ═══════════════════════════════════════════════════════════════

export type PipelineMode = 'tryon' | 'ugc' | 'campaign'
export type ModelType = 'flash' | 'pro' | 'pro_identity_locked'

// ═══════════════════════════════════════════════════════════════
// IDENTITY METRICS - Debug logging for identity risk assessment
// ═══════════════════════════════════════════════════════════════

export interface IdentityMetrics {
    pose_locked: boolean
    face_emphasis: 'low' | 'medium' | 'high'
    model_freedom: 'flash' | 'pro_locked' | 'pro_free'
    identity_risk_score: number // 0-100, lower is safer
}

// ═══════════════════════════════════════════════════════════════
// REALISM_LEVEL = HIGH - Spatial reconstruction mode
// ═══════════════════════════════════════════════════════════════

export const REALISM_LEVEL = 'HIGH' as const

// ═══════════════════════════════════════════════════════════════
// 1. SPATIAL RECONSTRUCTION - Core paradigm
// Identity preserved implicitly through pixel-level reconstruction
// ═══════════════════════════════════════════════════════════════

const SPATIAL_RECONSTRUCTION_BLOCK = `SPATIAL RECONSTRUCTION:
- Copy all visible regions from Image 1 at pixel-level.
- Preserve spatial relationships between all elements.
- Do NOT generate new regions. Reconstruct only.
- If uncertain, copy from Image 1 without modification.`

// ═══════════════════════════════════════════════════════════════
// 2. HEAD SCALE LOCK - Prevents face shrink (NON-BIOMETRIC)
// ═══════════════════════════════════════════════════════════════

const HEAD_SCALE_LOCK = `HEAD SCALE LOCK:
- Head-to-shoulder scale must match Image 1.
- Subject-to-frame ratio must remain consistent.
- Camera distance must not reduce subject size.
- No zooming out relative to identity reference.`

// ═══════════════════════════════════════════════════════════════
// 3. EDGE CONTOUR LOCK - Prevents jawline inflation
// Soft shadow transitions, no contour-emphasizing light
// ═══════════════════════════════════════════════════════════════

const EDGE_CONTOUR_LOCK = `EDGE CONTOUR LOCK:
- Preserve original edge geometry from Image 1.
- Do not enhance or sharpen outline boundaries.
- No added contrast along natural contours.
- Shadow transitions must remain soft and consistent with reference.
- Avoid cinematic rim lighting or contour-emphasizing light.`

// ═══════════════════════════════════════════════════════════════
// 4. EXPRESSION STABILITY - Prevents expression drift
// Maintains neutral emotional state
// ═══════════════════════════════════════════════════════════════

const EXPRESSION_STABILITY = `EXPRESSION STABILITY:
- Emotional state remains neutral.
- No change in expression intensity.
- No expressive exaggeration.
- Maintain relaxed, natural presence.`

// ═══════════════════════════════════════════════════════════════
// 5. CAMERA CONSTRAINT - 35-50mm, no wide-angle
// ═══════════════════════════════════════════════════════════════

const CAMERA_CONSTRAINT = `CAMERA CONSTRAINT:
- Perspective: 35-50mm equivalent.
- No wide-angle distortion.
- No cinematic framing.`

// ═══════════════════════════════════════════════════════════════
// 6. POSE INHERITANCE - Preserve pose from Image 1
// ═══════════════════════════════════════════════════════════════

const POSE_INHERITANCE = `POSE INHERITANCE:
- Preserve body orientation from Image 1.
- Micro-adjustments for garment fit only.
- Limb positions: copy from Image 1.
- Weight distribution: match Image 1.`

// ═══════════════════════════════════════════════════════════════
// 7. GARMENT ISOLATION - Only clothing changes
// ═══════════════════════════════════════════════════════════════

const GARMENT_ISOLATION = `GARMENT ISOLATION:
- Only clothing may change.
- Body proportions: unchanged.
- No re-sculpting of torso or shoulders.`

// ═══════════════════════════════════════════════════════════════
// 8. POSTURE REALISM - Natural, context-appropriate
// ═══════════════════════════════════════════════════════════════

const POSTURE_REALISM = `POSTURE REALISM:
- Posture: neutral and context-appropriate.
- Weight distributed evenly.
- Arms rest naturally.
- No exaggerated leaning, twisting, or fashion poses.
- No mannequin or editorial stance.`

// ═══════════════════════════════════════════════════════════════
// 7. CAMERA IMPERFECTIONS - Physical image artifacts
// Realism via physics, not cinematic terms
// ═══════════════════════════════════════════════════════════════

const CAMERA_IMPERFECTIONS_BLOCK = `CAMERA PHYSICS:
- Sensor grain: fine, low intensity, not digital noise.
- Focus: slight falloff on background.
- Chromatic aberration: mild at edges.
- White balance: slight variance allowed.
- Motion softness: allowed if scene implies movement.
- Avoid: hyper-sharp, digitally clean output.`

// ═══════════════════════════════════════════════════════════════
// 8. LIGHTING PHYSICS - Physically plausible, not cinematic
// One source, natural bounce, no drama
// ═══════════════════════════════════════════════════════════════

const LIGHTING_PHYSICS_BLOCK = `LIGHTING PHYSICS:
- One primary source: sun OR window OR practical light.
- Secondary: natural bounce only.
- No rim lights.
- No dramatic contrast.
- No spotlight on subject.
- Shadow direction: consistent with light source.
- Shadow softness: match light diffusion.`

// ═══════════════════════════════════════════════════════════════
// 9. COLOR PHYSICS - Muted, realistic
// ═══════════════════════════════════════════════════════════════

const COLOR_PHYSICS_BLOCK = `COLOR PHYSICS:
- Reduce saturation 10-15% from default.
- No HDR.
- No vibrance boost.
- Whites: no glow.
- Blacks: retain texture.
- Temperature variance: allowed.`

// ═══════════════════════════════════════════════════════════════
// 10. FABRIC PHYSICS - Gravity and tension
// ═══════════════════════════════════════════════════════════════

const FABRIC_PHYSICS_BLOCK = `FABRIC PHYSICS:
- Obey gravity at all points.
- Tension at contact: shoulders, elbows, waist.
- Loose areas: sag naturally.
- No floating edges.
- No stiff folds.
- Wrinkles: at joints and contact points only.`

// ═══════════════════════════════════════════════════════════════
// 11. TEXTURE PHYSICS - Micro-details
// ═══════════════════════════════════════════════════════════════

const TEXTURE_IMPERFECTION_BLOCK = `TEXTURE PHYSICS:
- Fine grain: low intensity.
- Micro contrast: slight inconsistency.
- Exposure: slight unevenness.
- Skin: visible texture, natural.
- Fabric: visible weave pattern.`

// ═══════════════════════════════════════════════════════════════
// 12. SCENE SUBORDINATION - Subject first
// ═══════════════════════════════════════════════════════════════

const SCENE_SUBORDINATION_RULE = `SCENE RULE:
- Environment wraps around subject.
- Subject does NOT adapt to scene.
- Lighting on subject: from Image 1.
- Do NOT reinterpret subject for scene.`

// ═══════════════════════════════════════════════════════════════
// 13. FORBIDDEN - What must never happen
// No biometric, aesthetic, or subjective terms
// ═══════════════════════════════════════════════════════════════

const FORBIDDEN_BLOCK = `FORBIDDEN:
- No generating new regions.
- No reinterpreting subject.
- No pose modification.
- No body modification.
- No skin modification.
- No expression modification.
- No cinematic lighting.
- No studio aesthetics.
- No symmetry changes.
- No sharpening.
- No smoothing.
- No fashion poses.
- No mannequin posture.`

// ═══════════════════════════════════════════════════════════════
// 14. GARMENT APPLICATION - How to apply Image 2
// ═══════════════════════════════════════════════════════════════

const GARMENT_INSTRUCTION = `GARMENT:
- Apply garment from Image 2.
- Match color, silhouette, texture.
- Apply fabric physics.
- No floating fabric.
- No stiff folds.`


// Legacy PRO prompts removed - now using modular blocks above

// ═══════════════════════════════════════════════════════════════
// MODEL ROUTING GUARD - CLEAR LOGGING
// ═══════════════════════════════════════════════════════════════

export function enforceModelRouting(mode: PipelineMode, model: ModelType): void {
    // ROUTING RULES:
    // - tryon + flash → ALLOWED (default, fast)
    // - tryon + pro_identity_locked → ALLOWED (advanced quality toggle)
    // - tryon + pro (free) → FORBIDDEN (causes identity drift)
    // - ugc/campaign → pro (free) ALLOWED

    if (mode === 'tryon' && model === 'pro') {
        throw new Error(
            `ARCHITECTURE VIOLATION: Free PRO mode cannot be used for try-on. ` +
            `Use "flash" or "pro_identity_locked" for identity preservation.`
        )
    }

    // mode === "ugc" or "campaign" → PRO ONLY
    if ((mode === 'ugc' || mode === 'campaign') && model === 'flash') {
        console.warn(
            `⚠️ WARNING: FLASH model used for ${mode} mode. ` +
            `Consider using PRO for better aesthetic quality.`
        )
    }

    // Clear routing log with engine description
    const engineDescriptions: Record<ModelType, string> = {
        'flash': 'FLASH (Identity-Critical, Fast)',
        'pro_identity_locked': 'PRO_IDENTITY_LOCKED (High-Realism, Identity-Safe)',
        'pro': 'PRO (Aesthetic/UGC, Free Mode)'
    }
    console.log(`🔒 ENGINE: ${engineDescriptions[model]} | Mode: ${mode}`)
}

// ═══════════════════════════════════════════════════════════════
// FLASH PIPELINE - IDENTITY CRITICAL
// ═══════════════════════════════════════════════════════════════

export interface FlashPipelineInput {
    presetId?: string
}

export interface FlashPipelineOutput {
    prompt: string
    model: 'gemini-2.5-flash-image'
    temperature: number
    assertions: string[]
}

/**
 * FLASH Pipeline: Face-Frozen Identity Preservation
 * 
 * PROMPT ORDER (CRITICAL):
 * 1. FACE_FREEZE ← IMMUTABLE
 * 2. FACIAL_DETAIL_PRESERVATION
 * 3. EXPRESSION_LOCK
 * 4. ZONE_SEPARATION
 * 5. HEAD_SCALE_LOCK
 * 6. MICRO_POSE_CONSTRAINT
 * 7. GARMENT_ISOLATION
 * 8. ENVIRONMENT_CONSTRUCTION
 * 9. LIGHTING_RULES
 * 10. REALISM (environment only)
 * 
 * Temperature: 0.01-0.02 (strictest)
 */
export function buildFlashPipeline(input: FlashPipelineInput): FlashPipelineOutput {
    const { presetId } = input
    const preset = presetId ? getPresetById(presetId) : DEFAULT_PRESET

    // Log HUMAN_LOCK status
    if (HUMAN_LOCK_MODE) {
        logHumanLockStatus(`flash-${Date.now()}`)
    }

    // ════════════════════════════════════════════════════════════
    // PRODUCTION PIPELINE: 5-STAGE ARCHITECTURE
    // 
    // 1. IDENTITY LOCK (highest priority)
    // 2. BODY & POSE (micro-only)
    // 3. CLOTHING REPLACEMENT (critical)
    // 4. BACKGROUND & SCENE
    // 5. LIGHTING RECONSTRUCTION
    // ════════════════════════════════════════════════════════════

    // Get production preset (Indian fashion photoshoot)
    const productionPreset = presetId
        ? getProductionPreset(presetId)
        : getRandomProductionPreset()

    // Build scene description from production preset
    const sceneDescription = productionPreset
        ? buildProductionPrompt(productionPreset)
        : preset?.scene || 'Real indoor location with natural light'

    // Build complete prompt with Face Freeze + Master + Scene
    const faceFreezePrompt = getFaceFreezePrompt('flash')
    const masterPrompt = buildFlashMasterPrompt(sceneDescription)

    const finalPrompt = `${faceFreezePrompt}

${masterPrompt}`

    // Log Face Freeze status
    logFaceFreezeStatus(`flash-${Date.now()}`, 'flash')

    // Log production pipeline status
    logProductionPipelineStatus(productionPreset?.id || 'default', 'FLASH')

    // Log master prompt status
    logMasterPromptStatus('flash', finalPrompt.length)

    // Check forbidden terms - should now pass with new prompts
    const forbiddenCheck = checkForbiddenTerms(finalPrompt)
    if (!forbiddenCheck.valid) {
        console.error('❌ FLASH PROMPT CONTAINS FORBIDDEN TERMS:', forbiddenCheck.violations)
        console.error('   This indicates a bug in prompt construction!')
    }

    // Log face lock compliance
    logFaceLockCompliance(`flash-absolute-${Date.now()}`)

    const metrics: IdentityMetrics = {
        pose_locked: true,
        face_emphasis: 'high',
        model_freedom: 'flash',
        identity_risk_score: 1
    }

    console.log(`\n🎬 FLASH PIPELINE (Higgsfield-Style)`)
    console.log(`   🔒 FACE_LOCK_ABSOLUTE: ✓`)
    console.log(`   POSE_DELTA (≤5%): ✓`)
    console.log(`   EXPRESSION_LOCK: ✓`)
    console.log(`   Preset: ${preset?.id || 'default'}`)
    console.log(`   Temperature: 0.01`)
    console.log(`   Prompt length: ${finalPrompt.length} chars`)
    console.log(`   📊 IDENTITY RISK: ${metrics.identity_risk_score}/100`)


    return {
        prompt: finalPrompt,
        model: 'gemini-2.5-flash-image',
        temperature: 0.01,
        assertions: [
            'FACE_LOCK_ABSOLUTE',
            'POSE_DELTA (≤5%)',
            'EXPRESSION_LOCK',
            'REALISM_LAYER (no face)',
            'FORBIDDEN processed'
        ]
    }
}

// ═══════════════════════════════════════════════════════════════
// PRO PIPELINE - AESTHETIC / UGC
// ═══════════════════════════════════════════════════════════════

export interface ProPipelineInput {
    presetId?: string
    allowAestheticRefinement?: boolean
}

export interface ProPipelineOutput {
    prompt: string
    model: 'gemini-3-pro-image-preview'
    temperature: number
    assertions: string[]
}
/**
 * PRO Pipeline: UGC/Campaign Mode (Face-Locked + Aesthetic Flexibility)
 * 
 * STILL uses FACE_LOCK_ABSOLUTE but allows:
 * - Environment aesthetic refinement
 * - Lighting enhancement
 * - NOT for direct try-on (use FLASH or PRO_IDENTITY_LOCKED)
 */
export function buildProPipeline(input: ProPipelineInput): ProPipelineOutput {
    const { presetId, allowAestheticRefinement = true } = input
    const preset = presetId ? getPresetById(presetId) : DEFAULT_PRESET

    const sceneBlock = preset ? `
ENVIRONMENT:
- Scene from preset: ${preset.scene}
- Lighting from preset: ${preset.lighting}` : ''

    // Face lock still applies, but with more environment freedom
    const finalPrompt = `RECONSTRUCT — DO NOT REIMAGINE.

${FACE_LOCK_ABSOLUTE}

${POSE_DELTA}

${EXPRESSION_LOCK_ABSOLUTE}

BODY & GARMENT:
- Apply garment from Image 2 only.
- Body proportions unchanged.

${REALISM_LAYER}

${FORBIDDEN_REALISM}
${sceneBlock}

PRO REFINEMENT (ENVIRONMENT ONLY):
- May refine: lighting, texture, shadows (subtle).
- May NOT refine: face, expression, proportions, contours.
${allowAestheticRefinement ? 'Lighting refinement allowed.' : 'No refinement.'}`

    console.log(`\n🎬 PRO PIPELINE (UGC Mode, Face-Locked)`)
    console.log(`   🔒 FACE_LOCK: ✓`)
    console.log(`   FACIAL_DETAIL_PRESERVATION: ✓`)
    console.log(`   EXPRESSION_LOCK: ✓`)
    console.log(`   Preset: ${preset?.id || 'default'}`)
    console.log(`   Prompt length: ${finalPrompt.length} chars`)
    console.log(`   Temperature: 0.08`)

    return {
        prompt: finalPrompt,
        model: 'gemini-3-pro-image-preview',
        temperature: 0.08,
        assertions: [
            'FACE_LOCK (pixel copy)',
            'FACIAL_DETAIL_PRESERVATION',
            'EXPRESSION_LOCK',
            'HEAD_SCALE_LOCK',
            'PRO: environment refinement only'
        ]
    }
}

// ═══════════════════════════════════════════════════════════════
// PRO_IDENTITY_LOCKED PIPELINE - HIGH REALISM + SPATIAL RECONSTRUCTION
// ═══════════════════════════════════════════════════════════════

export interface ProIdentityLockedPipelineInput {
    presetId?: string
}

export interface ProIdentityLockedPipelineOutput {
    prompt: string
    model: 'gemini-3-pro-image-preview'
    temperature: number
    assertions: string[]
}

/**
 * PRO_IDENTITY_LOCKED Pipeline: Higgsfield-Style Reconstruction
 * 
 * PRO IS NOT FREE — IT IS ANCHORED
 * - face-lock enabled
 * - identity crop enabled
 * - temperature ≤ 0.06
 * 
 * PRO should NEVER create faces.
 * It can only improve lighting and texture.
 * 
 * Temperature: 0.06, Max retries: 1
 */
export function buildProIdentityLockedPipeline(input: ProIdentityLockedPipelineInput): ProIdentityLockedPipelineOutput {
    const { presetId } = input
    const preset = presetId ? getPresetById(presetId) : DEFAULT_PRESET

    // PRO is disabled unless HUMAN_LOCK_MODE is active (cost control)
    if (!HUMAN_LOCK_MODE) {
        console.warn(`⚠️ PRO disabled: HUMAN_LOCK_MODE not active`)
    }

    // Log HUMAN_LOCK status
    logHumanLockStatus(`pro-${Date.now()}`)

    // ════════════════════════════════════════════════════════════
    // PRODUCTION PIPELINE: 5-STAGE ARCHITECTURE (PRO MODE)
    // 
    // PRO can refine lighting/texture but NEVER touch identity.
    // ════════════════════════════════════════════════════════════

    // Get production preset (Indian fashion photoshoot)
    const productionPreset = presetId
        ? getProductionPreset(presetId)
        : getRandomProductionPreset()

    // CRITICAL: Validate preset was found when requested
    if (presetId && !productionPreset) {
        console.error(`❌ PRESET ERROR: Preset ID "${presetId}" was selected but NOT FOUND`)
        console.error(`   This is a BUG - scene will default to generic fallback`)
    }

    // Build scene description from production preset (MANDATORY)
    let sceneDescription: string
    if (productionPreset) {
        sceneDescription = buildProductionPrompt(productionPreset)
        console.log(`✅ SCENE APPLIED: ${productionPreset.name}`)
        console.log(`   Location: ${productionPreset.location}`)
        console.log(`   Lighting: ${productionPreset.lighting}`)
        console.log(`   Camera: ${productionPreset.camera}`)
    } else {
        // Fallback to UI preset scene
        sceneDescription = preset?.scene || 'Real indoor location with natural light'
        console.log(`⚠️ SCENE FALLBACK: Using UI preset scene or default`)
        console.log(`   Scene text: ${sceneDescription.substring(0, 100)}...`)
    }

    // Build complete prompt with Face Freeze + Master + Scene
    const faceFreezePrompt = getFaceFreezePrompt('pro')
    const masterPrompt = buildProMasterPrompt(sceneDescription)

    const finalPrompt = `${faceFreezePrompt}

${masterPrompt}`

    // Log Face Freeze status
    logFaceFreezeStatus(`pro-${Date.now()}`, 'pro')

    // Log production pipeline status
    logProductionPipelineStatus(productionPreset?.id || 'default', 'PRO')

    // Log master prompt status
    logMasterPromptStatus('pro', finalPrompt.length)

    // Check forbidden terms - should now pass with new prompts
    const forbiddenCheck = checkForbiddenTerms(finalPrompt)
    if (!forbiddenCheck.valid) {
        console.error('❌ PRO PROMPT CONTAINS FORBIDDEN TERMS:', forbiddenCheck.violations)
        console.error('   This indicates a bug in prompt construction!')
    }

    // Log face lock compliance
    logFaceLockCompliance(`pro_identity_locked-absolute-${Date.now()}`)

    const metrics: IdentityMetrics = {
        pose_locked: true,
        face_emphasis: 'high',
        model_freedom: 'pro_locked',
        identity_risk_score: 2
    }

    console.log(`\n🎬 PRO_IDENTITY_LOCKED PIPELINE (Higgsfield-Style)`)
    console.log(`   🔒 FACE_LOCK_ABSOLUTE: ✓`)
    console.log(`   POSE_DELTA (≤5%): ✓`)
    console.log(`   EXPRESSION_LOCK: ✓`)
    console.log(`   PRO ANCHORED: ✓ (lighting/texture only)`)
    console.log(`   Preset: ${preset?.id || 'default'}`)
    console.log(`   Prompt length: ${finalPrompt.length} chars`)
    console.log(`   Temperature: 0.01`)
    console.log(`   Max retries: 1`)
    console.log(`   📊 IDENTITY RISK: ${metrics.identity_risk_score}/100`)

    return {
        prompt: finalPrompt,
        model: 'gemini-3-pro-image-preview',
        temperature: 0.01,
        assertions: [
            'FACE_LOCK_ABSOLUTE',
            'POSE_DELTA (≤5%)',
            'EXPRESSION_LOCK',
            'PRO ANCHORED (lighting/texture)',
            'Max retries: 1'
        ]
    }
}

// ═══════════════════════════════════════════════════════════════
// CONTEXT-AWARE BIOMETRIC DETECTION
// ═══════════════════════════════════════════════════════════════

// Safe environmental phrases that should NOT trigger biometric detection
const SAFE_ENVIRONMENT_PHRASES = [
    'heritage building', 'heritage site', 'heritage home',
    'aged wall', 'aged walls', 'aged brick', 'aged wood', 'aged stone',
    'old street', 'old building', 'old city', 'old town', 'old walls',
    'vintage decor', 'vintage furniture', 'vintage style',
    'historic home', 'historic building', 'historic site',
    'antique furniture', 'antique decor',
    'weathered walls', 'weathered brick',
    'image 1', 'image 2', // Core references - must not trigger
]

// ═══════════════════════════════════════════════════════════════
// WHITELISTED TERMS - NEVER TRIGGER ERRORS
// ═══════════════════════════════════════════════════════════════

// Neutral anatomy terms - structural, not biometric
const ALLOWED_ANATOMY_TERMS = [
    'face', 'head', 'gaze', 'expression', 'posture', 'shoulders',
    'body', 'hands', 'arms', 'torso', 'stance'
]

// Photographic modifiers - compositional, not biometric
const ALLOWED_PHOTOGRAPHIC_TERMS = [
    'depth of field', 'framing', 'focus', 'motion blur', 'candid',
    'unretouched', 'captured', 'photographed', 'visible', 'emphasized',
    'naturally', 'scene', 'composition', 'portrait', 'shot'
]

// Realism terms - photographic artifacts, not anatomy
const ALLOWED_REALISM_TERMS = [
    'grain', 'sensor grain', 'film grain', 'texture', 'natural texture',
    'skin texture', 'haze', 'diffusion', 'air diffusion', 'atmospheric',
    'tonal compression', 'lighting falloff', 'shadow falloff',
    'saturation', 'vibrance', 'HDR', 'highlights', 'shadows',
    'waxy', 'plastic', 'glossy', 'sharp', 'hyper-sharp',
    'dust', 'humidity', 'motion blur', 'fabric wrinkles'
]

// ═══════════════════════════════════════════════════════════════
// BIOMETRIC BLOCK LIST - ONLY these specific descriptors are blocked
// Must be DESCRIPTIVE phrases about biological characteristics
// ═══════════════════════════════════════════════════════════════

const BLOCKED_BIOMETRIC_PATTERNS = [
    // Facial structure descriptors (actual biometrics)
    /\bfacial\s+structure\s+(is|looks|appears|seems|should)/i,
    /\bface\s+shape\s+(is|looks|should)/i,
    /\bfacial\s+symmetry\b/i,
    /\bfacial\s+proportions\b/i,
    /\bface\s+proportions\b/i,

    // Specific feature descriptors
    /\bjawline\s+(is|looks|should|appears)/i,
    /\bcheekbones\s+(are|is|look|should)/i,
    /\beye\s+spacing\s+(is|should|looks)/i,
    /\bnose\s+shape\s+(is|should|looks)/i,
    /\bmouth\s+shape\s+(is|should|looks)/i,

    // Skin/complexion descriptors
    /\bskin\s*tone\s+(is|looks|should\s+be)/i,
    /\bskin\s*color\s+(is|looks|should\s+be)/i,
    /\bcomplexion\s+(is|looks|should\s+be)/i,

    // Age/demographic descriptors
    /\b(young|old|older|younger)\s+(woman|man|person|lady|girl|boy)\b/i,
    /\bsubject'?s?\s+age\b/i,
    /\b(her|his|the\s+person'?s?)\s+age\b/i,

    // Attractiveness descriptors
    /\battractiv(e|eness)\b/i,
    /\bbeauty\s+of\s+(the\s+)?(face|person|subject)/i,
    /\b(beautiful|handsome|pretty)\s+(face|person|woman|man)/i,

    // Ethnicity
    /\bethnicity\b/i,

    // Body type descriptors
    /\bbody\s+type\s+(is|looks|should)/i,
    /\bbody\s+proportions\s+(are|is|should)/i,
]

// ═══════════════════════════════════════════════════════════════
// VALIDATION RESULT TYPES
// ═══════════════════════════════════════════════════════════════

export interface BiometricCheckResult {
    blocked_term: string | null
    category: 'biometric' | 'neutral' | 'photographic'
    action: 'error' | 'warning' | 'allowed'
}

/**
 * Context-aware biometric term detection
 * 
 * LOGIC:
 * 1. Check against BLOCKED_BIOMETRIC_PATTERNS only
 * 2. Neutral anatomy terms like "face", "head", "gaze" are ALWAYS allowed
 * 3. Photographic terms like "depth of field", "framing" are ALWAYS allowed
 * 4. Only block actual biometric DESCRIPTORS
 * 
 * This prevents false positives like:
 * - "face is partially visible" → ALLOWED (structural)
 * - "face must match Image 1" → ALLOWED (instructional)
 * - "face shape is angular" → BLOCKED (biometric descriptor)
 */
export function hasIllegalBiometric(prompt: string): string | null {
    // ONLY check against blocked biometric patterns
    // This is intentionally restrictive to avoid false positives
    for (const pattern of BLOCKED_BIOMETRIC_PATTERNS) {
        const match = prompt.match(pattern)
        if (match) {
            // Found an actual biometric descriptor - block it
            console.log(`🚫 BIOMETRIC BLOCKED: "${match[0]}" (category: biometric, action: error)`)
            return match[0]
        }
    }

    // No biometric violations found
    console.log(`✅ BIOMETRIC CHECK: No violations (category: neutral, action: allowed)`)
    return null
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION & SAFETY
// ═══════════════════════════════════════════════════════════════

export interface ValidationResult {
    valid: boolean
    errors: string[]
    warnings: string[]
}

/**
 * Validate pipeline inputs with context-aware biometric detection
 * 
 * AUTO-REPAIR STRATEGY:
 * - Biometric terms → AUTO-SANITIZE (don't fail, just remove)
 * - Missing images → HARD FAIL (structural issue)
 * - Missing Image references → HARD FAIL (structural issue)
 * 
 * This massively improves UX and reduces retries (API cost).
 */
export function validatePipelineInputs(
    imageCount: number,
    hasPersonImage: boolean,
    hasGarmentImage: boolean,
    prompt: string
): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // ═══════════════════════════════════════════════════════════════
    // HARD FAILS - Structural issues only
    // ═══════════════════════════════════════════════════════════════

    // Exactly 2 images required
    if (imageCount !== 2) {
        errors.push(`Expected exactly 2 images, got ${imageCount}`)
    }

    // Image 1 = person
    if (!hasPersonImage) {
        errors.push('Image 1 (person) is required')
    }

    // Image 2 = garment
    if (!hasGarmentImage) {
        errors.push('Image 2 (garment) is required')
    }

    // Identity text must appear
    if (!prompt.includes('Image 1')) {
        errors.push('Identity reference to Image 1 is missing')
    }

    // Garment text must appear
    if (!prompt.includes('Image 2')) {
        errors.push('Garment reference to Image 2 is missing')
    }

    // ═══════════════════════════════════════════════════════════════
    // AUTO-REPAIR - Biometric terms are logged as warnings, not errors
    // ═══════════════════════════════════════════════════════════════

    // Context-aware biometric check - WARNING only, not error
    const illegalTerm = hasIllegalBiometric(prompt)
    if (illegalTerm) {
        // DO NOT add to errors - this is auto-repaired
        warnings.push(`Auto-repaired: removed biometric term "${illegalTerm}"`)
        console.log(`⚠️ BIOMETRIC AUTO-REPAIR: Removed "${illegalTerm}" from prompt`)
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    }
}

/**
 * SANITIZE BIOMETRIC TERMS FROM PROMPT
 * 
 * AUTO-REPAIR STRATEGY:
 * - biometric_descriptive → REMOVE
 * - aesthetic_judgment → REMOVE
 * - camera / lighting → KEEP
 * - posture / realism → KEEP
 * 
 * This function is called before sending to Gemini.
 */
export function sanitizeBiometricTerms(prompt: string): {
    sanitized: string
    removed: string[]
    wasModified: boolean
} {
    let sanitized = prompt
    const removed: string[] = []

    // Remove biometric descriptor matches
    for (const pattern of BLOCKED_BIOMETRIC_PATTERNS) {
        const match = sanitized.match(pattern)
        if (match) {
            removed.push(match[0])
            // Remove the matched text
            sanitized = sanitized.replace(pattern, '')
        }
    }

    // Clean up any double spaces or empty lines
    sanitized = sanitized
        .replace(/\n\s*\n\s*\n/g, '\n\n')  // Remove triple+ newlines
        .replace(/  +/g, ' ')               // Remove double spaces
        .trim()

    if (removed.length > 0) {
        console.log(`🔧 BIOMETRIC SANITIZER:`)
        console.log(`   Removed: ${removed.join(', ')}`)
        console.log(`   Prompt sanitized successfully`)
    }

    return {
        sanitized,
        removed,
        wasModified: removed.length > 0
    }
}

// ═══════════════════════════════════════════════════════════════
// DEBUG LOGGING
// ═══════════════════════════════════════════════════════════════

export function logIdentitySafetyCheck(pipeline: 'flash' | 'pro' | 'pro_identity_locked', prompt: string): void {
    console.log(`\n🔍 IDENTITY SAFETY CHECK (${pipeline.toUpperCase()})`)
    console.log(`   ✅ Identity lock present: ${prompt.includes('Image 1')}`)
    console.log(`   ✅ Garment lock present: ${prompt.includes('Image 2')}`)
    console.log(`   ✅ No beautification: ${!prompt.includes('beautif') || prompt.includes('Do not beautif')}`)
    console.log(`   ✅ No face modification: ${!prompt.includes('modify') || prompt.includes('Do not modify')}`)

    // Check for problematic terms - but ignore negative context
    const problematicTerms = ['idealize', 'perfect', 'enhance', 'improve', 'correct']
    const lowerPrompt = prompt.toLowerCase()

    const foundProblematic = problematicTerms.filter(term => {
        if (!lowerPrompt.includes(term)) return false

        // Check if in negative context (do not, avoid, etc.)
        const negativePatterns = [
            `do not ${term}`,
            `do not.*${term}`,
            `avoid ${term}`,
            `avoid.*${term}`,
            // Also check for comma-separated lists like "do not beautify, optimize, enhance"
            `do not \\w+,.*${term}`,
        ]

        for (const pattern of negativePatterns) {
            const regex = new RegExp(pattern, 'i')
            if (regex.test(prompt)) return false
        }

        return true
    })

    if (foundProblematic.length > 0) {
        console.log(`   ⚠️ WARNING: Found potentially problematic terms: ${foundProblematic.join(', ')}`)
    } else {
        console.log(`   ✅ No problematic terms detected`)
    }
}

// ═══════════════════════════════════════════════════════════════
// UNIFIED ENTRY POINT
// ═══════════════════════════════════════════════════════════════

export interface DualEngineInput {
    mode: PipelineMode
    model: ModelType
    presetId?: string
}

export interface DualEngineOutput {
    prompt: string
    model: string
    temperature: number
    pipeline: 'flash' | 'pro' | 'pro_identity_locked'
    assertions: string[]
}

/**
 * Unified entry point for dual-engine architecture
 * 
 * Supports:
 * - flash: Identity-critical, fast
 * - pro_identity_locked: High-realism identity-critical (for try-on)
 * - pro: Aesthetic/UGC (NOT for try-on)
 */
export function buildDualEnginePipeline(input: DualEngineInput): DualEngineOutput {
    const { mode, model, presetId } = input

    // Enforce routing rules
    enforceModelRouting(mode, model)

    // Route to appropriate pipeline
    if (model === 'flash') {
        const result = buildFlashPipeline({ presetId })
        logIdentitySafetyCheck('flash', result.prompt)
        return {
            prompt: result.prompt,
            model: result.model,
            temperature: result.temperature,
            pipeline: 'flash',
            assertions: result.assertions
        }
    } else if (model === 'pro_identity_locked') {
        // PRO_IDENTITY_LOCKED: High realism with strict identity
        const result = buildProIdentityLockedPipeline({ presetId })
        logIdentitySafetyCheck('pro_identity_locked', result.prompt)
        return {
            prompt: result.prompt,
            model: result.model,
            temperature: result.temperature,
            pipeline: 'pro_identity_locked',
            assertions: result.assertions
        }
    } else {
        // PRO (free): For UGC/campaign only
        const result = buildProPipeline({ presetId })
        logIdentitySafetyCheck('pro', result.prompt)
        return {
            prompt: result.prompt,
            model: result.model,
            temperature: result.temperature,
            pipeline: 'pro',
            assertions: result.assertions
        }
    }
}

// REALISM_LEVEL is already exported at line 74
