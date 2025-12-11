/**
 * Image Intelligence Module
 * Analyzes input photos to extract camera angle, pose complexity, and preset compatibility
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { getGeminiKey, getGeminiModelVersion } from '@/lib/config/api-keys'

/**
 * Camera and shot analysis
 */
export interface CameraAnalysis {
    angle: 'above' | 'eye-level' | 'below' | 'side' | 'dutch'
    shotType: 'close-up' | 'portrait' | 'half-body' | 'full-body' | 'wide'
    distance: 'close' | 'medium' | 'far'
}

/**
 * Pose analysis
 */
export interface PoseAnalysis {
    position: 'standing' | 'sitting' | 'lying' | 'leaning' | 'crouching' | 'action'
    armPosition: string
    bodyAngle: string
    complexity: number // 1-10 scale
    faceAngle: 'frontal' | 'three-quarter' | 'profile' | 'tilted-up' | 'tilted-down'
    adaptable: boolean // Can this pose be adapted to different scenes?
}

/**
 * Preset compatibility analysis
 */
export interface CompatibilityAnalysis {
    outdoorStanding: boolean
    indoorSeated: boolean
    formalEditorial: boolean
    casualStreet: boolean
    templeMonument: boolean
}

/**
 * Complete image intelligence result
 */
export interface ImageIntelligence {
    camera: CameraAnalysis
    pose: PoseAnalysis
    compatibility: CompatibilityAnalysis
    warnings: string[]
    recommendations: string[]
    suggestedImageType: string | null // What kind of image would work better
    bestPresetCategories: string[]
}

/**
 * Prompt for Gemini to analyze image intelligence
 */
const IMAGE_INTELLIGENCE_PROMPT = `Analyze this photo for AI virtual try-on purposes. Extract camera angle, pose details, and scene compatibility.

Return JSON with this EXACT structure:
{
  "camera": {
    "angle": "above|eye-level|below|side|dutch",
    "shotType": "close-up|portrait|half-body|full-body|wide",
    "distance": "close|medium|far"
  },
  "pose": {
    "position": "standing|sitting|lying|leaning|crouching|action",
    "armPosition": "description of arm/hand position",
    "bodyAngle": "description of body angle relative to camera",
    "complexity": 1-10,
    "faceAngle": "frontal|three-quarter|profile|tilted-up|tilted-down",
    "adaptable": true/false
  },
  "compatibility": {
    "outdoorStanding": true/false,
    "indoorSeated": true/false,
    "formalEditorial": true/false,
    "casualStreet": true/false,
    "templeMonument": true/false
  },
  "warnings": ["list of potential issues for virtual try-on"],
  "recommendations": ["suggestions to improve results"],
  "suggestedImageType": "what type of image would work better, or null if current is good",
  "bestPresetCategories": ["indian", "travel", "street", etc.]
}

RULES:
- complexity 1-3 = simple poses (standing, sitting straight)
- complexity 4-6 = moderate (arms crossed, casual lean)
- complexity 7-10 = complex (lying down, dynamic action, unusual angles)
- adaptable = true if pose can be realistically adapted to different backgrounds
- For lying down poses: outdoorStanding and templeMonument should be FALSE
- Add warnings if face angle makes identity preservation difficult
- Recommend close-up presets for complex body poses`

/**
 * Analyze an image and return intelligent recommendations
 */
export async function analyzeImageIntelligence(imageBase64: string): Promise<ImageIntelligence> {
    try {
        const apiKey = getGeminiKey()
        const modelVersion = getGeminiModelVersion()
        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({
            model: modelVersion,
            generationConfig: {
                responseMimeType: 'application/json',
            },
        })

        // Remove data URI prefix if present
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')

        const result = await model.generateContent([
            {
                inlineData: {
                    data: cleanBase64,
                    mimeType: 'image/jpeg',
                },
            },
            IMAGE_INTELLIGENCE_PROMPT,
        ])

        const response = await result.response
        const text = response.text()

        // Parse JSON response
        let intelligence: ImageIntelligence
        try {
            const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
            intelligence = JSON.parse(cleanedText)
        } catch (parseError) {
            console.error('Failed to parse image intelligence JSON:', parseError)
            console.error('Raw response:', text)
            // Return default values if parsing fails
            return getDefaultIntelligence()
        }

        // Validate and fix missing fields
        intelligence = validateIntelligence(intelligence)

        console.log('📊 Image Intelligence:', JSON.stringify(intelligence, null, 2))
        return intelligence
    } catch (error) {
        console.error('Image intelligence analysis error:', error)
        return getDefaultIntelligence()
    }
}

/**
 * Validate and fix intelligence structure
 */
function validateIntelligence(intel: Partial<ImageIntelligence>): ImageIntelligence {
    return {
        camera: {
            angle: intel.camera?.angle || 'eye-level',
            shotType: intel.camera?.shotType || 'half-body',
            distance: intel.camera?.distance || 'medium',
        },
        pose: {
            position: intel.pose?.position || 'standing',
            armPosition: intel.pose?.armPosition || 'natural',
            bodyAngle: intel.pose?.bodyAngle || 'facing camera',
            complexity: intel.pose?.complexity || 3,
            faceAngle: intel.pose?.faceAngle || 'frontal',
            adaptable: intel.pose?.adaptable ?? true,
        },
        compatibility: {
            outdoorStanding: intel.compatibility?.outdoorStanding ?? true,
            indoorSeated: intel.compatibility?.indoorSeated ?? true,
            formalEditorial: intel.compatibility?.formalEditorial ?? true,
            casualStreet: intel.compatibility?.casualStreet ?? true,
            templeMonument: intel.compatibility?.templeMonument ?? true,
        },
        warnings: intel.warnings || [],
        recommendations: intel.recommendations || [],
        suggestedImageType: intel.suggestedImageType || null,
        bestPresetCategories: intel.bestPresetCategories || ['all'],
    }
}

/**
 * Return default intelligence when analysis fails
 */
function getDefaultIntelligence(): ImageIntelligence {
    return {
        camera: {
            angle: 'eye-level',
            shotType: 'half-body',
            distance: 'medium',
        },
        pose: {
            position: 'standing',
            armPosition: 'natural',
            bodyAngle: 'facing camera',
            complexity: 3,
            faceAngle: 'frontal',
            adaptable: true,
        },
        compatibility: {
            outdoorStanding: true,
            indoorSeated: true,
            formalEditorial: true,
            casualStreet: true,
            templeMonument: true,
        },
        warnings: [],
        recommendations: [],
        suggestedImageType: null,
        bestPresetCategories: ['all'],
    }
}

/**
 * Generate camera angle instructions for prompt
 */
export function getCameraInstructions(intelligence: ImageIntelligence): string {
    let instructions = ''

    // Camera angle matching
    if (intelligence.camera.angle === 'above') {
        instructions += 'CAMERA: Maintain the above-angle perspective from the input photo.\n'
    } else if (intelligence.camera.angle === 'below') {
        instructions += 'CAMERA: Maintain the low-angle perspective from the input photo.\n'
    }

    // Shot type matching
    if (intelligence.camera.shotType === 'close-up') {
        instructions += 'FRAMING: Keep close-up framing focusing on face and upper body.\n'
    } else if (intelligence.camera.shotType === 'portrait') {
        instructions += 'FRAMING: Maintain portrait framing (head to chest/shoulders).\n'
    }

    // Face angle matching
    if (intelligence.pose.faceAngle !== 'frontal') {
        instructions += `FACE ANGLE: Preserve the ${intelligence.pose.faceAngle} face angle from input.\n`
    }

    return instructions
}
