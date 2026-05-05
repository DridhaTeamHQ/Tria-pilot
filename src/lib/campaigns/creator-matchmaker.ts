/**
 * CREATOR MATCHMAKER
 *
 * Given a brand + a set of products, rank platform creators by fit.
 * Combines deterministic signals (engagement, retention, niche overlap,
 * audience match, badge tier, follower band) with an LLM rationale pass
 * for the top candidates.
 *
 * Used by:
 *   - /api/campaigns/recommend-creators (standalone creator picker)
 *   - /api/campaigns/suggest-from-products (full campaign builder)
 *
 * Design rules:
 *   1. Deterministic ranking first — if the LLM is unavailable we still
 *      return a reasonable list.
 *   2. LLM only re-ranks the top 25 to keep cost predictable.
 *   3. Every match returns a structured score breakdown so brand UI can
 *      show WHY a creator was picked.
 */

import 'server-only'
import OpenAI from 'openai'
import { getOpenAIKey } from '@/lib/config/api-keys'
import { stripInjectionTokens, USER_DATA_GUARD_PROMPT } from '@/lib/security/prompt-injection'

export interface CreatorCandidate {
  userId: string
  name: string | null
  bio: string | null
  niches: string[]
  followers: number | null
  engagementRate: number | null
  audienceRate: number | null
  retentionRate: number | null
  badgeTier: string | null
  badgeScore: number | null
  gender: string | null
  audienceType: string | null
  preferredCategories: string[]
  pricePerPost: number | null
  socials: Record<string, unknown>
}

export interface ProductContext {
  id: string
  name: string
  description: string | null
  category: string | null
  tags: string[]
  audience: string | null
  price: number | null
}

export interface BrandContext {
  companyName: string | null
  vertical: string | null
  brandType: string | null
  targetAudience: string | null
  budgetRange: string | null
}

export interface CreatorMatchScore {
  creatorId: string
  /** Final 0-100 score after LLM reranking (or deterministic if no LLM) */
  matchScore: number
  /** Sub-scores so brand UI can show WHY this creator was matched */
  breakdown: {
    nicheOverlap: number       // 0-100
    audienceFit: number         // 0-100
    engagementQuality: number   // 0-100
    contentRelevance: number    // 0-100
    budgetFit: number           // 0-100
  }
  reason: string
  /** Concrete pitch the brand can use when reaching out */
  outreachAngle: string
  /** Estimated cost for one post based on creator's pricePerPost */
  estimatedCost: number | null
}

// ── Stage 1: deterministic scoring ────────────────────────────────────

function nicheOverlapScore(creator: CreatorCandidate, products: ProductContext[]): number {
  if (!creator.niches?.length) return 0
  const productSignals = new Set<string>()
  for (const p of products) {
    if (p.category) productSignals.add(p.category.toLowerCase())
    for (const t of p.tags || []) productSignals.add(t.toLowerCase())
  }
  if (productSignals.size === 0) return 30 // neutral if products have no tags

  const creatorNiches = new Set(creator.niches.map(n => n.toLowerCase()))
  const preferred = new Set((creator.preferredCategories || []).map(c => c.toLowerCase()))

  let overlap = 0
  let total = 0
  for (const sig of productSignals) {
    total += 2
    if (creatorNiches.has(sig)) overlap += 2
    else if (preferred.has(sig)) overlap += 1
    else {
      // partial token match (e.g., "streetwear" vs "street")
      for (const niche of creatorNiches) {
        if (niche.includes(sig) || sig.includes(niche)) {
          overlap += 1
          break
        }
      }
    }
  }
  return total === 0 ? 30 : Math.min(100, Math.round((overlap / total) * 100))
}

function audienceFitScore(creator: CreatorCandidate, brand: BrandContext, products: ProductContext[]): number {
  // Combine creator gender/audience-type with brand audience signal
  let score = 50
  const targetAudience = (brand.targetAudience || '').toLowerCase()
  const productAudience = products.map(p => (p.audience || '').toLowerCase()).join(' ')
  const combined = `${targetAudience} ${productAudience}`

  if (creator.audienceType) {
    if (combined.includes(creator.audienceType.toLowerCase())) score += 25
  }
  if (creator.gender && combined.includes(creator.gender.toLowerCase())) {
    score += 15
  }
  return Math.min(100, score)
}

function engagementQualityScore(creator: CreatorCandidate): number {
  // Weighted blend of engagement, retention, audience-rate, and badge
  const er = (creator.engagementRate ?? 0) * 1000  // typical 0.01-0.10 → 10-100
  const ret = creator.retentionRate ?? 0
  const aud = creator.audienceRate ?? 0
  const badge = creator.badgeScore ?? 0

  const blended =
    Math.min(100, er) * 0.35 +
    Math.min(100, ret) * 0.25 +
    Math.min(100, aud) * 0.20 +
    Math.min(100, badge) * 0.20

  return Math.round(blended)
}

function budgetFitScore(creator: CreatorCandidate, brand: BrandContext): number {
  if (!creator.pricePerPost) return 50 // unknown
  const budgetStr = (brand.budgetRange || '').toLowerCase()

  // Parse common budget formats: "10k-50k", "₹5,000", "5000-20000", "small / medium / large"
  let budgetMid = 0
  const match = budgetStr.match(/(\d[\d,]*)/g)
  if (match && match.length > 0) {
    const nums = match.map(s => parseInt(s.replace(/,/g, ''), 10)).filter(n => Number.isFinite(n))
    if (nums.length >= 2) budgetMid = (nums[0] + nums[1]) / 2
    else if (nums.length === 1) budgetMid = nums[0]
  } else if (budgetStr.includes('large') || budgetStr.includes('high')) budgetMid = 50000
  else if (budgetStr.includes('medium')) budgetMid = 20000
  else if (budgetStr.includes('small') || budgetStr.includes('low')) budgetMid = 5000

  if (budgetMid === 0) return 50
  const ratio = budgetMid / creator.pricePerPost
  if (ratio >= 1.5) return 100   // budget comfortably covers
  if (ratio >= 1.0) return 85
  if (ratio >= 0.7) return 65
  if (ratio >= 0.5) return 40
  return 20
}

function deterministicScore(
  creator: CreatorCandidate,
  brand: BrandContext,
  products: ProductContext[]
): CreatorMatchScore {
  const breakdown = {
    nicheOverlap: nicheOverlapScore(creator, products),
    audienceFit: audienceFitScore(creator, brand, products),
    engagementQuality: engagementQualityScore(creator),
    contentRelevance: 50, // filled in by LLM stage if used
    budgetFit: budgetFitScore(creator, brand),
  }

  // Weighted blend (engagement quality and niche are the heaviest signals)
  const score = Math.round(
    breakdown.nicheOverlap * 0.30 +
    breakdown.audienceFit * 0.20 +
    breakdown.engagementQuality * 0.25 +
    breakdown.contentRelevance * 0.10 +
    breakdown.budgetFit * 0.15
  )

  return {
    creatorId: creator.userId,
    matchScore: score,
    breakdown,
    reason: 'Pre-LLM deterministic match (niche + engagement + budget alignment).',
    outreachAngle: '',
    estimatedCost: creator.pricePerPost,
  }
}

// ── Stage 2: LLM rerank top candidates ────────────────────────────────

async function rerankWithLLM(
  topCandidates: Array<{ creator: CreatorCandidate; det: CreatorMatchScore }>,
  brand: BrandContext,
  products: ProductContext[]
): Promise<CreatorMatchScore[]> {
  const apiKey = getOpenAIKey()
  if (!apiKey) {
    return topCandidates.map(t => t.det)
  }
  const openai = new OpenAI({ apiKey })

  // SECURITY: bios + product descriptions are user-controlled. Strip
  // injection tokens (zero-width chars, [INST], "ignore previous", etc.)
  // before they flow into the LLM prompt. The system prompt also tells
  // the model to treat USER_DATA blocks as untrusted.
  const productSummary = products
    .map(p => `- ${stripInjectionTokens(p.name).slice(0, 200)}${p.category ? ` (${stripInjectionTokens(p.category).slice(0, 80)})` : ''}: ${stripInjectionTokens(p.description || 'no description').slice(0, 500)}`)
    .join('\n')

  const candidatePayload = topCandidates.map(t => ({
    id: t.creator.userId,
    name: stripInjectionTokens(t.creator.name || 'Creator').slice(0, 120),
    bio: stripInjectionTokens(t.creator.bio || '').slice(0, 500),
    niches: t.creator.niches,
    followers: t.creator.followers,
    engagementPct: ((t.creator.engagementRate ?? 0) * 100).toFixed(2),
    audienceType: t.creator.audienceType,
    pricePerPost: t.creator.pricePerPost,
    deterministicScore: t.det.matchScore,
    deterministicBreakdown: t.det.breakdown,
  }))

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a creator-brand fit analyst for an Indian creator commerce platform.
For each candidate, judge content fit against the brand's products.
Return JSON: { "matches": [{"id", "contentRelevance" (0-100, your assessment), "finalScore" (0-100, override the deterministic score with your judgment), "reason" (one sentence), "outreachAngle" (one sentence pitch the brand can send)}] }
Be honest — penalize obvious mismatches even if niches overlap. Reward creators whose content style aligns with the product's vibe.

${USER_DATA_GUARD_PROMPT}`,
        },
        {
          role: 'user',
          content: `Brand: ${brand.companyName || 'unknown'} (${brand.vertical || 'unknown vertical'}, ${brand.brandType || 'unknown type'})
Target audience: ${brand.targetAudience || 'general'}

Products to promote:
${productSummary}

Candidates:
${JSON.stringify(candidatePayload, null, 2)}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 3000,
    })

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}')
    const matches: Array<{
      id: string
      contentRelevance?: number
      finalScore?: number
      reason?: string
      outreachAngle?: string
    }> = parsed.matches || parsed.recommendations || []

    const byId = new Map(matches.map(m => [m.id, m]))
    return topCandidates.map(t => {
      const m = byId.get(t.creator.userId)
      if (!m) return t.det
      return {
        ...t.det,
        breakdown: {
          ...t.det.breakdown,
          contentRelevance: Math.max(0, Math.min(100, m.contentRelevance ?? t.det.breakdown.contentRelevance)),
        },
        matchScore: Math.max(0, Math.min(100, m.finalScore ?? t.det.matchScore)),
        reason: m.reason || t.det.reason,
        outreachAngle: m.outreachAngle || '',
      }
    })
  } catch (err) {
    console.warn('[creator-matchmaker] LLM rerank failed, falling back to deterministic:', err)
    return topCandidates.map(t => t.det)
  }
}

// ── Public API ────────────────────────────────────────────────────────

export interface MatchOptions {
  /** How many results to return after final ranking. Default 10. */
  limit?: number
  /** Skip LLM rerank — useful for cheap mode or fallback. */
  skipLLM?: boolean
}

/**
 * Rank a list of creator candidates against a product set.
 *
 * Strategy:
 *   1. Score every candidate deterministically.
 *   2. Take top 25 by deterministic score.
 *   3. LLM reranks those 25 (assigns contentRelevance + finalScore).
 *   4. Return top `limit` from the LLM-reranked list.
 */
export async function rankCreators(
  candidates: CreatorCandidate[],
  brand: BrandContext,
  products: ProductContext[],
  options: MatchOptions = {}
): Promise<CreatorMatchScore[]> {
  const { limit = 10, skipLLM = false } = options
  if (candidates.length === 0) return []

  const scored = candidates.map(c => ({ creator: c, det: deterministicScore(c, brand, products) }))
  scored.sort((a, b) => b.det.matchScore - a.det.matchScore)

  const topForLLM = scored.slice(0, 25)

  const reranked = skipLLM
    ? topForLLM.map(t => t.det)
    : await rerankWithLLM(topForLLM, brand, products)

  reranked.sort((a, b) => b.matchScore - a.matchScore)
  return reranked.slice(0, limit)
}
