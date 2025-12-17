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

// ═══════════════════════════════════════════════════════════════════════════════
// PHOTOGRAPHY REALISM RULES (based on professional photography research)
// ═══════════════════════════════════════════════════════════════════════════════

const IDENTITY_LOCK_RULES = `
═══════════════════════════════════════════════════════════════════
IDENTITY LOCK (ABSOLUTE - NO EXCEPTIONS)
═══════════════════════════════════════════════════════════════════
You are EDITING image 1, not generating a new person. The subject in the output MUST be the EXACT SAME PERSON as in image 1.

FACE GEOMETRY (EXACT MATCH REQUIRED):
- Eye shape, size, spacing, and corner positions: UNCHANGED
- Nose bridge width, nostril shape, nose length: UNCHANGED  
- Lip shape, thickness, cupid's bow: UNCHANGED
- Jawline contour, chin shape: UNCHANGED
- Eyebrow shape, arch, thickness: UNCHANGED
- Cheekbone prominence and facial structure: UNCHANGED
- Facial proportions (eye-to-nose, nose-to-lip ratios): UNCHANGED

SKIN & TEXTURE (EXACT MATCH REQUIRED):
- Skin tone, undertone, and complexion: UNCHANGED from image 1
- Skin texture, pores, any marks/moles: PRESERVE exactly
- Do NOT smooth, airbrush, or beautify the skin
- Do NOT change skin exposure, white balance, or color temperature on the face
- Any freckles, beauty marks, or skin characteristics: PRESERVE

HAIR (EXACT MATCH REQUIRED):
- Hair color, highlights, texture: UNCHANGED
- Hairstyle, parting, volume: UNCHANGED
- Hair placement and flow: PRESERVE from image 1

EXPRESSION & GAZE (EXACT MATCH REQUIRED):
- Facial expression: UNCHANGED (same emotion, same micro-expressions)
- Eye gaze direction: UNCHANGED
- Mouth position (open/closed/smile): UNCHANGED

FAILURE CONDITIONS:
- If the output face looks like a "similar person" instead of the EXACT same person → WRONG
- If facial proportions shifted even slightly → WRONG
- If skin tone changed (lighter/darker/different undertone) → WRONG
- If the face was "beautified" or smoothed → WRONG
`

const POSE_LOCK_RULES = `
═══════════════════════════════════════════════════════════════════
POSE LOCK (EXACT - DO NOT MODIFY)
═══════════════════════════════════════════════════════════════════
The subject's pose MUST match image 1 exactly. Do NOT generate a new pose.

BODY POSITION (EXACT):
- Head tilt, angle, and rotation: UNCHANGED
- Shoulder position and angle: UNCHANGED
- Arm placement and hand positions: UNCHANGED
- Torso angle and lean: UNCHANGED
- If sitting/standing/leaning: SAME position
- Body proportions and build: UNCHANGED

NATURAL POSE PRINCIPLES:
- The pose should look natural and relaxed, not stiff or robotic
- Weight distribution should be realistic
- Limbs should have natural angles (not perfectly straight or unnaturally bent)
- Hands should look natural (no claw hands, no missing fingers, no extra fingers)

DO NOT:
- Invent a new pose
- "Improve" or "beautify" the pose
- Make the subject stand straighter or pose more formally
- Change the camera angle/perspective on the subject
`

const PHOTOGRAPHY_REALISM_RULES = `
═══════════════════════════════════════════════════════════════════
PHOTOGRAPHY REALISM (MAKE IT LOOK LIKE A REAL PHOTO)
═══════════════════════════════════════════════════════════════════
The output must look like it was captured by a REAL CAMERA, not rendered by AI.

FILM/SENSOR CHARACTERISTICS (REQUIRED):
- Add subtle film grain or sensor noise (ISO 400-1600 equivalent)
- Grain should be visible in shadows and midtones
- Different grain structure for highlights vs shadows
- Slight color noise in shadow areas

LENS CHARACTERISTICS (REQUIRED):
- Subtle vignetting at corners (natural falloff, not heavy)
- Mild chromatic aberration on high-contrast edges (purple/green fringing)
- Realistic bokeh: NOT perfect circles, show cat-eye shapes at edges, slight onion rings
- Lens softness: slight reduction in sharpness at extreme corners
- Natural lens flare only if strong backlight is present

DEPTH OF FIELD (REALISTIC):
- Background blur must follow optical physics
- Focus falloff should be gradual, not a hard cutoff
- Bokeh shapes should match the aperture (not perfect circles)
- Objects at different distances should have proportional blur
- Do NOT apply uniform Gaussian blur - preserve micro-texture in blurred areas

BACKGROUND TEXTURE (CRITICAL):
- NEVER apply painterly/smeary blur to backgrounds
- Even blurred backgrounds must retain micro-texture and detail hints
- Stone/brick should show pores, wood should show grain, fabric should show weave
- Signage can be blurred but should retain shape (no text needed)
- Foliage should have individual leaf shapes visible, not smeared green

LIGHTING (REALISTIC):
- Shadows must have realistic softness (not perfectly hard or perfectly soft)
- Shadow direction must be consistent across subject and background
- Specular highlights should match the light source
- Avoid "studio perfect" even lighting - real photos have lighting falloff
- Color temperature must match between subject and environment

ANTI-AI MARKERS (AVOID THESE):
- No plastic/waxy skin
- No perfect symmetry in faces or backgrounds
- No HDR glow or bloom
- No neon/cyberpunk color grading unless explicitly requested
- No wet reflective streets without rain context
- No unnatural color saturation
- No "too clean" surfaces - real world has dust, wear, imperfections
`

const GARMENT_RULES = `
═══════════════════════════════════════════════════════════════════
GARMENT APPLICATION (REQUIRED)
═══════════════════════════════════════════════════════════════════
Replace the subject's clothing with the garment from the reference image.

GARMENT FIDELITY (EXACT MATCH):
- Color/shade: EXACT match to reference garment
- Pattern/print/embroidery: EXACT match (same motifs, same spacing)
- Neckline shape: EXACT match
- Sleeve style/length: EXACT match  
- Button/placket details: EXACT match
- Fabric texture: Match the drape and texture visible in reference

FIT & PHYSICS:
- Garment should fit naturally on the subject's body
- Realistic folds, creases, and draping based on pose
- Proper occlusion (garment behind arms, body parts as appropriate)
- Shadows from garment onto skin/other clothing should be realistic

DO NOT:
- Keep any of the original outfit from image 1
- Redesign or "improve" the garment
- Change the garment color or pattern
- Add logos, text, or details not in the reference
- Paste the garment flat - it must wrap around the body realistically
`

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

  // Style pack determines the "camera feel" 
  const styleBlock = (() => {
    switch (stylePack) {
      case 'candid_iphone':
        return `
STYLE: Candid iPhone / Instagram
- Handheld feel with subtle tilt allowed
- SmartHDR look with natural dynamic range
- JPEG compression artifacts visible on close inspection
- Sensor noise visible in shadows (like iPhone in moderate light)
- Natural imperfect bokeh from small sensor
- Slightly warm color cast typical of iPhone processing`

      case 'editorial_ig':
        return `
STYLE: Editorial Instagram (premium but real)
- 50-85mm lens look with controlled bokeh
- Clean but not sterile color grade
- Skin texture fully visible (pores, micro-texture)
- Slight lens character (mild vignette, subtle CA)
- Professional lighting but not studio-perfect
- Real environment, not CGI backdrop`

      case 'flash_party':
        return `
STYLE: Flash party / digicam aesthetic
- Harsh on-camera flash with strong shadows
- High contrast, crushed blacks in shadows
- Visible noise in dark areas
- Slightly crooked framing acceptable
- Red-eye or flash reflection in eyes possible
- No beauty retouching - raw and real`

      case 'travel_journal':
        return `
STYLE: Travel journal / vacation snap
- Warm natural light with golden hour feel
- Light atmospheric haze acceptable
- Subtle lens flare if backlit
- Handheld imperfection in framing
- Rich but not oversaturated colors
- Environmental context important`

      case 'surveillance_doc':
        return `
STYLE: Documentary / surveillance aesthetic
- Higher angle, wider framing
- Flat contrast, muted color palette
- Motion blur on extremities acceptable
- Gritty realism, no beautification
- Available light only, no flash
- Grain and noise expected`

      default:
        return `
STYLE: Natural Instagram photo
- Real camera imperfections required
- Visible grain/noise in appropriate areas
- Natural bokeh (not perfect circles)
- Slight vignetting acceptable
- No CGI/AI look`
    }
  })()

  // Background focus mode
  const focusBlock = backgroundFocus === 'sharper_bg'
    ? `
BACKGROUND: Sharp environmental detail
- Keep background relatively sharp (f/5.6-f/8 equivalent)
- Environmental texture must be visible
- Stone pores, wood grain, fabric weave all readable
- Minimal bokeh, maximum context`
    : `
BACKGROUND: Moderate depth of field
- Natural bokeh (f/2.8-f/4 equivalent)
- Background texture still visible through blur
- Bokeh shapes should be imperfect (cat-eye at edges)
- NOT Gaussian blur - preserve micro-detail`

  // Scene instructions from director
  const planScene = shootPlan.scene_text || ''
  const planCamera = shootPlan.camera_text || ''
  const planImperfections = shootPlan.imperfection_text || ''
  const planNegative = shootPlan.negative_text || ''

  const sceneInstructions = `
═══════════════════════════════════════════════════════════════════
SCENE INSTRUCTIONS
═══════════════════════════════════════════════════════════════════
${planScene || shootPlan.prompt_text}

${planCamera ? `CAMERA:\n${planCamera}` : ''}

${planImperfections ? `IMPERFECTIONS (REQUIRED):\n${planImperfections}` : ''}

SCENE COHERENCE (MANDATORY):
- Scene must be physically plausible for the pose
- No tables/chairs in the middle of roads
- No floating furniture or impossible placements
- If street scene: subject on sidewalk/terrace, never in traffic
- Foreground elements must contextually belong to the scene

${planNegative || 'NEGATIVE: extra people, collage, overlay, pasted reference, text, watermark, plastic skin, CGI look, perfect bokeh, smeary blur'}
`

  // Build the full prompt
  const roleText = `
═══════════════════════════════════════════════════════════════════
ROLE: Expert Fashion Photo Editor
═══════════════════════════════════════════════════════════════════
You are editing IMAGE 1 to replace the clothing with the garment from the reference.
This is a PHOTO EDIT, not image generation. The output must be the SAME PERSON.

OUTPUT REQUIREMENTS:
- Exactly ONE subject (the person from image 1)
- Same identity, same pose, same expression
- Clothing replaced with the reference garment
- Background styled according to scene instructions
- Must look like a REAL PHOTOGRAPH (not AI generated)

${IDENTITY_LOCK_RULES}
${POSE_LOCK_RULES}
${PHOTOGRAPHY_REALISM_RULES}
${GARMENT_RULES}
${styleBlock}
${focusBlock}
${extraStrict ? `
EXTRA STRICT MODE:
- Any face drift is UNACCEPTABLE - regenerate until exact match
- Pose must be pixel-perfect to original
- If garment not applied, regenerate
- Zero tolerance for AI artifacts` : ''}
`

  // Build content array with images
  const additionalIdentity: ContentListUnion = []
  if (identityImagesBase64.length > 0) {
    additionalIdentity.push(
      'ADDITIONAL IDENTITY ANCHORS: These show the SAME person from different angles. Use to lock identity. Do NOT copy clothing from these.'
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
    'IMAGE 1 (SUBJECT - EDIT THIS): This is the source image. Keep this exact person, exact pose, exact expression.',
    {
      inlineData: { data: cleanSubject, mimeType: 'image/jpeg' },
    } as any,
    ...additionalIdentity,
    'GARMENT REFERENCE: Replace the subject\'s clothing with this garment. Copy it EXACTLY. Do NOT include the person/mannequin from this image.',
    {
      inlineData: { data: cleanGarment, mimeType: 'image/jpeg' },
    } as any,
    ...(garmentBackupImageBase64
      ? [
          'BACKUP GARMENT DETAIL: Use ONLY for garment detail verification (pattern/buttons/neckline). IGNORE any person in this image.',
          {
            inlineData: { data: stripDataUrl(garmentBackupImageBase64), mimeType: 'image/jpeg' },
          } as any,
        ]
      : []),
    sceneInstructions,
  ]

  const imageConfig: ImageConfig = { aspectRatio } as any

  if (model === 'gemini-3-pro-image-preview') {
    ;(imageConfig as any).imageSize = opts.resolution || '2K'
  }

  const config: GenerateContentConfig = {
    responseModalities: ['IMAGE'],
    imageConfig,
    // Very low temperature for maximum consistency
    temperature: model === 'gemini-3-pro-image-preview' ? 0.1 : 0.2,
  }

  let lastErr: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await client.models.generateContent({ model, contents, config })
      
      // Extract image from response parts (avoids SDK warnings)
      if (resp.candidates?.length) {
        for (const part of resp.candidates[0]?.content?.parts || []) {
          if (part.inlineData?.mimeType?.startsWith('image/') && part.inlineData?.data) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
          }
        }
      }

      // Fallback accessor
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
