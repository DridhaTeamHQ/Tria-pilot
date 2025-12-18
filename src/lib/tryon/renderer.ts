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
// HIGGSFIELD-STYLE IDENTITY PRESERVATION
// Based on research: ultra-detailed skin and facial geometry preservation
// ====================================================================================

const IDENTITY_CORE = `IDENTITY PRESERVATION (CRITICAL):
The person in the reference images is the STRICT subject. Copy their identity with forensic precision:

FACIAL GEOMETRY - Exact measurements from reference:
- Face shape: exact jawline width, cheekbone prominence, chin shape and projection
- Eye zone: precise eye size, spacing, iris color, eyelid crease depth, lash density
- Nose structure: bridge width, tip shape, nostril flare, columella angle
- Mouth: lip thickness ratio (upper/lower), lip width, cupid's bow shape, natural line
- Brow: arch position, thickness, spacing from eyes
- Ears: if visible, exact shape and position

SKIN AUTHENTICITY - No beautification allowed:
- Exact skin tone and undertone (warm/cool/neutral) - NO lightening or darkening
- Visible pores, especially on nose and cheeks
- Natural texture: fine lines, expression creases
- All natural marks: moles, freckles, birthmarks, acne scars
- Skin imperfections are REQUIRED for realism
- No airbrushing, no smoothing, no filtering
- Subtle natural shine on T-zone if present in reference

BODY FIDELITY:
- Exact body proportions (weight, build, muscle tone)
- Natural body asymmetries preserved
- Arm and hand proportions from reference
- Posture and stance matching reference energy`

const ANTI_AI_MARKERS = `ANTI-AI REALISM REQUIREMENTS:
- Visible skin pores and fine texture
- Natural micro-expressions (not frozen perfect smile)
- Subtle skin color variation across face
- Natural hair texture with flyaways and frizz
- Clothing wrinkles and natural draping
- Minor imperfections in fabric alignment
- No plastic/waxy skin appearance
- No over-sharpened features
- No uncanny symmetry`

// ====================================================================================
// HIGGSFIELD-STYLE SCENE PRESETS
// Each preset has: scene, lighting, camera, texture, style specifications
// Based on the professional prompts shared by user
// ====================================================================================

const CINEMA_PRESETS: Record<string, {
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
  
  // STUDIO PRESETS
  studio_white: {
    scene: 'a real photography studio with white seamless paper backdrop, showing natural paper curve where wall meets floor, subtle shadow gradients, minor paper creases visible',
    lighting: 'professional three-point studio lighting: key light at 45 degrees creating natural cheek shadow, fill light softening opposite side, rim light separating subject from backdrop, catchlights visible in eyes',
    camera: '85mm portrait lens at f/2.8, eye-level composition, subject centered with breathing room above head, shallow depth of field with backdrop softly out of focus',
    texture: 'visible skin pores and natural texture, fabric weave clearly defined, paper backdrop texture with minor wrinkles and dust particles, natural hair strands',
    style: 'professional fashion photography, clean editorial aesthetic with authentic studio feel, subtle film grain, Vogue-tier quality',
  },
  
  studio_grey: {
    scene: 'a photography studio with grey muslin fabric backdrop, natural fabric texture and gentle draping visible, worn edges of fabric, slightly uneven tone',
    lighting: 'soft box lighting from camera right creating gentle shadows on face, natural falloff toward backdrop, slight warmth in highlights',
    camera: '50mm at f/4, three-quarter composition, natural eye-level angle, subject positioned using rule of thirds',
    texture: 'visible fabric grain on backdrop, clothing texture clearly rendered, skin pores visible, hair texture with natural flyaways, subtle dust particles in light',
    style: 'editorial portrait photography, LinkedIn professional tier, authentic not CGI-perfect, slight desaturation in shadows',
  },
  
  // OUTDOOR INDIAN PRESETS
  outdoor_natural: {
    scene: 'a lush Indian garden with overgrown bougainvillea in magenta and white, weathered stone pathway with moss between cracks, tropical ferns and palms, scattered fallen flowers, old terracotta pots with chipped paint, chai-stained table visible in background',
    lighting: 'dappled natural sunlight filtering through leaves creating organic shadow patterns, bright highlights with warm undertone, natural lens warmth from sun position',
    camera: 'candid iPhone 15 Pro shot, 24mm wide angle with natural distortion, slightly off-center framing, subtle motion blur suggesting spontaneous moment, natural depth of field',
    texture: 'worn stone texture with moss and age spots, wilted flower edges, dusty leaf surfaces, rough tree bark, natural grass with dry patches, gravel and dirt',
    style: 'authentic Indian garden snapshot, shot on iPhone, travel blog aesthetic, candid moment captured by friend, warm and inviting atmosphere',
  },
  
  outdoor_golden: {
    scene: 'a weathered Indian rooftop terrace at sunset, old potted plants including tulsi and money plant, faded plastic chairs, rusty iron railing, hanging laundry partially visible, water tank in distance, cityscape silhouette',
    lighting: 'warm golden hour with sun at 15 degrees above horizon, long shadows stretching across terrace, orange-pink gradient in sky, natural sun flare bleeding into frame, warm skin glow',
    camera: 'handheld phone shot with slight natural tilt, background in sharp focus showing atmospheric haze, 26mm focal length, aperture at f/1.8 for dreamy bokeh on edges',
    texture: 'sun-weathered concrete with cracks and stains, dusty floor tiles, terracotta pot patina, rusty metal details, warm glowing skin with visible pores, hair catching golden light',
    style: 'golden hour rooftop snap, shot on iPhone, Indian travel influencer aesthetic, spontaneous and warm, #GoldenHour vibes',
  },
  
  outdoor_beach: {
    scene: 'a real Goa/Kerala beach with uneven wet sand, seaweed strands, human footprints, weathered palm trees with brown fronds and coconuts, beach debris like shells and driftwood, distant fishing boats, beach shack barely visible',
    lighting: 'bright coastal sun with glare on water creating sparkle, natural harsh shadows from overhead sun, fill from sand reflection, slight overexposure on highlights',
    camera: 'candid beach snapshot from friend, slightly low angle to capture sky, 24mm wide with natural barrel distortion, wind catching hair and fabric, water splash droplets near feet',
    texture: 'grainy sand with footprint impressions, salt spray residue on skin, wet fabric clinging, weathered palm bark, shell fragments, foam on water edge',
    style: 'authentic Goa vacation photo, shot on iPhone, beach holiday vibes, travel influencer candid, natural and unposed',
  },
  
  // URBAN/STREET INDIAN PRESETS
  street_city: {
    scene: 'a vibrant Indian city street with colorful painted buildings in peeling pastels, tangled electric wires overhead, parked scooters and bikes, street vendors, chai stall with steel glasses, hand-painted shop signs, stray dog resting, auto-rickshaw passing',
    lighting: 'harsh midday Indian sun creating strong shadows, slight dust haze in air catching light, natural urban lighting with reflections from shop windows',
    camera: 'candid street shot from slight distance, 35mm focal length, handheld with minor motion blur suggesting busy street, eye-level documentary style',
    texture: 'cracked pavement with paan stains, faded paint on walls, dusty surfaces, real urban grit, fabric texture of street vendor cloths, metal rust on railings',
    style: 'authentic Indian street photography, documentary candid style, National Geographic tier, real India not tourist version, raw and authentic',
  },
  
  street_cafe: {
    scene: 'a cozy Indian café with mismatched wooden chairs showing wear, chipped Formica tables with coffee stains, plants in recycled tins, string fairy lights, vintage Bollywood posters, chai menu on chalkboard, condiment bottles clustered',
    lighting: 'warm ambient bulb light creating orange cast, mixed with cool daylight from windows creating interesting color temperature blend, soft shadows under furniture',
    camera: 'casual phone snapshot from across table, slightly off-center framing, 26mm lens, shallow depth with background café patrons softly blurred, warm color grade',
    texture: 'worn wood grain with scratches, scratched table surfaces, condensation on glass, fabric wrinkles, dust particles in light beam from window, fingerprints on glasses',
    style: 'authentic Indian café snapshot, Instagram casual #CoffeeTime, taken by friend, warm and cozy vibes, urban India millennial',
  },
  
  // LIFESTYLE INDIAN PRESETS  
  lifestyle_home: {
    scene: 'a real Indian apartment with lived-in feel, sunlight streaming through sheer curtains, family photos on wall, indoor plants like money plant and tulsi, some everyday clutter visible, colorful cushions on sofa, books stacked, chai cup on side table',
    lighting: 'natural window light creating soft directional illumination, dust motes floating in sunbeam, warm afternoon glow, shadows from window frame creating patterns',
    camera: 'casual home photo angle, slightly tilted iPhone shot, 24mm wide angle capturing room context, eye-level or slightly above, natural depth of field',
    texture: 'worn sofa fabric with pilling, dusty shelves, rumpled curtains, fingerprints on photo frames, natural home imperfections, fabric creases',
    style: 'authentic Indian home photo, real life not staged, #HomeSweetHome vibes, relatable and warm, family album quality',
  },
  
  lifestyle_office: {
    scene: 'a real Indian corporate office with papers on desk, dual monitor setup, water bottle and chai cup, cables visible, slightly wilted desk plant, motivational poster, cubicle dividers, office chair with worn armrests',
    lighting: 'harsh overhead fluorescent with slight green tint, mixed with natural window light from one side, typical office lighting creating flat shadows',
    camera: 'candid colleague snapshot, 35mm from across desk, slightly above eye level, office background in sharp focus, natural framing',
    texture: 'keyboard with dust between keys, desk clutter, wrinkled documents, office carpet texture, synthetic fabric of chair, plastic monitor bezels',
    style: 'authentic workplace photo, LinkedIn casual professional, colleague taking quick photo, Indian IT office aesthetic',
  },
  
  // EDITORIAL/FASHION PRESET
  editorial_minimal: {
    scene: 'a minimal industrial space with raw concrete walls showing form marks and slight cracks, polished concrete floor with scuff marks, single geometric light fixture, negative space emphasized, architectural shadow play',
    lighting: 'dramatic harsh directional light from high window creating deep chiaroscuro, visible light source direction, hard shadows on face adding dimension, rim light on hair',
    camera: 'fashion editorial angle at 50mm, deliberate composition with subject in lower third, expansive negative space above, f/8 for sharpness throughout',
    texture: 'raw concrete texture with air bubbles and imperfections, polished floor with dust, natural skin pores and texture visible, fabric grain clear, slight film grain',
    style: 'high-fashion editorial, Vogue India aesthetic, raw industrial meets luxury, hyper-real texture fidelity, cinematic and intentional',
  },
}

// ====================================================================================
// PRO MODEL PROMPTS - Detailed cinematic prompts inspired by Higgsfield Soul
// ====================================================================================

function buildProPrompt(
  keepBg: boolean, 
  preset: typeof CINEMA_PRESETS[string] | null, 
  backgroundInstruction: string, 
  lightingInstruction: string,
  identityCount: number
): string {
  const identityRef = identityCount > 0 
    ? `You have ${identityCount + 1} reference images of the SAME PERSON from different angles. The LAST image is the CLOTHING.`
    : `Image 1 is the PERSON. Image 2 is the CLOTHING to apply.`

  // CLOTHING ONLY / KEEP ORIGINAL
  if (keepBg) {
    return `VIRTUAL CLOTHING TRY-ON

${identityRef}

${IDENTITY_CORE}

TASK: Replace ONLY the outfit.
- Remove current clothing from the person
- Apply the clothing from the garment image
- Keep EXACT same: face, body, hair, pose, background, lighting
- Clothing should fit naturally with proper draping and wrinkles
- Match clothing to person's body shape and pose

${ANTI_AI_MARKERS}

FINAL CHECK: The face must be indistinguishable from the reference. Same person, just different clothes.`
  }
  
  // SCENE CHANGE WITH PRESET
  if (preset?.scene) {
    return `FASHION PHOTOGRAPHY: VIRTUAL TRY-ON + SCENE

${identityRef}

${IDENTITY_CORE}

OUTFIT CHANGE:
Remove current clothing and apply the garment from the clothing image.
Natural fit with realistic wrinkles and draping based on pose.

SCENE SETTING:
${preset.scene}

LIGHTING SETUP:
${preset.lighting}

CAMERA & COMPOSITION:
${preset.camera}

TEXTURE FIDELITY:
${preset.texture}
${ANTI_AI_MARKERS}

VISUAL STYLE:
${preset.style}

CRITICAL: The new environment affects lighting on skin and clothes, but NEVER changes facial features.
The person's identity is LOCKED from reference images.`
  }
  
  // CUSTOM BACKGROUND
  return `VIRTUAL TRY-ON WITH CUSTOM SETTING

${identityRef}

${IDENTITY_CORE}

OUTFIT: Apply clothing from the garment image with natural fit.

SETTING: ${backgroundInstruction}

LIGHTING: ${lightingInstruction}

${ANTI_AI_MARKERS}

FINAL: Person's face must match reference exactly. Only clothes and background change.`
}

// ====================================================================================
// FLASH MODEL PROMPTS - Simpler but effective
// Flash responds better to concise, direct instructions
// ====================================================================================

function buildFlashPrompt(
  keepBg: boolean, 
  preset: typeof CINEMA_PRESETS[string] | null, 
  backgroundInstruction: string, 
  lightingInstruction: string,
  identityCount: number
): string {
  const identityRef = identityCount > 0 
    ? `First ${identityCount + 1} images = SAME PERSON (different angles). Last image = NEW CLOTHING.`
    : `Image 1 = PERSON. Image 2 = NEW CLOTHING.`

  // CLOTHING ONLY
  if (keepBg) {
    return `CLOTHING SWAP TASK

${identityRef}

RULES:
1. Keep EXACT same face (every feature identical)
2. Keep EXACT same body shape and proportions
3. Keep same background and lighting
4. Keep same pose and expression
5. ONLY change: put clothing from last image on person

FACE CHECK: Must look like same person's passport photo. No changes to eyes, nose, lips, skin tone, face shape.

OUTPUT: Same person, same everything, just wearing the new outfit.`
  }
  
  // SCENE CHANGE
  if (preset?.scene) {
    return `FASHION PHOTO: TRY-ON + SCENE CHANGE

${identityRef}

STEP 1 - FACE LOCK:
Copy person's face exactly. Same features, skin tone, expression.

STEP 2 - OUTFIT:
Put the clothing from last image on them. Natural fit.

STEP 3 - SCENE:
Place them in: ${preset.scene}
Lighting: ${preset.lighting}
Style: ${preset.style}

RULES:
- Face CANNOT change when scene changes
- Add realistic textures: skin pores, fabric weave, background detail
- Natural imperfections (not CGI-perfect)

VERIFY: Face matches reference exactly. Only clothes and background are different.`
  }
  
  // CUSTOM
  return `TRY-ON: CLOTHES + BACKGROUND

${identityRef}

Put clothing from last image on the person.
Place in: ${backgroundInstruction}
Lighting: ${lightingInstruction}

IDENTITY LOCK:
- Same face shape and features
- Same skin tone (no lightening)
- Same body proportions
- Add natural skin texture (pores visible)

Result: Same person, new outfit, new background.`
}

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

// ====================================================================================
// SINGLE-STEP RENDERER - For clothing-only changes
// ====================================================================================

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
  const contents: ContentListUnion = []
  
  // Primary subject image
  contents.push({ inlineData: { data: subjectBase64, mimeType: 'image/jpeg' } } as any)
  
  // Additional identity reference images
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

  console.log(`   📷 Rendering with ${1 + identityImages.length} identity refs + 1 garment`)

  const resp = await client.models.generateContent({ model, contents, config })

  if (resp.candidates?.length) {
    for (const part of resp.candidates[0]?.content?.parts || []) {
      if (part.inlineData?.mimeType?.startsWith('image/') && part.inlineData?.data) {
        return part.inlineData.data
      }
    }
  }

  if ((resp as any).data) return (resp as any).data

  throw new Error('No image generated in single step')
}

// ====================================================================================
// LAYERED WORKFLOW - For scene changes
// Step 1: Outfit swap with identity lock (neutral background)
// Step 2: Scene change (identity already baked in)
// ====================================================================================

async function renderLayered(
  client: GoogleGenAI,
  model: string,
  subjectBase64: string,
  garmentBase64: string,
  identityImages: string[],
  preset: typeof CINEMA_PRESETS[string],
  aspectRatio: string,
  temperature: number,
  resolution?: string
): Promise<string> {
  const identityCount = identityImages.length
  const isPro = model.includes('pro')
  
  console.log('🎯 LAYERED WORKFLOW: Step 1 - Outfit swap + identity lock')
  console.log(`   📷 Using ${1 + identityCount} identity reference(s)`)
  
  // STEP 1: Outfit swap with neutral background (identity focus)
  const step1Prompt = isPro 
    ? `STEP 1: IDENTITY-LOCKED OUTFIT SWAP

${identityCount > 0 
  ? `You have ${identityCount + 1} images of the SAME PERSON from different angles. Study their face from all angles.
The LAST image is the CLOTHING to apply.`
  : `Image 1 = PERSON. Image 2 = CLOTHING.`}

${IDENTITY_CORE}

TASK:
1. Study the person's face from all reference angles
2. Remove their current clothing
3. Apply the garment from the last image
4. Use plain GREY studio background
5. Flat, even lighting

Focus on PERFECT facial identity match using all reference images.
The clothing should fit naturally based on their body shape.

${ANTI_AI_MARKERS}

This is the foundation - face must be PERFECT before we add the scene.`
    : `OUTFIT SWAP - STEP 1

${identityCount > 0 
  ? `First ${identityCount + 1} images = SAME PERSON. Last = CLOTHING.`
  : `Image 1 = PERSON. Image 2 = CLOTHING.`}

Put the clothing on the person.
Use grey studio background.
Flat lighting.

CRITICAL: Face must be EXACTLY like the reference images.
Same eyes, nose, lips, skin tone, face shape.
No beautification. Real skin texture with pores.`

  // Build contents
  const step1Contents: ContentListUnion = []
  step1Contents.push({ inlineData: { data: subjectBase64, mimeType: 'image/jpeg' } } as any)
  
  for (const identityImg of identityImages) {
    const clean = stripDataUrl(identityImg)
    if (clean && clean.length > 100) {
      step1Contents.push({ inlineData: { data: clean, mimeType: 'image/jpeg' } } as any)
    }
  }
  
  step1Contents.push({ inlineData: { data: garmentBase64, mimeType: 'image/jpeg' } } as any)
  step1Contents.push(step1Prompt)

  const step1Config: GenerateContentConfig = {
    responseModalities: ['IMAGE'],
    imageConfig: { aspectRatio } as any,
    temperature: 0.01, // Ultra-low for identity preservation
  }

  const step1Start = Date.now()
  const step1Resp = await client.models.generateContent({ 
    model, 
    contents: step1Contents, 
    config: step1Config 
  })
  console.log(`   ✓ Step 1 completed in ${((Date.now() - step1Start) / 1000).toFixed(1)}s`)

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

  // STEP 2: Scene change using Step 1 result (face is now "baked in")
  const step2Prompt = isPro
    ? `SCENE PLACEMENT

Take this person EXACTLY as they appear and place them in a new environment.

NEW SCENE:
${preset.scene}

LIGHTING:
${preset.lighting}

CAMERA/COMPOSITION:
${preset.camera}

TEXTURE REQUIREMENTS:
${preset.texture}

STYLE:
${preset.style}

ABSOLUTE RULES:
- DO NOT modify the person's face AT ALL - it is LOCKED
- DO NOT change body shape or proportions
- DO NOT change clothes (already correct)
- ONLY change: background and apply scene-appropriate lighting on surfaces

The person should look naturally photographed in this location.
Apply realistic environmental lighting to their skin and clothes.
But their FACE remains IDENTICAL to input.`
    : `SCENE CHANGE - KEEP PERSON IDENTICAL

Place this person in: ${preset.scene}
Lighting: ${preset.lighting}
Style: ${preset.style}

RULES:
- Face stays EXACTLY the same (do not touch it)
- Body and clothes stay the same
- Only change the background
- Add natural scene lighting to skin/clothes

Make it look like they were photographed there.
Face is LOCKED - cannot change.`

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
    temperature: 0.25, // Slightly higher for creative background
  }

  const step2Start = Date.now()
  const step2Resp = await client.models.generateContent({ 
    model, 
    contents: step2Contents, 
    config: step2Config 
  })
  console.log(`   ✓ Step 2 completed in ${((Date.now() - step2Start) / 1000).toFixed(1)}s`)

  if (step2Resp.candidates?.length) {
    for (const part of step2Resp.candidates[0]?.content?.parts || []) {
      if (part.inlineData?.mimeType?.startsWith('image/') && part.inlineData?.data) {
        return part.inlineData.data
      }
    }
  }

  // Fallback to Step 1 if Step 2 fails
  console.log('⚠️ Step 2 failed, returning Step 1 result')
  return step1Image
}

// ====================================================================================
// MAIN RENDERER
// Routes to single-step or layered based on preset type
// ====================================================================================

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
  
  const cleanIdentityImages = (identityImagesBase64 || [])
    .map(img => stripDataUrl(img))
    .filter(img => img && img.length > 100)

  if (!cleanSubject || cleanSubject.length < 100) throw new Error('Invalid subject image')
  if (!cleanGarment || cleanGarment.length < 100) throw new Error('Invalid garment image')

  const preset = stylePresetId ? CINEMA_PRESETS[stylePresetId] : null
  
  // Detect "keep background" modes
  const bgLower = backgroundInstruction.toLowerCase()
  const keepBg = !stylePresetId ||
                 stylePresetId === 'keep_original' ||
                 bgLower.includes('keep') || 
                 bgLower.includes('original') ||
                 bgLower.includes('same') ||
                 bgLower.includes('unchanged')

  // Temperature for identity preservation
  const temperature = isPro ? 0.01 : 0.03

  console.log(`\n🚀 RENDER START`)
  console.log(`   Model: ${model}`)
  console.log(`   Preset: ${stylePresetId || 'none'}`)
  console.log(`   Mode: ${keepBg ? 'CLOTHING-ONLY' : preset?.scene ? 'LAYERED' : 'CUSTOM'}`)
  console.log(`   Identity refs: ${1 + cleanIdentityImages.length}`)
  console.log(`   Resolution: ${resolution || '1K'}`)

  const startTime = Date.now()
  let resultBase64: string

  if (keepBg) {
    // SINGLE STEP - Just swap clothing
    const prompt = isPro 
      ? buildProPrompt(true, null, backgroundInstruction, lightingInstruction, cleanIdentityImages.length)
      : buildFlashPrompt(true, null, backgroundInstruction, lightingInstruction, cleanIdentityImages.length)
    
    resultBase64 = await renderSingleStep(
      client, model, cleanSubject, cleanGarment, cleanIdentityImages, prompt, aspectRatio, temperature, resolution
    )
  } else if (preset?.scene) {
    // LAYERED WORKFLOW - Outfit first, then scene
    resultBase64 = await renderLayered(
      client, model, cleanSubject, cleanGarment, cleanIdentityImages, preset, aspectRatio, temperature, resolution
    )
  } else {
    // CUSTOM BACKGROUND - Single step
    const prompt = isPro 
      ? buildProPrompt(false, null, backgroundInstruction, lightingInstruction, cleanIdentityImages.length)
      : buildFlashPrompt(false, null, backgroundInstruction, lightingInstruction, cleanIdentityImages.length)
    
    resultBase64 = await renderSingleStep(
      client, model, cleanSubject, cleanGarment, cleanIdentityImages, prompt, aspectRatio, temperature, resolution
    )
  }

  const elapsed = Date.now() - startTime
  console.log(`✅ RENDER COMPLETE in ${(elapsed / 1000).toFixed(1)}s\n`)

  return `data:image/jpeg;base64,${resultBase64}`
}

// Compatibility wrapper for V3
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
