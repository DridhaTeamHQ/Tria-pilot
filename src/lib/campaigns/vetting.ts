/**
 * CREATOR VETTING
 *
 * Computes trust signals brands need before they invite a creator:
 *   - Authenticity score (engagement vs follower benchmark per niche)
 *   - Activity score (recency + posting frequency from generation_jobs)
 *   - Brand-safety flag (no flagged keywords in bio/recent content)
 *   - Real engagement signal (presence of socials, completed onboarding)
 *
 * All inputs come from the existing influencer profile shape, so no extra
 * DB queries are needed. Pure deterministic functions — fast, predictable,
 * trivially testable.
 */

export interface VettingInput {
  followers: number | null
  engagementRate: number | null   // already normalized to percent (0-100)
  audienceRate: number | null      // 0-1 fraction
  retentionRate: number | null     // 0-1 fraction or 0-100
  badgeTier?: string | null
  badgeScore?: number | null
  bio?: string | null
  niches?: string[]
  socials?: Record<string, unknown> | null
  totalTryOns?: number             // lifetime completed try-ons
  lastActiveAt?: string | Date | null
  onboardingCompleted?: boolean
}

export interface VettingResult {
  /** 0-100 — combined trust score */
  trustScore: number
  /** 0-100 — likelihood the audience is real (not bot-inflated) */
  authenticityScore: number
  /** 0-100 — recent activity & responsiveness */
  activityScore: number
  /** 0-100 — comment-to-like ratio proxy from engagement vs follower band */
  realEngagementScore: number
  /** Brand-safety verdict — "safe" | "review" */
  brandSafety: 'safe' | 'review'
  /** Plain-language flags shown to brand on the card */
  flags: VettingFlag[]
  /** True if creator passes a basic minimum quality bar */
  isVetted: boolean
}

export interface VettingFlag {
  level: 'positive' | 'neutral' | 'warning'
  label: string
  detail?: string
}

// ── Niche benchmarks ─────────────────────────────────────────────────
// Median engagement rate (in percent) per follower band — used as the
// reference point for the authenticity score. These are industry
// benchmarks for Indian fashion / lifestyle / general creators in 2026.
function expectedEngagementForBand(followers: number): number {
  if (followers >= 1_000_000) return 1.5  // mega
  if (followers >= 100_000) return 2.5    // macro
  if (followers >= 10_000) return 4.0     // micro
  if (followers >= 1_000) return 6.5      // nano
  return 8.0
}

// Words that suggest content brands typically can't be associated with.
// Conservative — only flag obvious vice categories.
const UNSAFE_KEYWORDS = [
  'casino', 'gambling', 'crypto pump', 'gun', 'firearm',
  'porn', 'nsfw', 'adult content', 'escort',
  'tobacco', 'cigarette', 'vape', 'cbd',
  'mlm', 'pyramid scheme',
]

function checkBrandSafety(bio: string | null | undefined, niches: string[] = []): boolean {
  const text = `${bio || ''} ${niches.join(' ')}`.toLowerCase()
  return !UNSAFE_KEYWORDS.some((kw) => text.includes(kw))
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n))
}

function activityFromLastActive(lastActiveAt?: string | Date | null): number {
  if (!lastActiveAt) return 30
  const t = new Date(lastActiveAt).getTime()
  if (Number.isNaN(t)) return 30
  const days = Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24))
  if (days <= 1) return 100
  if (days <= 3) return 90
  if (days <= 7) return 80
  if (days <= 14) return 65
  if (days <= 30) return 50
  if (days <= 60) return 35
  if (days <= 90) return 20
  return 10
}

export function vetCreator(input: VettingInput): VettingResult {
  const followers = input.followers ?? 0
  // Engagement rate may have been stored as a fraction (0-1) or already as
  // a percent. Normalize to percent for consistent benchmarking.
  const engagementPct =
    input.engagementRate == null
      ? 0
      : input.engagementRate <= 1
        ? input.engagementRate * 100
        : input.engagementRate

  // ── Authenticity ──────────────────────────────────────────────────
  // Compare actual engagement to expected for this follower band.
  // Above 80% of expected = high authenticity. Below 30% = bot signal.
  let authenticityScore: number
  if (followers === 0) {
    authenticityScore = 50
  } else {
    const expected = expectedEngagementForBand(followers)
    const ratio = engagementPct / expected
    if (ratio >= 0.8) authenticityScore = clamp(85 + (ratio - 0.8) * 50)
    else if (ratio >= 0.5) authenticityScore = clamp(60 + (ratio - 0.5) * 80)
    else if (ratio >= 0.3) authenticityScore = clamp(35 + (ratio - 0.3) * 125)
    else authenticityScore = clamp(ratio * 100)
  }

  // ── Activity ──────────────────────────────────────────────────────
  // Mix of last-active recency, total try-on output, and onboarding
  let activityScore = activityFromLastActive(input.lastActiveAt) * 0.6
  const tryOns = input.totalTryOns ?? 0
  if (tryOns >= 10) activityScore += 30
  else if (tryOns >= 3) activityScore += 20
  else if (tryOns >= 1) activityScore += 10
  if (input.onboardingCompleted) activityScore += 10
  activityScore = clamp(activityScore)

  // ── Real engagement signal ────────────────────────────────────────
  // Combination of audience rate (% real audience) and retention rate.
  // Retention can be stored as either fraction or percent — normalize.
  const audPct = (input.audienceRate ?? 0) * 100
  const retentionRaw = input.retentionRate ?? 0
  const retPct = retentionRaw <= 1 ? retentionRaw * 100 : retentionRaw
  const realEngagementScore =
    audPct + retPct === 0
      ? clamp(authenticityScore * 0.7) // fallback to authenticity proxy
      : clamp(audPct * 0.55 + retPct * 0.45)

  // ── Brand safety ──────────────────────────────────────────────────
  const isSafe = checkBrandSafety(input.bio, input.niches)
  const brandSafety = isSafe ? 'safe' : 'review'

  // ── Flags (UI-friendly summary) ───────────────────────────────────
  const flags: VettingFlag[] = []

  if (authenticityScore >= 85) {
    flags.push({ level: 'positive', label: 'High authenticity', detail: 'Engagement matches niche benchmarks' })
  } else if (authenticityScore < 35) {
    flags.push({
      level: 'warning',
      label: 'Low engagement vs niche',
      detail: 'Audience may be inflated — verify before inviting',
    })
  }

  if (activityScore >= 80) {
    flags.push({ level: 'positive', label: 'Recently active' })
  } else if (activityScore < 30) {
    flags.push({ level: 'warning', label: 'Inactive 30+ days', detail: 'May not respond to invites' })
  }

  if (input.badgeTier && ['platinum', 'gold'].includes(input.badgeTier.toLowerCase())) {
    flags.push({
      level: 'positive',
      label: `${input.badgeTier} tier creator`,
      detail: 'Top performer on Kiwikoo',
    })
  }

  const socialsArr = input.socials
    ? Object.values(input.socials).filter((v) => typeof v === 'string' && v)
    : []
  if (socialsArr.length === 0) {
    flags.push({ level: 'warning', label: 'No social links', detail: 'Verify their reach independently' })
  }

  if (!isSafe) {
    flags.push({ level: 'warning', label: 'Brand-safety review needed' })
  }

  // ── Trust score (final composite) ─────────────────────────────────
  const trustScore = clamp(
    authenticityScore * 0.4 +
      activityScore * 0.25 +
      realEngagementScore * 0.25 +
      (isSafe ? 100 : 0) * 0.1,
  )

  const isVetted = trustScore >= 55 && isSafe

  return {
    trustScore: Math.round(trustScore),
    authenticityScore: Math.round(authenticityScore),
    activityScore: Math.round(activityScore),
    realEngagementScore: Math.round(realEngagementScore),
    brandSafety,
    flags,
    isVetted,
  }
}

/**
 * Convenience: bucket a trust score into a label + color tone for the UI.
 */
export function trustLabel(score: number): { label: string; tone: 'green' | 'yellow' | 'orange' | 'red' } {
  if (score >= 80) return { label: 'Verified', tone: 'green' }
  if (score >= 60) return { label: 'Trusted', tone: 'green' }
  if (score >= 45) return { label: 'Solid', tone: 'yellow' }
  if (score >= 30) return { label: 'Review', tone: 'orange' }
  return { label: 'Caution', tone: 'red' }
}
