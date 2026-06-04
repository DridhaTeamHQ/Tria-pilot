import 'server-only'
import { getGeminiChat } from '@/lib/tryon/gemini-chat'
import { extractJson } from './json-repair'

function toDataUrl(base64: string): string {
  if (base64.startsWith('data:image/')) return base64
  return `data:image/jpeg;base64,${base64}`
}

export interface IdentityCompositionAssessment {
  shouldRetry: boolean
  reason: string
  validationAvailable?: boolean
  criticalGarmentDetailMissing?: boolean
  criticalColorMismatch?: boolean
  criticalFitMismatch?: boolean
  identityCorrectionGuidance?: string
  compositionCorrectionGuidance?: string
  garmentCorrectionGuidance?: string
  scores: {
    faceIdentity: number
    bodyConsistency: number
    compositionQuality: number
    backgroundIntegrity: number
    garmentFidelity: number
  }
}

const DEFAULT_ASSESSMENT: IdentityCompositionAssessment = {
  shouldRetry: false,
  reason: 'not_checked',
  validationAvailable: false,
  scores: {
    faceIdentity: 85,
    bodyConsistency: 85,
    compositionQuality: 85,
    backgroundIntegrity: 85,
    garmentFidelity: 85,
  },
}

export async function assessIdentityAndComposition(params: {
  sourceImageBase64: string
  generatedImageBase64: string
  faceCropBase64?: string
  garmentImageBase64?: string
  expectedLogoDescription?: string
  expectedColorDescription?: string
  expectedFitDescription?: string
  presetId?: string
  anchorZone?: string
}): Promise<IdentityCompositionAssessment> {
  const openai = getGeminiChat()

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: [
          'You are a strict quality checker for virtual try-on identity preservation, garment fidelity, and composition.',
          'Return JSON only:',
          '{',
          '  "scores": {',
          '    "faceIdentity": <0-100>,',
          '    "bodyConsistency": <0-100>,',
          '    "compositionQuality": <0-100>,',
          '    "backgroundIntegrity": <0-100>,',
          '    "garmentFidelity": <0-100>',
          '  },',
          '  "majorIssues": ["<short issue>", "..."],',
          '  "criticalGarmentDetailMissing": <true|false>,',
          '  "criticalColorMismatch": <true|false>,',
          '  "criticalFitMismatch": <true|false>,',
          '  "identityCorrectionGuidance": "<single sentence about face/body preservation>",',
          '  "compositionCorrectionGuidance": "<single sentence about composition/background correction>",',
          '  "garmentCorrectionGuidance": "<single sentence about garment mismatch correction>"',
          '}',
          '',
          'Rules:',
          '- Compare the generated image against the source portrait for identity preservation.',
          '- Face identity means same person: facial geometry, eye relation, eye aperture, brow-eye spacing, cheek fullness, midface width, nose-lip-jaw relation, age impression, and skin texture.',
          '- Facial structure must stay effectively unchanged: jawline width, cheek shape, chin shape, nose bridge, nose tip, lip contour, eye shape, and brow position should look like the actual person, not a similar-looking model.',
          '- "Close" is not good enough. If the generated face looks beautified, slimmed, younger, smoother, more symmetrical, or slightly recast, score faceIdentity low.',
          '- Body consistency means same build, shoulder width, torso width, limb thickness, and natural proportions.',
          '- Body consistency means the person must not become wider, slimmer, taller, shorter, stretched, compressed, or subtly resized by camera/crop changes.',
          '- Composition quality means framing, camera distance, crop boundaries, head-to-body ratio, visible body area, balance, depth structure, and subject placement match the source image.',
          '- The generated output must preserve the source photo crop: if the source is full-body, output stays full-body; if waist/legs are visible, they remain visible; if the head occupies 12% of frame height, it must not become 25%.',
          '- Penalize zoomed-in outputs harshly. A closer camera, larger head/torso, tighter crop, changed subject scale, recentered subject, or missing body area is a composition failure even when the face identity is good.',
          '- If framing/scale drift makes the body appear different, score both bodyConsistency and compositionQuality low.',
          '- Background integrity means no Gemini blur haze, no smear, no fake bokeh masking, and no pasted subject edges.',
          '- Garment fidelity means the clothing in the generated image matches the garment reference in type, collar, sleeves, buttons, hem length, fit, color, pattern, and fabric behavior.',
          '- If an expected logo, symbol, emblem, badge, wordmark, stars, chest graphic, or printed mark is provided, it must be visible in the generated image with similar placement, color, size, and recognizable shape.',
          '- If the expected visible mark is absent, faded away, moved to the wrong garment zone, or converted into a plain shirt, set criticalGarmentDetailMissing=true and score garmentFidelity low.',
          '- If expected colors are provided, compare the generated garment against the garment reference, not against the lighting of the scene. Shading is allowed, but hue/fabric color drift, washing out, or changing navy to black/blue/gray is a failure. Set criticalColorMismatch=true for clear color drift.',
          '- If expected fit is provided, check whether the garment fit matches the product reference and sits naturally on the source body. A regular shirt becoming baggy/oversized, skin-tight, stretched, warped, pasted-on, or detached is a failure. Set criticalFitMismatch=true for clear fit/drape mismatch.',
          '- Be strict about slight face change. If the generated face looks like a similar person instead of the same person, score it low.',
          '- If the eyes, nose, jaw, mouth, facial fullness, beard contour, or hairline look altered enough that friends would say "almost them but not quite", that is a failure.',
          '- Pay special attention to eye shape/opening and facial fullness. Slightly puffier cheeks or changed eye aperture are failures.',
          '- If the shirt changes into a different silhouette, collar, sleeve length, or button structure, garment fidelity is low.',
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
              `Expected visible garment logo/symbol/graphic: ${params.expectedLogoDescription || 'none'}`,
              `Expected garment color/fabric: ${params.expectedColorDescription || 'match image 4 exactly'}`,
              `Expected garment fit/drape: ${params.expectedFitDescription || 'match image 4 and fit naturally on image 1 body'}`,
              'Image 1 is the source identity.',
              'Image 2 is an optional face crop from the source identity.',
              'Image 3 is the generated result to evaluate.',
              'Image 4 is an optional garment reference.',
              'Check for face drift, body reshaping, garment mismatch, weak composition, zoom-in/crop drift, changed subject scale, changed head-to-body ratio, mushy backgrounds, generic blur haze, and sticker-like separation.',
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
          ...(params.garmentImageBase64
            ? [{
                type: 'image_url' as const,
                image_url: {
                  url: toDataUrl(params.garmentImageBase64),
                  detail: 'high' as const,
                },
              }]
            : []),
        ],
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 260,
  })

  const raw = response.choices[0]?.message?.content || '{}'
  let parsed: {
    scores?: {
      faceIdentity?: number
      bodyConsistency?: number
      compositionQuality?: number
      backgroundIntegrity?: number
      garmentFidelity?: number
    }
    majorIssues?: string[]
    identityCorrectionGuidance?: string
    compositionCorrectionGuidance?: string
    garmentCorrectionGuidance?: string
    criticalGarmentDetailMissing?: boolean
    criticalColorMismatch?: boolean
    criticalFitMismatch?: boolean
  }

  try {
    parsed = extractJson<{
      scores?: {
        faceIdentity?: number
        bodyConsistency?: number
        compositionQuality?: number
        backgroundIntegrity?: number
        garmentFidelity?: number
      }
      majorIssues?: string[]
      identityCorrectionGuidance?: string
      compositionCorrectionGuidance?: string
      garmentCorrectionGuidance?: string
      criticalGarmentDetailMissing?: boolean
      criticalColorMismatch?: boolean
      criticalFitMismatch?: boolean
    }>(raw)
  } catch (parseError) {
    console.warn(
      '[tryon] identity/composition assessment unavailable:',
      parseError instanceof Error ? parseError.message : String(parseError)
    )
    return {
      ...DEFAULT_ASSESSMENT,
      reason: 'validation_unavailable',
    }
  }

  const hasStructuredScores = [
    parsed.scores?.faceIdentity,
    parsed.scores?.bodyConsistency,
    parsed.scores?.compositionQuality,
    parsed.scores?.backgroundIntegrity,
    parsed.scores?.garmentFidelity,
  ].some((value) => typeof value === 'number' && Number.isFinite(value))

  if (!hasStructuredScores) {
    return {
      ...DEFAULT_ASSESSMENT,
      reason: 'validation_unavailable',
    }
  }

  const scores = {
    faceIdentity: clampScore(parsed.scores?.faceIdentity ?? DEFAULT_ASSESSMENT.scores.faceIdentity),
    bodyConsistency: clampScore(parsed.scores?.bodyConsistency ?? DEFAULT_ASSESSMENT.scores.bodyConsistency),
    compositionQuality: clampScore(parsed.scores?.compositionQuality ?? DEFAULT_ASSESSMENT.scores.compositionQuality),
    backgroundIntegrity: clampScore(parsed.scores?.backgroundIntegrity ?? DEFAULT_ASSESSMENT.scores.backgroundIntegrity),
    garmentFidelity: clampScore(parsed.scores?.garmentFidelity ?? DEFAULT_ASSESSMENT.scores.garmentFidelity),
  }

  const minScore = Math.min(
    scores.faceIdentity,
    scores.bodyConsistency,
    scores.compositionQuality,
    scores.backgroundIntegrity,
    scores.garmentFidelity
  )
  const avgScore =
    (scores.faceIdentity + scores.bodyConsistency + scores.compositionQuality + scores.backgroundIntegrity + scores.garmentFidelity) / 5
  const majorIssues = (parsed.majorIssues || []).filter(Boolean)
  const criticalGarmentDetailMissing = Boolean(parsed.criticalGarmentDetailMissing)
  const criticalColorMismatch = Boolean(parsed.criticalColorMismatch)
  const criticalFitMismatch = Boolean(parsed.criticalFitMismatch)

  const shouldRetry =
    criticalGarmentDetailMissing ||
    criticalColorMismatch ||
    criticalFitMismatch ||
    scores.faceIdentity < 78 ||
    scores.bodyConsistency < 74 ||
    scores.compositionQuality < 76 ||
    scores.garmentFidelity < 76 ||
    minScore < 66 ||
    (avgScore < 72 && majorIssues.length >= 2)

  return {
    shouldRetry,
    reason: criticalGarmentDetailMissing
      ? 'critical_garment_detail_missing'
      : criticalColorMismatch
        ? 'critical_color_mismatch'
        : criticalFitMismatch
          ? 'critical_fit_mismatch'
      : shouldRetry ? 'identity_or_composition_low' : 'identity_and_composition_stable',
    validationAvailable: true,
    criticalGarmentDetailMissing,
    criticalColorMismatch,
    criticalFitMismatch,
    identityCorrectionGuidance: parsed.identityCorrectionGuidance?.trim(),
    compositionCorrectionGuidance: parsed.compositionCorrectionGuidance?.trim(),
    garmentCorrectionGuidance: parsed.garmentCorrectionGuidance?.trim(),
    scores,
  }
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}
