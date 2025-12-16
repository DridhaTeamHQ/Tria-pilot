import { getOpenAI } from '@/lib/openai'
import type { BackgroundFocusMode, InstagramStylePack, ShootPlanV3 } from './types'

const SYSTEM_PROMPT = `You are an expert AI Prompt Engineer and Art Director for a virtual try-on system.
Your goal is to convert simple preset names into a cohesive photorealistic prompt for an IMAGE EDIT model.

CRITICAL RULES:
1) SUBJECT LOCK: Never say "a man", "a woman", "a model", or "a person". Always say "The subject".
2) NO IDENTITY DETAIL: Do NOT describe face, hair, skin, ethnicity, age, or body shape.
3) NO CLOTHING DETAIL: Do NOT describe garment colors/patterns/design. The garment is provided as a reference image.
4) EDIT INTENT: Write like an editor describing a real photo (camera + scene + lighting). Do not invent new characters.
5) OUTPUT: Return ONLY raw JSON: {"prompt_text":"..."} (no markdown, no extra keys).

PROMPT STRUCTURE:
- Subject: The subject + pose (pose only)
- Context: background/location/time/weather/atmosphere
- Style: photorealistic commercial/editorial photography
- Composition: lens + framing + depth of field
- Lighting: technical lighting direction/quality/color
- Details: realistic texture, natural filmic grading
- Details must avoid the CGI look: add realistic photography imperfections (subtle sensor noise/film grain, slight lens vignette, mild chromatic aberration, non-uniform bokeh, realistic shadow softness).
- Negative: forbid extra people, collage, overlays, pasted reference, text, watermark, AI artifacts, CGI/3D render look, overly perfect backgrounds.`

function stylePackHints(stylePack?: InstagramStylePack): string {
  switch (stylePack) {
    case 'candid_iphone':
      return 'Instagram CANDID iPhone: handheld feel, slight tilt, mild SmartHDR look, subtle JPEG compression, natural imperfections, realistic bokeh (not perfect circles).'
    case 'editorial_ig':
      return 'Instagram EDITORIAL: premium lens look (50–85mm), controlled lighting, clean color grade, still natural texture (no plastic skin), no CGI perfection.'
    case 'flash_party':
      return 'Instagram FLASH PARTY: harsh on-camera flash, deeper shadows, visible noise in dark areas, imperfect crooked framing; still photoreal (no AI glow).'
    case 'travel_journal':
      return 'Instagram TRAVEL JOURNAL: warm natural light, light haze, subtle lens flare when appropriate, slightly imperfect handheld framing, realistic atmosphere.'
    case 'surveillance_doc':
      return 'DOCUMENTARY/SURVEILLANCE: high-angle wide framing, flatter contrast, muted colors, gritty realism, slight motion blur on extremities.'
    default:
      return 'Instagram photorealistic post: natural imperfections, real camera look, no CGI.'
  }
}

function focusHints(backgroundFocus?: BackgroundFocusMode): string {
  return backgroundFocus === 'sharper_bg'
    ? 'Background focus: keep more environment detail visible (less blur), realistic depth (not ultra-bokeh).'
    : 'Background focus: moderate bokeh / shallow DOF is ok, but keep it realistic (not perfect blur).'
}

function extractJsonObject(raw: string): string {
  const trimmed = (raw || '').trim()
  if (!trimmed) throw new Error('Empty response')
  try {
    JSON.parse(trimmed)
    return trimmed
  } catch {
    // continue
  }
  const first = trimmed.indexOf('{')
  const last = trimmed.lastIndexOf('}')
  if (first === -1 || last === -1 || last <= first) {
    throw new Error('No JSON object found in response')
  }
  return trimmed.slice(first, last + 1)
}

export async function generateShootPlanV3(params: {
  pose_name: string
  lighting_name: string
  background_name: string
  userRequest?: string
  photoConstraints?: string
  stylePack?: InstagramStylePack
  backgroundFocus?: BackgroundFocusMode
}): Promise<ShootPlanV3> {
  const { pose_name, lighting_name, background_name, userRequest, photoConstraints, stylePack, backgroundFocus } = params
  const openai = getOpenAI()

  const userPrompt = `Pose: ${pose_name}
Lighting: ${lighting_name}
Background: ${background_name}
Style pack: ${stylePackHints(stylePack)}
${focusHints(backgroundFocus)}
${userRequest ? `User request (ignore if about face/body/clothing): ${userRequest}` : ''}
${photoConstraints ? `\nPhoto constraints (must follow for realism): ${photoConstraints}` : ''}

Return ONLY JSON.`

  const resp = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 600,
  })

  const content = resp.choices?.[0]?.message?.content ?? ''
  const jsonText = extractJsonObject(content)
  const parsed = JSON.parse(jsonText) as any

  const prompt_text = String(parsed?.prompt_text ?? '').trim()
  if (!prompt_text) throw new Error('Director output missing prompt_text')

  // Add a default negative tail if the model forgot it (keeps it robust)
  const hasNegative = /NEGATIVE/i.test(prompt_text)
  const withNegative = hasNegative
    ? prompt_text
    : `${prompt_text}\nNEGATIVE: extra people, duplicate subject, collage, overlay, pasted reference image, cutout, mannequin, picture-in-picture, text, logo, watermark, blurry, distorted hands, plastic skin, halos, AI artifacts, CGI/3D render look, overly perfect background, unrealistic lighting.`

  return { prompt_text: withNegative }
}


