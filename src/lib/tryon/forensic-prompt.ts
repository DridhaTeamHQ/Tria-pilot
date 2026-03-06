/**
 * FORENSIC PROMPT BUILDER (Stage 2)
 *
 * Builds a MINIMAL positive-only prompt for Nano Banana Pro.
 * Goal: identity-first, concise, zero negative instructions.
 *
 * DESIGN PRINCIPLE:
 * - Shorter prompts = stronger image-adapter signal = better face consistency.
 * - Positive framing only — negative "DO NOT" rules paradoxically increase drift.
 * - Scene description kept to one short line max.
 * - Total prompt target: ~600-900 chars (vs ~4500 before).
 */

import 'server-only'
import type { PresetStrengthProfile } from './preset-strength-profile'

export interface ForensicPromptInput {
  garmentDescription?: string
  preset?: string
  lighting?: string
  realismGuidance?: string
  garmentOnPersonGuidance?: string
  faceForensicAnchor?: string
  eyesAnchor?: string
  characterSummary?: string
  poseSummary?: string
  appearanceSummary?: string
  aspectRatio?: '1:1' | '4:5' | '3:4' | '9:16'
  retryMode?: boolean
  sceneCorrectionGuidance?: string
  lightingBlueprint?: string
  presetAvoid?: string
  bodyAnchor?: string
  identityCorrectionGuidance?: string
  styleGuidance?: string
  colorGradingGuidance?: string
  cameraGuidance?: string
  poseInferenceGuidance?: string
  researchContext?: string
  webResearchContext?: string
  additionalAvoidTerms?: string[]
  identityPriorityRules?: string[]
  strengthProfile?: PresetStrengthProfile
  hasFaceReference?: boolean
  faceSpatialLockQuality?: 'strict' | 'relaxed'
  faceBox?: {
    ymin: number
    xmin: number
    ymax: number
    xmax: number
  }
}

export function buildForensicPrompt(input: ForensicPromptInput): string {
  const garment = input.garmentDescription?.trim() || 'garment from Image 2'
  const aspectRatio = input.aspectRatio || '1:1'
  const hasFaceReference = Boolean(input.hasFaceReference)

  // Extract a SHORT scene description (max 120 chars) from the preset
  const rawPreset = input.preset?.trim() || ''
  const isSceneChange = rawPreset && rawPreset !== 'keep background from Image 1'
  // Condense scene to just the key environment phrase, strip lighting details
  const sceneBrief = isSceneChange ? condenseScene(rawPreset, 120) : ''

  // Condense lighting to a very short phrase
  const lightingBrief = isSceneChange && input.lightingBlueprint
    ? condenseLighting(input.lightingBlueprint, 60)
    : ''

  // ═══════════════════════════════════════════════════════════════════════
  // MINIMAL POSITIVE PROMPT — ~600-900 chars total
  // ═══════════════════════════════════════════════════════════════════════

  const lines: string[] = []

  // ── LINE 1: Core task (identity first) ──
  lines.push(
    `Generate a photorealistic photo of the EXACT person from Image 1 wearing the garment from Image 2.`
  )
  lines.push('')

  // ── LINE 2: Identity anchor (concise) ──
  if (hasFaceReference) {
    lines.push(
      `IDENTITY: Copy the face from Image 1 and Image 3 (close-up) exactly — same bone structure, eyes, nose, lips, jaw, skin texture, pores, skin tone, and perceived age.`
    )
  } else {
    lines.push(
      `IDENTITY: Copy the face from Image 1 exactly — same bone structure, eyes, nose, lips, jaw, skin texture, pores, skin tone, and perceived age.`
    )
  }
  lines.push('')

  // ── LINE 3: Body (one line) ──
  lines.push(`BODY: Same body shape, weight, and proportions as Image 1.`)
  lines.push('')

  // ── LINE 4: Garment (concise) ──
  lines.push(
    `GARMENT: Apply ${garment} from Image 2. Preserve fabric, color, pattern, and any text/logos exactly.`
  )
  lines.push('')

  // ── LINE 5: Scene (ONE short line, only if scene changes) ──
  if (isSceneChange && sceneBrief) {
    const sceneLine = lightingBrief
      ? `SCENE: ${sceneBrief}. ${lightingBrief}.`
      : `SCENE: ${sceneBrief}.`
    lines.push(sceneLine)
  } else {
    lines.push(`SCENE: Keep the original background from Image 1.`)
  }
  lines.push('')

  // ── LINE 6: Quality (one line) ──
  lines.push(
    `OUTPUT: Photorealistic candid photo, natural skin with visible pores, aspect ratio ${aspectRatio}.`
  )

  // ── LINE 7: Retry (only on retry, minimal) ──
  if (input.retryMode) {
    lines.push(`RETRY: Previous attempt altered the face. Copy face pixels from Image 1 exactly this time.`)
  }

  // ── LINE 8: Concise avoid (3 critical items only) ──
  lines.push(`AVOID: beautification, skin smoothing, face reshaping.`)

  return lines.join('\n')
}

/**
 * Condense a long scene description to just the key environment phrase.
 * E.g. "Modern rooftop terrace with glass railing, clean concrete deck,
 * potted plants, minimalist outdoor seating, and open skyline backdrop."
 * → "Modern rooftop terrace with skyline backdrop"
 */
function condenseScene(scene: string, maxLen: number): string {
  // Remove everything after lighting/camera cues (those are handled separately)
  let s = scene
    .replace(/\. Lighting:.*/i, '')
    .replace(/\. Camera:.*/i, '')
    .replace(/Key:.*$/i, '')
    .replace(/Fill:.*$/i, '')
    .trim()

  // Remove interior detail clauses to shorten
  // Keep the first descriptive clause + last element for location grounding
  if (s.length > maxLen) {
    // Take first phrase up to first comma or period
    const firstClause = s.split(/[,.]/).slice(0, 2).join(',').trim()
    s = firstClause.length > 20 ? firstClause : s.substring(0, maxLen)
  }

  // Final trim
  if (s.length > maxLen) {
    s = s.substring(0, maxLen - 3) + '...'
  }

  // Remove trailing period for clean join
  return s.replace(/\.\s*$/, '').trim()
}

/**
 * Condense lighting blueprint to a very short phrase.
 * E.g. "Key: open daylight from high front-left..."
 * → "Natural daylight"
 */
function condenseLighting(lighting: string, maxLen: number): string {
  const lower = lighting.toLowerCase()

  // Extract the main light type
  if (lower.includes('golden') || lower.includes('sunset') || lower.includes('golden hour')) {
    return 'Warm golden-hour lighting'
  }
  if (lower.includes('daylight') || lower.includes('natural')) {
    return 'Natural daylight'
  }
  if (lower.includes('softbox') || lower.includes('studio')) {
    return 'Soft studio lighting'
  }
  if (lower.includes('window')) {
    return 'Window light'
  }
  if (lower.includes('candle') || lower.includes('diya') || lower.includes('festive')) {
    return 'Warm candlelight'
  }
  if (lower.includes('overcast')) {
    return 'Overcast daylight'
  }
  if (lower.includes('flash')) {
    return 'Direct flash'
  }

  // Fallback: take first short phrase
  const brief = lighting.split('.')[0].trim()
  return brief.length > maxLen ? brief.substring(0, maxLen - 3) + '...' : brief
}
