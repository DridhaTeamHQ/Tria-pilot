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
    `GARMENT EXTRACTION: Create a flat-lay product photo of ONLY the clothing item.

EXTRACT AND PRESERVE:
- The EXACT garment type (dress, top, shirt, etc.)
- EXACT sleeve style: sleeveless, short sleeve, 3/4 sleeve, long sleeve
- EXACT neckline: V-neck, round, square, boat, halter, etc.
- EXACT length: crop, regular, midi, maxi
- EXACT color and pattern (prints, embroidery, buttons, details)

OUTPUT REQUIREMENTS:
- ONLY the garment - no person, no mannequin, no body parts
- Clean white or light grey background
- Garment shown flat or slightly styled as if on invisible hanger
- All design details clearly visible

CRITICAL: If the dress/top is SLEEVELESS, show it clearly as sleeveless with no sleeves attached.`,
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
