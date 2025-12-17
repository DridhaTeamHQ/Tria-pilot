import { GoogleGenAI, type ContentListUnion, type GenerateContentConfig, type ImageConfig } from '@google/genai'
import { getGeminiKey } from '@/lib/config/api-keys'
import type { BackgroundFocusMode, InstagramStylePack, ShootPlanV3, TryOnQualityOptions } from './types'

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
}): Promise<string> {
  const {
    subjectImageBase64,
    garmentImageBase64,
    garmentBackupImageBase64,
    identityImagesBase64 = [],
    stylePack,
    backgroundFocus,
    shootPlan,
    opts,
    extraStrict,
  } = params
  const client = getClient()

  const model = opts.quality === 'high' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image'
  const aspectRatio = normalizeAspectRatio(opts.aspectRatio || '4:5')

  const cleanSubject = stripDataUrl(subjectImageBase64)
  const cleanGarment = stripDataUrl(garmentImageBase64)
  if (!cleanSubject || cleanSubject.length < 100) throw new Error('Invalid subject image')
  if (!cleanGarment || cleanGarment.length < 100) throw new Error('Invalid garment image')

  // ═══════════════════════════════════════════════════════════════════════════════
  // SIMPLIFIED PROMPT STRATEGY
  // Key insight: Less instruction = better results. Be direct and simple.
  // ═══════════════════════════════════════════════════════════════════════════════

  // Core instruction - SIMPLE and DIRECT
  const coreInstruction = `VIRTUAL TRY-ON: Replace the clothing on the person in Image 1 with the garment from Image 2.

STEP 1 - REMOVE OLD CLOTHING:
- COMPLETELY REMOVE the person's current outfit from Image 1
- The original dress/shirt/top must be GONE - not visible at all
- If Image 2 is sleeveless, show the person's bare arms/shoulders

STEP 2 - ADD NEW GARMENT:
- Dress the person in the garment from Image 2
- Match the EXACT design: neckline, sleeves (or sleeveless), length, pattern, color
- The garment should fit naturally on their body with realistic folds

STEP 3 - PRESERVE IDENTITY:
- DO NOT change the face - copy it exactly from Image 1
- Same skin tone, same expression, same pose
- No beautification or smoothing

OUTPUT: Same person from Image 1, wearing ONLY the garment from Image 2.`

  // Scene/background instruction (simplified)
  const sceneInstruction = shootPlan.scene_text 
    ? `Background: ${shootPlan.scene_text}`
    : 'Keep the original background or make it look natural and realistic.'

  // Realism instruction (simplified but essential)
  const realismInstruction = `Make it look like a real photo, not AI-generated:
- Add subtle film grain/sensor noise
- Natural lighting with soft shadows
- Imperfect bokeh (not perfect circles)
- Real skin texture (pores visible)
- No plastic/waxy look
- No HDR glow or bloom
- No over-saturated colors`

  // Style hint based on pack
  const styleHint = (() => {
    switch (stylePack) {
      case 'candid_iphone':
        return 'Style: Candid iPhone photo - handheld, natural, slight grain.'
      case 'editorial_ig':
        return 'Style: Editorial Instagram - clean but real, visible skin texture.'
      case 'flash_party':
        return 'Style: Flash photo - harsh flash, visible noise in shadows.'
      case 'travel_journal':
        return 'Style: Travel snap - warm natural light, atmospheric.'
      case 'surveillance_doc':
        return 'Style: Documentary - gritty, flat contrast, no retouching.'
      default:
        return 'Style: Natural photo with real camera imperfections.'
    }
  })()

  // Extra strict mode adds emphatic face lock
  const faceEmphasis = extraStrict
    ? `

⚠️ FACE LOCK WARNING: The previous attempt changed the face. This is UNACCEPTABLE.
The face in the output MUST be an EXACT COPY from Image 1.
- Same eyes (shape, size, spacing)
- Same nose (bridge, nostrils)  
- Same lips (shape, thickness)
- Same jawline and chin
- Same skin tone and texture
- Same expression
DO NOT generate a new face. COPY the existing face.`
    : ''

  // Garment emphasis
  const garmentEmphasis = `

GARMENT DETAILS FROM IMAGE 2:
- If sleeveless → show bare arms/shoulders (NO sleeves from original outfit)
- If short sleeves → show short sleeves only
- If long sleeves → show full sleeves
- Copy exact neckline shape (V-neck, round, square, etc.)
- Copy exact color, pattern, and texture
- The original outfit must be 100% gone - no layering allowed`

  // Build the final prompt (simpler structure)
  const finalPrompt = `${coreInstruction}
${faceEmphasis}
${garmentEmphasis}

${sceneInstruction}

${realismInstruction}

${styleHint}

NEGATIVE: Do not include extra people, collage effects, pasted cutouts, text, watermarks, or AI artifacts.`

  // Build content array
  const additionalIdentity: ContentListUnion = []
  if (identityImagesBase64.length > 0) {
    additionalIdentity.push(
      'Additional reference photos of the SAME person (use to maintain identity):'
    )
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
    finalPrompt,
    'Image 1 - THE PERSON (keep this exact face and pose):',
    {
      inlineData: { data: cleanSubject, mimeType: 'image/jpeg' },
    } as any,
    ...additionalIdentity,
    'Image 2 - THE OUTFIT (dress the person in this garment):',
    {
      inlineData: { data: cleanGarment, mimeType: 'image/jpeg' },
    } as any,
    ...(garmentBackupImageBase64
      ? [
          'Garment detail reference (for pattern/color accuracy only):',
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
    // Very low temperature for consistency
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
