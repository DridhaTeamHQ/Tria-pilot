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

/**
 * IDENTITY ANCHOR - Used at START and END of prompts
 * This "sandwiches" the identity preservation to combat compositional deficit
 */
const IDENTITY_ANCHOR_START = `IDENTITY ANCHOR: The person in Image 1 is the STRICT REFERENCE SUBJECT.
Preserve these EXACT features from Image 1:
- Face shape (jaw width, cheekbone position, chin shape)
- Eye characteristics (eye size, spacing, iris color, eyelid shape)
- Nose structure (bridge width, tip shape, nostril size)
- Mouth/lips (lip thickness, width, natural expression)
- Skin tone and texture (exact complexion, visible pores, natural marks)
- Hair style and color
- Body proportions (weight, build, height ratio)
- Facial expression and gaze direction`

const IDENTITY_ANCHOR_END = `CRITICAL IDENTITY CHECK:
Before finalizing, verify the output face matches Image 1:
✓ Same face shape and proportions
✓ Same eye appearance (size, color, shape)
✓ Same nose structure
✓ Same lip shape and expression
✓ Same skin tone (no lightening/darkening)
✓ Same body build (no slimming/enlarging)
If ANY facial feature differs from Image 1, the result is INVALID.`

/**
 * LOOK-ALIKE TIGHTENING - Specific measurable features
 */
const LOOKALIKE_RULES = `FACIAL GEOMETRY LOCK:
- Forehead-to-chin ratio: EXACT match to Image 1
- Eye-to-eye distance: EXACT match
- Nose-to-mouth distance: EXACT match
- Jaw width relative to forehead: EXACT match
- Eyebrow shape and position: EXACT match

SKIN AUTHENTICITY:
- Copy exact skin tone (no beautification)
- Keep natural marks, moles, freckles
- Preserve skin texture (visible pores, not airbrushed)
- No skin smoothing or whitening

EXPRESSION LOCK:
- Same micro-expression as Image 1
- Same eye openness level
- Same mouth position (open/closed amount)`

export interface SimpleRenderOptions {
  subjectImageBase64: string
  garmentImageBase64: string
  identityImagesBase64?: string[] // Additional identity reference images
  backgroundInstruction: string
  lightingInstruction: string
  quality: 'fast' | 'high'
  aspectRatio?: string
  resolution?: string
  stylePresetId?: string
}

/**
 * MULTI-REFERENCE IDENTITY ANCHOR
 * When multiple identity images are provided, we use them all to help the AI
 * understand the person's face from multiple angles
 */
function buildMultiReferenceAnchor(identityCount: number): string {
  if (identityCount <= 1) {
    return IDENTITY_ANCHOR_START
  }
  
  return `MULTI-ANGLE IDENTITY REFERENCE:
You have ${identityCount + 1} reference images of the SAME PERSON from different angles.

Images 1-${identityCount + 1} show the subject from various angles:
- These images show the EXACT same person
- Use ALL of these to understand their complete facial structure
- Notice how their face looks from front, sides, and with different expressions
- The last image is the CLOTHING to apply

STRICT IDENTITY RULES:
- Face shape: Match the consistent jawline, cheekbones, chin across all reference images
- Eyes: Same eye size, shape, spacing, color visible in all angles
- Nose: Same nose structure visible from all angles
- Mouth/Lips: Same lip shape and thickness
- Skin tone: Exact same complexion (note: lighting varies, but skin tone is constant)
- Hair: Same style, color, texture across all images
- Body: Same proportions visible in body shots

The more reference images, the BETTER you understand this person.
Use this multi-angle knowledge to create a perfect identity match.`
}

function buildMultiReferenceEnd(): string {
  return `FINAL IDENTITY VERIFICATION:
Cross-check the output against ALL provided reference images.
The output face should match what you see in:
- The front-facing images
- The side-angle images  
- The smiling images
- The body proportion images

If the face would look out of place in ANY of the reference angles, revise it.
The goal is a face that is recognizably the SAME PERSON from any angle.`
}

/**
 * SCENE PRESETS - Indian-focused with sharp backgrounds
 */
const SCENE_PRESETS: Record<string, {
  scene: string
  lighting: string
  camera: string
  texture: string
  style: string
}> = {
  keep_original: {
    scene: '',
    lighting: '',
    camera: '',
    texture: '',
    style: '',
  },
  studio_white: {
    scene: 'a real photography studio with white paper backdrop showing slight creases and shadows where it curves',
    lighting: 'professional soft lighting with subtle shadows under chin and on backdrop, not perfectly flat',
    camera: '85mm portrait lens with natural bokeh, slight softness at edges, centered composition',
    texture: 'visible skin pores, fabric weave details, paper backdrop texture with minor wrinkles',
    style: 'professional fashion photo with authentic studio feel, slight film grain',
  },
  studio_grey: {
    scene: 'a photography studio with grey fabric backdrop showing natural fabric texture and minor folds',
    lighting: 'controlled but natural-looking studio lighting, gentle shadows defining face structure',
    camera: '50mm at eye level, natural depth of field, subject sharp against textured backdrop',
    texture: 'visible skin texture, fabric grain on both clothing and backdrop, natural imperfections',
    style: 'editorial portrait with real photography aesthetic, not CGI-perfect',
  },
  outdoor_natural: {
    scene: 'a real garden with slightly overgrown tropical plants, weathered garden path, fallen leaves on ground, imperfect greenery',
    lighting: 'natural uneven sunlight through leaves creating dappled shadows, not perfectly even',
    camera: 'candid iPhone shot with natural depth, slight motion in hair or fabric',
    texture: 'worn stone path, wilting flower edges, dusty leaf surfaces, natural grass patches',
    style: 'authentic candid snapshot taken by friend, not posed studio shot',
  },
  outdoor_golden: {
    scene: 'a weathered rooftop terrace at sunset with old potted plants, worn tiles, rusty railing, lived-in feel',
    lighting: 'warm golden hour with harsh sun flare, uneven shadows, natural lens warmth',
    camera: 'handheld phone shot with slight tilt, background in focus with atmospheric haze',
    texture: 'sun-weathered surfaces, dusty floor, warm skin glow with visible pores',
    style: 'spontaneous golden hour snapshot, authentic travel photo aesthetic',
  },
  outdoor_beach: {
    scene: 'a real beach with uneven wet sand, seaweed, footprints, weathered palm trees with brown fronds, visible beach debris',
    lighting: 'bright coastal sun with glare on water, natural harsh shadows, not studio-lit',
    camera: 'candid beach snapshot angle, water splashing near feet, wind in hair',
    texture: 'grainy sand texture, salt spray on skin, wet footprints, weathered bark on palms',
    style: 'authentic vacation photo taken on phone, not professional shoot',
  },
  street_city: {
    scene: 'a busy Indian city street with worn painted buildings, peeling posters, parked scooters, tangled wires overhead, stray dogs',
    lighting: 'harsh midday sun with strong shadows, natural urban lighting with dust particles',
    camera: 'candid street shot from slight distance, handheld with minor motion blur',
    texture: 'cracked pavement, faded paint, dusty surfaces, real urban grit',
    style: 'authentic street photography, documentary candid style, not posed',
  },
  street_cafe: {
    scene: 'a cozy Indian café with mismatched wooden chairs, chipped tables, plants in old tins, fairy lights, coffee stains',
    lighting: 'warm ambient bulb light mixed with daylight from windows, uneven shadows',
    camera: 'casual phone snapshot from across table, slightly off-center framing',
    texture: 'worn wood grain, scratched table surface, condensation on glass, fabric wrinkles',
    style: 'authentic café snapshot taken by friend, Instagram casual',
  },
  lifestyle_home: {
    scene: 'a real Indian apartment with lived-in feel, some clutter visible, sunlight through curtains, family photos',
    lighting: 'natural window light with dust motes, warm afternoon glow, uneven brightness',
    camera: 'casual home photo angle, slightly tilted iPhone shot',
    texture: 'worn sofa fabric, dusty shelves, rumpled curtains, natural home imperfections',
    style: 'authentic home photo, real life not staged',
  },
  lifestyle_office: {
    scene: 'a real office with papers on desk, monitor screens, water bottles, cables visible, plant needing water',
    lighting: 'harsh fluorescent mixed with window light, typical office lighting',
    camera: 'candid office snapshot, colleague taking photo',
    texture: 'keyboard dust, desk clutter, wrinkled documents, real office environment',
    style: 'authentic workplace photo, LinkedIn casual',
  },
  editorial_minimal: {
    scene: 'a minimal concrete space with textured walls, some wall cracks, uneven floor, industrial elements',
    lighting: 'dramatic harsh directional light creating deep shadows, visible light source',
    camera: 'fashion editorial angle, deliberate composition with negative space',
    texture: 'raw concrete texture, visible wall imperfections, natural skin pores and texture',
    style: 'high-fashion editorial with raw aesthetic, not overly polished',
  },
}

/**
 * PRO MODEL PROMPTS - With Anchor Technique
 * Identity anchored at START and END to combat compositional deficit
 */
function buildProPrompt(keepBg: boolean, preset: any, backgroundInstruction: string, lightingInstruction: string): string {
  // CLOTHING ONLY / KEEP ORIGINAL - Simple swap, strong anchoring
  if (keepBg) {
    return `${IDENTITY_ANCHOR_START}

TASK: Virtual clothing try-on.
- Image 1: The person (IDENTITY SOURCE)
- Image 2: The new clothing item

Replace their current outfit with the clothing from Image 2.
Keep EVERYTHING else identical: face, body, hair, pose, background.

${LOOKALIKE_RULES}

${IDENTITY_ANCHOR_END}`
  }
  
  // SCENE CHANGE - Needs extra anchoring since more things are changing
  if (preset?.scene) {
    return `${IDENTITY_ANCHOR_START}

SCENE CHANGE REQUEST:
Subject: The EXACT person from Image 1 (use their face as reference)
Outfit: The clothing from Image 2
Location: ${preset.scene}
Lighting: ${preset.lighting || 'natural lighting matching the scene'}

${LOOKALIKE_RULES}

IMPORTANT: The new scene and lighting should NOT affect facial features.
Apply scene lighting to the environment, but keep the face's core features intact.

${IDENTITY_ANCHOR_END}`
  }
  
  // Custom background instruction
  return `${IDENTITY_ANCHOR_START}

TASK: Show this person wearing the outfit from Image 2.
Background: ${backgroundInstruction}
Lighting: ${lightingInstruction}

${LOOKALIKE_RULES}

${IDENTITY_ANCHOR_END}`
}

/**
 * FLASH MODEL PROMPTS - Simpler but still anchored
 * Flash responds better to concise prompts, but we keep the anchor technique
 */
function buildFlashPrompt(keepBg: boolean, preset: any, backgroundInstruction: string, lightingInstruction: string): string {
  // CLOTHING ONLY / KEEP ORIGINAL
  if (keepBg) {
    return `IDENTITY LOCK: Person in Image 1 is the reference. Their face and body are FIXED.

Task: Put the clothing from Image 2 on this person.
- Keep exact same face (shape, eyes, nose, lips, skin tone)
- Keep exact same body proportions
- Keep exact same background and pose
- Only change: their outfit → use Image 2's clothing

VERIFY: Output face must match Image 1's face exactly. Same person, just different clothes.`
  }
  
  // SCENE CHANGE
  if (preset?.scene) {
    return `IDENTITY LOCK: Copy the person from Image 1 exactly.

Show them:
- Wearing: outfit from Image 2
- In scene: ${preset.scene}
- Lighting: ${preset.lighting || 'natural'}

CRITICAL: Face must be identical to Image 1.
- Same face shape and proportions
- Same eye appearance
- Same nose and lips
- Same skin tone (no lightening)
- Same body build

Final check: If the face looks different from Image 1, redo it.`
  }
  
  // Custom
  return `IDENTITY LOCK: The person in Image 1 is the subject.

Show them wearing Image 2's outfit in: ${backgroundInstruction}

Keep their face IDENTICAL to Image 1:
- Same facial features
- Same skin tone
- Same body proportions

Only change clothes and background.`
}

/**
 * SINGLE-STEP RENDERER - For clothing-only changes
 * Used when background stays the same
 * Now supports multiple identity reference images
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
  // Build contents array with all identity images first, then garment
  const contents: ContentListUnion = []
  
  // Primary subject image
  contents.push({ inlineData: { data: subjectBase64, mimeType: 'image/jpeg' } } as any)
  
  // Additional identity reference images (if any)
  for (const identityImg of identityImages) {
    const clean = stripDataUrl(identityImg)
    if (clean && clean.length > 100) {
      contents.push({ inlineData: { data: clean, mimeType: 'image/jpeg' } } as any)
    }
  }
  
  // Garment image (always last before prompt)
  contents.push({ inlineData: { data: garmentBase64, mimeType: 'image/jpeg' } } as any)
  
  // Prompt
  contents.push(prompt)

  const imageConfig: ImageConfig = { aspectRatio } as any
  if (model.includes('pro') && resolution) {
    ;(imageConfig as any).imageSize = resolution
  }

  const config: GenerateContentConfig = {
    responseModalities: ['IMAGE'],
    imageConfig,
    temperature,
  }

  console.log(`   📷 Using ${1 + identityImages.length} identity reference(s) + 1 garment`)

  const resp = await client.models.generateContent({ model, contents, config })

  if (resp.candidates?.length) {
    for (const part of resp.candidates[0]?.content?.parts || []) {
      if (part.inlineData?.mimeType?.startsWith('image/') && part.inlineData?.data) {
        return part.inlineData.data // Return raw base64
      }
    }
  }

  if ((resp as any).data) return (resp as any).data

  throw new Error('No image generated in single step')
}

/**
 * LAYERED WORKFLOW - For scene changes
 * Step 1: Outfit swap with neutral background (locks identity)
 * Step 2: Change background/lighting (identity already baked in)
 * Now supports multiple identity reference images
 */
async function renderLayered(
  client: GoogleGenAI,
  model: string,
  subjectBase64: string,
  garmentBase64: string,
  identityImages: string[],
  preset: any,
  aspectRatio: string,
  temperature: number,
  resolution?: string
): Promise<string> {
  console.log('🎯 LAYERED WORKFLOW: Step 1 - Outfit swap with neutral background')
  console.log(`   📷 Using ${1 + identityImages.length} identity reference(s)`)
  
  // Build identity anchor based on number of reference images
  const identityAnchor = buildMultiReferenceAnchor(identityImages.length)
  const identityEnd = identityImages.length > 0 ? buildMultiReferenceEnd() : IDENTITY_ANCHOR_END
  
  // STEP 1: Generate base image with outfit + identity, neutral background
  const step1Prompt = `${identityAnchor}

STEP 1 - OUTFIT SWAP:
${identityImages.length > 0 
  ? `Use the identity reference images to understand this person's face from multiple angles.
The LAST image before this text is the CLOTHING to apply.`
  : `Put the clothing from the last image onto the person from the first image.`}
Use a plain, neutral grey studio background.
Even, flat lighting.

Focus on:
1. PERFECT facial identity match (use ALL reference images to understand the face)
2. Accurate clothing fit from the garment image
3. Natural body pose matching the main reference

${LOOKALIKE_RULES}

${identityEnd}`

  // Build contents with all identity images
  const step1Contents: ContentListUnion = []
  
  // Primary subject
  step1Contents.push({ inlineData: { data: subjectBase64, mimeType: 'image/jpeg' } } as any)
  
  // Additional identity references
  for (const identityImg of identityImages) {
    const clean = stripDataUrl(identityImg)
    if (clean && clean.length > 100) {
      step1Contents.push({ inlineData: { data: clean, mimeType: 'image/jpeg' } } as any)
    }
  }
  
  // Garment (last image)
  step1Contents.push({ inlineData: { data: garmentBase64, mimeType: 'image/jpeg' } } as any)
  
  // Prompt
  step1Contents.push(step1Prompt)

  const step1Config: GenerateContentConfig = {
    responseModalities: ['IMAGE'],
    imageConfig: { aspectRatio } as any,
    temperature: 0.02, // Very low for identity preservation
  }

  const step1Start = Date.now()
  const step1Resp = await client.models.generateContent({ 
    model, 
    contents: step1Contents, 
    config: step1Config 
  })
  console.log(`   Step 1 completed in ${((Date.now() - step1Start) / 1000).toFixed(1)}s`)

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
    throw new Error('Step 1 failed to generate image')
  }

  console.log('🎯 LAYERED WORKFLOW: Step 2 - Apply scene and lighting')

  // STEP 2: Change background/lighting using Step 1 result
  // The face is now "baked in" to the reference image
  const step2Prompt = `SCENE CHANGE - Keep the person EXACTLY as they appear.

Take this person (face, body, clothes, pose) and place them in a new environment:
- New background: ${preset.scene}
- New lighting: ${preset.lighting || 'natural lighting matching the scene'}

CRITICAL RULES:
- Do NOT modify the person's face AT ALL
- Do NOT change their body shape
- Do NOT change their clothes
- Do NOT change their pose
- ONLY change the background and apply appropriate scene lighting

The person should look like they were photographed in this location, 
but their face must remain EXACTLY as it is in the input image.`

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
    temperature: 0.3, // Slightly higher for creative background
  }

  const step2Start = Date.now()
  const step2Resp = await client.models.generateContent({ 
    model, 
    contents: step2Contents, 
    config: step2Config 
  })
  console.log(`   Step 2 completed in ${((Date.now() - step2Start) / 1000).toFixed(1)}s`)

  if (step2Resp.candidates?.length) {
    for (const part of step2Resp.candidates[0]?.content?.parts || []) {
      if (part.inlineData?.mimeType?.startsWith('image/') && part.inlineData?.data) {
        return part.inlineData.data
      }
    }
  }

  // If Step 2 fails, return Step 1 result (at least we have correct outfit)
  console.log('⚠️ Step 2 failed, returning Step 1 result')
  return step1Image
}

/**
 * MAIN RENDERER - Routes to single-step or layered based on preset
 * Now supports multiple identity reference images for better face consistency
 */
export async function renderTryOnFast(params: SimpleRenderOptions): Promise<string> {
  const {
    subjectImageBase64,
    garmentImageBase64,
    identityImagesBase64,
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

  const cleanSubject = stripDataUrl(subjectImageBase64)
  const cleanGarment = stripDataUrl(garmentImageBase64)
  
  // Clean and filter identity images
  const cleanIdentityImages = (identityImagesBase64 || [])
    .map(img => stripDataUrl(img))
    .filter(img => img && img.length > 100)

  if (!cleanSubject || cleanSubject.length < 100) throw new Error('Invalid subject image')
  if (!cleanGarment || cleanGarment.length < 100) throw new Error('Invalid garment image')

  const preset = stylePresetId ? SCENE_PRESETS[stylePresetId] : null
  
  // Detect "keep background" modes
  const bgLower = backgroundInstruction.toLowerCase()
  const keepBg = !stylePresetId ||
                 stylePresetId === 'keep_original' ||
                 bgLower.includes('keep') || 
                 bgLower.includes('original') ||
                 bgLower.includes('same') ||
                 bgLower.includes('unchanged')

  // Temperature for identity preservation
  const temperature = isPro ? 0.02 : 0.05

  console.log(`🚀 Render: model=${model}, preset=${stylePresetId || 'custom'}, keepBg=${keepBg}`)
  console.log(`👤 Identity references: ${1 + cleanIdentityImages.length} images`)

  const startTime = Date.now()
  let resultBase64: string
  
  // Build prompts with multi-reference support if we have extra identity images
  const hasMultiRef = cleanIdentityImages.length > 0

  if (keepBg) {
    // SINGLE STEP - Just swap clothing, keep background
    console.log('📸 Mode: SINGLE-STEP (clothing only)')
    
    // Build prompt with multi-reference anchor if available
    let prompt: string
    if (hasMultiRef) {
      const anchor = buildMultiReferenceAnchor(cleanIdentityImages.length)
      const end = buildMultiReferenceEnd()
      prompt = `${anchor}

TASK: Virtual clothing try-on.
The first ${cleanIdentityImages.length + 1} images show the SAME PERSON from different angles.
The LAST image is the clothing item to apply.

Replace their current outfit with the clothing from the last image.
Keep EVERYTHING else identical: face, body, hair, pose, background.

${LOOKALIKE_RULES}

${end}`
    } else {
      prompt = isPro 
        ? buildProPrompt(true, preset, backgroundInstruction, lightingInstruction)
        : buildFlashPrompt(true, preset, backgroundInstruction, lightingInstruction)
    }
    
    console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`)
    
    resultBase64 = await renderSingleStep(
      client, model, cleanSubject, cleanGarment, cleanIdentityImages, prompt, aspectRatio, temperature, resolution
    )
  } else if (preset?.scene) {
    // LAYERED WORKFLOW - Outfit first, then scene change
    console.log('🎬 Mode: LAYERED WORKFLOW (outfit → scene)')
    resultBase64 = await renderLayered(
      client, model, cleanSubject, cleanGarment, cleanIdentityImages, preset, aspectRatio, temperature, resolution
    )
  } else {
    // Custom background - use single step with anchored prompt
    console.log('📸 Mode: SINGLE-STEP (custom background)')
    
    let prompt: string
    if (hasMultiRef) {
      const anchor = buildMultiReferenceAnchor(cleanIdentityImages.length)
      const end = buildMultiReferenceEnd()
      prompt = `${anchor}

TASK: Show this person wearing the outfit from the last image.
Background: ${backgroundInstruction}
Lighting: ${lightingInstruction}

The first ${cleanIdentityImages.length + 1} images show the SAME PERSON.
Use all angles to understand their face perfectly.

${LOOKALIKE_RULES}

${end}`
    } else {
      prompt = isPro 
        ? buildProPrompt(false, preset, backgroundInstruction, lightingInstruction)
        : buildFlashPrompt(false, preset, backgroundInstruction, lightingInstruction)
    }
    
    resultBase64 = await renderSingleStep(
      client, model, cleanSubject, cleanGarment, cleanIdentityImages, prompt, aspectRatio, temperature, resolution
    )
  }

  const elapsed = Date.now() - startTime
  console.log(`⏱️ Total render time: ${(elapsed / 1000).toFixed(1)}s`)

  return `data:image/jpeg;base64,${resultBase64}`
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
    identityImagesBase64: params.identityImagesBase64, // Pass through identity images
    backgroundInstruction: params.shootPlan.scene_text || 'keep original background',
    lightingInstruction: 'natural lighting',
    quality: params.opts.quality,
    aspectRatio: params.opts.aspectRatio,
    resolution: params.opts.resolution,
    stylePresetId: params.stylePresetId,
  })
}
