/**
 * HUMAN BODY DETECTOR
 * 
 * Detects if a clothing/garment reference image contains a human body.
 * Uses GPT-4o Vision for accurate detection of:
 * - Full human bodies
 * - Partial bodies (arms, legs, torso)
 * - Faces
 * - Mannequins (treated as needing extraction)
 * 
 * This enables the automatic garment extraction pipeline to decide
 * whether to extract the garment or pass through the original image.
 */

import 'server-only'
import { getOpenAI } from '@/lib/openai'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface BodyDetectionResult {
    /** True if any human body parts are detected */
    containsHuman: boolean
    /** True if a face/head is visible */
    containsFace: boolean
    /** Confidence score 0-1 */
    confidence: number
    /** Type of body detection */
    bodyType: 'full' | 'upper' | 'lower' | 'partial' | 'mannequin' | 'none'
    /** Detected body parts for debugging */
    detectedParts: string[]
    /** Recommendation for the preprocessor */
    recommendation: 'extract' | 'passthrough'
    /** Reason for the recommendation */
    reason: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════════════════

const BODY_DETECTION_PROMPT = `You are a BODY DETECTION SYSTEM for a virtual try-on pipeline.
Your task is to determine if a clothing/garment image contains a human body that needs to be removed.

Analyze the image and return JSON with these exact fields:

{
  "containsHuman": boolean,      // True if ANY human body parts visible
  "containsFace": boolean,       // True if a face/head is visible
  "confidence": number,          // 0-1 confidence score
  "bodyType": string,            // "full" | "upper" | "lower" | "partial" | "mannequin" | "none"
  "detectedParts": string[],     // List of detected parts: ["head", "arms", "torso", "legs", "hands", "feet"]
  "recommendation": string,      // "extract" or "passthrough"
  "reason": string               // Brief explanation
}

═══ DETECTION CRITERIA ═══

DETECT AS "containsHuman: true" if you see:
• Human head/face
• Human neck
• Human arms (even partially)
• Human hands
• Human torso (not just clothing)
• Human legs
• Human feet
• Skin texture of a real person

DETECT AS "mannequin" bodyType if:
• Plastic/artificial human form
• Dress form
• Headless display mannequin
• Store display body
→ Still recommend "extract" for mannequins

DETECT AS "none" if the image is:
• Flat-lay photography (clothing laid flat)
• Product photography on white/grey background
• Hanging garment (no body inside)
• Close-up of fabric/pattern only
→ Recommend "passthrough"

═══ RECOMMENDATION RULES ═══

Recommend "extract" if:
• containsHuman is true
• bodyType is "mannequin"
• Any human anatomy that could influence try-on generation

Recommend "passthrough" if:
• Clean product photo
• No body influence
• Flat-lay or hanging garment

Be STRICT about detection. Even partial arms visible in a photo should trigger "extract".`

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DETECTION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

function formatImageUrl(base64: string): string {
    if (base64.startsWith('data:image/')) return base64
    return `data:image/jpeg;base64,${base64}`
}

function stripDataUrl(base64: string): string {
    return (base64 || '').replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '')
}

/**
 * Detect if a clothing image contains a human body
 * 
 * @param imageBase64 - The clothing/garment image to analyze
 * @returns Detection result with recommendation
 */
export async function detectHumanInClothingImage(
    imageBase64: string
): Promise<BodyDetectionResult> {
    const openai = getOpenAI()

    const clean = stripDataUrl(imageBase64)
    if (!clean || clean.length < 100) {
        console.warn('⚠️ Body detection: Invalid image provided')
        return {
            containsHuman: false,
            containsFace: false,
            confidence: 0,
            bodyType: 'none',
            detectedParts: [],
            recommendation: 'passthrough',
            reason: 'Invalid image'
        }
    }

    try {
        console.log('🔍 BODY DETECTION: Analyzing clothing image...')

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: BODY_DETECTION_PROMPT },
                        {
                            type: 'image_url',
                            image_url: {
                                url: formatImageUrl(imageBase64),
                                detail: 'low'  // Low detail is sufficient for body detection
                            }
                        },
                    ],
                },
            ],
            response_format: { type: 'json_object' },
            max_tokens: 300,
            temperature: 0.1,  // Low temperature for consistent detection
        })

        const content = response.choices[0]?.message?.content
        if (!content) {
            console.warn('⚠️ Body detection: No response from GPT-4o')
            return {
                containsHuman: false,
                containsFace: false,
                confidence: 0.5,
                bodyType: 'none',
                detectedParts: [],
                recommendation: 'passthrough',
                reason: 'Detection failed - no response'
            }
        }

        const result = JSON.parse(content) as Partial<BodyDetectionResult>

        // Normalize and validate response
        const normalized: BodyDetectionResult = {
            containsHuman: Boolean(result.containsHuman),
            containsFace: Boolean(result.containsFace),
            confidence: typeof result.confidence === 'number' ? Math.max(0, Math.min(1, result.confidence)) : 0.5,
            bodyType: (['full', 'upper', 'lower', 'partial', 'mannequin', 'none'].includes(result.bodyType || '')
                ? result.bodyType as BodyDetectionResult['bodyType']
                : 'none'),
            detectedParts: Array.isArray(result.detectedParts) ? result.detectedParts : [],
            recommendation: result.recommendation === 'extract' ? 'extract' : 'passthrough',
            reason: typeof result.reason === 'string' ? result.reason : 'Detection complete'
        }

        // Log detection result
        console.log(`🔍 BODY DETECTION RESULT:`)
        console.log(`   Human detected: ${normalized.containsHuman ? '✓' : '✗'}`)
        console.log(`   Face detected: ${normalized.containsFace ? '✓' : '✗'}`)
        console.log(`   Body type: ${normalized.bodyType}`)
        console.log(`   Confidence: ${(normalized.confidence * 100).toFixed(0)}%`)
        console.log(`   Recommendation: ${normalized.recommendation.toUpperCase()}`)
        console.log(`   Reason: ${normalized.reason}`)

        return normalized
    } catch (error) {
        console.error('❌ Body detection failed:', error)

        // On error, default to passthrough to avoid blocking
        return {
            containsHuman: false,
            containsFace: false,
            confidence: 0,
            bodyType: 'none',
            detectedParts: [],
            recommendation: 'passthrough',
            reason: `Detection error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK DETECTION (for performance-critical paths)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Quick body detection using the existing analyzeGarmentForensic containsPerson field
 * This is faster but less accurate than full detection
 * 
 * @deprecated Use detectHumanInClothingImage for production accuracy
 */
export function shouldExtractGarment(containsPerson: boolean, containsFace: boolean): boolean {
    return containsPerson || containsFace
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

export function logBodyDetectionStatus(sessionId: string, result: BodyDetectionResult): void {
    console.log(`\n🔍 BODY DETECTION [${sessionId}]`)
    console.log(`   ═══════════════════════════════════════════════`)
    console.log(`   ✓ Human: ${result.containsHuman ? 'DETECTED' : 'NOT DETECTED'}`)
    console.log(`   ✓ Face: ${result.containsFace ? 'DETECTED' : 'NOT DETECTED'}`)
    console.log(`   ✓ Type: ${result.bodyType}`)
    console.log(`   ✓ Confidence: ${(result.confidence * 100).toFixed(0)}%`)
    console.log(`   ✓ Action: ${result.recommendation.toUpperCase()}`)
    if (result.detectedParts.length > 0) {
        console.log(`   ✓ Parts: ${result.detectedParts.join(', ')}`)
    }
    console.log(`   ═══════════════════════════════════════════════`)
}
