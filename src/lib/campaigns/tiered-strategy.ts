/**
 * TIERED CREATOR STRATEGY
 *
 * Allocates a brand's campaign budget across a creator portfolio
 * (mega/macro/micro/nano) based on the goal and budget. This is the
 * 2026 best-practice from Modash, Voxturr — high-performing brands
 * don't pick "5 creators that fit", they design a portfolio.
 *
 * Strategy logic:
 *   - awareness: skewed to macro/mega for reach
 *   - sales / conversions: skewed to micro for ROI
 *   - launch: balanced macro + micro
 *   - traffic: balanced micro + nano
 *
 * Returns a structured plan the AI can render as a card and the
 * frontend can use to filter/match real creators.
 */

import type { CreatorCandidate, CreatorMatchScore } from './creator-matchmaker'
import { vetCreator, trustLabel } from './vetting'

export type CampaignGoal = 'awareness' | 'sales' | 'conversions' | 'launch' | 'traffic'

export type CreatorTier = 'mega' | 'macro' | 'micro' | 'nano'

export interface TierAllocation {
  tier: CreatorTier
  count: number
  budgetPerCreator: number
  totalBudget: number
  rationale: string
  followerBand: { min: number; max: number; label: string }
}

export interface TieredStrategy {
  goal: CampaignGoal
  totalBudget: number
  estimatedReach: { min: number; max: number }
  estimatedRoas: number
  allocations: TierAllocation[]
  notes: string[]
}

const TIER_BANDS: Record<CreatorTier, { min: number; max: number; label: string }> = {
  mega:  { min: 1_000_000, max: Number.MAX_SAFE_INTEGER, label: '1M+' },
  macro: { min: 100_000,   max: 999_999,                 label: '100K-1M' },
  micro: { min: 10_000,    max: 99_999,                  label: '10-100K' },
  nano:  { min: 1_000,     max: 9_999,                   label: '1-10K' },
}

// Industry benchmarks (Indian D2C, 2026 — from impact.com & Voxturr)
// Cost per 1K impressions per tier (approximate)
const TIER_CPM = {
  mega: 30,
  macro: 60,
  micro: 120,
  nano: 200,
}

// Target audience reach (per ₹1) — inverse of CPM
function reachPerRupee(tier: CreatorTier): number {
  return 1000 / TIER_CPM[tier]
}

// Conversion rate per tier (industry benchmark)
const TIER_CONVERSION = {
  mega: 0.012,
  macro: 0.018,
  micro: 0.028,
  nano: 0.035,
}

// Expected ROAS multiplier per tier given a typical AOV of ₹1500
const AOV_INR = 1500

interface MixWeight {
  mega: number
  macro: number
  micro: number
  nano: number
}

// Goal-driven mix weights — must sum to 1.0
const GOAL_MIX: Record<CampaignGoal, MixWeight> = {
  awareness:    { mega: 0.30, macro: 0.45, micro: 0.20, nano: 0.05 },
  launch:       { mega: 0.20, macro: 0.40, micro: 0.30, nano: 0.10 },
  sales:        { mega: 0,    macro: 0.20, micro: 0.55, nano: 0.25 },
  conversions:  { mega: 0,    macro: 0.15, micro: 0.55, nano: 0.30 },
  traffic:      { mega: 0,    macro: 0.20, micro: 0.45, nano: 0.35 },
}

function rationale(tier: CreatorTier, goal: CampaignGoal): string {
  if (tier === 'mega') {
    return goal === 'awareness'
      ? 'Mass-market reach for brand recall'
      : 'Authority play — premium audience credibility'
  }
  if (tier === 'macro') {
    return goal === 'awareness'
      ? 'Wide reach with stronger niche affinity than mega'
      : 'Trusted voice with measurable conversion potential'
  }
  if (tier === 'micro') {
    return 'Sweet spot — high engagement, niche relevance, strong ROI'
  }
  return 'Scrappy seeding tier — lowest CAC, high authentic UGC'
}

/**
 * Allocate a budget across creator tiers based on the goal.
 *
 * Returns a strategy object the AI strategist can render in the chat
 * AND the recommend-creators API can use to bucket actual candidates.
 */
export function planCreatorMix(goal: CampaignGoal, totalBudget: number): TieredStrategy {
  const mix = GOAL_MIX[goal] || GOAL_MIX.awareness
  const allocations: TierAllocation[] = []

  // Default tier price floors (matches industry rates we use in vetting.ts)
  const TIER_FLOOR_PRICE: Record<CreatorTier, number> = {
    mega: 80_000,
    macro: 25_000,
    micro: 5_000,
    nano: 1_500,
  }

  const tiers: CreatorTier[] = ['mega', 'macro', 'micro', 'nano']
  let totalReachMin = 0
  let totalReachMax = 0
  let totalExpectedRevenue = 0

  for (const tier of tiers) {
    const tierBudget = Math.round(totalBudget * mix[tier])
    if (tierBudget < TIER_FLOOR_PRICE[tier]) continue

    const budgetPerCreator = TIER_FLOOR_PRICE[tier]
    const count = Math.max(1, Math.floor(tierBudget / budgetPerCreator))
    const actualTierBudget = count * budgetPerCreator

    // Reach modeling
    const reachLow = Math.round(reachPerRupee(tier) * actualTierBudget * 0.7)
    const reachHigh = Math.round(reachPerRupee(tier) * actualTierBudget * 1.3)
    totalReachMin += reachLow
    totalReachMax += reachHigh

    // Revenue modeling
    const expectedConversions = (reachLow + reachHigh) / 2 * TIER_CONVERSION[tier]
    totalExpectedRevenue += expectedConversions * AOV_INR

    allocations.push({
      tier,
      count,
      budgetPerCreator,
      totalBudget: actualTierBudget,
      rationale: rationale(tier, goal),
      followerBand: TIER_BANDS[tier],
    })
  }

  // Fallback: if budget too small for any tier's floor, give all to nano
  if (allocations.length === 0) {
    const count = Math.max(1, Math.floor(totalBudget / TIER_FLOOR_PRICE.nano))
    const totalNanoBudget = count * TIER_FLOOR_PRICE.nano
    allocations.push({
      tier: 'nano',
      count,
      budgetPerCreator: TIER_FLOOR_PRICE.nano,
      totalBudget: totalNanoBudget,
      rationale: 'Budget-conservative seeding play — start small, prove signal, scale',
      followerBand: TIER_BANDS.nano,
    })
    const reachLow = Math.round(reachPerRupee('nano') * totalNanoBudget * 0.7)
    const reachHigh = Math.round(reachPerRupee('nano') * totalNanoBudget * 1.3)
    totalReachMin = reachLow
    totalReachMax = reachHigh
    totalExpectedRevenue = ((reachLow + reachHigh) / 2) * TIER_CONVERSION.nano * AOV_INR
  }

  const estimatedRoas = totalBudget > 0 ? Number((totalExpectedRevenue / totalBudget).toFixed(2)) : 0

  const notes: string[] = []
  if (goal === 'sales' || goal === 'conversions') {
    notes.push('Performance deals (commission on sales) reduce upfront risk — negotiate when possible.')
  }
  if (allocations.find((a) => a.tier === 'micro')) {
    notes.push('Micro-tier delivers the best ROAS in 90% of D2C campaigns — prioritize quality of fit over follower count.')
  }
  if (totalBudget < 30_000) {
    notes.push('Below ₹30K, focus 100% on nano — the math does not work for higher tiers.')
  }

  return {
    goal,
    totalBudget,
    estimatedReach: { min: totalReachMin, max: totalReachMax },
    estimatedRoas,
    allocations,
    notes,
  }
}

/**
 * Filter & bucket existing scored candidates into the tiered allocation.
 * Returns the same `CreatorMatchScore` objects, but tagged with their tier.
 */
export interface TieredMatch extends CreatorMatchScore {
  tier: CreatorTier
  vetting: ReturnType<typeof vetCreator>
  trust: ReturnType<typeof trustLabel>
}

export function applyTieredMatching(
  rankedCandidates: CreatorMatchScore[],
  candidatePool: CreatorCandidate[],
  strategy: TieredStrategy,
): {
  byTier: Record<CreatorTier, TieredMatch[]>
  selected: TieredMatch[]
} {
  const byId = new Map(candidatePool.map((c) => [c.userId, c]))

  const byTier: Record<CreatorTier, TieredMatch[]> = {
    mega: [],
    macro: [],
    micro: [],
    nano: [],
  }

  for (const match of rankedCandidates) {
    const candidate = byId.get(match.creatorId)
    if (!candidate) continue
    const followers = candidate.followers ?? 0
    let tier: CreatorTier = 'nano'
    for (const t of ['mega', 'macro', 'micro', 'nano'] as CreatorTier[]) {
      const band = TIER_BANDS[t]
      if (followers >= band.min && followers <= band.max) {
        tier = t
        break
      }
    }

    const vetting = vetCreator({
      followers: candidate.followers,
      engagementRate: candidate.engagementRate,
      audienceRate: candidate.audienceRate,
      retentionRate: candidate.retentionRate,
      badgeTier: candidate.badgeTier,
      badgeScore: candidate.badgeScore,
      bio: candidate.bio,
      niches: candidate.niches,
      socials: candidate.socials,
      onboardingCompleted: true, // already filtered in API layer
    })

    byTier[tier].push({
      ...match,
      tier,
      vetting,
      trust: trustLabel(vetting.trustScore),
    })
  }

  // Pick top N per tier per the strategy
  const selected: TieredMatch[] = []
  for (const alloc of strategy.allocations) {
    const tierPool = byTier[alloc.tier].slice(0, alloc.count)
    selected.push(...tierPool)
  }

  return { byTier, selected }
}
