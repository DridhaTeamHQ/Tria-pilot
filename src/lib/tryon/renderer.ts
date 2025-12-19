import { GoogleGenAI, type ContentListUnion, type GenerateContentConfig, type ImageConfig } from '@google/genai'
import { getGeminiKey } from '@/lib/config/api-keys'
import {
  analyzeGarmentForensic,
  type GarmentAnalysis
} from './face-analyzer'
import { getStylePreset, type StylePreset } from './style-presets'
import { getTryOnPresetV3 } from './presets'
import {
  buildDualEnginePipeline,
  enforceModelRouting,
  validatePipelineInputs,
  logIdentitySafetyCheck,
  type PipelineMode,
  type ModelType
} from './dual-engine'

const getClient = () => new GoogleGenAI({ apiKey: getGeminiKey() })

function stripDataUrl(base64: string): string {
  return (base64 || '').replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '')
}

function normalizeAspectRatio(ratio: string | undefined): string {
  const raw = String(ratio || '').trim()
  if (!raw) return '3:4'
  const allowed = new Set(['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'])
  if (allowed.has(raw)) return raw
  if (raw === '4:5') return '3:4'
  if (raw === '5:4') return '4:3'
  return '3:4'
}

// ====================================================================================
// NEW ARCHITECTURE: Image-only identity, text-only garment, prompt-controlled scene
// ====================================================================================

/**
 * STYLE REFERENCE (--sref equivalent)
 * The visual aesthetic - photography style, grain, mood
 */
const STYLE_SETTINGS: Record<string, string> = {
  iphone_candid: `📱 iPhone Candid Style:
Shot on iPhone 15 Pro, 24mm wide angle with natural barrel distortion
Slight motion blur suggesting spontaneous capture
Natural smartphone color science with warm tones
Minor lens flare from bright areas
Authentic social media aesthetic`,

  editorial: `📸 Editorial Fashion Style:
Shot on Canon 5D Mark IV with 85mm f/1.4
Professional three-point lighting
Shallow depth of field with creamy bokeh
Magazine-quality but not over-processed
Subtle film grain reminiscent of Portra 400`,

  documentary: `🎥 Documentary Style:
Shot on Fuji X100V or similar rangefinder
Natural available light only
Honest and unposed feeling
Street photography aesthetic
Slight grain and contrast`,

  golden_hour: `🌅 Golden Hour Style:
Warm sunset light at 15-20 degrees above horizon
Long shadows and orange-pink color cast
Natural lens warmth and flare
Glowing skin highlights
Dreamy but authentic`,

  studio_clean: `🏢 Studio Clean Style:
Professional studio lighting setup
White or grey seamless backdrop
Even, flattering illumination
Commercial photography quality
Sharp focus throughout`,

  lifestyle: `🏠 Lifestyle Style:
Natural window light
Lived-in, authentic environments
Candid and relatable
Warm and inviting atmosphere
Instagram lifestyle aesthetic`,
}

/**
 * SCENE PRESETS - Where the photo takes place
 * Now with pose-adaptive placement for natural scene integration
 */
interface ScenePreset {
  description: string
  lighting: string
  details: string
  /** Pose-adaptive placement - scene adapts to user's pose, not the other way around */
  poseAdaptation: {
    standing: string
    sitting: string
    leaning: string
    walking: string
    other: string
  }
}

const SCENE_PRESETS: Record<string, ScenePreset> = {
  keep_original: {
    description: 'Keep the original background exactly as it appears',
    lighting: 'Same lighting as the original photo',
    details: 'Do not modify anything about the environment',
    poseAdaptation: {
      standing: 'Keep exact original placement',
      sitting: 'Keep exact original placement',
      leaning: 'Keep exact original placement',
      walking: 'Keep exact original placement',
      other: 'Keep exact original placement',
    },
  },

  studio_white: {
    description: 'Professional photography studio with seamless white paper backdrop',
    lighting: 'Three-point studio lighting: soft key light from 45°, fill light opposite, rim light for separation',
    details: 'Natural paper curve where wall meets floor, subtle shadow gradients, minor creases visible',
    poseAdaptation: {
      standing: 'Standing naturally on studio floor, full body or 3/4 framing',
      sitting: 'Seated on white studio apple box or stool, clean minimal setup',
      leaning: 'Leaning slightly against white cyclorama wall edge',
      walking: 'Mid-stride movement captured on studio floor',
      other: 'Natural placement on studio floor with appropriate framing',
    },
  },

  studio_grey: {
    description: 'Photography studio with grey muslin fabric backdrop',
    lighting: 'Soft box lighting from camera right creating gentle directional shadows',
    details: 'Natural fabric texture and draping, slightly worn edges, uneven neutral tones',
    poseAdaptation: {
      standing: 'Standing centered against grey backdrop, professional portrait framing',
      sitting: 'Seated on wooden stool or low bench, fabric draping behind',
      leaning: 'Leaning casually against studio wall or posing stand',
      walking: 'Captured in motion across studio space',
      other: 'Natural placement with grey backdrop visible behind',
    },
  },

  outdoor_natural: {
    description: 'Lush Indian garden with bougainvillea, tropical plants, and stone pathways',
    lighting: 'Dappled natural sunlight filtering through leaves, organic shadow patterns',
    details: 'Terracotta pots, moss between stones, fallen flowers, weathered textures',
    poseAdaptation: {
      standing: 'Standing on weathered stone pathway, garden around, bougainvillea visible',
      sitting: 'Seated on low garden wall or ornate stone bench among plants',
      leaning: 'Leaning against old tree trunk or garden pillar with vines',
      walking: 'Strolling through garden path, plants on either side',
      other: 'Naturally placed in garden setting with tropical backdrop',
    },
  },

  outdoor_golden: {
    description: 'Indian rooftop terrace at golden hour with city skyline',
    lighting: 'Warm golden sun at 15°, long shadows, orange-pink sky gradient',
    details: 'Potted tulsi and money plant, faded chairs, rusty railing, atmospheric haze',
    poseAdaptation: {
      standing: 'Standing by terrace railing, golden light on face, city behind',
      sitting: 'Seated on old terrace chair or low parapet wall, sunset visible',
      leaning: 'Leaning on rusty terrace railing, overlooking city at golden hour',
      walking: 'Walking across rooftop terrace, potted plants around',
      other: 'Natural terrace placement with golden hour lighting',
    },
  },

  outdoor_beach: {
    description: 'Authentic Goa beach with palm trees and fishing boats in distance',
    lighting: 'Bright coastal sun with water glare, fill from sand reflection',
    details: 'Wet sand with footprints, seaweed, weathered palms, beach shack visible',
    poseAdaptation: {
      standing: 'Standing on sandy beach, waves in background, palm trees visible',
      sitting: 'Seated on beach sand or colorful beach towel, ocean behind',
      leaning: 'Leaning against weathered palm tree trunk or beach shack post',
      walking: 'Walking along shoreline, wet sand, footprints trailing',
      other: 'Natural beach placement with coastal backdrop',
    },
  },

  street_city: {
    description: 'Vibrant Indian city street with colorful buildings and local life',
    lighting: 'Harsh midday sun with strong shadows, slight dust haze in air',
    details: 'Parked scooters, chai stall, tangled wires, hand-painted signs, auto-rickshaw',
    poseAdaptation: {
      standing: 'Standing on busy sidewalk, colorful shops behind, urban activity visible',
      sitting: 'Seated on weathered building steps or chai stall bench, street visible',
      leaning: 'Leaning against colorful painted wall or old pillar, signs around',
      walking: 'Walking down busy street, scooters and shops blurred behind',
      other: 'Natural street placement with urban Indian backdrop',
    },
  },

  street_cafe: {
    description: 'Cozy Indian café with vintage Bollywood posters and fairy lights',
    lighting: 'Warm ambient bulb light mixed with cool window daylight',
    details: 'Mismatched wooden chairs, chipped tables, plants in recycled tins, chai menu',
    poseAdaptation: {
      standing: 'Standing at café counter ordering, chalkboard menu visible behind',
      sitting: 'Seated at wooden café table, chai cup nearby, fairy lights above',
      leaning: 'Leaning on café counter or doorframe, vintage posters visible',
      walking: 'Entering café through door, interior visible behind',
      other: 'Natural café placement with cozy ambiance',
    },
  },

  lifestyle_home: {
    description: 'Real Indian apartment with natural window light and personal touches',
    lighting: 'Natural window light with dust motes, warm afternoon glow',
    details: 'Family photos, indoor plants, colorful cushions, everyday clutter, chai cup',
    poseAdaptation: {
      standing: 'Standing by window in living room, afternoon light, home visible',
      sitting: 'Seated on sofa or floor cushions, coffee table nearby, homey feel',
      leaning: 'Leaning in doorframe or against kitchen counter at home',
      walking: 'Walking through home corridor or between rooms',
      other: 'Natural home placement with lived-in Indian apartment feel',
    },
  },

  lifestyle_office: {
    description: 'Modern Indian corporate office with typical workspace setup',
    lighting: 'Overhead fluorescent mixed with window light from one side',
    details: 'Dual monitors, papers, water bottle, desk plant, motivational poster',
    poseAdaptation: {
      standing: 'Standing by office window or near whiteboard, colleagues blurred behind',
      sitting: 'Seated at desk with ergonomic chair, laptop open, coffee mug nearby',
      leaning: 'Leaning on cubicle divider or standing desk, office visible',
      walking: 'Walking through office corridor, glass partitions visible',
      other: 'Natural office placement with corporate workspace backdrop',
    },
  },

  editorial_minimal: {
    description: 'Minimal industrial space with raw concrete and architectural elements',
    lighting: 'Dramatic directional light creating deep shadows, rim light on hair',
    details: 'Raw concrete walls with form marks, polished floor with scuffs, negative space',
    poseAdaptation: {
      standing: 'Standing in vast industrial space, concrete walls, dramatic shadows',
      sitting: 'Seated on concrete ledge or industrial step, architectural lines visible',
      leaning: 'Leaning against raw concrete column, dramatic rim lighting',
      walking: 'Striding through industrial space, motion and architecture combined',
      other: 'Natural placement in minimal industrial setting',
    },
  },
}

// ====================================================================================
// ANTI-AI MARKERS - Making images look authentic
// ====================================================================================

const REALISM_REQUIREMENTS = `🎯 ANTI-AI REQUIREMENTS (Make it look REAL, not AI-generated):

HUMAN DETAILS:
• Visible skin pores and fine texture on face
• Natural micro-expressions (not frozen perfect smile)
• Subtle skin color variation across face and body
• Natural hair with flyaways, frizz, and imperfect strands
• Real eye reflections showing light source

CLOTHING PHYSICS:
• Natural fabric wrinkles from body movement
• Proper draping based on fabric weight and type
• Minor imperfections in how clothes fit
• Realistic shadows under fabric folds

ENVIRONMENT AUTHENTICITY:
• Real-world imperfections (dust, wear, age)
• Proper depth of field and focus
• Subtle film grain or sensor noise
• Natural color variations in lighting

AVOID THESE AI TELLS:
• Plastic/waxy skin appearance
• Over-sharpened or over-smoothed features
• Uncanny symmetry in face or body
• Floating or detached elements
• Unrealistic lighting or shadows`

// ====================================================================================
// PROMPT BUILDERS - NEW ARCHITECTURE: Image-only identity, text-only garment
// ====================================================================================

interface PromptContext {
  presetId: string | null
  scene: typeof SCENE_PRESETS[string] | null
  styleKey: string
  keepBackground: boolean
  garmentDescription: string // Text description from garment analysis
  lightingInstruction?: string
}

/**
 * Build prompt for NEW ARCHITECTURE: Identity from image only, garment from text
 * No forensic analysis, no multi-image references, no garment images
 */
function buildProPrompt(ctx: PromptContext): string {
  const { scene, styleKey, keepBackground, garmentDescription, lightingInstruction } = ctx

  const style = STYLE_SETTINGS[styleKey] || STYLE_SETTINGS.iphone_candid
  const lighting = lightingInstruction || 'natural lighting'

  // Identity lock - from image only, no text descriptions
  const identityLock = `═══════════════════════════════════════════════════════════════════════════════
🔒 IDENTITY PRESERVATION (FROM IMAGE ONLY)
═══════════════════════════════════════════════════════════════════════════════
The person in the image is your identity reference. Do NOT generate a new person.
Preserve the same face, same features, same skin tone, same hair.
The image is the ONLY source of identity - do not describe or modify facial features.
═══════════════════════════════════════════════════════════════════════════════`

  // Keep background mode
  if (keepBackground) {
    return `VIRTUAL CLOTHING TRY-ON

${identityLock}

YOUR TASK:
Create a new photo of this EXACT same person wearing a new outfit.

GARMENT TO APPLY:
${garmentDescription}

WHAT TO DO:
1. Remove their current outfit completely
2. Dress them in the garment described above
3. Keep EVERYTHING else identical: background, lighting, pose, expression, hair
4. The clothing should fit naturally on their body shape

CLOTHING APPLICATION:
• Match the garment description exactly (color, pattern, design)
• Natural wrinkles and draping based on their current pose
• Appropriate fit for their body type

${REALISM_REQUIREMENTS}

QUALITY CHECK:
The result should look like the next frame of a video - same person, same setting, just changed clothes.
Their family should recognize them instantly.`
  }

  // Scene change mode
  if (scene && scene.description) {
    return `FASHION PHOTOGRAPHY: VIRTUAL TRY-ON WITH NEW SCENE

${identityLock}

YOUR TASK:
Create a professional fashion photo of this person wearing a new outfit in a new setting.

GARMENT TO APPLY:
${garmentDescription}

STEP 1 - IDENTITY:
The person in the image is your identity reference. Preserve their face exactly.
Do not generate a new person. Do not change facial features.

STEP 2 - OUTFIT:
Remove current clothing. Apply the garment described above.
Natural fit with realistic fabric behavior.

STEP 3 - SCENE:
📍 LOCATION: ${scene.description}
💡 LIGHTING: ${scene.lighting}
🔍 DETAILS: ${scene.details}

STEP 4 - STYLE:
${style}

${REALISM_REQUIREMENTS}

CRITICAL RULES:
• Face CANNOT change - preserve from the input image
• New lighting affects skin and clothes naturally, but features stay identical
• Background should be sharp and detailed, not blurry AI mush
• Include realistic environmental imperfections (dust, wear, texture)

The person should look naturally photographed in this location.`
  }

  // Custom background (fallback)
  return `VIRTUAL TRY-ON

${identityLock}

GARMENT TO APPLY:
${garmentDescription}

OUTFIT: Apply the garment described above with natural fit.

${style}

${REALISM_REQUIREMENTS}

Create an authentic-looking photo of this exact person in the new outfit.`
}

/**
 * Build prompt for Flash model - NEW ARCHITECTURE: Image-only identity, text-only garment
 */
function buildFlashPrompt(ctx: PromptContext): string {
  const { scene, keepBackground, garmentDescription, lightingInstruction } = ctx

  const lighting = lightingInstruction || 'natural lighting'

  // Identity lock - from image only, no text descriptions
  const identityLock = `═══════════════════════════════════════════════════════════════════════════════
🔒 IDENTITY PRESERVATION (FROM IMAGE ONLY)
═══════════════════════════════════════════════════════════════════════════════
The person in the image is your identity reference. Do NOT generate a new person.
Preserve the same face, same features, same skin tone, same hair.
The image is the ONLY source of identity - do not describe or modify facial features.
═══════════════════════════════════════════════════════════════════════════════`

  if (keepBackground) {
    return `CLOTHING TRY-ON - SAME PERSON, SAME BACKGROUND

${identityLock}

GARMENT TO APPLY:
${garmentDescription}

TASK:
1. Remove their current outfit completely
2. Apply the garment described above
3. Keep the exact background from the input image
4. Keep the same pose and expression

⚠️ CRITICAL: 
- Do NOT generate a new person - preserve the face from the image
- The garment description above is the ONLY source for clothing
- Do NOT blend old and new outfits

❌ FORBIDDEN: Different face, changed eyes, mixing old/new clothes, hallucinations/artifacts

OUTPUT: SAME person (from image) wearing NEW clothes (from description).`
  }

  if (scene && scene.description) {
    return `CLOTHING TRY-ON + SCENE CHANGE

${identityLock}

GARMENT TO APPLY:
${garmentDescription}

TASK:
1. Remove their current outfit completely
2. Apply the garment described above
3. Change background to: ${scene.description}
4. Pose can vary naturally (not locked)

SCENE:
📍 ${scene.description}
💡 ${scene.lighting}
🔍 ${scene.details}

⚠️ REMINDER: Face MUST match the input image. Do NOT generate new person.

❌ FORBIDDEN: 
• Different face or person
• Changed eye shape or color
• Lighter or darker skin
• Changed lip shape
• Smoothed/plastic skin

OUTPUT: SAME person (face from image), NEW clothes (from description), NEW background.`
  }

  // Fallback
  return `CLOTHING TRY-ON

${identityLock}

GARMENT TO APPLY:
${garmentDescription}

Apply the garment described above.
Keep EXACT same face (from image).
Pose can vary naturally.

OUTPUT: Same person, new outfit.`
}

// ====================================================================================
// RENDER FUNCTIONS
// ====================================================================================

export interface SimpleRenderOptions {
  subjectImageBase64: string // Image 1: Person (identity source)
  garmentImageBase64: string // Image 2: Garment (visual reference, no face/identity)
  backgroundInstruction: string
  lightingInstruction?: string
  quality: 'fast' | 'high'
  aspectRatio?: string
  resolution?: string
  stylePresetId?: string
}

// ====================================================================================
// DEPRECATED: FORENSIC-ENHANCED PROMPTS (Not used in new architecture)
// ====================================================================================
// These functions are kept for reference but are not called in the new architecture.
// The new architecture uses image-only identity (no forensic text descriptions).

/**
 * @deprecated Not used in new architecture - identity comes from image only
 */
function buildDynamicEyeLock(analysis: any): string {
  return `
═══════════════════════════════════════════════════════════════════════════════
👁️ BIOMETRIC EYE LOCK (NON-NEGOTIABLE HIGHEST PRIORITY)
═══════════════════════════════════════════════════════════════════════════════
The eyes are the PRIMARY identity vector. You must match these specific forensics:

• COLOR: [${analysis.eyeColor || 'Reference'}] - Exact match required
• SHAPE: [${analysis.eyeShape || 'Reference'}]
• EYEBROWS: [${analysis.eyebrowShape || 'Reference'}] - ${analysis.eyebrowThickness || ''}
• LIDS: [${analysis.eyelidType || 'Reference'}]

⚠️ REJECTION CRITERIA:
- If eye color is different -> REJECT
- If eye shape is generic/round -> REJECT
- If skin around eyes is smoothed -> REJECT
═══════════════════════════════════════════════════════════════════════════════`
}

/**
 * @deprecated Not used in new architecture - identity comes from image only
 */
function buildForensicEnhancedPrompt(
  faceAnalysis: any,
  garmentAnalysis: GarmentAnalysis,
  scene: ScenePreset | null,
  styleKey: string,
  keepBackground: boolean,
  identityCount: number,
  photoAnalysis?: any,
  variant: 'flash' | 'pro' = 'pro'
): string {
  const style = STYLE_SETTINGS[styleKey] || STYLE_SETTINGS.iphone_candid
  // @ts-ignore - deprecated function
  const identityPrompt = buildIdentityPromptFromAnalysis(faceAnalysis)
  const eyeLockPrompt = buildDynamicEyeLock(faceAnalysis)
  // @ts-ignore - deprecated function
  const garmentPrompt = buildGarmentPromptFromAnalysis(garmentAnalysis)

  // Get detected body pose for scene adaptation
  const bodyPose: any = photoAnalysis?.body_pose || 'standing'

  // Get pose-adaptive placement if scene is available
  const poseSpecificPlacement = (scene?.poseAdaptation && typeof bodyPose === 'string' && bodyPose in scene.poseAdaptation)
    ? scene.poseAdaptation[bodyPose as keyof typeof scene.poseAdaptation] || ''
    : ''

  const captureHints = photoAnalysis
    ? `CAPTURE MATCH(from original photo):
- Camera: ${photoAnalysis.camera_summary}
- Lighting: ${photoAnalysis.lighting_summary}
- Detected pose: ${bodyPose.toUpperCase()} - adapt scene accordingly
  - Realism: ${photoAnalysis.realism_constraints}
- Lens hint: ${photoAnalysis.camera_manifest.focal_length_hint_mm} mm, DOF: ${photoAnalysis.camera_manifest.dof_hint}
- WB: ${photoAnalysis.camera_manifest.wb_family}, Grain: ${photoAnalysis.camera_manifest.imperfections.grain_level}

COMPOSITING AVOIDANCE:
- Do NOT look like a cutout.No halo edges.Add subtle light wrap and ambient occlusion.
- Add correct contact shadows on neck / under chin / under arms / where clothes touch body.
- Match background blur, grain / noise, and compression to the subject photo.`
    : ''

  const refExplanation = identityCount > 0
    ? `You have ${identityCount + 1} reference photos of the SAME PERSON.The LAST image is the GARMENT.`
    : `Image 1 = PERSON reference.Image 2 = GARMENT to apply.`

  if (keepBackground) {
    // Flash works best with short "edit the photo" instructions to avoid face drift.
    if (variant === 'flash') {
      return `🎯 CLOTHING TRY - ON: CHANGE THE OUTFIT

${refExplanation}

CHARACTER REFERENCE: Use Images 1 - ${identityCount + 1} as character reference sheets.
These images show the EXACT person who must appear.Maintain their exact facial features.

  ${identityPrompt}

${garmentPrompt}

═══════════════════════════════════════════════════════════════════════════════
🚨 CRITICAL: YOU MUST CHANGE THE CLOTHING
═══════════════════════════════════════════════════════════════════════════════
The person is currently wearing one outfit.You MUST replace it with a DIFFERENT outfit from the garment reference.

⚠️ ANTI - HALLUCINATION CHECK:
- Look at the LAST image - that is the NEW garment
  - The output person MUST be wearing THIS garment, NOT their original clothes
    - If the output looks the same as input → YOU FAILED
      - The garment color, style, and type MUST match the garment reference exactly

═══════════════════════════════════════════════════════════════════════════════
TASK: SWAP CLOTHING
═══════════════════════════════════════════════════════════════════════════════
1. LOOK at the garment reference(last image) - memorize its color, style, fabric
2. REMOVE the person's current outfit COMPLETELY (no traces left)
3. DRESS them in the garment from the reference - exact same color and style
4. Keep face, body, pose, background UNCHANGED

⛔ NEGATIVE PROMPT(FORBIDDEN):
- Changing facial structure, different person, morphing features, cartoonish face
  - Widening or narrowing face, changing eye shape, altering nose or lips
    - Lightening or darkening skin tone, smoothing skin texture
      - Changing hairstyle, hair color, or hair texture
        - Beautifying, perfecting, or "improving" the person's appearance
          - Keeping the original outfit(MOST COMMON FAILURE)

✅ TECHNICAL REQUIREMENTS(For Realistic Texture):
- Shot on 85mm lens, visible pore details, slight skin imperfections
  - Natural skin texture with micro - details, not plastic or waxy
    - Realistic fabric wrinkles and draping
      - Match original photo's grain, compression, and sharpness

✅ SUCCESS CRITERIA:
- Person wears EXACTLY the garment from reference
  - Garment color matches reference exactly
    - Face is IDENTICAL to character reference images
      - Background is identical to input(same photo quality, not AI - perfect)

OUTPUT: Same person(from character reference), same background, DIFFERENT outfit(from garment reference).`
    }

    return `🔒 CLOTHING TRY - ON - FORENSIC IDENTITY MODE

${refExplanation}

CHARACTER REFERENCE: Images 1 - ${identityCount + 1} are character reference sheets.
Use these as the ground truth for the person's identity. Maintain exact facial features.

${identityPrompt}

${eyeLockPrompt}

${garmentPrompt}

═══════════════════════════════════════════════════════════════════════════════
🚨🚨🚨 CRITICAL: YOU MUST CHANGE THE CLOTHING 🚨🚨🚨
═══════════════════════════════════════════════════════════════════════════════
This is a TRY - ON task.The person MUST end up wearing a DIFFERENT outfit.

  ANTI - HALLUCINATION CHECKLIST:
□ Look at the LAST image - that is the NEW garment to apply
□ Memorize its exact color, fabric, neckline, sleeves, pattern
□ The output person MUST wear THIS garment, NOT their original clothes
□ If output looks like input → TASK FAILED
□ If garment color / style differs from reference → TASK FAILED

═══════════════════════════════════════════════════════════════════════════════
⛔ NEGATIVE PROMPT(FORBIDDEN - PREVENTS FACE DRIFT):
═══════════════════════════════════════════════════════════════════════════════
Ensure consistent identity.FORBIDDEN:
- Changing facial structure, different person, morphing features, cartoonish face
  - Widening or narrowing face, changing eye shape / size / spacing, altering nose / lips
    - Lightening or darkening skin tone, smoothing skin texture, removing pores
      - Changing hairstyle, hair color, or hair texture
        - Beautifying, perfecting, or "improving" the person's appearance
          - Averaging faces, blending identities, creating a generic face
            - Keeping the original outfit(MOST COMMON FAILURE)

═══════════════════════════════════════════════════════════════════════════════
✅ TECHNICAL REQUIREMENTS(Candid Photography Technique):
═══════════════════════════════════════════════════════════════════════════════
- Shot on 85mm lens, visible pore details, slight skin imperfections
  - Natural skin texture with micro - details, not plastic or waxy
    - Realistic fabric wrinkles and draping
      - Match original photo's grain, compression, and sharpness
        - Candid photography style, not studio - perfect

═══════════════════════════════════════════════════════════════════════════════
🔐 SOURCE HIERARCHY
═══════════════════════════════════════════════════════════════════════════════
IDENTITY → Character reference images(Images 1 - ${identityCount + 1}) - use as ground truth
CLOTHING → Garment reference(LAST image) ← THIS MUST BE APPLIED
BACKGROUND → Keep ORIGINAL from person image(do NOT regenerate)
POSE → Keep original
LIGHTING → Keep original

═══════════════════════════════════════════════════════════════════════════════
📋 EXECUTION STEPS
═══════════════════════════════════════════════════════════════════════════════
1. STUDY the garment reference - what color ? what style ? what fabric ?
  2. STUDY the person references - memorize face details
3. REMOVE person's current outfit COMPLETELY
4. DRESS them in the garment from reference - EXACT color and style
5. VERIFY: Is the new outfit DIFFERENT from original ? If same → redo
6. VERIFY: Does garment match reference exactly ? If not → redo
7. VERIFY: Is face identical ? Is background unchanged ?

═══════════════════════════════════════════════════════════════════════════════
⛔ FAILURE MODES(MUST AVOID)
═══════════════════════════════════════════════════════════════════════════════
❌ Keeping the original outfit(MOST COMMON FAILURE)
❌ Generating a similar but not identical garment
❌ Wrong garment color(must match reference exactly)
❌ AI - generated / artificial looking background
❌ Face drift or beautification

═══════════════════════════════════════════════════════════════════════════════
✅ SUCCESS CRITERIA
═══════════════════════════════════════════════════════════════════════════════
✓ Person wears EXACTLY the garment from the reference image
✓ Garment color and style match reference precisely
✓ Face is biometrically identical
✓ Background is ORIGINAL(not AI - regenerated, same quality / grain)
✓ Natural fabric wrinkles and draping

OUTPUT: SAME person + SAME background + DIFFERENT outfit(from garment ref).`
  }

  if (scene?.description) {
    return `📸 CLOTHING TRY - ON + SCENE CHANGE

${refExplanation}

CHARACTER REFERENCE: Images 1 - ${identityCount + 1} are character reference sheets.
Use these as the ground truth for the person's identity. Maintain exact facial features.

${identityPrompt}

${eyeLockPrompt}

${garmentPrompt}

═══════════════════════════════════════════════════════════════════════════════
🚨🚨🚨 CRITICAL: YOU MUST CHANGE THE CLOTHING 🚨🚨🚨
═══════════════════════════════════════════════════════════════════════════════
This is a TRY - ON task.The person MUST wear a DIFFERENT outfit.

  ANTI - HALLUCINATION CHECKLIST:
□ Look at the LAST image - that is the NEW garment
□ Memorize its exact color, fabric, neckline, sleeves, pattern
□ The output person MUST wear THIS garment, NOT their original clothes
□ If output clothing looks like input → TASK FAILED

═══════════════════════════════════════════════════════════════════════════════
⛔ NEGATIVE PROMPT(FORBIDDEN - PREVENTS FACE DRIFT):
═══════════════════════════════════════════════════════════════════════════════
Ensure consistent identity.FORBIDDEN:
- Changing facial structure, different person, morphing features, cartoonish face
  - Widening or narrowing face, changing eye shape / size / spacing, altering nose / lips
    - Lightening or darkening skin tone, smoothing skin texture, removing pores
      - Changing hairstyle, hair color, or hair texture
        - Beautifying, perfecting, or "improving" the person's appearance
          - Averaging faces, blending identities, creating a generic face
            - Keeping the original outfit(MOST COMMON FAILURE)

═══════════════════════════════════════════════════════════════════════════════
✅ TECHNICAL REQUIREMENTS(Candid Photography Technique):
═══════════════════════════════════════════════════════════════════════════════
- Shot on 85mm lens, visible pore details, slight skin imperfections
  - Natural skin texture with micro - details, not plastic or waxy
    - Realistic fabric wrinkles and draping
      - Match original photo's grain, compression, and sharpness
        - Candid photography style, not studio - perfect

═══════════════════════════════════════════════════════════════════════════════
🔐 SOURCE HIERARCHY
═══════════════════════════════════════════════════════════════════════════════
IDENTITY → Character reference images(Images 1 - ${identityCount + 1}) - use as ground truth
CLOTHING → Garment reference(LAST image) ← MUST BE APPLIED
POSE → Keep from person image(${bodyPose.toUpperCase()})
BACKGROUND → NEW scene(described below)

${captureHints}

═══════════════════════════════════════════════════════════════════════════════
🎬 SCENE(NEW BACKGROUND)
═══════════════════════════════════════════════════════════════════════════════
📍 ${scene.description}
💡 ${scene.lighting}
🔍 ${scene.details}

⚠️ ANTI - AI BACKGROUND RULES:
- Background must look like a REAL PHOTOGRAPH, not AI - generated
  - Add natural imperfections: dust, wear, uneven lighting, real textures
    - Include mundane details: power lines, cracks, stains, everyday objects
      - Avoid: perfect symmetry, unnaturally clean surfaces, generic compositions
        - Match the photo quality to the person(same grain, compression, sharpness)

═══════════════════════════════════════════════════════════════════════════════
🧍 POSE - ADAPTIVE PLACEMENT
═══════════════════════════════════════════════════════════════════════════════
Person is ${bodyPose.toUpperCase()} → Scene adapts: ${poseSpecificPlacement}
Do NOT change their pose.Scene wraps around them.

═══════════════════════════════════════════════════════════════════════════════
📋 EXECUTION STEPS
═══════════════════════════════════════════════════════════════════════════════
1. STUDY garment reference - what color ? style ? fabric ?
  2. STUDY person references - memorize face
3. REMOVE person's current outfit COMPLETELY
4. DRESS them in garment from reference - EXACT color / style
5. KEEP their pose(${bodyPose})
6. CREATE realistic scene around them
7. VERIFY: Is outfit DIFFERENT from original ? If same → redo
8. VERIFY: Does garment match reference ? If not → redo
9. VERIFY: Does background look like real photo ? If AI - perfect → redo

═══════════════════════════════════════════════════════════════════════════════
⛔ FAILURE MODES
═══════════════════════════════════════════════════════════════════════════════
❌ Keeping original outfit(MOST COMMON FAILURE)
❌ Wrong garment color(must match reference)
❌ AI - looking background(too clean, too perfect)
❌ Face drift or beautification

═══════════════════════════════════════════════════════════════════════════════
✅ SUCCESS CRITERIA
═══════════════════════════════════════════════════════════════════════════════
✓ Person wears EXACTLY the garment from reference
✓ Face is biometrically identical to input
✓ Pose matches input(${bodyPose})
✓ Background looks like REAL photo(not AI - generated)
✓ Natural integration: shadows, lighting, grain

OUTPUT: Same person + same pose + DIFFERENT outfit + realistic new scene.`
  }

  return `🎯 CLOTHING TRY - ON - CHANGE THE OUTFIT

${refExplanation}

CHARACTER REFERENCE: Images 1 - ${identityCount + 1} are character reference sheets.
Use these as the ground truth for the person's identity. Maintain exact facial features.

${identityPrompt}

${eyeLockPrompt}

${garmentPrompt}

═══════════════════════════════════════════════════════════════════════════════
🚨 CRITICAL: YOU MUST CHANGE THE CLOTHING 🚨
═══════════════════════════════════════════════════════════════════════════════
Look at the LAST image - that is the NEW garment.
The output person MUST wear THIS garment, NOT their original clothes.
If output looks like input → TASK FAILED.

═══════════════════════════════════════════════════════════════════════════════
⛔ NEGATIVE PROMPT(FORBIDDEN):
═══════════════════════════════════════════════════════════════════════════════
- Changing facial structure, different person, morphing features, cartoonish face
  - Widening or narrowing face, changing eye shape / size / spacing, altering nose / lips
    - Lightening or darkening skin tone, smoothing skin texture, removing pores
      - Changing hairstyle, hair color, or hair texture
        - Beautifying, perfecting, or "improving" the person's appearance
          - Keeping the original outfit(MOST COMMON FAILURE)

═══════════════════════════════════════════════════════════════════════════════
✅ TECHNICAL REQUIREMENTS:
═══════════════════════════════════════════════════════════════════════════════
- Shot on 85mm lens, visible pore details, slight skin imperfections
  - Natural skin texture with micro - details, not plastic or waxy
    - Realistic fabric wrinkles and draping

═══════════════════════════════════════════════════════════════════════════════
🔐 RULES
═══════════════════════════════════════════════════════════════════════════════
IDENTITY → From character reference images(use as ground truth)
CLOTHING → From garment reference(LAST image) - MUST apply this
BACKGROUND → Keep original

OUTPUT: Same person(from character reference), DIFFERENT outfit(from garment reference).`
}

// ====================================================================================
// GARMENT-ONLY EXTRACTION (Prevents face-bleed from garment reference images)
// ====================================================================================

/**
 * @deprecated Not used in new architecture - garment images are never sent to Gemini
 */
async function extractGarmentOnlyReference(
  client: GoogleGenAI,
  model: string,
  garmentBase64: string
): Promise<string> {
  // Use a fast, deterministic extraction pass to produce a garment-only reference.
  const extractionPrompt = `GARMENT EXTRACTION(CLOTHING ONLY)

You are given an image that may include a person wearing a garment.
Your job: output an image that contains ONLY the garment.Remove the person completely.

  Requirements:
- Output a clean garment - only reference image on a plain white background(flat - lay or mannequin is OK, but NO HUMAN).
- Preserve the garment EXACTLY: color, pattern, fabric texture, neckline, sleeves, trims, logos, embroidery.
- Do NOT add accessories, do NOT change garment design, do NOT change colors.
- Keep the garment centered, fully visible, sharp focus, neutral lighting.

Return ONLY the extracted garment image.`

  const contents: ContentListUnion = [
    { inlineData: { data: garmentBase64, mimeType: 'image/jpeg' } } as any,
    extractionPrompt,
  ]

  const config: GenerateContentConfig = {
    responseModalities: ['IMAGE'],
    imageConfig: { aspectRatio: '1:1' } as any,
    temperature: 0.05,
  }

  const resp = await client.models.generateContent({ model, contents, config })
  if (resp.candidates?.length) {
    for (const part of resp.candidates[0]?.content?.parts || []) {
      if (part.inlineData?.mimeType?.startsWith('image/') && part.inlineData?.data) {
        return part.inlineData.data
      }
    }
  }
  throw new Error('Garment extraction failed - no image generated')
}

/**
 * @deprecated Not used in new architecture - single-step only
 */
async function renderTwoStepForensic(
  client: GoogleGenAI,
  model: string,
  subjectBase64: string,
  garmentBase64: string,
  identityImages: string[],
  faceAnalysis: any,
  garmentAnalysis: GarmentAnalysis,
  scene: ScenePreset,
  styleKey: string,
  aspectRatio: string,
  resolution?: string,
  photoAnalysis?: any
): Promise<string> {
  const identityCount = identityImages.length
  const style = STYLE_SETTINGS[styleKey] || STYLE_SETTINGS.iphone_candid
  // @ts-ignore - deprecated function
  const identityPrompt = buildIdentityPromptFromAnalysis(faceAnalysis)
  const eyeLockPrompt = buildDynamicEyeLock(faceAnalysis)
  // @ts-ignore - deprecated function
  const garmentPrompt = buildGarmentPromptFromAnalysis(garmentAnalysis)

  // Get detected body pose for scene adaptation
  const bodyPose: any = photoAnalysis?.body_pose || 'standing'
  const poseSpecificPlacement = (scene.poseAdaptation && typeof bodyPose === 'string' && bodyPose in scene.poseAdaptation)
    ? scene.poseAdaptation[bodyPose as keyof typeof scene.poseAdaptation] || ''
    : ''

  console.log('🎯 TWO-STEP (FORENSIC)')
  console.log('   Step 1: Identity + Outfit Lock (neutral background)')

  const step1Prompt = `STEP 1: DRESS THIS PERSON IN THE NEW GARMENT

CHARACTER REFERENCE: Images 1 - ${identityCount + 1} are character reference sheets.
Use these as the ground truth for the person's identity. Maintain exact facial features.

The LAST image is the NEW GARMENT to apply.

🚨 CRITICAL: YOU MUST CHANGE THEIR CLOTHING 🚨
- Look at the LAST image - that is the new garment
  - Memorize its color, fabric, neckline, sleeves, pattern
    - The person MUST end up wearing THIS garment, not their original clothes
      - If output looks like input → TASK FAILED

═══════════════════════════════════════════════════════════════════════════════
${identityPrompt}
${eyeLockPrompt}
═══════════════════════════════════════════════════════════════════════════════
${garmentPrompt}

⛔ NEGATIVE PROMPT(FORBIDDEN):
- Changing facial structure, different person, morphing features, cartoonish face
  - Widening or narrowing face, changing eye shape / size / spacing, altering nose / lips
    - Lightening or darkening skin tone, smoothing skin texture, removing pores
      - Changing hairstyle, hair color, or hair texture
        - Beautifying, perfecting, or "improving" the person's appearance
          - Keeping the original outfit(MOST COMMON FAILURE)

✅ TECHNICAL REQUIREMENTS:
- Shot on 85mm lens, visible pore details, slight skin imperfections
  - Natural skin texture with micro - details, not plastic or waxy
    - Realistic fabric wrinkles and draping

RULES:
• CLOTHING from garment reference ONLY - apply this exact garment
• IDENTITY from character reference images ONLY - same face exactly
• IGNORE any person in garment image
• REMOVE original outfit completely - no traces

TASK:
1) STUDY garment reference - memorize its color and style
2) REMOVE the person's current outfit
3) DRESS them in the garment from reference
4) Use plain grey studio background
5) VERIFY: Are they wearing the NEW garment ? If same as input → redo

OUTPUT: Same person(from character reference) + DIFFERENT outfit(from garment reference) + grey background.`

  const step1Contents: ContentListUnion = []
  step1Contents.push({ inlineData: { data: subjectBase64, mimeType: 'image/jpeg' } } as any)
  for (const img of identityImages) {
    if (img && img.length > 100) {
      step1Contents.push({ inlineData: { data: img, mimeType: 'image/jpeg' } } as any)
    }
  }
  step1Contents.push({ inlineData: { data: garmentBase64, mimeType: 'image/jpeg' } } as any)
  step1Contents.push(step1Prompt)

  const step1Config: GenerateContentConfig = {
    responseModalities: ['IMAGE'],
    imageConfig: { aspectRatio } as any,
    temperature: 0.01,
  }

  const step1Resp = await client.models.generateContent({
    model,
    contents: step1Contents,
    config: step1Config,
  })

  let step1Image: string | null = null
  if (step1Resp.candidates?.length) {
    for (const part of step1Resp.candidates[0]?.content?.parts || []) {
      if (part.inlineData?.mimeType?.startsWith('image/') && part.inlineData?.data) {
        step1Image = part.inlineData.data
        break
      }
    }
  }
  if (!step1Image) throw new Error('Forensic Step 1 failed - no image generated')

  console.log('   Step 2: Scene Application (identity locked)')

  const captureHints = photoAnalysis
    ? `CAPTURE MATCH(from original photo):
- Camera: ${photoAnalysis.camera_summary}
- Lighting: ${photoAnalysis.lighting_summary}
- Realism: ${photoAnalysis.realism_constraints}
- Lens hint: ${photoAnalysis.camera_manifest.focal_length_hint_mm} mm, DOF: ${photoAnalysis.camera_manifest.dof_hint}
- WB: ${photoAnalysis.camera_manifest.wb_family}, Grain: ${photoAnalysis.camera_manifest.imperfections.grain_level}
`
    : ''

  const step2Prompt = `STEP 2: PLACE IN REALISTIC SCENE

Take this person EXACTLY as they appear and place them in a new environment.

═══════════════════════════════════════════════════════════════════════════════
🔒 PERSON IS LOCKED(DO NOT CHANGE)
═══════════════════════════════════════════════════════════════════════════════
• Face: Keep EXACTLY as in input image
• Skin tone: Keep EXACTLY as in input
• Clothing: Keep EXACTLY as in input(from Step 1)
• Pose: Keep EXACTLY(${bodyPose.toUpperCase()})
• Body: No changes whatsoever

⛔ NEGATIVE PROMPT(FORBIDDEN):
- Changing facial structure, different person, morphing features, cartoonish face
  - Widening or narrowing face, changing eye shape / size / spacing, altering nose / lips
    - Lightening or darkening skin tone, smoothing skin texture, removing pores
      - Changing hairstyle, hair color, or hair texture
        - Beautifying, perfecting, or "improving" the person's appearance

═══════════════════════════════════════════════════════════════════════════════
🎬 NEW SCENE
═══════════════════════════════════════════════════════════════════════════════
📍 ${scene.description}
💡 ${scene.lighting}
🔍 ${scene.details}

Pose - adaptive: ${poseSpecificPlacement}

═══════════════════════════════════════════════════════════════════════════════
⚠️ ANTI - AI BACKGROUND RULES(CRITICAL)
═══════════════════════════════════════════════════════════════════════════════
The background must look like a REAL PHOTOGRAPH, not AI - generated:
✓ Add natural imperfections: dust, wear, scratches, uneven paint
✓ Add mundane real - world details: power lines, pipes, stains, cracks
✓ Include asymmetry and natural randomness
✓ Add realistic textures: rough concrete, worn wood, dusty surfaces
✓ Match photo grain / noise to the person
✗ Avoid: perfect symmetry, impossibly clean surfaces
✗ Avoid: unnaturally vibrant colors
✗ Avoid: generic / stock - photo compositions
✗ Avoid: smooth, "rendered" looking surfaces

${style}

${captureHints}

═══════════════════════════════════════════════════════════════════════════════
🔗 INTEGRATION(Avoid Photoshop / cutout look)
═══════════════════════════════════════════════════════════════════════════════
- Same noise / grain as the person
  - Matching shadow direction
    - Contact shadows: under chin, arms, where clothes touch body
      - Natural light wrap on edges
        - Matching depth - of - field
          - Scene elements positioned for ${bodyPose} pose

OUTPUT: Same person(unchanged) naturally photographed in realistic scene.`

  const step2Contents: ContentListUnion = [
    { inlineData: { data: step1Image, mimeType: 'image/jpeg' } } as any,
    step2Prompt,
  ]

  const imageConfig: ImageConfig = { aspectRatio } as any
  if (model.includes('pro') && resolution) {
    ; (imageConfig as any).imageSize = resolution
  }

  const step2Config: GenerateContentConfig = {
    responseModalities: ['IMAGE'],
    imageConfig,
    temperature: 0.2,
  }

  const step2Resp = await client.models.generateContent({
    model,
    contents: step2Contents,
    config: step2Config,
  })

  if (step2Resp.candidates?.length) {
    for (const part of step2Resp.candidates[0]?.content?.parts || []) {
      if (part.inlineData?.mimeType?.startsWith('image/') && part.inlineData?.data) {
        return part.inlineData.data
      }
    }
  }

  console.log('   ⚠️ Forensic Step 2 failed, returning Step 1 result')
  return step1Image
}

/**
 * Single-step render - PHASE 3: Person image + Garment image (2 images total)
 */
async function renderSingleStep(
  client: GoogleGenAI,
  model: string,
  subjectBase64: string,
  garmentImageBase64: string, // Garment image (visual reference)
  prompt: string,
  aspectRatio: string,
  temperature: number,
  resolution?: string
): Promise<string> {
  // Build contents array: Image 1 (person) + Image 2 (garment) + Prompt text
  const contents: ContentListUnion = []

  // IMAGE 1: Person (identity source)
  contents.push({ inlineData: { data: subjectBase64, mimeType: 'image/jpeg' } } as any)

  // IMAGE 2: Garment (visual reference only, no identity)
  contents.push({ inlineData: { data: garmentImageBase64, mimeType: 'image/jpeg' } } as any)

  // Prompt (includes role separation and garment application rules)
  contents.push(prompt)

  // ============================================================
  // PHASE 3: DEBUG & SAFETY ASSERTIONS (MANDATORY)
  // ============================================================
  const imageCount = contents.filter((item: any) => item.inlineData?.mimeType?.startsWith('image/')).length
  const personImageCount = 1 // Image 1 is person
  const garmentImageCount = 1 // Image 2 is garment
  const identityImageCount = 0 // No additional identity refs in Phase 3

  console.log(`\n   🔍 DEBUG & SAFETY ASSERTIONS (renderSingleStep):`)
  console.log(`      Final assembled prompt preview: ${prompt.slice(0, 100)}...`)
  console.log(`      Images sent to Gemini: ${imageCount} (MUST BE 2)`)
  console.log(`      Image 1 (person): ${personImageCount} (MUST BE 1)`)
  console.log(`      Image 2 (garment): ${garmentImageCount} (MUST BE 1)`)
  console.log(`      Identity refs: ${identityImageCount} (MUST BE 0)`)

  // HARD FAILURE if contract violated
  if (imageCount !== 2) {
    const error = new Error(`ARCHITECTURE VIOLATION: Expected exactly 2 images, got ${imageCount}`)
    console.error(`   ❌ ${error.message}`)
    throw error
  }

  if (personImageCount !== 1) {
    const error = new Error(`ARCHITECTURE VIOLATION: Expected 1 person image (Image 1), got ${personImageCount}`)
    console.error(`   ❌ ${error.message}`)
    throw error
  }

  if (garmentImageCount !== 1) {
    const error = new Error(`ARCHITECTURE VIOLATION: Expected 1 garment image (Image 2), got ${garmentImageCount}`)
    console.error(`   ❌ ${error.message}`)
    throw error
  }

  if (identityImageCount !== 0) {
    const error = new Error(`ARCHITECTURE VIOLATION: Expected 0 identity refs, got ${identityImageCount}`)
    console.error(`   ❌ ${error.message}`)
    throw error
  }

  console.log(`   ✅ All architecture assertions passed`)

  const imageConfig: ImageConfig = { aspectRatio } as any
  if (model.includes('pro') && resolution) {
    (imageConfig as any).imageSize = resolution
  }

  const config: GenerateContentConfig = {
    responseModalities: ['IMAGE'],
    imageConfig,
    temperature,
  }

  console.log(`   📸 Generating with Image 1 (identity) + Image 2 (garment)`)

  const resp = await client.models.generateContent({ model, contents, config })

  // Extract image from response
  if (resp.candidates?.length) {
    for (const part of resp.candidates[0]?.content?.parts || []) {
      if (part.inlineData?.mimeType?.startsWith('image/') && part.inlineData?.data) {
        return part.inlineData.data
      }
    }
  }

  throw new Error('No image generated')
}

/**
 * @deprecated Not used in new architecture - single-step only
 * Two-step render - for scene changes
 * Step 1: Lock identity with outfit (neutral background)
 * Step 2: Apply scene (identity baked in)
 */
async function renderTwoStep(
  client: GoogleGenAI,
  model: string,
  subjectBase64: string,
  garmentBase64: string,
  identityImages: string[],
  scene: typeof SCENE_PRESETS[string],
  styleKey: string,
  aspectRatio: string,
  resolution?: string,
  isPro: boolean = true
): Promise<string> {
  const identityCount = identityImages.length
  const style = STYLE_SETTINGS[styleKey] || STYLE_SETTINGS.iphone_candid

  console.log('🎯 TWO-STEP WORKFLOW')
  console.log('   Step 1: Identity + Outfit Lock')

  // ========== STEP 1: Lock identity with outfit ==========
  const step1Prompt = isPro
    ? `STEP 1: IDENTITY - LOCKED OUTFIT APPLICATION

${identityCount > 0
      ? `You have ${identityCount + 1} photos of the SAME PERSON from different angles.
Study their face carefully from all angles.
The LAST image is the NEW CLOTHING.`
      : `Image 1 = PERSON. Image 2 = NEW CLOTHING.`
    }

🔒 IDENTITY PRESERVATION: Preserve the face from the input image exactly.

TASK:
1. Analyze the person's face from all provided angles
2. Remove their current outfit
3. Apply the garment from the last image
4. Use PLAIN GREY studio background(neutral)
5. Even, flat lighting

FOCUS ON PERFECT IDENTITY:
• Every facial feature exactly matched
• Skin tone precisely preserved
• Body proportions identical
• Natural fabric fit on their body shape

${REALISM_REQUIREMENTS}

This step locks their identity.Face must be PERFECT.`
    : `OUTFIT + IDENTITY LOCK

${identityCount > 0
      ? `First ${identityCount + 1} images = SAME PERSON. Last = CLOTHING.`
      : `Image 1 = PERSON. Image 2 = CLOTHING.`
    }

Put new outfit on person.
Grey studio background.
Flat lighting.

  CRITICAL: Face must match references EXACTLY.
Same eyes, nose, lips, skin tone, shape.
Real skin with visible pores.`

  const step1Contents: ContentListUnion = []
  step1Contents.push({ inlineData: { data: subjectBase64, mimeType: 'image/jpeg' } } as any)

  for (const img of identityImages) {
    if (img && img.length > 100) {
      step1Contents.push({ inlineData: { data: img, mimeType: 'image/jpeg' } } as any)
    }
  }

  step1Contents.push({ inlineData: { data: garmentBase64, mimeType: 'image/jpeg' } } as any)
  step1Contents.push(step1Prompt)

  const step1Config: GenerateContentConfig = {
    responseModalities: ['IMAGE'],
    imageConfig: { aspectRatio } as any,
    temperature: 0.01, // Ultra-low for identity precision
  }

  const step1Start = Date.now()
  const step1Resp = await client.models.generateContent({
    model,
    contents: step1Contents,
    config: step1Config
  })
  console.log(`   ✓ Step 1 done in ${((Date.now() - step1Start) / 1000).toFixed(1)} s`)

  // Extract step 1 image
  let step1Image: string | null = null
  if (step1Resp.candidates?.length) {
    for (const part of step1Resp.candidates[0]?.content?.parts || []) {
      if (part.inlineData?.mimeType?.startsWith('image/') && part.inlineData?.data) {
        step1Image = part.inlineData.data
        break
      }
    }
  }

  if (!step1Image) {
    throw new Error('Step 1 failed - no image generated')
  }

  console.log('   Step 2: Scene Application')

  // ========== STEP 2: Apply scene (identity locked) ==========
  const step2Prompt = isPro
    ? `SCENE PLACEMENT - IDENTITY LOCKED

Take this person EXACTLY as they appear and place them in a new environment.

⚠️ THEIR FACE IS LOCKED.DO NOT MODIFY ANY FACIAL FEATURES.

NEW ENVIRONMENT:
📍 ${scene.description}

LIGHTING:
💡 ${scene.lighting}

ENVIRONMENTAL DETAILS:
🔍 ${scene.details}

VISUAL STYLE:
${style}

WHAT TO CHANGE:
• Background → new scene
• Lighting on skin / clothes → match new environment
• Add environmental context

WHAT TO KEEP IDENTICAL:
• Face - every feature locked
• Body shape and proportions
• Clothing(already correct)
• Pose and expression

${REALISM_REQUIREMENTS}

The person should look naturally photographed in this location.
Environmental lighting can affect their appearance, but facial FEATURES stay identical.`
    : `SCENE CHANGE - IDENTITY LOCKED

Place this person in: ${scene.description}
Add: ${scene.details}
Lighting: ${scene.lighting}

⚠️ DO NOT CHANGE:
• Face(locked - same features)
• Body shape
• Clothing

Only change the background and apply scene lighting.
Make it look like they were photographed there.`

  const step2Contents: ContentListUnion = [
    { inlineData: { data: step1Image, mimeType: 'image/jpeg' } } as any,
    step2Prompt,
  ]

  const imageConfig: ImageConfig = { aspectRatio } as any
  if (model.includes('pro') && resolution) {
    (imageConfig as any).imageSize = resolution
  }

  const step2Config: GenerateContentConfig = {
    responseModalities: ['IMAGE'],
    imageConfig,
    temperature: 0.2, // Slightly higher for creative scene generation
  }

  const step2Start = Date.now()
  const step2Resp = await client.models.generateContent({
    model,
    contents: step2Contents,
    config: step2Config
  })
  console.log(`   ✓ Step 2 done in ${((Date.now() - step2Start) / 1000).toFixed(1)} s`)

  // Extract step 2 image
  if (step2Resp.candidates?.length) {
    for (const part of step2Resp.candidates[0]?.content?.parts || []) {
      if (part.inlineData?.mimeType?.startsWith('image/') && part.inlineData?.data) {
        return part.inlineData.data
      }
    }
  }

  // Fallback to step 1 if step 2 fails
  console.log('   ⚠️ Step 2 failed, returning Step 1 result')
  return step1Image
}

// ====================================================================================
// MAIN ENTRY POINT
// ====================================================================================

export async function renderTryOnFast(params: SimpleRenderOptions): Promise<string> {
  const {
    subjectImageBase64,
    garmentImageBase64,
    backgroundInstruction,
    lightingInstruction,
    quality,
    aspectRatio: userAspect,
    resolution,
    stylePresetId,
  } = params

  const client = getClient()
  const isPro = quality === 'high'
  const model = isPro ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image'
  const aspectRatio = normalizeAspectRatio(userAspect || '3:4')

  // Clean and validate images
  const cleanSubject = stripDataUrl(subjectImageBase64)
  const cleanGarment = stripDataUrl(garmentImageBase64)

  if (!cleanSubject || cleanSubject.length < 100) throw new Error('Invalid subject image')
  if (!cleanGarment || cleanGarment.length < 100) throw new Error('Invalid garment image')

  // Determine scene and mode
  const scene = stylePresetId && SCENE_PRESETS[stylePresetId] ? SCENE_PRESETS[stylePresetId] : null

  const bgLower = backgroundInstruction.toLowerCase()
  const keepBackground = !stylePresetId ||
    stylePresetId === 'keep_original' ||
    bgLower.includes('keep') ||
    bgLower.includes('original') ||
    bgLower.includes('same') ||
    bgLower.includes('unchanged')

  // Determine style
  let styleKey = 'iphone_candid'
  if (stylePresetId?.includes('studio')) styleKey = 'studio_clean'
  else if (stylePresetId?.includes('editorial')) styleKey = 'editorial'
  else if (stylePresetId?.includes('golden')) styleKey = 'golden_hour'
  else if (stylePresetId?.includes('street') || stylePresetId?.includes('cafe')) styleKey = 'lifestyle'
  else if (stylePresetId?.includes('beach') || stylePresetId?.includes('outdoor')) styleKey = 'documentary'

  // Temperature settings
  const temperature = 0.01

  console.log(`\n🚀 TRY-ON RENDER (PHASE 3 ARCHITECTURE)`)
  console.log(`   Model: ${model}`)
  console.log(`   Preset: ${stylePresetId || 'none'}`)
  console.log(`   Mode: ${keepBackground ? 'CLOTHING-ONLY' : 'SCENE-CHANGE'}`)
  console.log(`   Style: ${styleKey}`)
  console.log(`   Resolution: ${resolution || '1K'}`)
  console.log(`   🔒 Identity: Pixel-level from Image 1 only`)
  console.log(`   👗 Garment: Visual reference from Image 2 (no face/identity)`)
  console.log(`   📸 Images to Gemini: 2 (person + garment)`)

  const startTime = Date.now()
  let resultBase64: string

  try {
    // ============================================================
    // GARMENT ANALYSIS - DISABLED FOR FLASH (VISUAL ONLY)
    // ============================================================
    // FLASH pipeline: garmentText MUST be empty to keep prompt LOCKED
    // Image 2 is used VISUALLY only - no text injection
    let garmentDescription = ''

    if (!isPro) {
      // FLASH: Skip GPT analysis, use Image 2 as visual reference only
      console.log('\n👔 FLASH Pipeline: Using Image 2 visually only (no text analysis)')
      console.log('   📸 Garment image will be sent as Image 2 (visual reference)')
    } else {
      // PRO: Allow garment text analysis
      console.log('\n👔 PRO Pipeline: Analyzing garment for supporting text...')
      const analysisStart = Date.now()
      const garmentAnalysis = await analyzeGarmentForensic(cleanGarment)
      garmentDescription = `${garmentAnalysis.primaryColor || 'colored'} ${garmentAnalysis.garmentType || 'garment'}`
      console.log(`   ✓ Supporting garment text: ${garmentDescription}`)
      console.log(`   ✓ Analysis complete in ${((Date.now() - analysisStart) / 1000).toFixed(1)}s`)
      console.log(`   📸 Garment image will be sent as Image 2 (visual reference)`)
    }

    // ============================================================
    // STYLE PRESET LOOKUP (PHASE 2)
    // Supports both UI presets (presets.ts) AND style presets (style-presets.ts)
    // ============================================================
    let selectedStylePreset: StylePreset | null = null
    let uiPreset = stylePresetId ? getTryOnPresetV3(stylePresetId) : null

    if (stylePresetId) {
      // First, try to find as a style preset directly
      selectedStylePreset = getStylePreset(stylePresetId)

      // If not found, try to find as a UI preset and map to style preset
      if (!selectedStylePreset && uiPreset) {
        // UI presets have a style_pack field that maps to style presets
        const stylePackId = uiPreset.style_pack?.replace(/_/g, '_') || 'casual_lifestyle'
        // Try common mappings
        const stylePackMappings: Record<string, string> = {
          'candid_iphone': 'casual_lifestyle',
          'candid_home': 'casual_lifestyle',
          'candid_instagram': 'influencer_social',
          'documentary_street': 'editorial_street',
          'editorial_vogue': 'high_fashion_runway',
          'editorial_professional': 'studio_catalog',
          'travel_golden': 'influencer_social',
          'travel_vacation': 'casual_lifestyle',
          'travel_journal': 'casual_lifestyle',
          'vogue_editorial': 'high_fashion_runway',
          'linkedin_professional': 'studio_catalog',
          'preserve_original': 'casual_lifestyle',
        }
        const mappedPresetId = stylePackMappings[stylePackId] || 'casual_lifestyle'
        selectedStylePreset = getStylePreset(mappedPresetId)
        console.log(`   📦 UI Preset "${stylePresetId}" → Style Pack "${mappedPresetId}"`)
      }
    }

    // Default to casual_lifestyle if no preset found
    if (!selectedStylePreset) {
      selectedStylePreset = getStylePreset('casual_lifestyle')
    }

    // TypeScript guard: selectedStylePreset should never be null after this point
    if (!selectedStylePreset) {
      throw new Error('Failed to load style preset: casual_lifestyle not found')
    }

    console.log(`   🎨 Style Preset: ${selectedStylePreset.name} (${selectedStylePreset.id})`)

    // ============================================================
    // DUAL-ENGINE PIPELINE (PHASE 4) - FLASH vs PRO SEPARATION
    // ============================================================
    // FLASH: Identity-critical, locked prompt, no beautification
    // PRO_IDENTITY_LOCKED: High-realism identity-critical (for try-on)
    // PRO: Aesthetic/UGC only (NOT for try-on)

    const pipelineMode: PipelineMode = 'tryon'
    // For try-on: use pro_identity_locked for high quality, flash for fast
    const modelType: ModelType = isPro ? 'pro_identity_locked' : 'flash'

    // Enforce routing rules
    enforceModelRouting(pipelineMode, modelType)

    // Build pipeline-specific prompt
    const pipelineResult = buildDualEnginePipeline({
      mode: pipelineMode,
      model: modelType,
      presetId: stylePresetId
    })

    // Validate pipeline inputs
    const validation = validatePipelineInputs(
      2, // imageCount
      true, // hasPersonImage
      true, // hasGarmentImage
      pipelineResult.prompt
    )

    if (!validation.valid) {
      console.error('❌ PIPELINE VALIDATION FAILED:', validation.errors)
      throw new Error(`Pipeline validation failed: ${validation.errors.join(', ')}`)
    }

    if (validation.warnings.length > 0) {
      console.warn('⚠️ Pipeline warnings:', validation.warnings)
    }

    const finalPrompt = pipelineResult.prompt
    const pipelineTemperature = pipelineResult.temperature

    console.log(`\n🔧 DUAL-ENGINE PIPELINE RESULT:`)
    console.log(`   Pipeline: ${pipelineResult.pipeline.toUpperCase()}`)
    console.log(`   Model: ${pipelineResult.model}`)
    console.log(`   Temperature: ${pipelineTemperature}`)
    console.log(`   Assertions: ${pipelineResult.assertions.join(', ')}`)
    console.log(`   Prompt length: ${finalPrompt.length} chars`)
    console.log(`\n   📝 FINAL ASSEMBLED PROMPT (full text):`)
    console.log(`   ${'─'.repeat(70)}`)
    console.log(`   ${finalPrompt.split('\n').join('\n   ')}`)
    console.log(`   ${'─'.repeat(70)}`)

    // ============================================================
    // SINGLE-STEP RENDER (TWO IMAGES) - DUAL-ENGINE CONTRACT
    // ============================================================
    console.log('\n🎬 Rendering with Gemini (Image 1: person, Image 2: garment)...')
    resultBase64 = await renderSingleStep(
      client,
      model,
      cleanSubject, // Image 1: Person (identity source)
      cleanGarment, // Image 2: Garment (visual reference)
      finalPrompt, // Dual-engine composed prompt
      aspectRatio,
      pipelineTemperature, // Use pipeline-specific temperature
      resolution
    )

    const elapsed = Date.now() - startTime
    console.log(`✅ RENDER COMPLETE in ${(elapsed / 1000).toFixed(1)}s\n`)

    return `data:image/jpeg;base64,${resultBase64}`
  } catch (error) {
    console.error('❌ RENDER FAILED:', error)
    throw error
  }
}

// Compatibility wrapper (updated for new architecture)
export async function renderTryOnV3(params: {
  subjectImageBase64: string
  garmentImageBase64: string
  garmentBackupImageBase64?: string
  stylePack?: any
  backgroundFocus?: any
  shootPlan: { scene_text: string; prompt_text?: string }
  opts: { quality: 'fast' | 'high'; aspectRatio?: string; resolution?: string }
  extraStrict?: boolean
  garmentAnalysis?: any
  stylePresetId?: string
}): Promise<string> {
  return renderTryOnFast({
    subjectImageBase64: params.subjectImageBase64,
    garmentImageBase64: params.garmentImageBase64, // Used for analysis only
    backgroundInstruction: params.shootPlan.scene_text || 'keep original background',
    lightingInstruction: 'natural lighting',
    quality: params.opts.quality,
    aspectRatio: params.opts.aspectRatio,
    resolution: params.opts.resolution,
    stylePresetId: params.stylePresetId,
  })
}
