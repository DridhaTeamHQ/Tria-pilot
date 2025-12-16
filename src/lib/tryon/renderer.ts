import { GoogleGenAI, type ContentListUnion, type GenerateContentConfig, type ImageConfig } from '@google/genai'
import { getGeminiKey } from '@/lib/config/api-keys'
import type { BackgroundFocusMode, InstagramStylePack, ShootPlanV3, TryOnQualityOptions } from './types'

const getClient = () => new GoogleGenAI({ apiKey: getGeminiKey() })

function stripDataUrl(base64: string): string {
  return (base64 || '').replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '')
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
  const aspectRatio = opts.aspectRatio || '4:5'
  const resolution = opts.resolution || '2K'

  const cleanSubject = stripDataUrl(subjectImageBase64)
  const cleanGarment = stripDataUrl(garmentImageBase64)
  if (!cleanSubject || cleanSubject.length < 100) throw new Error('Invalid subject image')
  if (!cleanGarment || cleanGarment.length < 100) throw new Error('Invalid garment image')

  const styleBlock = (() => {
    switch (stylePack) {
      case 'candid_iphone':
        return [
          'STYLE PACK: Candid iPhone / Instagram post',
          '- handheld feel, slight tilt ok, mild SmartHDR look',
          '- subtle JPEG compression artifacts, realistic sensor noise',
          '- natural imperfect bokeh (not perfect circles), avoid CGI cleanliness',
        ].join('\n')
      case 'editorial_ig':
        return [
          'STYLE PACK: Editorial IG (premium but real)',
          '- 50–85mm lens look, controlled highlights, clean grade',
          '- still realistic texture (pores visible), no plastic skin',
          '- avoid CGI-perfect background; keep real-world imperfections subtle',
        ].join('\n')
      case 'flash_party':
        return [
          'STYLE PACK: Flash party / digicam vibe',
          '- harsh on-camera flash, deeper shadows, visible noise in dark areas',
          '- slightly crooked framing and imperfect crop is OK',
          '- keep it photoreal; no AI glow, no haloing',
        ].join('\n')
      case 'travel_journal':
        return [
          'STYLE PACK: Travel journal',
          '- warm natural light, light haze, subtle lens flare when appropriate',
          '- slightly imperfect handheld framing, realistic atmosphere',
          '- keep subject crisp; any motion blur should be minimal and mostly in background',
        ].join('\n')
      case 'surveillance_doc':
        return [
          'STYLE PACK: Documentary / surveillance',
          '- higher angle / wider framing, flatter contrast, muted palette',
          '- slight motion blur on extremities is acceptable',
          '- gritty realism, no beauty retouching, no CGI look',
        ].join('\n')
      default:
        return 'STYLE PACK: Instagram photorealistic post — real camera imperfections, no CGI.'
    }
  })()

  const focusBlock =
    backgroundFocus === 'sharper_bg'
      ? 'BACKGROUND FOCUS: keep background sharper with more environmental detail (less blur).'
      : 'BACKGROUND FOCUS: moderate bokeh is ok, but must be realistic (not overly perfect blur).'

  const roleText = [
    'ROLE: You are an expert Fashion Editor. Generate a professional composite image.',
    'IMPORTANT: This is an EDIT of image 1 (the subject). Do not create a new person.',
    'Output must contain exactly ONE subject: the subject from image 1.',
    'Do NOT paste/insert the reference image (no collage, no overlay, no cutout person).',
    'Replace ONLY the clothing worn by the subject in image 1 using the garment reference.',
    'IDENTITY LOCK (EXACT): Keep identity/face/hair/skin tone/body proportions/pose/expression/gaze unchanged.',
    'FACE RULES (EXACT): Do not edit facial features, facial proportions, makeup shape, or skin texture. No beautification. No face retouching.',
    'LIGHTING RULE (EXACT): Keep the subject lighting consistent with image 1. Prefer adapting the background grade/time-of-day to match the subject. Do NOT rebuild/re-render the face to match new lighting.',
    'COLOR RULE (EXACT): Do NOT change the subject’s FACE/SKIN exposure, white balance, or skin tone compared to image 1. Do NOT brighten/whiten/desaturate the face. Clothing colors WILL change to match the garment reference (that is intended). Apply any global color grading primarily to the BACKGROUND, not the face/skin.',
    extraStrict
      ? 'FACE CONSISTENCY (EXACT): Preserve the subject’s facial structure precisely (eyes, nose bridge, lips, jawline). Do NOT re-render a new face to match the new lighting; adjust lighting globally while keeping facial geometry unchanged.'
      : '',
    'SKIN TEXTURE: preserve pores and micro-texture, no smoothing, no plastic skin, no haloing, no HDR glow.',
    'REALISM OVERRIDE: Make the final image look like a real camera photo, not an AI render. Avoid neon/cyberpunk color grading, wet reflective streets, heavy glow/bloom, unreal perfect bokeh, plastic skin, and "studio-perfect" lighting unless explicitly requested.',
    styleBlock,
    focusBlock,
    extraStrict
      ? 'EXTRA STRICT: If face drifts even slightly OR any extra person appears OR the reference gets pasted, regenerate internally and output only the corrected single-subject edit.'
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  const identityText =
    'REFERENCE IDENTITY (EXACT): This is the subject. Maintain strict fidelity to this identity and pose. Do not alter face, hair, skin tone, expression, or body.'

  const apparelText = [
    'REFERENCE APPAREL: This image is the garment reference. Copy it EXACTLY.',
    'The garment image must NOT appear in the output. Do NOT include its person/mannequin.',
    'Extract ONLY the garment and dress the subject in image 1 with it.',
    'Clothing replacement is REQUIRED: remove the subject’s original outfit and replace with the reference garment.',
    'PRIORITY: If there is any conflict between background styling and clothing replacement, ALWAYS prioritize clothing replacement. If necessary, keep the original background and only replace the outfit.',
    extraStrict
      ? 'FAIL CONDITION: If the subject is still wearing the original outfit from image 1, the result is WRONG. Regenerate internally until the garment is applied.'
      : '',
    'EXACT GARMENT RULES (no redesign): keep the exact neckline, armholes/sleeves, button/placket details, embroidery/print motifs, motif spacing, and fabric texture.',
    'No color shifting: match the exact shade/hue and contrast from the reference garment. Do not invent new patterns.',
    'Ensure realistic fit, drape, folds, occlusion, and shadows consistent with the scene.',
    'NEGATIVE: extra people, duplicate subject, collage, overlay, pasted reference, cutout, mannequin, text, logo, watermark, deformed hands, plastic skin, halos.',
  ]
    .filter(Boolean)
    .join('\n')

  const sceneText = extraStrict
    ? // if extraStrict, we downplay scene change to avoid confusing edits
      `SCENE INSTRUCTION: Keep background natural and realistic. ${shootPlan.prompt_text}
SCENE COHERENCE (NON-NEGOTIABLE):
- The scene must be physically plausible for the pose. No tables/chairs in the middle of roads, no floating furniture, no impossible placements.
- If the setting is a street, keep the subject on a sidewalk / cafe terrace / curbside seating area — never on the roadway.
- Preserve and contextualize any foreground structure the subject is interacting with (wall/pillar/rock). If a wall/pillar remains, it must belong in the new scene (sidewalk stone wall/building column), never floating or in traffic.
PHOTO REALISM:
- Background must look like a real photo (not CGI). Add subtle sensor noise/film grain and tiny lens imperfections.
- Avoid overly-perfect symmetry, overly-clean surfaces, and unrealistic bokeh.`
    : `SCENE INSTRUCTION: ${shootPlan.prompt_text}
SCENE COHERENCE (NON-NEGOTIABLE):
- The scene must be physically plausible for the pose. No tables/chairs in the middle of roads, no floating furniture, no impossible placements.
- If the setting is a street, keep the subject on a sidewalk / cafe terrace / curbside seating area — never on the roadway.
- Preserve and contextualize any foreground structure the subject is interacting with (wall/pillar/rock). If a wall/pillar remains, it must belong in the new scene (sidewalk stone wall/building column), never floating or in traffic.
PHOTO REALISM:
- Background must look like a real photo (not CGI). Add subtle sensor noise/film grain and tiny lens imperfections.
- Keep lighting direction/shadows consistent across subject and background. Avoid HDR glow or perfect studio-clean look.`

  const additionalIdentity: ContentListUnion = []
  if (identityImagesBase64.length > 0) {
    additionalIdentity.push(
      'ADDITIONAL IDENTITY REFERENCES: The next images show the SAME subject. Use them ONLY to preserve the exact same face/identity. Do not copy clothing from these.'
    )
    for (const img of identityImagesBase64.slice(0, 3)) {
      const clean = stripDataUrl(img)
      if (clean && clean.length >= 100) {
        additionalIdentity.push({
          inlineData: { data: clean, mimeType: 'image/jpeg' },
        } as any)
      }
    }
  }

  const contents: ContentListUnion = [
    roleText,
    {
      inlineData: {
        data: cleanSubject,
        mimeType: 'image/jpeg',
      },
    } as any,
    ...additionalIdentity,
    identityText,
    {
      inlineData: {
        data: cleanGarment,
        mimeType: 'image/jpeg',
      },
    } as any,
    apparelText,
    ...(garmentBackupImageBase64
      ? ([
          'BACKUP GARMENT REFERENCE (for fidelity only): This may include a person—IGNORE THE PERSON COMPLETELY. Do NOT paste this image. Use it ONLY to confirm exact garment details (pattern/neckline/buttons).',
          {
            inlineData: {
              data: stripDataUrl(garmentBackupImageBase64),
              mimeType: 'image/jpeg',
            },
          } as any,
        ] as any)
      : []),
    sceneText,
  ]

  const imageConfig: ImageConfig = {
    aspectRatio,
    personGeneration: 'allow_adult',
  } as any
  if (model === 'gemini-3-pro-image-preview' && resolution) {
    ;(imageConfig as any).imageSize = resolution as any
  }

  const config: GenerateContentConfig = {
    responseModalities: ['IMAGE'],
    imageConfig,
    // Lower temp reduces identity drift/hallucination.
    temperature: model === 'gemini-3-pro-image-preview' ? 0.15 : 0.25,
  }

  let lastErr: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await client.models.generateContent({ model, contents, config })
      if (resp.data) return `data:image/png;base64,${resp.data}`

      if (resp.candidates?.length) {
        for (const part of resp.candidates[0]?.content?.parts || []) {
          if (part.inlineData?.mimeType?.startsWith('image/') && part.inlineData?.data) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
          }
        }
      }

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


