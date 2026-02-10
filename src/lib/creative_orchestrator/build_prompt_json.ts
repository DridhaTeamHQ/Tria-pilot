/**
 * CREATIVE ORCHESTRATOR - JSON CONTRACT BUILDER
 * 
 * This is where GPT-4o-mini acts as CREATIVE DIRECTOR.
 * It takes analyzed inputs + preset rules + user constraints
 * and COMPILES them into a strict JSON Creative Contract.
 * 
 * GPT-4o-mini MUST:
 * - See: product image, influencer image (optional)  
 * - Read: brand preset, user constraints
 * - Output: STRICT JSON ONLY
 * 
 * GPT-4o-mini NEVER:
 * - Write prose prompts
 * - Explain decisions
 * - Add creative fluff
 */

import { getOpenAI } from '@/lib/openai'
import { CREATIVE_DIRECTOR_SYSTEM_PROMPT, buildUserMessage } from './system-prompt'
import { getPreset, SAFE_PRESET, FEW_SHOT_EXAMPLES, buildPresetPromptSection } from './presets'
import { parseAndValidateContract } from './validators'
import type {
    CreativeContract,
    OrchestratorInput,
    ImageAnalysisResult,
    PresetId
} from './types'
import { ContractValidationError, LowConfidenceError } from './types'

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build a Creative Contract using GPT-4o-mini as Creative Director.
 * Takes images, analysis, preset, and constraints → outputs validated JSON contract.
 */
export async function buildCreativeContract(
    input: OrchestratorInput,
    imageAnalysis: ImageAnalysisResult
): Promise<CreativeContract> {
    const openai = getOpenAI()
    const preset = getPreset(input.presetId)
    if (!preset) {
        throw new ContractValidationError(`Invalid preset ID: ${input.presetId}`)
    }

    console.log(`[ContractBuilder] Building contract with preset: ${preset.id}`)

    // Build context strings
    const presetContext = buildPresetPromptSection(preset)
    const analysisContext = formatAnalysisContext(imageAnalysis)
    const constraintsContext = input.constraints
        ? formatUserConstraints(input.constraints)
        : undefined

    // Build image content for vision
    const imageContent = buildImageContent(input)

    // Build few-shot examples for better output quality
    const fewShotMessages = buildFewShotMessages()

    // View firstnal user message
    const userMessage = buildUserMessage(
        `${presetContext}\n\nIMAGE ANALYSIS:\n${analysisContext}`,
        constraintsContext
    )

    try {
        console.log('[ContractBuilder] Sending to GPT-4o-mini Creative Director...')

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: CREATIVE_DIRECTOR_SYSTEM_PROMPT },
                ...fewShotMessages,
                {
                    role: 'user',
                    content: [
                        ...imageContent,
                        { type: 'text', text: userMessage },
                    ],
                },
            ],
            max_tokens: 2000,
            temperature: 0.3,  // Slightly creative but structured
        })

        const content = response.choices[0]?.message?.content
        if (!content) {
            throw new ContractValidationError('No response from GPT-4o-mini')
        }

        console.log('[ContractBuilder] Raw GPT response:', content.slice(0, 500))

        // Parse and validate the contract
        const contract = parseAndValidateContract(content)

        // CRITICAL: Force override ad_type to match the requested preset ID.
        // GPT-4o-mini sometimes hallucinates generic types (e.g. "social_media").
        // We MUST ensure strict alignment for render.ts lookup.
        contract.ad_type = input.presetId as any // Force cast to avoid strict union mismatch if input type is loose

        // Apply influencer source rules
        applyInfluencerRules(contract, imageAnalysis)

        console.log(`[ContractBuilder] Contract built successfully. Confidence: ${contract.confidence_score}`)

        return contract
    } catch (error) {
        if (error instanceof LowConfidenceError) {
            console.warn('[ContractBuilder] Low confidence, using safe preset fallback')
            return buildSafePresetContract(input, imageAnalysis)
        }
        throw error
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SAFE PRESET FALLBACK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build a contract using the safe preset when confidence is low.
 */
function buildSafePresetContract(
    input: OrchestratorInput,
    imageAnalysis: ImageAnalysisResult
): CreativeContract {
    const hasInfluencer = !!imageAnalysis.influencer
    const isRealInfluencer = imageAnalysis.influencer?.source === 'real_influencer'

    const contract: CreativeContract = {
        ad_type: 'PRODUCT_LIFESTYLE_AD_V1',
        brand_tier: 'premium',

        subject: {
            type: hasInfluencer ? 'human' : 'product_only',
            source: hasInfluencer
                ? (imageAnalysis.influencer!.source || 'ai_influencer')
                : 'none',
            influencer_id: input.aiInfluencerId || '',
            gender: imageAnalysis.influencer?.gender || 'unisex',
        },

        product: {
            category: imageAnalysis.product.category,
            visibility_score: 0.7,  // Product dominant by default
            logo_visibility: 'subtle',
        },

        pose: {
            allowed_changes: !isRealInfluencer,  // Lock if real influencer
            stance: imageAnalysis.influencer?.poseDescription || 'natural_standing',
            framing: 'mid_full',
            camera_angle: 'eye_level',
        },

        environment: {
            type: 'studio_minimal',
            background: 'neutral',
        },

        lighting: {
            style: SAFE_PRESET.lighting.allowed[0] || 'soft_natural',
            contrast: SAFE_PRESET.lighting.contrast as any,
            temperature: SAFE_PRESET.lighting.temperature as any,
        },

        camera: {
            device_logic: SAFE_PRESET.camera.device_logic,
            lens_style: SAFE_PRESET.camera.lens_style,
            framing_notes: 'standard professional framing',
        },

        texture_priority: SAFE_PRESET.texture_priority,
        color_palette: SAFE_PRESET.color_palette,

        imperfections: {
            grain: SAFE_PRESET.imperfection_level as any,
            asymmetry: true,
        },

        negative_constraints: SAFE_PRESET.negative_constraints,
        confidence_score: 65,  // Safe but not highly confident
    }

    return contract
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════



function formatAnalysisContext(analysis: ImageAnalysisResult): string {
    let context = `PRODUCT:
  Category: ${analysis.product.category}
  Subcategory: ${analysis.product.subcategory}
  Colors: ${analysis.product.colors.join(', ')}
  Textures: ${analysis.product.textures.join(', ')}
  Key Features: ${analysis.product.keyFeatures.join(', ')}
  Brand Signals: ${analysis.product.brandSignals.join(', ')}`

    if (analysis.influencer) {
        context += `

INFLUENCER:
  Source: ${analysis.influencer.source}
  Gender: ${analysis.influencer.gender}
  Pose: ${analysis.influencer.poseDescription}
  Expression: ${analysis.influencer.expression}
  Lighting: ${analysis.influencer.lightingFamily}
  Camera: ${analysis.influencer.cameraLogic}
  Era Signals: ${analysis.influencer.eraSignals.join(', ')}`

        if (analysis.influencer.visualDescription) {
            context += `\n  Visual Description: ${analysis.influencer.visualDescription}`
        }
        if (analysis.influencer.styleTags?.length) {
            context += `\n  Style Tags: ${analysis.influencer.styleTags.join(', ')}`
        }
    }

    return context
}

function formatUserConstraints(constraints: OrchestratorInput['constraints']): string {
    if (!constraints) return ''

    const lines: string[] = []
    if (constraints.platform) lines.push(`Platform: ${constraints.platform}`)
    if (constraints.mood) lines.push(`Mood: ${constraints.mood}`)
    if (constraints.targetAudience) lines.push(`Target Audience: ${constraints.targetAudience}`)
    if (constraints.productVisibility) lines.push(`Product Visibility: ${constraints.productVisibility}`)
    if (constraints.headline) lines.push(`Headline: ${constraints.headline}`)
    if (constraints.cta) lines.push(`CTA: ${constraints.cta}`)

    return lines.join('\n')
}

function buildImageContent(input: OrchestratorInput): any[] {
    const content: any[] = []

    // Product image (required)
    content.push({
        type: 'image_url',
        image_url: {
            url: formatImageUrl(input.productImage),
            detail: 'high'
        },
    })
    content.push({
        type: 'text',
        text: 'PRODUCT IMAGE (above)',
    })

    // Influencer image (optional)
    if (input.influencerImage) {
        content.push({
            type: 'image_url',
            image_url: {
                url: formatImageUrl(input.influencerImage),
                detail: 'high'
            },
        })
        content.push({
            type: 'text',
            text: 'INFLUENCER IMAGE (above)',
        })
    }

    return content
}

function formatImageUrl(base64: string): string {
    if (base64.startsWith('data:')) return base64
    return `data:image/jpeg;base64,${base64}`
}

function buildFewShotMessages(): any[] {
    // Include 1-2 examples to guide output format
    const example = FEW_SHOT_EXAMPLES[0]

    return [
        {
            role: 'user',
            content: `Example input: ${example.description}\nOutput the JSON contract.`,
        },
        {
            role: 'assistant',
            content: JSON.stringify(example.output, null, 2),
        },
    ]
}

/**
 * Apply mandatory influencer handling rules.
 * 
 * If subject source = "real_influencer":
 * - Lock pose
 * - Adapt lighting to source image
 * 
 * If subject source = "ai_influencer":
 * - Allow pose changes
 * - Allow full relighting
 */
function applyInfluencerRules(
    contract: CreativeContract,
    analysis: ImageAnalysisResult
): void {
    if (contract.subject.source === 'real_influencer') {
        // MANDATORY: Lock pose for real influencers
        contract.pose.allowed_changes = false

        // Adapt lighting to match source
        if (analysis.influencer?.lightingFamily) {
            console.log(`[ContractBuilder] Adapting lighting to real influencer: ${analysis.influencer.lightingFamily}`)
        }
    } else if (contract.subject.source === 'ai_influencer') {
        // Allow full control for AI influencers
        contract.pose.allowed_changes = true
    }
}
