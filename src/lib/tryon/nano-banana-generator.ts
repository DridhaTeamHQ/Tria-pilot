/**
 * NANO BANANA PRO GENERATOR (Stage 3)
 * 
 * Production image generator using Nano Banana Pro (Gemini) ONLY.
 * This is the SOLE image generation model in the production pipeline.
 * 
 * CORE PRINCIPLE:
 * - Nano Banana is UNTRUSTED for face/body preservation
 * - The pipeline ENFORCES truth via face reintegration
 * - Generator suggests pixels, pipeline decides reality
 * 
 * FORBIDDEN BEHAVIORS:
 * - Face generation/modification
 * - Body reshaping
 * - Pose correction
 * - Beautification
 */

import { GoogleGenAI } from '@google/genai'
import { getGeminiKey } from '@/lib/config/api-keys'
// GPT Image experiment toggle
import {
    isGPTImageEnabled,
    generateWithGPTImage as generateWithGPTImageAPI,
    logModelSelection,
    getImageGenerationModelName
} from './gpt-image-generator'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type QualityTier = 'low' | 'medium' | 'high'

export interface NanoBananaParams {
    personImageBase64: string      // Image 1: Person (identity reference)
    garmentImageBase64: string     // Image 2: Garment (visual only)
    prompt: string                 // Strict try-on prompt from Stage 2
    qualityTier?: QualityTier      // Cost tier (default: low)
    isRetry?: boolean              // True if this is a retry after drift detection
}

export interface NanoBananaResult {
    image: string                  // Base64 encoded result image
    generationTimeMs: number       // Time taken for generation
    qualityTier: QualityTier       // Quality tier used
    promptCleaned: boolean         // Whether forbidden terms were removed
    warning?: string               // Any warnings about the generation
}

// ═══════════════════════════════════════════════════════════════════════════
// FORBIDDEN TERMS (AUTOMATICALLY STRIPPED)
// Nano Banana interprets permission more strongly than instruction.
// These terms give permission to "help" — which causes identity drift.
// ═══════════════════════════════════════════════════════════════════════════

const FORBIDDEN_TERMS = [
    // Core forbidden
    'perfect',
    'enhance',
    'improve',
    'editorial',
    'fashion',
    'model',
    'studio',
    'portrait',
    'artistic',
    'aesthetic',
    'creative',
    'clean',
    'sharp',
    'elegant',
    'symmetry',
    'proportions',
    'ideal',
    // Extended forbidden
    'beautif',       // Catches beautify, beautiful, beautification
    'flawless',
    'stunning',
    'gorgeous',
    'glamour',
    'professional',
    'high fashion',
    'vogue',
    'magazine',
    'retouched',
    'airbrushed',
    'idealized',
    'perfected',
    'mannequin',
    'refined',
    'polished',
    'sleek',
    'crisp',
    'HDR',
    'dramatic',
    'cinematic',
    'photoshoot',
    'catalog',
    'lookbook',
    'flattering',
    'slimming',
    'toning',
    'smoothing',
]

// ═══════════════════════════════════════════════════════════════════════════
// QUALITY TIER CONFIG
// Temperature MUST be 0.01-0.05 for identity safety
// Higher temperature = more hallucination = identity drift
// ═══════════════════════════════════════════════════════════════════════════

const QUALITY_CONFIG: Record<QualityTier, {
    model: string
    temperature: number
    maxTokens: number
    canRetry: boolean
}> = {
    low: {
        model: 'gemini-2.0-flash-exp',
        temperature: 0.01,                // MINIMUM — most identity-safe
        maxTokens: 4096,
        canRetry: true
    },
    medium: {
        model: 'gemini-2.0-flash-exp',
        temperature: 0.03,                // Still very low
        maxTokens: 8192,
        canRetry: true
    },
    high: {
        model: 'gemini-2.0-flash-exp',
        temperature: 0.05,                // Maximum allowed — NO retries
        maxTokens: 8192,
        canRetry: false
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PROMPT CLEANING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Strip forbidden terms from prompt
 * Returns cleaned prompt and whether cleaning occurred
 */
export function cleanPromptForNanoBanana(prompt: string): {
    cleaned: string
    wasModified: boolean
    termsRemoved: string[]
} {
    let cleaned = prompt
    const termsRemoved: string[] = []

    for (const term of FORBIDDEN_TERMS) {
        const regex = new RegExp(term, 'gi')
        if (regex.test(cleaned)) {
            termsRemoved.push(term)
            cleaned = cleaned.replace(regex, '')
        }
    }

    // Clean up double spaces and formatting issues
    cleaned = cleaned.replace(/\s+/g, ' ').trim()

    return {
        cleaned,
        wasModified: termsRemoved.length > 0,
        termsRemoved
    }
}

/**
 * Build the JSON-structured enforcement prompt for Nano Banana Pro
 * 
 * Uses structured JSON for stricter constraint parsing and face fidelity.
 */
function buildEnforcementPrompt(userPrompt: string, isRetry: boolean = false): string {
    const prompt = {
        // CRITICAL PRIORITY - THIS IS THE MOST IMPORTANT RULE
        CRITICAL_PRIORITY: {
            rule: "FACE MUST BE EXACTLY THE SAME AS INPUT IMAGE",
            explanation: "The person in the output MUST be recognizable as the EXACT same person from Image 1. NOT similar. NOT a lookalike. THE SAME PERSON.",
            warning: "If friend looks at output and says 'that doesn't look like you', YOU HAVE FAILED.",
            enforcement: "Face will be pixel-overwritten after generation. Your face output is TEMPORARY and will be DISCARDED."
        },

        task: {
            type: "VIRTUAL_TRY_ON",
            action: "Apply clothing from Image 2 onto person in Image 1",
            mode: "IDENTITY_LOCKED",
            clothing_only: true,
            face_change: "ABSOLUTELY_FORBIDDEN"
        },

        face_rules: {
            priority: "HIGHEST - ABOVE ALL OTHER RULES",
            status: "IMMUTABLE - READ ONLY - DO NOT MODIFY",
            reconstruction_allowed: false,
            generation_allowed: false,

            same_person_guarantee: {
                required: true,
                description: "This is the SAME PERSON as Image 1. NOT a model. NOT a lookalike. NOT a similar person. The EXACT SAME INDIVIDUAL.",
                verification: "If you cannot tell it is the same person, you have FAILED."
            },

            face_source: "Image 1 is the ONLY source of face pixels - COPY IT EXACTLY",
            face_destination: "Your generated face will be DISCARDED and replaced by pixel copy from original",

            preserve_exactly_from_image_1: [
                "EXACT eye shape, spacing, and size",
                "EXACT nose shape, bridge, nostrils",
                "EXACT mouth width and lip shape",
                "EXACT jawline contour and chin shape - NO ROUNDING",
                "EXACT cheek volume and cheekbone position",
                "EXACT skin tone, texture, and any blemishes",
                "ALL facial asymmetries - DO NOT CORRECT",
                "Glasses if present - KEEP THEM"
            ],

            jawline: {
                sharp_input: "SHARP_OUTPUT - DO NOT ROUND",
                angular_input: "ANGULAR_OUTPUT - DO NOT SOFTEN",
                rounding: "ABSOLUTELY_FORBIDDEN",
                softening: "ABSOLUTELY_FORBIDDEN"
            },

            cheeks: {
                defined_input: "DEFINED_OUTPUT",
                fuller: "ABSOLUTELY_FORBIDDEN",
                slimmer: "ABSOLUTELY_FORBIDDEN"
            },

            forbidden_operations: [
                "FACE RECONSTRUCTION - FORBIDDEN",
                "FACE GENERATION - FORBIDDEN",
                "JAWLINE ROUNDING - FORBIDDEN",
                "FACE SHAPE ALTERATION - FORBIDDEN",
                "FACIAL ENHANCEMENT - FORBIDDEN",
                "SKIN SMOOTHING - FORBIDDEN",
                "SYMMETRY CORRECTION - FORBIDDEN",
                "BEAUTIFICATION - FORBIDDEN",
                "CHANGING ANY FACIAL FEATURE - FORBIDDEN"
            ]
        },

        body_rules: {
            status: "IMMUTABLE",
            same_body_rule: {
                enabled: true,
                description: "This is the SAME BODY as Image 1. Same weight, same proportions, same shape."
            },

            proportions: {
                shoulder_width: "PRESERVE_EXACTLY",
                torso_shape: "PRESERVE_EXACTLY",
                hip_width: "PRESERVE_EXACTLY",
                arm_length: "PRESERVE_EXACTLY",
                body_type: "PRESERVE_EXACTLY",
                weight: "PRESERVE_EXACTLY"
            },

            forbidden_operations: [
                "slimming_body",
                "widening_body",
                "reshaping_torso",
                "altering_proportions",
                "changing_posture",
                "beautifying_figure",
                "model_like_transformation",
                "any_body_modification"
            ],

            body_check: {
                if_body_looks_slimmer: "WRONG",
                if_body_looks_fuller: "WRONG",
                if_proportions_changed: "WRONG",
                if_posture_improved: "WRONG",
                if_looks_like_model: "WRONG"
            }
        },

        garment_fit: {
            rule: "GARMENT_ADAPTS_TO_BODY",
            body_adapts_to_garment: false,

            expectations: {
                tight_garment: "Shows actual body curves underneath",
                loose_garment: "Drapes over actual body shape",
                structured_garment: "Follows actual shoulder and hip lines"
            },

            forbidden_fit: [
                "idealized_fit",
                "flattering_drape",
                "slimming_effect",
                "body_shaping"
            ]
        },

        camera: {
            type: "phone_camera",
            style: "candid_single_photo",
            lighting: "match_existing_scene",
            studio_lighting: false,
            dramatic_contrast: false,
            pose_correction: false
        },

        // SCENE AUTHORITY - INHERIT FROM INPUT IMAGE ONLY
        SCENE_AUTHORITY: {
            rule: "INHERIT SCENE FROM INPUT IMAGE ONLY",
            explanation: "The environment and background must be inherited ONLY from Image 1. Do not switch between indoor and outdoor. Do not introduce a new location.",

            background: {
                source: "Image 1 ONLY",
                preserve: true,
                switching: "ABSOLUTELY_FORBIDDEN"
            },

            lighting: {
                source: "Image 1 ONLY",
                match_type: true,
                match_temperature: true,
                switching: "ABSOLUTELY_FORBIDDEN"
            },

            forbidden_actions: [
                "SWITCHING_SCENE",
                "INDOOR_TO_OUTDOOR",
                "OUTDOOR_TO_INDOOR",
                "INTRODUCING_NEW_LOCATION",
                "CHANGING_BACKGROUND",
                "ALTERING_LIGHTING_TYPE",
                "ADDING_STUDIO_LIGHTING",
                "CHANGING_TIME_OF_DAY"
            ],

            all_variants_rule: "All generated variants must share the EXACT same scene as Image 1"
        },

        instruction: userPrompt,

        identity_check: {
            if_face_looks_better: "WRONG",
            if_jawline_rounder: "WRONG",
            if_cheeks_fuller: "WRONG",
            if_skin_smoother: "WRONG"
        },

        forbidden_styles: [
            "fashion_editorial",
            "model_like_appearance",
            "artistic_styling",
            "perfection"
        ],

        retry_notice: isRetry ? {
            message: "Previous attempt altered human appearance. This is not allowed.",
            action: "Preserve original face and body exactly. Only apply clothing."
        } : null
    }

    return JSON.stringify(prompt, null, 2)
}

/**
 * Get retry prompt append (for use when first attempt drifts)
 */
export function getRetryPromptAppend(): string {
    return `

RETRY NOTICE:

The previous attempt altered human appearance.
This is not allowed.
Preserve the original face and body exactly.
Undo any enhancement or correction.
Only apply the clothing.`
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create Gemini client for Nano Banana Pro
 */
function getNanoBananaClient(): GoogleGenAI {
    const apiKey = getGeminiKey()
    return new GoogleGenAI({ apiKey })
}

/**
 * Generate try-on image using Nano Banana Pro
 * 
 * @param params Generation parameters
 * @returns Generated image result
 */
export async function generateWithNanoBanana(
    params: NanoBananaParams
): Promise<NanoBananaResult> {
    // ═══════════════════════════════════════════════════════════════════════════
    // EXPERIMENT TOGGLE: Check if GPT Image is enabled
    // If enabled, route to GPT Image API instead of Gemini
    // ═══════════════════════════════════════════════════════════════════════════
    logModelSelection()

    if (isGPTImageEnabled()) {
        console.log('🧪 EXPERIMENT MODE: Routing to GPT Image API')
        console.log('   To disable: Set IMAGE_GENERATION_MODEL=gemini in .env.local')
        return generateWithGPTImageAPI(params)
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DEFAULT: Gemini (Nano Banana Pro) - Production pipeline
    // ═══════════════════════════════════════════════════════════════════════════
    const {
        personImageBase64,
        garmentImageBase64,
        prompt,
        qualityTier = 'low',
        isRetry = false
    } = params

    const config = QUALITY_CONFIG[qualityTier]
    const client = getNanoBananaClient()
    const startTime = Date.now()

    console.log('\n╔═══════════════════════════════════════════════════════════════════════════════╗')
    console.log('║  STAGE 3: NANO BANANA PRO — IMAGE GENERATION                                  ║')
    console.log('╠═══════════════════════════════════════════════════════════════════════════════╣')
    console.log(`║  Model: ${config.model.padEnd(67)}║`)
    console.log(`║  Quality Tier: ${qualityTier.toUpperCase().padEnd(60)}║`)
    console.log(`║  Temperature: ${config.temperature.toFixed(2).padEnd(61)}║`)
    console.log(`║  Can Retry: ${config.canRetry ? 'YES' : 'NO'.padEnd(63)}║`)
    console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n')

    // Clean forbidden terms from prompt
    const { cleaned: cleanedPrompt, wasModified, termsRemoved } = cleanPromptForNanoBanana(prompt)

    if (wasModified) {
        console.log('⚠️ PROMPT CLEANING: Removed forbidden terms:')
        for (const term of termsRemoved) {
            console.log(`   ❌ "${term}"`)
        }
    }

    // Build enforcement prompt (with retry notice if applicable)
    const enforcementPrompt = buildEnforcementPrompt(cleanedPrompt, isRetry)

    if (isRetry) {
        console.log('🔄 RETRY MODE: Appending retry notice to prompt')
    }

    // Format images - strip data URI prefix
    const formatBase64 = (b64: string) =>
        b64.startsWith('data:image/')
            ? b64.split(',')[1] || b64
            : b64

    const personImage = formatBase64(personImageBase64)
    const garmentImage = formatBase64(garmentImageBase64)

    try {
        // Use the models API to generate content
        const response = await client.models.generateContent({
            model: config.model,
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: enforcementPrompt },
                        {
                            inlineData: {
                                mimeType: 'image/jpeg',
                                data: personImage
                            }
                        },
                        {
                            inlineData: {
                                mimeType: 'image/jpeg',
                                data: garmentImage
                            }
                        }
                    ]
                }
            ],
            config: {
                temperature: config.temperature,
                maxOutputTokens: config.maxTokens,
                responseModalities: ['image', 'text']
            }
        })

        const generationTimeMs = Date.now() - startTime

        // Extract image from response
        let imageBase64 = ''
        let warning: string | undefined

        if (response.candidates && response.candidates.length > 0) {
            const candidate = response.candidates[0]
            if (candidate.content && candidate.content.parts) {
                for (const part of candidate.content.parts) {
                    if ('inlineData' in part && part.inlineData?.data) {
                        imageBase64 = part.inlineData.data
                        break
                    }
                }
            }
        }

        if (!imageBase64) {
            throw new Error('No image generated from Nano Banana Pro')
        }

        console.log(`\n✓ Image generated in ${(generationTimeMs / 1000).toFixed(1)}s`)
        console.log('⚠️ Note: Face may have drifted — Stage 4 will reintegrate original face')

        return {
            image: imageBase64,
            generationTimeMs,
            qualityTier,
            promptCleaned: wasModified,
            warning
        }
    } catch (error) {
        console.error('❌ Nano Banana Pro generation failed:', error)
        throw error
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Log Nano Banana generation status
 */
export function logNanoBananaStatus(
    sessionId: string,
    result: NanoBananaResult
): void {
    console.log(`\n╔═══════════════════════════════════════════════════════════════════════════════╗`)
    console.log(`║  NANO BANANA PRO — GENERATION COMPLETE                                        ║`)
    console.log(`║  Session: ${sessionId.padEnd(64)}║`)
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`)
    console.log(`║  Status: ✅ IMAGE GENERATED`.padEnd(80) + '║')
    console.log(`║  Time: ${(result.generationTimeMs / 1000).toFixed(1)}s`.padEnd(80) + '║')
    console.log(`║  Quality Tier: ${result.qualityTier.toUpperCase()}`.padEnd(80) + '║')
    console.log(`║  Prompt Cleaned: ${result.promptCleaned ? 'YES' : 'NO'}`.padEnd(80) + '║')
    if (result.warning) {
        console.log(`║  ⚠️ Warning: ${result.warning.slice(0, 60)}`.padEnd(80) + '║')
    }
    console.log(`╠═══════════════════════════════════════════════════════════════════════════════╣`)
    console.log(`║  🔒 NANO BANANA OUTPUT IS UNTRUSTED                                           ║`)
    console.log(`║  → Stage 4 will overwrite face with original pixels                          ║`)
    console.log(`║  → Stage 5 will validate body proportions                                     ║`)
    console.log(`╚═══════════════════════════════════════════════════════════════════════════════╝\n`)
}
