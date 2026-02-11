/**
 * AD PROMPT BUILDER — GPT-4o Intelligent Prompt Crafting
 *
 * Replaces static templates with GPT-4o powered prompt generation.
 * Takes: preset config + product analysis + character config + text overlay
 * Returns: production-quality image generation prompt.
 */
import 'server-only'
import { getOpenAI } from '@/lib/openai'
import {
  type AdGenerationInput,
  type AdPreset,
  getAdPreset,
  buildFallbackPrompt,
} from './ad-styles'

const PROMPT_MODEL = process.env.AD_PROMPT_MODEL?.trim() || 'gpt-4o'

export interface ProductAnalysis {
  garmentType?: string
  fabric?: string
  pattern?: string
  color?: string
  fitStyle?: string
  [key: string]: unknown
}

export interface AdPromptResult {
  prompt: string
  model: string
  fallback: boolean
}

/**
 * Build a production-quality image generation prompt using GPT-4o.
 *
 * GPT-4o receives:
 *  - The preset's scene/lighting/camera guides
 *  - The product analysis from the image
 *  - Character configuration
 *  - Text overlay configuration
 *
 * It produces a single cohesive prompt optimised for Gemini image generation.
 */
export async function buildAdPrompt(
  input: AdGenerationInput,
  productAnalysis?: ProductAnalysis | null,
  faceAnchor?: string | null
): Promise<AdPromptResult> {
  const preset = getAdPreset(input.preset)
  if (!preset) {
    throw new Error(`Unknown preset: ${input.preset}`)
  }

  try {
    const prompt = await buildPromptWithGPT(preset, input, productAnalysis, faceAnchor)
    return { prompt, model: PROMPT_MODEL, fallback: false }
  } catch (err) {
    console.warn('[AdPromptBuilder] GPT prompt build failed, using fallback:', err)
    const prompt = buildFallbackPrompt(input)
    return { prompt, model: 'fallback', fallback: true }
  }
}

// ═══════════════════════════════════════════════════════════════
// GPT-4o PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════

async function buildPromptWithGPT(
  preset: AdPreset,
  input: AdGenerationInput,
  productAnalysis?: ProductAnalysis | null,
  faceAnchor?: string | null
): Promise<string> {
  const openai = getOpenAI()

  const systemMessage = buildSystemMessage()
  const userMessage = buildUserMessage(preset, input, productAnalysis, faceAnchor)

  const response = await openai.chat.completions.create({
    model: PROMPT_MODEL,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.3,
    max_tokens: 800,
  })

  const text = response.choices[0]?.message?.content?.trim()
  if (!text || text.length < 50) {
    throw new Error('GPT returned empty or too-short prompt')
  }

  console.log(`[AdPromptBuilder] GPT-4o prompt built (${text.length} chars)`)
  return text
}

function buildSystemMessage(): string {
  return `You are a world-class advertising art director and prompt engineer.

Your job: take a preset brief + product details + character spec + text overlay spec and produce a SINGLE, cohesive image-generation prompt optimised for Gemini image generation.

Rules:
1. Output ONLY the final prompt text. No explanations, no JSON wrapping, no markdown.
2. The prompt must be photorealistic commercial photography quality unless the preset explicitly says otherwise.
3. Be precise about lighting direction, camera lens, composition, and colour palette.
4. If a character is described, include their appearance naturally but NEVER add demographic details beyond what is provided.
5. If a face anchor is provided (for identity lock), embed it word-for-word as an identity preservation instruction.
6. If text overlay is requested, describe EXACTLY where and how text appears in the image — font style, size relative to frame, colour, placement.
7. End with a concise negative instruction line listing what to avoid.
8. Keep the prompt between 150-500 words. Dense, specific, no fluff.
9. Do NOT use words that trigger identity reinterpretation: "cinematic portrait", "dramatic", "artistic", "editorial beauty" (unless the preset specifically calls for editorial style).
10. Product must be the hero — clearly visible, correctly coloured, natural fabric behaviour.`
}

function buildUserMessage(
  preset: AdPreset,
  input: AdGenerationInput,
  productAnalysis?: ProductAnalysis | null,
  faceAnchor?: string | null
): string {
  const sections: string[] = []

  // 1. Preset brief
  sections.push(`## PRESET: ${preset.name} (${preset.category})
Scene: ${preset.sceneGuide}
Lighting: ${preset.lightingGuide}
Camera: ${preset.cameraGuide}
Avoid: ${preset.avoid.join(', ')}`)

  // 2. Product analysis
  if (productAnalysis) {
    const pa = productAnalysis
    sections.push(`## PRODUCT (from image analysis)
Type: ${pa.garmentType || 'fashion product'}
Fabric: ${pa.fabric || 'unknown'}
Pattern: ${pa.pattern || 'solid'}
Colour: ${pa.color || 'as visible in image'}
Fit: ${pa.fitStyle || 'standard'}`)
  } else {
    sections.push(`## PRODUCT
The product image is provided as Image 1. Describe and integrate it naturally based on what you see.`)
  }

  // 3. Character
  const ct = input.characterType || 'none'
  if (ct !== 'none') {
    if (ct === 'animal') {
      sections.push(`## CHARACTER
Type: Photorealistic ${input.animalType || 'animal'}
Style: ${input.characterStyle || 'natural'}
The animal wears or interacts with the product naturally.`)
    } else {
      const gender = ct === 'human_male' ? 'man' : 'woman'
      sections.push(`## CHARACTER
Gender: ${gender}
Age range: ${input.characterAge || input.subject?.ageRange || '22-30'}
Style: ${input.characterStyle || 'natural, confident'}
Pose: ${input.subject?.pose || 'natural, relaxed'}
Expression: ${input.subject?.expression || 'confident'}`)
    }
  }

  // 4. Face identity lock
  if (faceAnchor && input.lockFaceIdentity) {
    sections.push(`## FACE IDENTITY LOCK (CRITICAL)
The person in the influencer reference image is authoritative. Preserve EXACT facial structure:
${faceAnchor}
Do NOT alter face geometry, eye shape, skin tone, or facial features. The face from the reference is immutable.
The reference person image is passed as a separate image input — treat those pixels as ground truth.`)
  }

  // 5. Text overlay
  if (input.textOverlay) {
    const to = input.textOverlay
    const parts: string[] = []
    if (to.headline) parts.push(`Main headline: "${to.headline}"`)
    if (to.subline) parts.push(`Secondary text: "${to.subline}"`)
    if (to.tagline) parts.push(`Tagline/CTA: "${to.tagline}"`)
    if (to.placement) parts.push(`Placement: ${to.placement} area of the image`)
    if (to.fontStyle) parts.push(`Font style: ${to.fontStyle}`)

    if (parts.length > 0) {
      sections.push(`## TEXT IN IMAGE
${parts.join('\n')}
The text must be clearly legible, well-integrated with the composition, and not obscure the product.`)
    }
  }

  // 6. Final instruction
  sections.push(`## OUTPUT
Write a single cohesive prompt for Gemini image generation combining all the above.
Product visibility and realism are the top priorities.`)

  return sections.join('\n\n')
}
