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
import { getOpenAI } from '@/lib/openai'

// Fix: Vercel incorrectly sets NODE_ENV='development' in some regions.
// Use VERCEL_ENV to detect production reliably.
const isDev = process.env.VERCEL_ENV
  ? process.env.VERCEL_ENV !== 'production'
  : process.env.NODE_ENV !== 'production'

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

// ── HEURISTIC FALLBACK ───────────────────────────────────────────────────────
// When the Gemini analysis fails (503 / timeout), we still want a *useful*
// intel object — defaulting everything to upper_only treats dresses,
// pants and full-outfit products as tops, which produces wrong outputs.
// This builds a best-effort intel from product name + description text.
//
// Returns null if no helpful keyword is found (caller falls back to FALLBACK_INTEL).
export function inferIntelFromText(text: string | null | undefined): GarmentIntelligence | null {
  if (!text) return null
  const t = text.toLowerCase()

  // Order matters: more-specific terms first (e.g. "co-ord" before "top")
  const map: Array<{ test: RegExp; type: GarmentType; coverage: GarmentCoverage; desc: string }> = [
    { test: /\b(saree|sari)\b/, type: 'saree', coverage: 'full_body', desc: 'A saree' },
    { test: /\b(lehenga|ghagra)\b/, type: 'lehenga', coverage: 'full_body', desc: 'A lehenga set' },
    { test: /\b(co.?ord|coord)\b/, type: 'co_ord_set', coverage: 'full_body', desc: 'A coordinated set' },
    { test: /\b(jumpsuit|romper|playsuit)\b/, type: 'jumpsuit', coverage: 'full_body', desc: 'A jumpsuit' },
    { test: /\b(dress|gown|frock|kurta|kurti|abaya)\b/, type: 'dress', coverage: 'full_body', desc: 'A dress' },
    { test: /\b(suit)\b/, type: 'suit', coverage: 'full_body', desc: 'A suit' },
    { test: /\b(jeans|trouser|pant|chino|jogger|legging|cargo)\b/, type: 'pants', coverage: 'lower_only', desc: 'Pants/trousers' },
    { test: /\b(skirt|midi)\b/, type: 'skirt', coverage: 'lower_only', desc: 'A skirt' },
    { test: /\b(short|bermuda)\b/, type: 'pants', coverage: 'lower_only', desc: 'Shorts' },
    { test: /\b(jacket|coat|blazer|cardigan|hoodie|outerwear|trucker)\b/, type: 'outerwear', coverage: 'layered', desc: 'Outerwear' },
    { test: /\b(shirt|t.?shirt|tee|blouse|top|tank|crop)\b/, type: 'top', coverage: 'upper_only', desc: 'A top' },
  ]

  for (const m of map) {
    if (m.test.test(t)) {
      // Extract color hints from text — common color words boost the
      // FLUX prompt fidelity even when image analysis is down.
      const colorWords = [
        'black', 'white', 'red', 'blue', 'green', 'yellow', 'orange',
        'pink', 'purple', 'brown', 'beige', 'cream', 'grey', 'gray',
        'navy', 'maroon', 'olive', 'teal', 'denim', 'khaki', 'tan',
      ]
      const foundColor = colorWords.find((c) => new RegExp(`\\b${c}\\b`).test(t))

      // Pattern keywords
      const patterns = ['floral', 'striped', 'plaid', 'checkered', 'printed', 'solid', 'paisley']
      const foundPattern = patterns.find((p) => new RegExp(`\\b${p}\\b`).test(t)) || 'solid'

      // Material keywords
      const materials = ['cotton', 'silk', 'denim', 'linen', 'wool', 'polyester', 'velvet', 'satin', 'leather']
      const foundMaterial = materials.find((mat) => new RegExp(`\\b${mat}\\b`).test(t)) || FALLBACK_INTEL.material

      return {
        ...FALLBACK_INTEL,
        garmentType: m.type,
        coverage: m.coverage,
        description: m.desc + (foundColor ? ` in ${foundColor}` : ''),
        primaryColor: foundColor || FALLBACK_INTEL.primaryColor,
        pattern: foundPattern,
        material: foundMaterial,
      }
    }
  }
  return null
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

// ── GPT-4O ANALYZER (PRIMARY) ────────────────────────────────────────────────
// GPT-4o has noticeably better visual reasoning for fashion garments than
// Gemini 2.5 Flash — it distinguishes "top vs dress" and "kurta vs blouse"
// correctly, and handles flat-lay vs on-model product shots reliably.
// Used as the primary analyzer; falls through to Gemini on quota/auth error.

const GPT4O_SYSTEM = `You are a precision fashion garment classifier for a virtual try-on system. Your job is to look at a clothing product image and identify EXACTLY what kind of garment is being sold.

CRITICAL RULES:
1. The product is the MAIN garment shown. If a model is wearing it, IGNORE other clothing on the model — those are styling, not the product.
2. Distinguish carefully:
   - "top" = ends at waist/hip (blouse, shirt, t-shirt, kurti that ends above knee, tunic)
   - "dress" = single piece covering shoulders to at least mid-thigh (one-piece, gown, frock)
   - "kurta" = long Indian tunic ending below knee — classify as 'dress' if it covers full body, 'top' if hip-length kurti
   - "co_ord_set" = matching top + bottom shown together (2 pieces)
   - "jumpsuit" = single piece with separate legs (NOT a dress)
   - "saree" = Indian drape (full body, traditional)
   - "lehenga" = Indian skirt + blouse set (full body, traditional)
3. coverage rules:
   - upper_only: top, blouse, shirt, jacket, kurti (hip-length)
   - lower_only: pants, jeans, skirt, shorts, leggings
   - full_body: dress, jumpsuit, saree, lehenga, co_ord_set, long kurta
   - layered: outerwear meant to be worn over other clothes
4. If you see a model wearing the product with other visible clothing, capture that in visibleTopInPhoto / visibleBottomInPhoto so the try-on system can preserve the right body parts.

Return ONLY valid JSON matching this schema (no markdown, no commentary):
{
  "garmentType": "top|dress|jumpsuit|suit|skirt|pants|outerwear|saree|lehenga|co_ord_set|full_outfit",
  "coverage": "upper_only|lower_only|full_body|layered",
  "primaryColor": "specific color name (e.g. 'dusty rose', 'olive green' — not just 'pink')",
  "secondaryColor": "specific color name, or null if solid",
  "pattern": "solid|striped|plaid|floral|printed|checkered|abstract|paisley|other",
  "material": "cotton|silk|denim|polyester|linen|chiffon|satin|velvet|knit|other",
  "neckline": "round|v-neck|collar|boat|turtleneck|halter|off-shoulder|mandarin|tie-neck|other",
  "sleeves": "sleeveless|cap|short|three-quarter|long|puff|bell|balloon|other",
  "fit": "slim|regular|loose|oversized|bodycon|flared",
  "length": "crop|waist|hip|knee|midi|maxi|floor",
  "keyFeatures": ["array", "of", "visible", "details", "up to 5"],
  "visibleBottomInPhoto": "describe bottom wear visible on the model, or 'none' if not applicable",
  "visibleTopInPhoto": "describe top wear visible on the model when product is bottom, or 'none' if not applicable",
  "bottomWearSuggestion": "complementary bottom suggestion, or 'included' if full-body",
  "description": "ONE concrete sentence describing the product garment specifically",
  "promptModifiers": ["styling instruction 1", "styling instruction 2"]
}`

async function analyzeGarmentWithGPT4o(
  cleanBase64: string,
  textHint?: string,
): Promise<GarmentIntelligence | null> {
  if (!(process.env.OPENAI_API_KEY || '').trim()) return null

  try {
    const openai = getOpenAI()
    const userMsg = textHint
      ? `Product context: "${textHint.slice(0, 200)}". Analyze the garment image and return JSON.`
      : 'Analyze the garment image and return JSON.'

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: GPT4O_SYSTEM },
        {
          role: 'user',
          content: [
            { type: 'text', text: userMsg },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${cleanBase64}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 1200,
    }, {
      // Hard timeout — analyzer shouldn't block the pipeline if OpenAI hangs
      timeout: 20_000,
    })

    const text = response.choices?.[0]?.message?.content?.trim() || ''
    if (!text) throw new Error('Empty GPT-4o response')

    const parsed = JSON.parse(text) as Partial<GarmentIntelligence>
    if (!parsed.garmentType) throw new Error('Missing garmentType in GPT-4o response')

    const rawBottom = (parsed.visibleBottomInPhoto ?? '').trim().toLowerCase()
    const rawTop = (parsed.visibleTopInPhoto ?? '').trim().toLowerCase()
    const visibleBottom = rawBottom && !['none', 'null', 'n/a', ''].includes(rawBottom)
      ? parsed.visibleBottomInPhoto!.trim() : ''
    const visibleTop = rawTop && !['none', 'null', 'n/a', ''].includes(rawTop)
      ? parsed.visibleTopInPhoto!.trim() : ''

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

    if (isDev) {
      console.log(`🤖 GPT-4o intel: ${intel.garmentType} (${intel.coverage})`)
      console.log(`   ${intel.description}`)
      console.log(`   Color: ${intel.primaryColor}${intel.secondaryColor ? ` + ${intel.secondaryColor}` : ''} | Pattern: ${intel.pattern} | Material: ${intel.material}`)
      if (intel.visibleBottomInPhoto) console.log(`   👖 Visible bottom: "${intel.visibleBottomInPhoto}"`)
      if (intel.visibleTopInPhoto) console.log(`   👕 Visible top: "${intel.visibleTopInPhoto}"`)
    }

    return intel
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (isDev) console.warn(`⚠️ GPT-4o garment analysis failed, falling through to Gemini: ${msg.slice(0, 200)}`)
    return null
  }
}

// ── GARMENT ANALYSIS ─────────────────────────────────────────────────────────
// Order: GPT-4o (primary, best visual reasoning) → Gemini Flash/Lite (fallback)
// → text heuristic (last resort when both AI calls fail).

export async function analyzeGarment(
  garmentImageBase64: string,
  textHint?: string,
): Promise<GarmentIntelligence> {
  const cleanBase64 = garmentImageBase64.replace(/^data:image\/[a-z+]+;base64,/, '')

  const cacheKey = getCacheKey(cleanBase64)
  const cached = getCached(cacheKey)
  if (cached) {
    if (isDev) console.log('🧠 Garment intel: cache hit')
    return cached
  }

  // ── PRIMARY: GPT-4o ──────────────────────────────────────────────────
  // Best fashion garment classifier we have. Distinguishes top vs dress,
  // kurti vs kurta, co-ord vs separate set. Returns within ~3-5s.
  const gpt4oResult = await analyzeGarmentWithGPT4o(cleanBase64, textHint)
  if (gpt4oResult) {
    setCache(cacheKey, gpt4oResult)
    return gpt4oResult
  }

  // ── FALLBACK: Gemini Flash / Flash-Lite ──────────────────────────────
  // Retry across multiple models with different load profiles.
  // Production sees frequent 503s on gemini-2.5-flash during peak hours;
  // 2.5-flash-lite has separate quota; gemini-2.0-flash-exp is a fallback
  // tier rarely hit by the same load. Backoff between attempts grows
  // (250ms → 750ms → 2.5s).
  const MODELS = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash-exp',
    'gemini-2.5-flash-lite',
  ]
  const MAX_ATTEMPTS = MODELS.length

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const model = MODELS[Math.min(attempt, MODELS.length - 1)]
    try {
      if (isDev) console.log(`🧠 Garment intel: analyzing (attempt ${attempt + 1}, model: ${model})...`)

      const response = await geminiGenerateContent({
        model,
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
        if (intel.visibleBottomInPhoto) console.log(`   👖 Visible bottom: "${intel.visibleBottomInPhoto}"`)
        if (intel.visibleTopInPhoto) console.log(`   👕 Visible top: "${intel.visibleTopInPhoto}"`)
      }

      return intel

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      const is503 = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand') || msg.includes('overloaded')

      // Also retry on 429 (rate limit), 504 (gateway timeout), and quota
      // errors — these are all transient and likely to succeed on next model.
      const isRetryable = is503 ||
        msg.includes('429') ||
        msg.includes('quota') ||
        msg.includes('504') ||
        msg.includes('timeout') ||
        msg.includes('RESOURCE_EXHAUSTED')

      if (isRetryable && attempt < MAX_ATTEMPTS - 1) {
        // Exponential backoff: 250ms, 750ms, 2250ms — keeps total wait
        // under 4s across 3 retries while giving Gemini room to recover.
        const backoffMs = 250 * Math.pow(3, attempt)
        if (isDev) console.warn(`⚠️ Garment analysis transient on ${model}, retrying in ${backoffMs}ms...`)
        await new Promise((r) => setTimeout(r, backoffMs))
        continue
      }

      console.warn('⚠️ Garment analysis failed, using heuristic fallback:', msg)
      // Try heuristic fallback from text first — much better than blanket 'upper_only'
      const heuristic = inferIntelFromText(textHint)
      if (heuristic) {
        if (isDev) console.log(`🧠 Heuristic intel: ${heuristic.garmentType} (${heuristic.coverage}) from text hint`)
        return heuristic
      }
      return FALLBACK_INTEL
    }
  }

  // Should not reach here — try heuristic before generic fallback
  return inferIntelFromText(textHint) || FALLBACK_INTEL
}

// ── SMART PROMPT COMPOSER ────────────────────────────────────────────────────

export function composeSmartPrompt(
  intel: GarmentIntelligence,
  options: { aspectRatio?: string; polishNotes?: string }
): string {
  const { polishNotes } = options

  const polishSection = polishNotes?.trim() ? `\nAdditional styling notes: ${polishNotes.trim()}` : ''

  return `Replace all the clothing on the person in the first image with the clothing shown in the second image.

The clothing to apply: ${intel.description} (${intel.primaryColor}, ${intel.pattern}, ${intel.material})

CRITICAL RULES:
1. REMOVE all of the person's current clothes first, then dress them in the second image's garment.
2. The person's face, hair, body, pose, and background must stay exactly the same — do not change the person at all.
3. The final garment must exactly match the second image — same color, pattern, texture, fit, and details.
4. Output a photorealistic photo, not an AI-looking image.
${polishSection}`
}
