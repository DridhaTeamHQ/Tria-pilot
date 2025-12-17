import { GoogleGenAI, type ContentListUnion, type GenerateContentConfig, type ImageConfig } from '@google/genai'
import { getGeminiKey } from '@/lib/config/api-keys'
import type { BackgroundFocusMode, InstagramStylePack, ShootPlanV3, TryOnQualityOptions } from './types'
import type { GarmentAnalysis } from './garment-analyzer'

const getClient = () => new GoogleGenAI({ apiKey: getGeminiKey() })

function stripDataUrl(base64: string): string {
  return (base64 || '').replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '')
}

function normalizeAspectRatio(ratio: string | undefined): string {
  const raw = String(ratio || '').trim()
  if (!raw) return '3:4'
  const allowed = new Set(['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'])
  if (allowed.has(raw)) return raw
  if (raw === '4:5') return '3:4'
  if (raw === '5:4') return '4:3'
  return '3:4'
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableGeminiError(err: unknown): boolean {
  const msg = String((err as any)?.message ?? err ?? '')
  return (
    msg.includes('fetch failed') ||
    msg.includes('sending request') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('ENOTFOUND') ||
    msg.includes('socket hang up')
  )
}

/**
 * Build garment-specific instructions based on analysis.
 */
function getGarmentInstructions(garmentAnalysis?: GarmentAnalysis): string {
  if (!garmentAnalysis) {
    return ''
  }

  const lines: string[] = []
  
  // Sleeve type is critical
  if (garmentAnalysis.sleeve_type === 'sleeveless' || garmentAnalysis.sleeve_type === 'spaghetti_strap') {
    lines.push(`The garment is SLEEVELESS - show bare arms and shoulders.`)
  } else if (garmentAnalysis.sleeve_type === 'short_sleeve' || garmentAnalysis.sleeve_type === 'cap_sleeve') {
    lines.push(`Short sleeves - show upper arms.`)
  }
  
  // Neckline
  if (garmentAnalysis.neckline === 'v_neck') {
    lines.push(`V-neckline.`)
  } else if (garmentAnalysis.neckline === 'off_shoulder') {
    lines.push(`Off-shoulder - show bare shoulders.`)
  }
  
  // Color
  if (garmentAnalysis.primary_color && garmentAnalysis.primary_color !== 'unknown') {
    lines.push(`Color: ${garmentAnalysis.primary_color}.`)
  }
  
  // Pattern
  if (garmentAnalysis.has_pattern && garmentAnalysis.pattern_description) {
    lines.push(`Pattern: ${garmentAnalysis.pattern_description}.`)
  }

  return lines.length > 0 ? `\nGarment details: ${lines.join(' ')}` : ''
}

export async function renderTryOnV3(params: {
  subjectImageBase64: string
  garmentImageBase64: string
  garmentBackupImageBase64?: string
  identityImagesBase64?: string[]
  stylePack?: InstagramStylePack
  backgroundFocus?: BackgroundFocusMode
  shootPlan: ShootPlanV3
  opts: TryOnQualityOptions
  extraStrict?: boolean
  garmentAnalysis?: GarmentAnalysis
}): Promise<string> {
  const {
    subjectImageBase64,
    garmentImageBase64,
    garmentBackupImageBase64,
    identityImagesBase64 = [],
    shootPlan,
    opts,
    extraStrict,
    garmentAnalysis,
  } = params
  const client = getClient()

  const model = opts.quality === 'high' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image'
  const aspectRatio = normalizeAspectRatio(opts.aspectRatio || '4:5')

  const cleanSubject = stripDataUrl(subjectImageBase64)
  const cleanGarment = stripDataUrl(garmentImageBase64)
  if (!cleanSubject || cleanSubject.length < 100) throw new Error('Invalid subject image')
  if (!cleanGarment || cleanGarment.length < 100) throw new Error('Invalid garment image')

  // Build garment-specific notes
  const garmentNotes = getGarmentInstructions(garmentAnalysis)

  // Scene instruction
  const sceneText = shootPlan.scene_text || 'natural setting'

  // SIMPLE, DIRECT PROMPT - this works better than complex instructions
  const prompt = `Edit the person in Image 1 to wear the outfit from Image 2.

RULES:
1. Keep the EXACT same face - do not change any facial features
2. Keep the EXACT same pose - do not change body position
3. Keep the same skin tone and expression
4. REMOVE the original clothing completely
5. Add the new garment from Image 2${garmentNotes}

Background: ${sceneText}

Output: Same person, same pose, wearing the new outfit. Make it look like a real photo.${extraStrict ? '\n\nIMPORTANT: The face MUST be identical to Image 1. Any change to the face is unacceptable.' : ''}`

  // Build content array
  const additionalIdentity: ContentListUnion = []
  if (identityImagesBase64.length > 0) {
    additionalIdentity.push('Reference photos of the same person:')
    for (const img of identityImagesBase64.slice(0, 2)) {
      const clean = stripDataUrl(img)
      if (clean && clean.length >= 100) {
        additionalIdentity.push({
          inlineData: { data: clean, mimeType: 'image/jpeg' },
        } as any)
      }
    }
  }

  const contents: ContentListUnion = [
    prompt,
    'Image 1 - The person (keep this exact face and pose):',
    {
      inlineData: { data: cleanSubject, mimeType: 'image/jpeg' },
    } as any,
    ...additionalIdentity,
    'Image 2 - The outfit to wear:',
    {
      inlineData: { data: cleanGarment, mimeType: 'image/jpeg' },
    } as any,
    ...(garmentBackupImageBase64
      ? [
          'Garment detail (for color/pattern reference):',
          {
            inlineData: { data: stripDataUrl(garmentBackupImageBase64), mimeType: 'image/jpeg' },
          } as any,
        ]
      : []),
  ]

  const imageConfig: ImageConfig = { aspectRatio } as any

  if (model === 'gemini-3-pro-image-preview') {
    ;(imageConfig as any).imageSize = opts.resolution || '2K'
  }

  const config: GenerateContentConfig = {
    responseModalities: ['IMAGE'],
    imageConfig,
    temperature: 0.1,
  }

  let lastErr: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await client.models.generateContent({ model, contents, config })
      
      // Extract image from response parts
      if (resp.candidates?.length) {
        for (const part of resp.candidates[0]?.content?.parts || []) {
          if (part.inlineData?.mimeType?.startsWith('image/') && part.inlineData?.data) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
          }
        }
      }

      if ((resp as any).data) return `data:image/png;base64,${(resp as any).data}`

      throw new Error('Renderer returned no image')
    } catch (err) {
      lastErr = err
      if (attempt < 2 && isRetryableGeminiError(err)) {
        await sleep(600 * Math.pow(2, attempt))
        continue
      }
      throw err
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error('Renderer failed after retries')
}
