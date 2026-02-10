import { GoogleGenAI, type ImageConfig, type GenerateContentConfig, type ContentListUnion } from '@google/genai'
import { getGeminiKey } from '@/lib/config/api-keys'

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

  try {
    console.log('🎨 Starting Gemini image generation...')
    console.log(`Model: ${model}, Aspect Ratio: ${aspectRatio}, Resolution: ${resolution}`)

    const client = getClient()
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
    console.log('📸 Added person image (identity source)')

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
    console.log(`📝 Added ${isPro ? 'PRO Context Lock' : 'FLASH Reminders'} face instruction`)

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
        console.log('👕 Added garment reference image')
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
        console.log('🖼️ Added background reference image')
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
          console.log(`👜 Added accessory: ${label}`)
        }
      })
    }

    // No need for repeated images - Nano Banana understands "this person" from the first image

    console.log('✅ Contents prepared')

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

    console.log('📡 Sending generation request to Gemini...')
    const startTime = Date.now()

    // Generate content
    const response = await client.models.generateContent({
      model,
      contents,
      config,
    })

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`✅ Gemini responded in ${duration}s`)

    // Extract image from response
    if (response.data) {
      console.log('✅ Image extracted from response.data')
      return `data:image/png;base64,${response.data}`
    }

    // Check candidates for inline data
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0]
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
            console.log(`✅ Image extracted from candidates (${part.inlineData.mimeType})`)
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
