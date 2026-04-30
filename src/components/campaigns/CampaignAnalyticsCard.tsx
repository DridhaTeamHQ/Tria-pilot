'use client'

/**
 * CAMPAIGN ANALYTICS CARD
 *
 * Drop-in dashboard for the brand's campaign detail page. Pulls from
 * /api/brand/campaigns/[id]/analytics and renders:
 *   - Hero metrics: spend, impressions, clicks, conversions, CTR, CVR, CPC, CPA
 *   - Roster summary: invited / accepted / pending / declined
 *   - 30-day click sparkline
 *   - Top tracked links by clicks
 */

import { useEffect, useState } from 'react'
import {
  Loader2,
  TrendingUp,
  Users,
  IndianRupee,
  MousePointer,
  Target,
  BarChart3,
  CheckCircle2,
  Clock,
  XCircle,
  type LucideIcon,
} from 'lucide-react'

interface AnalyticsData {
  campaign: { id: string; title: string; status: string }
  metrics: {
    spend: number
    impressions: number
    clicks: number
    conversions: number
    ctr: number
    cvr: number
    cpc: number
    cpa: number
    dailyBudget: number
    totalBudget: number
  }
  roster: {
    counts: { total: number; pending: number; accepted: number; declined: number }
    creators: Array<{
      invitationId: string
      status: string
      creator: { id: string; name: string; avatarUrl: string | null; followers: number | null; niches: string[]; badgeTier: string | null } | null
    }>
  }
  links: {
    totalClicks: number
    top: Array<{ id: string; productName: string; clicks: number }>
    series: Array<{ date: string; count: number }>
  }
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}K`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return new Intl.NumberFormat('en-IN').format(n)
}

function formatINR(n: number): string {
  return `₹${new Intl.NumberFormat('en-IN').format(Math.round(n))}`
}

export default function CampaignAnalyticsCard({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/brand/campaigns/${campaignId}/analytics`, {
          credentials: 'include',
        })
        if (!res.ok) {
          const e = await res.json().catch(() => ({}))
          throw new Error(e.error || `Failed (${res.status})`)
        }
        const payload = await res.json()
        if (!cancelled) setData(payload)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load analytics')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [campaignId])

  if (loading) {
    return (
      <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-black/30" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6">
        <p className="text-sm font-bold text-black/50">{error || 'No analytics available yet'}</p>
      </div>
    )
  }

  const { metrics, roster, links } = data
  const maxSeriesValue = Math.max(...links.series.map((s) => s.count), 1)

  return (
    <div className="space-y-4">
      {/* Hero metrics — 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          icon={IndianRupee}
          label="Spend"
          value={formatINR(metrics.spend)}
          subValue={metrics.totalBudget > 0 ? `of ${formatINR(metrics.totalBudget)} budget` : undefined}
          tone="orange"
        />
        <MetricCard
          icon={TrendingUp}
          label="Impressions"
          value={formatNum(metrics.impressions)}
          subValue={metrics.ctr > 0 ? `${metrics.ctr}% CTR` : undefined}
          tone="purple"
        />
        <MetricCard
          icon={MousePointer}
          label="Clicks"
          value={formatNum(metrics.clicks)}
          subValue={metrics.cpc > 0 ? `${formatINR(metrics.cpc)} CPC` : undefined}
          tone="green"
        />
        <MetricCard
          icon={Target}
          label="Conversions"
          value={formatNum(metrics.conversions)}
          subValue={metrics.cpa > 0 ? `${formatINR(metrics.cpa)} CPA` : metrics.cvr > 0 ? `${metrics.cvr}% CVR` : undefined}
          tone="yellow"
        />
      </div>

      {/* Click sparkline */}
      <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" strokeWidth={3} />
            <h3 className="text-xs font-black uppercase tracking-widest">Last 30 Days — Link Clicks</h3>
          </div>
          <span className="text-xs font-black bg-black text-white px-2 py-1 rounded">
            {formatNum(links.totalClicks)} total
          </span>
        </div>
        {links.totalClicks === 0 ? (
          <p className="text-sm text-black/40 font-semibold py-6 text-center">
            No clicks tracked yet. Once creators share their tracked links, traffic will appear here.
          </p>
        ) : (
          <div className="flex items-end gap-1 h-24">
            {links.series.map((b) => {
              const heightPct = (b.count / maxSeriesValue) * 100
              return (
                <div
                  key={b.date}
                  className="flex-1 bg-[#B4F056] border border-black hover:bg-[#a3e04a] transition-colors group relative"
                  style={{ height: `${Math.max(heightPct, 2)}%` }}
                  title={`${b.date}: ${b.count} click${b.count === 1 ? '' : 's'}`}
                >
                  {b.count > 0 && (
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap pointer-events-none">
                      {b.count}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Roster + Top links — 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Roster */}
        <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" strokeWidth={3} />
              <h3 className="text-xs font-black uppercase tracking-widest">Creator Roster</h3>
            </div>
            <span className="text-xs font-black bg-black text-white px-2 py-1 rounded">
              {roster.counts.total} invited
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <RosterStat icon={CheckCircle2} count={roster.counts.accepted} label="Accepted" tone="green" />
            <RosterStat icon={Clock} count={roster.counts.pending} label="Pending" tone="yellow" />
            <RosterStat icon={XCircle} count={roster.counts.declined} label="Declined" tone="red" />
          </div>

          {roster.creators.length === 0 ? (
            <p className="text-xs text-black/40 font-semibold text-center py-4">
              No creators invited yet. Use the campaign chat to find and invite creators.
            </p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {roster.creators.slice(0, 8).map((r) => (
                <li key={r.invitationId} className="flex items-center gap-2 text-xs">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[#B4F056] to-[#FFD93D] border-2 border-black flex items-center justify-center font-black">
                    {r.creator?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{r.creator?.name || 'Creator'}</p>
                    <p className="text-[10px] text-black/40 font-semibold">
                      {r.creator?.followers ? `${formatNum(r.creator.followers)} followers` : '—'}
                    </p>
                  </div>
                  <StatusPill status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top links */}
        <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MousePointer className="w-4 h-4" strokeWidth={3} />
              <h3 className="text-xs font-black uppercase tracking-widest">Top Tracked Links</h3>
            </div>
          </div>
          {links.top.length === 0 ? (
            <p className="text-xs text-black/40 font-semibold text-center py-4">
              No tracked links for your products yet.
            </p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {links.top.slice(0, 8).map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold truncate flex-1">{l.productName}</span>
                  <span className="font-black bg-[#B4F056]/30 border border-black px-2 py-0.5 rounded text-[10px]">
                    {formatNum(l.clicks)} clicks
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  subValue,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: string
  subValue?: string
  tone: 'orange' | 'purple' | 'green' | 'yellow'
}) {
  const bg =
    tone === 'orange' ? 'bg-[#FF8C69]' : tone === 'purple' ? 'bg-[#A78BFA]' : tone === 'green' ? 'bg-[#B4F056]' : 'bg-[#FFD93D]'
  return (
    <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
      <div className={`inline-flex w-9 h-9 items-center justify-center border-2 border-black ${bg} mb-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
        <Icon className="w-4 h-4" strokeWidth={3} />
      </div>
      <div className="text-2xl font-black break-words">{value}</div>
      <div className="text-[10px] font-black uppercase tracking-widest text-black/50 mt-0.5">{label}</div>
      {subValue && <div className="text-[10px] font-bold text-black/40 mt-1">{subValue}</div>}
    </div>
  )
}

function RosterStat({
  icon: Icon,
  count,
  label,
  tone,
}: {
  icon: LucideIcon
  count: number
  label: string
  tone: 'green' | 'yellow' | 'red'
}) {
  const bg = tone === 'green' ? 'bg-[#B4F056]' : tone === 'yellow' ? 'bg-[#FFD93D]' : 'bg-[#FF8C69]'
  return (
    <div className={`text-center p-2 border-2 border-black ${bg}`}>
      <Icon className="w-3 h-3 mx-auto mb-1" strokeWidth={3} />
      <div className="text-xl font-black">{count}</div>
      <div className="text-[9px] font-black uppercase tracking-widest">{label}</div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase()
  const cls =
    s === 'accepted'
      ? 'bg-[#B4F056]/40 text-black'
      : s === 'declined'
        ? 'bg-[#FF8C69]/30 text-black'
        : 'bg-[#FFD93D]/40 text-black'
  return (
    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border border-black rounded ${cls}`}>
      {s}
    </span>
  )
}
