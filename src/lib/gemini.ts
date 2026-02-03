import { GoogleGenerativeAI } from '@google/generative-ai'
import { getGeminiKey } from '@/lib/config/api-keys'

const getGenAI = () => {
  const apiKey = getGeminiKey()
  return new GoogleGenerativeAI(apiKey)
}

// Helper to parse base64 data URL and extract raw data + mime type
function parseBase64Image(dataUrl: string): { data: string; mimeType: string } {
  // Check if it's a data URL format
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (match) {
    return {
      mimeType: match[1],
      data: match[2],
    }
  }
  // Assume it's raw base64 jpeg if no prefix
  return {
    mimeType: 'image/jpeg',
    data: dataUrl,
  }
}

export async function generateWithGemini(
  personImage: string,
  clothingImage: string,
  prompt: string
): Promise<string> {
  try {
    const genAI = getGenAI()
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const person = parseBase64Image(personImage)
    const clothing = parseBase64Image(clothingImage)

    const result = await model.generateContent([
      {
        inlineData: {
          data: person.data,
          mimeType: person.mimeType,
        },
      },
      {
        inlineData: {
          data: clothing.data,
          mimeType: clothing.mimeType,
        },
      },
      prompt,
    ])

    const response = await result.response
    // Note: Gemini may return text, not images directly
    // For image generation, you might need a different approach
    return response.text()
  } catch (error) {
    console.error('Gemini generation error:', error)
    throw error
  }
}

/**
 * Generate an ad image using Gemini's native image generation.
 * Uses gemini-2.0-flash-exp with responseModalities for image output.
 * Returns a base64 encoded image string.
 */
export async function generateIntelligentAdComposition(
  productImage?: string,
  influencerImage?: string,
  compositionPrompt?: string
): Promise<string> {
  try {
    const genAI = getGenAI()

    // Use the image generation model
    // gemini-2.0-flash-exp supports native image generation
    const modelName = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.0-flash-exp'

    console.log(`[Gemini] Using model: ${modelName} for image generation`)

    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        // @ts-ignore - responseModalities is valid for image models
        responseModalities: ['image', 'text'],
      },
    })

    const parts: any[] = []

    // Add reference images if provided
    if (productImage) {
      const parsed = parseBase64Image(productImage)
      parts.push({
        inlineData: {
          data: parsed.data,
          mimeType: parsed.mimeType,
        },
      })
    }

    if (influencerImage) {
      const parsed = parseBase64Image(influencerImage)
      parts.push({
        inlineData: {
          data: parsed.data,
          mimeType: parsed.mimeType,
        },
      })
    }

    // Add the prompt
    parts.push(
      compositionPrompt ||
      'Generate a professional advertising image that integrates the product naturally. Use professional studio lighting, clean composition, and brand-appropriate aesthetics. Output a high-quality photorealistic ad image.'
    )

    console.log('[Gemini] Generating ad image...')
    const result = await model.generateContent(parts)
    const response = result.response

    // Check for image parts in the response
    const candidates = response.candidates
    if (!candidates || candidates.length === 0) {
      throw new Error('No response candidates from Gemini')
    }

    const content = candidates[0].content
    if (!content || !content.parts) {
      throw new Error('No content parts in Gemini response')
    }

    // Look for inline image data in the response
    for (const part of content.parts) {
      if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
        const base64Image = part.inlineData.data
        const mimeType = part.inlineData.mimeType
        console.log(`[Gemini] Generated image: ${mimeType}, ${base64Image.length} chars`)
        // Return as data URL
        return `data:${mimeType};base64,${base64Image}`
      }
    }

    // If no image found, check for text (might be an error or description)
    for (const part of content.parts) {
      if (part.text) {
        console.warn('[Gemini] Received text instead of image:', part.text.substring(0, 200))
      }
    }

    throw new Error('Gemini did not return an image in the response')
  } catch (error) {
    console.error('Gemini ad composition error:', error)
    throw error
  }
}
