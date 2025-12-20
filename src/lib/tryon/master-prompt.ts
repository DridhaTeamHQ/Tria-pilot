/**
 * MASTER PROMPT ARCHITECTURE - COMPLETE REWRITE
 * 
 * STRICT BLOCK STRUCTURE (NO PROSE):
 * [FACE_FREEZE] - Copy face pixels, do not generate
 * [IDENTITY_LOCK] - Preserve geometry, hairline, beard
 * [CLOTHING_REPLACE] - Remove original, apply reference exactly
 * [POSE_LIMIT] - Micro only
 * [SCENE] - Real Indian photoshoot environment
 * [LIGHTING] - Preserve face light, harmonize garment + scene
 * 
 * FORBIDDEN TERMS (WILL CAUSE FAILURE):
 * - reimagine, editorial, cinematic, fashion pose, dramatic lighting
 * - portrait, studio, perfect, enhance, sharp, defined
 */

import 'server-only'

// ═══════════════════════════════════════════════════════════════
// FORBIDDEN TERMS (AUTO-FAIL IF PRESENT)
// ═══════════════════════════════════════════════════════════════

export const FORBIDDEN_TERMS = [
    'reimagine', 'editorial', 'cinematic', 'fashion pose', 'dramatic lighting',
    'portrait', 'studio', 'perfect', 'enhance', 'sharp', 'defined', 'clean',
    'beautiful', 'stunning', 'gorgeous', 'elegant', 'glamorous', 'polished',
    'flawless', 'refined', 'crisp', 'vivid', 'vibrant', 'bold', 'striking',
    'resembling', 'similar to', 'like the person', 'preserve identity',
    'artistic', 'creative', 'unique', 'stylized', 'aesthetic', 'vibe',
    'model', 'mannequin', 'fashion model', 'pose like'
]

// ═══════════════════════════════════════════════════════════════
// [FACE_FREEZE] - ABSOLUTE (NO EXCEPTIONS)
// ═══════════════════════════════════════════════════════════════

export const FACE_FREEZE_BLOCK = `[FACE_FREEZE]
Face region = READ ONLY.
Copy face pixels from Image 1.
Do not generate face.
Do not modify face.
Do not reinterpret face.

Face includes:
- Forehead to chin
- Ear to ear
- Eyebrows, eyes, nose, mouth, jawline
- Skin texture, pores, marks, stubble

If uncertain about any face pixel → copy from Image 1.
If model attempts to regenerate face → GENERATION FAILED.`

// ═══════════════════════════════════════════════════════════════
// [IDENTITY_LOCK] - Geometry and features
// ═══════════════════════════════════════════════════════════════

export const IDENTITY_LOCK_BLOCK = `[IDENTITY_LOCK]
Lock these features from Image 1:
- Hairline shape
- Beard shape and density
- Skin tone
- Ear shape
- Head size in frame
- Neck proportions

Allowed: lighting harmonization ONLY.
Forbidden: geometry edits.`

// ═══════════════════════════════════════════════════════════════
// [CLOTHING_REPLACE] - Destructive rebuild
// ═══════════════════════════════════════════════════════════════

export const CLOTHING_REPLACE_BLOCK = `[CLOTHING_REPLACE]
Original garment pixels = REMOVE completely.
Garment region = chest, waist, sleeves, collar.

New garment from Image 2 must:
- Match reference garment structure EXACTLY
- Match fabric COLOR EXACTLY (no color shift)
- Match fabric fall and drape
- Match seam logic and stitching
- Respect body depth and pose
- Show wrinkles at joints
- Follow gravity

GARMENT COLOR RULE:
- Color of garment = EXACT match to Image 2
- Do not shift hue, saturation, or brightness
- Do not add color grading to garment
- If Image 2 shows blue shirt → output blue shirt

If original garment visible after generation → RETRY.
If garment color differs from Image 2 → RETRY.`

// ═══════════════════════════════════════════════════════════════
// [POSE_LIMIT] - Micro only
// ═══════════════════════════════════════════════════════════════

export const POSE_LIMIT_BLOCK = `[POSE_LIMIT]
Pose changes = MICRO ONLY.

Hard limits:
- Torso rotation: ≤ 15°
- Head rotation: ≤ 8°
- Shoulder shift: ≤ 5%
- Hand position: slight adjustment only

Allowed hand states:
- Rest at side
- Slight bend
- In pocket (if visible in original)

Forbidden:
- Fashion poses
- Floating hands
- New limb positions
- Crossed arms (unless present in original)

If pose exceeds limits → clamp to original.`

// ═══════════════════════════════════════════════════════════════
// [SCENE] - Real Indian photoshoot environment
// ═══════════════════════════════════════════════════════════════

export const SCENE_BLOCK = `[SCENE]
Background = real photoshoot location.
Not AI art. Not composited.

Requirements:
- Match camera height of Image 1
- Match focal length (estimate from face size)
- Include foreground + midground + background depth
- Add contact shadows under arms, neck, waist
- Add color bleed from environment onto clothing

Mandatory imperfections:
- Uneven surfaces
- Visible clutter
- Asymmetric framing
- Natural textures

No: fantasy depth, surreal colors, infinite backgrounds.`

// ═══════════════════════════════════════════════════════════════
// [LIGHTING] - Layer-based lighting
// ═══════════════════════════════════════════════════════════════

export const LIGHTING_BLOCK = `[LIGHTING]
Split lighting into layers:
1. Face lighting = PRESERVED from Image 1
2. Garment lighting = adjusted to match scene
3. Background lighting = scene driven

Rules:
- Never relight the face independently
- Light direction must match original
- Soft natural falloff
- No rim light or beauty lighting
- Shadows match light source

Add to garment:
- Contact shadows where fabric meets body
- Ambient occlusion in folds
- Subtle environment reflections`

// ═══════════════════════════════════════════════════════════════
// [NEGATIVE] - Hard ban list
// ═══════════════════════════════════════════════════════════════

export const NEGATIVE_BLOCK = `[NEGATIVE]
NEVER generate:
- New face
- Different person
- Smoothed skin
- Changed eye color
- Modified jawline
- Altered beard
- Fashion pose
- Floating limbs
- Mannequin stance
- Composited look
- Fantasy lighting
- CGI render
- AI art style`

// ═══════════════════════════════════════════════════════════════
// COMPLETE PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════

export function buildMasterPrompt(sceneDescription: string): string {
    return `${FACE_FREEZE_BLOCK}

${IDENTITY_LOCK_BLOCK}

${CLOTHING_REPLACE_BLOCK}

${POSE_LIMIT_BLOCK}

${SCENE_BLOCK}
Location: ${sceneDescription}

${LIGHTING_BLOCK}

${NEGATIVE_BLOCK}`
}

/**
 * Build FLASH prompt (strictest identity, near-deterministic)
 */
export function buildFlashMasterPrompt(sceneDescription: string): string {
    return `[FLASH MODE]
Temperature: 0.01 (near-deterministic)
Face creativity: ZERO
Face modification: FORBIDDEN

${buildMasterPrompt(sceneDescription)}`
}

/**
 * Build PRO prompt (face frozen, environment flexible)
 */
export function buildProMasterPrompt(sceneDescription: string): string {
    return `[PRO MODE]
Face: FROZEN (no modification)
Garment: flexible (can add shadows and folds)
Background: flexible (can add depth)
Pose: clamped (micro only)

If PRO modifies face → auto-fallback to FLASH.

${buildMasterPrompt(sceneDescription)}`
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════

export interface ForbiddenCheck {
    valid: boolean
    violations: string[]
}

/**
 * Check for forbidden terms in prompt.
 */
export function checkForbiddenTerms(prompt: string): ForbiddenCheck {
    const lowerPrompt = prompt.toLowerCase()
    const violations: string[] = []

    for (const term of FORBIDDEN_TERMS) {
        if (lowerPrompt.includes(term.toLowerCase())) {
            violations.push(term)
        }
    }

    return {
        valid: violations.length === 0,
        violations
    }
}

/**
 * Log master prompt status.
 */
export function logMasterPromptStatus(mode: 'flash' | 'pro', promptLength: number): void {
    console.log(`\n🎯 MASTER PROMPT (${mode.toUpperCase()})`)
    console.log(`   📝 Length: ${promptLength} chars`)
    console.log(`   🧊 FACE_FREEZE: ✓`)
    console.log(`   🔒 IDENTITY_LOCK: ✓`)
    console.log(`   👕 CLOTHING_REPLACE: ✓`)
    console.log(`   🧍 POSE_LIMIT: ✓`)
    console.log(`   🏠 SCENE: ✓`)
    console.log(`   💡 LIGHTING: ✓`)
    console.log(`   ❌ NEGATIVE: ✓`)
}
