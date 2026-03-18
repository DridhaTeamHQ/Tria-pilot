/**
 * AD GENERATION API — Production Grade
 *
 * Generates AI-powered ad creatives using:
 *  - GPT-4o intelligent prompt crafting
 *  - Gemini 3 Pro Image (Nano Banana Pro) for generation
 *  - Forensic face-lock when influencer image is provided
 *  - Returns image inline for immediate display
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { tryAcquireInFlight } from '@/lib/traffic-guard'
import { rateAdCreative, generateAdCopy } from '@/lib/openai'
import OpenAI from 'openai'
import { getOpenAIKey } from '@/lib/config/api-keys'
import { generateIntelligentAdComposition } from '@/lib/gemini'
import { GeminiRateLimitError } from '@/lib/gemini/executor'
import { saveUpload } from '@/lib/storage'
import {
  AD_PRESET_IDS,
  AD_PRESETS,
  type AdPreset,
  type AdGenerationInput,
  type AdPresetId,
  type Platform,
  type CtaType,
  type CaptionTone,
  type CharacterType,
  type FontStyle,
  type TextPlacement,
  type AspectRatio,
  validateAdInput,
  resolveStylePackForPreset,
} from '@/lib/ads/ad-styles'
import { buildAdPrompt } from '@/lib/ads/ad-prompt-builder'
import { z } from 'zod'

// Increase serverless timeout for Vercel (ad pipeline: GPT + Gemini + image gen can exceed 60s under load)
export const maxDuration = 180

// Schema for the expanded preset-based generation
const adGenerationSchema = z
  .object({
    preset: z.enum(AD_PRESET_IDS as unknown as [string, ...string[]]),
    campaignId: z.string().max(100).optional(),
    variationIndex: z.number().int().min(0).max(999).optional().default(0),
    stylePack: z.enum(['luxury', 'high_street', 'sports']).optional(),

    // Image inputs
    productImage: z.string().min(1).max(15_000_000).optional(),
    influencerImage: z.string().min(1).max(15_000_000).optional(),
    lockFaceIdentity: z.boolean().optional(), // Auto-derived: true when influencerImage is present
    strictRealism: z.boolean().optional().default(true),

    // Model selection: GPT Image 1.5 or Gemini
    imageModel: z.enum(['gpt', 'gemini']).optional().default('gpt'),

    // Character config
    characterType: z
      .enum(['human_female', 'human_male', 'animal', 'none'])
      .optional()
      .default('none'),
    characterIdentity: z
      .enum([
        'global_modern',
        'indian_woman_modern',
        'indian_man_modern',
        'south_asian_modern',
        'south_east_asian_modern',
        'east_asian_modern',
        'central_asian_modern',
        'middle_eastern_modern',
        'mediterranean_modern',
        'african_modern',
        'latina_modern',
        'latin_american_modern',
        'north_american_modern',
        'european_modern',
        'pacific_islander_modern',
        'mixed_heritage_modern',
      ])
      .optional()
      .default('global_modern'),
    animalType: z.string().trim().max(50).optional(),
    characterStyle: z.string().trim().max(100).optional(),
    characterAge: z.string().trim().max(20).optional(),

    // Aspect ratio
    aspectRatio: z.enum(['1:1', '9:16', '16:9', '4:5']).optional().default('1:1'),

    // Camera angle (down, side, low, high, three-quarter, eye-level, dutch, auto)
    cameraAngle: z
      .enum(['auto', 'eye-level', 'low', 'high', 'down', 'side', 'three-quarter', 'dutch'])
      .optional()
      .default('auto'),

    // Text overlay
    textOverlay: z
      .object({
        headline: z.string().trim().max(100).optional(),
        subline: z.string().trim().max(150).optional(),
        tagline: z.string().trim().max(100).optional(),
        placement: z
          .enum(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'])
          .optional(),
        fontStyle: z.enum(['serif', 'sans-serif', 'handwritten', 'bold-display']).optional(),
      })
      .optional(),

    // Legacy text controls
    headline: z.string().trim().max(60).optional(),
    ctaType: z
      .enum(['shop_now', 'learn_more', 'explore', 'buy_now'])
      .default('shop_now'),
    captionTone: z.enum(['casual', 'premium', 'confident']).optional(),

    // Platform
    platforms: z
      .array(z.enum(['instagram', 'facebook', 'google', 'influencer']))
      .min(1),

    // Legacy subject overrides
    subject: z
      .object({
        gender: z.enum(['male', 'female', 'unisex']).optional(),
        ageRange: z.string().trim().max(40).optional(),
        pose: z.string().trim().max(120).optional(),
        expression: z.string().trim().max(120).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()

function stripDataUri(value: string): string {
  return value.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '')
}

/** Shared quality preamble — composition, text, product, and photographic fidelity rules */
function buildQualityPreamble(hasTextOverlay: boolean): string {
  const textRule = hasTextOverlay
    ? `\nTEXT RENDERING: All text must be crisp, legible, and properly kerned. Use clean sans-serif or serif fonts with high contrast against background. No warped, melted, blurred, or misspelled text. Text should integrate naturally into the composition — printed on signage, embossed on surfaces, or cleanly overlaid with proper drop shadow or contrast panel.`
    : `\nCRITICAL: Do NOT include any text, letters, numbers, words, brand names, slogans, watermarks, or typography in the image. ZERO written content.`
  return `PHOTOGRAPHIC FIDELITY & COMPOSITION (MANDATORY):
OUTPUT STYLE: This MUST look like a REAL PHOTOGRAPH taken by a professional photographer with a REAL CAMERA. NOT an illustration, NOT digital art, NOT a painting, NOT a render, NOT stylized, NOT cartoon, NOT anime, NOT CGI. RAW EDITORIAL PHOTOGRAPHY ONLY.
SKIN: Natural pore-level texture, sharp wet-look corneal reflections, realistic subsurface scattering, visible micro-imperfections (moles, pores, fine lines). No plastic/waxy/CGI/airbrushed skin. No beauty filter smoothing.
HANDS: Correct anatomy — five fingers per hand, natural bone structure, realistic nail beds. No extra or fused fingers.
COMPOSITION: Strong focal hierarchy with clear subject separation from background. Use depth layering (foreground interest, mid-ground subject, background context). Balanced negative space.
PRODUCT: The uploaded product garment/item must be the visual hero — accurate color, fabric texture, pattern, cut, and design details preserved exactly. Product must be clearly visible and well-lit.
FABRIC: Realistic drape, wrinkles, material sheen matching the actual textile (matte cotton, glossy silk, textured denim, etc.).
CAMERA REALISM: Subtle natural sensor grain, mild lens imperfection, natural vignetting. These are signs of REAL cameras — include them.${textRule}
Return exactly one final ad image.\n`
}

function resolveOpenAIImageSize(aspectRatio?: AspectRatio): '1024x1024' | '1024x1536' | '1536x1024' | '1024x1280' {
  if (aspectRatio === '9:16') return '1024x1536'
  if (aspectRatio === '16:9') return '1536x1024'
  if (aspectRatio === '4:5') return '1024x1280'
  return '1024x1024'
}

/**
 * Use GPT-4o vision to extract a structured face anchor description from a photo.
 * This creates a stable identity string that locks facial geometry across generations.
 */
async function extractFaceAnchorDescription(
  openaiClient: OpenAI,
  faceImageBase64: string,
): Promise<string> {
  const imageUrl = faceImageBase64.startsWith('data:')
    ? faceImageBase64
    : `data:image/jpeg;base64,${faceImageBase64}`

  const response = await openaiClient.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 200,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: [
          'You are a face identity analyst. Output a concise physical description of the person.',
          'Focus on GEOMETRY: face shape, eyes, nose, lips, skin tone, hair.',
          'Use geometric terms (oval, almond, narrow, wide, pointed).',
          'Do NOT use beauty adjectives. Keep under 80 words. Output ONLY the description.',
        ].join('\n'),
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url' as const,
            image_url: { url: imageUrl, detail: 'low' as const },
          },
          {
            type: 'text' as const,
            text: 'Describe this person\'s face with precise geometric detail for identity consistency.',
          },
        ],
      },
    ],
  })

  const description = response.choices[0]?.message?.content?.trim()
  if (!description) {
    throw new Error('GPT-4o failed to extract face description')
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[FaceAnchor] Extracted face description:', description.substring(0, 120) + '...')
  }

  return description
}

/**
 * Score face similarity between original and generated image using GPT-4o vision.
 * Returns a 0-100 score where 100 = identical face, 90+ = very similar.
 */
async function scoreFaceSimilarity(
  openaiClient: OpenAI,
  originalImage: string,
  generatedImage: string
): Promise<number> {
  try {
    const originalUri = originalImage.startsWith('data:')
      ? originalImage
      : `data:image/png;base64,${originalImage}`
    const generatedUri = generatedImage.startsWith('data:')
      ? generatedImage
      : `data:image/png;base64,${generatedImage}`

    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 10,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: originalUri, detail: 'low' },
            },
            {
              type: 'image_url',
              image_url: { url: generatedUri, detail: 'low' },
            },
            {
              type: 'text',
              text: `Compare faces in Image 1 (original) and Image 2 (generated). Score face IDENTITY similarity 0-100. Focus only on face shape, eyes, nose, lips, skin tone. Ignore outfit/background/pose. Reply with ONLY a number.`,
            },
          ],
        },
      ],
    })

    const scoreText = response.choices[0]?.message?.content?.trim() || '50'
    const score = parseInt(scoreText.replace(/[^0-9]/g, ''), 10)
    return isNaN(score) ? 50 : Math.min(100, Math.max(0, score))
  } catch (err) {
    console.error('[FaceScore] Error scoring face similarity:', err)
    return 50
  }
}

/**
 * Build the face-locked ad edit prompt using the face anchor description.
 * Follows production-grade patterns:
 * [FACE DESCRIPTION] + [PRODUCT] + [STYLE] + [SCENE] + [CONSISTENCY RULES]
 */
function buildFaceLockedAdEditPrompt(opts: {
  faceAnchor: string
  preset: AdPreset
  cameraAngle?: string
  subject?: { pose?: string; expression?: string }
  textOverlay?: { headline?: string; subline?: string; tagline?: string }
}): string {
  const { faceAnchor, preset, cameraAngle, subject, textOverlay } = opts

  const parts: string[] = []

  // Frame as EDITING the existing photo (not generating new)
  parts.push(`Edit this photo. Do NOT generate a new person. Modify ONLY the outfit, pose, and background.`)
  parts.push(``)

  // Identity anchor from GPT-4o analysis
  parts.push(`This person's face identity (DO NOT ALTER):`)
  parts.push(faceAnchor)
  parts.push(``)

  // Editing instructions
  parts.push(`EDIT INSTRUCTIONS:`)
  parts.push(`1. Keep this exact person's face, head, and hair completely unchanged — same face shape, same eyes, same nose, same lips, same skin, same hair.`)
  parts.push(`2. Change ONLY their outfit to match the garment in Image 2 — same color, fabric, cut, pattern, design details.`)

  // Scene from preset
  parts.push(`3. SCENE: ${preset.sceneGuide}`)
  parts.push(``)

  // Lighting from preset
  parts.push(`LIGHTING: ${preset.lightingGuide}`)

  // Camera from preset + user override
  const cameraDesc = cameraAngle && cameraAngle !== 'auto'
    ? `${preset.cameraGuide}. Camera angle: ${cameraAngle}.`
    : preset.cameraGuide
  parts.push(`CAMERA: ${cameraDesc}`)
  parts.push(``)

  // Pose/expression from user input
  if (subject?.pose) {
    parts.push(`POSE: ${subject.pose}`)
  }
  if (subject?.expression) {
    parts.push(`EXPRESSION: ${subject.expression}`)
  }

  // Style anchors (stabilize output — anti-cartoon)
  parts.push(`Real editorial photograph shot on Canon EOS R5 85mm f/1.8. NOT an illustration, NOT digital art, NOT cartoon, NOT CGI. Raw photojournalistic quality with natural skin pores, film grain, and lens imperfections. Photorealistic skin texture, high detail facial features, sharp focus.`)
  parts.push(``)

  // Handle text overlay vs no-text
  const hasText = textOverlay?.headline || textOverlay?.subline || textOverlay?.tagline
  if (hasText) {
    if (textOverlay?.headline) parts.push(`Include headline text: "${textOverlay.headline}"`)
    if (textOverlay?.subline) parts.push(`Include subline text: "${textOverlay.subline}"`)
    if (textOverlay?.tagline) parts.push(`Include tagline text: "${textOverlay.tagline}"`)
  } else {
    parts.push(`Do NOT add any text, logos, watermarks, or typography.`)
  }
  parts.push(``)

  // Negative / avoid instructions from preset
  parts.push(`Do NOT change the face. Do NOT reimagine facial features. Do NOT generate a different person.`)
  parts.push(`Same person. Same face. Edit only outfit and background.`)
  if (preset.avoid.length > 0) {
    parts.push(`AVOID: ${preset.avoid.join(', ')}`)
  }

  return parts.join('\n')
}

async function generateFaceLockedAdWithOpenAI(params: {
  influencerImage: string
  productImage?: string
  preset: AdPreset
  aspectRatio?: AspectRatio
  cameraAngle?: string
  subject?: { pose?: string; expression?: string }
  textOverlay?: { headline?: string; subline?: string; tagline?: string }
}): Promise<{ image: string; prompt: string }> {
  const openaiClient = new OpenAI({ apiKey: getOpenAIKey() })

  // Step 1: Extract face anchor description using GPT-4o vision
  if (process.env.NODE_ENV !== 'production') {
    console.log('[FaceAnchor] Extracting face identity description...')
  }
  const faceAnchor = await extractFaceAnchorDescription(openaiClient, params.influencerImage)

  // Step 2: Build prompt with face anchor + full preset data + user options
  const rawEditPrompt = buildFaceLockedAdEditPrompt({
    faceAnchor,
    preset: params.preset,
    cameraAngle: params.cameraAngle,
    subject: params.subject,
    textOverlay: params.textOverlay,
  })

  // Prepend anti-cartoon realism mandate
  const editPrompt = `CRITICAL: Output a RAW PHOTOGRAPH — NOT illustration, NOT digital art, NOT cartoon, NOT CGI, NOT stylized. Must be INDISTINGUISHABLE from a real DSLR photo with natural film grain, real skin pores, and authentic lighting.\n\n` + rawEditPrompt

  if (process.env.NODE_ENV !== 'production') {
    console.log('[FaceAnchor] Full prompt length:', editPrompt.length, 'chars')
  }

  // Step 3: Build multipart form data — person image first (identity anchor)
  const apiKey = getOpenAIKey()
  const formData = new FormData()
  formData.append('model', 'gpt-image-1.5')
  formData.append('prompt', editPrompt)
  formData.append('n', '1')
  formData.append('size', resolveOpenAIImageSize(params.aspectRatio))
  formData.append('quality', 'high')
  formData.append('response_format', 'b64_json')
  formData.append('input_fidelity', 'high')

  const cleanPerson = stripDataUri(params.influencerImage)
  const personBlob = new Blob([Buffer.from(cleanPerson, 'base64')], { type: 'image/png' })
  formData.append('image[]', personBlob, 'person.png')

  if (params.productImage) {
    const cleanProduct = stripDataUri(params.productImage)
    const productBlob = new Blob([Buffer.from(cleanProduct, 'base64')], { type: 'image/png' })
    formData.append('image[]', productBlob, 'product.png')
  }

  // Step 4: Call GPT Image 1.5 directly via /v1/images/edits
  const gptResponse = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData,
  })

  if (!gptResponse.ok) {
    const errBody = await gptResponse.json().catch(() => ({}))
    throw new Error(`GPT Image error ${gptResponse.status}: ${errBody?.error?.message || gptResponse.statusText}`)
  }

  const gptResult = await gptResponse.json()
  const imgData = gptResult?.data?.[0]
  if (!imgData?.b64_json) {
    throw new Error('GPT Image returned no image data')
  }

  return {
    image: `data:image/png;base64,${imgData.b64_json}`,
    prompt: editPrompt,
  }
}

export async function POST(request: Request) {
  let inFlight: { allowed: boolean; retryAfterSeconds?: number; release?: () => Promise<void> } | null = null
  try {
    const startedAt = Date.now()
    const SOFT_DEADLINE_MS = 50_000
    const timeRemaining = () => SOFT_DEADLINE_MS - (Date.now() - startedAt)

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = createServiceClient()

    // Verify brand role
    const { data: profile } = await service
      .from('profiles')
      .select('role, brand_data, full_name')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'brand') {
      return NextResponse.json(
        { error: 'Unauthorized - Brand access required' },
        { status: 403 }
      )
    }

    // In-flight guard: one ad generation per user at a time (regulates traffic at scale)
    inFlight = await tryAcquireInFlight(user.id, 'ads')
    if (!inFlight.allowed) {
      const retry = inFlight.retryAfterSeconds ?? 15
      return NextResponse.json(
        {
          error: 'An ad is already being generated. Please wait for it to finish.',
          retryAfterSeconds: retry,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(retry), 'Cache-Control': 'no-store' },
        }
      )
    }

    // Check rate limit (per-minute; middleware also enforces for /api/ads/generate)
    const rateLimit = await checkRateLimit(user.id, 'ads')
    if (!rateLimit.allowed) {
      const retry = rateLimit.retryAfterSeconds ?? 60
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please wait a moment and try again.',
          retryAfterSeconds: retry,
          resetTime: rateLimit.resetTime,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(retry), 'Cache-Control': 'no-store' },
        }
      )
    }

    const body = await request.json().catch(() => null)
    const input = adGenerationSchema.parse(body)

    // Validate campaign if provided
    let campaignData = null
    if (input.campaignId) {
      const { data: campaign } = await service
        .from('campaigns')
        .select('*')
        .eq('id', input.campaignId)
        .single()

      if (!campaign) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
      }

      if (campaign.brand_id !== user.id) {
        return NextResponse.json(
          { error: 'Unauthorized - Campaign access denied' },
          { status: 403 }
        )
      }

      if (campaign.status === 'completed') {
        return NextResponse.json(
          { error: 'Cannot generate ads for completed campaigns' },
          { status: 400 }
        )
      }

      campaignData = { id: campaign.id, title: campaign.title }
    }

    // Build the generation input
    const generationInput: AdGenerationInput = {
      preset: input.preset as AdPresetId,
      campaignId: input.campaignId,
      variationIndex: input.variationIndex,
      stylePack: input.stylePack ?? resolveStylePackForPreset(input.preset as AdPresetId),
      productImage: input.productImage,
      influencerImage: input.influencerImage,
      lockFaceIdentity: input.lockFaceIdentity,
      strictRealism: input.strictRealism,
      characterType: input.characterType as CharacterType,
      characterIdentity: input.characterIdentity,
      animalType: input.animalType,
      characterStyle: input.characterStyle,
      characterAge: input.characterAge,
      aspectRatio: input.aspectRatio as AspectRatio | undefined,
      textOverlay: input.textOverlay
        ? {
            headline: input.textOverlay.headline,
            subline: input.textOverlay.subline,
            tagline: input.textOverlay.tagline,
            placement: input.textOverlay.placement as TextPlacement | undefined,
            fontStyle: input.textOverlay.fontStyle as FontStyle | undefined,
          }
        : undefined,
      headline: input.headline,
      ctaType: input.ctaType as CtaType,
      captionTone: input.captionTone as CaptionTone,
      platforms: input.platforms as Platform[],
      subject: input.subject,
    }

    // Validate with business rules
    const validation = validateAdInput(generationInput)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }    

    // ═══════════════════════════════════════════════════════
    // IMAGE GENERATION: GPT Image 1.5 or Gemini (user choice)
    // ═══════════════════════════════════════════════════════
    let generatedImage = ''
    let compositionPrompt = ''
    let promptUsed: string = input.imageModel || 'gpt'

    // Auto face-lock: always lock when influencer image is present
    const shouldLockFace = Boolean(input.influencerImage)

    if (shouldLockFace && input.influencerImage) {
      // ── FACE-LOCKED: GPT Image 1.5 (always, regardless of model choice) ──
      if (process.env.NODE_ENV !== 'production') {
        console.log('[AdsAPI] FACE-LOCKED mode with GPT Image 1.5 + Face Anchor')
      }

      const presetObj = AD_PRESETS.find(p => p.id === input.preset) ?? AD_PRESETS[0]
      const openaiClient = new OpenAI({ apiKey: getOpenAIKey() })

      // Retry loop: generate up to 2 attempts, pick best face match
      const MAX_FACE_ATTEMPTS = 2
      const FACE_THRESHOLD = 85
      let bestImage = ''
      let bestPrompt = ''
      let bestScore = 0

      for (let attempt = 1; attempt <= MAX_FACE_ATTEMPTS; attempt++) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[FaceLock] Attempt ${attempt}/${MAX_FACE_ATTEMPTS}...`)
        }

        try {
          const result = await generateFaceLockedAdWithOpenAI({
            influencerImage: input.influencerImage,
            productImage: input.productImage,
            preset: presetObj,
            aspectRatio: input.aspectRatio as AspectRatio | undefined,
            cameraAngle: input.cameraAngle,
            subject: input.subject,
            textOverlay: input.textOverlay,
          })

          // Score face similarity using GPT-4o
          const faceScore = await scoreFaceSimilarity(openaiClient, input.influencerImage, result.image)

          if (process.env.NODE_ENV !== 'production') {
            console.log(`[FaceLock] Attempt ${attempt} face similarity: ${faceScore}%`)
          }

          if (faceScore > bestScore) {
            bestScore = faceScore
            bestImage = result.image
            bestPrompt = result.prompt
          }

          if (faceScore >= FACE_THRESHOLD) {
            if (process.env.NODE_ENV !== 'production') {
              console.log(`[FaceLock] Face score ${faceScore}% >= ${FACE_THRESHOLD}%. Accepting.`)
            }
            break
          }

          if (attempt < MAX_FACE_ATTEMPTS && timeRemaining() < 30_000) {
            if (process.env.NODE_ENV !== 'production') {
              console.log('[FaceLock] Not enough time for retry. Using best so far.')
            }
            break
          }
        } catch (err: any) {
          console.error(`[FaceLock] Attempt ${attempt} failed:`, err?.message || err)
          if (attempt === MAX_FACE_ATTEMPTS && !bestImage) throw err
        }
      }

      generatedImage = bestImage
      compositionPrompt = bestPrompt
      promptUsed = 'gpt-image-1.5-face'

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[AdsAPI] GPT Image 1.5 face-locked complete (best face score: ${bestScore}%)`)
      }
    } else if (input.imageModel === 'gpt') {
      // ── NORMAL GPT: GPT Image 1.5 without face lock ──
      if (process.env.NODE_ENV !== 'production') console.log('[AdsAPI] Building prompt with GPT-4o vision...')
      const { prompt: rawCompositionPrompt, fallback } = await buildAdPrompt(
        generationInput,
        input.productImage
      )

      const hasText = Boolean(input.textOverlay?.headline || input.textOverlay?.subline || input.textOverlay?.tagline)
      const gptRealismPrefix = `CRITICAL STYLE MANDATE: Generate a RAW PHOTOGRAPH — NOT an illustration, NOT digital art, NOT a stylized rendering, NOT cartoon, NOT anime, NOT CGI. This must be indistinguishable from a real photo shot on a professional DSLR camera. Include natural film grain, real skin texture with visible pores, lens imperfections, and authentic lighting. If the result looks even slightly illustrated or digitally painted, it is a FAILURE.\n\n`
      compositionPrompt = gptRealismPrefix + buildQualityPreamble(hasText) + rawCompositionPrompt
      promptUsed = fallback ? 'fallback' : 'gpt-image-1.5'

      if (process.env.NODE_ENV !== 'production') {
        console.log('[AdsAPI] Prompt built (' + promptUsed + '): ' + compositionPrompt.length + ' chars')
        console.log('[AdsAPI] Generating ad with GPT Image 1.5...')
      }

      // Use GPT Image 1.5 via direct /v1/images/edits API
      const apiKey = getOpenAIKey()
      const formData = new FormData()
      formData.append('model', 'gpt-image-1.5')
      formData.append('prompt', compositionPrompt)
      formData.append('n', '1')
      formData.append('size', resolveOpenAIImageSize(input.aspectRatio as AspectRatio | undefined))
      formData.append('quality', 'high')
      formData.append('response_format', 'b64_json')

      if (input.productImage) {
        const cleanProduct = stripDataUri(input.productImage)
        const productBlob = new Blob([Buffer.from(cleanProduct, 'base64')], { type: 'image/png' })
        formData.append('image[]', productBlob, 'product.png')
      }

      const gptResp = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: formData,
      })

      if (!gptResp.ok) {
        const errBody = await gptResp.json().catch(() => ({}))
        throw new Error(`GPT Image error ${gptResp.status}: ${errBody?.error?.message || gptResp.statusText}`)
      }

      const gptResult = await gptResp.json()
      const imgData = gptResult?.data?.[0]
      if (!imgData?.b64_json) {
        throw new Error('GPT Image returned no image data')
      }
      generatedImage = `data:image/png;base64,${imgData.b64_json}`
    } else {
      // ── NORMAL GEMINI: Gemini-based generation ──
      if (process.env.NODE_ENV !== 'production') console.log('[AdsAPI] Building prompt with GPT-4o vision...')
      const { prompt: rawCompositionPrompt, fallback } = await buildAdPrompt(
        generationInput,
        input.productImage
      )

      const hasText = Boolean(input.textOverlay?.headline || input.textOverlay?.subline || input.textOverlay?.tagline)
      compositionPrompt = buildQualityPreamble(hasText) + rawCompositionPrompt
      promptUsed = fallback ? 'fallback' : 'gemini'

      if (process.env.NODE_ENV !== 'production') {
        console.log('[AdsAPI] Prompt built (' + promptUsed + '): ' + compositionPrompt.length + ' chars')
        console.log('[AdsAPI] Generating ad with Gemini...')
      }

      generatedImage = await generateIntelligentAdComposition(
        input.productImage,
        undefined,
        compositionPrompt,
        {
          lockFaceIdentity: false,
          aspectRatio: input.aspectRatio as AspectRatio | undefined,
        }
      )
    }


    // Score first pass and optionally run a quality recovery pass.
    // In production, we default to one pass to avoid 504 timeouts.
    const enableRecoveryPass = process.env.AD_ENABLE_RECOVERY_PASS === 'true'

    let rating = await rateAdCreative(generatedImage, input.productImage, input.influencerImage).catch(
      () => ({ score: 75 })
    )
    let qualityScore = Number((rating as any)?.score || 75)

    if (enableRecoveryPass && input.imageModel === 'gemini' && qualityScore < 82 && timeRemaining() > 18_000) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[AdsAPI] Low quality score (${qualityScore}). Running recovery pass...`)
      }

      const recoveryPrompt = `${compositionPrompt}

QUALITY RECOVERY PASS:
- Increase realism and premium finish while preserving the same concept.
- Clean edges, natural skin/fabric texture, balanced dynamic range.
- Keep a single strong focal point with ad-ready composition.
- No warped hands, no malformed anatomy, no synthetic/plastic/clay skin.
- Face correction priority: realistic pores, subtle facial asymmetry, accurate skin micro-contrast, natural eye detail, no beauty-filter smoothing.
- Text correction priority: crisp and legible typography, realistic print/paint/signage treatment, never chunky toy-like 3D letters.`

      const candidateImage = await generateIntelligentAdComposition(
        input.productImage,
        input.influencerImage,
        recoveryPrompt,
        {
          lockFaceIdentity: input.lockFaceIdentity,
          aspectRatio: input.aspectRatio as AspectRatio | undefined,
        }
      )

      const candidateRating = await rateAdCreative(candidateImage, input.productImage, input.influencerImage).catch(
        () => ({ score: 75 })
      )
      const candidateScore = Number((candidateRating as any)?.score || 75)

      if (candidateScore > qualityScore) {
        generatedImage = candidateImage
        rating = candidateRating
        qualityScore = candidateScore
      }
    }

    // Post-generation: copy. If we are close to timeout, skip heavy extras and return image first.
    if (process.env.NODE_ENV !== 'production') console.log('[AdsAPI] Generating ad copy...')

    const brandData = (profile.brand_data as any) || {}
    const brandName =
      brandData.companyName || profile.full_name || undefined

    const copyVariants = timeRemaining() > 8_000
      ? await generateAdCopy(generatedImage, {
          productName: input.textOverlay?.headline || input.headline || 'fashion product',
          brandName,
          niche: input.preset,
        }).catch(() => [])
      : []

    let imageUrl: string | null = null
    try {
      let contentType = 'image/jpeg'
      let fileExtension = 'jpg'
      const mimeMatch = generatedImage.match(/^data:(image\/\w+);base64,/)
      if (mimeMatch) {
        contentType = mimeMatch[1]
        if (contentType === 'image/png') fileExtension = 'png'
        else if (contentType === 'image/webp') fileExtension = 'webp'
        else if (contentType === 'image/gif') fileExtension = 'gif'
      }

      const imagePath = `${user.id}/${Date.now()}.${fileExtension}`
      imageUrl = await saveUpload(
        generatedImage,
        imagePath,
        'ads',
        contentType
      )
    } catch (uploadErr) {
      // Upload failed but we still have the image — log and continue
      console.warn('[AdsAPI] Storage upload failed (non-fatal, returning inline image):', uploadErr)
    }

    // ── Save to DB (only if we have a URL) ──
    let adCreativeId: string | null = null
    if (imageUrl) {
      const { data: adCreative, error: insertError } = await service
        .from('ad_creatives')
        .insert({
          brand_id: user.id,
          image_url: imageUrl,
          title:
            input.textOverlay?.headline ||
            input.headline ||
            `${input.preset} Ad`,
          prompt: compositionPrompt,
          campaign_id: campaignData?.id || null,
          platform: input.platforms[0] || 'instagram',
          status: 'generated',
          rating: qualityScore,
        })
        .select()
        .single()

      if (insertError) {
        console.error('Ad creative insert error:', insertError)
      }
      adCreativeId = adCreative?.id || null
    }

    // Return image data inline for immediate display — works even if upload failed
    return NextResponse.json({
      id: adCreativeId || crypto.randomUUID(),
      imageUrl: imageUrl || null,
      imageBase64: generatedImage, // inline for immediate rendering — ALWAYS available
      copy: copyVariants,
      rating,
      qualityScore,
      preset: input.preset,
      promptUsed,
    })
  } catch (error) {
    console.error('Ad generation error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof GeminiRateLimitError) {
      const retryAfterSeconds = Math.min(
        60,
        Math.ceil((error.retryAfterMs ?? 30_000) / 1000)
      ) || 30
      return NextResponse.json(
        {
          error: error.message || 'Rate limit reached. Please retry shortly.',
          code: 'RATE_LIMIT',
          retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSeconds),
            'Cache-Control': 'no-store',
          },
        }
      )
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  } finally {
    void inFlight?.release?.()
  }
}

