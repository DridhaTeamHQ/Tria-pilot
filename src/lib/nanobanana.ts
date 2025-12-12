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
    // JSON STRUCTURED PROMPTING FOR BEST RESULTS
    // Clear separation of what to KEEP vs what to CHANGE
    // ═══════════════════════════════════════════════════════════════════════

    // STEP 1: Person image (the subject to edit)
    contents.push('Subject image:')
    contents.push({
      inlineData: {
        data: cleanPersonImage,
        mimeType: 'image/jpeg',
      },
    } as any)
    console.log('📸 Added person image')

    // STEP 2: Clothing reference - ALWAYS add if provided (regardless of editType)
    // This is critical for presets that have multiple editTypes
    if (clothingImage) {
      const cleanClothingImage = clothingImage.replace(/^data:image\/[a-z]+;base64,/, '')
      if (cleanClothingImage && cleanClothingImage.length >= 100) {
        contents.push('Clothing reference (apply this garment to the subject):')
        contents.push({
          inlineData: {
            data: cleanClothingImage,
            mimeType: 'image/jpeg',
          },
        } as any)
        console.log('👕 Added garment reference image')
      }
    }

    // STEP 3: Background reference image - add if provided
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

    // STEP 4: JSON structured edit instruction
    // Determine what changes to make based on available inputs
    const hasSceneChange = !!sceneDescription
    const hasClothingChange = !!clothingImage
    const hasLightingChange = !!lightingDescription
    
    // Build change object dynamically
    const changes: Record<string, any> = {}
    
    if (hasClothingChange) {
      changes.clothing = {
        action: "Replace with garment from clothing reference image",
        fit: "Natural draping and realistic fabric shadows"
      }
    }
    
    if (hasSceneChange) {
      changes.background = {
        action: "Change background/environment",
        target: sceneDescription
      }
    }
    
    if (hasLightingChange) {
      changes.lighting = {
        action: "Adjust lighting",
        target: lightingDescription
      }
    }
    
    // Determine primary action description
    let primaryAction = "Virtual try-on edit"
    if (hasClothingChange && hasSceneChange) {
      primaryAction = "Replace clothing AND change background/scene"
    } else if (hasClothingChange) {
      primaryAction = "Replace clothing only"
    } else if (hasSceneChange) {
      primaryAction = "Change background/scene"
    }

    const jsonPrompt = {
      task: "image_edit",
      mode: "virtual_try_on",
      primary_action: primaryAction,
      preserve: {
        face: "MUST keep exact same face from subject image - this is NON-NEGOTIABLE",
        identity: "Same person, same facial features, same skin tone, same expression",
        hair: "Same hair color, style, and texture",
        body: "Same body proportions",
        skin_quality: "Preserve natural skin texture, pores, imperfections - no smoothing"
      },
      change: changes,
      ignore: {
        clothing_reference_face: "If clothing reference shows a person/model, completely IGNORE their face - use ONLY the garment"
      },
      quality: {
        output: "Photo-realistic edit, not AI generation",
        skin: "Maintain realistic skin texture with natural pores",
        lighting: hasLightingChange ? lightingDescription : "Match scene naturally",
        coherence: "All elements must look naturally composited"
      },
      additional_context: prompt
    }
    
    // Build clear, direct execution summary
    const actions: string[] = []
    if (hasClothingChange) {
      actions.push("DRESS the subject in the garment from the clothing reference")
    }
    if (hasSceneChange) {
      actions.push(`PLACE the subject in: ${sceneDescription}`)
    }
    if (hasLightingChange) {
      actions.push(`APPLY lighting: ${lightingDescription}`)
    }
    
    // Critical reminder
    const executionSummary = `
## EXECUTE THIS EDIT:
${actions.map((a, i) => `${i + 1}. ${a}`).join('\n')}

## CRITICAL RULES:
- The output MUST show the SAME PERSON from the subject image
- The output MUST show them WEARING the clothing from the clothing reference
- The face MUST be IDENTICAL to the subject image - no new face generation
- If the clothing reference shows a different person, IGNORE their face completely
${hasSceneChange ? `- The background MUST be: ${sceneDescription}` : ''}
${hasLightingChange ? `- The lighting MUST be: ${lightingDescription}` : ''}

Generate ONE edited image showing the subject wearing the new clothing.`

    contents.push(`
${JSON.stringify(jsonPrompt, null, 2)}

${executionSummary}`)

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
