/**
 * PIPELINE V4 - Production-Grade Unified Pipeline
 * 
 * This is the main entry point for the IPCR-X architecture.
 * Routes to FLASH or PRO pipeline based on model selection.
 * Generates 3 variants per request with identity preservation.
 */

import 'server-only'
import { buildFlashPrompt, FLASH_CONFIG, logFlashMode } from './flash-pipeline'
import { buildProPrompt, PRO_CONFIG, logProMode } from './pro-pipeline'
import { logLayerStatus } from './identity-layers'
import { getSceneById, buildScenePrompt, logSceneSpec, type SceneSpecification } from './scene-spec'

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE V4 TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ModelMode = 'flash' | 'pro'
export type Variant = 'A' | 'B' | 'C'

export interface PipelineV4Input {
    sessionId: string
    modelMode: ModelMode
    presetId: string
    userRequest?: string
    variant: Variant
    identitySafe?: boolean
}

export interface PipelineV4Output {
    prompt: string
    temperature: number
    model: string
    variant: Variant
    variantLabel: string
}

export interface MultiVariantOutput {
    variants: PipelineV4Output[]
}

const IDENTITY_SAFE_FORBIDDEN_TERMS = [
    'jawline',
    'cheeks',
    'face shape',
    'expression',
    'handsome',
    'sharp',
    'perfect',
    'symmetry'
]

const IDENTITY_SAFE_FACIAL_DESCRIPTOR_PATTERN =
    /\b(face|facial|jaw|jawline|cheek|cheeks|chin|nose|lips?|eyes?|eyebrow|forehead|temple|expression)\b/gi

function sanitizeIdentitySafePrompt(input?: string): string {
    let cleaned = input || ''
    for (const term of IDENTITY_SAFE_FORBIDDEN_TERMS) {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        cleaned = cleaned.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '')
    }
    cleaned = cleaned.replace(IDENTITY_SAFE_FACIAL_DESCRIPTOR_PATTERN, '')
    return cleaned.replace(/\s+/g, ' ').trim()
}

function assertIdentitySafePrompt(prompt: string): void {
    for (const term of IDENTITY_SAFE_FORBIDDEN_TERMS) {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        if (new RegExp(`\\b${escaped}\\b`, 'i').test(prompt)) {
            throw new Error(`IDENTITY_SAFE_PROMPT_BLOCKED: forbidden term "${term}"`)
        }
    }
    if (IDENTITY_SAFE_FACIAL_DESCRIPTOR_PATTERN.test(prompt)) {
        throw new Error('IDENTITY_SAFE_PROMPT_BLOCKED: facial descriptor detected')
    }
}

function buildIdentitySafePrompt(userRequest?: string): string {
    const base = [
        'Virtual try-on edit.',
        'Image 1 is immutable person source.',
        'Image 2 is garment source.',
        'Replace clothing only.',
        'Preserve pose, body proportions, background, and lighting from Image 1.'
    ].join(' ')

    const safeUser = sanitizeIdentitySafePrompt(userRequest)
    const prompt = `${base}${safeUser ? ` User context: ${safeUser}.` : ''}`.trim()
    const tokenEstimate = Math.ceil(prompt.split(/\s+/).filter(Boolean).length * 1.33)
    if (tokenEstimate >= 1000) {
        throw new Error(`IDENTITY_SAFE_PROMPT_TOO_LONG: estimated ${tokenEstimate} tokens`)
    }
    assertIdentitySafePrompt(prompt)
    return prompt
}

// ═══════════════════════════════════════════════════════════════════════════════
// VARIANT LABELS
// ═══════════════════════════════════════════════════════════════════════════════

const VARIANT_LABELS: Record<Variant, string> = {
    'A': 'Warm • Natural',
    'B': 'Cool • Overcast',
    'C': 'Dramatic • Contrast'
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PIPELINE BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

export function buildPipelineV4(input: PipelineV4Input): PipelineV4Output {
    const { sessionId, modelMode, presetId, userRequest, variant, identitySafe = false } = input

    console.log(`\n${'═'.repeat(80)}`)
    console.log(`🚀 PIPELINE V4 STARTING [${sessionId}]`)
    console.log(`   Model: ${modelMode.toUpperCase()}`)
    console.log(`   Preset: ${presetId}`)
    console.log(`   Variant: ${variant} (${VARIANT_LABELS[variant]})`)
    console.log(`${'═'.repeat(80)}`)

    // Log layer status
    logLayerStatus(sessionId)

    // Get scene specification
    const sceneSpec = getSceneById(presetId)
    let presetPrompt: string

    if (sceneSpec) {
        logSceneSpec(sceneSpec)
        presetPrompt = buildScenePrompt(sceneSpec)
    } else {
        // Fallback to simple preset string
        presetPrompt = `Scene: ${presetId}\n(No structural specification available)`
        console.log(`⚠️ No SceneSpec for preset: ${presetId}, using fallback`)
    }

    if (identitySafe) {
        console.log('INFLUENCER TRY-ON IDENTITY SAFE MODE: ACTIVE')
        if (modelMode === 'flash') {
            throw new Error('FINAL_RENDER_FORBIDDEN: flash final render is not allowed for influencer try-on')
        }

        // IDENTITY-SAFE MODE: DISABLED TO PREVENT FACE DRIFT
        const prompt = buildIdentitySafePrompt(userRequest)
        const temperature = PRO_CONFIG.temperature
        const model = PRO_CONFIG.model

        return {
            prompt,
            temperature,
            model,
            variant,
            variantLabel: VARIANT_LABELS[variant]
        }
    }

    // Build model-specific prompt
    let prompt: string
    let temperature: number
    let model: string

    if (modelMode === 'flash') {
        prompt = buildFlashPrompt({
            sessionId,
            variant,
            presetPrompt,
            userRequest
        })
        temperature = FLASH_CONFIG.temperature
        model = FLASH_CONFIG.model
    } else {
        prompt = buildProPrompt({
            sessionId,
            variant,
            presetPrompt,
            userRequest
        })
        temperature = PRO_CONFIG.temperature
        model = PRO_CONFIG.model
    }

    console.log(`\n✅ PIPELINE V4 OUTPUT READY`)
    console.log(`   Prompt length: ${prompt.length} chars`)
    console.log(`   Temperature: ${temperature}`)
    console.log(`   Model: ${model}`)

    return {
        prompt,
        temperature,
        model,
        variant,
        variantLabel: VARIANT_LABELS[variant]
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-VARIANT BUILDER (3 outputs)
// ═══════════════════════════════════════════════════════════════════════════════

export function buildMultiVariantPipeline(
    sessionId: string,
    modelMode: ModelMode,
    presetId: string,
    userRequest?: string,
    identitySafe: boolean = false
): MultiVariantOutput {
    const variants: Variant[] = identitySafe ? ['A'] : ['A', 'B', 'C']

    console.log(`\n${'═'.repeat(80)}`)
    console.log(`🎯 MULTI-VARIANT PIPELINE [${sessionId}]`)
    console.log(`   Generating ${variants.length} variant(s)`)
    console.log(`${'═'.repeat(80)}`)

    const outputs = variants.map(variant =>
        buildPipelineV4({
            sessionId: `${sessionId}_v${variant}`,
            modelMode,
            presetId,
            userRequest,
            variant,
            identitySafe
        })
    )

    console.log(`\n✅ ALL 3 VARIANTS READY`)

    return { variants: outputs }
}

// ═══════════════════════════════════════════════════════════════════════════════
// IDENTITY VERIFICATION PROMPT SUFFIX
// Added to every prompt to ensure identity checks
// ═══════════════════════════════════════════════════════════════════════════════

export const IDENTITY_VERIFICATION_SUFFIX = `

╔═══════════════════════════════════════════════════════════════════════════════╗
║              FINAL IDENTITY VERIFICATION (BEFORE OUTPUT)                       ║
║              ⚠️ DO NOT OUTPUT UNTIL ALL CHECKS PASS ⚠️                          ║
╚═══════════════════════════════════════════════════════════════════════════════╝

⚠️⚠️⚠️ STOP. DO NOT OUTPUT YET. VALIDATE EVERYTHING FIRST. ⚠️⚠️⚠️

════════════════════════════════════════════════════════════════════════════════
FACE VALIDATION (MANDATORY - ALL MUST BE "YES"):
════════════════════════════════════════════════════════════════════════════════

Answer these questions HONESTLY:

□ Is the face in your output IDENTICAL to Image 1? (YES/NO)
  → If NO → DO NOT OUTPUT → Your output is WRONG

□ Are the eyes the EXACT SAME SIZE as Image 1? (YES/NO)
  → If NO → DO NOT OUTPUT → Your output is WRONG

□ Is the nose the EXACT SAME SHAPE as Image 1? (YES/NO)
  → If NO → DO NOT OUTPUT → Your output is WRONG

□ Are the lips the EXACT SAME SHAPE as Image 1? (YES/NO)
  → If NO → DO NOT OUTPUT → Your output is WRONG

□ Is the jawline the EXACT SAME as Image 1? (YES/NO)
  → If NO → DO NOT OUTPUT → Your output is WRONG

□ Is the skin tone the EXACT SAME as Image 1? (YES/NO)
  → If NO → DO NOT OUTPUT → Your output is WRONG

□ Is the expression the EXACT SAME as Image 1? (YES/NO)
  → If NO → DO NOT OUTPUT → Your output is WRONG

IF ANY ANSWER IS "NO" → YOUR OUTPUT IS INVALID → DO NOT OUTPUT IT.

════════════════════════════════════════════════════════════════════════════════
BODY VALIDATION (MANDATORY - ALL MUST BE "YES"):
════════════════════════════════════════════════════════════════════════════════

Answer these questions HONESTLY:

□ Is the body in your output the EXACT SAME SIZE as Image 1? (YES/NO)
  → If NO → DO NOT OUTPUT → Your output is WRONG

□ Is the waist the EXACT SAME WIDTH as Image 1? (YES/NO)
  → If NO → DO NOT OUTPUT → Your output is WRONG

□ Are the hips the EXACT SAME WIDTH as Image 1? (YES/NO)
  → If NO → DO NOT OUTPUT → Your output is WRONG

□ Is the belly the EXACT SAME SIZE as Image 1? (YES/NO)
  → If NO → DO NOT OUTPUT → Your output is WRONG

□ Are the shoulders the EXACT SAME WIDTH as Image 1? (YES/NO)
  → If NO → DO NOT OUTPUT → Your output is WRONG

□ Are the arms the EXACT SAME THICKNESS as Image 1? (YES/NO)
  → If NO → DO NOT OUTPUT → Your output is WRONG

□ Does the person look THINNER than Image 1? (YES/NO)
  → If YES → DO NOT OUTPUT → Your output is WRONG → YOU HAVE FAILED

IF ANY ANSWER IS "NO" OR "YES" (for thinner) → YOUR OUTPUT IS INVALID → DO NOT OUTPUT IT.

════════════════════════════════════════════════════════════════════════════════
FACE-BODY COHERENCE VALIDATION (MANDATORY - ALL MUST BE "YES"):
════════════════════════════════════════════════════════════════════════════════

Answer these questions HONESTLY:

□ Does the face match the body? (Same person?) (YES/NO)
  → If NO → DO NOT OUTPUT → Your output is WRONG

□ If face is full → is body full? (YES/NO)
  → If NO → DO NOT OUTPUT → Your output is WRONG

□ If face has double chin → does body show weight? (YES/NO)
  → If NO → DO NOT OUTPUT → Your output is WRONG

IF ANY ANSWER IS "NO" → YOUR OUTPUT IS INVALID → DO NOT OUTPUT IT.

════════════════════════════════════════════════════════════════════════════════
BLENDING VALIDATION (MANDATORY - ALL MUST BE "NO"):
════════════════════════════════════════════════════════════════════════════════

Answer these questions HONESTLY:

□ Does the face look "pasted on"? (YES/NO)
  → If YES → DO NOT OUTPUT → Your output is WRONG

□ Is there a visible seam at the neck? (YES/NO)
  → If YES → DO NOT OUTPUT → Your output is WRONG

□ Is the face lighting different from body lighting? (YES/NO)
  → If YES → DO NOT OUTPUT → Your output is WRONG

IF ANY ANSWER IS "YES" → YOUR OUTPUT IS INVALID → DO NOT OUTPUT IT.

════════════════════════════════════════════════════════════════════════════════
FINAL DECISION:
════════════════════════════════════════════════════════════════════════════════

ONLY OUTPUT THE IMAGE IF:
✓ ALL face validations passed (all YES)
✓ ALL body validations passed (all YES, thinner = NO)
✓ ALL face-body coherence validations passed (all YES)
✓ ALL blending validations passed (all NO)

IF ANY VALIDATION FAILED → DO NOT OUTPUT → REGENERATE.

DO NOT OUTPUT AN INVALID IMAGE.
DO NOT OUTPUT IF FACE OR BODY CHANGED.
DO NOT OUTPUT IF VALIDATIONS FAILED.

ONLY OUTPUT IF EVERYTHING IS PERFECT.
`

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPERATURE ENFORCEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export function enforceTemperature(modelMode: ModelMode): number {
    if (modelMode === 'flash') {
        return FLASH_CONFIG.temperature  // 0.01
    } else {
        return PRO_CONFIG.temperature    // 0.04
    }
}

export function getMaxTemperature(modelMode: ModelMode): number {
    if (modelMode === 'flash') {
        return FLASH_CONFIG.maxTemperature  // 0.01
    } else {
        return PRO_CONFIG.maxTemperature    // 0.04
    }
}
