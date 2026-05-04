/**
 * /brand/campaigns/[id]/roster — Creator roster for a single campaign
 *
 * Shows every creator invited to this campaign with status, profile snapshot,
 * and inline actions (message, view profile). Closes the loop on the campaign
 * invite flow — invites no longer feel like they vanish.
 */
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  MessageCircle,
  ExternalLink,
  Loader2,
  Sparkles,
  Award,
  IndianRupee,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import { AppImage } from '@/components/ui/AppImage'
import { toast } from '@/lib/simple-sonner'

interface RosterEntry {
  invitationId: string
  status: string
  message: string
  invitedAt: string
  respondedAt: string
  creator: {
    id: string
    name: string
    email: string | null
    avatarUrl: string | null
    followers: number | null
    engagementRate: number | null
    niches: string[]
    badgeTier: string | null
    pricePerPost: number | null
  } | null
}

interface RosterData {
  campaign: { id: string; title: string; status: string }
  roster: RosterEntry[]
  counts: { total: number; pending: number; accepted: number; declined: number }
  isExplicitlyLinked: boolean
}

type FilterKey = 'all' | 'pending' | 'accepted' | 'declined'

function formatFollowers(n: number | null): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

function statusStyle(status: string) {
  const s = status.toLowerCase()
  if (s === 'accepted')
    return { bg: 'bg-[#B4F056]', icon: CheckCircle2, label: 'Accepted' }
  if (s === 'declined')
    return { bg: 'bg-[#FF8C69]', icon: XCircle, label: 'Declined' }
  return { bg: 'bg-[#FFD93D]', icon: Clock, label: 'Pending' }
}

function badgeColor(tier: string | null | undefined): string {
  const t = (tier || '').toLowerCase()
  if (t === 'platinum') return 'bg-gradient-to-br from-[#E5E4E2] to-[#A8A8A8]'
  if (t === 'gold') return 'bg-gradient-to-br from-[#FFD700] to-[#DAA520]'
  if (t === 'silver') return 'bg-gradient-to-br from-[#C0C0C0] to-[#808080]'
  if (t === 'bronze') return 'bg-gradient-to-br from-[#CD7F32] to-[#8B4513]'
  return ''
}

export default function CampaignRosterPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const campaignId = params?.id

  const [data, setData] = useState<RosterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterKey>('all')

  useEffect(() => {
    if (!campaignId) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`/api/brand/campaigns/${campaignId}/roster`, {
          credentials: 'include',
        })
        if (!res.ok) {
          const e = await res.json().catch(() => ({}))
          throw new Error(e.error || `Failed (${res.status})`)
        }
        const payload = await res.json()
        if (!cancelled) setData(payload)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load roster')
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
      <div className="min-h-screen bg-[#FFFCF5] pt-24 pb-16 px-4 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#FFFCF5] pt-24 pb-16 px-4 max-w-3xl mx-auto text-center">
        <h1 className="text-2xl font-black mb-3">Roster not found</h1>
        <Link
          href="/brand/campaigns"
          className="inline-flex items-center gap-2 px-5 py-3 bg-[#B4F056] border-[3px] border-black font-black text-sm uppercase shadow-[3px_3px_0_0_rgba(0,0,0,1)]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </div>
    )
  }

  const { campaign, roster, counts, isExplicitlyLinked } = data
  const filtered =
    filter === 'all'
      ? roster
      : roster.filter((r) => r.status.toLowerCase() === filter)

  return (
    <div className="min-h-screen bg-[#FFFCF5] pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <Link
          href={`/brand/campaigns/${campaign.id}`}
          className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-wider text-black/60 hover:text-black mb-6"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={3} />
          Back to campaign
        </Link>

        {/* Header */}
        <div className="bg-white border-[3px] border-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">
                Campaign roster
              </p>
              <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
                <Users className="w-7 h-7" strokeWidth={3} />
                {campaign.title}
              </h1>
              <p className="text-sm text-black/55 mt-1.5 font-semibold">
                {counts.total} creator{counts.total === 1 ? '' : 's'} invited
                {counts.accepted > 0 && ` · ${counts.accepted} accepted`}
                {!isExplicitlyLinked && roster.length > 0 && (
                  <span className="text-[#A78BFA]"> · showing recent invites near campaign start</span>
                )}
              </p>
            </div>

            <Link
              href={`/brand/influencers`}
              className="inline-flex items-center gap-2 px-5 py-3 bg-[#B4F056] border-[3px] border-black font-black text-sm uppercase shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all"
            >
              <Sparkles className="w-4 h-4" strokeWidth={3} />
              Invite more creators
            </Link>
          </div>
        </div>

        {/* Status counts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <CountCard
            icon={Users}
            label="Total"
            value={counts.total}
            tone="black"
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          />
          <CountCard
            icon={CheckCircle2}
            label="Accepted"
            value={counts.accepted}
            tone="green"
            active={filter === 'accepted'}
            onClick={() => setFilter('accepted')}
          />
          <CountCard
            icon={Clock}
            label="Pending"
            value={counts.pending}
            tone="yellow"
            active={filter === 'pending'}
            onClick={() => setFilter('pending')}
          />
          <CountCard
            icon={XCircle}
            label="Declined"
            value={counts.declined}
            tone="orange"
            active={filter === 'declined'}
            onClick={() => setFilter('declined')}
          />
        </div>

        {/* Roster list */}
        {filtered.length === 0 ? (
          <div className="bg-white border-[3px] border-dashed border-black/25 p-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-3 text-black/20" />
            <h3 className="text-lg font-black text-black/60 mb-1">
              {roster.length === 0 ? 'No creators invited yet' : `No ${filter} invitations`}
            </h3>
            <p className="text-sm text-black/40 font-semibold mb-5">
              {roster.length === 0
                ? 'Invite creators from the campaign chat or the discover page.'
                : 'Try a different filter above.'}
            </p>
            {roster.length === 0 && (
              <Link
                href="/brand/influencers"
                className="inline-flex items-center gap-2 px-5 py-3 bg-[#B4F056] border-[3px] border-black font-black text-sm uppercase shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all"
              >
                <Sparkles className="w-4 h-4" strokeWidth={3} />
                Discover creators
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((entry) => {
              const statusInfo = statusStyle(entry.status)
              const StatusIcon = statusInfo.icon
              const c = entry.creator
              return (
                <div
                  key={entry.invitationId}
                  className="group bg-white border-[3px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all p-4 flex flex-col sm:flex-row gap-4"
                >
                  {/* Avatar + name */}
                  <div className="flex items-start gap-3 sm:w-72 shrink-0">
                    <div className="relative w-12 h-12 bg-gradient-to-br from-[#B4F056] to-[#FFD93D] border-2 border-black flex items-center justify-center shrink-0">
                      {c?.avatarUrl ? (
                        <AppImage
                          src={c.avatarUrl}
                          alt={c.name}
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <span className="font-black">{c?.name?.charAt(0)?.toUpperCase() || '?'}</span>
                      )}
                      {c?.badgeTier && (
                        <div
                          className={`absolute -bottom-1 -right-1 w-4 h-4 ${badgeColor(
                            c.badgeTier,
                          )} border-2 border-black flex items-center justify-center rounded-full`}
                          title={c.badgeTier}
                        >
                          <Award className="w-2 h-2" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-black truncate">{c?.name || 'Creator'}</h3>
                      {c?.email && (
                        <p className="text-[11px] text-black/45 truncate font-semibold">{c.email}</p>
                      )}
                      {c?.niches?.length ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {c.niches.slice(0, 2).map((n) => (
                            <span
                              key={n}
                              className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-black/5 border border-black"
                            >
                              {n}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-1.5 sm:flex-1 sm:max-w-md">
                    <MiniStat label="Followers" value={formatFollowers(c?.followers ?? null)} />
                    <MiniStat
                      icon={TrendingUp}
                      label="Eng."
                      value={c?.engagementRate ? `${c.engagementRate}%` : '—'}
                    />
                    <MiniStat
                      icon={IndianRupee}
                      label="Price"
                      value={c?.pricePerPost ? `₹${formatFollowers(c.pricePerPost)}` : '—'}
                    />
                  </div>

                  {/* Status + actions */}
                  <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:w-48 sm:justify-between">
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${statusInfo.bg} border-2 border-black text-[10px] font-black uppercase tracking-widest`}
                    >
                      <StatusIcon className="w-3 h-3" strokeWidth={3} />
                      {statusInfo.label}
                    </div>
                    <div className="flex gap-1.5">
                      {c && (
                        <button
                          type="button"
                          onClick={() => router.push(`/brand/influencers/${c.id}`)}
                          className="p-2 border-2 border-black hover:bg-black/5 transition-colors"
                          title="View profile"
                        >
                          <ExternalLink className="w-3.5 h-3.5" strokeWidth={3} />
                        </button>
                      )}
                      {c && (
                        <button
                          type="button"
                          onClick={() => router.push(`/brand/inbox?to=${c.id}`)}
                          className="p-2 bg-[#B4F056] border-2 border-black hover:-translate-y-0.5 transition-all shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                          title="Message"
                        >
                          <MessageCircle className="w-3.5 h-3.5" strokeWidth={3} />
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-black/40 font-bold uppercase tracking-wider hidden sm:block">
                      {timeAgo(entry.invitedAt)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function CountCard({
  icon: Icon,
  label,
  value,
  tone,
  active,
  onClick,
}: {
  icon: LucideIcon
  label: string
  value: number
  tone: 'black' | 'green' | 'yellow' | 'orange'
  active: boolean
  onClick: () => void
}) {
  const bg =
    tone === 'green'
      ? 'bg-[#B4F056]'
      : tone === 'yellow'
        ? 'bg-[#FFD93D]'
        : tone === 'orange'
          ? 'bg-[#FF8C69]'
          : 'bg-white'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-4 border-[3px] border-black transition-all ${
        active ? `${bg} shadow-[4px_4px_0_0_rgba(0,0,0,1)]` : 'bg-white hover:bg-black/5 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5'
      }`}
    >
      <Icon className="w-4 h-4 mb-2" strokeWidth={3} />
      <div className="text-2xl font-black">{value}</div>
      <div className="text-[10px] font-black uppercase tracking-widest text-black/55">{label}</div>
    </button>
  )
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon?: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="text-center bg-black/[0.03] border border-black p-2">
      <div className="flex items-center justify-center gap-0.5 text-[8px] font-black uppercase tracking-widest text-black/45 mb-0.5">
        {Icon && <Icon className="w-2.5 h-2.5" strokeWidth={3} />}
        {label}
      </div>
      <div className="text-sm font-black truncate">{value}</div>
    </div>
  )
}
