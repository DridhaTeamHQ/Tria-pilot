'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useCampaigns } from '@/lib/hooks/useCampaigns'
import {
  Loader2, Sparkles, Search, SlidersHorizontal, ArrowUpDown,
  ChevronDown, TrendingUp,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { staggerContainer, staggerItem, pageVariants, slideUp, fadeIn } from '@/lib/animations'
import { BrutalLoader } from '@/components/ui/BrutalLoader'
import { CampaignsSkeleton } from '@/components/dashboard/DashboardSkeleton'
import CampaignAnalytics from '@/components/campaigns/CampaignAnalytics'
import CampaignRecommendations from '@/components/campaigns/CampaignRecommendations'

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   FILTER / SORT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

type StatusFilter = 'all' | 'active' | 'draft' | 'paused' | 'completed'
type SortOption = 'newest' | 'oldest' | 'ctr' | 'spend' | 'impressions'

const STATUS_FILTERS: { value: StatusFilter; label: string; color: string }[] = [
  { value: 'all', label: 'All', color: 'bg-black' },
  { value: 'active', label: 'Active', color: 'bg-[#B4F056]' },
  { value: 'draft', label: 'Draft', color: 'bg-[#FFD93D]' },
  { value: 'paused', label: 'Paused', color: 'bg-gray-300' },
  { value: 'completed', label: 'Completed', color: 'bg-black' },
]

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'spend', label: 'Highest Spend' },
  { value: 'impressions', label: 'Most Impressions' },
  { value: 'ctr', label: 'Best CTR' },
]

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MINI METRIC BAR
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function MiniMetricBar({ value, max, color = '#B4F056' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="h-1 bg-black/[0.05] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  )
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CAMPAIGN CARD
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const STATUS_CARD_COLORS: Record<string, string> = {
  active: 'bg-[#F2FDC7]',
  draft: 'bg-[#FFF9E0]',
  paused: 'bg-[#F1F5F9]',
  completed: 'bg-[#F3E8FF]',
}

const STATUS_BADGE_COLORS: Record<string, string> = {
  active: 'bg-[#B4F056] text-black',
  draft: 'bg-[#FFD93D] text-black',
  paused: 'bg-gray-200 text-black/60',
  completed: 'bg-[#A78BFA] text-black',
}

const GOAL_LABELS: Record<string, string> = {
  sales: 'Sales',
  awareness: 'Awareness',
  launch: 'Launch',
  traffic: 'Traffic',
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MAIN PAGE
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export default function CampaignsPage() {
  const { data: campaigns = [], isLoading, error } = useCampaigns()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortOption, setSortOption] = useState<SortOption>('newest')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOpen, setSortOpen] = useState(false)

  // ── Computed derived data ──
  const maxImpressions = useMemo(
    () => Math.max(...campaigns.map(c => c.impressions ?? 0), 1),
    [campaigns]
  )

  const filteredCampaigns = useMemo(() => {
    let filtered = [...campaigns]

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter)
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(q) ||
        (c.brief && c.brief.toLowerCase().includes(q)) ||
        (c.goal && c.goal.toLowerCase().includes(q))
      )
    }

    // Sort
    switch (sortOption) {
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case 'spend':
        filtered.sort((a, b) => (b.spend ?? 0) - (a.spend ?? 0))
        break
      case 'impressions':
        filtered.sort((a, b) => (b.impressions ?? 0) - (a.impressions ?? 0))
        break
      case 'ctr':
        filtered.sort((a, b) => {
          const aCtr = (a.impressions ?? 0) > 0 ? (a.clicks ?? 0) / (a.impressions ?? 1) : 0
          const bCtr = (b.impressions ?? 0) > 0 ? (b.clicks ?? 0) / (b.impressions ?? 1) : 0
          return bCtr - aCtr
        })
        break
      default: // newest
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    return filtered
  }, [campaigns, statusFilter, sortOption, searchQuery])

  if (isLoading) {
    return <CampaignsSkeleton />
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="min-h-[calc(100vh-80px)] bg-[#FAFAF8] pt-2 pb-10 md:pb-12 relative"
    >
      {/* Background Design: Subtle Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.05] z-0"
        style={{ backgroundImage: 'linear-gradient(#000 0.5px, transparent 0.5px), linear-gradient(90deg, #000 0.5px, transparent 0.5px)', backgroundSize: '40px 40px' }}
      />

      <div className="relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-6 pb-6 sm:pb-8 pt-2 sm:pt-4">

        {/* ── HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 mb-10">
          <motion.div variants={slideUp}>
            <h1 className="text-4xl md:text-5xl font-black text-black mb-2 tracking-tight">Campaigns</h1>
            <p className="text-black/60 text-base font-bold max-w-lg leading-snug">
              AI-powered strategy, analytics & visual generation for high-impact brand growth.
            </p>
          </motion.div>
          <motion.div
            variants={slideUp}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link
              href="/brand/campaigns/new"
              className="inline-flex items-center gap-3 px-8 py-4 bg-[#B4F056] border-[3px] border-black font-black uppercase text-sm tracking-widest shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] transition-all shrink-0 self-start sm:self-auto"
            >
              <Sparkles className="w-5 h-5" strokeWidth={3} />
              Launch AI Strategist
            </Link>
          </motion.div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 font-medium text-sm">
            Failed to load campaigns. Please refresh the page.
          </div>
        )}

        {campaigns.length === 0 ? (
          /* ── EMPTY STATE ── */
          <div className="flex flex-col items-center justify-center py-20 px-8 bg-white border-[3px] border-black rounded-[32px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="text-6xl mb-6">🚀</div>
            <h3 className="text-2xl font-black text-black mb-3">No campaigns yet</h3>
            <p className="text-black/60 text-center max-w-md mb-10 font-bold text-base leading-relaxed">
              Launch the AI Strategist to create your first campaign. It&apos;ll ask strategic
              questions, research your market, generate content ideas, and
              auto-create your campaign blueprint.
            </p>
            <Link
              href="/brand/campaigns/new"
              className="inline-flex items-center gap-3 px-8 py-4 bg-[#B4F056] border-[3px] border-black font-black uppercase text-sm tracking-widest shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
            >
              <Sparkles className="w-5 h-5" strokeWidth={3} />
              Launch AI Strategist
            </Link>
          </div>
        ) : (
          <div className="space-y-5">

            {/* ── ANALYTICS DASHBOARD ── */}
            <CampaignAnalytics campaigns={campaigns} />

            {/* ── AI RECOMMENDATIONS ── */}
            <CampaignRecommendations campaigns={campaigns} />

            {/* ── FILTERS & SEARCH BAR ── */}
            <motion.div
              variants={slideUp}
              className="bg-white border-[3px] border-black rounded-2xl p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
            >
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/40 group-focus-within:text-black transition-colors" strokeWidth={3} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search campaigns..."
                    className="w-full pl-12 pr-4 py-3.5 bg-black/[0.03] border-[3px] border-black/10 rounded-xl text-sm font-black placeholder:text-black/30 focus:border-black focus:bg-white focus:ring-0 outline-none transition-all"
                  />
                </div>

                {/* Status Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 lg:pb-0">
                  <div className="flex items-center gap-2">
                    {STATUS_FILTERS.map(f => (
                      <button
                        key={f.value}
                        onClick={() => setStatusFilter(f.value)}
                        className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl border-[3px] text-xs font-black uppercase tracking-widest transition-all shrink-0 shadow-[4px_4px_0_0_rgba(0,0,0,1)] ${statusFilter === f.value
                          ? 'bg-black text-white border-black -translate-y-0.5'
                          : 'bg-white text-black border-black hover:bg-gray-50 hover:-translate-y-0.5'
                          }`}
                      >
                        {f.value !== 'all' && (
                          <span className={`w-3 h-3 rounded-full border-2 border-black ${f.color}`} />
                        )}
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort Dropdown */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setSortOpen(!sortOpen)}
                    className="w-full lg:w-auto inline-flex items-center justify-between lg:justify-start gap-3 px-5 py-3.5 bg-white border-[3px] border-black rounded-xl text-xs font-black uppercase tracking-wider hover:bg-black/5 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                  >
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-4 h-4 text-black" strokeWidth={3} />
                      {SORT_OPTIONS.find(o => o.value === sortOption)?.label || 'Sort'}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-black transition-transform ${sortOpen ? 'rotate-180' : '--'}`} strokeWidth={3} />
                  </button>
                  <AnimatePresence>
                    {sortOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 top-full mt-3 bg-white border-[3px] border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-20 py-2 min-w-[200px]"
                        >
                          {SORT_OPTIONS.map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => { setSortOption(opt.value); setSortOpen(false) }}
                              className={`w-full text-left px-5 py-3 text-xs font-black uppercase tracking-wider transition-colors ${sortOption === opt.value
                                ? 'bg-[#B4F056] text-black'
                                : 'text-black/60 hover:bg-black/5'
                                }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>

            {/* ── RESULTS COUNT ── */}
            <div className="flex items-center justify-between px-1">
              <p className="text-[11px] font-bold text-black/40 uppercase tracking-wider">
                {filteredCampaigns.length} campaign{filteredCampaigns.length !== 1 ? 's' : ''}
                {statusFilter !== 'all' && ` - ${statusFilter}`}
              </p>
            </div>

            {/* ── CAMPAIGN GRID ── */}
            {filteredCampaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 bg-white border border-black/8 rounded-2xl">
                <p className="text-black/40 font-medium text-sm">No campaigns match your filters</p>
                <button
                  type="button"
                  onClick={() => { setStatusFilter('all'); setSearchQuery('') }}
                  className="mt-3 text-xs font-bold text-black/50 underline hover:text-black transition-colors"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              >
                {filteredCampaigns.map((campaign) => {
                  const created = campaign.created_at
                  const strategy = campaign.strategy as Record<string, unknown> | null
                  const ctr = (campaign.impressions ?? 0) > 0
                    ? ((campaign.clicks ?? 0) / (campaign.impressions ?? 1)) * 100
                    : 0

                  return (
                    <motion.div key={campaign.id} variants={staggerItem}>
                      <Link
                        href={`/brand/campaigns/${campaign.id}`}
                        className={`group border-[3px] border-black rounded-[32px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all flex flex-col h-full overflow-hidden relative card-pattern ${STATUS_CARD_COLORS[campaign.status] || 'bg-white'}`}
                      >
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 w-20 h-20 bg-black/[0.03] -translate-y-10 translate-x-10 rotate-45 pointer-events-none" />

                        {/* Card Header */}
                        <div className="p-6 pb-4 flex-1">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <h3 className="text-lg font-black text-black leading-tight group-hover:text-black/80 transition-colors">
                              {campaign.title}
                            </h3>
                            <span
                              className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border-2 border-black shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${STATUS_BADGE_COLORS[campaign.status] || 'bg-gray-100 text-black/50'
                                }`}
                            >
                              {campaign.status}
                            </span>
                          </div>

                          {campaign.goal && (
                            <p className="text-[10px] font-black text-black/50 uppercase tracking-widest mb-3 bg-black/5 inline-block px-2 py-0.5 rounded-md">
                              {GOAL_LABELS[campaign.goal] || campaign.goal}
                            </p>
                          )}

                          {campaign.brief && (
                            <p className="text-sm text-black/70 font-bold mb-4 line-clamp-2 leading-relaxed">
                              {campaign.brief}
                            </p>
                          )}

                          {/* Strategy tags */}
                          {(() => {
                            const angles = strategy?.content_angles
                            if (!angles || !Array.isArray(angles)) return null
                            return (
                              <div className="flex flex-wrap gap-2 mb-4">
                                {(angles as (string | { angle?: string })[]).slice(0, 2).map((angle, i) => (
                                  <span
                                    key={i}
                                    className="text-[10px] font-black uppercase tracking-wider bg-black/5 border-2 border-black/10 px-2 py-1 rounded-lg"
                                  >
                                    {typeof angle === 'string' ? angle : angle?.angle ?? ''}
                                  </span>
                                ))}
                                {(angles as unknown[]).length > 2 && (
                                  <span className="text-[10px] font-black text-black/30 px-1 py-1">
                                    +{(angles as unknown[]).length - 2} more
                                  </span>
                                )}
                              </div>
                            )
                          })()}
                        </div>

                        {/* Metrics Bar */}
                        {((campaign.impressions ?? 0) > 0 || (campaign.spend ?? 0) > 0) && (
                          <div className="px-6 pb-4">
                            <div className="grid grid-cols-3 gap-4 py-4 border-t-2 border-black/10 relative z-10">
                              <div>
                                <p className="text-[10px] font-black text-black/60 uppercase tracking-widest mb-1">Impact</p>
                                <p className="text-base font-black tabular-nums">{(campaign.impressions ?? 0).toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-black/60 uppercase tracking-widest mb-1">Efficiency</p>
                                <p className="text-base font-black tabular-nums flex items-center gap-1.5">
                                  {ctr.toFixed(1)}%
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-black/60 uppercase tracking-widest mb-1">Spend</p>
                                <p className="text-base font-black tabular-nums">₹{(campaign.spend ?? 0).toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Footer */}
                        <div className="px-6 py-3 bg-black/5 border-t-2 border-black/10 flex items-center justify-between">
                          <p className="text-[10px] text-black/40 font-black uppercase tracking-widest">
                            {created
                              ? new Date(created).toLocaleDateString('en-IN', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                              : '--'}
                          </p>
                          <div className="w-5 h-5 rounded-full border-2 border-black flex items-center justify-center bg-white group-hover:bg-[#B4F056] transition-colors">
                            <ChevronDown className="w-3 h-3 text-black -rotate-90" strokeWidth={4} />
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}
          </div>
        )}

      </div>

      {/* CSS */}
      <style jsx global>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-slideUp {
          animation: slideUp 0.35s ease-out both;
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out both;
        }
        .card-pattern {
          background-image: radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.05) 1px, transparent 0);
          background-size: 12px 12px;
        }
      `}</style>
    </motion.div>
  )
}
