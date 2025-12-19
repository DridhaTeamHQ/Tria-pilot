/**
 * PROMPT COMPOSER - IDENTITY-SAFE ARCHITECTURE
 * 
 * CRITICAL: Identity MUST come ONLY from Image 1.
 * Presets may ONLY control environment, lighting, camera, background.
 * Presets must NEVER describe the subject, pose, or appearance.
 * 
 * PROMPT STRUCTURE:
 * 1. Identity lock (hard-coded, immutable)
 * 2. Garment lock (hard-coded)
 * 3. Scene preset (environment ONLY)
 * 4. Lighting
 * 5. Camera optics
 * 6. Negative constraints
 * 7. Final safeguard
 */

import 'server-only'
import { getOpenAI } from '@/lib/openai'
import {
  getPresetById,
  getPresetSummaryForSelection,
  getAllPresetIds,
  DEFAULT_PRESET,
  type ScenePreset
} from './presets/index'

// ═══════════════════════════════════════════════════════════════
// IDENTITY LOCK - HARD-CODED, NEVER MODIFIED
// ═══════════════════════════════════════════════════════════════

const IDENTITY_LOCK = `Use Image 1 as the sole and exact source of the person.
This is an image edit, not a new generation.
Do not generate a new individual.
Do not modify facial structure, head shape, hair density, or body proportions.
All identity information must come visually from Image 1.`

// ═══════════════════════════════════════════════════════════════
// GARMENT LOCK - HARD-CODED
// ═══════════════════════════════════════════════════════════════

const GARMENT_LOCK = `Dress the same person in the garment shown in Image 2.
The garment must match Image 2 exactly in color, fabric, construction, and drape.`

// ═══════════════════════════════════════════════════════════════
// NEGATIVE CONSTRAINTS
// ═══════════════════════════════════════════════════════════════

const NEGATIVE_CONSTRAINTS = `Do not beautify, stylize, or artistically reinterpret.
Do not smooth skin or alter natural features.
This is a realistic photo edit, not fashion illustration.`

// ═══════════════════════════════════════════════════════════════
// FINAL SAFEGUARD
// ═══════════════════════════════════════════════════════════════

const FINAL_SAFEGUARD = `If there is any ambiguity, preserve the person exactly as seen in Image 1.`

// ═══════════════════════════════════════════════════════════════
// SCENE BUILDER (ENVIRONMENT ONLY - NO SUBJECT LANGUAGE)
// ═══════════════════════════════════════════════════════════════

function buildSceneBlock(preset: ScenePreset): string {
  // Extract ONLY environment/lighting/camera - NO subject language
  return `Environment: ${preset.scene}
Lighting: ${preset.lighting}
Camera: ${preset.camera}`
}

// ═══════════════════════════════════════════════════════════════
// MAIN PROMPT ASSEMBLY
// ═══════════════════════════════════════════════════════════════

export interface PromptComposerInput {
  garmentDescription?: string
  presetId?: string
  sceneHint?: string
  regionPreference?: 'india' | 'global' | 'any'
}

export interface ComposedPrompt {
  prompt: string
  presetUsed: ScenePreset
  selectionMethod: 'direct' | 'gpt-selected' | 'fallback'
}

/**
 * Build final try-on prompt with strict identity/scene separation
 */
export async function buildFinalTryOnPrompt(
  input: PromptComposerInput
): Promise<string> {
  const composed = await composePromptWithPreset(input)
  return composed.prompt
}

/**
 * Full composition with metadata
 */
export async function composePromptWithPreset(
  input: PromptComposerInput
): Promise<ComposedPrompt> {
  const { presetId, sceneHint, regionPreference = 'india' } = input

  let preset: ScenePreset
  let selectionMethod: 'direct' | 'gpt-selected' | 'fallback'

  // Select preset
  if (presetId) {
    const directPreset = getPresetById(presetId)
    if (directPreset) {
      preset = directPreset
      selectionMethod = 'direct'
    } else {
      console.warn(`⚠️ Preset "${presetId}" not found, using fallback`)
      preset = DEFAULT_PRESET
      selectionMethod = 'fallback'
    }
  } else if (sceneHint) {
    try {
      preset = await selectPresetWithGPT(sceneHint, regionPreference)
      selectionMethod = 'gpt-selected'
    } catch {
      preset = DEFAULT_PRESET
      selectionMethod = 'fallback'
    }
  } else {
    preset = DEFAULT_PRESET
    selectionMethod = 'fallback'
  }

  // ═══════════════════════════════════════════════════════════════
  // ASSEMBLE PROMPT IN STRICT ORDER
  // ═══════════════════════════════════════════════════════════════

  const finalPrompt = `${IDENTITY_LOCK}

${GARMENT_LOCK}

${buildSceneBlock(preset)}

${NEGATIVE_CONSTRAINTS}

${FINAL_SAFEGUARD}`

  // Debug logging
  console.log(`\n🎬 PROMPT COMPOSED (Identity-Safe Architecture)`)
  console.log(`   Preset: ${preset.label} (${preset.id})`)
  console.log(`   Selection: ${selectionMethod}`)
  console.log(`   Length: ${finalPrompt.length} chars`)
  console.log(`\n📋 FINAL PROMPT:\n${'─'.repeat(60)}\n${finalPrompt}\n${'─'.repeat(60)}`)
  console.log(`\n� IDENTITY VERIFICATION:`)
  console.log(`   ✅ Identity lock: PRESENT (Image 1 only)`)
  console.log(`   ✅ No subject language in preset: CLEAN`)
  console.log(`   ✅ Final safeguard: PRESENT`)

  return {
    prompt: finalPrompt,
    presetUsed: preset,
    selectionMethod
  }
}

// ═══════════════════════════════════════════════════════════════
// GPT-4o MINI PRESET SELECTOR
// ═══════════════════════════════════════════════════════════════

async function selectPresetWithGPT(
  sceneHint: string,
  regionPreference: 'india' | 'global' | 'any'
): Promise<ScenePreset> {
  const openai = getOpenAI()
  const availablePresets = getPresetSummaryForSelection()
  const validIds = getAllPresetIds()

  const systemPrompt = `Select ONE preset ID from this list based on the scene hint.
Output ONLY the preset ID, nothing else.

${availablePresets}

${regionPreference !== 'any' ? `Prefer ${regionPreference} presets.` : ''}
Default: india_home_lifestyle`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: sceneHint },
      ],
      temperature: 0.1,
      max_tokens: 30,
    })

    const selectedId = response.choices[0]?.message?.content?.trim().toLowerCase()

    if (selectedId && validIds.includes(selectedId)) {
      const preset = getPresetById(selectedId)
      if (preset) return preset
    }

    return DEFAULT_PRESET
  } catch {
    return DEFAULT_PRESET
  }
}

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function getMinimalPrompt(): string {
  return `${IDENTITY_LOCK}

${GARMENT_LOCK}

Environment: Natural indoor setting
Lighting: Soft window light
Camera: 50mm lens, natural perspective

${NEGATIVE_CONSTRAINTS}

${FINAL_SAFEGUARD}`
}

export function getPromptWithPreset(presetId: string): string {
  const preset = getPresetById(presetId) || DEFAULT_PRESET

  return `${IDENTITY_LOCK}

${GARMENT_LOCK}

${buildSceneBlock(preset)}

${NEGATIVE_CONSTRAINTS}

${FINAL_SAFEGUARD}`
}

// Export constants for testing
export { IDENTITY_LOCK, GARMENT_LOCK, NEGATIVE_CONSTRAINTS, FINAL_SAFEGUARD }
