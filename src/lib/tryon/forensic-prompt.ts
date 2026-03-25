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
  // Use the full scene description so Gemini understands the preset deeply
  const sceneBrief = isSceneChange ? input.preset : ''

  // Provide the full lighting blueprint for realistic integration
  const lightingBrief = isSceneChange && input.lightingBlueprint
    ? input.lightingBlueprint
    : ''

  // ═══════════════════════════════════════════════════════════════════════
  // CLEAN, CREATIVE PROMPT — ~400-600 chars total
  // Let 4o be creative. Only lock: face identity + garment design.
  // Everything else (pose, angle, expression, lighting, depth) = 4o's choice.
  // ═══════════════════════════════════════════════════════════════════════

  const lines: string[] = []

  // ── BLOCK 1: WHO (face identity — first position for max attention) ──
  const namePrefix = input.nameAnchor ? `${input.nameAnchor}. ` : ''
  if (input.identityDNA) {
    lines.push(
      `${namePrefix}Photograph this exact person: ${input.identityDNA} Use ${personRef}${hasFaceReference ? ` and ${faceCropRef}` : ''} as face reference — same face, same features, same person.`
    )
  } else {
    lines.push(
      `${namePrefix}Photograph the exact person from ${personRef}${hasFaceReference ? ` and ${faceCropRef}` : ''} — same face, same features, same skin, same person.`
    )
  }
  lines.push('')

  // ── BLOCK 2: WHAT (garment — must be strong enough for 4o to follow) ──
  lines.push(
    `OUTFIT: Put this person in the COMPLETE outfit shown in ${garmentRef} — ${garment}. Copy every piece of clothing visible in ${garmentRef}: top, bottom, layers, accessories, shoes. Match the exact colors, patterns, and fabric from ${garmentRef}. Do NOT keep any clothing from ${personRef}. The outfit must come ONLY from ${garmentRef}.`
  )
  lines.push('')

  if (isSceneChange && sceneBrief) {
    lines.push(
      `Scene Environment: ${sceneBrief}.
Lighting & Atmosphere: ${lightingBrief || 'Natural lighting'}
Photograph this person as if they were actually in this exact environment. Ensure their lighting matches the environment lighting perfectly. One cohesive, photorealistic photograph, ${aspectRatio} aspect ratio.`
    )
  } else {
    lines.push(
      `Keep original background from ${personRef}. Photorealistic, ${aspectRatio} aspect ratio.`
    )
  }

  // ── RETRY (only if previous attempt failed) ──
  if (input.retryMode) {
    lines.push('')
    lines.push(`IMPORTANT: Previous attempt changed the face. This time, copy the face from ${personRef} exactly.`)
  }

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
