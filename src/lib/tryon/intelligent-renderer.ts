/**
 * INTELLIGENT TRY-ON RENDERER
 * 
 * Integrates all intelligence layers with photography knowledge
 * 
 * EXECUTION ORDER:
 * 1. Master Constraints (Face Freeze → Body Lock → Garment Extraction)
 * 2. Hardened Rules
 * 3. Safety Constraints
 * 4. Scene Preset (if selected)
 * 5. Photography Knowledge
 * 6. Variant Specifications
 * 7. Final Validation
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
import { HARDENED_IDENTITY_LOCK, HARDENED_GARMENT_RULES, HARDENED_BODY_RULES, HARDENED_TEXTURE_REALISM, HARDENED_FAIL_CONDITIONS } from './hardened-constraints'
import { ABSOLUTE_CONSTRAINTS, BACKGROUND_BELIEVABILITY, POSE_NATURALISM, getRealWorldPreset, buildPresetPrompt, type RealWorldPreset } from './real-world-presets'
// NEW: Master constraints for face freeze, body lock, garment extraction
import { CONSTRAINTS, buildMasterConstraintPrompt } from './master-constraints'
// NEW: JSON scene preset loader
import { getScenePreset, buildScenePresetPrompt } from './presets/preset-loader'
// NEW: Enhanced face consistency and naturalism
import { buildEnhancedFaceConsistencyPrompt } from './enhanced-face-naturalism'
import { GoogleGenAI } from '@google/genai'
import { getGeminiKey } from '@/lib/config/api-keys'

const getClient = () => new GoogleGenAI({ apiKey: getGeminiKey() })

export interface IntelligentTryOnOptions {
    userImageBase64: string
    garmentImageBase64: string
    quality: 'fast' | 'high'
    variantName?: VariantName
    aspectRatio?: string
    realWorldPresetId?: string  // Optional: Use real-world preset for photographic believability
    scenePresetId?: string      // NEW: JSON scene preset for camera/lighting/background control
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
    const model = isPro ? 'gemini-3-pro-image-preview' : 'gemini-3.1-flash-image-preview'
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

    // REAL-WORLD PRESET (PHOTOGRAPHIC BELIEVABILITY)
    const realWorldPreset: RealWorldPreset | null = options.realWorldPresetId
        ? getRealWorldPreset(options.realWorldPresetId)
        : null

    // JSON SCENE PRESET (CAMERA/LIGHTING/BACKGROUND)
    const scenePresetPrompt = options.scenePresetId
        ? buildScenePresetPrompt(options.scenePresetId)
        : ''

    // BUILD MASTER CONSTRAINT PROMPT (HIGHEST PRIORITY)
    const masterConstraints = buildMasterConstraintPrompt()

    // BUILD ENHANCED FACE CONSISTENCY PROMPT (NATURALISM)
    const enhancedFacePrompt = buildEnhancedFaceConsistencyPrompt()

    const prompt = `
═══════════════════════════════════════════════════════════════
🚨 MASTER CONSTRAINTS (HIGHEST PRIORITY - READ FIRST)
═══════════════════════════════════════════════════════════════

${masterConstraints}

═══════════════════════════════════════════════════════════════
🧊 ENHANCED FACE CONSISTENCY & NATURALISM
═══════════════════════════════════════════════════════════════

${enhancedFacePrompt}

═══════════════════════════════════════════════════════════════
⚠️  REAL-WORLD TRY-ON SYSTEM (PHOTOGRAPHIC BELIEVABILITY)
═══════════════════════════════════════════════════════════════

${ABSOLUTE_CONSTRAINTS}

═══════════════════════════════════════════════════════════════
🔐 HARDENED MODE (ULTRA-STRICT - REINFORCEMENT)
═══════════════════════════════════════════════════════════════

⚠️  THIS IS MAXIMUM ENFORCEMENT MODE

You are generating a photorealistic fashion try-on.
These constraints are NON-NEGOTIABLE.

${HARDENED_IDENTITY_LOCK}

${HARDENED_GARMENT_RULES}

${HARDENED_BODY_RULES}

${HARDENED_TEXTURE_REALISM}

═══════════════════════════════════════════════════════════════
🚨 SAFETY & APPROPRIATENESS (CRITICAL)
═══════════════════════════════════════════════════════════════

${SAFETY_CONSTRAINTS}

${GARMENT_SCOPE_DETECTION}

${realWorldPreset ? buildPresetPrompt(realWorldPreset) : ''}

${scenePresetPrompt ? `
═══════════════════════════════════════════════════════════════
🎬 SCENE PRESET (CAMERA/LIGHTING/BACKGROUND CONTROL)
═══════════════════════════════════════════════════════════════

${scenePresetPrompt}
` : ''}

${BACKGROUND_BELIEVABILITY}

${POSE_NATURALISM}

═══════════════════════════════════════════════════════════════
🎯 MISSION: PHOTOGRAPHIC-GRADE GENERATION
═══════════════════════════════════════════════════════════════

You are generating a CASUAL, BELIEVABLE PHOTO.

Image 1 = IDENTITY REFERENCE (face geometry, body proportions, EXISTING CLOTHING)
Image 2 = GARMENT REFERENCE (clothing to REPLACE, not add to)

Generate SAME PERSON with NEW GARMENT while PRESERVING SAFETY & BELIEVABILITY.

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

${HARDENED_FAIL_CONDITIONS}

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
✓ Texture: Skin pores visible, fabric weave visible, film grain present
✓ NO plastic/painted look
✓ NO face drift from Image 1

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
