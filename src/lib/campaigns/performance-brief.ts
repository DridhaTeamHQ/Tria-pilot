/**
 * PERFORMANCE BRIEF
 *
 * Generates the attribution + tracking layer that turns a campaign from
 * "creative output" into "measurable revenue channel". Indian D2C
 * specific: COD attribution is broken without these steps.
 *
 * Outputs:
 *   - Unique discount codes per creator (pulled from / created in DB)
 *   - UTM-tagged tracking links per creator (deterministic, no external service)
 *   - Post-purchase survey snippet for COD attribution
 *   - Target CAC / ROAS / conversion-rate sanity check
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface PerformanceTargets {
  /** Target customer acquisition cost in INR */
  targetCAC: number
  /** Required conversions to break even at given AOV */
  conversionsNeeded: number
  /** Target return on ad spend (revenue / budget) */
  targetROAS: number
  /** Target conversion rate (%) given expected reach */
  targetConversionRate: number
  /** Reasonableness flag — true if targets are within typical D2C bounds */
  isAchievable: boolean
  /** Plain-language reasoning */
  reasoning: string
}

export interface CreatorAttributionPlan {
  creatorId: string
  creatorName: string
  discountCode: string
  trackingLinkParams: Record<string, string>
  utmExample: string
}

export interface PerformanceBrief {
  targets: PerformanceTargets
  creatorAttribution: CreatorAttributionPlan[]
  postPurchaseSurvey: {
    question: string
    options: string[]
    instruction: string
  }
  codCheckoutSnippet: string
}

// ── Targets calculator ────────────────────────────────────────────────

interface TargetsInput {
  budget: number
  goal: 'awareness' | 'sales' | 'conversions' | 'launch' | 'traffic'
  estimatedReach?: { min: number; max: number }
  averageOrderValue?: number  // INR; defaults to typical D2C AOV
}

export function computeTargets(input: TargetsInput): PerformanceTargets {
  const aov = input.averageOrderValue || 1500
  const budget = Math.max(1, input.budget)
  const reach =
    input.estimatedReach
      ? (input.estimatedReach.min + input.estimatedReach.max) / 2
      : budget * 8 // rough fallback: ~₹0.125 per impression

  // Industry benchmarks for Indian D2C
  // Sales-driven: target CAC = 30% of AOV
  // Awareness: CAC less critical, optimize for reach
  let targetCAC: number
  let targetROAS: number
  if (input.goal === 'sales' || input.goal === 'conversions') {
    targetCAC = Math.round(aov * 0.30)
    targetROAS = 3.3  // 1 / 0.30
  } else if (input.goal === 'launch') {
    targetCAC = Math.round(aov * 0.45)
    targetROAS = 2.2
  } else if (input.goal === 'traffic') {
    targetCAC = Math.round(aov * 0.60)
    targetROAS = 1.65
  } else {
    // awareness — set targets loose, focus on reach
    targetCAC = Math.round(aov * 0.80)
    targetROAS = 1.25
  }

  const conversionsNeeded = Math.ceil(budget / targetCAC)
  const targetConversionRate = Number(((conversionsNeeded / reach) * 100).toFixed(2))

  const isAchievable = targetConversionRate <= 5
  let reasoning = ''
  if (targetConversionRate > 10) {
    reasoning = `Targets are ambitious — needs a ${targetConversionRate.toFixed(1)}% conversion rate vs typical D2C 1-3%. Either increase budget or relax CAC target.`
  } else if (targetConversionRate > 5) {
    reasoning = `Targets are stretchy — needs a ${targetConversionRate.toFixed(1)}% conversion rate. Top creators in fit categories can deliver this; mediocre fit cannot.`
  } else if (targetConversionRate < 0.3) {
    reasoning = `Targets are very conservative — high probability of beating them. Consider raising goals or reducing budget.`
  } else {
    reasoning = `Targets are healthy and achievable for the Indian D2C benchmark (1-3% conversion rate on creator-driven traffic).`
  }

  return {
    targetCAC,
    conversionsNeeded,
    targetROAS,
    targetConversionRate,
    isAchievable,
    reasoning,
  }
}

// ── Discount code generator ───────────────────────────────────────────
// Deterministic, brand-friendly, human-readable codes.
// Format: <CREATOR_FIRST_NAME><DISCOUNT>%  (e.g. POOJA20)

function sanitizeNameForCode(name: string): string {
  return (name || 'CREATOR')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 8) || 'CREATOR'
}

export function buildDiscountCode(creatorName: string, discountPercent: number, salt = ''): string {
  const base = sanitizeNameForCode(creatorName)
  const pct = Math.max(5, Math.min(50, Math.round(discountPercent)))
  if (salt) {
    return `${base}${pct}${salt.slice(0, 3).toUpperCase()}`
  }
  return `${base}${pct}`
}

/**
 * Get-or-create a discount code for a creator+brand pair.
 * Idempotent — calling repeatedly for the same (brand, creator) returns the existing code.
 */
export async function ensureDiscountCode(
  service: SupabaseClient,
  options: {
    brandId: string
    creatorId: string
    creatorName: string
    campaignId?: string | null
    discountPercent?: number
  },
): Promise<string> {
  const discount = options.discountPercent ?? 15

  // 1. Existing code for this brand+creator?
  const { data: existing } = await service
    .from('discount_codes')
    .select('id, code')
    .eq('brand_id', options.brandId)
    .eq('creator_id', options.creatorId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing?.code) {
    if (options.campaignId) {
      // Tag this campaign onto the existing code (most-recent-wins)
      await service
        .from('discount_codes')
        .update({ campaign_id: options.campaignId, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    }
    return existing.code
  }

  // 2. Generate a candidate; if it collides, append a salt
  let attempt = buildDiscountCode(options.creatorName, discount)
  for (let i = 0; i < 5; i++) {
    const { data: collision } = await service
      .from('discount_codes')
      .select('id')
      .eq('brand_id', options.brandId)
      .eq('code', attempt)
      .maybeSingle()
    if (!collision) break
    attempt = buildDiscountCode(options.creatorName, discount, String(Date.now() % 1000))
  }

  await service.from('discount_codes').insert({
    brand_id: options.brandId,
    creator_id: options.creatorId,
    campaign_id: options.campaignId || null,
    code: attempt,
    discount_type: 'percent',
    discount_value: discount,
  })

  return attempt
}

// ── UTM link builder ─────────────────────────────────────────────────

export function buildTrackingParams(options: {
  campaignSlug: string
  creatorId: string
  creatorName: string
  discountCode: string
}): Record<string, string> {
  return {
    utm_source: 'kiwikoo',
    utm_medium: 'creator',
    utm_campaign: options.campaignSlug.toLowerCase().replace(/\s+/g, '-'),
    utm_content: sanitizeNameForCode(options.creatorName).toLowerCase(),
    utm_term: options.discountCode,
    kw_creator: options.creatorId.slice(0, 8),
  }
}

export function appendTrackingToUrl(rawUrl: string, params: Record<string, string>): string {
  try {
    const u = new URL(rawUrl)
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v)
    return u.toString()
  } catch {
    // Fallback for invalid URLs — append as query string
    const qs = new URLSearchParams(params).toString()
    return `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}${qs}`
  }
}

// ── Post-purchase survey ─────────────────────────────────────────────

export function buildPostPurchaseSurvey(creatorNames: string[]): {
  question: string
  options: string[]
  instruction: string
} {
  const namesPart = creatorNames.length > 0 ? creatorNames.slice(0, 6) : []
  const options = [
    ...namesPart.map((n) => `Saw ${n} on Instagram / YouTube`),
    'Saw an ad (Meta / Google)',
    'Friend / family recommendation',
    'Found via search',
    'Other',
  ]
  return {
    question: 'How did you first hear about us?',
    options,
    instruction:
      'Add this question to your order confirmation email and Shopify thank-you page. For COD orders, include it on the delivery slip QR code or follow-up WhatsApp message. This is the only reliable way to attribute COD revenue to specific creators.',
  }
}

export function buildCodCheckoutSnippet(): string {
  return `<!-- Drop into your COD checkout success page -->
<script>
  window.kiwikoo_attribution = {
    code: new URLSearchParams(window.location.search).get('utm_term'),
    creator: new URLSearchParams(window.location.search).get('utm_content'),
    campaign: new URLSearchParams(window.location.search).get('utm_campaign'),
    source: new URLSearchParams(window.location.search).get('utm_source'),
  };
  if (window.kiwikoo_attribution.code) {
    document.cookie = 'kw_attr=' + encodeURIComponent(JSON.stringify(window.kiwikoo_attribution))
      + '; path=/; max-age=' + (60*60*24*60) + '; SameSite=Lax';
  }
</script>`
}
