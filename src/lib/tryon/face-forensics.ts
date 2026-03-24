import 'server-only'
import { getOpenAI } from '@/lib/openai'

const FORENSIC_PROMPT_MODEL = process.env.TRYON_FORENSIC_PROMPT_MODEL?.trim() || process.env.TRYON_PROMPT_MODEL?.trim() || 'gpt-4o'

function toDataUrl(base64: string): string {
  if (base64.startsWith('data:image/')) return base64
  return `data:image/jpeg;base64,${base64}`
}

export interface ForensicAnchorResult {
  faceAnchor: string
  eyesAnchor: string
  characterSummary: string
  poseSummary: string
  appearanceSummary: string
  garmentOnPersonGuidance: string
  bodyAnchor: string
  perceivedGender: 'masculine' | 'feminine' | 'neutral'
  antiDriftDirectives: string
}

/**
 * Dual-anchor helper:
 * 1) Visual anchor (Image 1 is passed directly to the image model)
 * 2) Semantic anchor (forensic face signature derived from Image 1)
 */
export async function buildForensicFaceAnchor(params: {
  personImageBase64: string
  garmentDescription?: string
}): Promise<ForensicAnchorResult> {
  const openai = getOpenAI()

  const content: any[] = [
    {
      type: 'text',
      text: `Analyze this person's face and body for identity locking in a virtual try-on system.
I need SPECIFIC, MEASURABLE descriptions — not generic phrases. Describe what you ACTUALLY SEE.

Return JSON only:
{
  "perceivedGender": "<masculine/feminine/neutral — based on visual presentation only>",
  "faceShape": "<round/oval/square/heart/oblong/diamond — pick the closest>",
  "faceWidth": "<narrow/medium/wide/very wide — relative to face height>",
  "cheekVolume": "<hollow/flat/medium/full/prominent — describe the actual cheek fullness>",
  "jawlineType": "<sharp/angular/soft/rounded/square/tapered — be specific>",
  "chinShape": "<pointed/rounded/square/cleft — what you actually see>",
  "foreheadHeight": "<low/medium/high>",
  "noseDescription": "<short phrase: bridge width + tip shape, e.g. 'medium-wide bridge with rounded bulbous tip'>",
  "lipDescription": "<short phrase: lip fullness + shape, e.g. 'medium-full lips with defined cupid's bow'>",
  "skinTexture": "<smooth/lightly textured/visibly porous/rough — describe actual skin surface quality>",
  "facialHairDescription": "<short phrase: density + style + coverage. Say 'none' if clean-shaven or no facial hair>",
  "distinguishingMarks": "<moles, dimples, scars, beauty marks, facial asymmetry — or 'none'. These are CRITICAL for identity locking>",
  "eyeShape": "<almond/round/hooded/deep-set/monolid/etc>",
  "eyeSpacing": "<narrow/medium/wide>",
  "irisColor": "<dark brown/light brown/hazel/blue/green/etc>",
  "gazeDirection": "<straight/slight left/slight right/down/up>",
  "eyelidBrow": "<short phrase: eyelid crease type + brow thickness and arch>",
  "eyewearDescription": "<describe frame shape and style if wearing glasses, or 'none'>",
  "characterSummary": "<single sentence describing overall look and distinguishing features>",
  "poseSummary": "<single sentence describing current pose/head angle/expression>",
  "appearanceSummary": "<single sentence: hairstyle, facial hair, accessories, clothing context>",
  "bodyAnchor": "<single sentence: shoulder width, torso build, arm thickness, overall mass — describe the ACTUAL proportions, do not idealize>",
  "garmentOnPersonGuidance": "<how the garment should sit on this body naturally without any reshaping>"
}

Rules:
- Describe what you ACTUALLY SEE, not what looks average or typical.
- Be specific about face width and fullness — this is the #1 drift in AI generation.
- If the face is round and wide, say so explicitly. If cheeks are full, say full.
- distinguishingMarks is CRITICAL — moles, dimples, scars, beauty marks, and any facial asymmetry are the strongest identity anchors. Look carefully.
- Do not infer name, age, ethnicity, or sensitive attributes.
- Keep each field concise but precise.
- Garment context: ${params.garmentDescription || 'garment from Image 2'}.`,
    },
    {
      type: 'image_url',
      image_url: {
        url: toDataUrl(params.personImageBase64),
        detail: 'low',
      },
    },
  ]

  const response = await openai.chat.completions.create({
    model: FORENSIC_PROMPT_MODEL,
    messages: [{ role: 'user', content }],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 500,
  })

  const raw = response.choices[0]?.message?.content || '{}'
  const parsed = JSON.parse(raw) as {
    perceivedGender?: string
    faceShape?: string
    faceWidth?: string
    cheekVolume?: string
    jawlineType?: string
    chinShape?: string
    foreheadHeight?: string
    noseDescription?: string
    lipDescription?: string
    skinTexture?: string
    facialHairDescription?: string
    distinguishingMarks?: string
    eyeShape?: string
    eyeSpacing?: string
    irisColor?: string
    gazeDirection?: string
    eyelidBrow?: string
    eyewearDescription?: string
    characterSummary?: string
    poseSummary?: string
    appearanceSummary?: string
    bodyAnchor?: string
    garmentOnPersonGuidance?: string
  }

  // Resolve perceived gender for downstream anti-drift rules
  const gender = (parsed.perceivedGender?.toLowerCase() || 'neutral') as 'masculine' | 'feminine' | 'neutral'

  // Compose a SPECIFIC face anchor from the measured features
  const faceGeometryParts = [
    parsed.faceShape && parsed.faceWidth
      ? `${parsed.faceWidth} ${parsed.faceShape} face shape`
      : null,
    parsed.cheekVolume ? `${parsed.cheekVolume} cheeks` : null,
    parsed.jawlineType ? `${parsed.jawlineType} jawline` : null,
    parsed.chinShape ? `${parsed.chinShape} chin` : null,
    parsed.foreheadHeight ? `${parsed.foreheadHeight} forehead` : null,
    parsed.noseDescription || null,
    parsed.lipDescription || null,
    parsed.skinTexture ? `${parsed.skinTexture} skin texture` : null,
    // Only include facial hair if present
    parsed.facialHairDescription && parsed.facialHairDescription !== 'none'
      ? parsed.facialHairDescription
      : null,
    // Distinguishing marks are the strongest identity anchors
    parsed.distinguishingMarks && parsed.distinguishingMarks !== 'none'
      ? parsed.distinguishingMarks
      : null,
    parsed.eyewearDescription && parsed.eyewearDescription !== 'none'
      ? `${parsed.eyewearDescription} eyewear`
      : null,
  ].filter(Boolean)

  const composedFaceAnchor = faceGeometryParts.length >= 4
    ? faceGeometryParts.join(', ')
    : 'preserve exact face shape width and fullness, eye geometry, nose bridge and tip, lip contour, jawline, skin texture with visible pores, and eyewear geometry'

  const composedEyesAnchor = [
    parsed.eyeShape?.trim(),
    parsed.eyeSpacing ? `${parsed.eyeSpacing} inter-eye spacing` : null,
    parsed.irisColor ? `${parsed.irisColor} iris color` : null,
    parsed.gazeDirection ? `${parsed.gazeDirection} gaze direction` : null,
    parsed.eyelidBrow?.trim(),
  ]
    .filter(Boolean)
    .join(', ')

  // Build anti-drift directives — POSITIVE FRAMING ONLY
  // Negative "DO NOT" rules paradoxically increase drift
  const antiDriftParts: string[] = []

  // Universal anti-drift (positive framing)
  if (parsed.faceWidth === 'wide' || parsed.faceWidth === 'very wide') {
    antiDriftParts.push('Preserve wide face width exactly.')
  }
  if (parsed.faceShape === 'round') {
    antiDriftParts.push('Maintain round face shape.')
  }
  if (parsed.cheekVolume === 'full' || parsed.cheekVolume === 'prominent') {
    antiDriftParts.push('Keep full cheek volume.')
  }
  if (parsed.skinTexture && /porous|textured|rough/i.test(parsed.skinTexture)) {
    antiDriftParts.push('Preserve visible pores and natural skin texture.')
  }
  if (parsed.distinguishingMarks && parsed.distinguishingMarks !== 'none') {
    antiDriftParts.push(`Keep these marks: ${parsed.distinguishingMarks}.`)
  }

  // Gender-specific (positive framing)
  if (gender === 'feminine') {
    antiDriftParts.push(
      'Preserve natural face proportions, original nose width, original eye size, original skin tone, visible pores, and natural asymmetry exactly as photographed.'
    )
  }
  if (gender === 'masculine') {
    if (parsed.facialHairDescription && /dense|thick|full|heavy/i.test(parsed.facialHairDescription)) {
      antiDriftParts.push(`Maintain ${parsed.facialHairDescription} exactly.`)
    }
    if (parsed.facialHairDescription === 'none' || parsed.facialHairDescription === 'clean-shaven') {
      antiDriftParts.push('Keep clean-shaven face.')
    }
  }

  const garmentFit = parsed.garmentOnPersonGuidance?.trim() ||
    'garment follows original shoulder slope and torso drape from Image 1 — do not slim or reshape body'

  const composedAntiDrift = antiDriftParts.join(' ')

  return {
    faceAnchor: composedFaceAnchor,
    eyesAnchor:
      composedEyesAnchor ||
      'almond eyes, medium spacing, dark brown irises, straight-forward gaze, stable upper eyelid crease and natural brow arch',
    characterSummary:
      parsed.characterSummary?.trim() ||
      'single subject from Image 1',
    poseSummary:
      parsed.poseSummary?.trim() ||
      'inherit pose and head angle from Image 1',
    appearanceSummary:
      parsed.appearanceSummary?.trim() ||
      'preserve stable hairstyle and accessories from Image 1',
    bodyAnchor:
      parsed.bodyAnchor?.trim() ||
      'preserve original body build, weight, shoulder width, torso mass, and limb proportions exactly as visible in Image 1',
    garmentOnPersonGuidance: antiDriftParts.length > 0
      ? `${garmentFit}. ${antiDriftParts.join(' ')}`
      : garmentFit,
    perceivedGender: gender,
    antiDriftDirectives: composedAntiDrift,
  }
}
