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
  ChevronDown,
  Instagram,
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
  return 'bg-gray-100'
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
    const isAdding = !shortlist.has(id)
    
    setShortlist((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })

    if (isAdding) {
      toast.success('Added to shortlist')
    } else {
      toast.success('Removed from shortlist')
    }
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
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#B4F056] rounded-xl flex items-center justify-center shadow-sm">
              <Users className="w-6 h-6 text-black" />
            </div>
            <h1 className="text-3xl font-bold text-black tracking-tight">
              Discover Creators
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:ml-[52px]">
          {shortlist.size > 0 && (
            <button
              type="button"
              onClick={() => setShowShortlistOnly((v) => !v)}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 border-2 ${showShortlistOnly
                  ? 'bg-black border-black text-white shadow-lg shadow-black/20'
                  : 'bg-white border-gray-200 text-black/80 hover:border-black hover:text-black shadow-sm'
                }`}
            >
              <BookmarkCheck className="w-4 h-4" />
              Shortlist · {shortlist.size}
            </button>
          )}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl bg-gray-100 text-black/80 hover:bg-black hover:text-white transition-all flex items-center gap-2 border-2 border-transparent"
            >
              <RotateCcw className="w-4 h-4" />
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Unified Search & Filters Container (Logic from Main, Design matches the Modern UI) */}
      <div className="relative mb-8 group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#B4F056] to-[#FFD93D] rounded-[2rem] blur opacity-5 group-hover:opacity-10 transition duration-700"></div>

        <div className="relative bg-white/95 backdrop-blur-md rounded-[1.75rem] border border-gray-200 shadow-xl shadow-black/5 p-4 sm:p-6 transition-all duration-500 z-30">
          {/* Search Bar Row */}
          <form
            onSubmit={handleSubmitSearch}
            className="flex flex-col sm:flex-row items-center gap-3 mb-2"
          >
            <div className="flex-1 w-full relative group/input">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/60 transition-all duration-300 group-focus-within/input:text-[#B4F056]" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search creators by name, niche, or bio..."
                className="w-full pl-12 pr-10 py-3 bg-gray-50 rounded-xl font-bold text-black placeholder:text-black/50 focus:ring-2 focus:ring-[#B4F056]/40 focus:bg-white outline-none transition-all duration-300 text-sm"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('')
                    setSearch('')
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-black/60 hover:text-black transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-10 py-3 bg-black text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-gray-800 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/20"
            >
              <Search className="w-3.5 h-3.5" />
              Find Creators
            </button>
          </form>

          {/* Filters Row */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <FilterDropdown
                label="Niche"
                anyLabel="All niches"
                value={niche}
                onChange={(value) => setNiche(Array.isArray(value) ? (value[0] ?? null) : value)}
                options={NICHE_OPTIONS}
                accentColor="#B4F056"
              />
              <FilterDropdown
                label="Followers"
                anyLabel="Any size"
                value={followerBand}
                onChange={(value) => setFollowerBand(Array.isArray(value) ? (value[0] ?? null) : value)}
                options={FOLLOWER_BANDS as unknown as { value: string; label: string; hint?: string }[]}
                accentColor="#A78BFA"
              />
              <FilterDropdown
                label="Price"
                anyLabel="Any price"
                value={priceBand}
                onChange={(value) => setPriceBand(Array.isArray(value) ? (value[0] ?? null) : value)}
                options={PRICE_BANDS as unknown as { value: string; label: string }[]}
                accentColor="#FFD93D"
              />
              <FilterDropdown
                label="Engagement"
                anyLabel="Any"
                value={minEngagement}
                onChange={(value) => {
                  const raw = Array.isArray(value) ? value[0] : value
                  if (raw == null || raw === '') {
                    setMinEngagement(null)
                    return
                  }
                  setMinEngagement(Number(raw))
                }}
                options={ENGAGEMENT_OPTIONS}
                accentColor="#FF8C69"
              />
              <FilterDropdown
                label="Badge"
                anyLabel="Any tier"
                value={badgeTier}
                onChange={(value) => setBadgeTier(Array.isArray(value) ? (value[0] ?? null) : value)}
                options={BADGE_TIERS}
                accentColor="#FBBF24"
              />
              <FilterDropdown
                label="Gender"
                anyLabel="Any"
                value={gender}
                onChange={(value) => setGender(Array.isArray(value) ? (value[0] ?? null) : value)}
                options={GENDERS}
                accentColor="#34D399"
              />
              <FilterDropdown
                label="Audience"
                anyLabel="Any"
                value={audienceType}
                onChange={(value) => setAudienceType(Array.isArray(value) ? (value[0] ?? null) : value)}
                options={AUDIENCE_TYPES}
                accentColor="#F472B6"
              />
              <div className="sm:ml-auto">
                <FilterDropdown
                  label="Sort by"
                  anyLabel="Followers"
                  value={sortBy}
                  onChange={(value) => {
                    const next = Array.isArray(value) ? value[0] : value
                    setSortBy(next || 'followers')
                  }}
                  options={SORT_OPTIONS as unknown as { value: string; label: string }[]}
                />
              </div>
            </div>

            {/* Active chips bar */}
            {activeChips.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-2 pt-4 border-t border-gray-100">
                <span className="text-[9px] font-black uppercase tracking-widest text-black/60 ml-1">
                  Active Filters
                </span>
                {activeChips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={chip.remove}
                    className="inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 text-[10px] font-black bg-white border border-gray-200 rounded-lg shadow-sm hover:border-black/60 transition-all group"
                  >
                    <div className="w-2 h-2 rounded-full" style={{ background: chip.color }} />
                    <span className="text-black/80 group-hover:text-black">{chip.label}</span>
                    <div className="w-5 h-5 flex items-center justify-center bg-gray-50 group-hover:bg-black group-hover:text-white transition-colors rounded-md">
                      <X className="w-3 h-3" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} delay={i * 60} />
          ))}
        </div>
      ) : visibleInfluencers.length === 0 ? (
        <div className="text-center py-24 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200 animate-fade-in">
          <Users className="w-16 h-16 mx-auto mb-6 text-black/20" />
          <h3 className="text-2xl font-black text-black/70 mb-2">No creators found</h3>
          <p className="text-black/60 font-bold max-w-sm mx-auto mb-8">
            {showShortlistOnly
              ? 'Your shortlist is currently empty. Start adding creators by clicking the bookmark icon on their profiles.'
              : 'Try widening your filters or clearing them to see more creators.'}
          </p>
          {(activeFilterCount > 0 || showShortlistOnly) && (
            <button
              type="button"
              onClick={() => {
                resetFilters()
                setShowShortlistOnly(false)
              }}
              className="px-8 py-3.5 bg-[#B4F056] text-black font-black rounded-2xl shadow-lg shadow-[#B4F056]/20 hover:shadow-[#B4F056]/40 hover:-translate-y-0.5 transition-all flex items-center gap-2 mx-auto"
            >
              <RotateCcw className="w-4 h-4" strokeWidth={3} />
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {visibleInfluencers.map((influencer, idx) => {
            const isShortlisted = shortlist.has(influencer.id)
            return (
              <div
                key={influencer.id}
                className="group flex flex-col h-full bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-black/5 hover:-translate-y-2 transition-all duration-500 overflow-hidden"
                style={{ animationDelay: `${Math.min(idx, 12) * 40}ms` }}
              >
                <div className="flex-1">
                  {/* Profile Header */}
                  <div className="p-6 pb-4">
                  <div className="flex items-start gap-4">
                    {/* Avatar Wrapper */}
                    <div className="relative w-20 h-20 shrink-0">
                      <div className="w-full h-full rounded-2xl overflow-hidden shadow-inner p-0.5 bg-gradient-to-br from-[#B4F056] via-[#FFD93D] to-[#B4F056] bg-[length:200%_200%] animate-shimmer">
                        <div className="w-full h-full bg-white rounded-[calc(1rem-2px)] flex items-center justify-center overflow-hidden">
                          {influencer.profile_image ? (
                            <AppImage
                              src={influencer.profile_image}
                              alt={influencer.name}
                              className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
                              sizes="80px"
                            />
                          ) : (
                            <span className="text-3xl font-black bg-gradient-to-br from-black to-black/60 bg-clip-text text-transparent">
                              {influencer.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Badge */}
                      {influencer.badge_tier && (
                        <div
                          className={`absolute -top-2 -left-2 w-7 h-7 ${badgeColor(
                            influencer.badge_tier,
                          )} border-2 border-white flex items-center justify-center rounded-full shadow-xl z-20 transition-transform duration-300 group-hover:scale-110`}
                          title={`${influencer.badge_tier} tier`}
                        >
                          <Award className="w-3.5 h-3.5 text-black" strokeWidth={3.5} />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-black text-xl text-black truncate transition-colors duration-300">
                          {influencer.name}
                        </h3>
                        <button
                          type="button"
                          onClick={() => toggleShortlist(influencer.id)}
                          className={`p-2 rounded-xl border-2 transition-all duration-300 ${isShortlisted
                              ? 'bg-[#FFD93D] border-[#FFD93D] text-black shadow-lg shadow-[#FFD93D]/20 scale-110'
                              : 'bg-gray-100 border-transparent text-black/30 hover:text-black hover:bg-white hover:border-gray-200 hover:scale-110'
                            }`}
                        >
                          {isShortlisted ? (
                            <BookmarkCheck className="w-4 h-4" strokeWidth={3} />
                          ) : (
                            <Bookmark className="w-4 h-4" strokeWidth={2.5} />
                          )}
                        </button>
                      </div>
                      <p className="text-sm text-black/40 font-bold truncate mb-3">
                        {influencer.bio || 'Content Creator'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {influencer.niches?.slice(0, 2).map(niche => (
                          <span
                            key={niche}
                            className="px-3 py-1 text-[10px] font-black uppercase tracking-wider bg-gray-100 text-black/70 rounded-full border border-gray-200 group-hover:bg-[#B4F056] group-hover:border-[#B4F056] group-hover:text-black transition-colors"
                          >
                            {niche}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="mx-6 p-4 bg-gray-100 rounded-2xl flex items-center justify-around mb-6 border border-gray-200 group-hover:bg-white group-hover:border-[#B4F056]/40 transition-all duration-500">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5 text-black/40 text-[10px] font-black uppercase tracking-widest mb-1">
                      <Instagram className="w-3 h-3" strokeWidth={3} />
                      Followers
                    </div>
                    <div className="text-lg font-black text-black tracking-tight">
                      {formatFollowers(influencer.followers)}
                    </div>
                  </div>
                  <div className="w-px h-8 bg-gray-200 group-hover:bg-[#B4F056]/40 transition-colors" />
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5 text-black/40 text-[10px] font-black uppercase tracking-widest mb-1">
                      <TrendingUp className="w-3 h-3" strokeWidth={3} />
                      Engagement
                    </div>
                    <div className="text-lg font-black text-black tracking-tight">
                      {influencer.engagement_rate}%
                    </div>
                  </div>
                  <div className="w-px h-8 bg-gray-200 group-hover:bg-[#B4F056]/40 transition-colors" />
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5 text-black/40 text-[10px] font-black uppercase tracking-widest mb-1">
                      <IndianRupee className="w-3 h-3" strokeWidth={3} />
                      Per Post
                    </div>
                    <div className="text-lg font-black text-black tracking-tight">
                      {influencer.price_per_post ? `₹${formatFollowers(influencer.price_per_post)}` : '—'}
                    </div>
                  </div>
                </div>
                </div>
                {/* Actions */}
                <div className="px-6 pb-6 pt-0 flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleViewProfile(influencer.id)}
                    className="flex-1 py-3 bg-black text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-gray-800 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" strokeWidth={3} />
                    Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMessage(influencer.id)}
                    className="flex-1 py-3 bg-[#B4F056] text-black rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-[#B4F056]/20 hover:shadow-[#B4F056]/40 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" strokeWidth={3} />
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
        <div className="mt-12 bg-gradient-to-r from-gray-100 to-white rounded-3xl border border-gray-200 p-6 flex items-start gap-4 animate-slide-up group hover:shadow-xl hover:shadow-black/5 transition-all duration-500">
          <div className="w-12 h-12 bg-[#A78BFA]/20 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Sparkles className="w-6 h-6 text-[#A78BFA]" strokeWidth={3} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-[#A78BFA] mb-1">Expert Advice</p>
            <p className="text-base text-black/70 font-bold leading-relaxed">
              Tap the <Bookmark className="inline w-4 h-4 -mt-1 mx-1 text-black/40" strokeWidth={3} /> icon to save creators. Build a shortlist for each campaign and invite them all at once for faster scaling.
            </p>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes pageFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: pageFadeIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%);
          background-size: 200% 100%;
          animation: shimmer 2s infinite linear;
        }
      `}</style>
    </div>
  )
}

function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="p-6 pb-4">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gray-100 animate-pulse shrink-0" />
          <div className="flex-1 space-y-3 pt-1">
            <div className="h-6 bg-gray-100 rounded-lg w-3/4 animate-pulse" />
            <div className="h-4 bg-gray-50 rounded-lg w-1/2 animate-pulse" />
            <div className="flex gap-2">
              <div className="h-6 bg-gray-50 rounded-full w-16 animate-pulse" />
              <div className="h-6 bg-gray-50 rounded-full w-20 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
      <div className="mx-6 h-16 bg-gray-50 rounded-2xl mb-6 animate-pulse" />
      <div className="px-6 pb-6 flex gap-3">
        <div className="flex-1 h-12 bg-gray-100 rounded-xl animate-pulse" />
        <div className="flex-1 h-12 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    </div>
  )
}
