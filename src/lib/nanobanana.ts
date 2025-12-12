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
    let simplePrompt = `Edit this photo. Keep the EXACT same person, EXACT same face.\n\n`
    
    if (hasClothingChange) {
      simplePrompt += `• Replace the person's current clothing with the EXACT garment from the clothing reference image: ${garmentDesc}\n`
    }
    if (hasSceneChange) {
      simplePrompt += `• Place this EXACT person in: ${sceneDescription}\n`
    }
    if (hasLightingChange) {
      simplePrompt += `• Apply ${lightingDescription}\n`
    }
    if (hasClothingChange) {
      simplePrompt += `\nIMPORTANT: Clothing replacement is REQUIRED. Do NOT keep the original clothing. Replace the visible clothing region cleanly with the reference garment.\n`
    }
    
    simplePrompt += `
EXACT FACE REQUIRED:
- EXACT same eyes, EXACT same nose, EXACT same lips
- EXACT same skin tone, EXACT same facial structure  
- EXACT same hair color and style
- Do NOT generate a new face - use the EXACT face from the photo above

EXACT POSE REQUIRED:
- EXACT same body position as in the original photo
- EXACT same arm positions and hand placement
- EXACT same head angle and tilt
- EXACT same body angle and orientation
- Do NOT change the pose - keep it EXACTLY as shown

EXACT CLOTHING REQUIRED:
- EXACT same garment from the clothing reference image
- EXACT same color - match the EXACT shade and hue
- EXACT same pattern - every detail, motif, and design element
- EXACT same fabric texture and material appearance
- EXACT same neckline, sleeves, and silhouette
- EXACT same embroidery, prints, or decorative elements
- Do NOT modify or change the garment design in any way

PHOTO-REALISTIC QUALITY (NO AI LOOK):
- Output must look like a REAL PHOTOGRAPH, not AI generated
- Natural, realistic lighting - no artificial glow or halos
- Realistic shadows that match the environment
- No HDR over-processing or unnatural contrast
- Skin must have natural texture with pores visible - no plastic/smooth look
- No over-saturation of colors
- Background must look like a real photograph, not a render
- Seamless, natural blend between person and environment
- Match the lighting direction consistently across the whole image
- Avoid that "AI generated" uncanny valley look`
    
    if (hasClothingChange) {
      simplePrompt += `\n\nEXACT Clothing reference (copy this EXACT garment - EXACT color, EXACT pattern, EXACT design):`
    }

    contents.push(simplePrompt)
    console.log('📝 Added EXACT face instruction')

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

    // STEP 5: Final reinforcement with EXACT + anti-AI-look
    contents.push(`
FINAL OUTPUT REQUIREMENTS:
- EXACT same person, EXACT same face from the first image
- EXACT same pose and body position - do not change how the person is positioned
- EXACT same clothing as shown in the clothing reference - EXACT color, EXACT pattern, EXACT design
- The garment must be an EXACT copy - no modifications, no color shifts, no pattern changes
- Only the background/environment changes, the person stays in their EXACT original pose

CRITICAL - AVOID AI LOOK:
- Must look like a REAL PHOTOGRAPH taken by a camera
- NO artificial lighting, NO glowing edges, NO halos
- NO plastic skin, NO over-smoothing
- NO over-saturated or unrealistic colors
- Background must be REALISTIC - like a real location photo
- Lighting must be NATURAL and CONSISTENT across the image
- The final image should be indistinguishable from a real photo`)

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
