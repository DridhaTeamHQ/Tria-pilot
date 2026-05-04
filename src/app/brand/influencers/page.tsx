/**
 * BRAND DISCOVERY PAGE — find creators
 *
 * Upgraded with:
 *  - Filter chips (niche, follower band, badge tier, gender, audience)
 *  - Engagement + price range filters
 *  - Sort by followers / engagement / price / badge score
 *  - Saved shortlists (localStorage) — quickly bookmark creators for later
 *  - Result count, active-filter count, one-click reset
 */
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { AppImage } from '@/components/ui/AppImage'
import { toast } from '@/lib/simple-sonner'
import {
  Users,
  Search,
  Loader2,
  MessageCircle,
  ExternalLink,
  TrendingUp,
  X,
  IndianRupee,
  Bookmark,
  BookmarkCheck,
  Award,
  RotateCcw,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

interface Influencer {
  id: string
  email: string
  name: string
  bio?: string
  followers: number
  engagement_rate: string
  niches: string[]
  profile_image?: string
  price_per_post?: number | null
  badge_tier?: string | null
  badge_score?: number | null
  gender?: string | null
  audience_type?: string | null
}

const NICHES = ['Fashion', 'Beauty', 'Lifestyle', 'Fitness', 'Food', 'Travel', 'Tech', 'Gaming']
const FOLLOWER_BANDS: Array<{ id: string; label: string; min: number; max: number }> = [
  { id: 'all', label: 'Any', min: 0, max: 999999999 },
  { id: 'nano', label: 'Nano · 1-10K', min: 1000, max: 10000 },
  { id: 'micro', label: 'Micro · 10-100K', min: 10000, max: 100000 },
  { id: 'macro', label: 'Macro · 100K-1M', min: 100000, max: 1000000 },
  { id: 'mega', label: 'Mega · 1M+', min: 1000000, max: 999999999 },
]
const PRICE_BANDS: Array<{ id: string; label: string; min: number; max: number }> = [
  { id: 'all', label: 'Any', min: 0, max: 99999999 },
  { id: 'budget', label: '< ₹2K', min: 0, max: 2000 },
  { id: 'mid', label: '₹2K-10K', min: 2000, max: 10000 },
  { id: 'premium', label: '₹10K-50K', min: 10000, max: 50000 },
  { id: 'top', label: '₹50K+', min: 50000, max: 99999999 },
]
const BADGE_TIERS = ['Platinum', 'Gold', 'Silver', 'Bronze']
const GENDERS = ['Male', 'Female', 'Other']
const AUDIENCE_TYPES = ['Indian', 'Global', 'Urban', 'Rural']
const SORT_OPTIONS: Array<{ id: 'followers' | 'engagement' | 'price' | 'badge'; label: string }> = [
  { id: 'followers', label: 'Most followers' },
  { id: 'engagement', label: 'Highest engagement' },
  { id: 'price', label: 'Lowest price' },
  { id: 'badge', label: 'Top tier' },
]

const SHORTLIST_KEY = 'kiwikoo:brand-shortlist:v1'

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n || 0)
}

function badgeColor(tier: string | null | undefined): string {
  const t = (tier || '').toLowerCase()
  if (t === 'platinum') return 'bg-gradient-to-br from-[#E5E4E2] to-[#A8A8A8]'
  if (t === 'gold') return 'bg-gradient-to-br from-[#FFD700] to-[#DAA520]'
  if (t === 'silver') return 'bg-gradient-to-br from-[#C0C0C0] to-[#808080]'
  if (t === 'bronze') return 'bg-gradient-to-br from-[#CD7F32] to-[#8B4513]'
  return ''
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-black rounded-full transition-all ${
        active
          ? 'bg-black text-white shadow-[2px_2px_0_0_rgba(0,0,0,1)]'
          : 'bg-white text-black hover:bg-[#FFD93D]/30 hover:-translate-y-0.5'
      }`}
    >
      {children}
    </button>
  )
}

export default function BrandInfluencersPage() {
  const router = useRouter()
  const [influencers, setInfluencers] = useState<Influencer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [niche, setNiche] = useState('')
  const [followerBand, setFollowerBand] = useState(FOLLOWER_BANDS[0])
  const [priceBand, setPriceBand] = useState(PRICE_BANDS[0])
  const [minEngagement, setMinEngagement] = useState(0)
  const [badgeTier, setBadgeTier] = useState('')
  const [gender, setGender] = useState('')
  const [audienceType, setAudienceType] = useState('')
  const [sortBy, setSortBy] = useState<'followers' | 'engagement' | 'price' | 'badge'>('followers')
  const [shortlist, setShortlist] = useState<Set<string>>(new Set())
  const [showShortlistOnly, setShowShortlistOnly] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Hydrate shortlist from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SHORTLIST_KEY)
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) setShortlist(new Set(arr))
      }
    } catch {
      /* ignore */
    }
    setHydrated(true)
  }, [])

  // Persist shortlist
  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(SHORTLIST_KEY, JSON.stringify([...shortlist]))
    } catch {
      /* ignore */
    }
  }, [shortlist, hydrated])

  const fetchInfluencers = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (niche) params.set('niche', niche)
      params.set('minFollowers', followerBand.min.toString())
      params.set('maxFollowers', followerBand.max.toString())
      params.set('minPrice', priceBand.min.toString())
      params.set('maxPrice', priceBand.max.toString())
      if (minEngagement > 0) params.set('minEngagement', minEngagement.toString())
      if (badgeTier) params.set('badgeTier', badgeTier)
      if (gender) params.set('gender', gender)
      if (audienceType) params.set('audienceType', audienceType)
      params.set('sortBy', sortBy)
      params.set('order', sortBy === 'price' ? 'asc' : 'desc')

      const res = await fetch(`/api/brand/influencers?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setInfluencers(data.influencers || [])
    } catch (err) {
      console.error('Failed to fetch creators:', err)
      toast.error('Failed to load creators')
    } finally {
      setLoading(false)
    }
  }, [search, niche, followerBand, priceBand, minEngagement, badgeTier, gender, audienceType, sortBy])

  useEffect(() => {
    setLoading(true)
    void fetchInfluencers()
  }, [fetchInfluencers])

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (niche) n++
    if (followerBand.id !== 'all') n++
    if (priceBand.id !== 'all') n++
    if (minEngagement > 0) n++
    if (badgeTier) n++
    if (gender) n++
    if (audienceType) n++
    return n
  }, [niche, followerBand, priceBand, minEngagement, badgeTier, gender, audienceType])

  const visibleInfluencers = useMemo(() => {
    if (!showShortlistOnly) return influencers
    return influencers.filter((i) => shortlist.has(i.id))
  }, [influencers, shortlist, showShortlistOnly])

  const resetFilters = () => {
    setNiche('')
    setFollowerBand(FOLLOWER_BANDS[0])
    setPriceBand(PRICE_BANDS[0])
    setMinEngagement(0)
    setBadgeTier('')
    setGender('')
    setAudienceType('')
    setSortBy('followers')
    setShowShortlistOnly(false)
  }

  const toggleShortlist = (id: string) => {
    setShortlist((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        toast.success('Removed from shortlist')
      } else {
        next.add(id)
        toast.success('Added to shortlist')
      }
      return next
    })
  }

  const handleSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
  }

  const handleMessage = (id: string) => router.push(`/brand/inbox?to=${id}`)
  const handleViewProfile = (id: string) => router.push(`/brand/influencers/${id}`)

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-black mb-1 flex items-center">
            <Users className="inline-block w-8 h-8 mr-2 -mt-1" />
            Discover Creators
          </h1>
          <p className="text-black/60 font-medium text-sm">
            {loading ? 'Loading…' : `${visibleInfluencers.length} creator${visibleInfluencers.length === 1 ? '' : 's'}`}
            {activeFilterCount > 0 && !loading && ` · ${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'} applied`}
            {shortlist.size > 0 && ` · ${shortlist.size} shortlisted`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {shortlist.size > 0 && (
            <button
              type="button"
              onClick={() => setShowShortlistOnly((v) => !v)}
              className={`px-3 py-2 text-xs font-black uppercase tracking-wider border-2 border-black rounded-lg transition-all flex items-center gap-1.5 ${
                showShortlistOnly
                  ? 'bg-[#FFD93D] shadow-[3px_3px_0_0_rgba(0,0,0,1)]'
                  : 'bg-white hover:bg-[#FFD93D]/30 hover:-translate-y-0.5'
              }`}
            >
              <BookmarkCheck className="w-3.5 h-3.5" strokeWidth={3} />
              Shortlist ({shortlist.size})
            </button>
          )}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="px-3 py-2 text-xs font-black uppercase tracking-wider border-2 border-black rounded-lg bg-white hover:bg-[#FF8C69]/20 hover:-translate-y-0.5 transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" strokeWidth={3} />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Search bar */}
      <form
        onSubmit={handleSubmitSearch}
        className="mb-4 flex gap-2 bg-white border-[3px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-2"
      >
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, niche, or bio..."
            className="w-full pl-10 pr-4 py-2.5 text-sm font-medium outline-none"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('')
                setSearch('')
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-black/5 rounded"
            >
              <X className="w-4 h-4 text-black/40" />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 bg-[#B4F056] border-2 border-black font-black text-sm uppercase shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition-all"
        >
          Go
        </button>
      </form>

      {/* Filter chips */}
      <div className="bg-white border-[3px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-4 mb-6 space-y-3">
        <FilterRow label="Niche">
          <FilterChip active={!niche} onClick={() => setNiche('')}>All</FilterChip>
          {NICHES.map((n) => (
            <FilterChip key={n} active={niche === n} onClick={() => setNiche(niche === n ? '' : n)}>
              {n}
            </FilterChip>
          ))}
        </FilterRow>

        <FilterRow label="Followers">
          {FOLLOWER_BANDS.map((b) => (
            <FilterChip
              key={b.id}
              active={followerBand.id === b.id}
              onClick={() => setFollowerBand(b)}
            >
              {b.label}
            </FilterChip>
          ))}
        </FilterRow>

        <FilterRow label="Price / Post">
          {PRICE_BANDS.map((b) => (
            <FilterChip key={b.id} active={priceBand.id === b.id} onClick={() => setPriceBand(b)}>
              {b.label}
            </FilterChip>
          ))}
        </FilterRow>

        <FilterRow label="Min Engagement">
          {[0, 1, 3, 5, 10].map((v) => (
            <FilterChip
              key={v}
              active={minEngagement === v}
              onClick={() => setMinEngagement(v)}
            >
              {v === 0 ? 'Any' : `${v}%+`}
            </FilterChip>
          ))}
        </FilterRow>

        <FilterRow label="Badge Tier">
          <FilterChip active={!badgeTier} onClick={() => setBadgeTier('')}>Any</FilterChip>
          {BADGE_TIERS.map((t) => (
            <FilterChip
              key={t}
              active={badgeTier === t.toLowerCase()}
              onClick={() => setBadgeTier(badgeTier === t.toLowerCase() ? '' : t.toLowerCase())}
            >
              {t}
            </FilterChip>
          ))}
        </FilterRow>

        <FilterRow label="Gender">
          <FilterChip active={!gender} onClick={() => setGender('')}>Any</FilterChip>
          {GENDERS.map((g) => (
            <FilterChip
              key={g}
              active={gender === g.toLowerCase()}
              onClick={() => setGender(gender === g.toLowerCase() ? '' : g.toLowerCase())}
            >
              {g}
            </FilterChip>
          ))}
        </FilterRow>

        <FilterRow label="Audience">
          <FilterChip active={!audienceType} onClick={() => setAudienceType('')}>Any</FilterChip>
          {AUDIENCE_TYPES.map((a) => (
            <FilterChip
              key={a}
              active={audienceType === a.toLowerCase()}
              onClick={() => setAudienceType(audienceType === a.toLowerCase() ? '' : a.toLowerCase())}
            >
              {a}
            </FilterChip>
          ))}
        </FilterRow>

        <FilterRow label="Sort">
          {SORT_OPTIONS.map((s) => (
            <FilterChip key={s.id} active={sortBy === s.id} onClick={() => setSortBy(s.id)}>
              {s.label}
            </FilterChip>
          ))}
        </FilterRow>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-black" />
        </div>
      ) : visibleInfluencers.length === 0 ? (
        <div className="text-center py-20 border-[3px] border-dashed border-black/20 bg-white">
          <Users className="w-16 h-16 mx-auto mb-4 text-black/20" />
          <h3 className="text-xl font-black text-black/60 mb-2">No creators match</h3>
          <p className="text-black/40 font-medium text-sm mb-5">
            {showShortlistOnly
              ? 'Your shortlist is empty for these filters'
              : 'Try widening your filters or clearing them'}
          </p>
          {(activeFilterCount > 0 || showShortlistOnly) && (
            <button
              type="button"
              onClick={() => {
                resetFilters()
                setShowShortlistOnly(false)
              }}
              className="inline-flex items-center gap-2 px-5 py-3 bg-[#B4F056] border-2 border-black font-black text-sm uppercase shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visibleInfluencers.map((influencer) => {
            const isShortlisted = shortlist.has(influencer.id)
            return (
              <div
                key={influencer.id}
                className="group bg-white border-[3px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] overflow-hidden hover:shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all"
              >
                {/* Header */}
                <div className="p-4 border-b-2 border-black flex items-start gap-3 relative">
                  <button
                    type="button"
                    onClick={() => toggleShortlist(influencer.id)}
                    className={`absolute top-3 right-3 p-1.5 border-2 border-black rounded-full transition-all ${
                      isShortlisted
                        ? 'bg-[#FFD93D] shadow-[2px_2px_0_0_rgba(0,0,0,1)]'
                        : 'bg-white hover:bg-[#FFD93D]/40'
                    }`}
                    title={isShortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
                  >
                    {isShortlisted ? (
                      <BookmarkCheck className="w-3.5 h-3.5" strokeWidth={3} />
                    ) : (
                      <Bookmark className="w-3.5 h-3.5" strokeWidth={2.5} />
                    )}
                  </button>

                  <div className="relative w-14 h-14 bg-gradient-to-br from-[#B4F056] to-[#FFD93D] border-2 border-black flex items-center justify-center shrink-0">
                    {influencer.profile_image ? (
                      <AppImage
                        src={influencer.profile_image}
                        alt={influencer.name}
                        className="object-cover"
                        sizes="56px"
                      />
                    ) : (
                      <span className="text-2xl font-black">
                        {influencer.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    {influencer.badge_tier && (
                      <div
                        className={`absolute -bottom-1.5 -right-1.5 w-5 h-5 ${badgeColor(
                          influencer.badge_tier,
                        )} border-2 border-black flex items-center justify-center rounded-full`}
                        title={`${influencer.badge_tier} tier`}
                      >
                        <Award className="w-2.5 h-2.5" strokeWidth={3} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pr-7">
                    <h3 className="font-black text-base truncate">{influencer.name}</h3>
                    <p className="text-xs text-black/55 font-medium truncate">
                      {influencer.bio || 'Content Creator'}
                    </p>
                    {influencer.niches?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {influencer.niches.slice(0, 2).map((n) => (
                          <span
                            key={n}
                            className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-black/5 border border-black"
                          >
                            {n}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 divide-x-2 divide-black border-b-2 border-black">
                  <Stat
                    label="Followers"
                    value={formatFollowers(influencer.followers)}
                  />
                  <Stat
                    icon={TrendingUp}
                    label="Engagement"
                    value={`${influencer.engagement_rate}%`}
                  />
                  <Stat
                    icon={IndianRupee}
                    label="Per post"
                    value={
                      influencer.price_per_post
                        ? `₹${formatFollowers(influencer.price_per_post)}`
                        : '—'
                    }
                  />
                </div>

                {/* Actions */}
                <div className="p-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleViewProfile(influencer.id)}
                    className="flex-1 py-2 border-2 border-black font-black text-xs uppercase tracking-wider hover:bg-black/5 transition-colors flex items-center justify-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" strokeWidth={3} />
                    Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMessage(influencer.id)}
                    className="flex-1 py-2 bg-[#B4F056] border-2 border-black font-black text-xs uppercase tracking-wider shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1"
                  >
                    <MessageCircle className="w-3.5 h-3.5" strokeWidth={3} />
                    Message
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty-state inspiration when no shortlist + no creators */}
      {!loading && visibleInfluencers.length > 0 && shortlist.size === 0 && (
        <div className="mt-8 bg-[#A78BFA]/10 border-[3px] border-black p-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-[#A78BFA] flex-shrink-0 mt-0.5" strokeWidth={3} />
          <div>
            <p className="text-sm font-black uppercase tracking-wider mb-0.5">Pro tip</p>
            <p className="text-xs text-black/60 font-semibold">
              Tap the bookmark icon to save creators. Build a shortlist for each campaign and invite them all at once from the campaign page.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-black uppercase tracking-widest text-black/45 mb-1.5 block">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon?: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="p-2.5 text-center">
      <div className="flex items-center justify-center gap-1 text-black/45 text-[9px] font-black uppercase tracking-widest mb-0.5">
        {Icon && <Icon className="w-2.5 h-2.5" strokeWidth={3} />}
        {label}
      </div>
      <div className="text-base font-black">{value}</div>
    </div>
  )
}
