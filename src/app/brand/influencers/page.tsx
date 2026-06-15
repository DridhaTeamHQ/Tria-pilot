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
  LayoutGrid,
  List,
} from 'lucide-react'
import { FilterDropdown } from '@/components/brand/FilterDropdown'
import { PortalModal } from '@/components/ui/PortalModal'

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
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)

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
    <div className="relative min-h-screen overflow-hidden bg-[#FAFAF8] animate-fade-in">
      {/* Background Aesthetic Bubbles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-[#B4F056]/20 blur-3xl" />
        <div className="absolute top-44 -right-20 h-80 w-80 rounded-full bg-[#A78BFA]/15 blur-3xl" />
        <div className="absolute bottom-20 left-1/3 h-72 w-72 rounded-full bg-[#FFD93D]/15 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-60 w-60 rounded-full bg-[#FF8C69]/10 blur-3xl" />
      </div>
      <div className="relative z-10 container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        {/* Header section with Title and Quick Actions */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-[#B4F056] rounded-[20px] flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Users className="w-6 h-6 text-black" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-black text-black tracking-tight leading-none mb-1">
                  Discover Creators
                </h1>
                <p className="text-black/50 font-bold text-sm">Find the perfect faces for your brand</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {shortlist.size > 0 && (
              <button
                type="button"
                onClick={() => setShowShortlistOnly((v) => !v)}
                className={`h-11 px-5 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 border-2 ${showShortlistOnly
                  ? 'bg-black border-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]'
                  : 'bg-white border-black text-black hover:bg-[#FFD93D] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]'
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
                className="h-11 px-5 text-xs font-black uppercase tracking-wider rounded-xl bg-white border-2 border-black text-black hover:bg-[#FF9B8F] transition-all flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            )}

            <div className="flex items-center bg-white border-2 border-black rounded-xl p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ml-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#B4F056] text-black shadow-inner' : 'text-black/40 hover:text-black'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-[#B4F056] text-black shadow-inner' : 'text-black/40 hover:text-black'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Unified Search & Filters Container (Logic from Main, Design matches the Modern UI) */}
        <div className="mb-10">
          <div className="bg-white border-[3px] border-black rounded-[32px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            {/* Search bar integration */}
            <div className="p-4 sm:p-6 border-b-2 border-black bg-[#F9F8F4]/50 rounded-t-[29px]">
              <form onSubmit={handleSubmitSearch} className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 w-full relative group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-black/40 group-focus-within:text-black transition-colors" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search by name, niche, or bio..."
                    className="w-full pl-14 pr-12 py-4 bg-white border-2 border-black rounded-2xl text-sm font-medium shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:translate-x-[1px] focus:translate-y-[1px] outline-none transition-all placeholder:text-black/30"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => { setSearchInput(''); setSearch('') }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-black/40 hover:text-black"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsMobileFiltersOpen(true)}
                    className="md:hidden flex-1 px-4 py-4 bg-white border-2 border-black rounded-2xl font-black text-xs uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-2"
                  >
                    <SlidersHorizontal className="w-4 h-4" strokeWidth={3} />
                    Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 sm:flex-none w-full sm:w-auto px-8 py-4 bg-black text-white rounded-2xl font-semibold text-xs uppercase tracking-widest hover:bg-gray-900 active:translate-y-0.5 transition-all shadow-md shadow-black/20 hover:shadow-lg"
                  >
                    Find Creators
                  </button>
                </div>
              </form>
            </div>

            {/* Filters Row */}
            <div className="hidden md:flex p-4 sm:p-6 flex-wrap items-center gap-3">
              <FilterDropdown
                label="Niche"
                anyLabel="All niches"
                value={niche}
                onChange={(value) => setNiche(Array.isArray(value) ? (value[0] ?? null) : value)}
                options={NICHE_OPTIONS}
                accentColor="#B4F056"
              />
              <FilterDropdown
                label="Size"
                anyLabel="Any size"
                value={followerBand}
                onChange={(value) => setFollowerBand(Array.isArray(value) ? (value[0] ?? null) : value)}
                options={FOLLOWER_BANDS as unknown as { value: string; label: string; hint?: string }[]}
                accentColor="#A78BFA"
              />
              <FilterDropdown
                label="Budget"
                anyLabel="Any"
                value={priceBand}
                onChange={(value) => setPriceBand(Array.isArray(value) ? (value[0] ?? null) : value)}
                options={PRICE_BANDS as unknown as { value: string; label: string }[]}
                accentColor="#FFD93D"
              />
              <FilterDropdown
                label="Reach"
                anyLabel="Any"
                value={minEngagement}
                onChange={(value) => {
                  const raw = Array.isArray(value) ? value[0] : value
                  setMinEngagement(raw != null ? Number(raw) : null)
                }}
                options={ENGAGEMENT_OPTIONS}
                accentColor="#FF8C69"
              />
              <FilterDropdown
                label="Badge"
                anyLabel="Any"
                value={badgeTier}
                onChange={(value) => setBadgeTier(Array.isArray(value) ? (value[0] ?? null) : value)}
                options={BADGE_TIERS}
                accentColor="#FBBF24"
              />
              <div className="sm:ml-auto flex items-center gap-3">
                <FilterDropdown
                  label="Sort"
                  anyLabel="Followers"
                  value={sortBy}
                  onChange={(value) => setSortBy(Array.isArray(value) ? value[0] || 'followers' : value || 'followers')}
                  options={SORT_OPTIONS as unknown as { value: string; label: string }[]}
                  className="min-w-[140px]"
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

        {/* Results */}
        {loading ? (
          viewMode === 'grid' ? (
            <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <SkeletonCard key={i} delay={i * 60} />
              ))}
            </div>
          ) : (
            <div className="bg-white border-[3px] border-black rounded-[32px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
              <div className="p-4 space-y-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex items-center gap-4 py-3 border-b border-black/5 last:border-0 animate-pulse">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 border-2 border-black/5" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-100 rounded w-1/4" />
                      <div className="h-3 bg-gray-50 rounded w-1/3" />
                    </div>
                    <div className="h-8 w-24 bg-gray-50 rounded-lg" />
                    <div className="h-8 w-24 bg-gray-100 rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          )
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
        ) : viewMode === 'grid' ? (
          <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {visibleInfluencers.map((influencer, idx) => {
              const isShortlisted = shortlist.has(influencer.id)
              return (
                <div
                  key={influencer.id}
                  className="group flex flex-col h-full bg-white rounded-[32px] border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 overflow-hidden"
                  style={{ animationDelay: `${Math.min(idx, 12) * 40}ms` }}
                >
                  <div className="flex-1 p-6">
                    {/* Profile Header */}
                    <div className="flex items-start gap-5 mb-6">
                      <div className="relative w-24 h-24 shrink-0">
                        <div className="w-full h-full rounded-[24px] border-[3px] border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white relative z-10">
                          {influencer.profile_image ? (
                            <AppImage src={influencer.profile_image} alt={influencer.name} className="object-cover w-full h-full" sizes="96px" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[#B4F056] to-[#FFD93D] flex items-center justify-center font-black text-3xl">
                              {influencer.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        {/* Badge Floating */}
                        {influencer.badge_tier && (
                          <div className={`absolute -top-3 -right-3 w-10 h-10 rounded-full border-[3px] border-black flex items-center justify-center z-20 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${badgeColor(influencer.badge_tier)}`}>
                            <Award className="w-5 h-5 text-black" strokeWidth={3} />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-black text-2xl text-black truncate leading-tight">
                            {influencer.name}
                          </h3>
                          <button
                            type="button"
                            onClick={() => toggleShortlist(influencer.id)}
                            className={`shrink-0 p-2 rounded-xl border-2 border-black transition-all ${isShortlisted ? 'bg-[#FFD93D] shadow-none translate-x-[1.5px] translate-y-[1.5px]' : 'bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1.5px] hover:translate-y-[1.5px]'}`}
                          >
                            <Bookmark className={`w-5 h-5 ${isShortlisted ? 'fill-black' : ''}`} strokeWidth={2.5} />
                          </button>
                        </div>
                        <p className="text-sm font-bold text-black/40 truncate mb-3">
                          {influencer.bio || 'Content Creator'}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {influencer.niches?.slice(0, 2).map(niche => (
                            <span key={niche} className="px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-[#B4F056]/20 text-black border-2 border-black/10 rounded-lg">
                              {niche}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3 bg-gray-50 rounded-2xl border-2 border-black/5 p-4 group-hover:bg-white group-hover:border-black/20 transition-colors">
                      <div className="text-center">
                        <p className="text-[10px] font-black uppercase tracking-tighter text-black/40 mb-1">Followers</p>
                        <p className="text-base font-black text-black">{formatFollowers(influencer.followers)}</p>
                      </div>
                      <div className="text-center border-x-2 border-black/5">
                        <p className="text-[10px] font-black uppercase tracking-tighter text-black/40 mb-1">Eng.</p>
                        <p className="text-base font-black text-black">{influencer.engagement_rate}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-black uppercase tracking-tighter text-black/40 mb-1">Price</p>
                        <p className="text-base font-black text-black">{influencer.price_per_post ? `₹${formatFollowers(influencer.price_per_post)}` : '—'}</p>
                      </div>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="px-6 pb-6 pt-0 flex gap-4">
                    <button
                      type="button"
                      onClick={() => handleViewProfile(influencer.id)}
                      className="flex-1 py-4 bg-white text-black border-2 border-black rounded-2xl font-black text-xs uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" strokeWidth={3} />
                      Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMessage(influencer.id)}
                      className="flex-1 py-4 bg-[#B4F056] text-black border-2 border-black rounded-2xl font-black text-xs uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" strokeWidth={3} />
                      Message
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white border-[3px] border-black rounded-[32px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F9F8F4] border-b-2 border-black">
                  <th className="p-5 pl-30 text-[11px] font-black uppercase tracking-widest text-black/40 w-[25%]">Creator</th>
                  <th className="p-5 pl-15 text-[11px] font-black uppercase tracking-widest text-black/40 w-[15%]">Niches</th>
                  <th className="p-5 text-[11px] font-black uppercase tracking-widest text-black/40 text-center w-[12%]">Followers</th>
                  <th className="p-5 text-[11px] font-black uppercase tracking-widest text-black/40 text-center w-[12%]">Engagement</th>
                  <th className="p-5 text-[11px] font-black uppercase tracking-widest text-black/40 text-center w-[12%]">Price</th>
                  <th className="p-5 pr-30 text-[11px] font-black uppercase tracking-widest text-black/40 text-right w-[24%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleInfluencers.map((influencer, idx) => {
                  const isShortlisted = shortlist.has(influencer.id)
                  return (
                    <tr key={influencer.id} className={`border-b-2 border-black/5 group ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF5]'}`}>
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="relative w-14 h-14 shrink-0">
                            <div className="w-full h-full rounded-2xl border-2 border-black overflow-hidden bg-white relative z-10 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] group-hover:translate-x-[-1px] group-hover:translate-y-[-1px] group-hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
                              {influencer.profile_image ? (
                                <AppImage src={influencer.profile_image} alt={influencer.name} className="object-cover w-full h-full" sizes="56px" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-[#B4F056] to-[#FFD93D] flex items-center justify-center font-black text-xl">
                                  {influencer.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            {influencer.badge_tier && (
                              <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full border-2 border-black flex items-center justify-center z-20 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${badgeColor(influencer.badge_tier)}`}>
                                <Award className="w-3 h-3 text-black" strokeWidth={4} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-lg text-black truncate leading-tight mb-0.5">{influencer.name}</p>
                            <p className="text-xs font-bold text-black/30 truncate uppercase tracking-tighter">{influencer.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex flex-wrap gap-1.5">
                          {influencer.niches?.slice(0, 2).map(niche => (
                            <span key={niche} className="px-2.5 py-1 text-[9px] font-black uppercase bg-gray-50 border-2 border-black/5 rounded-lg text-black/60 group-hover:border-black/20 group-hover:text-black transition-all">
                              {niche}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <p className="font-black text-base text-black">{formatFollowers(influencer.followers)}</p>
                      </td>
                      <td className="p-6 text-center">
                        <p className="font-black text-base text-black">{influencer.engagement_rate}%</p>
                      </td>
                      <td className="p-6 text-center">
                        <p className="font-black text-base text-black">{influencer.price_per_post ? `₹${formatFollowers(influencer.price_per_post)}` : '—'}</p>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => handleViewProfile(influencer.id)}
                            className="px-4 py-2.5 bg-white text-black border-2 border-black rounded-xl font-black text-[10px] uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1.5px] hover:translate-y-[1.5px] transition-all"
                          >
                            Profile
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMessage(influencer.id)}
                            className="px-4 py-2.5 bg-[#B4F056] text-black border-2 border-black rounded-xl font-black text-[10px] uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1.5px] hover:translate-y-[1.5px] transition-all"
                          >
                            Message
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleShortlist(influencer.id)}
                            className={`p-2.5 rounded-xl border-2 border-black transition-all ${isShortlisted ? 'bg-[#FFD93D] shadow-none translate-x-[1.5px] translate-y-[1.5px]' : 'bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1.5px] hover:translate-y-[1.5px]'}`}
                          >
                            <Bookmark className={`w-4 h-4 ${isShortlisted ? 'fill-black' : ''}`} strokeWidth={3} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
        }

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

        {/* Mobile Filters Modal */}
        <PortalModal isOpen={isMobileFiltersOpen} onClose={() => setIsMobileFiltersOpen(false)}>
          <div className="fixed inset-0 z-[100] flex flex-col justify-end pointer-events-none">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto transition-opacity"
              onClick={() => setIsMobileFiltersOpen(false)}
            />
            
            {/* Bottom Sheet */}
            <div className="relative w-full max-h-[85vh] bg-white rounded-t-[32px] border-t-[3px] border-x-[3px] border-black shadow-[0_-8px_0_0_rgba(0,0,0,1)] p-6 pointer-events-auto flex flex-col animate-slide-up">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-black">Filters</h2>
                <button 
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors border-2 border-transparent hover:border-black"
                >
                  <X className="w-5 h-5 text-black" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto pb-6">
                <div className="grid grid-cols-2 gap-3">
                  <FilterDropdown label="Niche" anyLabel="All niches" value={niche} onChange={(v) => setNiche(Array.isArray(v) ? (v[0] ?? null) : v)} options={NICHE_OPTIONS} accentColor="#B4F056" />
                  <FilterDropdown label="Size" anyLabel="Any size" value={followerBand} onChange={(v) => setFollowerBand(Array.isArray(v) ? (v[0] ?? null) : v)} options={FOLLOWER_BANDS as unknown as { value: string; label: string; hint?: string }[]} accentColor="#A78BFA" />
                  <FilterDropdown label="Budget" anyLabel="Any" value={priceBand} onChange={(v) => setPriceBand(Array.isArray(v) ? (v[0] ?? null) : v)} options={PRICE_BANDS as unknown as { value: string; label: string }[]} accentColor="#FFD93D" />
                  <FilterDropdown label="Reach" anyLabel="Any" value={minEngagement} onChange={(v) => { const raw = Array.isArray(v) ? v[0] : v; setMinEngagement(raw != null ? Number(raw) : null) }} options={ENGAGEMENT_OPTIONS} accentColor="#FF8C69" />
                  <FilterDropdown label="Badge" anyLabel="Any" value={badgeTier} onChange={(v) => setBadgeTier(Array.isArray(v) ? (v[0] ?? null) : v)} options={BADGE_TIERS} accentColor="#FBBF24" />
                  <FilterDropdown label="Sort" anyLabel="Followers" value={sortBy} onChange={(v) => setSortBy(Array.isArray(v) ? v[0] || 'followers' : v || 'followers')} options={SORT_OPTIONS as unknown as { value: string; label: string }[]} className="w-full" />
                </div>
                
                <button
                  type="button"
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="w-full mt-6 px-8 py-4 bg-black text-white rounded-2xl font-semibold text-xs uppercase tracking-widest hover:bg-gray-900 active:translate-y-0.5 transition-all shadow-md shadow-black/20 hover:shadow-lg"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </PortalModal>

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
    </div>
  )
}

function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="bg-white rounded-[32px] border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="p-6">
        <div className="flex items-start gap-5 mb-6">
          <div className="w-24 h-24 rounded-[24px] bg-gray-100 animate-pulse shrink-0 border-2 border-black/5" />
          <div className="flex-1 space-y-3 pt-2">
            <div className="h-7 bg-gray-100 rounded-lg w-3/4 animate-pulse" />
            <div className="h-4 bg-gray-50 rounded-lg w-1/2 animate-pulse" />
            <div className="flex gap-2 mt-3">
              <div className="h-6 bg-gray-50 rounded-md w-16 animate-pulse" />
              <div className="h-6 bg-gray-50 rounded-md w-16 animate-pulse" />
            </div>
          </div>
        </div>
        <div className="h-16 bg-gray-50 rounded-2xl mb-6 animate-pulse border-2 border-black/5" />
        <div className="flex gap-4">
          <div className="flex-1 h-12 bg-gray-100 rounded-xl animate-pulse" />
          <div className="flex-1 h-12 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  )
}
