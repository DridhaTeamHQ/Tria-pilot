/**
 * CREATIVE ORCHESTRATOR - VALIDATORS
 * 
 * Strict Zod schema validation for Creative Contracts.
 * Rejects malformed outputs. Enforces confidence failsafe.
 * 
 * Any contract that fails validation is INVALID.
 * Any contract with confidence < 60 triggers failsafe behavior.
 */

import { z } from 'zod'
import { ContractValidationError, LowConfidenceError, type CreativeContract } from './types'

// ═══════════════════════════════════════════════════════════════════════════════
// ZOD SCHEMA DEFINITION (LOCKED)
// ═══════════════════════════════════════════════════════════════════════════════

const SubjectSchema = z.object({
    type: z.string(),
    source: z.string(),
    influencer_id: z.string().optional(),
    gender: z.string().optional(),
})

const ProductSchema = z.object({
    category: z.string(),
    visibility_score: z.number().min(0).max(1),
    logo_visibility: z.string(),
})

const PoseSchema = z.object({
    allowed_changes: z.boolean(),
    stance: z.string(),
    framing: z.string(),
    camera_angle: z.string(),
})

const EnvironmentSchema = z.object({
    type: z.string(),
    background: z.string(),
})

const LightingSchema = z.object({
    style: z.string(),
    contrast: z.string(),
    temperature: z.string(),
})

const CameraSchema = z.object({
    device_logic: z.string(),
    lens_style: z.string(),
    framing_notes: z.string(),
})

const ImperfectionsSchema = z.object({
    grain: z.string(),
    asymmetry: z.boolean(),
})

export const CreativeContractSchema = z.object({
    ad_type: z.string(),
    brand_tier: z.string(),
    subject: SubjectSchema,
    product: ProductSchema,
    pose: PoseSchema,
    environment: EnvironmentSchema,
    lighting: LightingSchema,
    camera: CameraSchema,
    texture_priority: z.array(z.string()),
    color_palette: z.string(),
    imperfections: ImperfectionsSchema,
    negative_constraints: z.array(z.string()),
    confidence_score: z.number().min(0).max(100),
})

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate a raw JSON object against the Creative Contract schema.
 * Throws ContractValidationError if invalid.
 * Throws LowConfidenceError if confidence < 60.
 */
export function validateContract(contract: unknown): CreativeContract {
    // Step 1: Parse with Zod
    const result = CreativeContractSchema.safeParse(contract)

    if (!result.success) {
        console.error('[Validator] Contract validation failed:', result.error.issues)
        throw new ContractValidationError(
            'Creative contract does not match required schema',
            result.error.issues
        )
    }

    const validContract = result.data as CreativeContract

    // Step 2: Confidence failsafe check
    if (validContract.confidence_score < 60) {
        console.warn(`[Validator] Low confidence score: ${validContract.confidence_score}`)
        throw new LowConfidenceError(
            `Confidence score ${validContract.confidence_score} is below threshold (60). Use safe preset or ask user for clarification.`,
            validContract.confidence_score,
            'use_safe_preset'
        )
    }

    // Step 3: Business rule validations
    validateBusinessRules(validContract)

    return validContract
}

/**
 * Validate business rules that go beyond schema structure.
 */
function validateBusinessRules(contract: CreativeContract): void {
    // Rule 1: Real influencer must have pose locked
    if (contract.subject.source === 'real_influencer' && contract.pose.allowed_changes) {
        console.warn('[Validator] Real influencer should have pose locked - auto-correcting')
        contract.pose.allowed_changes = false
    }

    // Rule 2: Must have at least one negative constraint
    if (contract.negative_constraints.length === 0) {
        console.warn('[Validator] No negative constraints provided - adding defaults')
        contract.negative_constraints = [
            'no_plastic_skin',
            'no_hdr',
            'no_cgi_gloss',
        ]
    }

    // Rule 3: Texture priority must not be empty
    if (contract.texture_priority.length === 0) {
        contract.texture_priority = ['skin', 'fabric', 'product_surface']
    }

    // Rule 4: Product visibility score bounds check (already in schema, but double-check)
    if (contract.product.visibility_score < 0) contract.product.visibility_score = 0
    if (contract.product.visibility_score > 1) contract.product.visibility_score = 1
}

/**
 * Try to parse and validate a JSON string.
 * Returns the validated contract or throws an error.
 */
export function parseAndValidateContract(jsonString: string): CreativeContract {
    let parsed: unknown

    try {
        // Clean up any markdown or extra content from GPT output
        let cleanJson = jsonString.trim()

        // Remove markdown code blocks if present
        if (cleanJson.startsWith('```json')) {
            cleanJson = cleanJson.slice(7)
        } else if (cleanJson.startsWith('```')) {
            cleanJson = cleanJson.slice(3)
        }
        if (cleanJson.endsWith('```')) {
            cleanJson = cleanJson.slice(0, -3)
        }

        cleanJson = cleanJson.trim()
        parsed = JSON.parse(cleanJson)
    } catch (error) {
        throw new ContractValidationError(
            'Failed to parse JSON from GPT-4o-mini output',
            { raw: jsonString.slice(0, 500), error: String(error) }
        )
    }

    return validateContract(parsed)
}

/**
 * Check if a contract requires user clarification based on various signals.
 */
export function requiresUserClarification(contract: CreativeContract): {
    required: boolean
    reasons: string[]
} {
    const reasons: string[] = []

    // Low confidence
    if (contract.confidence_score < 70) {
        reasons.push(`Low confidence score (${contract.confidence_score})`)
    }

    // Ambiguous product visibility
    if (contract.product.visibility_score >= 0.4 && contract.product.visibility_score <= 0.5) {
        reasons.push('Product visibility is borderline - clarify dominant vs lifestyle')
    }

    // Missing influencer details when expected
    if (contract.subject.type === 'human' && contract.subject.source === 'ai_influencer' && !contract.subject.influencer_id) {
        reasons.push('AI influencer selected but no specific ID provided')
    }

    return {
        required: reasons.length > 0,
        reasons,
    }
}
