/**
 * DUAL-ENGINE ARCHITECTURE
 * 
 * Strictly separates FLASH (identity-critical) from PRO (aesthetic/UGC).
 * 
 * FLASH (Identity-Critical):
 * - For try-on preview (default)
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
// NEGATIVE IDENTITY DRIFT BLOCK - Explicit anti-drift instructions
// Lists common causes of face drift and explicitly forbids them
// ═══════════════════════════════════════════════════════════════

const NEGATIVE_IDENTITY_DRIFT_BLOCK = `AVOID these common causes of identity drift:
- Do NOT generate a different person who merely resembles Image 1
- Do NOT invent facial features not present in Image 1
- Do NOT adjust face to match lighting or scene aesthetic
- Do NOT smooth, blur, or soften facial details
- Do NOT add makeup, filters, or skin enhancement
- Do NOT change eye color, eyebrow shape, or lip shape
- Do NOT alter distance between eyes, nose width, or face width
- Do NOT make the face more symmetrical or "balanced"
- Do NOT reinterpret the face for "better composition"`

// ═══════════════════════════════════════════════════════════════
// FACE PRESERVATION RULES - Pixel-level face rendering guidance
// ═══════════════════════════════════════════════════════════════

const FACE_PRESERVATION_RULES = `Face Rendering Rules:
- Reproduce every visible facial detail from Image 1
- Match skin texture, pores, and minor imperfections exactly
- Preserve moles, marks, scars, and asymmetries as they appear
- Eyes must have the same shape, spacing, and iris pattern
- Nose and mouth proportions must be identical to Image 1
- Facial hair (if any) must match Image 1 exactly`

// ═══════════════════════════════════════════════════════════════
// A. POSE ANCHOR BLOCK - Locks body/head orientation to Image 1
// Critical: Reduces latent resampling of facial geometry
// ═══════════════════════════════════════════════════════════════

const POSE_ANCHOR_BLOCK = `Pose Source: Image 1 (strict lock).
Body orientation, head angle, and shoulder alignment must be copied from Image 1.
Do not invent or significantly alter pose.
Allow only micro-variation: ±3-5° head turn, ±3% body shift.
The subject's spatial relationship to camera must match Image 1 exactly.
Camera angle relative to subject's face: preserve from Image 1.`

// ═══════════════════════════════════════════════════════════════
// B. FACE DE-EMPHASIS BLOCK - Photographic realism, not face control
// Key insight: Reducing face dominance stabilizes identity
// ═══════════════════════════════════════════════════════════════

const FACE_DEEMPHASIS_BLOCK = `The face should appear naturally captured as part of the scene,
not emphasized, isolated, or visually optimized.
Use off-camera or near-off-camera gaze direction.
Apply natural depth-of-field where the face is not hyper-sharp.
Include mild environmental context in the frame.
The subject is photographed candidly, not posing for a portrait.
Do not center-crop or zoom onto the face.`

// ═══════════════════════════════════════════════════════════════
// FLASH PROMPT - Maximum identity preservation
// ═══════════════════════════════════════════════════════════════

const FLASH_PROMPT_LOCKED = `CRITICAL: Use Image 1 as the ONLY source of identity.
The output MUST show the exact same person from Image 1.
This is NOT a "similar looking" person - it is THE SAME PERSON.

Do not beautify, optimize, enhance, or reinterpret the face.
Preserve the face EXACTLY as photographed in Image 1.
Every facial feature must match Image 1 at pixel-level accuracy.

Dress the subject in the garment shown in Image 2.
The garment must match the reference in color, silhouette, fabric texture,
construction, and natural drape.

Style: true-to-life, as photographed, unretouched smartphone realism.
Avoid: studio lighting, glamour retouching, centered portrait framing, face enhancement.`

// ═══════════════════════════════════════════════════════════════
// IDENTITY ANCHOR - Strongest possible identity lock
// ═══════════════════════════════════════════════════════════════

const IDENTITY_ANCHOR_BLOCK = `IDENTITY LOCK (NON-NEGOTIABLE):
The output face must be IDENTICAL to Image 1 - same person, same features.
Do not reinterpret the face due to scene, lighting, or camera changes.
Do not adjust the face to "fit" the new environment.
The person in the output must be immediately recognizable as Image 1.
If any doubt about a facial feature, copy it exactly from Image 1.`

// ═══════════════════════════════════════════════════════════════
// POSTURE BLOCK - Natural body language, no face terms
// ═══════════════════════════════════════════════════════════════

const POSTURE_BLOCK = `Body posture should be naturally asymmetrical.
Weight shifted slightly to one side.
Subtle torso rotation, not squared to camera.
Subject is mid-action or between movements, not posing.`

// ═══════════════════════════════════════════════════════════════
// PRO_IDENTITY_LOCKED - HIGH REALISM WITH MAXIMUM IDENTITY PRESERVATION
// For try-on with advanced quality toggle enabled
// ═══════════════════════════════════════════════════════════════

const PRO_IDENTITY_LOCKED_PROMPT = `CRITICAL: Use Image 1 as the SOLE source of identity.
The output MUST show the EXACT SAME PERSON from Image 1.
This is NOT a "similar looking" person - it is THE SAME PERSON.

Do not beautify, optimize, enhance, or remodel the face.
Do not alter eye shape, eye spacing, gaze direction, or symmetry.
Do not smooth skin or adjust any facial asymmetry.
Preserve every natural imperfection exactly as seen in Image 1.

PRO model may ONLY enhance:
- Lighting continuity with the scene
- Fabric realism and drape quality
- Background integration and depth
- Overall image quality and sharpness

The face must be IDENTICAL to Image 1 at pixel-level accuracy.
Expression may be natural, but the person must be immediately recognizable.

Dress the subject in the garment shown in Image 2.
The garment must match the reference in color, silhouette, fabric texture,
construction, and natural drape.`

// ═══════════════════════════════════════════════════════════════
// PRO PROMPT - CONTROLLED FLEXIBILITY (UGC/CAMPAIGN ONLY)
// ═══════════════════════════════════════════════════════════════

const PRO_PROMPT_BASE = `Use Image 1 as a visual reference.
Generated subject should strongly resemble Image 1.

Allow mild aesthetic refinement while remaining realistic.
Avoid face replacement or exaggerated enhancement.

Dress the subject in the garment shown in Image 2.
Ensure accurate garment realism.`

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
 * FLASH Pipeline: Identity-Critical Try-On
 * 
 * - Prompt is STATIC and LOCKED
 * - Only scene/lighting/camera can be selected from presets
 * - Identity instructions are NEVER modified
 * - Face geometry anchor prevents drift from posture changes
 * - Posture-intent block adds natural body language (no facial changes)
 */
export function buildFlashPipeline(input: FlashPipelineInput): FlashPipelineOutput {
    const { presetId } = input
    const preset = presetId ? getPresetById(presetId) : DEFAULT_PRESET

    // Environment-only additions (NO subject language)
    const environmentBlock = preset ? `
Environment: ${preset.scene}
Lighting: ${preset.lighting}
Camera: ${preset.camera}` : ''

    // MAXIMUM IDENTITY PRESERVATION PROMPT
    // Includes: identity lock, negative drift block, face preservation rules, 
    // pose anchor, face de-emphasis, posture
    const finalPrompt = `${FLASH_PROMPT_LOCKED}

${NEGATIVE_IDENTITY_DRIFT_BLOCK}

${FACE_PRESERVATION_RULES}

${POSE_ANCHOR_BLOCK}

${IDENTITY_ANCHOR_BLOCK}

${FACE_DEEMPHASIS_BLOCK}

${POSTURE_BLOCK}
${environmentBlock}`

    // Calculate identity metrics
    const metrics: IdentityMetrics = {
        pose_locked: true,
        face_emphasis: 'low',
        model_freedom: 'flash',
        identity_risk_score: 10 // Very low risk with all identity blocks
    }

    console.log(`\n🎬 FLASH PIPELINE (Maximum Identity Preservation)`)
    console.log(`   Preset: ${preset?.id || 'default'}`)
    console.log(`   Prompt length: ${finalPrompt.length} chars`)
    console.log(`   Temperature: 0.05 (minimum for identity lock)`)
    console.log(`   📊 IDENTITY METRICS:`)
    console.log(`      pose_locked: ${metrics.pose_locked}`)
    console.log(`      face_emphasis: ${metrics.face_emphasis}`)
    console.log(`      model_freedom: ${metrics.model_freedom}`)
    console.log(`      identity_risk_score: ${metrics.identity_risk_score}/100`)


    return {
        prompt: finalPrompt,
        model: 'gemini-2.5-flash-image',
        temperature: 0.05, // MINIMUM temperature for maximum identity consistency
        assertions: [
            'Identity from Image 1 only',
            'Negative drift block applied',
            'Face preservation rules enforced',
            'Pose strictly locked',
            'No beautification allowed'
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
 * PRO Pipeline: Aesthetic/UGC Mode
 * 
 * - For campaigns, UGC, brand visuals
 * - Allows mild aesthetic refinement
 * - NEVER used for try-on previews (use pro_identity_locked instead)
 */
export function buildProPipeline(input: ProPipelineInput): ProPipelineOutput {
    const { presetId, allowAestheticRefinement = true } = input
    const preset = presetId ? getPresetById(presetId) : DEFAULT_PRESET

    // Scene selection from presets
    const sceneBlock = preset ? `
Scene: ${preset.scene}
Lighting: ${preset.lighting}
Camera: ${preset.camera}` : ''

    const finalPrompt = `${PRO_PROMPT_BASE}
${sceneBlock}

${allowAestheticRefinement
            ? 'Subtle professional aesthetic refinement is acceptable.'
            : 'Avoid over-beautification. Keep realistic appearance.'}`

    console.log(`\n🎬 PRO PIPELINE (Aesthetic/UGC)`)
    console.log(`   Preset: ${preset?.id || 'default'}`)
    console.log(`   Aesthetic refinement: ${allowAestheticRefinement}`)
    console.log(`   Temperature: 0.3 (moderate for creativity)`)

    return {
        prompt: finalPrompt,
        model: 'gemini-3-pro-image-preview',
        temperature: 0.3, // Slightly higher for aesthetic flexibility
        assertions: [
            'Strong resemblance to Image 1',
            'Mild refinement allowed',
            'No face replacement',
            'Scene from preset only'
        ]
    }
}

// ═══════════════════════════════════════════════════════════════
// PRO_IDENTITY_LOCKED PIPELINE - HIGH REALISM + IDENTITY CRITICAL
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
 * PRO_IDENTITY_LOCKED Pipeline: High-Realism Identity-Preserving Try-On
 * 
 * - ALLOWED for try-on previews
 * - Identity-critical (same as FLASH)
 * - Superior realism: lighting, expression, posture
 * - Temperature: 0.08 (low for identity, allows some PRO realism)
 * 
 * FORBIDDEN:
 * - Face correction, enhancement, optimization
 * - Eye/gaze alteration
 * - Skin smoothing
 * - Any beautification
 */
export function buildProIdentityLockedPipeline(input: ProIdentityLockedPipelineInput): ProIdentityLockedPipelineOutput {
    const { presetId } = input
    const preset = presetId ? getPresetById(presetId) : DEFAULT_PRESET

    // Environment-only additions (NO subject language)
    const environmentBlock = preset ? `
Environment: ${preset.scene}
Lighting: ${preset.lighting}
Camera: ${preset.camera}` : ''

    // High-realism additions (allowed for PRO_IDENTITY_LOCKED)
    // PRO may improve lighting continuity, fabric realism, background coherence ONLY
    const realismBlock = `
Style: cinematic photorealism with natural depth and warmth.
Lighting should interact naturally with the environment.
Allow subtle environmental reflections and atmospheric depth.`

    // MAXIMUM IDENTITY PRESERVATION + PRO REALISM PROMPT
    const finalPrompt = `${PRO_IDENTITY_LOCKED_PROMPT}

${NEGATIVE_IDENTITY_DRIFT_BLOCK}

${FACE_PRESERVATION_RULES}

${POSE_ANCHOR_BLOCK}

${IDENTITY_ANCHOR_BLOCK}

${FACE_DEEMPHASIS_BLOCK}

${POSTURE_BLOCK}
${environmentBlock}
${realismBlock}`

    // Calculate identity metrics for PRO_IDENTITY_LOCKED
    const metrics: IdentityMetrics = {
        pose_locked: true,
        face_emphasis: 'low',
        model_freedom: 'pro_locked',
        identity_risk_score: 15 // Lower risk with all identity blocks
    }

    console.log(`\n🎬 PRO_IDENTITY_LOCKED PIPELINE (High-Realism + Maximum Identity)`)
    console.log(`   Preset: ${preset?.id || 'default'}`)
    console.log(`   Prompt length: ${finalPrompt.length} chars`)
    console.log(`   Temperature: 0.08 (low for identity, PRO realism allowed)`)
    console.log(`   📊 IDENTITY METRICS:`)
    console.log(`      pose_locked: ${metrics.pose_locked}`)
    console.log(`      face_emphasis: ${metrics.face_emphasis}`)
    console.log(`      model_freedom: ${metrics.model_freedom}`)
    console.log(`      identity_risk_score: ${metrics.identity_risk_score}/100`)

    return {
        prompt: finalPrompt,
        model: 'gemini-3-pro-image-preview',
        temperature: 0.08, // Low for identity, allows PRO realism
        assertions: [
            'Identity from Image 1 only',
            'Negative drift block applied',
            'Face preservation rules enforced',
            'Pose strictly locked',
            'PRO realism: lighting/fabric/background only'
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
 */
export function validatePipelineInputs(
    imageCount: number,
    hasPersonImage: boolean,
    hasGarmentImage: boolean,
    prompt: string
): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

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

    // Context-aware biometric check (replaces naive includes())
    const illegalTerm = hasIllegalBiometric(prompt)
    if (illegalTerm) {
        errors.push(`Biometric term "${illegalTerm}" found in prompt - violates identity safety`)
    }

    // Identity text must appear
    if (!prompt.includes('Image 1')) {
        errors.push('Identity reference to Image 1 is missing')
    }

    // Garment text must appear
    if (!prompt.includes('Image 2')) {
        errors.push('Garment reference to Image 2 is missing')
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
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

// Export locked prompts for testing/verification
export { FLASH_PROMPT_LOCKED, PRO_PROMPT_BASE, PRO_IDENTITY_LOCKED_PROMPT }
