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
 *
 * Supports both Gemini (Image 1/2/3 references) and GPT Image (descriptive references).
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
  identityDNA?: string            // Soul ID — frozen paragraph describing the person's exact face
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
  /** When true, uses GPT Image-compatible descriptive references instead of "Image 1/2/3" */
  useGPTImageFormat?: boolean
  /** Name anchor for latent space locking */
  nameAnchor?: string
  /** Perceived gender from face forensics */
  perceivedGender?: 'masculine' | 'feminine' | 'neutral'
  /** Anti-drift directives from face forensics */
  antiDriftDirectives?: string
}

export function buildForensicPrompt(input: ForensicPromptInput): string {
  const isGPT = Boolean(input.useGPTImageFormat)
  const aspectRatio = input.aspectRatio || '1:1'
  const hasFaceReference = Boolean(input.hasFaceReference)

  // Image references differ between Gemini and GPT Image
  const personRef = isGPT ? 'the person photo' : 'Image 1'
  const garmentRef = isGPT ? 'the garment photo' : 'Image 2'
  const faceCropRef = isGPT ? 'the face close-up photo' : 'Image 3 (close-up)'
  const garment = input.garmentDescription?.trim() || `garment from ${garmentRef}`

  // Extract a SHORT scene description (max 120 chars) from the preset
  const rawPreset = input.preset?.trim() || ''
  const keepBgPhrase = isGPT ? 'keep the original background' : 'keep background from Image 1'
  const isSceneChange = rawPreset && rawPreset !== keepBgPhrase
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

  // ═══════════════════════════════════════════════════════════════════════
  // IDENTITY FIRST — AI pays the most attention to the first 10-15 words
  // ═══════════════════════════════════════════════════════════════════════

  // ── LINE 1: Name Anchor + Core Identity Task (FIRST — most critical position) ──
  const namePrefix = input.nameAnchor ? `A portrait of ${input.nameAnchor}. ` : ''
  lines.push(
    `${namePrefix}Same person, identical facial structure, no face variation. Generate a photorealistic photo of the EXACT person from ${personRef} wearing the garment from ${garmentRef}.`
  )
  lines.push('')

  // ── LINE 2: Identity anchor (Soul ID or forensic) ──
  if (input.identityDNA) {
    // Soul ID available — use frozen identity paragraph for consistency
    if (hasFaceReference) {
      lines.push(
        `IDENTITY: ${input.identityDNA} Copy these EXACT features from ${personRef} and ${faceCropRef}. Preserve exact facial geometry, natural asymmetry, and every distinguishing mark.`
      )
    } else {
      lines.push(
        `IDENTITY: ${input.identityDNA} Copy these EXACT features from ${personRef}. Preserve exact facial geometry, natural asymmetry, and every distinguishing mark.`
      )
    }
  } else {
    // No Soul ID — generic identity instruction with stronger anchoring
    if (hasFaceReference) {
      lines.push(
        `IDENTITY: Copy the face from ${personRef} and ${faceCropRef} exactly — same bone structure, eyes, nose, lips, jaw, skin texture, pores, skin tone, perceived age, natural asymmetry, and every mole/mark/dimple.`
      )
    } else {
      lines.push(
        `IDENTITY: Copy the face from ${personRef} exactly — same bone structure, eyes, nose, lips, jaw, skin texture, pores, skin tone, perceived age, natural asymmetry, and every mole/mark/dimple.`
      )
    }
  }
  lines.push('')

  // ── LINE 2b: Anti-drift directives from forensics (gender-specific) ──
  if (input.antiDriftDirectives) {
    lines.push(`ANTI-DRIFT: ${input.antiDriftDirectives}`)
    lines.push('')
  }

  // ── LINE 3: Body (one line) ──
  lines.push(`BODY: Same body shape, weight, and proportions as ${personRef}.`)
  lines.push('')

  // ── LINE 4: Garment (explicit — ONLY from garment ref, full outfit) ──
  lines.push(
    `GARMENT: Apply the FULL OUTFIT from ${garmentRef} — ${garment}. Include ALL pieces (top, bottom, layers, accessories) visible in ${garmentRef}. Match the exact color of each piece, pattern, fabric, and design. IGNORE any clothing visible in other images.`
  )
  lines.push('')

  // ── LINE 5: SCENE (compact — identity budget is limited) ──
  if (isSceneChange && sceneBrief) {
    lines.push(`SCENE: ${sceneBrief}. Real location, natural textures.`)
  } else {
    lines.push(`SCENE: Keep original background from ${personRef}.`)
  }
  lines.push('')

  // ── LINE 5a: LIGHTING (compact — match direction only) ──
  if (isSceneChange && lightingBrief) {
    lines.push(`LIGHTING: ${lightingBrief}. Subject lighting matches environment direction and color temperature.`)
  }
  lines.push('')

  // ── LINE 6: OUTPUT (compact — photo quality + aspect ratio) ──
  lines.push(
    `OUTPUT: RAW photograph, DSLR quality, natural depth of field, realistic skin with pores. Aspect ratio ${aspectRatio}.`
  )

  // ── LINE 7: Retry (only on retry, minimal) ──
  if (input.retryMode) {
    lines.push(`RETRY: Previous attempt altered the face. Copy face pixels from ${personRef} exactly this time.`)
  }

  // ── LINE 8: Concise avoid (critical items) ──
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

  // Extract a meaningful description with direction and quality
  if (lower.includes('golden') || lower.includes('sunset') || lower.includes('golden hour')) {
    return 'Warm golden-hour side lighting with long shadows, orange-amber color temperature around 3000K'
  }
  if (lower.includes('daylight') || lower.includes('natural')) {
    return 'Natural open daylight, neutral 5500K color temperature, soft diffused shadows'
  }
  if (lower.includes('softbox') || lower.includes('studio')) {
    return 'Soft studio lighting with controlled fill, even illumination, minimal harsh shadows'
  }
  if (lower.includes('window')) {
    return 'Window side-light with gradual falloff, directional warmth, natural shadow on opposite side'
  }
  if (lower.includes('candle') || lower.includes('diya') || lower.includes('festive')) {
    return 'Warm candlelight from multiple low sources, 2500K color temperature, flickering warmth with soft shadows'
  }
  if (lower.includes('overcast')) {
    return 'Overcast diffused daylight, flat even illumination, minimal shadows, cool 6500K tone'
  }
  if (lower.includes('flash')) {
    return 'Direct flash with harsh frontal light, slight shadow falloff behind subject'
  }

  // Fallback: use first sentence of the lighting description
  const brief = lighting.split('.').slice(0, 2).join('.').trim()
  return brief.length > maxLen ? brief.substring(0, maxLen - 3) + '...' : brief
}
