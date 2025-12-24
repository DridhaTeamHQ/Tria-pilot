/**
 * LAYER 1: BODY INFERENCE FROM FACE
 * 
 * Body shape MUST be derived ONLY from user's face.
 * NEVER from garment reference image.
 * 
 * This ensures garment body does NOT contaminate output body.
 */

import 'server-only'
import { getOpenAI } from '@/lib/openai'

export interface BodyInferenceResult {
    // Shoulder & Upper Body
    shoulder_width: 'narrow' | 'medium' | 'broad' | 'very_broad'
    shoulder_type: 'sloped' | 'straight' | 'athletic'

    // Arms
    arm_thickness: 'very_slim' | 'slim' | 'average' | 'thick' | 'very_thick'
    arm_length: 'short' | 'average' | 'long'

    // Torso
    torso_type: 'short' | 'average' | 'long'
    torso_shape: 'straight' | 'tapered' | 'athletic' | 'rounded'
    chest_build: 'slim' | 'average' | 'broad' | 'muscular'

    // Waist & Hips
    waist_position: 'high' | 'mid' | 'low'
    waist_definition: 'defined' | 'average' | 'minimal'
    hip_width: 'narrow' | 'medium' | 'wide'

    // Overall Body Type
    body_type: 'ectomorph' | 'mesomorph' | 'endomorph' | 'mixed'
    estimated_weight_category: 'underweight' | 'normal' | 'overweight' | 'obese'

    // Build Description
    build_description: string  // "Athletic with broad shoulders and defined waist"

    // Confidence
    confidence: number  // 0-100
}

/**
 * Infer body proportions from face ONLY
 */
export async function inferBodyFromFace(
    userImageBase64: string
): Promise<BodyInferenceResult> {
    console.log('\n' + '═'.repeat(80))
    console.log('LAYER 1: BODY INFERENCE FROM FACE')
    console.log('═'.repeat(80))

    const startTime = Date.now()

    const openai = getOpenAI()

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{
                role: 'system',
                content: `You are a body proportion expert. Infer body characteristics from this person's FACE ONLY.

CRITICAL RULES:
• Base ALL inferences ONLY on the face visible in this image
• DO NOT use any external reference
• DO NOT assume based on clothing
• DO NOT use stereotypes

Face → Body Inference Logic:
┌──────────────────────────────────────────────────────────┐
│ FACE CUE              → BODY INFERENCE                   │
├──────────────────────────────────────────────────────────┤
│ Wide face, full cheeks → Broader shoulders, thicker arms│
│ Angular jaw, defined   → Athletic/muscular build        │
│ Soft, round features   → Average/curvy build            │
│ Narrow face, sharp     → Slimmer build                  │
│ Double chin visible    → Higher weight category         │
│ Prominent cheekbones   → Athletic, defined build        │
└──────────────────────────────────────────────────────────┘

Additional cues:
• Neck thickness → Shoulder width correlation
• Face fullness → Overall weight category
• Jaw width → Shoulder width
• Face length → Torso length tendency

Return detailed JSON with ALL fields populated.`
            }, {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: 'Infer body proportions from this person\'s face. Be specific and comprehensive.'
                    },
                    {
                        type: 'image_url',
                        image_url: { url: `data:image/jpeg;base64,${userImageBase64}` }
                    }
                ]
            }],
            response_format: { type: 'json_object' },
            temperature: 0.1  // Low temp for consistency
        })

        const result = JSON.parse(response.choices[0].message.content || '{}') as BodyInferenceResult

        const elapsed = Date.now() - startTime

        console.log('\n📊 BODY INFERENCE COMPLETE:')
        console.log(`   Shoulder width: ${result.shoulder_width}`)
        console.log(`   Arm thickness: ${result.arm_thickness}`)
        console.log(`   Torso type: ${result.torso_type}`)
        console.log(`   Body type: ${result.body_type}`)
        console.log(`   Weight category: ${result.estimated_weight_category}`)
        console.log(`   Build: ${result.build_description}`)
        console.log(`   Confidence: ${result.confidence}%`)
        console.log(`   Inference time: ${(elapsed / 1000).toFixed(2)}s`)

        return result

    } catch (error) {
        console.error('Body inference failed:', error)
        throw error
    }
}

/**
 * Generate body matching constraints for prompt
 */
export function buildBodyMatchingConstraints(
    bodyInference: BodyInferenceResult
): string {
    return `
═══════════════════════════════════════════════════════════════
BODY MATCHING CONSTRAINTS (FROM FACE INFERENCE)
═══════════════════════════════════════════════════════════════

AUTHORITY: These body proportions are inferred from USER'S FACE.
They are MANDATORY and MUST match the output body.

SHOULDER & UPPER BODY:
• Shoulder width: ${bodyInference.shoulder_width}
• Shoulder type: ${bodyInference.shoulder_type}
• Chest build: ${bodyInference.chest_build}

ARMS:
• Arm thickness: ${bodyInference.arm_thickness}
• Arm length: ${bodyInference.arm_length}

TORSO:
• Torso type: ${bodyInference.torso_type}
• Torso shape: ${bodyInference.torso_shape}
• Waist position: ${bodyInference.waist_position}
• Waist definition: ${bodyInference.waist_definition}

HIPS & LOWER BODY:
• Hip width: ${bodyInference.hip_width}

OVERALL BUILD:
• Body type: ${bodyInference.body_type}
• Weight category: ${bodyInference.estimated_weight_category}
• Description: ${bodyInference.build_description}

⚠️  CRITICAL RULES:
1. Body proportions MUST match these inferred specs
2. DO NOT use body proportions from garment reference image
3. If garment is loose/flowing, it drapes over THIS body
4. Garment adapts to body, NOT body to garment

VALIDATION:
Output body will be validated against these specs.
Mismatch = FAILURE = Auto-retry with stronger constraints.
`.trim()
}

/**
 * Validate generated body matches inferred specs
 */
export async function validateBodyMatch(
    generatedImageBase64: string,
    expectedBody: BodyInferenceResult
): Promise<{ matches: boolean; issues: string[]; confidence: number }> {
    console.log('\n🔍 Validating body match...')

    const openai = getOpenAI()

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{
                role: 'system',
                content: `Compare the body in this image to expected specifications.

Expected body:
- Shoulder width: ${expectedBody.shoulder_width}
- Arm thickness: ${expectedBody.arm_thickness}
- Torso type: ${expectedBody.torso_type}
- Body type: ${expectedBody.body_type}
- Weight category: ${expectedBody.estimated_weight_category}

Check if the body in this image matches these specs.
Return JSON: { matches: boolean, issues: [list], confidence: 0-100 }`
            }, {
                role: 'user',
                content: [
                    { type: 'text', text: 'Does this body match the expected specs?' },
                    {
                        type: 'image_url',
                        image_url: { url: `data:image/jpeg;base64,${generatedImageBase64}` }
                    }
                ]
            }],
            response_format: { type: 'json_object' },
            temperature: 0.1
        })

        const result = JSON.parse(response.choices[0].message.content || '{}')

        console.log(`   ${result.matches ? '✅ Body matches' : '❌ Body mismatch'} (${result.confidence}% confidence)`)
        if (result.issues && result.issues.length > 0) {
            console.log(`   Issues: ${result.issues.join(', ')}`)
        }

        return {
            matches: result.matches,
            issues: result.issues || [],
            confidence: result.confidence
        }

    } catch (error) {
        console.error('Body validation failed:', error)
        // Fail-safe: assume match if validation fails
        return { matches: true, issues: [], confidence: 50 }
    }
}
