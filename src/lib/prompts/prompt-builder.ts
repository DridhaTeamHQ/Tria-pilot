/**
 * Primary Prompt Builder
 * Builds prompts following the exact template format specified
 */

import type { GeminiAnalysis } from '@/lib/analysis/gemini-analyzer'
import type { TryOnPreset } from './try-on-presets'

/**
 * Banned verbs that must never appear in presets
 */
export const BANNED_VERBS = [
  'add',
  'change',
  'alter',
  'modify',
  'transform',
  'adjust',
  'replace',
  'remove',
  'reposition',
  'rotate',
  'tilt',
] as const

/**
 * Build the primary prompt following the exact template format
 */
export function buildPrompt(
  analysis: GeminiAnalysis,
  preset: TryOnPreset | null,
  clothingDescription?: string
): string {
  // Base instruction
  const baseInstruction = `You are performing STRICT IMAGE EDITING with FACE IDENTITY LOCK.
  
Rules:
- FACE LOCK: The facial features (eyes, nose, lips, jawline, skin tone) must be IDENTICAL to the input
- CAN CHANGE: Pose, expression, background, lighting, clothing, accessories
- CANNOT CHANGE: Facial bone structure, eye/nose/lip shape, skin tone, age, ethnicity

FACE IDENTITY VERIFICATION:
- The person in the output MUST be recognizable as the SAME PERSON from the input
- If someone who knows this person saw the output, they should immediately recognize them
- Copy exact: jawline shape, cheekbone position, eye shape, nose bridge width, lip fullness

ANTI-BEAUTIFICATION (CRITICAL):
- Face SHAPE: Preserve EXACTLY - round face stays round, DO NOT slim or elongate
- CHEEKS: Full cheeks MUST stay full - DO NOT reduce cheek fullness
- NOSE: Preserve exact nose WIDTH - DO NOT thin or narrow the nose bridge
- The AI naturally wants to "beautify" - RESIST this tendency completely`

  // Scene Style (from preset positive modifiers)
  const sceneStyle = preset?.positive && preset.positive.length > 0
    ? preset.positive.join('\n')
    : 'Natural, realistic atmosphere with authentic lighting and composition.'

  // Avoid (from preset negative modifiers)
  const avoid = preset?.negative && preset.negative.length > 0
    ? preset.negative.join('\n')
    : 'No reinterpretation of facial structure, pose, or anatomy.'

  // Build preset-specific sections if preset exists
  let presetSections = ''
  if (preset) {
    presetSections = `\n\nPRESET: ${preset.name}\n`

    // Background
    if (preset.background) {
      presetSections += `Background: ${preset.background}\n`
    }

    // Lighting
    if (preset.lighting) {
      presetSections += `Lighting: ${preset.lighting.type} from ${preset.lighting.source}, ${preset.lighting.direction} direction, ${preset.lighting.quality} quality, ${preset.lighting.colorTemp} color temperature\n`
    }

    // Camera
    if (preset.camera_style) {
      presetSections += `Camera: ${preset.camera_style.angle} angle, ${preset.camera_style.lens} lens, ${preset.camera_style.framing} framing`
      if (preset.camera_style.depthOfField) {
        presetSections += `, ${preset.camera_style.depthOfField} depth of field`
      }
      presetSections += `\n`
    }

    // Deviation notes
    if (preset.deviation !== undefined) {
      const deviationNote = preset.deviation <= 0.1
        ? 'STRICT: Apply preset style conservatively, minimal changes to scene.'
        : preset.deviation <= 0.15
          ? 'MODERATE: Apply preset style with balanced artistic freedom.'
          : 'FLEXIBLE: Apply preset style with more creative interpretation, but still preserve identity.'
      presetSections += `Deviation: ${preset.deviation} - ${deviationNote}\n`
    }
  }

  // Clothing description
  const clothingDesc = clothingDescription || buildClothingDescription(analysis)

  // Safety stability lines
  const safetyLines = `CRITICAL SAFETY RULES:
- Preserve exact facial structure, skin tone, hair, and body proportions
- Maintain original pose and expression
- Apply clothing with accurate fit, texture, and color
- Only scene atmosphere, lighting, and camera feel may be influenced by preset
- No physical alterations to the person`

  // Assemble final prompt
  const prompt = `${baseInstruction}

Scene Style:

${sceneStyle}

Avoid:

${avoid}${presetSections}

Clothing:

${clothingDesc}

${safetyLines}

Output:

A realistic try-on photograph of the same person, wearing the clothing, harmonized with the style mood described above.`

  return prompt
}

const FORBIDDEN_PHRASES = [
  'change pose',
  'alter face',
  'modify body',
  'adjust expression',
  'reconstruct',
  'reshape',
  'transform',
]

const SAFE_REPLACEMENTS: Record<string, string> = {
  'change pose': 'same pose',
  'alter face': 'same face',
  'modify body': 'preserve identity',
  'adjust expression': 'keep expression unchanged',
  'reconstruct': 'preserve identity',
  'reshape': 'preserve identity',
  'transform': 'apply cinematic ambience',
}

function sanitizeTextList(list: string[]): { sanitized: string[]; unsafeFound: boolean; warnings: string[] } {
  const warnings: string[] = []
  let unsafeFound = false
  const sanitized = list
    .map((item) => {
      let s = item
      FORBIDDEN_PHRASES.forEach((p) => {
        if (s.toLowerCase().includes(p)) {
          unsafeFound = true
          warnings.push(`Forbidden phrase detected: ${p}`)
          const replacement = SAFE_REPLACEMENTS[p] ?? 'preserve identity'
          s = s.replace(new RegExp(p, 'gi'), replacement)
        }
      })
      return s
    })
    .filter((s) => {
      const lower = s.toLowerCase()
      return !FORBIDDEN_PHRASES.some((p) => lower.includes(p))
    })
  return { sanitized, unsafeFound, warnings }
}

function clampDeviation(d?: number): number {
  const v = typeof d === 'number' ? d : 0.1
  if (v < 0.1) return 0.1
  if (v > 0.5) return 0.5
  return v
}

function sanitizePreset(preset: TryOnPreset | null): {
  presetUsed: TryOnPreset | null
  positive: string[]
  negative: string[]
  deviation: number
  warnings: string[]
  blocked: boolean
} {
  if (!preset) {
    return {
      presetUsed: null,
      positive: [
        'Natural lighting with realistic shadows',
        'Keep the original background from the input photo',
        'Candid photography aesthetic, not stock photo',
        'Subtle natural imperfections (not overly perfect)',
        'Authentic camera feel with natural depth',
        'Subtle natural film grain',
        'Realistic fabric texture fidelity',
        'Match lighting between person and environment',
      ],
      negative: [
        'No identity changes',
        'No pose changes',
        'No facial alterations',
        'No body modifications',
        'No plastic skin or oversmoothing',
        'No HDR over-processing',
        'No CGI-like smooth backgrounds',
        'No unnaturally perfect environments',
      ],
      deviation: 0.1,
      warnings: [],
      blocked: false,
    }
  }
  const posRes = sanitizeTextList(preset.positive || [])
  const negRes = sanitizeTextList(preset.negative || [])
  const blocked = posRes.unsafeFound || negRes.unsafeFound ? true : false
  const deviation = clampDeviation(preset.deviation)
  const warnings = [...posRes.warnings, ...negRes.warnings]
  if (blocked) {
    return {
      presetUsed: null,
      positive: ['Natural lighting', 'Neutral background tone', 'Clean, realistic atmosphere', 'Balanced color harmony', 'Authentic camera feel'],
      negative: ['No identity changes', 'No pose changes', 'No facial alterations', 'No body modifications'],
      deviation,
      warnings,
      blocked,
    }
  }
  return {
    presetUsed: preset,
    positive: Array.from(
      new Set([
        ...posRes.sanitized,
        'Subtle natural film grain',
        'Realistic fabric texture fidelity',
        'Candid photography aesthetic with natural imperfections',
        'Real-world background with authentic textures and depth',
        'Natural lighting with realistic shadows and highlights',
      ])
    ),
    negative: Array.from(
      new Set([
        ...negRes.sanitized,
        'No plastic skin or oversmoothing',
        'No HDR over-processing',
        'No CGI-like smooth backgrounds',
        'No unnaturally perfect or stock photo environments',
        'No overly symmetrical or artificial compositions',
      ])
    ),
    deviation,
    warnings,
    blocked,
  }
}

export function buildTryOnPrompt(
  personImageBase64: string,
  clothingImageBase64: string,
  preset: TryOnPreset | null
): string {
  const { presetUsed, positive, warnings, blocked } = sanitizePreset(preset)
  console.log('Try-On Preset Applied:', presetUsed ? presetUsed.id : 'neutral')

  if (warnings.length > 0) {
    console.warn('Preset Warnings:', warnings)
  }
  if (blocked) {
    console.warn('Preset contained unsafe keywords and was blocked')
  }

  // SIMPLIFIED PROMPT - Focus on face consistency first
  let prompt = ''

  // CRITICAL: Face consistency instruction
  prompt += 'FACE: Use the EXACT face from the person image. Copy jawline, eyes, nose, lips, skin tone exactly.\n'
  prompt += 'DO NOT use any face from the clothing reference image.\n\n'

  // Clothing instruction
  prompt += 'CLOTHING: Put the garment from the clothing image on the person.\n'
  prompt += 'Match the garment color, pattern, and style exactly.\n\n'

  // Scene/Background
  if (presetUsed) {
    prompt += `SCENE: ${presetUsed.name}\n`
    if (presetUsed.background) {
      prompt += `Background: ${presetUsed.background}\n`
    }
    if (presetUsed.lighting) {
      prompt += `Lighting: ${presetUsed.lighting.type}, ${presetUsed.lighting.colorTemp}\n`
    }
    if (positive.length > 0) {
      prompt += `Style: ${positive.slice(0, 3).join(', ')}\n`
    }
  } else {
    prompt += 'SCENE: Keep the original background from the person image.\n'
  }

  prompt += '\nOUTPUT: The same person wearing the new clothes.'

  console.log('Final Prompt:', prompt)
  return prompt
}

// Keep the old detailed function for backward compatibility but unused
function buildTryOnPromptDetailed(
  personImageBase64: string,
  clothingImageBase64: string,
  preset: TryOnPreset | null
): string {
  const { presetUsed, positive, negative, deviation, warnings, blocked } = sanitizePreset(preset)

  const styleBlock = positive.length > 0 ? positive.join('\n') : ''
  const avoidBlock = negative.length > 0 ? negative.join('\n') : ''

  let presetDetails = ''
  if (presetUsed) {
    presetDetails += `\n### Preset: ${presetUsed.name}\n`
    presetDetails += `${presetUsed.description}\n\n`

    if (presetUsed.background) {
      presetDetails += `### Background/Scene\n${presetUsed.background}\n\n`
    }

    if (presetUsed.backgroundElements) {
      presetDetails += `### Scene Elements for Realism (IMPORTANT)\n`
      if (presetUsed.backgroundElements.people) {
        presetDetails += `- People in Background: ${presetUsed.backgroundElements.people}\n`
      }
      if (presetUsed.backgroundElements.objects) {
        presetDetails += `- Objects/Props: ${presetUsed.backgroundElements.objects}\n`
      }
      if (presetUsed.backgroundElements.atmosphere) {
        presetDetails += `- Scene Atmosphere: ${presetUsed.backgroundElements.atmosphere}\n`
      }
      presetDetails += '\n'
    }

    if (presetUsed.lighting) {
      presetDetails += `### Lighting\n`
      presetDetails += `- Type: ${presetUsed.lighting.type}\n`
      presetDetails += `- Source: ${presetUsed.lighting.source}\n`
      presetDetails += `- Direction: ${presetUsed.lighting.direction}\n`
      presetDetails += `- Quality: ${presetUsed.lighting.quality}\n`
      presetDetails += `- Color Temperature: ${presetUsed.lighting.colorTemp}\n\n`
    }

    if (presetUsed.camera_style) {
      presetDetails += `### Camera\n`
      presetDetails += `- Angle: ${presetUsed.camera_style.angle}\n`
      presetDetails += `- Lens: ${presetUsed.camera_style.lens}\n`
      presetDetails += `- Framing: ${presetUsed.camera_style.framing}\n`
      if (presetUsed.camera_style.depthOfField) {
        presetDetails += `- Depth of Field: ${presetUsed.camera_style.depthOfField}\n`
      }
      presetDetails += '\n'
    }

    if (presetUsed.pose) {
      presetDetails += `### Pose & Expression Guidance\n`
      presetDetails += `- Stance: ${presetUsed.pose.stance}\n`
      presetDetails += `- Arms: ${presetUsed.pose.arms}\n`
      presetDetails += `- Expression: ${presetUsed.pose.expression}\n`
      presetDetails += `- Energy: ${presetUsed.pose.energy}\n`
      if (presetUsed.pose.bodyAngle) {
        presetDetails += `- Body Angle: ${presetUsed.pose.bodyAngle}\n`
      }
      presetDetails += '\n'
    }
  }

  let prompt = ''

  // Add "no preset" default instruction - Higgsfield style
  if (!presetUsed) {
    prompt += `CLOTHING CHANGE - PRESERVE ORIGINAL CONTEXT\n`
    prompt += `The reference person remains in their original environment, the authentic backdrop preserved exactly as captured. Only the garment changes—the new clothing drapes naturally over their frame with visible fabric texture, realistic creases, and subtle shadows where cloth meets skin. Their face retains every genuine detail: subtle pores, natural shadows, the lived-in quality of actual human skin. Same apparent age, same features, same identity.\n\n`
  }

  // Scene change with Higgsfield-style descriptive language
  if (presetUsed) {
    // CRITICAL: Explicit identity and clothing preservation instructions
    prompt += `⚠️⚠️⚠️ CRITICAL PRESET RULES - IDENTITY IS ALWAYS PRIORITY ⚠️⚠️⚠️:\n`
    prompt += `1. IDENTITY PRESERVATION IS ABSOLUTE - Preset CANNOT override identity, face, body, or clothing\n`
    prompt += `2. The FACE MUST be IDENTICAL to the person image - preset styling cannot change facial features, expression, or identity\n`
    prompt += `3. The CLOTHING MUST be EXACTLY what is shown in the clothing reference image - DO NOT invent, replace, or modify based on preset\n`
    prompt += `4. The BODY proportions MUST match the person image exactly - preset cannot alter body shape or gender characteristics\n`
    prompt += `5. Preset ONLY controls: background scene, lighting atmosphere, camera settings, environment mood\n`
    prompt += `6. If preset conflicts with identity preservation, IGNORE preset - IDENTITY WINS ALWAYS\n`
    prompt += `7. Preset positive modifiers are ONLY for scene atmosphere - NOT for person/face/body/clothing\n\n`

    prompt += `SCENE: ${presetUsed.name}\n`
    prompt += `${presetUsed.description}\n\n`

    // Photography Style
    if ((presetUsed as any).photographyStyle) {
      prompt += `STYLE: ${(presetUsed as any).photographyStyle}\n\n`
    }

    if (presetUsed.background) {
      prompt += `📍 LOCATION/BACKGROUND: ${presetUsed.background}\n`
    }

    if (presetUsed.backgroundElements) {
      if (presetUsed.backgroundElements.people) {
        prompt += `👥 PEOPLE IN SCENE: ${presetUsed.backgroundElements.people}\n`
      }
      if (presetUsed.backgroundElements.objects) {
        prompt += `🎯 OBJECTS/PROPS: ${presetUsed.backgroundElements.objects}\n`
      }
      if (presetUsed.backgroundElements.atmosphere) {
        prompt += `🌟 ATMOSPHERE: ${presetUsed.backgroundElements.atmosphere}\n`
      }
    }

    // Enhanced lighting with shadows
    if (presetUsed.lighting) {
      prompt += `💡 LIGHTING: ${presetUsed.lighting.type} from ${presetUsed.lighting.source}, ${presetUsed.lighting.quality}, ${presetUsed.lighting.colorTemp}\n`
      if ((presetUsed.lighting as any).shadows) {
        prompt += `🌑 SHADOWS: ${(presetUsed.lighting as any).shadows}\n`
      }
    }

    // Enhanced camera with device and film grain
    if (presetUsed.camera_style) {
      let cameraLine = `📷 CAMERA: ${presetUsed.camera_style.angle}, ${presetUsed.camera_style.lens}, ${presetUsed.camera_style.framing}`
      if ((presetUsed.camera_style as any).device) {
        cameraLine += `, ${(presetUsed.camera_style as any).device}`
      }
      if ((presetUsed.camera_style as any).filmGrain) {
        cameraLine += `, ${(presetUsed.camera_style as any).filmGrain}`
      }
      prompt += cameraLine + '\n'
    }

    // NEW: Texture Details for Hyper-Realism
    if ((presetUsed as any).textureDetails) {
      const tex = (presetUsed as any).textureDetails
      prompt += `\n🔬 TEXTURE FIDELITY (CRITICAL FOR REALISM):\n`
      if (tex.skin) {
        prompt += `  • SKIN: ${tex.skin}\n`
      }
      if (tex.fabric) {
        prompt += `  • FABRIC: ${tex.fabric}\n`
      }
      if (tex.environment) {
        prompt += `  • ENVIRONMENT: ${tex.environment}\n`
      }
      if (tex.accessories) {
        prompt += `  • ACCESSORIES: ${tex.accessories}\n`
      }
    }

    if (presetUsed.pose) {
      prompt += `🧍 POSE: ${presetUsed.pose.stance}. Arms: ${presetUsed.pose.arms}. CRITICAL: Expression guidance (${presetUsed.pose.expression}) applies ONLY to body language - keep face expression IDENTICAL to person image. If preset expression conflicts with original face, IGNORE preset expression.\n`
    }

    prompt += `\nCAMERA (Higgsfield-style): Casual framing with slight tilt, authentic skin texture with subtle highlights, natural shadows from mixed ambient light, minor grain—intimate and immediate like an iPhone snap.\n\n`
  }

  // Identity with Higgsfield-style descriptive prose
  prompt += 'IDENTITY PRESERVATION (ABSOLUTE PRIORITY - PRESET CANNOT OVERRIDE):\n'
  prompt += 'The reference person\'s authentic skin texture reveals subtle pores, faint natural shadows, and genuine imperfections—the lived-in quality of actual human skin. Same apparent age preserved in every detail: the specific way skin creases, the precise facial hair density (or complete absence if clean-shaven), glasses if present. CRITICAL: Preserve gender expression EXACTLY - if the person is female/woman, the output MUST be female/woman with correct body proportions, curves, and feminine characteristics. If the person is male/man, the output MUST be male/man with masculine structure. Same body proportions with natural hand anatomy (5 fingers each). Zero beautification, zero de-aging, zero gender alteration. PRESET STYLING CANNOT CHANGE ANY OF THIS - IDENTITY IS UNCHANGEABLE.\n\n'

  prompt += 'CLOTHING (COMPLETE REPLACEMENT - NOT OVERLAY):\n'
  prompt += 'REPLACE the ENTIRE garment from the person image with the EXACT garment from clothing reference. The garment drapes naturally over their frame—visible fabric weave, realistic creases where fabric bends, subtle shadows where cloth meets skin. CRITICAL: If clothing reference is SLEEVELESS (tank top, sleeveless top, etc.), the output MUST be sleeveless - show full arms, shoulders, and armpits. If reference has sleeves, match exact sleeve length. This is COMPLETE GARMENT REPLACEMENT, not overlay or blending.\n\n'

  if (!presetUsed) {
    prompt += 'BACKGROUND: The original environment preserved exactly as captured.\n\n'
  }

  if (presetUsed) {
    prompt += 'SCENE DETAILS:\n'
    prompt += styleBlock + '\n\n'

    // Add explicit background texture requirements
    prompt += 'BACKGROUND TEXTURE REALISM (NO BOKEH TO HIDE DETAIL):\n'
    prompt += '• DO NOT use heavy bokeh to blur backgrounds - this is an AI crutch\n'
    prompt += '• Keep backgrounds SHARP enough to see: building cracks, individual leaves, weathered textures\n'
    prompt += '• Surfaces: hairline cracks, weathered edges, dust catching light, worn patina\n'
    prompt += '• Stone/brick: mortar lines, moss in crevices, water stains clearly visible\n'
    prompt += '• Ground: fallen leaves with visible veins, scattered debris, uneven textures\n'
    prompt += '• Foliage: individual leaf detail with edges and veins, natural wilting, color variations\n'
    prompt += '• Indoor: unmade beds, scattered items, worn furniture, dust motes in light beams\n'
    prompt += '• Light: dappled shadows, uneven exposure, warmer highlights, cooler shadows\n'
    prompt += '• NO heavy bokeh, NO artificially blurred backgrounds, NO CGI smooth surfaces\n\n'

    // Color temperature rules to avoid AI look
    prompt += 'COLOR TEMPERATURE (CRITICAL):\n'
    prompt += '• Shadows MUST be cool (blue-gray), NOT warm throughout\n'
    prompt += '• Only sun-touched highlights should be warm\n'
    prompt += '• DO NOT uniformly warm-grade the entire image - this is the #1 AI tell\n\n'
  }

  prompt += 'AVOID: Smooth plastic skin, de-aging, strange hands, overly polished advertisement look, CGI backgrounds, perfectly smooth surfaces, rendered lighting, HEAVY BOKEH TO HIDE BACKGROUND, clean sterile environments, artificial backdrop feel, UNIFORM WARM COLOR GRADING, preset styling that alters identity/face/body/clothing.\n\n'

  if (presetUsed) {
    prompt += 'OUTPUT: THE EXACT REFERENCE PERSON (Identity preserved IDENTICALLY) appearing in the preset scene. Real face, real details, no AI generation artifacts. Preset affects ONLY background/lighting/camera - person identity is UNCHANGEABLE.'
  } else {
    prompt += 'OUTPUT: THE EXACT REFERENCE PERSON (Identity preserved) appearing in the new scene. Real face, real details, no AI generation artifacts.'
  }

  const sanitizedPrompt = FORBIDDEN_PHRASES.reduce((acc, p) => {
    const replacement = SAFE_REPLACEMENTS[p] ?? 'preserve identity'
    return acc.replace(new RegExp(p, 'gi'), replacement)
  }, prompt)

  console.log('Final Computed Prompt (sanitized):', sanitizedPrompt)
  return sanitizedPrompt
}

/**
 * Build clothing description from analysis
 */
function buildClothingDescription(analysis: GeminiAnalysis): string {
  const parts: string[] = []

  parts.push(`Render the subject wearing the referenced clothing with realistic fabric texture, clean folds, natural drape and accurate fit.`)

  if (analysis.clothing.upper_wear_type) {
    parts.push(`Garment type: ${analysis.clothing.upper_wear_type}.`)
  }

  if (analysis.clothing.upper_wear_color) {
    parts.push(`Color: ${analysis.clothing.upper_wear_color}.`)
  }

  if (analysis.clothing.upper_wear_pattern && analysis.clothing.upper_wear_pattern !== 'none') {
    parts.push(`Pattern: ${analysis.clothing.upper_wear_pattern}.`)
  }

  if (analysis.clothing.upper_wear_texture) {
    parts.push(`Texture: ${analysis.clothing.upper_wear_texture}.`)
  }

  if (analysis.clothing.lower_wear_type) {
    parts.push(`Lower garment: ${analysis.clothing.lower_wear_type}.`)
  }

  if (analysis.clothing.footwear) {
    parts.push(`Footwear: ${analysis.clothing.footwear}.`)
  }

  parts.push(`Maintain the structure of the input photo while expressing the outfit in the defined atmosphere.`)

  return parts.join(' ')
}

/**
 * Merge preset into prompt safely
 */
export function mergePresets(
  basePrompt: string,
  preset: TryOnPreset | null
): string {
  if (!preset) {
    return basePrompt
  }

  // Preset should already be merged in buildPrompt
  // This function is for additional merging if needed
  return basePrompt
}

/**
 * Apply safety rules to prompt
 */
export function applySafetyRules(prompt: string): string {
  let safePrompt = prompt

  // Remove any banned verbs when referring to person/anatomy
  const bannedPatterns = BANNED_VERBS.map(
    (verb) => new RegExp(`\\b${verb}\\s+(face|body|anatomy|pose|expression|skin|hair|person|subject|identity)`, 'gi')
  )

  bannedPatterns.forEach((pattern) => {
    safePrompt = safePrompt.replace(pattern, (match) => {
      console.warn(`⚠️ Removed dangerous verb pattern: ${match}`)
      return 'preserve'
    })
  })

  // Ensure preservation language is present
  if (!safePrompt.includes('preserve') && !safePrompt.includes('keep') && !safePrompt.includes('maintain')) {
    safePrompt = `PRESERVE IDENTITY EXACTLY - ${safePrompt}`
  }

  return safePrompt
}

/**
 * Validate preset for banned verbs
 */
export function validatePreset(preset: TryOnPreset): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check positive modifiers
  if (preset.positive) {
    preset.positive.forEach((modifier, index) => {
      BANNED_VERBS.forEach((verb) => {
        const regex = new RegExp(`\\b${verb}\\b`, 'i')
        if (regex.test(modifier)) {
          errors.push(`Positive modifier ${index + 1} contains banned verb "${verb}": "${modifier}"`)
        }
      })
    })
  }

  // Check negative modifiers
  if (preset.negative) {
    preset.negative.forEach((modifier, index) => {
      BANNED_VERBS.forEach((verb) => {
        const regex = new RegExp(`\\b${verb}\\b`, 'i')
        if (regex.test(modifier)) {
          errors.push(`Negative modifier ${index + 1} contains banned verb "${verb}": "${modifier}"`)
        }
      })
    })
  }

  // Check description
  if (preset.description) {
    BANNED_VERBS.forEach((verb) => {
      const regex = new RegExp(`\\b${verb}\\b`, 'i')
      if (regex.test(preset.description)) {
        errors.push(`Description contains banned verb "${verb}": "${preset.description}"`)
      }
    })
  }

  // Check background
  if (preset.background) {
    const bg = preset.background as string
    BANNED_VERBS.forEach((verb) => {
      const regex = new RegExp(`\\b${verb}\\b`, 'i')
      if (regex.test(bg)) {
        errors.push(`Background contains banned verb "${verb}": "${bg}"`)
      }
    })
  }

  // Note: Legacy instructions field removed from interface for safety

  return {
    valid: errors.length === 0,
    errors,
  }
}

