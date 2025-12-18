/**
 * GPT-4o MINI PROMPT COMPOSER - Phase 3
 * 
 * Hard-coded identity and garment role blocks + GPT-4o mini for scene/style only.
 * 
 * ARCHITECTURE:
 * - Identity lock: Hard-coded constant (never modified)
 * - Garment role: Hard-coded constant (never modified)
 * - GPT-4o mini: Only generates scene, pose, lighting, realism, style
 * - Final prompt: IDENTITY_LOCK + GARMENT_ROLE + GPT4O_OUTPUT
 */

import 'server-only'
import { getOpenAI } from '@/lib/openai'
import type { StylePreset } from './style-presets'

// ====================================================================================
// HARD-CODED IDENTITY LOCK BLOCK (VERBATIM, NEVER MODIFIED)
// ====================================================================================

export const IDENTITY_LOCK = `IDENTITY LOCK:
Use Image 1 (the reference image) as the sole and immutable source of identity.
Preserve the same face, facial structure, skin tone, expression, and natural proportions.
Do NOT alter, regenerate, stylize, beautify, or resample the identity.
The output person must be the SAME PERSON as Image 1.`

// ====================================================================================
// HARD-CODED GARMENT ROLE BLOCK (VERBATIM, NEVER MODIFIED)
// ====================================================================================

export const GARMENT_APPLICATION = `GARMENT APPLICATION:
Dress the subject in the garment shown in Image 2.
The garment must match Image 2 exactly in:
- color
- silhouette
- fabric texture
- seam placement
- structure and fit
Do NOT copy identity, pose, or body shape from Image 2.`


// ====================================================================================
// HARD-CODED NEGATIVE CONSTRAINTS BLOCK (VERBATIM, NEVER MODIFIED)
// ====================================================================================

export const NEGATIVE_CONSTRAINTS = `Negative prompt: face change, identity drift, new person, altered face, beauty filters, stylization, illustration, CGI, anime, fantasy styles.`

export interface PromptComposerInput {
  garmentDescription: string // Supporting text only (color + type) - for context only
  stylePreset: StylePreset
  poseHint?: string
  sceneHint?: string
}

export interface FinalPromptParts {
  identityLock: string
  garmentRole: string
  sceneAndStyle: string
  fullPrompt: string
}

/**
 * Build final try-on prompt using hard-coded blocks + GPT-4o mini
 * 
 * Architecture:
 * 1. Identity lock: Hard-coded constant (deterministic)
 * 2. Garment role: Hard-coded constant (deterministic)
 * 3. Scene/style: GPT-4o mini (only scene, pose, lighting, realism)
 * 4. Final assembly: IDENTITY_LOCK + GARMENT_ROLE + GPT4O_OUTPUT
 * 
 * @returns Full assembled prompt with identity lock and garment role
 */
export async function buildFinalTryOnPrompt(
  input: PromptComposerInput
): Promise<string> {
  const { garmentDescription, stylePreset, poseHint, sceneHint } = input

  const openai = getOpenAI()

  const systemPrompt = `You are composing a try-on prompt for scene, lighting, and style.
Identity preservation is handled separately - DO NOT mention it.

YOU MUST ONLY WRITE (SAFE ZONE):
- Scene description (environment, setting, atmosphere)
- Background details
- Lighting description (natural, realistic)
- Pose guidance (relaxed, natural posture with subtle variation)
- Style mood (photorealistic, editorial realism, no stylization)

DO NOT mention:
- Image 1 or Image 2
- Identity preservation rules (handled in IDENTITY LOCK block)
- Garment application rules (handled in GARMENT APPLICATION block)

OUTPUT FORMAT:
- Write ONLY scene, lighting, pose, and style text
- Flow naturally: SCENE → LIGHTING → POSE → STYLE
- Keep it concise and focused
- Example format:
  "SCENE: A natural lifestyle environment with soft daylight.
  POSE: Relaxed, natural posture with subtle variation.
  STYLE: Photorealistic, editorial realism. No stylization."`

  const userPrompt = `Write ONLY the scene, pose, lighting, and style description for a virtual try-on image.

GARMENT CONTEXT (for reference only - Image 2 is the visual source):
${garmentDescription}

STYLE PRESET:
- Environment: ${stylePreset.environment}
- Lighting: ${stylePreset.lighting}
- Camera: ${stylePreset.camera}
- Mood: ${stylePreset.mood}
- Realism Notes: ${stylePreset.realismNotes}

${poseHint ? `POSE HINT: ${poseHint}` : ''}
${sceneHint ? `SCENE HINT: ${sceneHint}` : ''}

Write ONLY the scene, lighting, pose, and style text (SAFE ZONE).
Remember:
- SCENE: Describe the environment and setting
- LIGHTING: Describe lighting (natural, realistic)
- POSE: Describe pose (relaxed, natural posture with subtle variation)
- STYLE: Describe style (photorealistic, editorial realism, no stylization)
- Keep it concise and focused
- Do NOT write identity or garment instructions (handled separately)
- Do NOT mention Image 1 or Image 2
- Output ONLY scene/lighting/pose/style text, nothing else`

  try {
    console.log(`🤖 GPT-4o mini: Composing prompt with style preset "${stylePreset.name}"...`)

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3, // Lower temperature for more consistent, rule-following output
      max_tokens: 800,
    })

    const sceneAndStyleText = response.choices[0]?.message?.content?.trim()

    if (!sceneAndStyleText) {
      throw new Error('GPT-4o mini returned empty scene/style text')
    }

    // VALIDATE GPT-4o mini output (must NOT contain identity/garment rules)
    validateSceneStyleText(sceneAndStyleText)

    // ASSEMBLE FINAL PROMPT: Structured order (MANDATORY - DO NOT REORDER)
    // 1. IDENTITY LOCK (hard-coded, at top - ONLY place identity words exist)
    // 2. GARMENT APPLICATION (hard-coded)
    // 3. SCENE (from GPT-4o mini - SAFE ZONE)
    // 4. LIGHTING (from GPT-4o mini - SAFE ZONE)
    // 5. STYLE (from GPT-4o mini - SAFE ZONE)
    // 6. NEGATIVE PROMPT (optional - ALLOWED)
    const fullPrompt = `${IDENTITY_LOCK}

${GARMENT_APPLICATION}

${sceneAndStyleText}

${NEGATIVE_CONSTRAINTS}`

    // VALIDATE FINAL ASSEMBLED PROMPT (single source of truth for identity safety)
    validateFinalPrompt(fullPrompt)

    console.log(`✅ GPT-4o mini: Scene/style text composed (${sceneAndStyleText.length} chars)`)
    console.log(`✅ Final prompt assembled: ${fullPrompt.length} chars total`)
    console.log(`\n   📋 FINAL ASSEMBLED PROMPT (for inspection):`)
    console.log(`   ${'─'.repeat(70)}`)
    console.log(`   ${fullPrompt.split('\n').map((line, i) => `${i + 1}: ${line}`).join('\n   ')}`)
    console.log(`   ${'─'.repeat(70)}`)
    console.log(`\n   🔍 PROMPT VERIFICATION:`)
    console.log(`      ✅ Identity lock: Present (SACRED block - biometric terms allowed)`)
    console.log(`      ✅ Garment application: Present (Image 2 = clothing reference only)`)
    console.log(`      ✅ Scene/style: Present (from GPT-4o mini - SAFE ZONE)`)
    console.log(`      ✅ Negative prompt: Present (identity drift, face change, filters - ALLOWED)`)
    console.log(`      ✅ Image 1 = identity, Image 2 = garment only`)
    console.log(`      ✅ Final prompt structure: IDENTITY LOCK → GARMENT → SCENE → NEGATIVE`)
    
    return fullPrompt
  } catch (error) {
    console.error('❌ GPT-4o mini prompt composition failed:', error)
    throw error
  }
}

/**
 * Validate GPT-4o mini output (scene/style only)
 * Must NOT contain identity or garment role instructions
 */
function validateSceneStyleText(text: string): void {
  const lowerText = text.toLowerCase()

  // SIMPLIFIED: Only check that GPT-4o mini doesn't write identity/garment rules
  const forbiddenInSceneText = [
    'image 1',
    'image 2',
    'source of identity',
    'garment reference',
    'do not copy identity',
  ]

  for (const term of forbiddenInSceneText) {
    if (lowerText.includes(term)) {
      throw new Error(
        `PROMPT VALIDATION FAILED: GPT-4o mini output contains forbidden identity/garment rule: "${term}". GPT-4o mini must only write scene, lighting, and style.`
      )
    }
  }

  console.log('✅ GPT-4o mini scene/style text validated: No identity/garment rules found')
}

/**
 * Validate final assembled prompt (hard-coded blocks + GPT-4o output)
 * @throws Error if any rule is violated
 */
function validateFinalPrompt(prompt: string): void {
  const lowerPrompt = prompt.toLowerCase()

  // MINIMAL VALIDATION: Only check for required blocks
  // NO biometric word scanning - identity lock block is SACRED and allowed to contain identity words
  
  // REQUIRED: Hard-coded IDENTITY LOCK block must be present
  const hasIdentityLock =
    lowerPrompt.includes('identity lock') &&
    lowerPrompt.includes('use image 1') &&
    (lowerPrompt.includes('sole and immutable source of identity') || lowerPrompt.includes('sole source of identity')) &&
    lowerPrompt.includes('same person as image 1')

  if (!hasIdentityLock) {
    throw new Error(
      'PROMPT VALIDATION FAILED: Missing hard-coded IDENTITY LOCK block. Prompt must include identity lock from Image 1.'
    )
  }

  // REQUIRED: Hard-coded GARMENT APPLICATION block must be present
  const hasGarmentApplication =
    lowerPrompt.includes('garment application') &&
    lowerPrompt.includes('image 2') &&
    lowerPrompt.includes('do not copy identity')

  if (!hasGarmentApplication) {
    throw new Error(
      'PROMPT VALIDATION FAILED: Missing hard-coded GARMENT APPLICATION block. Prompt must include garment application instructions for Image 2.'
    )
  }

  // NO FURTHER VALIDATION - identity lock block is allowed to contain:
  // - facial features
  // - proportions
  // - skin tone
  // - expression
  // These are REQUIRED for identity preservation and are ONLY allowed in the identity lock block

  console.log('✅ Final prompt validation passed: Identity lock and garment application present')
  console.log('✅ Identity lock block is SACRED - biometric terms allowed only in this block')
}


