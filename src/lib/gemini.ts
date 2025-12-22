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

export async function generateIntelligentAdComposition(
  productImage?: string,
  influencerImage?: string,
  compositionPrompt?: string
): Promise<string> {
  try {
    const genAI = getGenAI()
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })

    const parts: any[] = []

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

    parts.push(
      compositionPrompt ||
      'Generate an intelligent ad composition that integrates the product naturally with the influencer. Focus on professional lighting, balanced composition, and brand consistency.'
    )

    const result = await model.generateContent(parts)
    const response = await result.response

    // Note: This returns text. For actual image generation, you may need Imagen API
    return response.text()
  } catch (error) {
    console.error('Gemini ad composition error:', error)
    throw error
  }
}

