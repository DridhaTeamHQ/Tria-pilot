/**
 * CREATIVE ORCHESTRATOR - IMAGE ANALYSIS
 * 
 * Uses GPT-4o-mini with vision to analyze input images.
 * Extracts structured signals, NOT prose descriptions.
 * 
 * From images, infer ONLY:
 * - lighting family (flash, soft daylight, spotlight, overcast, studio)
 * - camera logic (iphone flash, digicam, editorial 50–85mm, surveillance)
 * - texture priority (skin / fabric / product / environment)
 * - era signals (Y2K, mid-2010s, contemporary editorial, analog)
 * - brand energy (minimal, aggressive, luxury, nostalgic, surreal)
 */

import { getOpenAI } from '@/lib/openai'
import type {
    ImageAnalysisResult,
    ProductAnalysis,
    InfluencerAnalysis,
    SubjectSource,
    Gender
} from './types'
import { ImageAnalysisError } from './types'

// ═══════════════════════════════════════════════════════════════════════════════
// IMAGE ANALYSIS SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════════════════

const IMAGE_ANALYSIS_SYSTEM_PROMPT = `You are an IMAGE ANALYST for a brand-grade ad generation system.

Your job is to extract STRUCTURED SIGNALS from images.
You DO NOT write descriptions. You DO NOT explain.
You ONLY output VALID JSON.

────────────────────────
FOR PRODUCT IMAGES, EXTRACT:
────────────────────────
- category (apparel, footwear, accessory, etc.)
- subcategory (t-shirt, sneakers, handbag, etc.)
- colors (array of dominant colors)
- textures (cotton, leather, mesh, satin, etc.)
- key_features (logo print, oversized fit, metallic hardware, etc.)
- brand_signals (minimal, luxury, streetwear, athletic, etc.)

────────────────────────
FOR INFLUENCER IMAGES, EXTRACT:
────────────────────────
- source: "real_influencer" (authentic photo) or "ai_influencer" (AI-generated)
- gender: "male" / "female" / "unisex"
- pose_description: brief pose description
- expression: neutral, smiling, intense, etc.
- lighting_family: flash, soft daylight, spotlight, overcast, studio
- camera_logic: iphone, digicam, editorial 50-85mm, etc.
- era_signals: Y2K, mid-2010s, contemporary, analog, etc.

────────────────────────
OUTPUT FORMAT:
────────────────────────
{
  "product": {
    "category": "",
    "subcategory": "",
    "colors": [],
    "textures": [],
    "key_features": [],
    "brand_signals": []
  },
  "influencer": {
    "source": "",
    "gender": "",
    "pose_description": "",
    "expression": "",
    "lighting_family": "",
    "camera_logic": "",
    "era_signals": []
  }
}

If no influencer image provided, set "influencer" to null.
Output ONLY the JSON. No explanations.`

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ANALYSIS FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Analyze input images using GPT-4o-mini vision.
 * Returns structured analysis, not prose.
 */
export async function analyzeInputImages(
    productImage: string,
    influencerImage?: string
): Promise<ImageAnalysisResult> {
    try {
        const openai = getOpenAI()

        // Build image content array
        const imageContent: any[] = []

        // Product image (required)
        const cleanProductImage = formatImageUrl(productImage)
        imageContent.push({
            type: 'image_url',
            image_url: { url: cleanProductImage, detail: 'high' },
        })
        imageContent.push({
            type: 'text',
            text: 'PRODUCT IMAGE (above)',
        })

        // Influencer image (optional)
        if (influencerImage) {
            const cleanInfluencerImage = formatImageUrl(influencerImage)
            imageContent.push({
                type: 'image_url',
                image_url: { url: cleanInfluencerImage, detail: 'high' },
            })
            imageContent.push({
                type: 'text',
                text: 'INFLUENCER IMAGE (above)',
            })
        }

        // Add analysis instruction
        imageContent.push({
            type: 'text',
            text: influencerImage
                ? 'Analyze both images. Output JSON with product and influencer data.'
                : 'Analyze the product image. Set influencer to null. Output JSON.',
        })

        console.log('[ImageAnalysis] Sending images to GPT-4o-mini...')

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: IMAGE_ANALYSIS_SYSTEM_PROMPT },
                { role: 'user', content: imageContent },
            ],
            max_tokens: 1000,
            temperature: 0.2,  // Low temperature for consistent structured output
        })

        const content = response.choices[0]?.message?.content
        if (!content) {
            throw new ImageAnalysisError('No response from GPT-4o-mini')
        }

        console.log('[ImageAnalysis] Raw response:', content.slice(0, 300))

        // Parse JSON response
        const parsed = parseAnalysisResponse(content)

        return parsed
    } catch (error) {
        console.error('[ImageAnalysis] Error:', error)
        if (error instanceof ImageAnalysisError) throw error
        throw new ImageAnalysisError(
            `Failed to analyze images: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function formatImageUrl(base64: string): string {
    if (base64.startsWith('data:')) {
        return base64
    }
    // Assume JPEG if no prefix
    return `data:image/jpeg;base64,${base64}`
}

function parseAnalysisResponse(content: string): ImageAnalysisResult {
    // Clean markdown if present
    let cleanJson = content.trim()
    if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.slice(7)
    } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.slice(3)
    }
    if (cleanJson.endsWith('```')) {
        cleanJson = cleanJson.slice(0, -3)
    }
    cleanJson = cleanJson.trim()

    try {
        const parsed = JSON.parse(cleanJson)

        // Validate product exists
        if (!parsed.product) {
            throw new ImageAnalysisError('Product analysis missing from response')
        }

        const result: ImageAnalysisResult = {
            product: {
                category: parsed.product.category || 'unknown',
                subcategory: parsed.product.subcategory || '',
                colors: parsed.product.colors || [],
                textures: parsed.product.textures || [],
                keyFeatures: parsed.product.key_features || [],
                brandSignals: parsed.product.brand_signals || [],
            },
        }

        // Add influencer if present
        if (parsed.influencer) {
            result.influencer = {
                source: (parsed.influencer.source as SubjectSource) || 'ai_influencer',
                gender: (parsed.influencer.gender as Gender) || 'unisex',
                poseDescription: parsed.influencer.pose_description || '',
                expression: parsed.influencer.expression || 'neutral',
                lightingFamily: parsed.influencer.lighting_family || 'soft daylight',
                cameraLogic: parsed.influencer.camera_logic || 'editorial',
                eraSignals: parsed.influencer.era_signals || [],
            }
        }

        return result
    } catch (error) {
        console.error('[ImageAnalysis] Failed to parse JSON:', cleanJson.slice(0, 200))
        throw new ImageAnalysisError('Failed to parse image analysis JSON')
    }
}

/**
 * Quickly detect if an influencer image is real or AI-generated.
 * Uses GPT-4o-mini with a focused prompt.
 */
export async function detectInfluencerSource(
    influencerImage: string
): Promise<SubjectSource> {
    try {
        const openai = getOpenAI()

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `Determine if this image is a REAL PHOTOGRAPH of a human or an AI-GENERATED image.
Look for: skin texture, hair detail, lighting consistency, background artifacts.
Output ONLY one word: "real_influencer" or "ai_influencer"`,
                },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image_url',
                            image_url: { url: formatImageUrl(influencerImage), detail: 'high' },
                        },
                    ],
                },
            ],
            max_tokens: 20,
            temperature: 0.1,
        })

        const content = response.choices[0]?.message?.content?.toLowerCase().trim()

        if (content?.includes('real')) {
            return 'real_influencer'
        }
        return 'ai_influencer'
    } catch (error) {
        console.warn('[detectInfluencerSource] Error, defaulting to ai_influencer:', error)
        return 'ai_influencer'
    }
}
