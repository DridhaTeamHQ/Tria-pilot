import { GoogleGenAI, type ContentListUnion, type GenerateContentConfig, type ImageConfig } from '@google/genai'
import { getGeminiKey } from '@/lib/config/api-keys'
import { 
  analyzeFaceForensic, 
  analyzeGarmentForensic, 
  buildIdentityPromptFromAnalysis, 
  buildGarmentPromptFromAnalysis,
  type ForensicFaceAnalysis,
  type GarmentAnalysis
} from './face-analyzer'
import { analyzeSubjectPhoto, type PhotoAnalysis, type BodyPose } from './photo-analyzer'

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
// WHISK-STYLE ARCHITECTURE: SUBJECT + STYLE + SCENE
// Inspired by Google Whisk's three-reference system and Midjourney's --cref/--sref
// ====================================================================================

/**
 * SUBJECT REFERENCE (--cref equivalent)
 * The person's identity - face, body, skin tone
 * Priority: HIGHEST - never compromise
 */
const SUBJECT_LOCK = `🔒 SUBJECT IDENTITY (LOCKED - DO NOT MODIFY):
This person's identity must be preserved with forensic precision.

FACE GEOMETRY - Match exactly:
• Face shape: jawline, cheekbones, chin (copy the measurements)
• Eyes: size, color, spacing, crease depth, lash pattern
• Nose: bridge width, tip shape, nostril size
• Mouth: exact lip proportions, cupid's bow, natural lines
• Brows: arch, thickness, position

SKIN - Authentic, not beautified:
• Exact skin tone (NO lightening or darkening)
• Visible pores on nose and cheeks
• Keep all natural marks: moles, freckles, scars
• Natural texture with micro-wrinkles
• Real skin shine in T-zone if present
• NO airbrushing, smoothing, or filtering

BODY - Same proportions:
• Match weight and build exactly
• Same muscle tone and body shape
• Natural asymmetries preserved`

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
// PROMPT BUILDERS - Whisk-style separation of concerns
// ====================================================================================

interface PromptContext {
  identityImageCount: number
  presetId: string | null
  scene: typeof SCENE_PRESETS[string] | null
  styleKey: string
  keepBackground: boolean
}

/**
 * Build a natural, conversational prompt for Pro model
 * Gemini Pro responds best to descriptive, scenario-like prompts
 */
function buildProPrompt(ctx: PromptContext): string {
  const { identityImageCount, scene, styleKey, keepBackground } = ctx
  
  const style = STYLE_SETTINGS[styleKey] || STYLE_SETTINGS.iphone_candid
  
  // Reference explanation based on image count
  const refExplanation = identityImageCount > 0
    ? `I'm providing ${identityImageCount + 1} reference photos of the SAME PERSON from different angles, plus ONE clothing/garment image at the end.
Study their face and body from all angles to understand their exact appearance.
The LAST image shows the new outfit they should wear.`
    : `Image 1 is the PERSON (study their face carefully).
Image 2 is the CLOTHING/GARMENT they should wear.`

  // Keep background mode - simplest case
  if (keepBackground) {
    return `VIRTUAL CLOTHING TRY-ON

${refExplanation}

YOUR TASK:
Create a new photo of this EXACT same person wearing the clothing from the garment image.

${SUBJECT_LOCK}

WHAT TO DO:
1. Remove their current outfit
2. Dress them in the new garment (from the last image)
3. Keep EVERYTHING else identical: background, lighting, pose, expression, hair
4. The clothing should fit naturally on their body shape

CLOTHING APPLICATION:
• Match the garment's exact color, pattern, and design
• Appropriate fit for their body type
• Natural wrinkles and draping based on pose
• If garment is sleeveless, show bare arms/shoulders
• If garment has specific neckline, show appropriately

${REALISM_REQUIREMENTS}

QUALITY CHECK:
The result should look like the next frame of a video - same person, same setting, just changed clothes.
Their mother should recognize them instantly.`
  }

  // Scene change mode
  if (scene && scene.description) {
    return `FASHION PHOTOGRAPHY: VIRTUAL TRY-ON WITH NEW SCENE

${refExplanation}

YOUR TASK:
Create a professional fashion photo of this person wearing the new outfit in a new setting.

${SUBJECT_LOCK}

STEP 1 - IDENTITY:
Study all reference images. This person's face and body are LOCKED.
Their identity must be pixel-perfect across the transformation.

STEP 2 - OUTFIT:
Remove current clothing. Apply the garment from the last image.
Natural fit with realistic fabric behavior.

STEP 3 - SCENE:
📍 LOCATION: ${scene.description}
💡 LIGHTING: ${scene.lighting}
🔍 DETAILS: ${scene.details}

STEP 4 - STYLE:
${style}

${REALISM_REQUIREMENTS}

CRITICAL RULES:
• Face CANNOT change when scene changes - study all reference angles
• New lighting affects skin and clothes naturally, but features stay identical
• Background should be sharp and detailed, not blurry AI mush
• Include realistic environmental imperfections (dust, wear, texture)

The person should look naturally photographed in this location.`
  }

  // Custom background (fallback)
  return `VIRTUAL TRY-ON

${refExplanation}

${SUBJECT_LOCK}

OUTFIT: Apply the garment from the last image with natural fit.

${style}

${REALISM_REQUIREMENTS}

Create an authentic-looking photo of this exact person in the new outfit.`
}

/**
 * Build a simpler, more direct prompt for Flash model
 * Flash responds better to concise instructions
 */
function buildFlashPrompt(ctx: PromptContext): string {
  const { identityImageCount, scene, keepBackground } = ctx

  const refExplanation = identityImageCount > 0
    ? `Images 1-${identityImageCount + 1} = SAME PERSON (different angles). Last image = NEW CLOTHING.`
    : `Image 1 = PERSON. Image 2 = NEW CLOTHING.`

  if (keepBackground) {
    return `CLOTHING CHANGE ONLY

${refExplanation}

TASK: Put the new outfit on this person.

IDENTITY RULES (CRITICAL):
• Same face - every feature identical
• Same skin tone - no lightening
• Same body shape and weight
• Same pose and expression
• Same background and lighting

CLOTHING:
• Remove current outfit completely
• Put on garment from last image
• Natural fit with wrinkles

QUALITY:
• Real skin texture (visible pores)
• Natural hair with flyaways
• No plastic or waxy look

OUTPUT: Same person wearing new clothes. Nothing else changes.`
  }

  if (scene && scene.description) {
    return `FASHION PHOTO: NEW OUTFIT + NEW SCENE

${refExplanation}

STEP 1 - FACE LOCK:
Copy person's face EXACTLY. Same features, same skin tone.
Use all reference angles to understand their appearance.

STEP 2 - OUTFIT:
Put clothing from last image on them. Natural fit.

STEP 3 - SCENE:
Place them in: ${scene.description}
Lighting: ${scene.lighting}
Add details: ${scene.details}

QUALITY RULES:
• Real skin texture with pores
• Natural hair with flyaways  
• Sharp, detailed background
• Natural imperfections
• No AI plastic look

CHECK: Face matches reference exactly. Only clothes and background are new.`
  }

  return `OUTFIT CHANGE

${refExplanation}

Put the new clothing on the person.
Keep their face and body identical.
Add natural skin texture and fabric wrinkles.

Result: Same person, new outfit.`
}

// ====================================================================================
// RENDER FUNCTIONS
// ====================================================================================

export interface SimpleRenderOptions {
  subjectImageBase64: string
  garmentImageBase64: string
  identityImagesBase64?: string[]
  backgroundInstruction: string
  lightingInstruction: string
  quality: 'fast' | 'high'
  aspectRatio?: string
  resolution?: string
  stylePresetId?: string
  /** Enable GPT-4o forensic face analysis for enhanced identity preservation */
  useForensicAnalysis?: boolean
}

// ====================================================================================
// FORENSIC-ENHANCED PROMPTS (Dual-Model: GPT-4o → Gemini)
// ====================================================================================

/**
 * Build a prompt that includes GPT-4o's forensic analysis
 * Now with pose-adaptive scene placement
 */
function buildForensicEnhancedPrompt(
  faceAnalysis: ForensicFaceAnalysis,
  garmentAnalysis: GarmentAnalysis,
  scene: ScenePreset | null,
  styleKey: string,
  keepBackground: boolean,
  identityCount: number,
  photoAnalysis?: PhotoAnalysis | null,
  variant: 'flash' | 'pro' = 'pro'
): string {
  const style = STYLE_SETTINGS[styleKey] || STYLE_SETTINGS.iphone_candid
  const identityPrompt = buildIdentityPromptFromAnalysis(faceAnalysis)
  const garmentPrompt = buildGarmentPromptFromAnalysis(garmentAnalysis)

  // Get detected body pose for scene adaptation
  const bodyPose: BodyPose = photoAnalysis?.body_pose || 'standing'
  
  // Get pose-adaptive placement if scene is available
  const poseSpecificPlacement = scene?.poseAdaptation?.[bodyPose] || ''

  const captureHints = photoAnalysis
    ? `CAPTURE MATCH (from original photo):
- Camera: ${photoAnalysis.camera_summary}
- Lighting: ${photoAnalysis.lighting_summary}
- Detected pose: ${bodyPose.toUpperCase()} - adapt scene accordingly
- Realism: ${photoAnalysis.realism_constraints}
- Lens hint: ${photoAnalysis.camera_manifest.focal_length_hint_mm}mm, DOF: ${photoAnalysis.camera_manifest.dof_hint}
- WB: ${photoAnalysis.camera_manifest.wb_family}, Grain: ${photoAnalysis.camera_manifest.imperfections.grain_level}

COMPOSITING AVOIDANCE:
- Do NOT look like a cutout. No halo edges. Add subtle light wrap and ambient occlusion.
- Add correct contact shadows on neck/under chin/under arms/where clothes touch body.
- Match background blur, grain/noise, and compression to the subject photo.`
    : ''
  
  const refExplanation = identityCount > 0
    ? `You have ${identityCount + 1} reference photos of the SAME PERSON. The LAST image is the GARMENT.`
    : `Image 1 = PERSON reference. Image 2 = GARMENT to apply.`

  if (keepBackground) {
    // Flash works best with short "edit the photo" instructions to avoid face drift.
    if (variant === 'flash') {
      return `🎯 VIRTUAL TRY-ON: EDIT THIS PHOTO

${refExplanation}

${identityPrompt}

${garmentPrompt}

═══════════════════════════════════════════════════════════════════════════════
TASK: CLOTHING SWAP ONLY
═══════════════════════════════════════════════════════════════════════════════
1. Keep the person EXACTLY as they appear - same face, same body, same pose
2. REMOVE their current clothing completely
3. PUT ON the garment from the reference image
4. Keep the original background UNCHANGED

⛔ FORBIDDEN (will fail the task):
- Changing face shape, width, proportions
- Changing skin tone or texture
- Changing hair style or color
- Changing background or lighting
- Blending with any face from garment reference
- Smoothing, beautifying, or "improving"

✅ REQUIRED:
- Exact same face from the identity reference
- Natural fabric wrinkles on the new garment
- Real skin texture with visible pores
- Matching lighting/shadows on clothing

OUTPUT: Same person, same background, new outfit only.`
    }

    return `🔒 VIRTUAL TRY-ON - FORENSIC IDENTITY MODE

${refExplanation}

${identityPrompt}

${garmentPrompt}

═══════════════════════════════════════════════════════════════════════════════
⚠️ FACE GEOMETRY LOCK (Critical - Common AI Failure Mode)
═══════════════════════════════════════════════════════════════════════════════
AI models often subtly change faces. You MUST NOT:
❌ Widen or narrow the face/jaw/cheeks
❌ Change eye shape, size, or spacing
❌ Alter nose bridge width or tip shape
❌ Modify lip fullness or width
❌ Shift cheekbone position or prominence
❌ Resize or reposition facial features
❌ Change the overall head size or shape

The face in output must be PIXEL-ACCURATE to the reference.

═══════════════════════════════════════════════════════════════════════════════
🔐 IDENTITY SOURCE HIERARCHY
═══════════════════════════════════════════════════════════════════════════════
1. IDENTITY: Only from person reference images (Images 1-${identityCount + 1})
2. CLOTHING: Only from the garment reference (last image)
3. BACKGROUND: Keep original from person image
4. POSE: Keep original from person image
5. LIGHTING: Keep original from person image

If garment reference contains a person → IGNORE their face, body, skin, hair entirely.
The garment image provides FABRIC ONLY, nothing else.

═══════════════════════════════════════════════════════════════════════════════
📋 EXECUTION STEPS
═══════════════════════════════════════════════════════════════════════════════
Step 1: ANALYZE the person references - memorize every facial detail
Step 2: REMOVE current clothing from the person completely (no traces)
Step 3: APPLY the garment with natural fit:
        - Fabric should drape naturally on their body shape
        - Add realistic wrinkles at movement points (elbows, waist, shoulders)
        - Match garment color exactly to reference
Step 4: VERIFY face matches reference exactly
Step 5: VERIFY background is unchanged
Step 6: VERIFY skin tone is unchanged (no lightening)

═══════════════════════════════════════════════════════════════════════════════
✨ QUALITY REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════
• Face: Biometrically identical to reference - their mother must recognize them
• Skin: Natural texture with visible pores, no plastic/waxy appearance
• Hair: Natural flyaways and texture, no over-smoothing
• Garment: Realistic fabric physics, proper draping, natural wrinkles
• Integration: No cutout edges, natural shadow under clothing
• Camera: Match original photo's grain, sharpness, compression

OUTPUT: The SAME person from references, wearing the new outfit.
Nothing else changes. Identity is LOCKED.`
  }

  if (scene?.description) {
    return `📸 FASHION PHOTOGRAPHY - FORENSIC IDENTITY + SCENE CHANGE

${refExplanation}

${identityPrompt}

${garmentPrompt}

═══════════════════════════════════════════════════════════════════════════════
⚠️ FACE GEOMETRY LOCK (Critical - Common AI Failure Mode)
═══════════════════════════════════════════════════════════════════════════════
Scene changes often cause subtle face drift. You MUST NOT:
❌ Widen or narrow the face/jaw/cheeks
❌ Change eye shape, size, spacing, or color
❌ Alter nose bridge width or tip shape
❌ Modify lip fullness or width
❌ Shift cheekbone position or prominence
❌ Change skin tone or undertone
❌ Smooth skin texture or remove pores/marks

The face in output must be BIOMETRICALLY IDENTICAL to the reference.

═══════════════════════════════════════════════════════════════════════════════
🔐 IDENTITY SOURCE HIERARCHY
═══════════════════════════════════════════════════════════════════════════════
1. IDENTITY: Only from person reference images (Images 1-${identityCount + 1})
2. CLOTHING: Only from the garment reference (last image)
3. POSE: Keep from person image - person is ${bodyPose.toUpperCase()}
4. BACKGROUND: NEW - use scene description below
5. LIGHTING: NEW - adapt to scene while keeping face recognizable

If garment reference contains a person → IGNORE their identity completely.

${captureHints}

═══════════════════════════════════════════════════════════════════════════════
🎬 SCENE SPECIFICATION
═══════════════════════════════════════════════════════════════════════════════
📍 Environment: ${scene.description}
💡 Lighting: ${scene.lighting}
🔍 Details: ${scene.details}

═══════════════════════════════════════════════════════════════════════════════
🧍 POSE-ADAPTIVE PLACEMENT (CRITICAL)
═══════════════════════════════════════════════════════════════════════════════
Detected pose: ${bodyPose.toUpperCase()}
Scene adapts TO the pose: ${poseSpecificPlacement}

⚠️ Do NOT change the person's pose. The scene wraps around them:
- If sitting → add appropriate seating/surface
- If standing → add appropriate ground/context
- If leaning → add appropriate support element

═══════════════════════════════════════════════════════════════════════════════
🎨 VISUAL STYLE
═══════════════════════════════════════════════════════════════════════════════
${style}

═══════════════════════════════════════════════════════════════════════════════
📋 EXECUTION STEPS
═══════════════════════════════════════════════════════════════════════════════
1. MEMORIZE the person's face from references - every detail
2. REMOVE their current clothing completely
3. APPLY the garment with natural fabric physics
4. KEEP their exact pose (${bodyPose})
5. CREATE the scene environment around them
6. ADAPT lighting to scene while preserving skin tone
7. ADD contact shadows and integration details
8. VERIFY face is IDENTICAL to references

═══════════════════════════════════════════════════════════════════════════════
✨ QUALITY REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════
• Face: Biometrically identical - same person, recognizable instantly
• Skin: Exact same tone, natural texture with pores (no smoothing)
• Pose: Unchanged from original (${bodyPose})
• Garment: Natural draping, realistic wrinkles, correct color
• Scene: Sharp, detailed background with natural imperfections
• Integration: No cutout look, proper shadows, matching grain/noise
• Lighting: Scene-appropriate but person remains recognizable

OUTPUT: Same person + same pose + new outfit + new scene.
Their mother must recognize them in any setting.`
  }

  return `🎯 VIRTUAL TRY-ON - FORENSIC MODE

${refExplanation}

${identityPrompt}

${garmentPrompt}

═══════════════════════════════════════════════════════════════════════════════
🔐 STRICT RULES
═══════════════════════════════════════════════════════════════════════════════
• IDENTITY: Only from person references
• CLOTHING: Only from garment reference
• If garment image has a person → IGNORE their face/body completely
• Never blend identities. Never average faces.

═══════════════════════════════════════════════════════════════════════════════
⚠️ FACE GEOMETRY LOCK
═══════════════════════════════════════════════════════════════════════════════
❌ Do NOT widen/narrow face, jaw, or cheeks
❌ Do NOT change eye shape, size, or color
❌ Do NOT alter nose, lips, or any features
❌ Do NOT lighten skin or remove marks
❌ Do NOT smooth texture or beautify

═══════════════════════════════════════════════════════════════════════════════
✅ REQUIRED OUTPUT
═══════════════════════════════════════════════════════════════════════════════
• Exact same face from references
• Exact same skin tone and texture
• New garment with natural fit and wrinkles
• Real skin with visible pores
• No plastic/waxy/CGI appearance

OUTPUT: Same person, new outfit. Identity LOCKED.`
}

// ====================================================================================
// GARMENT-ONLY EXTRACTION (Prevents face-bleed from garment reference images)
// ====================================================================================

async function extractGarmentOnlyReference(
  client: GoogleGenAI,
  model: string,
  garmentBase64: string
): Promise<string> {
  // Use a fast, deterministic extraction pass to produce a garment-only reference.
  const extractionPrompt = `GARMENT EXTRACTION (CLOTHING ONLY)

You are given an image that may include a person wearing a garment.
Your job: output an image that contains ONLY the garment. Remove the person completely.

Requirements:
- Output a clean garment-only reference image on a plain white background (flat-lay or mannequin is OK, but NO HUMAN).
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

async function renderTwoStepForensic(
  client: GoogleGenAI,
  model: string,
  subjectBase64: string,
  garmentBase64: string,
  identityImages: string[],
  faceAnalysis: ForensicFaceAnalysis,
  garmentAnalysis: GarmentAnalysis,
  scene: ScenePreset,
  styleKey: string,
  aspectRatio: string,
  resolution?: string,
  photoAnalysis?: PhotoAnalysis | null
): Promise<string> {
  const identityCount = identityImages.length
  const style = STYLE_SETTINGS[styleKey] || STYLE_SETTINGS.iphone_candid
  const identityPrompt = buildIdentityPromptFromAnalysis(faceAnalysis)
  const garmentPrompt = buildGarmentPromptFromAnalysis(garmentAnalysis)
  
  // Get detected body pose for scene adaptation
  const bodyPose: BodyPose = photoAnalysis?.body_pose || 'standing'
  const poseSpecificPlacement = scene.poseAdaptation?.[bodyPose] || ''

  console.log('🎯 TWO-STEP (FORENSIC)')
  console.log('   Step 1: Identity + Outfit Lock (neutral background)')

  const step1Prompt = `STEP 1: IDENTITY-LOCKED OUTFIT APPLICATION (FORENSIC)

You have ${identityCount + 1} reference photos of the SAME PERSON (Images 1-${identityCount + 1}).
The LAST image is the GARMENT reference (clothing only). If you see a person in the garment image, IGNORE them completely.

═══════════════════════════════════════════════════════════════════════════════
${identityPrompt}
═══════════════════════════════════════════════════════════════════════════════
${garmentPrompt}

STRICT RULES:
• Identity ONLY from person references. Garment reference is clothing ONLY.
• Do NOT change face geometry, skin tone, hairline, eyes, nose, lips, jaw.
• Never blend identities. Never average faces.
• Remove the original outfit completely. No layering.

TASK:
1) Put the garment on this exact person with natural fit and fabric wrinkles
2) Use a plain grey studio background
3) Use neutral, even lighting

OUTPUT: The same person, same face, wearing the garment.`

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
    ? `CAPTURE MATCH (from original photo):
- Camera: ${photoAnalysis.camera_summary}
- Lighting: ${photoAnalysis.lighting_summary}
- Realism: ${photoAnalysis.realism_constraints}
- Lens hint: ${photoAnalysis.camera_manifest.focal_length_hint_mm}mm, DOF: ${photoAnalysis.camera_manifest.dof_hint}
- WB: ${photoAnalysis.camera_manifest.wb_family}, Grain: ${photoAnalysis.camera_manifest.imperfections.grain_level}
`
    : ''

  const step2Prompt = `STEP 2: SCENE PLACEMENT (IDENTITY + POSE LOCKED)

Take this person EXACTLY as they appear in the provided image and place them in a new environment.

STRICT RULES:
• DO NOT change the face. Do NOT change skin tone. Do NOT change hairline.
• DO NOT change their body pose. They are ${bodyPose.toUpperCase()} - keep that exact pose.
• Never blend identities. Never average faces.
• Clothing must remain exactly as in Step 1.
• Anti \"face fattening\": do NOT widen cheeks, do NOT widen jaw, do NOT change face roundness.
• Anti cutout: no halo edges, add subtle light wrap + ambient occlusion + contact shadows.

NEW ENVIRONMENT:
📍 ${scene.description}
💡 ${scene.lighting}
🔍 ${scene.details}

POSE-ADAPTIVE PLACEMENT (CRITICAL):
🧍 Person is ${bodyPose.toUpperCase()}. Keep their exact pose unchanged.
🎯 Adapt the scene to their pose naturally:
   → ${poseSpecificPlacement}
⚠️ Scene wraps around the person's pose, NOT the other way around.

STYLE:
${style}

${captureHints}

INTEGRATION (avoid Photoshop look):
- Ensure the subject and background share the same noise/grain and compression characteristics.
- Match shadow direction and intensity between subject and environment.
- Add contact shadows: under chin, under arms, around neckline, hair-to-skin edges, where clothing touches body.
- Match depth-of-field: if background is soft, subject edges should not be unnaturally sharp; if background is sharp, keep realistic micro-contrast.
- Position scene elements (furniture, props) to match the person's ${bodyPose} pose naturally.

Make the person look naturally photographed in this location. Background must be sharp and realistic (no AI mush).`

  const step2Contents: ContentListUnion = [
    { inlineData: { data: step1Image, mimeType: 'image/jpeg' } } as any,
    step2Prompt,
  ]

  const imageConfig: ImageConfig = { aspectRatio } as any
  if (model.includes('pro') && resolution) {
    ;(imageConfig as any).imageSize = resolution
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
 * Single-step render - for clothing-only changes
 */
async function renderSingleStep(
  client: GoogleGenAI,
  model: string,
  subjectBase64: string,
  garmentBase64: string,
  identityImages: string[],
  prompt: string,
  aspectRatio: string,
  temperature: number,
  resolution?: string
): Promise<string> {
  // Build contents array: Subject + Identity refs + Garment + Prompt
  const contents: ContentListUnion = []
  
  // Primary subject
  contents.push({ inlineData: { data: subjectBase64, mimeType: 'image/jpeg' } } as any)
  
  // Additional identity references
  for (const img of identityImages) {
    if (img && img.length > 100) {
      contents.push({ inlineData: { data: img, mimeType: 'image/jpeg' } } as any)
    }
  }
  
  // Garment (always last before prompt)
  contents.push({ inlineData: { data: garmentBase64, mimeType: 'image/jpeg' } } as any)
  
  // Prompt
  contents.push(prompt)

  const imageConfig: ImageConfig = { aspectRatio } as any
  if (model.includes('pro') && resolution) {
    (imageConfig as any).imageSize = resolution
  }

  const config: GenerateContentConfig = {
    responseModalities: ['IMAGE'],
    imageConfig,
    temperature,
  }

  console.log(`   📸 Generating with ${1 + identityImages.length} identity refs`)

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
    ? `STEP 1: IDENTITY-LOCKED OUTFIT APPLICATION

${identityCount > 0 
  ? `You have ${identityCount + 1} photos of the SAME PERSON from different angles.
Study their face carefully from all angles.
The LAST image is the NEW CLOTHING.`
  : `Image 1 = PERSON. Image 2 = NEW CLOTHING.`}

${SUBJECT_LOCK}

TASK:
1. Analyze the person's face from all provided angles
2. Remove their current outfit
3. Apply the garment from the last image
4. Use PLAIN GREY studio background (neutral)
5. Even, flat lighting

FOCUS ON PERFECT IDENTITY:
• Every facial feature exactly matched
• Skin tone precisely preserved
• Body proportions identical
• Natural fabric fit on their body shape

${REALISM_REQUIREMENTS}

This step locks their identity. Face must be PERFECT.`
    : `OUTFIT + IDENTITY LOCK

${identityCount > 0 
  ? `First ${identityCount + 1} images = SAME PERSON. Last = CLOTHING.`
  : `Image 1 = PERSON. Image 2 = CLOTHING.`}

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
  console.log(`   ✓ Step 1 done in ${((Date.now() - step1Start) / 1000).toFixed(1)}s`)

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

⚠️ THEIR FACE IS LOCKED. DO NOT MODIFY ANY FACIAL FEATURES.

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
• Lighting on skin/clothes → match new environment
• Add environmental context

WHAT TO KEEP IDENTICAL:
• Face - every feature locked
• Body shape and proportions
• Clothing (already correct)
• Pose and expression

${REALISM_REQUIREMENTS}

The person should look naturally photographed in this location.
Environmental lighting can affect their appearance, but facial FEATURES stay identical.`
    : `SCENE CHANGE - IDENTITY LOCKED

Place this person in: ${scene.description}
Add: ${scene.details}
Lighting: ${scene.lighting}

⚠️ DO NOT CHANGE:
• Face (locked - same features)
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
  console.log(`   ✓ Step 2 done in ${((Date.now() - step2Start) / 1000).toFixed(1)}s`)

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
    identityImagesBase64,
    backgroundInstruction,
    quality,
    aspectRatio: userAspect,
    resolution,
    stylePresetId,
    useForensicAnalysis = true, // Enable by default for better face consistency
  } = params

  const client = getClient()
  const isPro = quality === 'high'
  const model = isPro ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image'
  const aspectRatio = normalizeAspectRatio(userAspect || '3:4')

  // Clean and validate images
  const cleanSubject = stripDataUrl(subjectImageBase64)
  const cleanGarment = stripDataUrl(garmentImageBase64)
  
  const cleanIdentityImages = (identityImagesBase64 || [])
    .map(img => stripDataUrl(img))
    .filter(img => img && img.length > 100)

  // Flash (2.5) is noticeably more stable with fewer reference images.
  // Pro can handle many refs (up to 14). Flash tends to "average" faces when overloaded.
  const maxIdentityRefsForModel = isPro ? 10 : 2
  const cleanIdentityImagesForModel = cleanIdentityImages.slice(0, maxIdentityRefsForModel)

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
  // Flash tends to drift faces at higher temps; keep it ultra-low for identity stability.
  const temperature = isPro ? 0.01 : 0.01

  console.log(`\n🚀 TRY-ON RENDER`)
  console.log(`   Model: ${model}`)
  console.log(`   Preset: ${stylePresetId || 'none'}`)
  console.log(`   Mode: ${keepBackground ? 'CLOTHING-ONLY' : 'SCENE-CHANGE'}`)
  console.log(`   Identity refs (used): ${1 + cleanIdentityImagesForModel.length} (received: ${1 + cleanIdentityImages.length})`)
  console.log(`   Style: ${styleKey}`)
  console.log(`   Resolution: ${resolution || '1K'}`)
  console.log(`   Forensic Analysis: ${useForensicAnalysis ? 'ENABLED' : 'DISABLED'}`)

  const startTime = Date.now()
  let resultBase64: string
  
  // Cache for forensic analysis
  let faceAnalysis: ForensicFaceAnalysis | null = null
  let garmentAnalysis: GarmentAnalysis | null = null
  let garmentForGemini = cleanGarment
  let photoAnalysis: PhotoAnalysis | null = null

  try {
    // ============================================================
    // FORENSIC ANALYSIS MODE (GPT-4o → Gemini)
    // ============================================================
    if (useForensicAnalysis) {
      console.log('\n🔬 FORENSIC ANALYSIS MODE')
      const analysisStart = Date.now()
      
      // Run analysis in parallel (and optionally capture analysis for better scene integration)
      const [faceResult, garmentResult, photoResult] = await Promise.all([
        analyzeFaceForensic(cleanSubject, cleanIdentityImagesForModel),
        analyzeGarmentForensic(cleanGarment),
        // Only needed for scene-change realism + integration (avoids Photoshop cutout look)
        !keepBackground ? analyzeSubjectPhoto(cleanSubject) : Promise.resolve(null),
      ])
      
      faceAnalysis = faceResult
      garmentAnalysis = garmentResult
      photoAnalysis = photoResult
      
      // If garment reference contains a person/face, extract a garment-only reference to prevent face bleed
      if (garmentAnalysis.containsPerson || garmentAnalysis.containsFace) {
        console.log('🧩 Garment ref contains a person/face — extracting garment-only reference (prevents identity mixing)...')
        const extractionModel = isPro ? 'gemini-2.5-flash-image' : model // extraction works well on flash
        garmentForGemini = await extractGarmentOnlyReference(client, extractionModel, cleanGarment)
        // Re-analyze the extracted garment-only image for best description fidelity
        garmentAnalysis = await analyzeGarmentForensic(garmentForGemini)
      }

      console.log(`   ✓ Analysis complete in ${((Date.now() - analysisStart) / 1000).toFixed(1)}s`)
      
      // Build forensic-enhanced prompt
      const forensicPrompt = buildForensicEnhancedPrompt(
        faceAnalysis,
        garmentAnalysis,
        scene,
        styleKey,
        keepBackground,
        cleanIdentityImagesForModel.length,
        photoAnalysis,
        isPro ? 'pro' : 'flash'
      )
      
      console.log(`   Prompt length: ${forensicPrompt.length} chars`)
      
      // Render with forensic prompt (use garment-only ref if needed)
      if (!keepBackground && scene) {
        resultBase64 = await renderTwoStepForensic(
          client,
          model,
          cleanSubject,
          garmentForGemini,
          cleanIdentityImagesForModel,
          faceAnalysis,
          garmentAnalysis,
          scene,
          styleKey,
          aspectRatio,
          resolution,
          photoAnalysis
        )
      } else {
        resultBase64 = await renderSingleStep(
          client, model, cleanSubject, garmentForGemini, cleanIdentityImagesForModel,
          forensicPrompt, aspectRatio, temperature, resolution
        )
      }
    } 
    // ============================================================
    // STANDARD MODE (Gemini only)
    // ============================================================
    else {
      // Build prompt context
      const promptCtx: PromptContext = {
        identityImageCount: cleanIdentityImages.length,
        presetId: stylePresetId || null,
        scene,
        styleKey,
        keepBackground,
      }

      if (keepBackground) {
        // SINGLE STEP - Just swap clothing
        const prompt = isPro 
          ? buildProPrompt(promptCtx)
          : buildFlashPrompt(promptCtx)
        
        resultBase64 = await renderSingleStep(
          client, model, cleanSubject, cleanGarment, cleanIdentityImages, 
          prompt, aspectRatio, temperature, resolution
        )
      } else if (scene) {
        // TWO-STEP - Outfit first, then scene
        resultBase64 = await renderTwoStep(
          client, model, cleanSubject, cleanGarment, cleanIdentityImages,
          scene, styleKey, aspectRatio, resolution, isPro
        )
      } else {
        // SINGLE STEP with custom background
        const prompt = isPro 
          ? buildProPrompt(promptCtx)
          : buildFlashPrompt(promptCtx)
        
        resultBase64 = await renderSingleStep(
          client, model, cleanSubject, cleanGarment, cleanIdentityImages,
          prompt, aspectRatio, temperature, resolution
        )
      }
    }

    const elapsed = Date.now() - startTime
    console.log(`✅ RENDER COMPLETE in ${(elapsed / 1000).toFixed(1)}s\n`)

    return `data:image/jpeg;base64,${resultBase64}`
  } catch (error) {
    console.error('❌ RENDER FAILED:', error)
    throw error
  }
}

// Compatibility wrapper
export async function renderTryOnV3(params: {
  subjectImageBase64: string
  garmentImageBase64: string
  garmentBackupImageBase64?: string
  identityImagesBase64?: string[]
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
    garmentImageBase64: params.garmentImageBase64,
    identityImagesBase64: params.identityImagesBase64,
    backgroundInstruction: params.shootPlan.scene_text || 'keep original background',
    lightingInstruction: 'natural lighting',
    quality: params.opts.quality,
    aspectRatio: params.opts.aspectRatio,
    resolution: params.opts.resolution,
    stylePresetId: params.stylePresetId,
  })
}
