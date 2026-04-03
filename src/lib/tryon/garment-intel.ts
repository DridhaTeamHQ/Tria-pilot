/**
 * GARMENT INTELLIGENCE MODULE
 *
 * Makes ONE Gemini 2.5 Flash call to analyze a product/garment image,
 * returning structured intelligence that drives specialized prompt construction.
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
  bottomWearSuggestion: 'dark fitted jeans',
  description: 'A casual top',
  promptModifiers: [],
}

// ── COMPACT ANALYSIS PROMPT (fewer tokens = no truncation) ───────────────────
// IMPORTANT: Keep this SHORT to avoid JSON truncation (was causing parse errors)
const ANALYSIS_PROMPT = `Analyze this clothing image. Reply with ONLY a valid JSON object, nothing else:
{"garmentType":"top|dress|jumpsuit|suit|skirt|pants|outerwear|saree|lehenga|co_ord_set|full_outfit","coverage":"upper_only|lower_only|full_body|layered","primaryColor":"dominant color","secondaryColor":"secondary or null","pattern":"solid|striped|plaid|floral|printed|checkered|abstract|other","material":"cotton|silk|denim|polyester|linen|chiffon|satin|velvet|knit|other","neckline":"round|v-neck|collar|boat|turtleneck|halter|off-shoulder|mandarin|other","sleeves":"sleeveless|cap|short|three-quarter|long|puff|bell|other","fit":"slim|regular|loose|oversized|bodycon|flared","length":"crop|waist|hip|knee|midi|maxi|floor","keyFeatures":["button","zip","belt","embroidery","peplum","ruffle","lace"],"bottomWearSuggestion":"e.g. dark fitted jeans OR included","description":"1 sentence description","promptModifiers":["key visual instruction 1","key visual instruction 2"]}`

// ── JSON REPAIR: extract valid JSON even from truncated responses ─────────────
function extractJson(text: string): string {
  const trimmed = text.trim()
  // Already valid?
  try { JSON.parse(trimmed); return trimmed } catch { /* continue */ }

  // Find the outermost { ... }
  const start = trimmed.indexOf('{')
  if (start === -1) throw new Error('No JSON object found in response')

  // Walk from end to find the last valid closing brace
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

/**
 * Analyze a garment image using Gemini 2.5 Flash Vision.
 * Results are cached in-memory (30 min TTL).
 * API Budget: 1 call per unique garment image (cached)
 */
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
        maxOutputTokens: 1200, // Increased from 800 to prevent truncation
        responseMimeType: 'application/json',
      },
    })

    // Extract text from response
    let text = ''
    if (response.candidates?.length) {
      for (const part of response.candidates[0].content?.parts || []) {
        if (part.text) text += part.text
      }
    }

    if (!text) throw new Error('Empty response from garment analysis')

    // Use JSON repair to handle truncated responses
    const jsonText = extractJson(text)
    const parsed = JSON.parse(jsonText) as Partial<GarmentIntelligence>

    if (!parsed.garmentType) throw new Error('Missing garmentType in analysis response')

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
      bottomWearSuggestion: parsed.bottomWearSuggestion || 'dark fitted jeans',
      description: parsed.description || `A ${parsed.garmentType || 'garment'}`,
      promptModifiers: Array.isArray(parsed.promptModifiers) ? parsed.promptModifiers : [],
    }

    setCache(cacheKey, intel)

    if (isDev) {
      console.log(`🧠 Garment intel: ${intel.garmentType} (${intel.coverage})`)
      console.log(`   ${intel.description}`)
      console.log(`   Color: ${intel.primaryColor} | Pattern: ${intel.pattern} | Material: ${intel.material}`)
      if (intel.coverage === 'upper_only') console.log(`   Bottom suggestion: ${intel.bottomWearSuggestion}`)
      if (intel.promptModifiers.length) console.log(`   Modifiers: ${intel.promptModifiers.join('; ')}`)
    }

    return intel
  } catch (error) {
    console.warn('⚠️ Garment analysis failed, using fallback:', error instanceof Error ? error.message : error)
    return FALLBACK_INTEL
  }
}

// ── SMART PROMPT COMPOSER ────────────────────────────────────────────────────

export function composeSmartPrompt(
  intel: GarmentIntelligence,
  options: { aspectRatio?: string; polishNotes?: string }
): string {
  const { aspectRatio = '4:5', polishNotes } = options

  let replacementInstruction: string
  let supportingInstruction: string

  switch (intel.coverage) {
    case 'full_body':
      replacementInstruction = `Replace the person's full outfit with the COMPLETE ${intel.garmentType} from Image 2.`
      supportingInstruction = 'The garment covers both top and bottom, so the final outfit must be the same complete piece shown in Image 2.'
      break
    case 'lower_only':
      replacementInstruction = `Replace ONLY the lower-body garment with the ${intel.garmentType} from Image 2.`
      supportingInstruction = "Preserve the person's upper-body clothing from Image 1 exactly. Ignore any tops, jackets, or styling visible on the model in Image 2."
      break
    case 'layered':
      replacementInstruction = `Apply the ${intel.garmentType} from Image 2 as a visible outer layer exactly as shown.`
      supportingInstruction = "Preserve the person's lower-body clothing from Image 1 exactly. Ignore any skirts, pants, or non-target styling visible in Image 2. Do NOT turn the outerwear into a different top."
      break
    case 'upper_only':
    default:
      replacementInstruction = `Replace ONLY the upper-body garment with the ${intel.garmentType} from Image 2.`
      supportingInstruction = `Preserve the person's lower-body clothing from Image 1 exactly. Ignore any skirts, jeans, shorts, or other non-target clothing visible in Image 2. Do NOT change the target garment into a different blouse, tee, or crop top.`
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
      ? '\n• This garment is outerwear. The output must clearly show the jacket/coat/cardigan structure from Image 2 and must not collapse into a plain top.'
      : ''

  const polishSection = polishNotes?.trim() ? `\nSTYLING NOTES: ${polishNotes.trim()}` : ''

  return `Edit the clothing on the person from Image 1 so the final visible garment matches ${intel.description}.

IDENTITY (NON-NEGOTIABLE):
• EXACT SAME person from Image 1 — copy face, body, skin tone, and hair pixel-for-pixel
• Keep the same pose, expression, and body proportions
• This is a clothing edit — do NOT generate a different person

OUTFIT REPLACEMENT:
• Remove only the clothing that conflicts with the target garment from Image 2
• ${replacementInstruction}
• ${supportingInstruction}

GARMENT FIDELITY (CRITICAL — must match Image 2 and the GARMENT REMINDER image EXACTLY):
${fidelityChecks.map((c) => `• ${c}`).join('\n')}
• PIXEL-PERFECT copy of the garment — do NOT simplify or reinterpret any detail
• If Image 2 contains a model, body parts, or extra clothing beyond the target garment, ignore those cues completely
${outerwearGuard}
${modifiers}

SCENE & REALISM:
• Keep the original background from Image 1
• Match the original photo lighting and shadows
• Photorealistic — natural skin texture, realistic fabric drape and wrinkles
• No AI smoothing, no plastic skin, no CGI look
${polishSection}

Output: ${aspectRatio} aspect ratio, photorealistic editorial quality.`
}
