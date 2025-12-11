/**
 * Gemini Nano Image Analysis Module
 * Extracts structured JSON from images with zero deviation
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { getGeminiKey, getGeminiModelVersion } from '@/lib/config/api-keys'

/**
 * Exact JSON structure required from Gemini analysis
 */
export interface GeminiAnalysis {
  person: {
    gender_expression: string
    approx_age: string
    skin_tone: string
    face_shape: string
    eye_shape: string
    eyebrows: string
    nose_shape: string
    lips: string
    hair_length: string
    hair_texture: string
    hair_color: string
  }
  clothing: {
    upper_wear_type: string
    upper_wear_color: string
    upper_wear_pattern: string
    upper_wear_texture: string
    lower_wear_type: string | null
    lower_wear_color: string | null
    lower_wear_pattern: string | null
    footwear: string | null
  }
  body: {
    build: string
    height_range: string
    pose: string
  }
  accessories: string[] // Only if visible, empty if none
  background: {
    lighting: string
    environment: string
    colors: string
  }
}

/**
 * System prompt for Gemini - strict factual extraction
 */
const GEMINI_ANALYSIS_PROMPT = `Look at the input image and extract ONLY factual, visible details. No imagination. No guessing.

Return JSON with the exact structure specified. Rules:
- If something is not clearly visible, mark it as null.
- Never add extra details.
- Never modify appearance.
- Only describe what is visible.
- For accessories: only include if clearly visible in the image.
- For clothing: be precise about type (T-shirt stays T-shirt, kurta stays kurta).
- For hair: exact length, texture, color, placement - no modifications.
- For face: exact structure, no beautification or changes.
- For body: exact proportions and pose - no alterations.

Return ONLY valid JSON in this exact structure:
{
  "person": {
    "gender_expression": "",
    "approx_age": "",
    "skin_tone": "",
    "face_shape": "",
    "eye_shape": "",
    "eyebrows": "",
    "nose_shape": "",
    "lips": "",
    "hair_length": "",
    "hair_texture": "",
    "hair_color": ""
  },
  "clothing": {
    "upper_wear_type": "",
    "upper_wear_color": "",
    "upper_wear_pattern": "",
    "upper_wear_texture": "",
    "lower_wear_type": null,
    "lower_wear_color": null,
    "lower_wear_pattern": null,
    "footwear": null
  },
  "body": {
    "build": "",
    "height_range": "",
    "pose": ""
  },
  "accessories": [],
  "background": {
    "lighting": "",
    "environment": "",
    "colors": ""
  }
}`

/**
 * Analyze person image and extract structured identity/clothing/body data
 */
export async function analyzePersonImage(imageBase64: string): Promise<GeminiAnalysis> {
  try {
    const apiKey = getGeminiKey()
    const modelVersion = getGeminiModelVersion()
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: modelVersion,
      generationConfig: {
        responseMimeType: 'application/json',
      },
    })

    // Remove data URI prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')

    const result = await model.generateContent([
      {
        inlineData: {
          data: cleanBase64,
          mimeType: 'image/jpeg',
        },
      },
      GEMINI_ANALYSIS_PROMPT,
    ])

    const response = await result.response
    const text = response.text()

    // Parse JSON response
    let analysis: GeminiAnalysis
    try {
      // Remove markdown code blocks if present
      const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      analysis = JSON.parse(cleanedText)
    } catch (parseError) {
      console.error('Failed to parse Gemini analysis JSON:', parseError)
      console.error('Raw response:', text)
      throw new Error('Failed to parse analysis response from Gemini')
    }

    // Validate structure
    if (!analysis.person || !analysis.clothing || !analysis.body || !analysis.background) {
      throw new Error('Invalid analysis structure returned from Gemini')
    }

    // Ensure accessories is an array
    if (!Array.isArray(analysis.accessories)) {
      analysis.accessories = []
    }

    return analysis
  } catch (error) {
    console.error('Gemini person image analysis error:', error)
    throw error
  }
}

/**
 * Analyze clothing image and extract clothing details only
 */
export async function analyzeClothingImage(imageBase64: string): Promise<GeminiAnalysis['clothing']> {
  try {
    const apiKey = getGeminiKey()
    const modelVersion = getGeminiModelVersion()
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: modelVersion,
      generationConfig: {
        responseMimeType: 'application/json',
      },
    })

    // Remove data URI prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')

    const clothingPrompt = `Look at this clothing image and extract ONLY factual, visible details. No imagination. No guessing.

Return JSON with ONLY the clothing structure:
{
  "upper_wear_type": "",
  "upper_wear_color": "",
  "upper_wear_pattern": "",
  "upper_wear_texture": "",
  "lower_wear_type": null,
  "lower_wear_color": null,
  "lower_wear_pattern": null,
  "footwear": null
}

Rules:
- Be precise about type (T-shirt stays T-shirt, kurta stays kurta).
- If something is not visible, mark it as null.
- Never add extra details.
- Only describe what is visible.`

    const result = await model.generateContent([
      {
        inlineData: {
          data: cleanBase64,
          mimeType: 'image/jpeg',
        },
      },
      clothingPrompt,
    ])

    const response = await result.response
    const text = response.text()

    // Parse JSON response
    let clothing: GeminiAnalysis['clothing']
    try {
      // Remove markdown code blocks if present
      const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      clothing = JSON.parse(cleanedText)
    } catch (parseError) {
      console.error('Failed to parse Gemini clothing analysis JSON:', parseError)
      console.error('Raw response:', text)
      throw new Error('Failed to parse clothing analysis response from Gemini')
    }

    // Validate structure
    if (!clothing.upper_wear_type || !clothing.upper_wear_color) {
      throw new Error('Invalid clothing analysis structure returned from Gemini')
    }

    return clothing
  } catch (error) {
    console.error('Gemini clothing image analysis error:', error)
    throw error
  }
}

