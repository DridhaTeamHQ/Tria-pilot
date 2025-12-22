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
    const { sessionId, modelMode, presetId, userRequest, variant } = input

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
    userRequest?: string
): MultiVariantOutput {
    const variants: Variant[] = ['A', 'B', 'C']

    console.log(`\n${'═'.repeat(80)}`)
    console.log(`🎯 MULTI-VARIANT PIPELINE [${sessionId}]`)
    console.log(`   Generating 3 variants: A (Warm), B (Cool), C (Dramatic)`)
    console.log(`${'═'.repeat(80)}`)

    const outputs = variants.map(variant =>
        buildPipelineV4({
            sessionId: `${sessionId}_v${variant}`,
            modelMode,
            presetId,
            userRequest,
            variant
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

════════════════════════════════════════════════════════════════════════════════
FINAL IDENTITY VERIFICATION (BEFORE OUTPUT):
════════════════════════════════════════════════════════════════════════════════

Before finalizing your output, verify:

□ FACE CHECK:
  - Is the face EXACTLY the same as Image 1?
  - Are the eyes the SAME SIZE as Image 1?
  - Is the nose the SAME SHAPE as Image 1?
  - Is the jaw the SAME SHAPE as Image 1?
  
  If ANY answer is NO → YOU MUST REDO THE GENERATION

□ BODY CHECK:
  - Is the body the SAME SIZE as Image 1?
  - Is the waist the SAME WIDTH as Image 1?
  - Are the hips the SAME WIDTH as Image 1?
  - Is the belly the SAME SIZE as Image 1?
  
  If ANY answer is NO → YOU MUST REDO THE GENERATION
  If the person looks THINNER → YOU HAVE FAILED

□ BLENDING CHECK:
  - Does the face look "pasted on"?
  - Is there a visible seam at the neck?
  - Is the face lighting different from body lighting?
  
  If ANY answer is YES → YOU MUST REDO THE GENERATION

ONLY output an image that passes ALL checks.
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
