/**
 * ChatGPT Prompt Orchestrator
 * Generates high-quality prompts with zero-deviation identity preservation
 */

import { getOpenAI } from '@/lib/openai'
import type { GeminiAnalysis } from '@/lib/analysis/gemini-analyzer'
import type { TryOnPreset } from './try-on-presets'
import { buildTryOnPrompt, applySafetyRules, validatePreset } from './prompt-builder'

/**
 * System prompt for ChatGPT - zero deviation rules
 */
const PROMPT_ORCHESTRATOR_SYSTEM = `You are the Prompt Orchestrator.

Your job: keep identity, clothing, face structure, body shape, and real features EXACTLY the same with ZERO DEVIATION.

⛔⛔⛔ CRITICAL FACIAL HAIR RULE ⛔⛔⛔
- If person is CLEAN-SHAVEN → output MUST be CLEAN-SHAVEN (NO beard, NO stubble, NO facial hair added)
- If person HAS A BEARD → output MUST have the EXACT SAME beard style and density
- NEVER add facial hair to a clean-shaven person
- NEVER remove facial hair from a bearded person
- This is NON-NEGOTIABLE

PRESERVE IDENTITY (Zero Deviation):
- Face structure: jaw, cheekbones, eyes, nose, eyebrows, lips - EXACT MATCH
- Gender expression: EXACT MATCH (female/woman stays female/woman, male/man stays male/man) - CRITICAL
- Facial hair: EXACT MATCH (clean-shaven stays clean-shaven, beard stays beard)
- Hair: length, density, placement - EXACT MATCH
- Skin tone and undertone - EXACT MATCH
- Body proportions and shape - EXACT MATCH (preserve gender-specific characteristics: curves, hip-to-waist ratio for women; shoulder width, masculine structure for men)

PRESERVE CLOTHING (Exact Match):
- Garment type: T-shirt stays T-shirt, kurta stays kurta - NO CATEGORY CHANGES
- Color, texture, pattern - EXACT MATCH
- Accessories: ONLY if they exist in input image - NEVER ADD
- Never add: chains, jackets, glasses, earrings, new patterns

PRESERVE BODY LANGUAGE:
- Pose, silhouette, body language - EXACT MATCH

YOU MUST NEVER:
- Hallucinate new items
- Remove items
- Alter hair
- Alter face
- ADD BEARD OR STUBBLE TO CLEAN-SHAVEN PERSON
- Alter gender characteristics (CRITICAL: female/woman MUST stay female/woman, male/man MUST stay male/man)
- Change body proportions that are gender-specific (curves, hip-to-waist ratio, breast shape for women; shoulder width, masculine structure for men)
- Add or remove tattoos, piercings
- Change clothing category

YOUR OUTPUT:
- Merge extracted JSON with user request
- Layer preset style SAFELY (only lighting, camera, environment, cinematic details)
- Maintain identity and clothing EXACTLY
- Maintain body structure EXACTLY
- PRESERVE FACIAL HAIR STATE EXACTLY
- Add ONLY: lighting improvements, camera settings, environment, cinematic detailing

Input: Gemini JSON + Preset + User Request + Model Metadata
Output: Production-level prompt in IDENTITY/BODY/CLOTHING/BACKGROUND/CAMERA format`

/**
 * Dangerous words that must be removed or replaced
 */
const DANGEROUS_WORDS = [
  'add',
  'change',
  'modify',
  'enhance',
  'improve',
  'alter',
  'replace',
  'transform',
  'redesign',
  'update',
  'upgrade',
]

/**
 * Preservation language replacements
 */
const PRESERVATION_REPLACEMENTS: Record<string, string> = {
  'add': 'preserve',
  'change': 'maintain',
  'modify': 'keep exact',
  'enhance': 'preserve exactly',
  'improve': 'maintain identical',
  'alter': 'keep zero deviation',
  'replace': 'preserve',
}

/**
 * Generate prompt from Gemini analysis with preset and user request
 */
/**
 * Build final prompt with preset data directly merged
 * This ensures preset modifiers are ALWAYS included in the final prompt
 * Uses the primary prompt template format
 */
function buildFinalPromptWithPreset(
  analysis: GeminiAnalysis,
  preset: TryOnPreset | null,
  chatGPTPrompt?: string
): string {
  // Validate preset if provided
  if (preset) {
    const validation = validatePreset(preset)
    if (!validation.valid) {
      console.error(`⚠️ Preset "${preset.name}" contains banned verbs:`, validation.errors)
      // Continue anyway but log the issue
    }
  }

  // Build prompt using the unified builder that outputs the exact final format
  let finalPrompt = buildTryOnPrompt('', '', preset)

  // Apply safety rules
  finalPrompt = applySafetyRules(finalPrompt)

  // Final prompt must keep exact structure; do not append extra sections

  return finalPrompt
}

export async function generatePromptFromAnalysis(
  analysis: GeminiAnalysis,
  preset: TryOnPreset | null,
  userRequest?: string,
  modelMetadata?: { model: string; resolution?: string }
): Promise<string> {
  try {
    const openai = getOpenAI()

    // Build user message with analysis, preset, and request
    const userMessage = buildUserMessage(analysis, preset, userRequest, modelMetadata)

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: PROMPT_ORCHESTRATOR_SYSTEM,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      temperature: 0.1, // Low temperature for predictable output
      max_tokens: 2000,
    })

    const content = response.choices[0]?.message?.content
    if (!content || content.trim() === '') {
      throw new Error('Empty response from ChatGPT prompt orchestrator')
    }

    // Apply guardrails to the generated prompt
    const safePrompt = applyGuardrails(content, preset)

    // Validate prompt before returning
    validatePrompt(safePrompt)

    // Build final prompt with preset data directly merged
    const finalPrompt = buildFinalPromptWithPreset(analysis, preset, safePrompt)

    return finalPrompt
  } catch (error) {
    console.error('ChatGPT prompt orchestrator error:', error)

    // If it's an API key error, throw it so the user knows
    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('401') || error.message.includes('invalid_api_key')) {
        console.error('OpenAI API key error - check your OPENAI_API_KEY environment variable')
        throw new Error('OpenAI API key is invalid or not configured correctly. Please check your API key in .env.local')
      }
    }

    // For other errors, build final prompt with preset data directly (no ChatGPT)
    console.warn('Using direct preset merge due to ChatGPT error')
    const finalPrompt = buildFinalPromptWithPreset(analysis, preset)
    return finalPrompt
  }
}

/**
 * Build user message with all context
 */
function buildUserMessage(
  analysis: GeminiAnalysis,
  preset: TryOnPreset | null,
  userRequest?: string,
  modelMetadata?: { model: string; resolution?: string }
): string {
  let message = `Extracted Analysis JSON:\n${JSON.stringify(analysis, null, 2)}\n\n`

  // Get camera style once for use throughout
  const cameraStyle = preset?.camera_style || null

  if (preset) {
    console.log(`📋 Building prompt with preset: ${preset.name}`)
    message += `🎨 PRESET STYLE SELECTED - APPLY THIS STYLE:\n`
    message += `- Name: ${preset.name}\n`
    message += `- Description: ${preset.description}\n`

    // Handle both old and new preset formats
    if (preset.positive && preset.positive.length > 0) {
      message += `- Positive modifiers (MUST include these): ${preset.positive.join(', ')}\n`
    }
    if (preset.negative && preset.negative.length > 0) {
      message += `- Negative modifiers (MUST avoid these): ${preset.negative.join(', ')}\n`
    }
    if (preset.deviation !== undefined) {
      message += `- Allowed deviation: ${preset.deviation} (lower = stricter identity preservation)\n`
    }

    // Background/Scene
    if (preset.background) {
      message += `- Background/Scene: ${preset.background}\n`
    }

    // Camera settings
    if (cameraStyle) {
      message += `- Camera Settings:\n`
      if (cameraStyle.angle) message += `  * Angle: ${cameraStyle.angle}\n`
      if (cameraStyle.lens) message += `  * Lens: ${cameraStyle.lens}\n`
      if (cameraStyle.framing) message += `  * Framing: ${cameraStyle.framing}\n`
      if ('depthOfField' in cameraStyle && cameraStyle.depthOfField) {
        message += `  * Depth of Field: ${cameraStyle.depthOfField}\n`
      }
    }

    // Lighting settings
    if (preset.lighting) {
      message += `- Lighting Settings:\n`
      if (preset.lighting.type) message += `  * Type: ${preset.lighting.type}\n`
      if (preset.lighting.source) message += `  * Source: ${preset.lighting.source}\n`
      if (preset.lighting.direction) message += `  * Direction: ${preset.lighting.direction}\n`
      if (preset.lighting.quality) message += `  * Quality: ${preset.lighting.quality}\n`
      if (preset.lighting.colorTemp) message += `  * Color Temperature: ${preset.lighting.colorTemp}\n`
    }

    // Background Elements (people, objects, atmosphere)
    if (preset.backgroundElements) {
      message += `- Scene Elements (IMPORTANT for realism):\n`
      if (preset.backgroundElements.people) message += `  * People in Background: ${preset.backgroundElements.people}\n`
      if (preset.backgroundElements.objects) message += `  * Objects/Props: ${preset.backgroundElements.objects}\n`
      if (preset.backgroundElements.atmosphere) message += `  * Scene Atmosphere: ${preset.backgroundElements.atmosphere}\n`
    }

    // Pose guidance
    if (preset.pose) {
      message += `- Pose Guidance (apply to subject):\n`
      if (preset.pose.stance) message += `  * Stance: ${preset.pose.stance}\n`
      if (preset.pose.arms) message += `  * Arms: ${preset.pose.arms}\n`
      if (preset.pose.expression) message += `  * Expression: ${preset.pose.expression}\n`
      if (preset.pose.energy) message += `  * Energy: ${preset.pose.energy}\n`
      if (preset.pose.bodyAngle) message += `  * Body Angle: ${preset.pose.bodyAngle}\n`
    }

    // Note: Legacy instructions field removed for safety (could contain banned verbs)

    message += `\n⚠️ CRITICAL PRESET APPLICATION RULES:\n`
    message += `1. Apply preset ONLY to: background, lighting, camera angle/lens, environment, mood, color grading, POSE GUIDANCE\n`
    message += `2. NEVER apply preset to: FACE (must be IDENTICAL to input), hair color, body shape, clothing type/color/pattern\n`
    message += `3. FACE IDENTITY IS SACRED - never change any facial feature\n`
    message += `4. Include specified background PEOPLE and OBJECTS for realism\n`
    message += `5. Apply pose guidance to body position (but keep FACE identical)\n`
    message += `6. Avoid negative modifiers completely\n\n`
  } else {
    message += `📝 NO PRESET SELECTED - Use default (clothing swap only, preserve original background/lighting)\n\n`
  }

  if (userRequest) {
    message += `User Request: ${userRequest}\n\n`
  }

  if (modelMetadata) {
    message += `Model Metadata: ${JSON.stringify(modelMetadata)}\n\n`
  }

  message += `Generate a production-level prompt in this EXACT format:\n\n`
  message += `IDENTITY:\n[Preserve EXACT face structure (jawline, cheekbones, eyes, nose, lips - IDENTICAL to input), hair (length/color/texture), skin tone from analysis JSON. CRITICAL: Preserve gender_expression EXACTLY - if person is female/woman, output MUST be female/woman with correct body proportions, curves, and characteristics. If person is male/man, output MUST be male/man. NEVER alter gender characteristics.]\n\n`
  message += `BODY:\n[Preserve body proportions from analysis JSON EXACTLY. If gender_expression is female/woman: preserve natural curves, hip-to-waist ratio, breast shape, and feminine body characteristics. If gender_expression is male/man: preserve masculine body structure, shoulder width, and male proportions. Apply pose guidance from preset if specified, but NEVER alter gender-specific body characteristics.]\n\n`
  message += `CLOTHING:\n[Preserve EXACT garment type, color, pattern, texture from analysis JSON]\n\n`
  if (preset) {
    const backgroundDesc = preset.background || (preset.positive?.join(', ') || 'preset style')
    const lightingDesc = preset.lighting
      ? `${preset.lighting.type} from ${preset.lighting.source}, ${preset.lighting.quality}, ${preset.lighting.colorTemp}`
      : 'apply preset lighting'
    const cameraDesc = cameraStyle
      ? `${cameraStyle.angle || 'preset'} angle, ${cameraStyle.lens || 'preset'} lens, ${cameraStyle.framing || 'preset'} framing${'depthOfField' in cameraStyle && cameraStyle.depthOfField ? `, ${cameraStyle.depthOfField} depth of field` : ''}`
      : 'preset camera settings'

    // Build scene elements description
    let sceneElements = ''
    if (preset.backgroundElements) {
      if (preset.backgroundElements.people) sceneElements += `People: ${preset.backgroundElements.people}. `
      if (preset.backgroundElements.objects) sceneElements += `Objects: ${preset.backgroundElements.objects}. `
      if (preset.backgroundElements.atmosphere) sceneElements += `Atmosphere: ${preset.backgroundElements.atmosphere}. `
    }

    message += `BACKGROUND:\n[Apply preset "${preset.name}": ${backgroundDesc}. ${sceneElements}Lighting: ${lightingDesc}. Use positive modifiers: ${preset.positive?.join(', ') || 'preset style'}]\n\n`
    message += `CAMERA:\n[Apply preset camera: ${cameraDesc}]\n\n`

    // Add pose if specified
    if (preset.pose) {
      message += `POSE:\n[Apply: ${preset.pose.stance}. Arms: ${preset.pose.arms}. Expression: ${preset.pose.expression}. Energy: ${preset.pose.energy}${preset.pose.bodyAngle ? `. Body angle: ${preset.pose.bodyAngle}` : ''}]\n\n`
    }
  } else {
    message += `BACKGROUND:\n[Keep original background and lighting from analysis JSON - NO changes]\n\n`
    message += `CAMERA:\n[Match original camera settings from analysis JSON - NO changes]\n\n`
  }
  message += `QUALITY:\n[Realistic details, natural textures, authentic lighting, photorealistic, no AI artifacts]`

  return message
}

/**
 * Apply guardrails to remove dangerous language
 */
function applyGuardrails(prompt: string, preset: TryOnPreset | null): string {
  let safePrompt = prompt

  // Remove dangerous words when referring to face/hair/body/clothing
  const dangerousPatterns = [
    /(add|change|modify|enhance|improve|alter|replace)\s+(hair|face|body|clothing|skin|eyes|nose|mouth|jaw|cheekbones)/gi,
    /(add|change|modify|enhance|improve|alter|replace)\s+(the|their|the person's)\s+(hair|face|body|clothing|skin|eyes|nose|mouth|jaw|cheekbones)/gi,
  ]

  dangerousPatterns.forEach((pattern) => {
    safePrompt = safePrompt.replace(pattern, (match, verb, noun) => {
      const replacement = PRESERVATION_REPLACEMENTS[verb.toLowerCase()] || 'preserve'
      return `${replacement} ${noun}`
    })
  })

  // Enforce preservation language for identity elements
  const identityElements = ['face', 'hair', 'skin', 'body', 'eyes', 'nose', 'mouth', 'jaw', 'cheekbones', 'eyebrows']
  identityElements.forEach((element) => {
    const regex = new RegExp(`(\\w+)\\s+${element}`, 'gi')
    safePrompt = safePrompt.replace(regex, (match, verb) => {
      if (DANGEROUS_WORDS.includes(verb.toLowerCase())) {
        return `preserve ${element}`
      }
      return match
    })
  })

  // Add explicit preservation statements if missing
  if (!safePrompt.includes('preserve') && !safePrompt.includes('maintain') && !safePrompt.includes('keep exact')) {
    safePrompt = `PRESERVE IDENTITY EXACTLY - ${safePrompt}`
  }

  return safePrompt
}

/**
 * Validate prompt doesn't contain dangerous language
 */
function validatePrompt(prompt: string): void {
  const lowerPrompt = prompt.toLowerCase()

  // Check for dangerous patterns
  const criticalPatterns = [
    /add\s+(hair|face|body|clothing|accessories|chains|jackets|glasses|earrings)/i,
    /change\s+(hair|face|body|clothing|gender|ethnicity)/i,
    /modify\s+(hair|face|body|clothing)/i,
    /alter\s+(hair|face|body|clothing)/i,
    /replace\s+(hair|face|body|clothing)/i,
  ]

  for (const pattern of criticalPatterns) {
    if (pattern.test(prompt)) {
      throw new Error(`Prompt contains dangerous language that would modify identity: ${pattern}`)
    }
  }
}

/**
 * Generate fallback prompt if ChatGPT fails
 */
function generateFallbackPrompt(analysis: GeminiAnalysis, preset: TryOnPreset | null): string {
  let prompt = `IDENTITY:\n`
  prompt += `- Preserve exact face structure: ${analysis.person.face_shape}, ${analysis.person.eye_shape} eyes, ${analysis.person.nose_shape} nose, ${analysis.person.lips} lips\n`
  prompt += `- CRITICAL: Preserve exact gender expression: ${analysis.person.gender_expression} - output MUST match this exactly\n`
  prompt += `- Preserve exact hair: ${analysis.person.hair_length}, ${analysis.person.hair_texture}, ${analysis.person.hair_color}\n`
  prompt += `- Preserve exact skin tone: ${analysis.person.skin_tone}\n`
  prompt += `- Preserve exact body proportions: ${analysis.body.build}, ${analysis.body.height_range}\n`
  if (analysis.person.gender_expression?.toLowerCase().includes('female') || analysis.person.gender_expression?.toLowerCase().includes('woman')) {
    prompt += `- CRITICAL FOR WOMEN: Preserve natural curves, hip-to-waist ratio, breast shape, and all feminine body characteristics\n`
  } else if (analysis.person.gender_expression?.toLowerCase().includes('male') || analysis.person.gender_expression?.toLowerCase().includes('man')) {
    prompt += `- CRITICAL FOR MEN: Preserve masculine body structure, shoulder width, and male proportions\n`
  }
  prompt += `\n`

  prompt += `BODY:\n`
  prompt += `- Preserve exact pose: ${analysis.body.pose}\n`
  prompt += `- Preserve exact silhouette and body language\n\n`

  prompt += `CLOTHING:\n`
  prompt += `- Preserve exact garment type: ${analysis.clothing.upper_wear_type}\n`
  prompt += `- Preserve exact color: ${analysis.clothing.upper_wear_color}\n`
  prompt += `- Preserve exact pattern: ${analysis.clothing.upper_wear_pattern || 'none'}\n`
  prompt += `- Preserve exact texture: ${analysis.clothing.upper_wear_texture}\n`
  if (analysis.accessories.length > 0) {
    prompt += `- Preserve exact accessories: ${analysis.accessories.join(', ')}\n`
  } else {
    prompt += `- NO accessories to add - do not add any\n`
  }
  prompt += `\n`

  if (preset) {
    prompt += `BACKGROUND:\n`
    if (preset.background) {
      prompt += `- ${preset.background}\n`
    } else if (preset.positive && preset.positive.length > 0) {
      prompt += `- Apply preset style: ${preset.positive.join(', ')}\n`
    }
    prompt += `- Original lighting: ${analysis.background.lighting}\n\n`

    prompt += `CAMERA:\n`
    if (preset.camera_style) {
      prompt += `- Angle: ${preset.camera_style.angle}\n`
      prompt += `- Lens: ${preset.camera_style.lens}\n`
      prompt += `- Framing: ${preset.camera_style.framing}\n`
    }
    prompt += `\n`
  } else {
    prompt += `BACKGROUND:\n`
    prompt += `- Keep original background: ${analysis.background.environment}\n`
    prompt += `- Keep original lighting: ${analysis.background.lighting}\n\n`

    prompt += `CAMERA:\n`
    prompt += `- Match original camera settings\n\n`
  }

  prompt += `QUALITY:\n`
  prompt += `- Realistic skin details with natural imperfections\n`
  prompt += `- Authentic fabric texture and behavior\n`
  prompt += `- Natural lighting and shadows\n`
  prompt += `- No AI artifacts or over-processing\n`
  prompt += `- Photorealistic output`

  return prompt
}

