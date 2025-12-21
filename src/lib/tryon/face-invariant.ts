/**
 * FACE INVARIANT LAYER
 * 
 * Unified face protection layer enforced in BOTH Flash and Pro pipelines.
 * 
 * PRINCIPLE: IDENTITY > PRESET > AESTHETICS
 * 
 * This module provides:
 * 1. FACE_INVARIANT_BLOCK - Face pixels are READ-ONLY
 * 2. DEMOGRAPHIC_SAFETY_BLOCK - No slimming, whitening, smoothing
 * 3. EXPRESSION_PRESERVATION_BLOCK - All expressions preserved
 * 4. OPAQUE_FACE_MASK_BLOCK - Face as opaque black box (for Pro Scene Pass)
 */

import 'server-only'

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maximum retries for scene pass if preset elements are missing.
 * Prevents infinite loops while allowing reasonable retry attempts.
 */
export const MAX_SCENE_RETRIES = 2

// ═══════════════════════════════════════════════════════════════════════════════
// FACE INVARIANT BLOCK (HIGHEST PRIORITY)
// ═══════════════════════════════════════════════════════════════════════════════

export const FACE_INVARIANT_BLOCK = `
═══════════════════════════════════════════════════════════════════════════════
FACE INVARIANT (HIGHEST PRIORITY — IMMUTABLE)
═══════════════════════════════════════════════════════════════════════════════

⚠️ CORE RULE: Face pixels from Image 1 are READ-ONLY.

Face geometry is IMMUTABLE:
• Face shape: LOCKED
• Face size: LOCKED
• Face proportions: LOCKED
• Facial features: LOCKED

Operations on face:
• Generation: ❌ FORBIDDEN
• Reprojection: ❌ FORBIDDEN
• Beautification: ❌ FORBIDDEN
• Enhancement: ❌ FORBIDDEN
• Modification: ❌ FORBIDDEN

The ONLY allowed operation is PIXEL COPY from Image 1.
═══════════════════════════════════════════════════════════════════════════════`

// ═══════════════════════════════════════════════════════════════════════════════
// DEMOGRAPHIC SAFETY BLOCK (MANDATORY)
// ═══════════════════════════════════════════════════════════════════════════════

export const DEMOGRAPHIC_SAFETY_BLOCK = `
═══════════════════════════════════════════════════════════════════════════════
DEMOGRAPHIC SAFETY (MANDATORY — NO EXCEPTIONS)
═══════════════════════════════════════════════════════════════════════════════

FORBIDDEN MODIFICATIONS (HARD BLOCK):
❌ Do NOT slim face
❌ Do NOT reshape face
❌ Do NOT sharpen jawline
❌ Do NOT reduce cheek size
❌ Do NOT lighten skin tone
❌ Do NOT whiten skin
❌ Do NOT smooth skin texture
❌ Do NOT remove pores
❌ Do NOT normalize expressions
❌ Do NOT correct asymmetry
❌ Do NOT remove double chin
❌ Do NOT reduce nose size
❌ Do NOT enlarge eyes
❌ Do NOT thin lips

PRESERVE EXACTLY AS-IS:
✓ Fat / round / chubby faces → KEEP FAT
✓ Facial asymmetry → KEEP ASYMMETRIC
✓ Tilted head angles → KEEP TILT
✓ All expressions (smiles, teeth, neutral) → KEEP EXPRESSION
✓ Dark skin tones → NO BRIGHTENING
✓ Light skin tones → NO DARKENING
✓ Beards, mustaches, stubble → KEEP EXACT DENSITY
✓ Glasses, sunglasses → KEEP ON FACE
✓ Scars, moles, birthmarks → KEEP VISIBLE
✓ Wrinkles, lines → KEEP VISIBLE
✓ Under-eye bags → KEEP VISIBLE
✓ Acne, blemishes → KEEP VISIBLE

THE FACE IN OUTPUT MUST BE RECOGNIZABLE AS THE SAME PERSON.
A family member must be able to identify them instantly.
═══════════════════════════════════════════════════════════════════════════════`

// ═══════════════════════════════════════════════════════════════════════════════
// EXPRESSION PRESERVATION BLOCK
// ═══════════════════════════════════════════════════════════════════════════════

export const EXPRESSION_PRESERVATION_BLOCK = `
═══════════════════════════════════════════════════════════════════════════════
EXPRESSION PRESERVATION (CRITICAL)
═══════════════════════════════════════════════════════════════════════════════

The expression in Image 1 MUST be preserved EXACTLY:

MOUTH STATE:
• If mouth is OPEN → output mouth MUST be OPEN
• If mouth is CLOSED → output mouth MUST be CLOSED
• If teeth are VISIBLE → output teeth MUST be VISIBLE
• If teeth are HIDDEN → output teeth MUST be HIDDEN

SMILE STATE:
• If person is SMILING → output MUST show SAME smile
• If person is NEUTRAL → output MUST be NEUTRAL
• If person is FROWNING → output MUST show frown

EYE STATE:
• Eye squint level → MATCH EXACTLY
• Eye direction → MATCH EXACTLY
• Eyebrow position → MATCH EXACTLY

CHEEK STATE:
• Cheek position (raised for smile) → MATCH EXACTLY

DO NOT change expression to match "ideal" or "professional" look.
DO NOT close an open mouth to look more "elegant".
DO NOT neutralize a smile for "fashion" aesthetic.
═══════════════════════════════════════════════════════════════════════════════`

// ═══════════════════════════════════════════════════════════════════════════════
// OPAQUE FACE MASK BLOCK (For Pro Scene Pass)
// ═══════════════════════════════════════════════════════════════════════════════

export const OPAQUE_FACE_MASK_BLOCK = `
═══════════════════════════════════════════════════════════════════════════════
OPAQUE FACE MASK (PRO SCENE PASS ONLY)
═══════════════════════════════════════════════════════════════════════════════

During scene construction, the face region is an OPAQUE BLACK BOX:

• Face region = UNAVAILABLE for reasoning
• Face region = NOT blurred (blurred still leaks geometry)
• Face region = NOT silhouette (silhouette leaks shape)
• Face region = NOT low-detail proxy (proxy leaks features)
• Face region = COMPLETELY OPAQUE, zero facial signal

The model must construct the scene WITHOUT any knowledge of the face.
Only body pose and clothing are available for scene integration.

After scene construction, face pixels will be COPIED from Image 1.
═══════════════════════════════════════════════════════════════════════════════`

// ═══════════════════════════════════════════════════════════════════════════════
// COMBINED BLOCKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Full FaceInvariantLayer for Flash pipeline.
 * Includes: Invariant + Demographic Safety + Expression Preservation
 */
export const FACE_INVARIANT_LAYER_FLASH = `
${FACE_INVARIANT_BLOCK}

${DEMOGRAPHIC_SAFETY_BLOCK}

${EXPRESSION_PRESERVATION_BLOCK}
`

/**
 * Full FaceInvariantLayer for Pro Scene Pass.
 * Includes: Invariant + Demographic Safety + Opaque Mask
 */
export const FACE_INVARIANT_LAYER_PRO_SCENE = `
${FACE_INVARIANT_BLOCK}

${DEMOGRAPHIC_SAFETY_BLOCK}

${OPAQUE_FACE_MASK_BLOCK}
`

/**
 * Full FaceInvariantLayer for Pro Refinement Pass.
 * Includes: Invariant + Demographic Safety + Expression Preservation
 * (No mask - face is pixel copied)
 */
export const FACE_INVARIANT_LAYER_PRO_REFINE = `
${FACE_INVARIANT_BLOCK}

${DEMOGRAPHIC_SAFETY_BLOCK}

${EXPRESSION_PRESERVATION_BLOCK}
`

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get the appropriate FaceInvariantLayer for the given pipeline.
 */
export function getFaceInvariantLayer(pipeline: 'flash' | 'pro-scene' | 'pro-refine'): string {
    switch (pipeline) {
        case 'flash':
            return FACE_INVARIANT_LAYER_FLASH
        case 'pro-scene':
            return FACE_INVARIANT_LAYER_PRO_SCENE
        case 'pro-refine':
            return FACE_INVARIANT_LAYER_PRO_REFINE
        default:
            return FACE_INVARIANT_LAYER_FLASH
    }
}

/**
 * Log FaceInvariantLayer status for debugging.
 */
export function logFaceInvariantStatus(pipeline: 'flash' | 'pro-scene' | 'pro-refine'): void {
    console.log(`🛡️ FaceInvariantLayer: ${pipeline.toUpperCase()}`)
    console.log(`   - Demographic Safety: ENFORCED`)
    console.log(`   - Expression Preservation: ENFORCED`)
    console.log(`   - Face Pixels: READ-ONLY`)
    if (pipeline === 'pro-scene') {
        console.log(`   - Face Mask: OPAQUE BLACK BOX`)
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REALISM ENFORCEMENT BLOCK (PHYSICS + ANATOMY)
// ═══════════════════════════════════════════════════════════════════════════════

export const REALISM_ENFORCEMENT_BLOCK = `
═══════════════════════════════════════════════════════════════════════════════
REALISM ENFORCEMENT (PHYSICS + ANATOMY)
═══════════════════════════════════════════════════════════════════════════════

CLOTHING PHYSICS:
• Clothing must wrap naturally around body contours
• Fabric follows gravity and body tension points
• No floating edges or stiff unnatural folds
• Wrinkles at joints (elbows, waist, armpits)
• Collar sits correctly on neck/shoulders

HAND ANATOMY (CRITICAL):
• Hands must have exactly 5 fingers
• Fingers must connect anatomically to palm
• No floating or disconnected digits
• No merged fingers
• Wrist connects naturally to arm
• If hands not visible → keep not visible (do not add)

BODY INTEGRATION:
• No floating limbs
• Arms connect at shoulders
• Neck connects to torso
• Proportions match Image 1 exactly

SHADOWS & LIGHTING:
• Shadow direction must match light source
• Contact shadows where body meets surfaces
• No floating shadows
• No contradictory light directions

TEXTURE REALISM:
• Add subtle sensor grain (not digital noise)
• Avoid oversaturation
• Avoid hyper-sharpening
• No portrait-mode blur unless specified
• Skin texture visible (pores, natural)
• Fabric weave/texture visible

FORBIDDEN:
✗ Plastic skin
✗ AI-smooth faces
✗ Mannequin poses
✗ Unnatural limb angles
✗ Floating clothing edges
═══════════════════════════════════════════════════════════════════════════════`

// ═══════════════════════════════════════════════════════════════════════════════
// FLASH RECONSTRUCTION BLOCK (DO NOT RE-IMAGINE)
// ═══════════════════════════════════════════════════════════════════════════════

export const FLASH_RECONSTRUCTION_BLOCK = `
═══════════════════════════════════════════════════════════════════════════════
FLASH MODE: RECONSTRUCTION (NOT GENERATION)
═══════════════════════════════════════════════════════════════════════════════

CORE INSTRUCTION:
Reconstruct body and clothing AROUND Image 1.
Do NOT re-imagine the person.
Do NOT generate a new person wearing similar clothes.
Do NOT adjust facial proportions for "better" framing.

THIS IS RECONSTRUCTION:
• Start with Image 1 as the ANCHOR
• Change ONLY the garment (from Image 2)
• Keep EVERYTHING else from Image 1

FLASH IGNORES:
• Creative scene suggestions
• Artistic lighting requests
• Pose adjustments beyond micro (≤5°)
• Background changes (keep original unless specified)

FLASH APPLIES:
• Lighting direction (match original)
• Color temperature (match scene)
• Background brightness (match scene)

RESULT VALIDATION:
The output should look like "same photo, different clothes"
NOT "new photo of similar person"
═══════════════════════════════════════════════════════════════════════════════`

// ═══════════════════════════════════════════════════════════════════════════════
// GARMENT CHANGE VALIDATION BLOCK
// ═══════════════════════════════════════════════════════════════════════════════

export const GARMENT_CHANGE_VALIDATION_BLOCK = `
═══════════════════════════════════════════════════════════════════════════════
GARMENT CHANGE VALIDATION (MUST PASS)
═══════════════════════════════════════════════════════════════════════════════

The garment from Image 2 MUST be visible in output:

REQUIRED VISIBLE CHANGES:
• Garment color matches Image 2
• Garment pattern/texture matches Image 2
• Garment style (neckline, sleeves, length) matches Image 2
• Overall silhouette reflects the new garment

IF GARMENT NOT CHANGED:
The generation has FAILED.
This is not acceptable output.

GARMENT REALISM:
• Fabric drapes according to body pose
• Seams and construction details visible
• Wrinkles at movement points
• Fit correlates with body proportions from Image 1
═══════════════════════════════════════════════════════════════════════════════`

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATED COMBINED LAYERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Full FaceInvariantLayer for Flash pipeline WITH realism and reconstruction.
 */
export const FACE_INVARIANT_LAYER_FLASH_FULL = `
${FACE_INVARIANT_BLOCK}

${DEMOGRAPHIC_SAFETY_BLOCK}

${EXPRESSION_PRESERVATION_BLOCK}

${FLASH_RECONSTRUCTION_BLOCK}

${REALISM_ENFORCEMENT_BLOCK}

${GARMENT_CHANGE_VALIDATION_BLOCK}
`

/**
 * Full FaceInvariantLayer for Pro Refinement Pass WITH realism.
 */
export const FACE_INVARIANT_LAYER_PRO_REFINE_FULL = `
${FACE_INVARIANT_BLOCK}

${DEMOGRAPHIC_SAFETY_BLOCK}

${EXPRESSION_PRESERVATION_BLOCK}

${REALISM_ENFORCEMENT_BLOCK}

${GARMENT_CHANGE_VALIDATION_BLOCK}
`

