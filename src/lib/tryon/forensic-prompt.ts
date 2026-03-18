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
}

export function buildForensicPrompt(input: ForensicPromptInput): string {
  const isGPT = Boolean(input.useGPTImageFormat)
  const aspectRatio = input.aspectRatio || '1:1'
  const hasFaceReference = Boolean(input.hasFaceReference)

  // Image references differ between Gemini and GPT Image
  // GPT order: face close-up (1st) → person full-body (2nd) → garment (3rd)
  const faceCropRef = isGPT ? 'the face close-up photo (first image)' : 'Image 3 (close-up)'
  const personRef = isGPT ? 'the person photo' : 'Image 1'
  const garmentRef = isGPT ? 'the garment photo' : 'Image 2'
  const garment = input.garmentDescription?.trim() || `garment from ${garmentRef}`

  // Extract a SHORT scene description (max 120 chars) from the preset
  const rawPreset = input.preset?.trim() || ''
  const keepBgPhrase = isGPT ? 'keep the original background' : 'keep background from Image 1'
  const isSceneChange = rawPreset && rawPreset !== keepBgPhrase
  // Condense scene to just the key environment phrase, strip lighting details
  // Increased from 120→250 to preserve texture/material keywords critical for realistic backgrounds
  const sceneBrief = isSceneChange ? condenseScene(rawPreset, 250) : ''

  // Condense lighting to a very short phrase
  const lightingBrief = isSceneChange && input.lightingBlueprint
    ? condenseLighting(input.lightingBlueprint, 60)
    : ''

  // ═══════════════════════════════════════════════════════════════════════
  // FACE-FIRST PROMPT (research-backed structure)
  // Key insight: front-load face preservation, use drift shield, keep short
  // ═══════════════════════════════════════════════════════════════════════

  const lines: string[] = []

  // ── LINE 0: DRIFT SHIELD — hard constraint that prevents identity wander ──
  // Research: "Change only what I specify; keep likeness" as first line
  // dramatically reduces face drift in GPT Image models
  lines.push(
    `HARD CONSTRAINT: Keep the face from ${personRef} 100% unchanged. Change ONLY the clothing and background. Preserve original facial features, facial symmetry, bone structure, and natural skin texture exactly as they appear in ${personRef}.`
  )
  lines.push('')

  // ── LINE 1: Core task ──
  lines.push(
    `Generate a photorealistic photo of the EXACT same person from ${personRef} wearing the garment from ${garmentRef}.`
  )
  lines.push('')

  // ── LINE 2: Identity anchor (concise + Soul ID) ──
  if (input.identityDNA) {
    // Soul ID available — frozen identity paragraph
    const faceLock = hasFaceReference
      ? `Match the likeness of ${personRef} and ${faceCropRef} exactly.`
      : `Match the likeness of ${personRef} exactly.`
    lines.push(
      `FACE IDENTITY: ${input.identityDNA} ${faceLock} Do not alter eye shape, jawline, nose bridge, lip shape, or skin texture.`
    )
  } else {
    // No Soul ID — generic but strong identity instruction
    const faceLock = hasFaceReference
      ? `Match the likeness of ${personRef} and ${faceCropRef} exactly`
      : `Match the likeness of ${personRef} exactly`
    lines.push(
      `FACE IDENTITY: ${faceLock} — preserve original facial proportions, bone structure, eye shape, nose shape, jawline, skin tone, pores, and perceived age. Do not alter any facial feature.`
    )
  }
  lines.push('')

  // ── LINE 3: Body (one line) ──
  lines.push(`BODY: Same body shape, weight, and proportions as ${personRef}.`)
  lines.push('')

  // ── LINE 4: Garment (brand-level detail to prevent missing collars/buttons) ──
  lines.push(
    `GARMENT: Apply the EXACT outfit from ${garmentRef} — ${garment}. Reproduce EVERY construction detail: collars, buttons, cuffs, hems, pockets, zippers, seams, stitching, and closures exactly as shown. Match exact color, pattern, weave, and fabric texture. Do NOT simplify, omit, or reinterpret any garment feature. IGNORE any clothing visible in other images.`
  )
  lines.push('')

  // ── LINE 5: Scene (ONE short line, only if scene changes) ──
  if (isSceneChange && sceneBrief) {
    const sceneLine = lightingBrief
      ? `SCENE: ${sceneBrief}. ${lightingBrief}.`
      : `SCENE: ${sceneBrief}.`
    lines.push(sceneLine)
  } else {
    lines.push(`SCENE: Keep the original background from ${personRef}.`)
  }
  lines.push('')

  // ── LINE 5b: Pose/Camera (from preset camera guidance) ──
  if (input.cameraGuidance) {
    lines.push(`POSE: ${input.cameraGuidance}.`)
    lines.push('')
  }

  // ── LINE 6: Quality (brand-level realism keywords) ──
  lines.push(
    `OUTPUT: Photorealistic DSLR photo with real-world surface textures (visible fabric weave, material grain, environmental texture detail), natural film grain, visible skin pores, natural depth of field, aspect ratio ${aspectRatio}.`
  )

  // ── LINE 7: Retry (only on retry, minimal) ──
  if (input.retryMode) {
    lines.push(`RETRY: Previous attempt altered the face. This time keep the face IDENTICAL to ${personRef} — same jawline, same eyes, same nose.`)
  }

  // ── LINE 8: Strong avoid (research-backed negatives) ──
  lines.push(`AVOID: face reshaping, face beautification, skin smoothing, altering eye shape, changing jawline, modifying facial proportions, beauty filters.`)

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
