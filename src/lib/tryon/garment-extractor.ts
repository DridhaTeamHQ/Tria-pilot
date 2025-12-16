import { GoogleGenAI, type ContentListUnion, type GenerateContentConfig } from '@google/genai'
import { getGeminiKey } from '@/lib/config/api-keys'

const getClient = () => new GoogleGenAI({ apiKey: getGeminiKey() })

function stripDataUrl(base64: string): string {
  return (base64 || '').replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '')
}

/**
 * Extract a garment-only image from a clothing reference that may include a person.
 * This reduces the "pasted reference model / cutout" failure mode.
 */
export async function extractGarmentOnlyImage(params: {
  clothingImageBase64: string
  model?: 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview'
}): Promise<string> {
  const { clothingImageBase64, model = 'gemini-2.5-flash-image' } = params
  const client = getClient()

  const clean = stripDataUrl(clothingImageBase64)
  if (!clean || clean.length < 100) throw new Error('Invalid clothing image')

  const contents: ContentListUnion = [
    `TASK: GARMENT EXTRACTION.
Create a clean garment-only image extracted from the reference.

RULES:
- Output MUST contain ONLY the clothing item (no person, no mannequin, no body parts).
- If the garment was worn by a person, remove the person entirely.
- Preserve exact garment design: shape, neckline, sleeves, length, texture, pattern, embroidery, buttons.
- Background: plain white or light grey studio background.
- No text, no watermark, no logos.`,
    {
      inlineData: {
        data: clean,
        mimeType: 'image/jpeg',
      },
    } as any,
  ]

  const config: GenerateContentConfig = {
    responseModalities: ['IMAGE'],
  }

  const resp = await client.models.generateContent({ model, contents, config })
  if (resp.data) return `data:image/png;base64,${resp.data}`

  if (resp.candidates?.length) {
    for (const part of resp.candidates[0]?.content?.parts || []) {
      if (part.inlineData?.mimeType?.startsWith('image/') && part.inlineData?.data) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
      }
    }
  }

  throw new Error('Garment extraction returned no image')
}


