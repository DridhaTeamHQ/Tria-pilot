/**
 * INTELLIGENT BODY SCAN SYSTEM
 * 
 * This module analyzes Image 1 to understand the person's body characteristics
 * and generates binding constraints for the generation model.
 * 
 * CONCEPT: The model should understand body type from:
 * - Face fatness (jaw width, cheek volume, chin shape)
 * - Visible body proportions (shoulder width, arm thickness, torso)
 * - Overall build (slim, average, athletic, plus-size)
 * 
 * This creates a "Body Profile" that binds the generation.
 */

import 'server-only'

// ═══════════════════════════════════════════════════════════════════════════════
// BODY PROFILE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type BodyBuild = 'very_slim' | 'slim' | 'average' | 'athletic' | 'plus_size' | 'very_plus_size'
export type FaceShape = 'oval' | 'round' | 'square' | 'heart' | 'oblong' | 'full'
export type BodyProportion = 'petite' | 'standard' | 'tall' | 'broad'

export interface BodyProfile {
    // Face characteristics (correlate with body)
    faceShape: FaceShape
    cheekVolume: 'hollow' | 'average' | 'full' | 'very_full'
    jawWidth: 'narrow' | 'average' | 'wide' | 'very_wide'
    chinShape: 'pointed' | 'average' | 'round' | 'double'
    neckThickness: 'thin' | 'average' | 'thick' | 'very_thick'

    // Body characteristics
    bodyBuild: BodyBuild
    shoulderWidth: 'narrow' | 'average' | 'broad' | 'very_broad'
    armThickness: 'thin' | 'average' | 'thick' | 'very_thick'
    torsoVolume: 'slim' | 'average' | 'full' | 'very_full'
    estimatedWeight: 'underweight' | 'normal' | 'overweight' | 'obese'

    // Proportions
    bodyProportion: BodyProportion
    headToBodyRatio: number  // e.g., 6.5 heads tall
    shoulderToHipRatio: number  // e.g., 1.0 for balanced
}

// ═══════════════════════════════════════════════════════════════════════════════
// BODY SCAN PROMPT - ANALYSIS PHASE
// ═══════════════════════════════════════════════════════════════════════════════

export const BODY_SCAN_ANALYSIS_PROMPT = `
╔═══════════════════════════════════════════════════════════════════════════════╗
║               INTELLIGENT BODY SCAN SYSTEM                                    ║
║                   Full Body Profile Analysis                                  ║
╚═══════════════════════════════════════════════════════════════════════════════╝

★★★ BEFORE GENERATING, ANALYZE IMAGE 1 COMPLETELY ★★★

You must perform a FULL BODY SCAN of the person in Image 1.
This analysis will BIND your generation.

════════════════════════════════════════════════════════════════════════════════
PHASE 1: FACE ANALYSIS (Body Predicts from Face)
════════════════════════════════════════════════════════════════════════════════

Analyze the face and determine:

FACE SHAPE: □ Oval □ Round □ Square □ Heart □ Oblong □ Full
CHEEK VOLUME: □ Hollow □ Average □ Full □ Very Full
JAW WIDTH: □ Narrow □ Average □ Wide □ Very Wide
CHIN SHAPE: □ Pointed □ Average □ Round □ Double Chin
NECK THICKNESS: □ Thin □ Average □ Thick □ Very Thick

★★★ CRITICAL CORRELATION ★★★
• Full cheeks + Wide jaw + Round chin = Plus-size body
• Round face + Thick neck = Higher body weight
• Double chin = Significantly higher body weight
• Full face + Thick neck = Body mass is SUBSTANTIAL

════════════════════════════════════════════════════════════════════════════════
PHASE 2: VISIBLE BODY ANALYSIS
════════════════════════════════════════════════════════════════════════════════

Analyze what's visible of the body:

SHOULDER WIDTH: □ Narrow □ Average □ Broad □ Very Broad
ARM THICKNESS: □ Thin □ Average □ Thick □ Very Thick
TORSO VOLUME: □ Slim □ Average □ Full □ Very Full
VISIBLE CLOTHING FIT: □ Loose □ Fitted □ Tight □ Very Tight

★★★ BODY BUILD DETERMINATION ★★★

Based on face + visible body, classify overall build:
□ Very Slim (BMI < 18.5 appearance)
□ Slim (BMI 18.5-22)
□ Average (BMI 22-25)
□ Athletic (muscular build)
□ Plus Size (BMI 25-30 appearance)
□ Very Plus Size (BMI 30+ appearance)

════════════════════════════════════════════════════════════════════════════════
PHASE 3: PROPORTION LOCK
════════════════════════════════════════════════════════════════════════════════

Calculate and LOCK:
• Head-to-body ratio (how many heads tall)
• Shoulder-to-hip ratio
• Arm-to-torso proportion
• Neck-to-shoulder proportion

These proportions are IMMUTABLE during generation.

════════════════════════════════════════════════════════════════════════════════
PHASE 4: BODY PROFILE BINDING
════════════════════════════════════════════════════════════════════════════════

Your analysis creates a BINDING CONSTRAINT:

If analysis shows PLUS SIZE body:
→ Generated body MUST be plus size
→ Waist MUST be full
→ Arms MUST be thick
→ Torso MUST have volume
→ NO SLIMMING ALLOWED

If analysis shows SLIM body:
→ Generated body MUST be slim
→ Proportions stay slim
→ NO ADDING WEIGHT

The body profile from Image 1 is ABSOLUTE.
`

// ═══════════════════════════════════════════════════════════════════════════════
// FACE-TO-BODY CORRELATION RULES
// ═══════════════════════════════════════════════════════════════════════════════

export const FACE_BODY_CORRELATION_RULES = `
════════════════════════════════════════════════════════════════════════════════
FACE-TO-BODY CORRELATION RULES (BINDING)
════════════════════════════════════════════════════════════════════════════════

The face contains PREDICTIVE information about the body.
Use these correlations:

┌─────────────────────────────────────────────────────────────────────────────┐
│ FACE INDICATOR              │ BODY PREDICTION                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ Full round face + Wide jaw  │ → Plus-size body, full torso                 │
│ Full cheeks                 │ → Higher body fat percentage                 │
│ Double chin                 │ → Substantial body mass                      │
│ Thick neck                  │ → Broad shoulders, thick arms                │
│ Round face shape            │ → Fuller body overall                        │
│ Soft jawline                │ → Softer body contours                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ Angular face + Sharp jaw    │ → Leaner body type                           │
│ Hollow cheeks               │ → Lower body fat percentage                  │
│ Visible cheekbones          │ → Slimmer build                              │
│ Thin neck                   │ → Narrower shoulders                         │
│ Defined jawline             │ → More defined body contours                 │
└─────────────────────────────────────────────────────────────────────────────┘

★★★ THE FACE AND BODY MUST MATCH ★★★

• If face is FULL → Body MUST be FULL
• If face is SLIM → Body MUST be SLIM
• MISMATCH = GENERATION FAILED

════════════════════════════════════════════════════════════════════════════════
COHERENCE CHECK:
════════════════════════════════════════════════════════════════════════════════

Before finalizing, verify:
□ Does the neck thickness match the face width?
□ Do the shoulders match the jaw width?
□ Does the body mass match the face fullness?
□ Do the arms match the face volume?

If ANY mismatch → REGENERATE
`

// ═══════════════════════════════════════════════════════════════════════════════
// BODY PRESERVATION BINDING
// ═══════════════════════════════════════════════════════════════════════════════

export const BODY_PRESERVATION_BINDING = `
════════════════════════════════════════════════════════════════════════════════
BODY PRESERVATION BINDING (FROM BODY SCAN)
════════════════════════════════════════════════════════════════════════════════

After analyzing Image 1, the following body profile is LOCKED:

★★★ THIS IS DETERMINED BY YOUR ANALYSIS, NOT CHANGED BY CLOTHING ★★★

DETECTED BODY BUILD: [Your analysis determines this]
DETECTED FACE FULLNESS: [Your analysis determines this]
DETECTED SHOULDER WIDTH: [Your analysis determines this]
DETECTED ARM THICKNESS: [Your analysis determines this]
DETECTED TORSO VOLUME: [Your analysis determines this]

════════════════════════════════════════════════════════════════════════════════
BINDING RULES:
════════════════════════════════════════════════════════════════════════════════

1. YOUR ANALYSIS BINDS THE GENERATION
   - If you analyze "plus size" → Generate plus size
   - If you analyze "full cheeks" → Generate fuller body
   - If you analyze "thick arms" → Generate thick arms
   
2. CLOTHING CANNOT CHANGE THE BODY
   - Clothing reference has a thin model? IGNORE
   - Clothing looks flattering on thin person? IRRELEVANT
   - Your analysis of Image 1 is the ONLY truth

3. CONSISTENCY CHECK AT END
   - Compare generated body to your initial analysis
   - If they don't match → You have FAILED

════════════════════════════════════════════════════════════════════════════════
EXPLICIT INSTRUCTIONS FOR PLUS-SIZE SUBJECTS:
════════════════════════════════════════════════════════════════════════════════

If your body scan shows PLUS-SIZE or VERY PLUS-SIZE:

MANDATORY:
✓ Full/round face → KEEP
✓ Wide jaw → KEEP
✓ Thick neck → KEEP
✓ Broad shoulders → KEEP
✓ Thick upper arms → KEEP
✓ Full torso → KEEP
✓ Full waist → KEEP
✓ Fuller hips → KEEP

FORBIDDEN:
✗ Thin waist
✗ Slim arms
✗ Narrow shoulders
✗ Defined stomach
✗ Model-like proportions
✗ "Flattering" slimming
✗ Any reduction in body volume

The clothing STRETCHES to fit the body.
The body does NOT shrink to fit the clothing.
`

// ═══════════════════════════════════════════════════════════════════════════════
// COMBINED BODY SCAN PROMPT
// ═══════════════════════════════════════════════════════════════════════════════

export function getBodyScanPrompt(): string {
    return `
${BODY_SCAN_ANALYSIS_PROMPT}

${FACE_BODY_CORRELATION_RULES}

${BODY_PRESERVATION_BINDING}
`
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

export function logBodyScanStatus(sessionId: string): void {
    console.log(`\n🔬 BODY SCAN SYSTEM ACTIVE [${sessionId}]`)
    console.log(`   ═══════════════════════════════════════════════`)
    console.log(`   ✓ Phase 1: Face Analysis → Body Prediction`)
    console.log(`   ✓ Phase 2: Visible Body Analysis`)
    console.log(`   ✓ Phase 3: Proportion Lock`)
    console.log(`   ✓ Phase 4: Body Profile Binding`)
    console.log(`   ✓ Face-Body Correlation: ACTIVE`)
    console.log(`   ═══════════════════════════════════════════════`)
}
