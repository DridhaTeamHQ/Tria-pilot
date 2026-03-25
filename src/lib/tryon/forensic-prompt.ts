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
  const sceneBrief = isSceneChange ? condenseScene(rawPreset, 200) : ''

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
    `${namePrefix}Same person, identical facial structure, no face variation. Generate a single cohesive photorealistic photograph of the EXACT person from ${personRef} wearing the outfit from ${garmentRef}. This is ONE real photo, not a composite.`
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

  // ── LINE 3: Body + Creative freedom ──
  lines.push(`BODY: Same body type and proportions as ${personRef}. You have FULL creative freedom on pose, expression, camera angle, and body language — choose what looks most natural and compelling for the scene. The person should look like they BELONG in the environment.`)
  lines.push('')

  // ── LINE 4: Garment (explicit — ONLY from garment ref, full outfit) ──
  lines.push(
    `GARMENT: Apply the FULL OUTFIT from ${garmentRef} — ${garment}. Include ALL pieces (top, bottom, layers, accessories) visible in ${garmentRef}. Match the exact color of each piece, pattern, fabric, and design. IGNORE any clothing visible in other images.`
  )
  lines.push('')

  // ── LINE 5: SCENE (holistic — person IS in the scene, not composited) ──
  if (isSceneChange && sceneBrief) {
    lines.push(`SCENE: ${sceneBrief}. This person was actually photographed here — environment light falls on their skin and clothes, ambient colors reflect on their face, shadows are cast by the same light sources. Foreground, subject, and background share one unified perspective and depth of field.`)
  } else {
    lines.push(`SCENE: Keep original background from ${personRef}.`)
  }
  lines.push('')

  // ── LINE 5a: LIGHTING (environmental light interaction) ──
  if (isSceneChange && lightingBrief) {
    lines.push(`LIGHTING: ${lightingBrief}. The environment light FALLS ON the subject — color spill from surroundings tints skin and fabric, shadows match scene light direction, highlights come from the same sources that illuminate the background.`)
  }
  lines.push('')

  // ── LINE 6: OUTPUT (single photograph quality) ──
  lines.push(
    `OUTPUT: Single RAW photograph from one camera, one moment in time. DSLR quality with natural bokeh, visible skin pores, real-world imperfections in environment. NOT a composite or collage. Aspect ratio ${aspectRatio}.`
  )

  // ── LINE 7: Retry (only on retry, minimal) ──
  if (input.retryMode) {
    lines.push(`RETRY: Previous attempt altered the face. Copy face pixels from ${personRef} exactly this time.`)
  }

  // ── LINE 8: Concise avoid (critical items) ──
  lines.push(`AVOID: beautification, skin smoothing, face reshaping, green-screen look, mismatched lighting between subject and background, flat pasted-on appearance.`)

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

  // Allow MORE scene description for environment depth (200 char budget)
  // Keep the first 3 descriptive clauses for spatial/material richness
  if (s.length > maxLen) {
    const clauses = s.split(/[,.]/).filter(c => c.trim().length > 5)
    const kept = clauses.slice(0, 3).join(',').trim()
    s = kept.length > 20 ? kept : s.substring(0, maxLen)
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

  // Extract the main light type — keep SHORT to preserve identity token budget
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
