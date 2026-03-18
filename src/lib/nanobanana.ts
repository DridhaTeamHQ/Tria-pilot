import { GoogleGenAI, type ImageConfig, type GenerateContentConfig, type ContentListUnion } from '@google/genai'
import { getGeminiKey } from '@/lib/config/api-keys'
import { geminiGenerateContent } from '@/lib/gemini/executor'

// Initialize the Google GenAI client
const getClient = () => {
  const apiKey = getGeminiKey()
  return new GoogleGenAI({ apiKey })
}

export interface TryOnOptions {
  personImage: string // base64 (with or without data URI prefix) - primary image
  personImages?: string[] // Optional: additional person images for Pro model
  editType?: 'clothing_change' | 'background_change' | 'lighting_change' | 'pose_change' | 'camera_change'
  clothingImage?: string // base64 - garment reference (may include face; must be ignored)
  backgroundImage?: string // base64 - background reference (optional)
  accessoryImages?: string[] // NEW: base64 images of accessories (purse, shoes, hat, etc.)
  accessoryTypes?: ('purse' | 'shoes' | 'hat' | 'jewelry' | 'bag' | 'watch' | 'sunglasses' | 'scarf' | 'other')[] // NEW: type labels for each accessory
  prompt: string // strict edit prompt built by templates
  model?: 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview'
  aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9'
  resolution?: '1K' | '2K' | '4K' // Pro model only
  // NEW: Text-based scene/background description (for presets)
  sceneDescription?: string // e.g. "Golden hour in open fields with warm natural light"
  lightingDescription?: string // e.g. "Soft warm golden hour light"
  garmentDescription?: string // Detailed garment description (from GPT-4o mini)
  background?: string
  pose?: string
  expression?: string
}

/**
 * Generate virtual try-on image using Gemini image generation models
 * 
 * CRITICAL: Face consistency is the #1 priority.
 * The person image face MUST be preserved exactly.
 * Any face in clothing reference MUST be completely ignored.
 */
export async function generateTryOn(options: TryOnOptions): Promise<string> {
  const {
    personImage,
    personImages = [],
    editType = 'clothing_change',
    clothingImage,
    backgroundImage,
    accessoryImages = [],
    accessoryTypes = [],
    prompt,
    model = 'gemini-2.5-flash-image',
    aspectRatio = '4:5',
    resolution = '2K',
    sceneDescription,
    lightingDescription,
    garmentDescription,
  } = options

  const isDev = process.env.NODE_ENV !== 'production'
  try {
    if (isDev) {
      console.log('🎨 Starting Gemini image generation...')
      console.log(`Model: ${model}, Aspect Ratio: ${aspectRatio}, Resolution: ${resolution}`)
    }

    const contents: ContentListUnion = []
    const isPro = model === 'gemini-3-pro-image-preview'

    // Clean person image
    const cleanPersonImage = personImage.replace(/^data:image\/[a-z]+;base64,/, '')
    if (!cleanPersonImage || cleanPersonImage.length < 100) {
      throw new Error('Invalid person image: image data is too short or empty')
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SIMPLE DIRECT APPROACH - Nano Banana "this person" method
    // Key insight: Simple prompts work better than complex JSON
    // ═══════════════════════════════════════════════════════════════════════

    // STEP 1: Person image FIRST (this establishes "this person")
    contents.push({
      inlineData: {
        data: cleanPersonImage,
        mimeType: 'image/jpeg',
      },
    } as any)
    if (isDev) console.log('📸 Added person image (identity source)')

    // STEP 2: Build simple, direct prompt
    const hasSceneChange = !!sceneDescription
    const hasClothingChange = !!clothingImage
    const hasLightingChange = !!lightingDescription

    // Prefer explicit garment description (so clothing doesn't get ignored)
    // Fallback: try to parse legacy prompt text
    let garmentDesc = (garmentDescription || '').trim()
    if (!garmentDesc) {
      garmentDesc = "the garment shown in the clothing reference image"
      if (prompt && prompt.includes('GARMENT:')) {
        const match = prompt.match(/GARMENT:\s*([^\n]+)/)
        if (match) garmentDesc = match[1].trim()
      }
    }

    // Build simple instruction with EXACT emphasis for BOTH face AND clothing
    // ═══════════════════════════════════════════════════════════════════════
    // CONSISTENT TRY-ON PIPELINE
    // LOCKED (NEVER CHANGE): Face, Pose, Body Position, Hair
    // EDITABLE: Clothing, Background, Lighting
    // ═══════════════════════════════════════════════════════════════════════

    // Generate unique identity anchor for this session
    const identityAnchor = `SUBJECT-${Date.now().toString(36).toUpperCase()}`

    let simplePrompt: string

    if (isPro) {
      // PRO MODEL: "Context Lock" technique
      simplePrompt = `VIRTUAL TRY-ON PIPELINE - PRO MODE

═══════════════════════════════════════════════════════════════════════════════
🔒 LOCKED ELEMENTS (NEVER CHANGE - COPY EXACTLY FROM FIRST IMAGE):
═══════════════════════════════════════════════════════════════════════════════
The person in the FIRST image is "${identityAnchor}".

FACE (LOCKED - MATCH EXACTLY):
• Face shape, jawline, and bone structure - EXACT MATCH
• Eyes: shape, color, size, spacing - EXACT MATCH
• Nose: bridge width, tip shape - EXACT MATCH  
• Lips: shape, thickness, color - EXACT MATCH
• Skin tone and complexion - EXACT MATCH
• Any moles, marks, or features - EXACT MATCH
• Eyebrows: shape and thickness - EXACT MATCH
• Hair: color, texture, style - EXACT MATCH

POSE (LOCKED - DO NOT CHANGE):
• Body position - EXACT SAME as original
• Arm positions and hand placement - EXACT SAME
• Head angle and tilt - EXACT SAME  
• Body orientation - EXACT SAME
• Expression - natural, similar to original

═══════════════════════════════════════════════════════════════════════════════
✏️ EDITABLE ELEMENTS (WHAT TO CHANGE):
═══════════════════════════════════════════════════════════════════════════════
`
      if (hasClothingChange) {
        simplePrompt += `CLOTHING (EDIT): Replace ${identityAnchor}'s outfit with the EXACT garment from clothing reference.
• Match exact color, pattern, and design from reference
• Natural fabric draping on ${identityAnchor}'s body
• Garment: ${garmentDesc}

`
      }
      if (hasSceneChange) {
        simplePrompt += `BACKGROUND (EDIT): Change background to: ${sceneDescription}
• Keep ${identityAnchor} in exact same pose
• Blend lighting naturally with scene

`
      }
      if (hasLightingChange) {
        simplePrompt += `LIGHTING (EDIT): Apply ${lightingDescription}
• Natural shadows on ${identityAnchor}
• Consistent light direction

`
      }

      simplePrompt += `
═══════════════════════════════════════════════════════════════════════════════
OUTPUT VERIFICATION:
═══════════════════════════════════════════════════════════════════════════════
Before outputting, verify:
✓ Face matches "${identityAnchor}" exactly - their family would recognize them
✓ Pose is unchanged from original photo
✓ Clothing matches reference exactly (if applicable)
✓ Image looks like real photograph, not AI-generated

QUALITY: Shot on 85mm lens, visible skin pores, natural lighting, no AI smoothing.
`
    } else {
      // FLASH MODEL: "The Reminders" technique - repeat face check in every section
      simplePrompt = `VIRTUAL TRY-ON PIPELINE - FLASH MODE

═══════════════════════════════════════════════════════════════════════════════
🔒 LOCKED ELEMENTS (COPY EXACTLY FROM FIRST IMAGE):
═══════════════════════════════════════════════════════════════════════════════
FACE - LOCKED: EXACT same face from first image
• Same eyes, nose, lips, jawline, skin tone
• Same hair color and style
POSE - LOCKED: EXACT same body position
• Same arm positions, head angle, orientation

═══════════════════════════════════════════════════════════════════════════════
✏️ EDITABLE ELEMENTS:
═══════════════════════════════════════════════════════════════════════════════
`
      if (hasClothingChange) {
        simplePrompt += `CLOTHING (EDIT): Replace with garment from reference: ${garmentDesc}
⚠️ REMINDER: Face LOCKED - use EXACT face from first image

`
      }
      if (hasSceneChange) {
        simplePrompt += `BACKGROUND (EDIT): ${sceneDescription}
⚠️ REMINDER: Face LOCKED, Pose LOCKED - only change background

`
      }
      if (hasLightingChange) {
        simplePrompt += `LIGHTING (EDIT): ${lightingDescription}
⚠️ REMINDER: Face LOCKED - same person as first image

`
      }

      simplePrompt += `
═══════════════════════════════════════════════════════════════════════════════
FINAL CHECK:
═══════════════════════════════════════════════════════════════════════════════
🔒 Face = EXACT match to first image (locked)
🔒 Pose = EXACT same position (locked)
✏️ Clothing = from reference (edited)
✏️ Background = as specified (edited)

QUALITY: Realistic photograph, visible skin texture, natural lighting.
`
    }

    // ANTI-DRIFT NEGATIVE PROMPTING (works for both models)
    simplePrompt += `
NEGATIVE PROMPT - FORBIDDEN:
❌ Different face or person
❌ Changed facial structure  
❌ Different eye shape or color
❌ Altered skin tone
❌ Changed pose or body position
❌ Smooth/plastic AI skin
❌ HDR halos or artificial glow
`

    if (hasClothingChange) {
      simplePrompt += `\nClothing reference (EXACT garment to apply - match color, pattern, design):`
    }

    contents.push(simplePrompt)
    if (isDev) console.log(`📝 Added ${isPro ? 'PRO Context Lock' : 'FLASH Reminders'} face instruction`)

    // STEP 3: Clothing reference image
    if (clothingImage) {
      const cleanClothingImage = clothingImage.replace(/^data:image\/[a-z]+;base64,/, '')
      if (cleanClothingImage && cleanClothingImage.length >= 100) {
        contents.push({
          inlineData: {
            data: cleanClothingImage,
            mimeType: 'image/jpeg',
          },
        } as any)
        if (isDev) console.log('👕 Added garment reference image')
      }
    }

    // STEP 4: Background reference image (if provided)
    if (backgroundImage) {
      const cleanBgImage = backgroundImage.replace(/^data:image\/[a-z]+;base64,/, '')
      if (cleanBgImage && cleanBgImage.length >= 100) {
        contents.push('Background reference:')
        contents.push({
          inlineData: {
            data: cleanBgImage,
            mimeType: 'image/jpeg',
          },
        } as any)
        if (isDev) console.log('🖼️ Added background reference image')
      }
    }

    // STEP 5: Final reinforcement with verification checkpoint
    contents.push(`
FINAL OUTPUT VERIFICATION CHECKLIST:
✓ IDENTITY CHECK: Face in output matches face in FIRST image exactly
✓ POSE CHECK: Body position unchanged from original photo
✓ GARMENT CHECK: Clothing matches reference exactly (color, pattern, design)
✓ REALISM CHECK: Image looks like real photograph, not AI-generated

VERIFY BEFORE OUTPUT:
Does the face match the person in the first image? Their family must recognize them.
Is the skin natural (visible pores, texture) not plastic/smooth?
Is the lighting realistic and consistent?

CANDID PHOTO QUALITY:
• Shot on 85mm lens with natural bokeh
• Skin has visible pores and natural texture
• Slight natural imperfections (not over-processed)
• No HDR halos, no artificial glow
• Shadows are soft and realistic
• Colors are natural, not over-saturated

OUTPUT: High-quality realistic photograph of the SAME PERSON from the first image.`)

    // STEP 5: Add accessories if any
    if (accessoryImages.length > 0) {
      const accessoryLabels = accessoryTypes.length > 0 ? accessoryTypes : accessoryImages.map(() => 'accessory')
      accessoryImages.slice(0, 4).forEach((image, idx) => {
        const cleanAccessory = image.replace(/^data:image\/[a-z]+;base64,/, '')
        if (cleanAccessory && cleanAccessory.length >= 100) {
          const label = accessoryLabels[idx] || `accessory_${idx + 1}`
          contents.push(`Also add this ${label}:`)
          contents.push({
            inlineData: {
              data: cleanAccessory,
              mimeType: 'image/jpeg',
            },
          } as any)
          if (isDev) console.log(`👜 Added accessory: ${label}`)
        }
      })
    }

    // No need for repeated images - Nano Banana understands "this person" from the first image

    if (isDev) console.log('✅ Contents prepared')

    // Build image config
    const imageConfig = {
      aspectRatio: aspectRatio,
      personGeneration: 'allow_adult',
    } as ImageConfig

    if (model === 'gemini-3-pro-image-preview' && resolution) {
      imageConfig.imageSize = resolution as any
    }

    // Build generation config
    const config: GenerateContentConfig = {
      responseModalities: ['IMAGE'],
      imageConfig,
    }

    if (isDev) console.log('📡 Sending generation request to Gemini...')
    const startTime = Date.now()

    // Generate content
    const response = await geminiGenerateContent({
      model,
      contents,
      config,
    })

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    if (isDev) console.log(`✅ Gemini responded in ${duration}s`)

    // Extract image from response
    if (response.data) {
      if (isDev) console.log('✅ Image extracted from response.data')
      return `data:image/png;base64,${response.data}`
    }

    // Check candidates for inline data
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0]
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
            if (isDev) console.log(`✅ Image extracted from candidates (${part.inlineData.mimeType})`)
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
          }
        }
      }
    }

    console.error('❌ No image found in Gemini response')
    throw new Error('No image generated by Gemini')
  } catch (error) {
    console.error('❌ Gemini image generation error:', error)

    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('Gemini API key is invalid or missing.')
      } else if (error.message.includes('quota')) {
        throw new Error('Gemini API quota exceeded. Please try again later.')
      } else if (error.message.includes('timeout')) {
        throw new Error('Gemini API request timed out. Please try again.')
      } else if (error.message.includes('Invalid person image')) {
        throw error
      }
      throw new Error(`Gemini generation failed: ${error.message}`)
    }

    throw new Error('Failed to generate image with Gemini')
  }
}

// ═══════════════════════════════════════════════════════════════════════
// DIRECT TRANSPORT LAYER (for Nano Banana Pro pipeline)
// ═══════════════════════════════════════════════════════════════════════

export interface DirectTryOnOptions {
  personImageBase64: string   // raw base64 (no data URI prefix)
  garmentImageBase64: string  // raw base64 (no data URI prefix)
  faceCropBase64?: string     // output of extractFaceCrop (raw base64)
  characterReferenceBase64s?: { base64: string; label: string }[]  // multi-angle character references
  prompt: string              // pre-built sanitized prompt — passed AS-IS
  aspectRatio?: string
  resolution?: string
}

/**
 * Thin transport layer for the Nano Banana Pro pipeline.
 * 
 * CRITICAL: This function does NOT build any prompt internally.
 * The prompt argument is passed DIRECTLY to Gemini.
 * Content order: [person_image, prompt_text, garment_image]
 * Model: always gemini-3-pro-image-preview
 */
export async function generateTryOnDirect(options: DirectTryOnOptions): Promise<string> {
  const {
    personImageBase64,
    garmentImageBase64,
    faceCropBase64,
    characterReferenceBase64s,
    prompt,
    aspectRatio = '4:5',
    resolution = '2K',
  } = options

  // Clean base64 (strip data URI prefix if present)
  const cleanPerson = personImageBase64.replace(/^data:image\/[a-z]+;base64,/, '')
  const cleanGarment = garmentImageBase64.replace(/^data:image\/[a-z]+;base64,/, '')

  if (!cleanPerson || cleanPerson.length < 100) {
    throw new Error('Invalid person image')
  }
  if (!cleanGarment || cleanGarment.length < 100) {
    throw new Error('Invalid garment image')
  }

  if (process.env.NODE_ENV !== 'production') console.log(`🍌 DIRECT TRANSPORT: gemini-3-pro-image-preview | prompt: ${prompt.length} chars`)

  // IMAGE ORDERING — critical for correct garment application:
  // Image 1: Person (identity anchor)
  // Image 2: Garment (THE target clothing — must come early so Gemini prioritizes it)
  // Image 3: Face crop (face-only close-up for identity reinforcement)
  // Image 4+: Character refs (face/body angles — explicitly labeled to IGNORE clothing)
  // Prompt: full instructions LAST
  const contents: ContentListUnion = [
    // Image 1: Person — establishes the identity anchor
    {
      inlineData: {
        data: cleanPerson,
        mimeType: 'image/jpeg',
      },
    } as any,
    'Image 1: the person. Copy this face exactly.',
  ]

  // Image 2: Garment — IMMEDIATELY after person so Gemini knows what to apply
  contents.push(
    {
      inlineData: {
        data: cleanGarment,
        mimeType: 'image/jpeg',
      },
    } as any,
    'Image 2: the TARGET GARMENT. Apply THIS clothing to the person from Image 1. Match the exact color, pattern, fabric, and design from this image. Preserve text and logos.'
  )

  // Image 3: Face crop — face-only close-up for identity reinforcement
  if (faceCropBase64 && faceCropBase64.length > 100) {
    const cleanFaceCrop = faceCropBase64.replace(/^data:image\/[a-z]+;base64,/, '')
    if (cleanFaceCrop.length > 100) {
      if (process.env.NODE_ENV !== 'production') console.log('👤 Adding face crop as Image 3 for identity reinforcement')
      contents.push(
        {
          inlineData: {
            data: cleanFaceCrop,
            mimeType: 'image/jpeg',
          },
        } as any,
        'Image 3: face close-up of the person from Image 1. Use for identity reinforcement only.'
      )
    }
  }

  // Image 4+: Character references — multi-angle identity photos
  // CRITICAL: These show the person in DIFFERENT outfits. Must explicitly tell Gemini
  // to ONLY use the face/body shape and IGNORE any clothing in these images.
  if (characterReferenceBase64s && characterReferenceBase64s.length > 0) {
    let refIdx = 4
    for (const ref of characterReferenceBase64s) {
      const cleanRef = ref.base64.replace(/^data:image\/[a-z]+;base64,/, '')
      if (cleanRef && cleanRef.length > 100) {
        if (process.env.NODE_ENV !== 'production') console.log(`🪞 Adding character ref Image ${refIdx}: ${ref.label}`)
        contents.push(
          {
            inlineData: {
              data: cleanRef,
              mimeType: 'image/jpeg',
            },
          } as any,
          `Image ${refIdx}: ${ref.label} — same person as Image 1, different angle. Use ONLY for face/body identity. IGNORE any clothing in this image. The ONLY garment to apply is from Image 2.`
        )
        refIdx++
      }
    }
  }

  // Full prompt text LAST — instructions build on the visual context already established
  contents.push(prompt)

  const imageConfig = {
    aspectRatio,
    personGeneration: 'allow_adult',
    imageSize: resolution,
  } as ImageConfig

  const config: GenerateContentConfig = {
    responseModalities: ['TEXT', 'IMAGE'],
    // STRONG face immutability instruction — references ALL character images explicitly.
    // Camera specs + technical language prevent cartoonish/CGI output.
    systemInstruction: `You are a photorealistic virtual try-on compositor shooting on a Canon EOS R5.

FACE RULES (IMMUTABLE — highest priority):
- The person's face is a FROZEN TEXTURE MAP from Image 1. Copy it pixel-for-pixel.
- Images 3-7 show the SAME person from different angles. Use them to cross-verify face geometry.
- Match EXACT bone structure, eye shape, eye spacing, nose bridge width, lip contour, jawline angle, skin tone, pore texture, and perceived age from Image 1.
- The face must be IDENTICAL to Image 1. Any deviation is a failure.

GARMENT RULES:
- Apply ONLY the garment from Image 2 — match its exact color, pattern, fabric, and design.
- IGNORE any clothing visible in Images 1, 3, 4, 5, 6, or 7 — those show the person in different outfits.

SCENE RULES:
- Generate a NEW background/scene as described in the SCENE section of the prompt.
- Do NOT keep the background from Image 1 — replace it entirely.
- Adapt pose and framing as described in the POSE section.

OUTPUT QUALITY:
- Shoot with natural film grain, real skin with visible pores and micro-imperfections.
- No airbrushing, no skin smoothing, no beautification, no CGI look.`,
    imageConfig,
    temperature: 0.3,
    topP: 0.85,
    topK: 16,
  }

  const startTime = Date.now()

  // Model selection: Pro (default) or Flash (faster/cheaper)
  // Set TRYON_IMAGE_MODEL=gemini-3.1-flash-image-preview for Nano Banana 2
  const modelName = process.env.TRYON_IMAGE_MODEL?.trim() || 'gemini-3-pro-image-preview'

  const response = await geminiGenerateContent({
    model: modelName,
    contents,
    config,
  })

  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  if (process.env.NODE_ENV !== 'production') console.log(`🍌 DIRECT TRANSPORT: ${modelName} responded in ${duration}s`)

  // Extract image
  if (response.data) {
    return `data:image/png;base64,${response.data}`
  }

  if (response.candidates && response.candidates.length > 0) {
    const candidate = response.candidates[0]
    if (candidate.content && candidate.content.parts) {
      // Log thought process if available (Thinking Mode output)
      const thoughtPart = candidate.content.parts.find(p => p.text)
      if (thoughtPart) {
        if (process.env.NODE_ENV !== 'production') console.log('🧠 GEMINI THOUGHT PROCESS:', thoughtPart.text?.substring(0, 200) + '...')
      }

      for (const part of candidate.content.parts) {
        if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
        }
      }
    }
  }

  throw new Error('No image generated by Gemini')
}

// ═══════════════════════════════════════════════════════════════════════
// GPT IMAGE 1.5 TRANSPORT (for Try-On Pipeline)
// ═══════════════════════════════════════════════════════════════════════

function resolveGPTImageSize(aspectRatio?: string): '1024x1024' | '1024x1536' | '1536x1024' | '1024x1280' {
  if (aspectRatio === '9:16') return '1024x1536'
  if (aspectRatio === '16:9') return '1536x1024'
  if (aspectRatio === '4:5' || aspectRatio === '3:4') return '1024x1280'
  return '1024x1024'
}

/**
 * GPT Image 1.5 transport layer for the Try-On pipeline.
 *
 * CRITICAL: Uses `input_fidelity: 'high'` to preserve face features from
 * the person image. This is the key advantage over Gemini — GPT Image 1.5
 * preserves facial identity natively without needing post-processing.
 *
 * Content order: [person_image, garment_image, face_crop(optional)]
 * The prompt is prepended with anti-cartoon realism directives.
 */
export async function generateTryOnGPT(options: DirectTryOnOptions): Promise<string> {
  const {
    personImageBase64,
    garmentImageBase64,
    faceCropBase64,
    prompt,
    aspectRatio = '1:1',
  } = options

  const isDev = process.env.NODE_ENV !== 'production'

  // Clean base64 (strip data URI prefix if present)
  const cleanPerson = personImageBase64.replace(/^data:image\/[a-z]+;base64,/, '')
  const cleanGarment = garmentImageBase64.replace(/^data:image\/[a-z]+;base64,/, '')

  if (!cleanPerson || cleanPerson.length < 100) {
    throw new Error('Invalid person image')
  }
  if (!cleanGarment || cleanGarment.length < 100) {
    throw new Error('Invalid garment image')
  }

  if (isDev) console.log(`🎯 GPT IMAGE (SDK) TRANSPORT: prompt ${prompt.length} chars`)

  const { getOpenAIKey } = await import('@/lib/config/api-keys')
  const OpenAI = (await import('openai')).default
  const { toFile } = await import('openai')
  const client = new OpenAI({ apiKey: getOpenAIKey() })

  // Concise prefix — references face crop which is now the FIRST image
  const faceFirstPrefix = `RULE #1: The person's face must be IDENTICAL to the close-up face reference (first input image). Do not alter, beautify, or reshape any facial feature.\n\n`
  const fullPrompt = faceFirstPrefix + prompt

  // Build image array using toFile() — the official SDK approach
  // FACE CROP FIRST — GPT Image preserves first image with highest fidelity
  // This gives face identity the strongest signal possible
  const images: any[] = []

  // 1. Face crop FIRST (if available) — identity anchor gets highest priority position
  let hasFaceCropFirst = false
  if (faceCropBase64 && faceCropBase64.length > 100) {
    const cleanFaceCrop = faceCropBase64.replace(/^data:image\/[a-z]+;base64,/, '')
    if (cleanFaceCrop.length > 100) {
      const faceCropFile = await toFile(Buffer.from(cleanFaceCrop, 'base64'), 'face_reference.png', { type: 'image/png' })
      images.push(faceCropFile)
      hasFaceCropFirst = true
      if (isDev) console.log('👤 Face crop placed FIRST for maximum identity fidelity')
    }
  }

  // 2. Person full-body (second — provides body proportions and pose)
  const personFile = await toFile(Buffer.from(cleanPerson, 'base64'), 'person.png', { type: 'image/png' })
  images.push(personFile)

  // 3. Garment (last — lowest priority, just for clothing reference)
  const garmentFile = await toFile(Buffer.from(cleanGarment, 'base64'), 'garment.png', { type: 'image/png' })
  images.push(garmentFile)

  if (isDev) console.log(`📡 Sending to GPT Image 1.5 via SDK images.edit (${fullPrompt.length} chars)`)

  const startTime = Date.now()

  // Try with input_fidelity: 'high' first (critical for face preservation)
  // If the API rejects it, fall back to without it
  let response: any
  try {
    response = await client.images.edit({
      model: 'gpt-image-1.5',
      image: images,
      prompt: fullPrompt,
      size: resolveGPTImageSize(aspectRatio) as any,
      n: 1,
      input_fidelity: 'high',
    } as any)
  } catch (err: any) {
    // If 400 Unknown parameter, retry without input_fidelity
    if (err?.status === 400 && err?.message?.includes('input_fidelity')) {
      if (isDev) console.log('⚠️ input_fidelity not supported, retrying without it')
      response = await client.images.edit({
        model: 'gpt-image-1.5',
        image: images,
        prompt: fullPrompt,
        size: resolveGPTImageSize(aspectRatio) as any,
        n: 1,
      })
    } else {
      throw err
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  if (isDev) console.log(`🎯 GPT IMAGE 1.5: responded in ${duration}s`)

  const imgData = response?.data?.[0]
  if (!imgData?.b64_json) {
    throw new Error('GPT Image 1.5 returned no image data')
  }

  return `data:image/png;base64,${imgData.b64_json}`
}

/**
 * Generate try-on with multi-turn conversation support (for iterative refinement)
 */
export async function generateTryOnWithChat(
  options: TryOnOptions,
  chatHistory?: Array<{ role: 'user' | 'model'; content: any }>
): Promise<{ image: string; chat: any }> {
  const {
    personImage,
    clothingImage,
    prompt,
    model = 'gemini-3-pro-image-preview',
    aspectRatio = '4:5',
    resolution = '2K',
  } = options

  try {
    const client = getClient()
    const contents: ContentListUnion = [prompt]

    if (personImage) {
      const cleanPersonImage = personImage.replace(/^data:image\/[a-z]+;base64,/, '')
      contents.push({
        inlineData: {
          data: cleanPersonImage,
          mimeType: 'image/jpeg',
        },
      } as any)
    }

    if (clothingImage) {
      const cleanClothingImage = clothingImage.replace(/^data:image\/[a-z]+;base64,/, '')
      contents.push({
        inlineData: {
          data: cleanClothingImage,
          mimeType: 'image/jpeg',
        },
      } as any)
    }

    const imageConfig: ImageConfig = {
      aspectRatio: aspectRatio as any,
    }

    if (model === 'gemini-3-pro-image-preview' && resolution) {
      imageConfig.imageSize = resolution as any
    }

    const chat = await client.chats.create({
      model,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig,
      },
    })

    const response = await chat.sendMessage({ message: contents as any })

    let generatedImage: string | null = null

    if (response.data) {
      generatedImage = `data:image/png;base64,${response.data}`
    } else if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0]
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
            generatedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
            break
          }
        }
      }
    }

    if (!generatedImage) {
      throw new Error('No image found in response')
    }

    return { image: generatedImage, chat }
  } catch (error) {
    console.error('Gemini chat generation error:', error)
    throw error instanceof Error ? error : new Error('Failed to generate image with chat')
  }
}
