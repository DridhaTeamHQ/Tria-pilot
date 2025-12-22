/**
 * VARIANT DIFFERENTIATION SYSTEM
 * 
 * Each request generates 3 distinct image variants with different:
 * - Lighting (warm/cool/contrasty)
 * - Mood (friendly/neutral/cinematic)
 * - Camera (medium/closer/wider)
 * 
 * Hard constraints across ALL variants:
 * - Same identity (FCV)
 * - Same body (BCV)
 * - Same clothing
 * - NO face regeneration
 * - NO eye/hairline changes
 */

import 'server-only'

// ═══════════════════════════════════════════════════════════════
// VARIANT DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export interface VariantSpec {
    id: 'A' | 'B' | 'C'
    name: string
    lighting: string
    lightingPrompt: string
    mood: string
    moodPrompt: string
    camera: string
    cameraPrompt: string
    label: string // For UI display
}

export const VARIANT_A: VariantSpec = {
    id: 'A',
    name: 'Warm Natural',
    lighting: 'warm',
    lightingPrompt: `LIGHTING FOR THIS VARIANT:
- Color temperature: 3200K (warm tungsten / golden hour)
- Quality: Soft, diffused, flattering
- Direction: Side lighting with gentle fill
- Shadows: Soft, warm-tinted shadows
- Highlights: Golden highlights on skin and clothing`,
    mood: 'friendly',
    moodPrompt: `MOOD FOR THIS VARIANT:
- Atmosphere: Friendly, approachable, natural
- Expression energy: Warm, welcoming
- Background feeling: Inviting, comfortable`,
    camera: 'medium',
    cameraPrompt: `CAMERA FOR THIS VARIANT:
- Framing: Medium shot (waist up)
- Distance: Standard portrait distance
- Lens feel: 50-85mm equivalent
- Composition: Centered, balanced`,
    label: 'Warm • Medium'
}

export const VARIANT_B: VariantSpec = {
    id: 'B',
    name: 'Cool Editorial',
    lighting: 'cool',
    lightingPrompt: `LIGHTING FOR THIS VARIANT:
- Color temperature: 6000K (cool daylight / overcast)
- Quality: Diffused, even, editorial
- Direction: Front-facing soft light
- Shadows: Minimal, neutral gray
- Highlights: Clean, neutral white`,
    mood: 'neutral',
    moodPrompt: `MOOD FOR THIS VARIANT:
- Atmosphere: Neutral, editorial, professional
- Expression energy: Composed, confident
- Background feeling: Clean, modern`,
    camera: 'closer',
    cameraPrompt: `CAMERA FOR THIS VARIANT:
- Framing: Closer shot (chest up)
- Distance: Tighter than standard
- Lens feel: 85-105mm equivalent
- Composition: Subject fills more frame`,
    label: 'Cool • Closer'
}

export const VARIANT_C: VariantSpec = {
    id: 'C',
    name: 'Cinematic Atmospheric',
    lighting: 'contrasty',
    lightingPrompt: `LIGHTING FOR THIS VARIANT:
- Color temperature: Mixed (4500K with color contrast)
- Quality: Contrasty, dramatic, cinematic
- Direction: Strong key light with deeper shadows
- Shadows: Deep, atmospheric
- Highlights: Defined, punchy`,
    mood: 'cinematic',
    moodPrompt: `MOOD FOR THIS VARIANT:
- Atmosphere: Cinematic, atmospheric, storytelling
- Expression energy: Thoughtful, engaging
- Background feeling: Environmental, contextual`,
    camera: 'wider',
    cameraPrompt: `CAMERA FOR THIS VARIANT:
- Framing: Environmental shot (3/4 body or more)
- Distance: Further back, showing more context
- Lens feel: 35-50mm equivalent
- Composition: Subject in environment`,
    label: 'Dramatic • Wide'
}

export const ALL_VARIANTS: VariantSpec[] = [VARIANT_A, VARIANT_B, VARIANT_C]

// ═══════════════════════════════════════════════════════════════
// VARIANT PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════

export function buildVariantPromptModifier(variant: VariantSpec): string {
    return `
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    VARIANT ${variant.id}: ${variant.name.toUpperCase()}
╚═══════════════════════════════════════════════════════════════════════════════╝

${variant.lightingPrompt}

${variant.moodPrompt}

${variant.cameraPrompt}

CRITICAL: This variant MUST look distinctly different from other variants.
- Different lighting color temperature
- Different mood/atmosphere
- Different camera distance/framing
- Same person, same clothing, same identity
`
}

// ═══════════════════════════════════════════════════════════════
// VARIANT IDENTITY LOCK (SAME ACROSS ALL VARIANTS)
// ═══════════════════════════════════════════════════════════════

export const VARIANT_IDENTITY_LOCK = `
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    CROSS-VARIANT IDENTITY LOCK                                ║
║                    SAME ACROSS ALL 3 VARIANTS                                 ║
╚═══════════════════════════════════════════════════════════════════════════════╝

These elements MUST be IDENTICAL across Variant A, B, and C:

FACE (IMMUTABLE):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Face pixels → COPY from Image 1 (all variants)
• Eye size → IDENTICAL
• Eye shape → IDENTICAL
• Nose shape → IDENTICAL
• Jawline → IDENTICAL
• Expression → IDENTICAL

HAIR (IMMUTABLE):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Hairline → IDENTICAL
• Hair volume → IDENTICAL
• Beard shape → IDENTICAL

BODY (IMMUTABLE):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Body proportions → IDENTICAL
• Shoulder width → IDENTICAL
• Body volume → IDENTICAL

CLOTHING (IMMUTABLE):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Clothing design → IDENTICAL (from Image 2)
• Clothing color → IDENTICAL
• Clothing fit → IDENTICAL

WHAT CAN CHANGE BETWEEN VARIANTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Lighting color temperature
✓ Lighting direction and quality
✓ Shadow intensity and color
✓ Camera distance/framing
✓ Background atmosphere/mood
✓ Background composition details
`

// ═══════════════════════════════════════════════════════════════
// GET VARIANT BY INDEX
// ═══════════════════════════════════════════════════════════════

export function getVariantSpec(variantIndex: number): VariantSpec {
    if (variantIndex === 0) return VARIANT_A
    if (variantIndex === 1) return VARIANT_B
    return VARIANT_C
}

export function getVariantLabel(variantIndex: number): string {
    return getVariantSpec(variantIndex).label
}

// ═══════════════════════════════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════════════════════════════

export function logVariantGeneration(sessionId: string, variant: VariantSpec): void {
    console.log(`\n🎨 VARIANT ${variant.id}: ${variant.name} [${sessionId}]`)
    console.log(`   ═══════════════════════════════════════`)
    console.log(`   💡 Lighting: ${variant.lighting}`)
    console.log(`   🎭 Mood: ${variant.mood}`)
    console.log(`   📷 Camera: ${variant.camera}`)
    console.log(`   ═══════════════════════════════════════`)
}
