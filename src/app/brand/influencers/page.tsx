/**
 * BRAND DISCOVERY PAGE — find creators
 *
 * Premium UI with dropdown popover filters, active-filter chip bar with
 * removable pills, smooth animations, and saved shortlists.
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
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react'
import { FilterDropdown } from '@/components/brand/FilterDropdown'

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
const FOLLOWER_BANDS = [
  { value: 'all', label: 'Any size', min: 0, max: 999999999 },
  { value: 'nano', label: 'Nano', hint: '1K – 10K', min: 1000, max: 10000 },
  { value: 'micro', label: 'Micro', hint: '10K – 100K', min: 10000, max: 100000 },
  { value: 'macro', label: 'Macro', hint: '100K – 1M', min: 100000, max: 1000000 },
  { value: 'mega', label: 'Mega', hint: '1M+', min: 1000000, max: 999999999 },
] as const

const PRICE_BANDS = [
  { value: 'all', label: 'Any price', min: 0, max: 99999999 },
  { value: 'budget', label: '< ₹2K', min: 0, max: 2000 },
  { value: 'mid', label: '₹2K – ₹10K', min: 2000, max: 10000 },
  { value: 'premium', label: '₹10K – ₹50K', min: 10000, max: 50000 },
  { value: 'top', label: '₹50K+', min: 50000, max: 99999999 },
] as const

const ENGAGEMENT_OPTIONS = [
  { value: 0, label: 'Any engagement' },
  { value: 1, label: '1%+', hint: 'Decent reach' },
  { value: 3, label: '3%+', hint: 'Above average' },
  { value: 5, label: '5%+', hint: 'High performers' },
  { value: 10, label: '10%+', hint: 'Top tier engagement' },
]

const BADGE_TIERS = [
  { value: 'platinum', label: 'Platinum' },
  { value: 'gold', label: 'Gold' },
  { value: 'silver', label: 'Silver' },
  { value: 'bronze', label: 'Bronze' },
]

const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
]

const AUDIENCE_TYPES = [
  { value: 'indian', label: 'Indian' },
  { value: 'global', label: 'Global' },
  { value: 'urban', label: 'Urban' },
  { value: 'rural', label: 'Rural' },
]

const SORT_OPTIONS = [
  { value: 'followers', label: 'Most followers' },
  { value: 'engagement', label: 'Highest engagement' },
  { value: 'price', label: 'Lowest price' },
  { value: 'badge', label: 'Top tier first' },
] as const

const NICHE_OPTIONS = NICHES.map((n) => ({ value: n.toLowerCase(), label: n }))

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

export default function BrandInfluencersPage() {
  const router = useRouter()
  const [influencers, setInfluencers] = useState<Influencer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const [niche, setNiche] = useState<string | null>(null)
  const [followerBand, setFollowerBand] = useState<string | null>(null)
  const [priceBand, setPriceBand] = useState<string | null>(null)
  const [minEngagement, setMinEngagement] = useState<number | null>(null)
  const [badgeTier, setBadgeTier] = useState<string | null>(null)
  const [gender, setGender] = useState<string | null>(null)
  const [audienceType, setAudienceType] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<string | null>('followers')

  const [shortlist, setShortlist] = useState<Set<string>>(new Set())
  const [showShortlistOnly, setShowShortlistOnly] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Hydrate shortlist
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

  const followerBandObj = followerBand
    ? FOLLOWER_BANDS.find((b) => b.value === followerBand) || FOLLOWER_BANDS[0]
    : FOLLOWER_BANDS[0]
  const priceBandObj = priceBand
    ? PRICE_BANDS.find((b) => b.value === priceBand) || PRICE_BANDS[0]
    : PRICE_BANDS[0]

  const fetchInfluencers = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (niche) params.set('niche', niche)
      params.set('minFollowers', followerBandObj.min.toString())
      params.set('maxFollowers', followerBandObj.max.toString())
      params.set('minPrice', priceBandObj.min.toString())
      params.set('maxPrice', priceBandObj.max.toString())
      if (minEngagement && minEngagement > 0) params.set('minEngagement', minEngagement.toString())
      if (badgeTier) params.set('badgeTier', badgeTier)
      if (gender) params.set('gender', gender)
      if (audienceType) params.set('audienceType', audienceType)
      params.set('sortBy', sortBy || 'followers')
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
  }, [
    search,
    niche,
    followerBandObj.min,
    followerBandObj.max,
    priceBandObj.min,
    priceBandObj.max,
    minEngagement,
    badgeTier,
    gender,
    audienceType,
    sortBy,
  ])

  useEffect(() => {
    setLoading(true)
    void fetchInfluencers()
  }, [fetchInfluencers])

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (niche) n++
    if (followerBand && followerBand !== 'all') n++
    if (priceBand && priceBand !== 'all') n++
    if (minEngagement && minEngagement > 0) n++
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
    setNiche(null)
    setFollowerBand(null)
    setPriceBand(null)
    setMinEngagement(null)
    setBadgeTier(null)
    setGender(null)
    setAudienceType(null)
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

  // Active filter chips for the chip bar
  const activeChips: Array<{ key: string; label: string; remove: () => void; color: string }> = []
  if (niche) {
    const obj = NICHE_OPTIONS.find((o) => o.value === niche)
    if (obj) activeChips.push({ key: 'niche', label: obj.label, remove: () => setNiche(null), color: '#B4F056' })
  }
  if (followerBand && followerBand !== 'all') {
    const obj = FOLLOWER_BANDS.find((b) => b.value === followerBand) as { label: string; hint?: string } | undefined
    if (obj) activeChips.push({ key: 'followers', label: `${obj.label}${obj.hint ? ' ' + obj.hint : ''}`, remove: () => setFollowerBand(null), color: '#A78BFA' })
  }
  if (priceBand && priceBand !== 'all') {
    const obj = PRICE_BANDS.find((b) => b.value === priceBand)
    if (obj) activeChips.push({ key: 'price', label: obj.label, remove: () => setPriceBand(null), color: '#FFD93D' })
  }
  if (minEngagement && minEngagement > 0) {
    activeChips.push({ key: 'eng', label: `${minEngagement}%+ engagement`, remove: () => setMinEngagement(null), color: '#FF8C69' })
  }
  if (badgeTier) {
    const obj = BADGE_TIERS.find((b) => b.value === badgeTier)
    if (obj) activeChips.push({ key: 'badge', label: `${obj.label} tier`, remove: () => setBadgeTier(null), color: '#FBBF24' })
  }
  if (gender) {
    const obj = GENDERS.find((g) => g.value === gender)
    if (obj) activeChips.push({ key: 'gender', label: obj.label, remove: () => setGender(null), color: '#34D399' })
  }
  if (audienceType) {
    const obj = AUDIENCE_TYPES.find((a) => a.value === audienceType)
    if (obj) activeChips.push({ key: 'audience', label: `${obj.label} audience`, remove: () => setAudienceType(null), color: '#F472B6' })
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 page-fade-in">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-black mb-1 flex items-center">
            <Users className="inline-block w-9 h-9 mr-2 -mt-1" strokeWidth={2.75} />
            Discover Creators
          </h1>
          <p className="text-black/55 font-semibold text-sm">
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
                  : 'bg-white hover:bg-[#FFD93D]/30 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]'
              }`}
            >
              <BookmarkCheck className="w-3.5 h-3.5" strokeWidth={3} />
              Shortlist · {shortlist.size}
            </button>
          )}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="px-3 py-2 text-xs font-black uppercase tracking-wider border-2 border-black rounded-lg bg-white hover:bg-[#FF8C69]/20 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" strokeWidth={3} />
              Reset all
            </button>
          )}
        </div>
      </div>

      {/* Search bar */}
      <form
        onSubmit={handleSubmitSearch}
        className="mb-4 flex gap-2 bg-white border-[3px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-2 page-fade-in"
        style={{ animationDelay: '40ms' }}
      >
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, niche, or bio..."
            className="w-full pl-10 pr-9 py-2.5 text-sm font-medium outline-none placeholder:text-black/30"
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
          className="px-5 py-2.5 bg-[#B4F056] border-2 border-black font-black text-sm uppercase shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all"
        >
          Go
        </button>
      </form>

      {/* Filter dropdown row */}
      <div
        className="mb-4 bg-white border-[3px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-3 page-fade-in"
        style={{ animationDelay: '80ms' }}
      >
        <div className="flex items-center gap-2 mb-3 px-1">
          <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={3} />
          <span className="text-[10px] font-black uppercase tracking-widest text-black/55">
            Refine search
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterDropdown
            label="Niche"
            anyLabel="All niches"
            value={niche}
            onChange={setNiche}
            options={NICHE_OPTIONS}
            accentColor="#B4F056"
          />
          <FilterDropdown
            label="Followers"
            anyLabel="Any size"
            value={followerBand}
            onChange={setFollowerBand}
            options={FOLLOWER_BANDS as unknown as { value: string; label: string; hint?: string }[]}
            accentColor="#A78BFA"
          />
          <FilterDropdown
            label="Price / Post"
            anyLabel="Any price"
            value={priceBand}
            onChange={setPriceBand}
            options={PRICE_BANDS as unknown as { value: string; label: string }[]}
            accentColor="#FFD93D"
          />
          <FilterDropdown
            label="Engagement"
            anyLabel="Any"
            value={minEngagement}
            onChange={setMinEngagement}
            options={ENGAGEMENT_OPTIONS}
            accentColor="#FF8C69"
          />
          <FilterDropdown
            label="Badge Tier"
            anyLabel="Any tier"
            value={badgeTier}
            onChange={setBadgeTier}
            options={BADGE_TIERS}
            accentColor="#FBBF24"
          />
          <FilterDropdown
            label="Gender"
            anyLabel="Any"
            value={gender}
            onChange={setGender}
            options={GENDERS}
            accentColor="#34D399"
          />
          <FilterDropdown
            label="Audience"
            anyLabel="Any"
            value={audienceType}
            onChange={setAudienceType}
            options={AUDIENCE_TYPES}
            accentColor="#F472B6"
          />
          <div className="ml-auto">
            <FilterDropdown
              label="Sort by"
              anyLabel="Most followers"
              value={sortBy}
              onChange={(v) => setSortBy(v || 'followers')}
              options={SORT_OPTIONS as unknown as { value: string; label: string }[]}
            />
          </div>
        </div>

        {/* Active chips bar */}
        {activeChips.length > 0 && (
          <div className="mt-3 pt-3 border-t-2 border-dashed border-black/15 flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-black/45 mr-1">
              Active
            </span>
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.remove}
                className="active-chip group inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 text-[11px] font-black uppercase tracking-wider bg-white border-2 border-black hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: chip.color }}
                />
                <span className="truncate max-w-[180px]">{chip.label}</span>
                <span className="w-4 h-4 flex items-center justify-center bg-black/5 group-hover:bg-black group-hover:text-white transition-colors rounded-full">
                  <X className="w-2.5 h-2.5" strokeWidth={3.5} />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} delay={i * 60} />
          ))}
        </div>
      ) : visibleInfluencers.length === 0 ? (
        <div className="text-center py-20 border-[3px] border-dashed border-black/20 bg-white page-fade-in">
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
          {visibleInfluencers.map((influencer, idx) => {
            const isShortlisted = shortlist.has(influencer.id)
            return (
              <div
                key={influencer.id}
                className="card-enter group bg-white border-[3px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] overflow-hidden hover:shadow-[7px_7px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all"
                style={{ animationDelay: `${Math.min(idx, 12) * 35}ms` }}
              >
                {/* Header */}
                <div className="p-4 border-b-2 border-black flex items-start gap-3 relative">
                  <button
                    type="button"
                    onClick={() => toggleShortlist(influencer.id)}
                    className={`absolute top-3 right-3 p-1.5 border-2 border-black rounded-full transition-all ${
                      isShortlisted
                        ? 'bg-[#FFD93D] shadow-[2px_2px_0_0_rgba(0,0,0,1)] scale-110'
                        : 'bg-white hover:bg-[#FFD93D]/40 hover:scale-110'
                    }`}
                    title={isShortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
                  >
                    {isShortlisted ? (
                      <BookmarkCheck className="w-3.5 h-3.5" strokeWidth={3} />
                    ) : (
                      <Bookmark className="w-3.5 h-3.5" strokeWidth={2.5} />
                    )}
                  </button>

                  <div className="relative w-14 h-14 bg-gradient-to-br from-[#B4F056] to-[#FFD93D] border-2 border-black flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
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
                  <Stat label="Followers" value={formatFollowers(influencer.followers)} />
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
                    className="flex-1 py-2 border-2 border-black font-black text-xs uppercase tracking-wider hover:bg-black/5 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" strokeWidth={3} />
                    Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMessage(influencer.id)}
                    className="flex-1 py-2 bg-[#B4F056] border-2 border-black font-black text-xs uppercase tracking-wider shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all flex items-center justify-center gap-1"
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

      {/* Pro tip */}
      {!loading && visibleInfluencers.length > 0 && shortlist.size === 0 && (
        <div className="mt-8 bg-[#A78BFA]/10 border-[3px] border-black p-4 flex items-start gap-3 page-fade-in">
          <Sparkles className="w-5 h-5 text-[#A78BFA] flex-shrink-0 mt-0.5" strokeWidth={3} />
          <div>
            <p className="text-sm font-black uppercase tracking-wider mb-0.5">Pro tip</p>
            <p className="text-xs text-black/60 font-semibold">
              Tap the bookmark icon to save creators. Build a shortlist for each campaign and invite them all at once.
            </p>
          </div>
        </div>
      )}

      {/* Animations */}
      <style jsx global>{`
        @keyframes pageFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .page-fade-in { animation: pageFadeIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .card-enter { animation: cardIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }

        @keyframes chipIn {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
        .active-chip { animation: chipIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both; }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .skeleton-shimmer {
          background: linear-gradient(90deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.12) 50%, rgba(0,0,0,0.05) 100%);
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
        }
      `}</style>
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

function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="card-enter bg-white border-[3px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="p-4 border-b-2 border-black flex items-start gap-3">
        <div className="w-14 h-14 border-2 border-black skeleton-shimmer shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-4 w-3/4 skeleton-shimmer" />
          <div className="h-3 w-1/2 skeleton-shimmer" />
          <div className="flex gap-1">
            <div className="h-4 w-12 skeleton-shimmer" />
            <div className="h-4 w-16 skeleton-shimmer" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x-2 divide-black border-b-2 border-black">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-3 space-y-1.5">
            <div className="h-2 w-12 mx-auto skeleton-shimmer" />
            <div className="h-4 w-10 mx-auto skeleton-shimmer" />
          </div>
        ))}
      </div>
      <div className="p-3 flex gap-2">
        <div className="flex-1 h-8 skeleton-shimmer border-2 border-black" />
        <div className="flex-1 h-8 skeleton-shimmer border-2 border-black" />
      </div>
    </div>
  )
}
