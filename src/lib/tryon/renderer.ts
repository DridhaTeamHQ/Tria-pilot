import { GoogleGenAI, type ContentListUnion, type GenerateContentConfig, type ImageConfig } from '@google/genai'
import { getGeminiKey } from '@/lib/config/api-keys'

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
 */
const SCENE_PRESETS: Record<string, {
  description: string
  lighting: string
  details: string
}> = {
  keep_original: {
    description: 'Keep the original background exactly as it appears',
    lighting: 'Same lighting as the original photo',
    details: 'Do not modify anything about the environment',
  },
  
  studio_white: {
    description: 'Professional photography studio with seamless white paper backdrop',
    lighting: 'Three-point studio lighting: soft key light from 45°, fill light opposite, rim light for separation',
    details: 'Natural paper curve where wall meets floor, subtle shadow gradients, minor creases visible',
  },
  
  studio_grey: {
    description: 'Photography studio with grey muslin fabric backdrop',
    lighting: 'Soft box lighting from camera right creating gentle directional shadows',
    details: 'Natural fabric texture and draping, slightly worn edges, uneven neutral tones',
  },
  
  outdoor_natural: {
    description: 'Lush Indian garden with bougainvillea, tropical plants, and stone pathways',
    lighting: 'Dappled natural sunlight filtering through leaves, organic shadow patterns',
    details: 'Terracotta pots, moss between stones, fallen flowers, weathered textures',
  },
  
  outdoor_golden: {
    description: 'Indian rooftop terrace at golden hour with city skyline',
    lighting: 'Warm golden sun at 15°, long shadows, orange-pink sky gradient',
    details: 'Potted tulsi and money plant, faded chairs, rusty railing, atmospheric haze',
  },
  
  outdoor_beach: {
    description: 'Authentic Goa beach with palm trees and fishing boats in distance',
    lighting: 'Bright coastal sun with water glare, fill from sand reflection',
    details: 'Wet sand with footprints, seaweed, weathered palms, beach shack visible',
  },
  
  street_city: {
    description: 'Vibrant Indian city street with colorful buildings and local life',
    lighting: 'Harsh midday sun with strong shadows, slight dust haze in air',
    details: 'Parked scooters, chai stall, tangled wires, hand-painted signs, auto-rickshaw',
  },
  
  street_cafe: {
    description: 'Cozy Indian café with vintage Bollywood posters and fairy lights',
    lighting: 'Warm ambient bulb light mixed with cool window daylight',
    details: 'Mismatched wooden chairs, chipped tables, plants in recycled tins, chai menu',
  },
  
  lifestyle_home: {
    description: 'Real Indian apartment with natural window light and personal touches',
    lighting: 'Natural window light with dust motes, warm afternoon glow',
    details: 'Family photos, indoor plants, colorful cushions, everyday clutter, chai cup',
  },
  
  lifestyle_office: {
    description: 'Modern Indian corporate office with typical workspace setup',
    lighting: 'Overhead fluorescent mixed with window light from one side',
    details: 'Dual monitors, papers, water bottle, desk plant, motivational poster',
  },
  
  editorial_minimal: {
    description: 'Minimal industrial space with raw concrete and architectural elements',
    lighting: 'Dramatic directional light creating deep shadows, rim light on hair',
    details: 'Raw concrete walls with form marks, polished floor with scuffs, negative space',
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
  const temperature = isPro ? 0.01 : 0.03

  // Build prompt context
  const promptCtx: PromptContext = {
    identityImageCount: cleanIdentityImages.length,
    presetId: stylePresetId || null,
    scene,
    styleKey,
    keepBackground,
  }

  console.log(`\n🚀 TRY-ON RENDER`)
  console.log(`   Model: ${model}`)
  console.log(`   Preset: ${stylePresetId || 'none'}`)
  console.log(`   Mode: ${keepBackground ? 'CLOTHING-ONLY' : 'SCENE-CHANGE'}`)
  console.log(`   Identity refs: ${1 + cleanIdentityImages.length}`)
  console.log(`   Style: ${styleKey}`)
  console.log(`   Resolution: ${resolution || '1K'}`)

  const startTime = Date.now()
  let resultBase64: string

  try {
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
