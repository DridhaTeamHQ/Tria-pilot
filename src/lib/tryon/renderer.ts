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
 * Get camera/lens description based on style pack.
 * Uses real camera terminology for better results.
 */
function getCameraStyle(stylePack?: InstagramStylePack): string {
  switch (stylePack) {
    case 'candid_iphone':
      return `shot on iPhone 14 Pro, natural handheld feel, computational photography, slight noise in shadows, authentic mobile camera look`
    case 'editorial_ig':
      return `shot on Canon 5D Mark IV with 85mm f/1.4 lens, professional portrait lighting, shallow depth of field, magazine quality`
    case 'flash_party':
      return `shot on point-and-shoot digicam with on-camera flash, harsh direct lighting, deep shadows, party photo aesthetic`
    case 'travel_journal':
      return `shot on Fujifilm X100V, 35mm equivalent, warm film simulation, travel photography aesthetic, natural colors`
    case 'surveillance_doc':
      return `shot on wide-angle security camera, high angle, documentary aesthetic, gritty realism, available light only`
    default:
      return `shot on professional camera, natural lighting, realistic photography`
  }
}

/**
 * Get garment-specific instructions for the renderer.
 */
function getGarmentPromptSection(garmentAnalysis?: GarmentAnalysis): string {
  if (!garmentAnalysis) {
    return `GARMENT: Copy the exact outfit from the reference image.
- Match the exact color, pattern, and design
- Natural fit and draping on the body
- Remove the original outfit completely`
  }

  const lines: string[] = ['GARMENT APPLICATION:']
  
  // Critical: Sleeve handling
  if (garmentAnalysis.sleeve_type === 'sleeveless' || garmentAnalysis.sleeve_type === 'spaghetti_strap') {
    lines.push(`⚠️ THIS IS A SLEEVELESS GARMENT`)
    lines.push(`- REMOVE all sleeves from the original outfit`)
    lines.push(`- Show the subject's BARE ARMS and SHOULDERS`)
    lines.push(`- The garment should have NO sleeves at all`)
  } else if (garmentAnalysis.sleeve_type === 'short_sleeve' || garmentAnalysis.sleeve_type === 'cap_sleeve') {
    lines.push(`- Short sleeves: show upper arms bare, sleeves end above elbow`)
  } else if (garmentAnalysis.sleeve_type === 'long_sleeve') {
    lines.push(`- Long sleeves: cover arms to wrists`)
  }
  
  // Neckline
  if (garmentAnalysis.neckline === 'v_neck') {
    lines.push(`- V-neckline: show appropriate neckline depth`)
  } else if (garmentAnalysis.neckline === 'off_shoulder') {
    lines.push(`- Off-shoulder: show bare shoulders, garment sits below shoulder line`)
  } else if (garmentAnalysis.neckline === 'halter') {
    lines.push(`- Halter: exposed shoulders with strap around neck`)
  }
  
  // Color and pattern
  lines.push(`- Primary color: ${garmentAnalysis.primary_color}`)
  if (garmentAnalysis.has_pattern && garmentAnalysis.pattern_description) {
    lines.push(`- Pattern: ${garmentAnalysis.pattern_description} (must be exact)`)
  }
  
  // Details
  if (garmentAnalysis.notable_details && garmentAnalysis.notable_details.length > 0) {
    lines.push(`- Preserve details: ${garmentAnalysis.notable_details.join(', ')}`)
  }

  return lines.join('\n')
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
    stylePack,
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

  // Camera style based on preset
  const cameraStyle = getCameraStyle(stylePack)
  
  // Garment-specific instructions
  const garmentSection = getGarmentPromptSection(garmentAnalysis)

  // Build the prompt using a clear, structured approach
  const prompt = `VIRTUAL TRY-ON: Edit the person in Image 1 to wear the garment from Image 2.

═══════════════════════════════════════════════════════════════════
STEP 1: IDENTITY LOCK (CRITICAL)
═══════════════════════════════════════════════════════════════════
The output must show the EXACT SAME PERSON from Image 1.
- Copy the face EXACTLY: same eyes, nose, lips, jawline, skin tone
- Same expression, same gaze direction
- Same pose: head angle, body position, arm placement
- Do NOT beautify, smooth, or change any facial features
- Do NOT change skin color or texture
${extraStrict ? `\n⚠️ STRICT MODE: Previous attempt changed the face. This is UNACCEPTABLE.
The face must be a pixel-perfect copy from Image 1. Any drift = failure.` : ''}

═══════════════════════════════════════════════════════════════════
STEP 2: REMOVE ORIGINAL CLOTHING
═══════════════════════════════════════════════════════════════════
COMPLETELY remove the person's current outfit from Image 1.
- The original clothing must be 100% gone
- No layering - the new garment is the ONLY garment
- If the new garment is sleeveless, show bare skin where appropriate

═══════════════════════════════════════════════════════════════════
STEP 3: APPLY NEW GARMENT
═══════════════════════════════════════════════════════════════════
${garmentSection}

═══════════════════════════════════════════════════════════════════
STEP 4: PHOTOGRAPHY (Make it look REAL)
═══════════════════════════════════════════════════════════════════
Camera: ${cameraStyle}
Scene: ${shootPlan.scene_text || 'Natural setting with realistic lighting'}

Make it look like a REAL PHOTO, not AI:
- Add subtle film grain or sensor noise
- Natural bokeh (imperfect, not perfect circles)
- Realistic shadows and highlights
- Visible skin texture (pores, not smooth plastic)
- No HDR glow, no bloom, no oversaturation

═══════════════════════════════════════════════════════════════════
OUTPUT REQUIREMENTS
═══════════════════════════════════════════════════════════════════
- Exactly ONE person (from Image 1)
- Wearing the garment from Image 2
- Same identity, same pose, same expression
- Photo-realistic quality

NEGATIVE: Do not include extra people, collage effects, cutouts, text, watermarks, plastic skin, or AI artifacts.`

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
    prompt,
    'Image 1 - THE PERSON (keep this exact face, pose, and identity):',
    {
      inlineData: { data: cleanSubject, mimeType: 'image/jpeg' },
    } as any,
    ...additionalIdentity,
    'Image 2 - THE GARMENT (dress the person in this outfit):',
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
