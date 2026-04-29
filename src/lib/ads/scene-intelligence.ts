/**
 * SCENE INTELLIGENCE
 *
 * Analyses a product's category, tags, description, and price tier and
 * returns ranked ad-style recommendations with environment/lighting/styling
 * rationale — no LLM required (pure deterministic signal matching).
 *
 * Used by:
 *   - /api/ads/auto-style  (standalone product → preset recommender)
 *   - /api/campaigns/suggest-from-products  (part of full campaign brief)
 */

import 'server-only'
import { AD_PRESETS, type AdPresetId, type AdPresetCategory } from './ad-styles'

// ── Types ─────────────────────────────────────────────────────────────────

export interface ProductSignals {
  name: string
  description?: string | null
  category?: string | null
  tags?: string[]
  price?: number | null
  /** Inferred or supplied: 'fashion' | 'beauty' | 'lifestyle' | 'sports' | 'jewelry' | 'tech' | 'food' | 'general' */
  verticalHint?: string
}

export interface StyleRecommendation {
  presetId: AdPresetId
  presetName: string
  score: number          // 0-100
  rationale: string
  environment: string    // e.g. "Golden hour garden", "Studio editorial"
  lightingMood: string   // e.g. "Warm natural", "Neo-noir neon"
  characterSuggestion: string  // e.g. "Indian woman, modern South Delhi", "No character needed"
  platformFit: string[]  // e.g. ["instagram", "facebook"]
}

export interface SceneIntelligenceResult {
  topRecommendations: StyleRecommendation[]   // up to 3, scored descending
  inferredVertical: string
  priceTier: 'budget' | 'mid' | 'premium' | 'luxury'
  suggestedAspectRatio: '1:1' | '9:16' | '4:5'
  suggestedCta: 'shop_now' | 'buy_now' | 'explore' | 'learn_more'
  captionTone: 'casual' | 'premium' | 'confident'
}

// ── Signal extraction ─────────────────────────────────────────────────────

function inferVertical(signals: ProductSignals): string {
  const text = [
    signals.name,
    signals.description,
    signals.category,
    ...(signals.tags || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (/jewel|ring|necklace|bracelet|earring|pendant|gold|silver|diamond/.test(text)) return 'jewelry'
  if (/sport|gym|fitness|athletic|run|yoga|cricket|football|basketball/.test(text)) return 'sports'
  if (/beauty|skincare|makeup|lipstick|serum|moisturizer|cosmetic|perfume/.test(text)) return 'beauty'
  if (/food|snack|beverage|drink|chai|coffee|nutrition|supplement/.test(text)) return 'food'
  if (/tech|phone|gadget|electronic|laptop|device|earphone|watch/.test(text)) return 'tech'
  if (/saree|kurta|lehenga|dupatta|ethnic|traditional|indian|festive/.test(text)) return 'indian_fashion'
  if (/dress|top|shirt|jeans|denim|jacket|hoodie|sneaker|shoe|bag|fashion/.test(text)) return 'fashion'
  if (/home|decor|furniture|candle|kitchen|bedding|cushion/.test(text)) return 'lifestyle'
  return 'general'
}

function inferPriceTier(price: number | null | undefined): 'budget' | 'mid' | 'premium' | 'luxury' {
  if (!price) return 'mid'
  if (price < 500) return 'budget'
  if (price < 2000) return 'mid'
  if (price < 8000) return 'premium'
  return 'luxury'
}

// ── Preset → vertical affinity matrix ─────────────────────────────────────
// Each entry is a list of verticals this preset scores well for.

const PRESET_VERTICAL_AFFINITY: Partial<Record<AdPresetId, string[]>> = {
  CINEMATIC_GOLDEN_GARDEN:    ['fashion', 'beauty', 'lifestyle', 'indian_fashion', 'jewelry'],
  CINEMATIC_STUDIO_EDITORIAL: ['fashion', 'indian_fashion', 'beauty'],
  EDITORIAL_PREMIUM:          ['fashion', 'luxury', 'beauty', 'lifestyle'],
  EDITORIAL_FASHION:          ['fashion', 'indian_fashion', 'beauty'],
  CINEMATIC_NEO_NOIR:         ['fashion', 'jewelry', 'tech', 'sports'],
  CINEMATIC_JEWELRY_CLOSEUP:  ['jewelry', 'beauty'],
  CINEMATIC_STREET_CULTURE:   ['fashion', 'sports', 'streetwear'],
  CINEMATIC_IPHONE_STREET:    ['fashion', 'sports', 'general'],
  UGC_CANDID:                 ['fashion', 'beauty', 'food', 'general', 'lifestyle'],
  UGC_STREET:                 ['fashion', 'sports', 'streetwear'],
  UGC_POV_INFLUENCER:         ['food', 'beauty', 'fashion', 'general'],
  SPORTS_DYNAMIC:             ['sports', 'tech'],
  SPORTS_BOXING_ACTION:       ['sports'],
  EDITORIAL_STREET:           ['fashion', 'streetwear', 'sports'],
  EDITORIAL_RETRO:            ['fashion', 'lifestyle', 'beauty'],
  EDITORIAL_CONCEPTUAL:       ['fashion', 'beauty', 'lifestyle'],
  CREATIVE_CINEMATIC:         ['sports', 'tech', 'fashion'],
  CREATIVE_SURREAL:           ['tech', 'fashion', 'beauty', 'lifestyle'],
  CREATIVE_BOLD_COLOR:        ['fashion', 'beauty', 'food'],
  CREATIVE_BERAW_GLITCH:      ['tech', 'sports', 'fashion'],
  PRODUCT_LIFESTYLE:          ['lifestyle', 'general', 'food', 'tech', 'beauty'],
  PERF_BEST_QUALITY:          ['fashion', 'beauty', 'jewelry', 'lifestyle', 'general'],
  CINEMATIC_RETRO_FLIRTY:     ['fashion', 'beauty', 'lifestyle'],
  CINEMATIC_MINECRAFT_HYBRID: ['tech', 'sports', 'fashion'],
  CINEMATIC_DARK_NEO_NOIR:    ['fashion', 'jewelry', 'tech'],
}

// Price tier bonus: which presets are boosted for each price tier
const PRICE_TIER_BOOST: Record<string, AdPresetId[]> = {
  luxury:  ['EDITORIAL_PREMIUM', 'PERF_BEST_QUALITY', 'CINEMATIC_GOLDEN_GARDEN', 'CINEMATIC_JEWELRY_CLOSEUP', 'CINEMATIC_NEO_NOIR', 'CINEMATIC_DARK_NEO_NOIR'],
  premium: ['EDITORIAL_FASHION', 'CINEMATIC_STUDIO_EDITORIAL', 'CINEMATIC_RETRO_FLIRTY', 'EDITORIAL_RETRO'],
  mid:     ['UGC_CANDID', 'UGC_STREET', 'CINEMATIC_IPHONE_STREET', 'CINEMATIC_STREET_CULTURE', 'PRODUCT_LIFESTYLE'],
  budget:  ['UGC_CANDID', 'UGC_STREET', 'UGC_POV_INFLUENCER', 'CREATIVE_BOLD_COLOR'],
}

// ── Scoring ────────────────────────────────────────────────────────────────

function scorePreset(
  presetId: AdPresetId,
  vertical: string,
  priceTier: 'budget' | 'mid' | 'premium' | 'luxury',
): number {
  let score = 30

  const affinities = PRESET_VERTICAL_AFFINITY[presetId] || []
  if (affinities.includes(vertical)) score += 40
  else if (affinities.includes('general')) score += 15

  if (PRICE_TIER_BOOST[priceTier]?.includes(presetId)) score += 20

  // Category stability bonus
  const preset = AD_PRESETS.find(p => p.id === presetId)
  if (!preset) return score

  // Slight preference for cinematic + editorial for most verticals
  if (['cinematic', 'editorial'].includes(preset.category) && vertical !== 'food') score += 5

  return Math.min(100, score)
}

// ── Environment / lighting labels per preset ──────────────────────────────

const PRESET_SCENE_LABELS: Partial<Record<AdPresetId, { environment: string; lightingMood: string }>> = {
  CINEMATIC_GOLDEN_GARDEN:    { environment: 'Garden — golden hour, oak tree backdrop', lightingMood: 'Warm golden backlight with lens flare' },
  CINEMATIC_STUDIO_EDITORIAL: { environment: 'Clean fashion studio', lightingMood: 'Neutral soft key, professional editorial' },
  EDITORIAL_PREMIUM:          { environment: 'Architecture / silk interior', lightingMood: 'Cinematic 45° soft key, warm practicals' },
  EDITORIAL_FASHION:          { environment: 'Studio colored backdrop or minimal set', lightingMood: 'Key + rim with optional gel split' },
  CINEMATIC_NEO_NOIR:         { environment: 'Rooftop at night, city glow', lightingMood: 'No flash — neon ambient only' },
  CINEMATIC_JEWELRY_CLOSEUP:  { environment: 'Intimate close-up, ocean / stairwell', lightingMood: 'Natural ambient catching metal surfaces' },
  CINEMATIC_STREET_CULTURE:   { environment: 'Autumn park bench, 90s street', lightingMood: 'Natural golden hour, analog film grain' },
  CINEMATIC_IPHONE_STREET:    { environment: 'City street corner, urban context', lightingMood: 'Soft afternoon natural, iPhone quality' },
  UGC_CANDID:                 { environment: 'Urban café, sidewalk, warm room', lightingMood: 'Natural window light or overcast daylight' },
  UGC_STREET:                 { environment: 'Pedestrian crosswalk / metro overpass', lightingMood: 'Natural daylight or dusk city split' },
  UGC_POV_INFLUENCER:         { environment: 'Asian restaurant, table-level POV', lightingMood: 'Mixed indoor artificial, warm catchlights' },
  SPORTS_DYNAMIC:             { environment: 'Tennis court / snowboard slope / studio', lightingMood: 'Natural athletic or golden hour rim' },
  SPORTS_BOXING_ACTION:       { environment: 'Crimson red studio backdrop', lightingMood: 'Neutral studio, dynamic drama' },
  EDITORIAL_STREET:           { environment: 'Graffiti wall, overpass, wet asphalt', lightingMood: 'Harsh directional or neon night' },
  EDITORIAL_RETRO:            { environment: 'Vintage doorway, tennis court, director chair', lightingMood: 'Frontal flash, analog Kodachrome' },
  EDITORIAL_CONCEPTUAL:       { environment: 'Metro platform / reeded glass / composite', lightingMood: 'Concept-specific (see preset)' },
  CREATIVE_CINEMATIC:         { environment: 'Runner backdrop / snowboard / overpass', lightingMood: 'Golden rim, film grain, motion' },
  CREATIVE_SURREAL:           { environment: 'Realistic base + one surreal twist', lightingMood: 'Consistent physical lighting, unexpected element' },
  CREATIVE_BOLD_COLOR:        { environment: 'Saturated studio or reeded glass', lightingMood: 'Gel split — warm orange + cool lime' },
  CREATIVE_BERAW_GLITCH:      { environment: 'Miami pastel street — human + voxel twin', lightingMood: 'Clean Miami daylight, shadowless' },
  PRODUCT_LIFESTYLE:          { environment: 'Gas station night / snowy mountain / academic room', lightingMood: 'Warm directional, storytelling light' },
  PERF_BEST_QUALITY:          { environment: 'Architecture or silk interior or cloud sky', lightingMood: 'Balanced premium rig, full dynamic range' },
  CINEMATIC_RETRO_FLIRTY:     { environment: 'Mid-century modern interior, warm wood', lightingMood: 'Warm practical overhead, Kodak Portra grain' },
  CINEMATIC_MINECRAFT_HYBRID: { environment: 'Voxel Minecraft world, photorealistic subject', lightingMood: 'Minecraft daylight, unified ambient' },
  CINEMATIC_DARK_NEO_NOIR:    { environment: 'Deep crimson studio backdrop', lightingMood: 'Low-key cinematic side light, high contrast' },
}

function getCharacterSuggestion(vertical: string, priceTier: string): string {
  if (vertical === 'jewelry') return 'Young woman — extreme close-up, hand-face composition'
  if (vertical === 'sports') return 'Athletic figure — dynamic pose, no character also works for product hero'
  if (vertical === 'food') return 'POV hand + food styling — no full character needed'
  if (vertical === 'tech') return 'Minimal character — product hero recommended'
  if (vertical === 'indian_fashion') return 'Indian woman / man, modern South Delhi contemporary styling'
  if (priceTier === 'luxury' || priceTier === 'premium') return 'Young woman or man, editorial fashion styling, high-confidence expression'
  return 'Young woman or man, casual contemporary, Indian market identity'
}

// ── Public API ─────────────────────────────────────────────────────────────

export function analyseProductForScene(signals: ProductSignals): SceneIntelligenceResult {
  const vertical = signals.verticalHint || inferVertical(signals)
  const priceTier = inferPriceTier(signals.price)

  // Score all presets
  const scored = AD_PRESETS.map(p => ({
    presetId: p.id,
    score: scorePreset(p.id, vertical, priceTier),
  })).sort((a, b) => b.score - a.score)

  const top3 = scored.slice(0, 3)

  const topRecommendations: StyleRecommendation[] = top3.map(({ presetId, score }) => {
    const preset = AD_PRESETS.find(p => p.id === presetId)!
    const labels = PRESET_SCENE_LABELS[presetId] || {
      environment: preset.sceneGuide.slice(0, 80) + '...',
      lightingMood: preset.lightingGuide.slice(0, 60) + '...',
    }

    const rationale = buildRationale(presetId, vertical, priceTier, score)

    return {
      presetId,
      presetName: preset.name,
      score,
      rationale,
      environment: labels.environment,
      lightingMood: labels.lightingMood,
      characterSuggestion: getCharacterSuggestion(vertical, priceTier),
      platformFit: preset.platforms as string[],
    }
  })

  return {
    topRecommendations,
    inferredVertical: vertical,
    priceTier,
    suggestedAspectRatio: priceTier === 'luxury' ? '4:5' : vertical === 'food' ? '1:1' : '9:16',
    suggestedCta: priceTier === 'luxury' ? 'explore' : priceTier === 'premium' ? 'shop_now' : 'buy_now',
    captionTone: priceTier === 'luxury' ? 'premium' : priceTier === 'budget' ? 'casual' : 'confident',
  }
}

function buildRationale(
  presetId: AdPresetId,
  vertical: string,
  priceTier: string,
  score: number,
): string {
  const affinities = PRESET_VERTICAL_AFFINITY[presetId] || []
  const verticalMatch = affinities.includes(vertical)
  const tierMatch = PRICE_TIER_BOOST[priceTier]?.includes(presetId)

  const parts: string[] = []
  if (verticalMatch) parts.push(`strong vertical fit for ${vertical}`)
  if (tierMatch) parts.push(`ideal for ${priceTier}-tier pricing`)
  if (!verticalMatch && !tierMatch) parts.push('broad appeal across categories')

  const preset = AD_PRESETS.find(p => p.id === presetId)
  if (preset?.whenToUse?.length) {
    parts.push(`best for: ${preset.whenToUse.slice(0, 2).join(', ')}`)
  }

  return parts.join(' · ') || `Recommended (score ${score})`
}

/**
 * Quick helper: returns only the top preset ID for a product.
 * Used when you just need the best match without full detail.
 */
export function getBestPresetForProduct(signals: ProductSignals): AdPresetId {
  const result = analyseProductForScene(signals)
  return result.topRecommendations[0]?.presetId ?? 'PERF_BEST_QUALITY'
}
