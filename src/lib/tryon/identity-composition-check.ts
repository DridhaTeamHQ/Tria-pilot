import 'server-only'
import { getOpenAI } from '@/lib/openai'

function toDataUrl(base64: string): string {
  if (base64.startsWith('data:image/')) return base64
  return `data:image/jpeg;base64,${base64}`
}

export interface IdentityCompositionAssessment {
  shouldRetry: boolean
  reason: string
  identityCorrectionGuidance?: string
  compositionCorrectionGuidance?: string
  scores: {
    faceIdentity: number
    bodyConsistency: number
    compositionQuality: number
    backgroundIntegrity: number
  }
}

const DEFAULT_ASSESSMENT: IdentityCompositionAssessment = {
  shouldRetry: false,
  reason: 'not_checked',
  scores: {
    faceIdentity: 85,
    bodyConsistency: 85,
    compositionQuality: 85,
    backgroundIntegrity: 85,
  },
}

export async function assessIdentityAndComposition(params: {
  sourceImageBase64: string
  generatedImageBase64: string
  faceCropBase64?: string
  presetId?: string
  anchorZone?: string
}): Promise<IdentityCompositionAssessment> {
  const openai = getOpenAI()

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: [
          'You are a strict quality checker for virtual try-on identity preservation and composition.',
          'Return JSON only:',
          '{',
          '  "scores": {',
          '    "faceIdentity": <0-100>,',
          '    "bodyConsistency": <0-100>,',
          '    "compositionQuality": <0-100>,',
          '    "backgroundIntegrity": <0-100>',
          '  },',
          '  "majorIssues": ["<short issue>", "..."],',
          '  "identityCorrectionGuidance": "<single sentence about face/body preservation>",',
          '  "compositionCorrectionGuidance": "<single sentence about composition/background correction>"',
          '}',
          '',
          'Rules:',
          '- Compare the generated image against the source portrait for identity preservation.',
          '- Face identity means same person: facial geometry, eye relation, eye aperture, brow-eye spacing, cheek fullness, midface width, nose-lip-jaw relation, age impression, and skin texture.',
          '- Body consistency means same build, shoulder width, torso width, limb thickness, and natural proportions.',
          '- Composition quality means framing, balance, depth structure, and subject placement feel photographic and intentional.',
          '- Background integrity means no Gemini blur haze, no smear, no fake bokeh masking, and no pasted subject edges.',
          '- Be strict about slight face change. If the generated face looks like a similar person instead of the same person, score it low.',
          '- Pay special attention to eye shape/opening and facial fullness. Slightly puffier cheeks or changed eye aperture are failures.',
          '- Ignore garment accuracy unless it causes body distortion.',
        ].join('\n'),
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: [
              `Preset: ${params.presetId || 'not provided'}`,
              `Target scene: ${params.anchorZone || 'not provided'}`,
              'Image 1 is the source identity.',
              'Image 2 is an optional face crop from the source identity.',
              'Image 3 is the generated result to evaluate.',
              'Check for face drift, body reshaping, weak composition, mushy backgrounds, generic blur haze, and sticker-like separation.',
            ].join('\n'),
          },
          {
            type: 'image_url',
            image_url: {
              url: toDataUrl(params.sourceImageBase64),
              detail: 'high',
            },
          },
          ...(params.faceCropBase64
            ? [{
                type: 'image_url' as const,
                image_url: {
                  url: toDataUrl(params.faceCropBase64),
                  detail: 'high' as const,
                },
              }]
            : []),
          {
            type: 'image_url',
            image_url: {
              url: toDataUrl(params.generatedImageBase64),
              detail: 'high',
            },
          },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 260,
  })

  const raw = response.choices[0]?.message?.content || '{}'
  const parsed = JSON.parse(raw) as {
    scores?: {
      faceIdentity?: number
      bodyConsistency?: number
      compositionQuality?: number
      backgroundIntegrity?: number
    }
    majorIssues?: string[]
    identityCorrectionGuidance?: string
    compositionCorrectionGuidance?: string
  }

  const scores = {
    faceIdentity: clampScore(parsed.scores?.faceIdentity ?? DEFAULT_ASSESSMENT.scores.faceIdentity),
    bodyConsistency: clampScore(parsed.scores?.bodyConsistency ?? DEFAULT_ASSESSMENT.scores.bodyConsistency),
    compositionQuality: clampScore(parsed.scores?.compositionQuality ?? DEFAULT_ASSESSMENT.scores.compositionQuality),
    backgroundIntegrity: clampScore(parsed.scores?.backgroundIntegrity ?? DEFAULT_ASSESSMENT.scores.backgroundIntegrity),
  }

  const minScore = Math.min(
    scores.faceIdentity,
    scores.bodyConsistency,
    scores.compositionQuality,
    scores.backgroundIntegrity
  )
  const avgScore =
    (scores.faceIdentity + scores.bodyConsistency + scores.compositionQuality + scores.backgroundIntegrity) / 4
  const majorIssues = (parsed.majorIssues || []).filter(Boolean)

  const shouldRetry =
    scores.faceIdentity < 88 ||
    scores.bodyConsistency < 84 ||
    minScore < 76 ||
    (avgScore < 82 && majorIssues.length >= 1)

  return {
    shouldRetry,
    reason: shouldRetry ? 'identity_or_composition_low' : 'identity_and_composition_stable',
    identityCorrectionGuidance: parsed.identityCorrectionGuidance?.trim(),
    compositionCorrectionGuidance: parsed.compositionCorrectionGuidance?.trim(),
    scores,
  }
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}
