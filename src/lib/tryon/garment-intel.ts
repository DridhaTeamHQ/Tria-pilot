/**
 * GARMENT INTELLIGENCE MODULE
 *
 * Makes ONE Gemini 2.5 Flash call to analyze a product/garment image,
 * returning structured intelligence that drives specialized prompt construction.
 *
 * KEY FIX: When the product photo shows a top being worn WITH visible pants/skirt,
 * the module now detects this and instructs the model to replicate BOTH the garment
 * AND the visible complementary clothing. This solves the "random bottom" problem.
 *
 * Results are cached in-memory to avoid redundant calls.
 * API Budget: 1 call per unique product (cached after first analysis)
 */

import 'server-only'
import { geminiGenerateContent } from '@/lib/gemini/executor'

const isDev = process.env.NODE_ENV !== 'production'

// ── TYPES ────────────────────────────────────────────────────────────────────

export type GarmentType =
  | 'top'        // shirt, blouse, t-shirt, crop top, tank top
  | 'dress'      // any dress (A-line, maxi, mini, bodycon, etc.)
  | 'jumpsuit'   // one-piece covering top + bottom
  | 'suit'       // formal suit / blazer + pants
  | 'skirt'      // standalone skirt
  | 'pants'      // standalone pants/jeans/trousers
  | 'outerwear'  // jacket, coat, cardigan
  | 'saree'      // traditional saree/drape
  | 'lehenga'    // traditional lehenga set
  | 'co_ord_set' // matching top + bottom set
  | 'full_outfit'// any complete outfit covering full body

export type GarmentCoverage = 'upper_only' | 'lower_only' | 'full_body' | 'layered'

export interface GarmentIntelligence {
  garmentType: GarmentType
  coverage: GarmentCoverage
  primaryColor: string
  secondaryColor?: string
  pattern: string
  material: string
  neckline: string
  sleeves: string
  fit: string
  length: string
  keyFeatures: string[]
  /** What bottom wear is visible in the product photo (if any). e.g. "khaki cargo pants", "blue denim jeans" */
  visibleBottomInPhoto: string
  /** What top wear is visible in the product photo when the product is bottoms. e.g. "white t-shirt" */
  visibleTopInPhoto: string
  /** Suggested bottom if nothing visible in photo */
  bottomWearSuggestion: string
  description: string
  promptModifiers: string[]
}

// ── IN-MEMORY CACHE ──────────────────────────────────────────────────────────

const garmentCache = new Map<string, { intel: GarmentIntelligence; timestamp: number }>()
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

function getCacheKey(imageBase64: string): string {
  const clean = imageBase64.replace(/^data:image\/[a-z+]+;base64,/, '')
  return clean.slice(0, 120)
}

function getCached(key: string): GarmentIntelligence | null {
  const entry = garmentCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    garmentCache.delete(key)
    return null
  }
  return entry.intel
}

function setCache(key: string, intel: GarmentIntelligence): void {
  garmentCache.set(key, { intel, timestamp: Date.now() })
}

// ── DEFAULT FALLBACK ─────────────────────────────────────────────────────────

const FALLBACK_INTEL: GarmentIntelligence = {
  garmentType: 'top',
  coverage: 'upper_only',
  primaryColor: 'neutral',
  pattern: 'solid',
  material: 'cotton',
  neckline: 'round',
  sleeves: 'short',
  fit: 'regular',
  length: 'hip',
  keyFeatures: [],
  visibleBottomInPhoto: '',
  visibleTopInPhoto: '',
  bottomWearSuggestion: 'dark fitted jeans',
  description: 'A casual top',
  promptModifiers: [],
}

// ── COMPACT ANALYSIS PROMPT ──────────────────────────────────────────────────
// CRITICAL: asks about visible bottom/top wear in the product image so we can
// replicate the COMPLETE look shown in the product photo.
const ANALYSIS_PROMPT = `Analyze this clothing product image. The product is the MAIN garment being sold/showcased. Reply with ONLY valid JSON:
{"garmentType":"top|dress|jumpsuit|suit|skirt|pants|outerwear|saree|lehenga|co_ord_set|full_outfit","coverage":"upper_only|lower_only|full_body|layered","primaryColor":"dominant color","secondaryColor":"or null","pattern":"solid|striped|plaid|floral|printed|checkered|abstract|other","material":"cotton|silk|denim|polyester|linen|chiffon|satin|velvet|knit|other","neckline":"round|v-neck|collar|boat|turtleneck|halter|off-shoulder|mandarin|other","sleeves":"sleeveless|cap|short|three-quarter|long|puff|bell|other","fit":"slim|regular|loose|oversized|bodycon|flared","length":"crop|waist|hip|knee|midi|maxi|floor","keyFeatures":["buttons","zip","belt"],"visibleBottomInPhoto":"If a model is wearing this top/outerwear and their BOTTOM WEAR (pants, skirt, jeans, shorts) is visible in the photo, describe it precisely e.g. 'khaki cargo pants' or 'blue denim mini skirt'. Write 'none' if no bottom wear is visible or if the product IS the bottom wear.","visibleTopInPhoto":"If the product is pants/skirt/bottom-wear and the model is wearing a TOP in the photo, describe it e.g. 'white crew-neck t-shirt'. Write 'none' if not applicable.","bottomWearSuggestion":"If no bottom is visible, suggest a complementary bottom. If bottom IS visible, copy it here too. If product covers full body, write 'included'.","description":"1 sentence description of the product garment only","promptModifiers":["instruction 1","instruction 2"]}`

// ── JSON REPAIR ──────────────────────────────────────────────────────────────
function extractJson(text: string): string {
  const trimmed = text.trim()
  try { JSON.parse(trimmed); return trimmed } catch { /* continue */ }

  const start = trimmed.indexOf('{')
  if (start === -1) throw new Error('No JSON object found in response')

  for (let end = trimmed.length; end > start; end--) {
    if (trimmed[end - 1] === '}') {
      try {
        const candidate = trimmed.slice(start, end)
        JSON.parse(candidate)
        return candidate
      } catch { /* try shorter */ }
    }
  }

  throw new Error('Could not extract valid JSON from response')
}

// ── GARMENT ANALYSIS ─────────────────────────────────────────────────────────

export async function analyzeGarment(garmentImageBase64: string): Promise<GarmentIntelligence> {
  const cleanBase64 = garmentImageBase64.replace(/^data:image\/[a-z+]+;base64,/, '')

  const cacheKey = getCacheKey(cleanBase64)
  const cached = getCached(cacheKey)
  if (cached) {
    if (isDev) console.log('🧠 Garment intel: cache hit')
    return cached
  }

  try {
    if (isDev) console.log('🧠 Garment intel: analyzing product image...')

    const response = await geminiGenerateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
            { text: ANALYSIS_PROMPT },
          ],
        },
      ],
      config: {
        temperature: 0.1,
        maxOutputTokens: 1500,
        responseMimeType: 'application/json',
      },
    })

    let text = ''
    if (response.candidates?.length) {
      for (const part of response.candidates[0].content?.parts || []) {
        if (part.text) text += part.text
      }
    }

    if (!text) throw new Error('Empty response from garment analysis')

    const jsonText = extractJson(text)
    const parsed = JSON.parse(jsonText) as Partial<GarmentIntelligence>

    if (!parsed.garmentType) throw new Error('Missing garmentType in analysis response')

    // Normalize visibleBottomInPhoto / visibleTopInPhoto
    const rawBottom = (parsed.visibleBottomInPhoto ?? '').trim().toLowerCase()
    const rawTop = (parsed.visibleTopInPhoto ?? '').trim().toLowerCase()
    const visibleBottom = (rawBottom && rawBottom !== 'none' && rawBottom !== 'null' && rawBottom !== 'n/a')
      ? parsed.visibleBottomInPhoto!.trim()
      : ''
    const visibleTop = (rawTop && rawTop !== 'none' && rawTop !== 'null' && rawTop !== 'n/a')
      ? parsed.visibleTopInPhoto!.trim()
      : ''

    const intel: GarmentIntelligence = {
      garmentType: parsed.garmentType || 'top',
      coverage: parsed.coverage || 'upper_only',
      primaryColor: parsed.primaryColor || 'neutral',
      secondaryColor: parsed.secondaryColor || undefined,
      pattern: parsed.pattern || 'solid',
      material: parsed.material || 'cotton',
      neckline: parsed.neckline || 'round',
      sleeves: parsed.sleeves || 'short',
      fit: parsed.fit || 'regular',
      length: parsed.length || 'hip',
      keyFeatures: Array.isArray(parsed.keyFeatures) ? parsed.keyFeatures : [],
      visibleBottomInPhoto: visibleBottom,
      visibleTopInPhoto: visibleTop,
      bottomWearSuggestion: parsed.bottomWearSuggestion || 'dark fitted jeans',
      description: parsed.description || `A ${parsed.garmentType || 'garment'}`,
      promptModifiers: Array.isArray(parsed.promptModifiers) ? parsed.promptModifiers : [],
    }

    setCache(cacheKey, intel)

    if (isDev) {
      console.log(`🧠 Garment intel: ${intel.garmentType} (${intel.coverage})`)
      console.log(`   ${intel.description}`)
      console.log(`   Color: ${intel.primaryColor} | Pattern: ${intel.pattern} | Material: ${intel.material}`)
      if (intel.visibleBottomInPhoto) console.log(`   👖 Visible bottom in photo: "${intel.visibleBottomInPhoto}"`)
      if (intel.visibleTopInPhoto) console.log(`   👕 Visible top in photo: "${intel.visibleTopInPhoto}"`)
      if (intel.coverage === 'upper_only' && !intel.visibleBottomInPhoto) console.log(`   Bottom suggestion: ${intel.bottomWearSuggestion}`)
      if (intel.promptModifiers.length) console.log(`   Modifiers: ${intel.promptModifiers.join('; ')}`)
    }

    return intel
  } catch (error) {
    console.warn('⚠️ Garment analysis failed, using fallback:', error instanceof Error ? error.message : error)
    return FALLBACK_INTEL
  }
}

// ── SMART PROMPT COMPOSER ────────────────────────────────────────────────────

/**
 * Build an intelligent, coverage-aware prompt that handles:
 * - Top-only products (with or without visible bottom in product photo)
 * - Bottom-only products (pants, skirts)
 * - Full-body products (dresses, jumpsuits, sarees)
 * - Layered products (jackets, outerwear)
 *
 * KEY PRINCIPLE: When the product photo shows the garment being worn with
 * visible complementary clothing (e.g., top + khaki pants), the prompt
 * instructs the model to replicate BOTH — not invent random bottom wear.
 */
export function composeSmartPrompt(
  intel: GarmentIntelligence,
  options: { aspectRatio?: string; polishNotes?: string }
): string {
  const { aspectRatio = '4:5', polishNotes } = options

  let replacementInstruction: string
  let supportingInstruction: string

  switch (intel.coverage) {
    case 'full_body':
      replacementInstruction = `Replace the person's ENTIRE outfit with the COMPLETE ${intel.garmentType} from Image 2.`
      supportingInstruction = 'This garment covers both top and bottom — the final outfit must be the exact full piece shown in Image 2. Remove ALL existing clothing.'
      break

    case 'lower_only':
      // Product IS pants/skirt — swap the BOTTOM, keep the top
      replacementInstruction = `Replace ONLY the person's bottom-wear (pants, skirt, shorts, lehenga, etc.) with the ${intel.garmentType} from Image 2.`
      if (intel.visibleTopInPhoto) {
        // Product photo shows a top too — replicate it
        supportingInstruction = `The product photo shows the ${intel.garmentType} worn with ${intel.visibleTopInPhoto}. Replace the person's top with a similar ${intel.visibleTopInPhoto} to match the complete look from Image 2. The BOTTOM garment (${intel.garmentType}) is the priority — it must be pixel-perfect.`
      } else {
        supportingInstruction = `Keep the person's existing upper-body clothing from Image 1 as-is. Only change the bottom-wear to match Image 2 exactly.`
      }
      break

    case 'layered':
      replacementInstruction = `Add the ${intel.garmentType} from Image 2 as an outer layer on the person.`
      if (intel.visibleBottomInPhoto) {
        supportingInstruction = `The product photo shows this ${intel.garmentType} worn with ${intel.visibleBottomInPhoto}. Apply the outerwear AND change the bottom-wear to ${intel.visibleBottomInPhoto} to replicate the complete styling from Image 2.`
      } else {
        supportingInstruction = `Keep the person's existing bottom-wear from Image 1. Layer the ${intel.garmentType} on top as shown in Image 2.`
      }
      break

    case 'upper_only':
    default:
      replacementInstruction = `Replace the person's upper-body clothing with the ${intel.garmentType} from Image 2.`
      if (intel.visibleBottomInPhoto) {
        // Product photo shows a model wearing the top WITH specific pants/skirt — replicate BOTH
        supportingInstruction = `IMPORTANT: The product photo (Image 2) shows this ${intel.garmentType} being worn with ${intel.visibleBottomInPhoto}. You MUST also change the person's bottom-wear to match: ${intel.visibleBottomInPhoto}. Replicate the complete look from Image 2 — NOT just the top. The final outfit must be: ${intel.description} on top + ${intel.visibleBottomInPhoto} on bottom.`
      } else {
        // No bottom visible in product photo — suggest a complementary one
        supportingInstruction = `Pair with ${intel.bottomWearSuggestion}. Do NOT keep the person's original bottom-wear. The bottom must be clean and complementary to the ${intel.garmentType}.`
      }
      break
  }

  const fidelityChecks = [
    `Color: exact ${intel.primaryColor}${intel.secondaryColor ? ` with ${intel.secondaryColor} accents` : ''}`,
    `Pattern: ${intel.pattern}`,
    `Material: ${intel.material} (realistic texture and drape)`,
    `Neckline: ${intel.neckline}`,
    `Sleeves: ${intel.sleeves}`,
    `Fit: ${intel.fit}`,
    `Length: ${intel.length}`,
    ...(intel.keyFeatures.length > 0 ? [`Key details: ${intel.keyFeatures.join(', ')}`] : []),
  ]

  const modifiers = intel.promptModifiers.length > 0
    ? `\nGARMENT-SPECIFIC NOTES:\n${intel.promptModifiers.map((m) => `• ${m}`).join('\n')}`
    : ''

  const outerwearGuard =
    intel.garmentType === 'outerwear'
      ? '\n• This garment is outerwear — the output must clearly show the jacket/coat/cardigan structure from Image 2, NOT collapse into a plain top.'
      : ''

  // If bottom is visible in photo, add explicit bottom fidelity instruction
  const bottomFidelity = intel.visibleBottomInPhoto
    ? `\n• BOTTOM-WEAR from Image 2: The model in the product photo is wearing "${intel.visibleBottomInPhoto}". Copy this bottom-wear onto the person as well.`
    : ''

  // If product is pants/skirt and top is visible, add top instruction
  const topFidelity = (intel.coverage === 'lower_only' && intel.visibleTopInPhoto)
    ? `\n• TOP from Image 2: The model in the product photo is wearing a "${intel.visibleTopInPhoto}". Apply a similar clean top to complement the ${intel.garmentType}.`
    : ''

  const polishSection = polishNotes?.trim() ? `\nSTYLING NOTES: ${polishNotes.trim()}` : ''

  return `Edit the clothing on the person from Image 1 so the final visible outfit matches the complete look shown in Image 2: ${intel.description}.

IDENTITY (NON-NEGOTIABLE):
• EXACT SAME person from Image 1 — copy face, body, skin tone, and hair pixel-for-pixel
• Keep the same pose, expression, and body proportions
• This is a clothing edit — do NOT generate a different person

OUTFIT REPLACEMENT:
• ${replacementInstruction}
• ${supportingInstruction}

GARMENT FIDELITY (CRITICAL — must match Image 2 and the GARMENT REMINDER image EXACTLY):
${fidelityChecks.map((c) => `• ${c}`).join('\n')}
• PIXEL-PERFECT copy of the garment — do NOT simplify or reinterpret any detail
• If Image 2 shows a model wearing the garment, focus on the GARMENT only — ignore the model's face/body
${bottomFidelity}${topFidelity}${outerwearGuard}
${modifiers}

SCENE & REALISM:
• Keep the original background from Image 1
• Match the original photo lighting and shadows
• Photorealistic — natural skin texture, realistic fabric drape and wrinkles
• No AI smoothing, no plastic skin, no CGI look
${polishSection}

Output: ${aspectRatio} aspect ratio, photorealistic editorial quality.`
}
