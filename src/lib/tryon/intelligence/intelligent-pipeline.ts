/**
 * INTELLIGENT PIPELINE - Main Orchestrator
 * 
 * Combines all anti-hallucination modules into a single intelligent pipeline.
 * Implements RAG approach, chain-of-thought, validation, and retry logic.
 */

import 'server-only'
import { classifyGarment, generateGarmentGroundedPrompt, GarmentClassification } from './garment-classifier'
import { analyzeUserImage, generateUserGroundedPrompt, UserAnalysis } from './user-analyzer'
import { buildChainOfThoughtPrompt, buildSelfVerificationPrompt } from './chain-of-thought'
import { getPhotographicRealismPrompt } from './photographic-realism'
import { validateFaceMatch, FaceValidationResult } from './face-guardrail'
import { validateGarmentMatch, GarmentValidationResult } from './garment-guardrail'
import {
    initRetryContext,
    updateContextAfterFailure,
    detectFailures,
    shouldRetry,
    generateRetryEmphasis,
    logOrchestratorStatus,
    RetryContext,
    OrchestratorResult
} from './retry-orchestrator'

// ═══════════════════════════════════════════════════════════════
// INTELLIGENT PIPELINE TYPES
// ═══════════════════════════════════════════════════════════════

export interface IntelligentPipelineInput {
    userImageBase64: string
    garmentImageBase64: string
    enableValidation: boolean
    maxRetries: number
}

export interface IntelligentPipelineContext {
    userAnalysis: UserAnalysis
    garmentClassification: GarmentClassification
    groundedPrompt: string
    retryContext: RetryContext
}

export interface GenerationResult {
    imageBase64: string
    faceValidation: FaceValidationResult | null
    garmentValidation: GarmentValidationResult | null
    isValid: boolean
}

// ═══════════════════════════════════════════════════════════════
// PHASE 1: DATA EXTRACTION (RAG)
// ═══════════════════════════════════════════════════════════════

export async function extractGroundedData(
    userImageBase64: string,
    garmentImageBase64: string
): Promise<{ userAnalysis: UserAnalysis; garmentClassification: GarmentClassification }> {
    console.log('\n' + '═'.repeat(80))
    console.log('PHASE 1: EXTRACTING GROUNDED DATA (RAG Approach)')
    console.log('═'.repeat(80))

    // Run both analyses in parallel for speed
    const [userAnalysis, garmentClassification] = await Promise.all([
        analyzeUserImage(userImageBase64),
        classifyGarment(garmentImageBase64)
    ])

    console.log('\n📊 EXTRACTION COMPLETE:')
    console.log(`   User: ${userAnalysis.face.shape} face, ${userAnalysis.body.type} body, ${userAnalysis.pose.type}`)
    console.log(`   Garment: ${garmentClassification.category}, hemline at ${garmentClassification.hemline_position}`)

    return { userAnalysis, garmentClassification }
}

// ═══════════════════════════════════════════════════════════════
// PHASE 2: BUILD GROUNDED PROMPT
// ═══════════════════════════════════════════════════════════════

export function buildIntelligentPrompt(
    userAnalysis: UserAnalysis,
    garmentClassification: GarmentClassification,
    retryContext: RetryContext
): string {
    console.log('\n' + '═'.repeat(80))
    console.log('PHASE 2: BUILDING GROUNDED PROMPT')
    console.log('═'.repeat(80))

    // Combine all prompt components
    const userPrompt = generateUserGroundedPrompt(userAnalysis)
    const garmentPrompt = generateGarmentGroundedPrompt(garmentClassification)
    const chainOfThought = buildChainOfThoughtPrompt(userAnalysis, garmentClassification)
    const selfVerification = buildSelfVerificationPrompt()
    const photographicRealism = getPhotographicRealismPrompt()
    const retryEmphasis = generateRetryEmphasis(retryContext)

    const fullPrompt = `
${retryEmphasis}

${userPrompt}

${garmentPrompt}

${chainOfThought}

${photographicRealism}

${selfVerification}

════════════════════════════════════════════════════════════════════════════════
FINAL INSTRUCTION
════════════════════════════════════════════════════════════════════════════════

Generate an image of the person from Image 1 wearing the garment from Image 2.

CRITICAL REQUIREMENTS (from extracted data):
1. Face MUST be: ${userAnalysis.face.shape} shape, ${userAnalysis.face.skin_tone_hex} skin tone
2. Body MUST be: ${userAnalysis.body.type} type, ${userAnalysis.body.shoulder_width} shoulders
3. Pose MUST be: ${userAnalysis.pose.type}
4. Garment MUST be: ${garmentClassification.category}
5. Hemline MUST be at: ${garmentClassification.hemline_position}
6. Pattern colors MUST be: ${garmentClassification.pattern_colors.join(', ')}

This is NOT a suggestion. These are HARD REQUIREMENTS extracted from the input images.
`.trim()

    console.log(`   ✓ Prompt built: ${fullPrompt.length} characters`)
    console.log(`   ✓ User data grounded: face, body, pose, accessories`)
    console.log(`   ✓ Garment data grounded: type, hemline, pattern, colors`)

    return fullPrompt
}

// ═══════════════════════════════════════════════════════════════
// PHASE 3: VALIDATION
// ═══════════════════════════════════════════════════════════════

export async function validateGeneratedImage(
    originalUserImage: string,
    originalGarmentImage: string,
    generatedImage: string,
    garmentClassification: GarmentClassification
): Promise<{ faceResult: FaceValidationResult; garmentResult: GarmentValidationResult }> {
    console.log('\n' + '═'.repeat(80))
    console.log('PHASE 3: VALIDATING GENERATED IMAGE')
    console.log('═'.repeat(80))

    // Run both validations in parallel
    const [faceResult, garmentResult] = await Promise.all([
        validateFaceMatch(originalUserImage, generatedImage),
        validateGarmentMatch(
            originalGarmentImage,
            generatedImage,
            garmentClassification.category,
            garmentClassification.hemline_position
        )
    ])

    console.log('\n📊 VALIDATION RESULTS:')
    console.log(`   Face: ${faceResult.is_valid ? '✅ VALID' : '❌ REJECTED'} (${faceResult.similarity_score}%)`)
    console.log(`   Garment: ${garmentResult.is_valid ? '✅ VALID' : '❌ REJECTED'}`)

    return { faceResult, garmentResult }
}

// ═══════════════════════════════════════════════════════════════
// FULL INTELLIGENT PIPELINE (Export for use in renderer)
// ═══════════════════════════════════════════════════════════════

export async function runIntelligentPreAnalysis(
    userImageBase64: string,
    garmentImageBase64: string
): Promise<IntelligentPipelineContext> {
    console.log('\n' + '═'.repeat(80))
    console.log('🧠 INTELLIGENT PIPELINE: Starting pre-analysis')
    console.log('═'.repeat(80))

    const startTime = Date.now()

    // Phase 1: Extract data
    const { userAnalysis, garmentClassification } = await extractGroundedData(
        userImageBase64,
        garmentImageBase64
    )

    // Phase 2: Build grounded prompt
    const retryContext = initRetryContext(3)
    const groundedPrompt = buildIntelligentPrompt(userAnalysis, garmentClassification, retryContext)

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`\n✅ Pre-analysis complete in ${elapsed}s`)

    return {
        userAnalysis,
        garmentClassification,
        groundedPrompt,
        retryContext
    }
}

export async function validateAndDecideRetry(
    originalUserImage: string,
    originalGarmentImage: string,
    generatedImage: string,
    context: IntelligentPipelineContext
): Promise<{
    isValid: boolean
    shouldRetry: boolean
    newContext: IntelligentPipelineContext
    faceResult: FaceValidationResult
    garmentResult: GarmentValidationResult
}> {
    // Phase 3: Validate
    const { faceResult, garmentResult } = await validateGeneratedImage(
        originalUserImage,
        originalGarmentImage,
        generatedImage,
        context.garmentClassification
    )

    const isValid = faceResult.is_valid && garmentResult.is_valid
    const failures = detectFailures(faceResult, garmentResult)

    // Decide retry
    const needsRetry = !isValid && context.retryContext.attempt < context.retryContext.maxAttempts

    // Update context for retry
    let newContext = context
    if (needsRetry) {
        const updatedRetryContext = updateContextAfterFailure(context.retryContext, failures)
        const updatedPrompt = buildIntelligentPrompt(
            context.userAnalysis,
            context.garmentClassification,
            updatedRetryContext
        )
        newContext = {
            ...context,
            retryContext: updatedRetryContext,
            groundedPrompt: updatedPrompt
        }
        logOrchestratorStatus(newContext.retryContext)
    }

    return {
        isValid,
        shouldRetry: needsRetry,
        newContext,
        faceResult,
        garmentResult
    }
}

// ═══════════════════════════════════════════════════════════════
// INDEX EXPORT (Re-export all modules)
// ═══════════════════════════════════════════════════════════════

export { classifyGarment } from './garment-classifier'
export type { GarmentClassification } from './garment-classifier'
export { analyzeUserImage } from './user-analyzer'
export type { UserAnalysis } from './user-analyzer'
export { validateFaceMatch } from './face-guardrail'
export type { FaceValidationResult } from './face-guardrail'
export { validateGarmentMatch } from './garment-guardrail'
export type { GarmentValidationResult } from './garment-guardrail'
export { PHOTOGRAPHIC_REALISM_PROMPT } from './photographic-realism'

