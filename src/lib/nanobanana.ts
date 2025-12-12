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
    // CRITICAL: This is an IMAGE EDIT task, not image generation
    // The person's face MUST be preserved exactly - this is non-negotiable
    // ═══════════════════════════════════════════════════════════════════════

    // STEP 1: Establish this is an EDIT task with the person as the subject
    contents.push(`TASK: EDIT this photo. Change ONLY the clothing. Keep the SAME person.

This is the person to edit. The face in the output MUST be THIS EXACT PERSON:`)
    
    contents.push({
      inlineData: {
        data: cleanPersonImage,
        mimeType: 'image/jpeg',
      },
    } as any)
    console.log('📸 Added person image (1st time - establishing subject)')

    // STEP 2: Show the person image AGAIN to reinforce identity
    contents.push('SAME PERSON - memorize this face (eyes, nose, lips, jawline, skin tone):')
    contents.push({
      inlineData: {
        data: cleanPersonImage,
        mimeType: 'image/jpeg',
      },
    } as any)
    console.log('📸 Added person image (2nd time - reinforcing identity)')

    // STEP 3: Now show the clothing reference with clear separation
    if (editType === 'clothing_change' && clothingImage) {
      const cleanClothingImage = clothingImage.replace(/^data:image\/[a-z]+;base64,/, '')
      if (cleanClothingImage && cleanClothingImage.length >= 100) {
        contents.push(`
---
CLOTHING REFERENCE (for the garment ONLY):
This image shows the NEW CLOTHING to put on the person above.
⚠️ WARNING: If you see a different person wearing this clothing, IGNORE that person's face completely.
Extract ONLY: color, pattern, neckline, sleeves, fit, fabric.
The face in output must still be the FIRST person shown above.
---`)
        contents.push({
          inlineData: {
            data: cleanClothingImage,
            mimeType: 'image/jpeg',
          },
        } as any)
        console.log('👕 Added garment reference image')
      }
    }

    if (editType === 'background_change' && backgroundImage) {
      const cleanBgImage = backgroundImage.replace(/^data:image\/[a-z]+;base64,/, '')
      if (cleanBgImage && cleanBgImage.length >= 100) {
        contents.push(`
---
BACKGROUND REFERENCE:
Place the person from above into this environment.
The face must still be the FIRST person shown.
---`)
        contents.push({
          inlineData: {
            data: cleanBgImage,
            mimeType: 'image/jpeg',
          },
        } as any)
        console.log('🖼️ Added background reference image')
      }
    }

    // STEP 4: The detailed instruction
    contents.push(`
---
EDIT INSTRUCTION:
${prompt}

⚠️ CRITICAL - READ CAREFULLY:
1. This is a PHOTO EDIT, not new image generation
2. The OUTPUT must show THE SAME PERSON from the first two images
3. Same face shape, same eyes, same nose, same lips, same skin tone
4. Same hair color, same hair style
5. ONLY change the clothing to match the clothing reference
6. Do NOT use the face from the clothing reference image
7. Do NOT generate a new/different person
8. Preserve skin texture, pores, moles, natural imperfections
---`)

    // STEP 5: Add accessories if any
    if (accessoryImages.length > 0) {
      const accessoryLabels = accessoryTypes.length > 0 ? accessoryTypes : accessoryImages.map(() => 'accessory')
      accessoryImages.slice(0, 4).forEach((image, idx) => {
        const cleanAccessory = image.replace(/^data:image\/[a-z]+;base64,/, '')
        if (cleanAccessory && cleanAccessory.length >= 100) {
          const label = accessoryLabels[idx] || `accessory_${idx + 1}`
          contents.push(`ACCESSORY - ${label}:`)
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

    // STEP 6: Final reminder - show person image THIRD time
    contents.push(`
---
FINAL REMINDER - This is the person who must appear in the output:`)
    contents.push({
      inlineData: {
        data: cleanPersonImage,
        mimeType: 'image/jpeg',
      },
    } as any)
    console.log('📸 Added person image (3rd time - final reminder)')

    contents.push(`
OUTPUT REQUIREMENTS:
✓ Face = THIS PERSON (shown 3 times above)
✓ Clothing = From the clothing reference
✓ Do NOT use any face from the clothing reference
✓ Photo-realistic quality
✓ Preserve skin texture, no beautification

Generate the edited photo now.`)

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
