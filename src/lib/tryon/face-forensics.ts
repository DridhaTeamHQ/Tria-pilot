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
      text: `Describe this person for identity and body locking in a virtual try-on pipeline.
Return JSON only:
{
  "faceAnchor": "<single sentence, comma-separated forensic features: eye shape/spacing, nose bridge+tip geometry, lip contour, jawline/chin geometry, skin texture, facial hair pattern, eyewear>",
  "eyesAnchor": "<single sentence focused ONLY on eyes: eye shape, inter-eye spacing, iris color, gaze direction, eyelid/brow geometry>",
  "eyeShape": "<very short phrase: almond/round/hooded/deep-set/etc>",
  "eyeSpacing": "<very short phrase: narrow/medium/wide spacing>",
  "irisColor": "<very short phrase: dark brown/light brown/hazel/blue/green/etc>",
  "gazeDirection": "<very short phrase: straight/slight left/slight right/down/up>",
  "eyelidBrow": "<very short phrase describing eyelid crease + brow arch/position>",
  "characterSummary": "<single sentence describing stable visible character traits and overall look>",
  "poseSummary": "<single sentence describing current pose/head angle/expression from image>",
  "appearanceSummary": "<single sentence covering hairstyle, facial hair, accessories and clothing silhouette context>",
  "bodyAnchor": "<single sentence describing body build objectively: shoulder width (narrow/medium/broad), torso build (slim/medium/stocky/heavy), arm thickness, overall body mass and proportions visible in the image>",
  "garmentOnPersonGuidance": "<single sentence about how the garment should sit on this person's actual body naturally without slimming, reshaping, or altering proportions>"
}

Rules:
- Do not infer name, age, ethnicity, or sensitive attributes.
- Keep it objective and visual.
- Keep each field concise and production-safe.
- Focus on stable geometry/features that help prevent identity drift.
- Include beard density and beard edge pattern if visible.
- For bodyAnchor: describe the ACTUAL body proportions you see. Do not idealize or normalize. Be precise about build, width, and mass.
- Garment context: ${params.garmentDescription || 'garment from Image 2'}.`,
    },
    {
      type: 'image_url',
      image_url: {
        url: toDataUrl(params.personImageBase64),
        detail: 'high',
      },
    },
  ]

  const response = await openai.chat.completions.create({
    model: FORENSIC_PROMPT_MODEL,
    messages: [{ role: 'user', content }],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 350,
  })

  const raw = response.choices[0]?.message?.content || '{}'
  const parsed = JSON.parse(raw) as {
    faceAnchor?: string
    eyesAnchor?: string
    eyeShape?: string
    eyeSpacing?: string
    irisColor?: string
    gazeDirection?: string
    eyelidBrow?: string
    characterSummary?: string
    poseSummary?: string
    appearanceSummary?: string
    bodyAnchor?: string
    garmentOnPersonGuidance?: string
  }

  const composedEyesAnchor = [
    parsed.eyeShape?.trim(),
    parsed.eyeSpacing?.trim(),
    parsed.irisColor?.trim(),
    parsed.gazeDirection?.trim(),
    parsed.eyelidBrow?.trim(),
  ]
    .filter(Boolean)
    .join(', ')

  return {
    faceAnchor:
      parsed.faceAnchor?.trim() ||
      'almond eyes with medium spacing, straight-medium nose bridge with rounded tip, defined upper and lower lip contour, balanced jawline and chin geometry, natural skin texture, consistent facial hair pattern, same eyewear geometry',
    eyesAnchor:
      parsed.eyesAnchor?.trim() ||
      composedEyesAnchor ||
      'almond eyes, medium spacing, dark brown irises, straight-forward gaze, stable upper eyelid crease and natural brow arch',
    characterSummary:
      parsed.characterSummary?.trim() ||
      'adult male subject with short dark hair, trimmed beard, medium complexion, and neutral-confident expression',
    poseSummary:
      parsed.poseSummary?.trim() ||
      'three-quarter upper body pose with slight head turn and relaxed shoulders',
    appearanceSummary:
      parsed.appearanceSummary?.trim() ||
      'short textured hairstyle, trimmed beard and moustache, eyewear/accessories preserved if present, natural proportions',
    bodyAnchor:
      parsed.bodyAnchor?.trim() ||
      'medium-to-broad shoulder width, medium-stocky torso build, proportional arm thickness, natural body mass as visible in Image 1',
    garmentOnPersonGuidance:
      parsed.garmentOnPersonGuidance?.trim() ||
      'The garment should follow the original shoulder slope and chest/torso drape naturally while preserving the exact body shape, weight, and proportions from Image 1 — do not slim or reshape',
  }
}
