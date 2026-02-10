/**
 * CREATIVE ORCHESTRATOR - MAIN MODULE
 * 
 * "We are not building a prompt generator.
 * We are building a creative decision engine that compiles brand intent,
 * presets, and image analysis into a strict JSON contract for NanoBanana Pro."
 * 
 * This is the main entry point for the Creative Orchestrator.
 * 
 * Flow:
 * 1. Analyze input images (GPT-4o-mini vision)
 * 2. Build Creative Contract (GPT-4o-mini as Creative Director)
 * 3. Validate contract (Zod schema + business rules)
 * 4. Render with NanoBanana Pro (constrained generation)
 */

// Re-export types
export * from './types'

// Re-export presets
export {
    AD_GRADE_PRESETS as PRESETS,
    SAFE_PRESET,
    getPreset,
    getAllPresets,
    FEW_SHOT_EXAMPLES,
    type AdGradePreset
} from './presets'

// Re-export validators
export {
    validateContract,
    parseAndValidateContract,
    requiresUserClarification,
    CreativeContractSchema
} from './validators'

// Import internal modules
import { analyzeInputImages, detectInfluencerSource } from './analyze_inputs'
import { buildCreativeContract } from './build_prompt_json'
import { renderWithNanoBanana } from './render'
import { getPreset } from './presets'
import { AI_INFLUENCERS } from '@/lib/constants/ai-influencers' // Import shared list
import type {
    OrchestratorInput,
    CreativeContract,
    ImageAnalysisResult,
    PresetId
} from './types'
import { ContractValidationError, LowConfidenceError } from './types'

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ORCHESTRATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface OrchestratorResult {
    image: string              // Generated ad image (base64)
    contract: CreativeContract // The compiled creative contract
    analysis: ImageAnalysisResult // Image analysis results
    metadata: {
        presetUsed: PresetId
        modelUsed: string
        confidenceScore: number
        warnings: string[]
    }
}

/**
 * Main orchestration function.
 * Takes raw inputs and produces a brand-grade ad image.
 * 
 * This is the ONLY function external code should call.
 */
export async function orchestrateAdCreation(
    input: OrchestratorInput
): Promise<OrchestratorResult> {
    const warnings: string[] = []

    console.log('═══════════════════════════════════════════════════════════════')
    console.log('🎨 CREATIVE ORCHESTRATOR - Starting ad generation')
    console.log(`   Preset: ${input.presetId}`)
    console.log(`   Has Influencer: ${!!input.influencerImage}`)
    console.log(`   AI Influencer ID: ${input.aiInfluencerId || 'none'}`)
    console.log('═══════════════════════════════════════════════════════════════')

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 1: Analyze Input Images
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n📸 Step 1: Analyzing input images...')

    let imageAnalysis: ImageAnalysisResult

    // Handle AI Influencer lookup if no image provided but ID exists
    let aiInfluencerContext = null
    if (!input.influencerImage && input.aiInfluencerId) {
        const found = AI_INFLUENCERS.find(i => i.id === input.aiInfluencerId)
        if (found) {
            console.log(`   ✓ Found AI Influencer metadata: ${found.name} (${found.style})`)
            aiInfluencerContext = found
        } else {
            console.warn(`   ⚠️ AI Influencer ID ${input.aiInfluencerId} not found in database.`)
        }
    }

    try {
        imageAnalysis = await analyzeInputImages(
            input.productImage,
            input.influencerImage
        )

        // INJECT MOCK ANALYSIS FOR AI INFLUENCER IF MISSING
        if (!imageAnalysis.influencer && aiInfluencerContext) {
            console.log('   ✓ Injecting AI Influencer context into analysis result...')
            imageAnalysis.influencer = {
                source: 'ai_influencer', // Correct type
                gender: aiInfluencerContext.gender === 'other' ? 'unisex' : aiInfluencerContext.gender,
                poseDescription: 'adaptable',
                expression: 'neutral',
                lightingFamily: 'adaptable',
                cameraLogic: 'adaptable',
                eraSignals: [],
                styleTags: [aiInfluencerContext.style, aiInfluencerContext.category],
                visualDescription: aiInfluencerContext.visual_description || aiInfluencerContext.style
            }
        }

        console.log('   ✓ Product category:', imageAnalysis.product.category)
        if (imageAnalysis.influencer) {
            console.log('   ✓ Influencer source:', imageAnalysis.influencer.source)
        }
    } catch (error) {
        console.error('   ✗ Image analysis failed:', error)
        throw error
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 2: Build Creative Contract
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n📋 Step 2: Building creative contract...')

    let contract: CreativeContract
    try {
        contract = await buildCreativeContract(input, imageAnalysis)
        console.log('   ✓ Contract built successfully')
        console.log('   ✓ Ad type:', contract.ad_type)
        console.log('   ✓ Confidence:', contract.confidence_score)
    } catch (error) {
        if (error instanceof LowConfidenceError) {
            console.warn('   ⚠ Low confidence, using safe preset')
            warnings.push(`Low confidence (${error.confidenceScore}), used safe preset`)
        }
        throw error
    }

    // Check for warnings
    if (contract.confidence_score < 75) {
        warnings.push(`Moderate confidence score (${contract.confidence_score})`)
    }

    if (contract.subject.source === 'real_influencer' && contract.pose.allowed_changes) {
        console.warn('   ⚠ Real influencer with pose changes allowed - auto-correcting')
        contract.pose.allowed_changes = false
        warnings.push('Pose locked for real influencer')
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 3: Render with NanoBanana Pro
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n🎨 Step 3: Rendering with NanoBanana Pro...')

    let generatedImage: string
    try {
        generatedImage = await renderWithNanoBanana(
            contract,
            input.productImage,
            input.influencerImage
        )
        console.log('   ✓ Image generated successfully')
    } catch (error) {
        console.error('   ✗ Render failed:', error)
        throw error
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 4: Return Result
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════════════════')
    console.log('✅ CREATIVE ORCHESTRATOR - Complete')
    console.log('═══════════════════════════════════════════════════════════════\n')

    // Determine which model was used based on contract
    const modelUsed = (
        contract.brand_tier === 'luxury' ||
        contract.confidence_score >= 85 ||
        contract.subject.source === 'real_influencer'
    ) ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image'

    return {
        image: generatedImage,
        contract,
        analysis: imageAnalysis,
        metadata: {
            presetUsed: input.presetId,
            modelUsed,
            confidenceScore: contract.confidence_score,
            warnings,
        },
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { analyzeInputImages, detectInfluencerSource } from './analyze_inputs'
export { buildCreativeContract } from './build_prompt_json'
export { renderWithNanoBanana } from './render'

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY COMPATIBILITY (for gradual migration)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map old preset IDs to new ones for backward compatibility.
 */
export function mapLegacyPreset(legacyId: string): PresetId {
    const mapping: Record<string, PresetId> = {
        'UGC_CANDID': 'UGC_CANDID_AD_V1',
        'PRODUCT_LIFESTYLE': 'PRODUCT_LIFESTYLE_AD_V1',
        'STUDIO_POSTER': 'STUDIO_POSTER_AD_V1',
        'PREMIUM_EDITORIAL': 'PREMIUM_EDITORIAL_AD_V1',
    }

    return mapping[legacyId] || 'PRODUCT_LIFESTYLE_AD_V1'
}
