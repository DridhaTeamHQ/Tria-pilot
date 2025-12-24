/**
 * INTELLIGENT TRY-ON RENDERER
 * 
 * Integrates all intelligence layers with photography knowledge
 */

import 'server-only'
import { extractGarmentIfNeeded } from './garment-extraction'
import { inferBodyFromFace } from './body-inference'
import { buildBodyMatchingConstraints } from './body-inference'
import { buildPoseNaturalismConstraints } from './pose-naturalism'
import { buildLightingRealismRules } from './lighting-realism'
import { VARIANT_SPECS, type VariantName } from './variant-intelligence'
import { buildGarmentLengthConstraints, KURTA_ANTI_HALLUCINATION } from './garment-differentiation'
import { formatGarmentDifferentiationRAG } from './rag/seed-data'
import { classifyGarment } from './intelligence/garment-classifier'
import { LIGHTING_HARMONIZATION, PHOTOGRAPHIC_COLOR_GRADING, BACKGROUND_REALISM_RULES } from './composition-blending'
import { IDENTITY_PRESERVING_RELIGHT, SCENE_AWARE_IDENTITY } from './unified-generation'
import { LIGHTING_PHYSICS_KNOWLEDGE, THREE_POINT_LIGHTING_KNOWLEDGE, COLOR_TEMPERATURE_KNOWLEDGE, SENSOR_AND_TEXTURE_KNOWLEDGE } from './photography-knowledge'
import { CINEMATIC_COLOR_GRADING } from './cinematic-grading'
import { formatPhotographyRAGKnowledge } from './rag/photography-seed-data'
import { FACE_IDENTITY_LOCK, VARIANT_CONSISTENCY } from './anti-hallucination'
import { QUALITY_BASELINE, VARIANT_DIFFERENTIATION } from './variant-quality-baseline'
import { SAFETY_CONSTRAINTS, GARMENT_SCOPE_DETECTION } from './safety-constraints'
import { GoogleGenAI } from '@google/genai'
import { getGeminiKey } from '@/lib/config/api-keys'

const getClient = () => new GoogleGenAI({ apiKey: getGeminiKey() })

export interface IntelligentTryOnOptions {
    userImageBase64: string
    garmentImageBase64: string
    quality: 'fast' | 'high'
    variantName?: VariantName
    aspectRatio?: string
}

/**
 * Intelligent try-on with comprehensive photography knowledge
 */
export async function renderTryOnIntelligentSimple(
    options: IntelligentTryOnOptions
): Promise<string> {
    console.log('\n' + '═'.repeat(80))
    console.log('🧠 INTELLIGENT TRY-ON SYSTEM (PHOTOGRAPHY-GRADE)')
    console.log('═'.repeat(80))

    const isPro = options.quality === 'high'
    const model = isPro ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image'
    const variantName = options.variantName || 'Editorial'

    console.log(`   Model: ${model}`)
    console.log(`   Variant: ${variantName}`)
    console.log(`   Architecture: UNIFIED GENERATION + PHOTOGRAPHY PHYSICS`)

    // ═══ LAYER 0: GARMENT EXTRACTION ═══
    const garmentResult = await extractGarmentIfNeeded(options.garmentImageBase64)

    // ═══ GARMENT CLASSIFICATION (CRITICAL FOR KURTA ISSUE) ═══
    const garmentClass = await classifyGarment(garmentResult.extractedGarmentBase64)

    // ═══ LAYER 1: BODY INFERENCE ═══
    const bodyInference = await inferBodyFromFace(options.userImageBase64)
    const bodyConstraints = buildBodyMatchingConstraints(bodyInference)

    // ═══ BUILD PROMPT WITH ALL LAYERS + PHOTOGRAPHY KNOWLEDGE ═══
    const variantSpec = VARIANT_SPECS[variantName]

    // UNIFIED GENERATION ARCHITECTURE
    const identityConstraints = IDENTITY_PRESERVING_RELIGHT
    const sceneAwareIdentity = SCENE_AWARE_IDENTITY

    // PHOTOGRAPHY PHYSICS KNOWLEDGE (RESEARCH-BASED)
    const photographyRAG = formatPhotographyRAGKnowledge()

    const poseConstraints = buildPoseNaturalismConstraints()
    const lightingRules = buildLightingRealismRules(variantSpec.lightingLane)
    // GARMENT DIFFERENTIATION
    const garmentLengthRules = buildGarmentLengthConstraints(garmentClass.category, garmentClass.hemline_position)

    // RAG SEED DATA
    const ragGarmentKnowledge = formatGarmentDifferentiationRAG()


    const prompt = `
═══════════════════════════════════════════════════════════════
🚨 SAFETY & APPROPRIATENESS (HIGHEST PRIORITY - READ FIRST)
═══════════════════════════════════════════════════════════════

${SAFETY_CONSTRAINTS}

${GARMENT_SCOPE_DETECTION}

═══════════════════════════════════════════════════════════════
🎯 MISSION: PHOTOGRAPHIC-GRADE GENERATION (ALL VARIANTS)
═══════════════════════════════════════════════════════════════

You are a PROFESSIONAL PHOTOGRAPHER taking photos of ONE PERSON.

Image 1 = IDENTITY REFERENCE (face geometry, body proportions, EXISTING CLOTHING)
Image 2 = GARMENT REFERENCE (clothing to REPLACE, not add to)

Generate SAME PERSON with NEW GARMENT while PRESERVING SAFETY & APPROPRIATENESS.

${QUALITY_BASELINE}

${VARIANT_DIFFERENTIATION}

${FACE_IDENTITY_LOCK}

${VARIANT_CONSISTENCY}

${identityConstraints}

${sceneAwareIdentity}

${LIGHTING_PHYSICS_KNOWLEDGE}

${THREE_POINT_LIGHTING_KNOWLEDGE}

${COLOR_TEMPERATURE_KNOWLEDGE}

${SENSOR_AND_TEXTURE_KNOWLEDGE}

${CINEMATIC_COLOR_GRADING}

${photographyRAG}

${LIGHTING_HARMONIZATION}

${PHOTOGRAPHIC_COLOR_GRADING}

${bodyConstraints}

${poseConstraints}

${lightingRules}

${BACKGROUND_REALISM_RULES}

${garmentLengthRules}

${KURTA_ANTI_HALLUCINATION}

${ragGarmentKnowledge}

═══════════════════════════════════════════════════════════════
VARIANT: ${variantName.toUpperCase()}
═══════════════════════════════════════════════════════════════

${variantSpec.moodDescription}

Camera: ${variantSpec.cameraDistance}
Lighting: ${variantSpec.lightingLane}
Pose energy: ${variantSpec.poseEnergy}
Background: ${variantSpec.backgroundEmphasis}

═══════════════════════════════════════════════════════════════
GARMENT APPLICATION
═══════════════════════════════════════════════════════════════

Apply garment from Image 2 to person from Image 1.

DETECTED GARMENT TYPE: ${garmentClass.category}
HEMLINE POSITION: ${garmentClass.hemline_position}
DESCRIPTION: ${garmentClass.hemline_description}

🔴 CRITICAL: The hemline in your output MUST match the hemline in Image 2.
   If Image 2 shows hemline at HIP → Output hemline at HIP
   If Image 2 shows hemline at KNEE → Output hemline at KNEE
   
   DO NOT extend or shorten the garment.
   COPY THE EXACT LENGTH from Image 2.

Garment must adapt to body (NOT body to garment).

═══════════════════════════════════════════════════════════════
FINAL CHECKLIST (BEFORE OUTPUT)
═══════════════════════════════════════════════════════════════

✓ Face matches Image 1 exactly
✓ Body matches inferred proportions  
✓ Pose is asymmetrical (NOT mannequin)
✓ Lighting is directional (NOT flat studio)
✓ Garment type: ${garmentClass.category}
✓ Hemline position: ${garmentClass.hemline_position}
✓ Variant mood: ${variantSpec.moodDescription}

IF ANY CHECK FAILS → OUTPUT IS INVALID
`.trim()

    // ═══ GENERATE ═══
    const client = getClient()

    const cleanUser = options.userImageBase64.replace(/^data:image\/\w+;base64,/, '')
    const cleanGarment = garmentResult.extractedGarmentBase64.replace(/^data:image\/\w+;base64,/, '')

    const response = await client.models.generateContent({
        model,
        contents: [{
            role: 'user',
            parts: [
                { text: prompt },
                { inlineData: { mimeType: 'image/jpeg', data: cleanUser } },
                { inlineData: { mimeType: 'image/jpeg', data: cleanGarment } }
            ]
        }],
        config: {
            temperature: isPro ? 0.04 : 0.01,
            candidateCount: 1,
            imageConfig: { aspectRatio: options.aspectRatio || '3:4' } as any
        }
    })

    const imageData = response.candidates?.[0]?.content?.parts?.find((p: any) =>
        p.inlineData?.mimeType?.startsWith('image/')
    )?.inlineData?.data

    if (!imageData) {
        throw new Error('No image returned from Gemini')
    }

    console.log('\n✅ Generation complete')

    return imageData
}
