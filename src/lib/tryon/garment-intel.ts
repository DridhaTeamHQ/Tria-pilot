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
import { createHash } from 'node:crypto'
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
  /**
   * Where the main graphic / print / design sits on the garment.
   * 'back' means the key design is on the back (e.g. a back-print tee) —
   * it is NOT visible when the wearer faces the camera.
   */
  graphicPlacement: 'front' | 'back' | 'both' | 'allover' | 'none'
  /** Which side of the garment the product photo is showing. */
  productView: 'front' | 'back' | 'side'
}

// ── IN-MEMORY CACHE ──────────────────────────────────────────────────────────

const garmentCache = new Map<string, { intel: GarmentIntelligence; timestamp: number }>()
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

// SHA-256 of the FULL image content. The old key used the first 120 chars
// of base64 which collided across products that share image format headers
// (PNG, JPEG with similar quantization tables), causing the analyzer to
// return stale intel for a different product. Full-content hash eliminates
// that class of bug entirely.
function getCacheKey(imageBase64: string): string {
  const clean = imageBase64.replace(/^data:image\/[a-z+]+;base64,/, '')
  return createHash('sha256').update(clean).digest('hex')
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
  graphicPlacement: 'none',
  productView: 'front',
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
    { test: /\b(jeans|trouser|pants?|chino|jogger|legging|cargo)\b/, type: 'pants', coverage: 'lower_only', desc: 'Pants/trousers' },
    { test: /\b(skirt|midi)\b/, type: 'skirt', coverage: 'lower_only', desc: 'A skirt' },
    { test: /\b(shorts|bermudas|bermuda)\b/, type: 'pants', coverage: 'lower_only', desc: 'Shorts' },
    { test: /\b(shirt|t.?shirt|tee|blouse|top|tank|crop)\b/, type: 'top', coverage: 'upper_only', desc: 'A top' },
    { test: /\b(jacket|coat|blazer|cardigan|hoodie|outerwear|trucker)\b/, type: 'outerwear', coverage: 'layered', desc: 'Outerwear' },
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
      const patterns = ['floral', 'striped', 'plaid', 'checkered', 'printed', 'solid', 'paisley', 'graphic', 'logo', 'print']
      let foundPattern = patterns.find((p) => new RegExp(`\\b${p}\\b`).test(t)) || undefined
      if (foundPattern && ['graphic', 'logo', 'print'].includes(foundPattern)) foundPattern = 'printed'

      // Material keywords
      const materials = ['cotton', 'silk', 'denim', 'linen', 'wool', 'polyester', 'velvet', 'satin', 'leather']
      const foundMaterial = materials.find((mat) => new RegExp(`\\b${mat}\\b`).test(t)) || FALLBACK_INTEL.material

      return {
        ...FALLBACK_INTEL,
        garmentType: m.type,
        coverage: m.coverage,
        description: m.desc + (foundColor ? ` in ${foundColor}` : ''),
        primaryColor: foundColor || FALLBACK_INTEL.primaryColor,
        pattern: foundPattern || '',
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

// ── TEXT-HINT OVERRIDE ───────────────────────────────────────────────────────
// Last-resort correction: if the product text contains an unambiguous
// keyword that contradicts the AI-derived garmentType / coverage, force
// the correct classification. This catches the case where a model is
// wearing multiple garments in the product image and the AI fixates on
// the wrong one.
function applyTextHintOverride(intel: GarmentIntelligence, textHint: string): GarmentIntelligence {
  const t = textHint.toLowerCase()

  // Strong bottom-wear keywords
  const isBottom = /\b(jeans|trouser|pant|chino|jogger|legging|cargo|skirt|short|bermuda|palazzo|culotte|capri)\b/.test(t)
  if (isBottom && intel.coverage !== 'lower_only') {
    return {
      ...intel,
      garmentType: /skirt/.test(t) ? 'skirt' : 'pants',
      coverage: 'lower_only',
    }
  }

  // Strong full-body keywords
  const isFull = /\b(saree|sari|lehenga|gown|jumpsuit|romper|playsuit)\b/.test(t)
  if (isFull && intel.coverage !== 'full_body') {
    const type: GarmentType = /saree|sari/.test(t) ? 'saree'
      : /lehenga/.test(t) ? 'lehenga'
      : /jumpsuit|romper|playsuit/.test(t) ? 'jumpsuit'
      : 'dress'
    return { ...intel, garmentType: type, coverage: 'full_body' }
  }

  // 'dress' or 'frock' (unambiguous full-body)
  const isDress = /\b(dress|frock|gown)\b/.test(t) && !/jacket/.test(t)
  if (isDress && intel.coverage !== 'full_body') {
    return { ...intel, garmentType: 'dress', coverage: 'full_body' }
  }

  // 'co-ord set' / 'coord set'
  if (/\b(co.?ord)\b/.test(t) && intel.coverage !== 'full_body') {
    return { ...intel, garmentType: 'co_ord_set', coverage: 'full_body' }
  }

  // Strong upper-wear keywords (only if AI classified non-upper)
  const isUpper = /\b(shirt|t.?shirt|tee|blouse|top|tank|crop top|cami|tunic|kurti|jacket|blazer|cardigan|hoodie)\b/.test(t)
  if (isUpper && intel.coverage === 'lower_only') {
    return {
      ...intel,
      garmentType: /jacket|blazer|cardigan|hoodie/.test(t) ? 'outerwear' : 'top',
      coverage: /jacket|blazer|cardigan|hoodie/.test(t) ? 'layered' : 'upper_only',
    }
  }

  return intel
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
5. GRAPHIC PLACEMENT — critical for try-on: determine WHERE the main print/graphic/design sits.
   - If the big graphic is on the BACK of the garment (e.g. a back-print tee), set graphicPlacement='back'. A back graphic is NOT visible when the wearer faces the camera.
   - If on the chest/front, 'front'. If on both sides, 'both'. If an all-over print, 'allover'. If plain/no graphic, 'none'.
   Also report productView: which side of the garment the product photo shows ('front', 'back', or 'side').
6. LOGOS / EMBROIDERY / MONOGRAMS — treat small brand marks as CRITICAL garment identity.
   - If there is a chest logo, embroidered emblem, stitched icon, monogram, crest, badge, or small text mark, include it in keyFeatures.
   - Mention its approximate placement and style, for example: "small embroidered bee logo on left chest", "tiny polo horse logo on chest pocket", "script wordmark on upper back".
   - Do NOT describe it generically as just "logo" when you can identify its form, color, size, or location.

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
  "keyFeatures": ["array", "of", "visible", "details", "up to 5", "include logos or embroidery if present"],
  "visibleBottomInPhoto": "describe bottom wear visible on the model, or 'none' if not applicable",
  "visibleTopInPhoto": "describe top wear visible on the model when product is bottom, or 'none' if not applicable",
  "bottomWearSuggestion": "complementary bottom suggestion, or 'included' if full-body",
  "description": "ONE concrete sentence describing the product garment specifically",
  "promptModifiers": ["styling instruction 1", "styling instruction 2"],
  "graphicPlacement": "front|back|both|allover|none",
  "productView": "front|back|side"
}`

async function analyzeGarmentWithGPT4o(
  cleanBase64: string,
  textHint?: string,
): Promise<GarmentIntelligence | null> {
  if (!(process.env.OPENAI_API_KEY || '').trim()) return null

  try {
    const openai = getOpenAI()
    // The text hint is AUTHORITATIVE for product identification. When a
    // product image shows a model wearing multiple garments (e.g. jeans
    // with a styling top), the analyzer would otherwise fixate on whichever
    // is more visually prominent. The product name tells us definitively
    // which garment is the actual product.
    const userMsg = textHint
      ? `The product is described as: "${textHint.slice(0, 200)}".

This product name is AUTHORITATIVE — it tells you which specific garment in the image is the actual product. If the image shows a model wearing multiple items (e.g. a top AND pants), focus exclusively on the item that matches this product description. The other items on the model are styling — they are NOT the product.

For example:
- If product is "jeans" or "pants" → garmentType=pants, coverage=lower_only, even if a top is more visually prominent
- If product is "blouse" or "top" → garmentType=top, coverage=upper_only, even if pants are prominently shown
- If product is "dress" or "kurta" → garmentType=dress, coverage=full_body

Analyze the garment image and return JSON. The product name fact above OVERRIDES any visual ambiguity.`
      : 'Analyze the garment image and return JSON. Identify the MAIN garment being sold/showcased.'

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

    let intel: GarmentIntelligence = {
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
      graphicPlacement: (['front', 'back', 'both', 'allover', 'none'].includes(parsed.graphicPlacement as string)
        ? parsed.graphicPlacement : 'none') as GarmentIntelligence['graphicPlacement'],
      productView: (['front', 'back', 'side'].includes(parsed.productView as string)
        ? parsed.productView : 'front') as GarmentIntelligence['productView'],
    }

    // ── HARD OVERRIDE FROM TEXT HINT ─────────────────────────────────
    // Final safety net: if the product text has an unambiguous keyword,
    // override the classification regardless of what GPT-4o returned.
    // This catches the rare case where the on-model image is so dominated
    // by styling clothes that even the new prompt can't disambiguate.
    if (textHint) {
      const corrected = applyTextHintOverride(intel, textHint)
      if (corrected !== intel) {
        if (isDev) console.log(`🛡️ Text-hint override: ${intel.garmentType}/${intel.coverage} → ${corrected.garmentType}/${corrected.coverage}`)
        intel = corrected
      }
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

  // ── FALLBACK: TEXT HEURISTIC (instant, no Gemini) ────────────────────
  // GPT-4o failed. We deliberately DO NOT fall through to a Gemini retry
  // chain here — that chain (4 models × retries × 30s timeout) could burn
  // 60-90s and blow the whole Vercel function budget BEFORE the actual
  // image generation ever runs. The garment intel is only a hint anyway:
  // the GPT-4o orchestrator looks at the real garment image directly.
  //
  // So on GPT-4o failure we use the instant text heuristic (parses the
  // product name/description) and move on. Zero blocking.
  const heuristic = inferIntelFromText(textHint)
  if (heuristic) {
    if (isDev) console.log(`🧠 Heuristic intel: ${heuristic.garmentType} (${heuristic.coverage}) — GPT-4o unavailable, skipped slow Gemini fallback`)
    setCache(cacheKey, heuristic)
    return heuristic
  }
  if (isDev) console.warn('🧠 Garment intel: GPT-4o failed + no text hint — using generic fallback')
  return FALLBACK_INTEL
}

// ── SMART PROMPT COMPOSER ────────────────────────────────────────────────────

export function composeSmartPrompt(
  intel: GarmentIntelligence,
  options: { aspectRatio?: string; polishNotes?: string }
): string {
  const { polishNotes } = options

  const polishSection = polishNotes?.trim() ? `\nAdditional styling notes: ${polishNotes.trim()}` : ''
  const garmentSummary = `${intel.description} (${intel.primaryColor}, ${intel.pattern}, ${intel.material})`
  const garmentDetailLines = [
    intel.neckline && intel.neckline !== 'other' ? `- Neckline: ${intel.neckline}` : '',
    intel.sleeves && intel.sleeves !== 'other' ? `- Sleeves: ${intel.sleeves}` : '',
    intel.fit ? `- Fit: ${intel.fit}` : '',
    intel.length ? `- Length: ${intel.length}` : '',
    intel.keyFeatures.length > 0 ? `- Key features: ${intel.keyFeatures.slice(0, 4).join(', ')}` : '',
  ].filter(Boolean)

  const preserveBodyLine =
    intel.coverage === 'upper_only'
      ? `5. KEEP the person's existing lower-body clothing, shoes, watch, bracelets, sunglasses, hands, body shape, and leg proportions exactly the same. Only the upper-body garment is allowed to change.`
      : intel.coverage === 'lower_only'
        ? `5. KEEP the person's existing upper-body clothing, hairstyle, sunglasses, watch, bracelets, torso proportions, and arm position exactly the same. Only the lower-body garment is allowed to change.`
        : `5. KEEP the person's face, hairstyle, sunglasses, watch, bracelets, body shape, stance, framing, and background exactly the same. Only the garment areas covered by the product may change.`

  const coverageSpecificLine =
    intel.coverage === 'upper_only'
      ? `6. This is an upper-body swap. Do not redesign the pants, do not change the shoes, and do not slim, widen, or restyle the person's body.`
      : intel.coverage === 'lower_only'
        ? `6. This is a lower-body swap. Do not redesign the shirt, jacket, face, or hairstyle. Ensure the new lower garment is fully visible and naturally worn.`
        : `6. This is a full-outfit swap. Preserve the exact person and scene, but match the full outfit from Image 2.`

  return `Apply a photorealistic virtual try-on using Image 1 as the identity/source photo and Image 2 as the garment reference.

Target garment from Image 2: ${garmentSummary}
${garmentDetailLines.length > 0 ? `\nGarment details:\n${garmentDetailLines.join('\n')}` : ''}

CRITICAL RULES:
1. The output must be the exact same person from Image 1.
2. Preserve the exact face, skin tone, hairstyle, facial hair, sunglasses, expression, body shape, arm position, hand position, pose, camera angle, framing, and background from Image 1.
3. Match the garment from Image 2 exactly: same color, pattern, texture, fit, silhouette, sleeve length, hemline, and design details.
4. Do not beautify, stylize, age-shift, gender-shift, slim, broaden, or otherwise change the person.
${preserveBodyLine}
${coverageSpecificLine}
7. Output a realistic photograph with natural lighting and fabric drape. It must look like the same person simply wearing the new garment, not a different model.
${polishSection}`
}
