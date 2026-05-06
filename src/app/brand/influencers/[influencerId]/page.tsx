/**
 * INFLUENCER DETAIL PAGE — Brand view
 *
 * Premium creator profile with:
 *  - Sticky action bar (message, shortlist, invite to campaign)
 *  - Live online indicator via Supabase Realtime presence
 *  - Tabbed sections: Overview · Try-Ons · Pricing · Collab History
 *  - Pricing breakdown by content type (post, reel, story, carousel, UGC)
 *  - Past collaboration stats with this brand (response rate, avg response)
 *  - Try-on portfolio with lightbox + counts
 *  - Shortlist persisted via localStorage (shared with /brand/influencers)
 */
'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Mail,
  Instagram,
  MessageCircle,
  Youtube,
  Globe,
  Sparkles,
  Award,
  TrendingUp,
  Users,
  IndianRupee,
  ImageOff,
  Bookmark,
  BookmarkCheck,
  Clock,
  CheckCircle2,
  Send,
  Calendar,
  Zap,
  Target,
  Image as ImageIcon,
  type LucideIcon,
} from 'lucide-react'
import { BrutalLoader } from '@/components/ui/BrutalLoader'
import { AppImage } from '@/components/ui/AppImage'
import { toast } from '@/lib/simple-sonner'
import { useUserPresence } from '@/lib/hooks/useUserPresence'
import { useUser } from '@/lib/react-query/hooks'

interface ProfileData {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  bio: string | null
  niches: string[]
  preferredCategories: string[]
  followers: number
  engagementRate: number
  audienceRate: number | null
  retentionRate: number | null
  badgeTier: string | null
  badgeScore: number | null
  gender: string | null
  audienceType: string | null
  age: number | null
  pricePerPost: number | null
  pricingBreakdown: {
    post: number
    reel: number
    story: number
    carousel: number
    ugc: number
  } | null
  joinedAt: string | null
  socials: {
    instagram: string | null
    youtube: string | null
    tiktok: string | null
    twitter: string | null
    website: string | null
  }
}

interface TryOnItem {
  jobId: string
  outputIndex: number
  imageUrl: string
  label?: string
  createdAt: string
}

interface ProfilePayload {
  profile: ProfileData
  tryOns: TryOnItem[]
  stats: { totalTryOns: number; recentTryOnsCount: number }
  activity: { lastActiveAt: string | null; isLikelyActive: boolean }
  collaboration: {
    total: number
    accepted: number
    pending: number
    declined: number
    responseRate: number | null
    avgResponseHours: number | null
    existingConversationId: string | null
    recentInteraction: string | null
  }
}

interface BrandCampaign {
  id: string
  title: string
  status: string
}

const SHORTLIST_KEY = 'kiwikoo:brand-shortlist:v1'

type TabKey = 'overview' | 'tryons' | 'pricing' | 'history'

function formatFollowers(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n || 0)
}

function badgeColor(tier: string | null): string {
  const t = (tier || '').toLowerCase()
  if (t === 'platinum') return 'bg-gradient-to-br from-[#E5E4E2] to-[#A8A8A8]'
  if (t === 'gold') return 'bg-gradient-to-br from-[#FFD700] to-[#DAA520]'
  if (t === 'silver') return 'bg-gradient-to-br from-[#C0C0C0] to-[#808080]'
  if (t === 'bronze') return 'bg-gradient-to-br from-[#CD7F32] to-[#8B4513]'
  return 'bg-[#B4F056]'
}

function lastActiveLabel(iso: string | null, isOnline: boolean): string {
  if (isOnline) return 'Online now'
  if (!iso) return 'Last seen recently'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'Active now'
  if (m < 60) return `Active ${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `Active ${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `Active ${d}d ago`
  return `Active ${Math.floor(d / 30)}mo ago`
}

export default function InfluencerDetailPage({
  params,
}: {
  params: Promise<{ influencerId: string }>
}) {
  const router = useRouter()
  const { data: user } = useUser()
  const [data, setData] = useState<ProfilePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [shortlist, setShortlist] = useState<Set<string>>(new Set())
  const [shortlistHydrated, setShortlistHydrated] = useState(false)
  const [campaigns, setCampaigns] = useState<BrandCampaign[]>([])
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviting, setInviting] = useState(false)

  const targetId = data?.profile.id || null
  const viewerId = (user as { id?: string } | undefined)?.id || null
  const { isOnline } = useUserPresence({ targetUserId: targetId, viewerUserId: viewerId })

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
    setShortlistHydrated(true)
  }, [])

  // Persist shortlist
  useEffect(() => {
    if (!shortlistHydrated) return
    try {
      window.localStorage.setItem(SHORTLIST_KEY, JSON.stringify([...shortlist]))
    } catch {
      /* ignore */
    }
  }, [shortlist, shortlistHydrated])

  // Load profile
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { influencerId } = await params
        if (cancelled) return
        const res = await fetch(`/api/brand/influencers/${influencerId}/profile`, {
          credentials: 'include',
        })
        if (!res.ok) throw new Error('Failed to load profile')
        const payload = await res.json()
        if (cancelled) return
        setData(payload)
      } catch (err) {
        console.error(err)
        toast.error('Failed to load creator profile')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [params])

  // Load brand's campaigns for the invite dropdown
  useEffect(() => {
    if (!data) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/campaigns', { credentials: 'include' })
        if (!res.ok) return
        const payload = await res.json()
        const list: BrandCampaign[] = Array.isArray(payload?.campaigns)
          ? payload.campaigns
          : Array.isArray(payload)
            ? payload
            : []
        if (cancelled) return
        setCampaigns(
          list
            .map((c) => ({ id: c.id, title: c.title || 'Untitled', status: c.status || 'draft' }))
            .filter((c) => c.id),
        )
      } catch {
        /* silent */
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [data])

  const handleMessage = useCallback(() => {
    if (!data) return
    const existing = data.collaboration.existingConversationId
    if (existing) {
      router.push(`/brand/inbox?thread=${existing}`)
    } else {
      router.push(`/brand/inbox?to=${data.profile.id}`)
    }
  }, [data, router])

  const isShortlisted = data && shortlist.has(data.profile.id)
  const handleToggleShortlist = useCallback(() => {
    if (!data) return
    setShortlist((prev) => {
      const next = new Set(prev)
      if (next.has(data.profile.id)) {
        next.delete(data.profile.id)
        toast.success('Removed from shortlist')
      } else {
        next.add(data.profile.id)
        toast.success('Added to shortlist')
      }
      return next
    })
  }, [data])

  const inviteToCampaign = useCallback(
    async (campaignId: string | null) => {
      if (!data || inviting) return
      setInviting(true)
      try {
        const res = await fetch('/api/collaborations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            influencerId: data.profile.id,
            campaignId: campaignId || undefined,
            notes: campaignId
              ? 'Invitation to join this campaign'
              : 'Invitation to collaborate',
          }),
        })
        if (!res.ok) {
          const e = await res.json().catch(() => ({}))
          throw new Error(e.error || 'Invite failed')
        }
        toast.success(
          campaignId
            ? 'Invite sent — creator will see it in their dashboard'
            : 'Collaboration invite sent',
        )
        setInviteOpen(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to send invite')
      } finally {
        setInviting(false)
      }
    },
    [data, inviting],
  )

  const memberSinceLabel = useMemo(() => {
    if (!data?.profile.joinedAt) return null
    const d = new Date(data.profile.joinedAt)
    return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
  }, [data?.profile.joinedAt])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFCF5] flex items-center justify-center">
        <BrutalLoader size="lg" tone="brand" label="Loading profile" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#FFFCF5] pt-24 px-6">
        <div className="max-w-4xl mx-auto text-center py-20">
          <h1 className="text-2xl font-black mb-4">Creator Not Found</h1>
          <p className="text-black/60 mb-6">
            This creator profile doesn&apos;t exist or hasn&apos;t been approved yet.
          </p>
          <Link
            href="/brand/influencers"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#B4F056] border-[3px] border-black font-black text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Creators
          </Link>
        </div>
      </div>
    )
  }

  const { profile, tryOns, stats, activity, collaboration } = data
  const initials = (profile.name || '?').charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-[#FFFCF5] pt-20 pb-16 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Sticky action bar (appears on scroll) */}
        <div className="sticky top-16 z-30 -mx-4 sm:-mx-6 mb-4 px-4 sm:px-6 py-2 bg-[#FFFCF5]/90 backdrop-blur-md border-b-2 border-black/10 flex items-center justify-between gap-3 page-fade">
          <Link
            href="/brand/influencers"
            className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-black/60 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={3} />
            Back
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleShortlist}
              className={`inline-flex items-center gap-1.5 px-3 py-2 border-2 border-black text-[11px] font-black uppercase tracking-wider transition-all ${
                isShortlisted
                  ? 'bg-[#FFD93D] shadow-[2px_2px_0_0_rgba(0,0,0,1)]'
                  : 'bg-white hover:bg-[#FFD93D]/30 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]'
              }`}
            >
              {isShortlisted ? (
                <>
                  <BookmarkCheck className="w-3.5 h-3.5" strokeWidth={3} />
                  Saved
                </>
              ) : (
                <>
                  <Bookmark className="w-3.5 h-3.5" strokeWidth={2.5} />
                  Save
                </>
              )}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setInviteOpen((v) => !v)}
                disabled={inviting}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#A78BFA] border-2 border-black text-[11px] font-black uppercase tracking-wider shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" strokeWidth={3} />
                {inviting ? 'Inviting…' : 'Invite'}
              </button>
              {inviteOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-72 bg-white border-[3px] border-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] z-40 animate-fadeIn"
                  onMouseLeave={() => setInviteOpen(false)}
                >
                  <div className="px-3 py-2 border-b-2 border-black bg-[#F9F8F4]">
                    <p className="text-[10px] font-black uppercase tracking-widest">
                      Invite to a campaign
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => inviteToCampaign(null)}
                    className="w-full px-3 py-2.5 text-left text-xs font-bold hover:bg-[#FFD93D]/20 border-b border-black/10"
                  >
                    Send a general invite (no campaign)
                  </button>
                  {campaigns.length === 0 ? (
                    <div className="px-3 py-3 text-[11px] text-black/40 font-semibold">
                      No campaigns yet.{' '}
                      <Link href="/brand/campaigns/new" className="text-[#A78BFA] underline">
                        Create one
                      </Link>
                    </div>
                  ) : (
                    <ul className="max-h-48 overflow-y-auto">
                      {campaigns.slice(0, 12).map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => inviteToCampaign(c.id)}
                            className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-[#B4F056]/30 flex items-center justify-between gap-2"
                          >
                            <span className="truncate flex items-center gap-1.5">
                              <Target className="w-3 h-3 flex-shrink-0" strokeWidth={3} />
                              {c.title}
                            </span>
                            <span className="text-[9px] font-black uppercase bg-black/5 px-1.5 py-0.5 rounded">
                              {c.status}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleMessage}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#B4F056] border-2 border-black text-[11px] font-black uppercase tracking-wider shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition-all"
            >
              <MessageCircle className="w-3.5 h-3.5" strokeWidth={3} />
              Message
            </button>
          </div>
        </div>

        {/* HERO CARD */}
        <div className="bg-white border-[3px] border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] overflow-hidden mb-6 page-fade">
          <div className="absolute inset-x-0 h-2 bg-gradient-to-r from-[#B4F056] via-[#A78BFA] to-[#FFD93D] relative" />
          <div className="p-6 sm:p-8 flex flex-col md:flex-row gap-6 md:gap-8">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="w-32 h-32 sm:w-40 sm:h-40 border-[3px] border-black overflow-hidden bg-gradient-to-br from-[#B4F056] to-[#FFD93D] shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                  {profile.avatarUrl ? (
                    <AppImage
                      src={profile.avatarUrl}
                      alt={profile.name}
                      width={160}
                      height={160}
                      className="w-full h-full object-cover"
                      sizes="160px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl font-black">
                      {initials}
                    </div>
                  )}
                </div>
                {profile.badgeTier && (
                  <div
                    className={`absolute -bottom-3 -right-3 px-2 py-1 ${badgeColor(profile.badgeTier)} border-[3px] border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] flex items-center gap-1`}
                    title={`${profile.badgeTier} tier creator`}
                  >
                    <Award className="w-3 h-3" strokeWidth={3} />
                    <span className="text-[10px] font-black uppercase tracking-wider">
                      {profile.badgeTier}
                    </span>
                  </div>
                )}
                {/* Online dot */}
                <div
                  className={`absolute top-2 right-2 w-4 h-4 rounded-full border-2 border-white shadow ${
                    isOnline ? 'bg-[#16a34a] animate-pulse' : 'bg-black/20'
                  }`}
                  title={isOnline ? 'Online now' : 'Offline'}
                />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-3xl sm:text-4xl font-black break-words">{profile.name}</h1>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 border-2 border-black text-[10px] font-black uppercase tracking-wider ${
                    isOnline ? 'bg-[#16a34a]/15 text-black' : 'bg-black/5 text-black/55'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isOnline ? 'bg-[#16a34a] animate-pulse' : 'bg-black/30'
                    }`}
                  />
                  {lastActiveLabel(activity.lastActiveAt, isOnline)}
                </span>
              </div>

              {profile.niches.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {profile.niches.map((n) => (
                    <span
                      key={n}
                      className="inline-block px-2.5 py-1 bg-[#B4F056] border-2 border-black text-[10px] font-black uppercase tracking-wider"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              )}

              {profile.bio && (
                <p className="text-sm sm:text-base text-black/75 leading-relaxed mb-4 max-w-2xl">
                  {profile.bio}
                </p>
              )}

              {/* Meta row */}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-bold text-black/50 mb-4">
                {profile.gender && (
                  <span className="capitalize">{profile.gender}</span>
                )}
                {profile.age && <span>· {profile.age} yrs</span>}
                {profile.audienceType && (
                  <span className="capitalize">· {profile.audienceType} audience</span>
                )}
                {memberSinceLabel && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" strokeWidth={3} />
                    Joined {memberSinceLabel}
                  </span>
                )}
              </div>

              {/* Socials */}
              <div className="flex flex-wrap gap-2">
                {profile.socials.instagram && (
                  <SocialLink
                    href={`https://instagram.com/${profile.socials.instagram.replace('@', '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '')}`}
                    icon={Instagram}
                    label={profile.socials.instagram}
                  />
                )}
                {profile.socials.youtube && (
                  <SocialLink
                    href={
                      profile.socials.youtube.startsWith('http')
                        ? profile.socials.youtube
                        : `https://youtube.com/${profile.socials.youtube}`
                    }
                    icon={Youtube}
                    label="YouTube"
                  />
                )}
                {profile.socials.website && (
                  <SocialLink href={profile.socials.website} icon={Globe} label="Website" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6 page-fade">
          <Stat icon={Users} label="Followers" value={formatFollowers(profile.followers)} tone="green" />
          <Stat
            icon={TrendingUp}
            label="Engagement"
            value={profile.engagementRate ? `${profile.engagementRate.toFixed(1)}%` : '—'}
            tone="purple"
          />
          <Stat
            icon={IndianRupee}
            label="Per post"
            value={profile.pricePerPost ? `₹${formatFollowers(profile.pricePerPost)}` : '—'}
            tone="yellow"
          />
          <Stat
            icon={ImageIcon}
            label="Try-Ons"
            value={String(stats.totalTryOns)}
            tone="orange"
          />
          <Stat
            icon={Clock}
            label="Response"
            value={
              collaboration.responseRate != null
                ? `${collaboration.responseRate}%`
                : collaboration.avgResponseHours != null
                  ? `${collaboration.avgResponseHours}h`
                  : '—'
            }
            tone="pink"
          />
        </div>

        {/* TABS */}
        <div className="flex gap-1 mb-4 border-b-2 border-black overflow-x-auto hide-scrollbar page-fade">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
            Overview
          </TabButton>
          <TabButton active={activeTab === 'tryons'} onClick={() => setActiveTab('tryons')}>
            Try-Ons · {stats.totalTryOns}
          </TabButton>
          <TabButton active={activeTab === 'pricing'} onClick={() => setActiveTab('pricing')}>
            Pricing
          </TabButton>
          <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')}>
            Collab History · {collaboration.total}
          </TabButton>
        </div>

        {/* TAB CONTENT */}
        {activeTab === 'overview' && (
          <div className="space-y-5 page-fade">
            {/* Audience snapshot */}
            <div className="bg-white border-[3px] border-black rounded-xl shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-5">
              <h2 className="text-xs font-black uppercase tracking-widest text-black/60 mb-4">
                Audience Snapshot
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MiniStat
                  label="Audience type"
                  value={profile.audienceType ? profile.audienceType : '—'}
                />
                <MiniStat
                  label="Audience rate"
                  value={
                    profile.audienceRate != null
                      ? `${(profile.audienceRate * 100).toFixed(0)}%`
                      : '—'
                  }
                />
                <MiniStat
                  label="Retention"
                  value={
                    profile.retentionRate != null
                      ? `${(profile.retentionRate * 100).toFixed(0)}%`
                      : '—'
                  }
                />
                <MiniStat
                  label="Badge score"
                  value={profile.badgeScore != null ? String(profile.badgeScore) : '—'}
                />
              </div>
            </div>

            {/* Preferred categories */}
            {profile.preferredCategories.length > 0 && (
              <div className="bg-white border-[3px] border-black rounded-xl shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-5">
                <h2 className="text-xs font-black uppercase tracking-widest text-black/60 mb-3">
                  Prefers Working With
                </h2>
                <div className="flex flex-wrap gap-2">
                  {profile.preferredCategories.map((c) => (
                    <span
                      key={c}
                      className="inline-block px-3 py-1.5 bg-[#A78BFA]/15 border-2 border-black rounded-md text-xs font-bold"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick collab summary with this brand */}
            {collaboration.total > 0 && (
              <div className="bg-white border-[3px] border-black rounded-xl shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-5">
                <h2 className="text-xs font-black uppercase tracking-widest text-black/60 mb-4 flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5" strokeWidth={3} />
                  History with you
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <MiniStat label="Total invites" value={String(collaboration.total)} />
                  <MiniStat label="Accepted" value={String(collaboration.accepted)} />
                  <MiniStat
                    label="Avg response"
                    value={
                      collaboration.avgResponseHours != null
                        ? `${collaboration.avgResponseHours}h`
                        : '—'
                    }
                  />
                  <MiniStat
                    label="Response rate"
                    value={
                      collaboration.responseRate != null
                        ? `${collaboration.responseRate}%`
                        : '—'
                    }
                  />
                </div>
              </div>
            )}

            {/* Try-on preview */}
            {tryOns.length > 0 && (
              <div className="bg-white border-[3px] border-black rounded-xl shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-black uppercase tracking-widest text-black/60 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#A78BFA]" strokeWidth={3} />
                    Recent Try-Ons
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('tryons')}
                    className="text-[10px] font-black uppercase tracking-wider text-black/50 hover:text-black"
                  >
                    See all →
                  </button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {tryOns.slice(0, 8).map((item, idx) => (
                    <button
                      key={`${item.jobId}-${item.outputIndex}`}
                      type="button"
                      onClick={() => setPreviewIndex(idx)}
                      className="relative aspect-[3/4] border-2 border-black rounded-lg bg-black/5 overflow-hidden shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all group"
                    >
                      <AppImage
                        src={item.imageUrl}
                        alt={`Try-on ${idx + 1}`}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(min-width: 768px) 25vw, 33vw"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tryons' && (
          <div className="page-fade">
            {tryOns.length === 0 ? (
              <div className="bg-white border-[3px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 border-[3px] border-black bg-[#FFFCF5] flex items-center justify-center">
                  <ImageOff className="w-7 h-7 text-black/40" strokeWidth={2.5} />
                </div>
                <p className="text-sm font-bold text-black/60">
                  {profile.name} hasn&apos;t generated any try-on visuals yet
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {tryOns.map((item, idx) => (
                  <button
                    key={`${item.jobId}-${item.outputIndex}`}
                    type="button"
                    onClick={() => setPreviewIndex(idx)}
                    className="group relative aspect-[3/4] border-[3px] border-black rounded-lg bg-black/5 overflow-hidden shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition-all"
                  >
                    <AppImage
                      src={item.imageUrl}
                      alt={item.label || `Try-on ${idx + 1}`}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(min-width: 768px) 25vw, 50vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-2 left-2 right-2 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all">
                      <span className="text-[10px] font-black uppercase tracking-wider text-white bg-black/60 px-2 py-1 backdrop-blur-sm">
                        {new Date(item.createdAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="space-y-4 page-fade">
            {profile.pricingBreakdown ? (
              <>
                <div className="bg-white border-[3px] border-black rounded-xl shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-5">
                  <h2 className="text-xs font-black uppercase tracking-widest text-black/60 mb-1">
                    Estimated Rate Card
                  </h2>
                  <p className="text-[11px] text-black/45 font-semibold mb-4">
                    Derived from base rate. Confirm with the creator before contract.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <PriceTile label="Static post" amount={profile.pricingBreakdown.post} accent="#B4F056" />
                    <PriceTile label="Reel" amount={profile.pricingBreakdown.reel} accent="#A78BFA" />
                    <PriceTile label="Carousel" amount={profile.pricingBreakdown.carousel} accent="#FFD93D" />
                    <PriceTile label="Story" amount={profile.pricingBreakdown.story} accent="#FF8C69" />
                    <PriceTile label="UGC video" amount={profile.pricingBreakdown.ugc} accent="#F472B6" />
                  </div>
                </div>
                <div className="bg-[#A78BFA]/10 border-[3px] border-black rounded-lg p-4 flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-[#A78BFA] flex-shrink-0 mt-0.5" strokeWidth={3} />
                  <p className="text-xs text-black/70 font-semibold">
                    Bundle deals (3+ posts in a campaign) typically save 10-20% off these rates. Send a brief through the message button to negotiate.
                  </p>
                </div>
              </>
            ) : (
              <div className="bg-white border-[3px] border-dashed border-black/25 p-12 text-center">
                <IndianRupee className="w-10 h-10 mx-auto mb-3 text-black/20" strokeWidth={2} />
                <p className="text-sm font-bold text-black/60">
                  {profile.name} hasn&apos;t set a public rate
                </p>
                <p className="text-[11px] text-black/40 mt-1 font-semibold">
                  Message them directly to ask for their rate card
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3 page-fade">
            {collaboration.total === 0 ? (
              <div className="bg-white border-[3px] border-dashed border-black/25 p-12 text-center">
                <Zap className="w-10 h-10 mx-auto mb-3 text-black/20" strokeWidth={2} />
                <p className="text-sm font-bold text-black/60">
                  No collaboration history with {profile.name} yet
                </p>
                <p className="text-[11px] text-black/40 mt-1 font-semibold mb-5">
                  Send your first invite to start tracking
                </p>
                <button
                  type="button"
                  onClick={() => setInviteOpen((v) => !v)}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-[#A78BFA] border-2 border-black rounded-lg font-black text-sm uppercase shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all"
                >
                  <Send className="w-4 h-4" strokeWidth={3} />
                  Send invite
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <CountTile label="Total invites" value={collaboration.total} tone="black" />
                  <CountTile label="Accepted" value={collaboration.accepted} tone="green" />
                  <CountTile label="Pending" value={collaboration.pending} tone="yellow" />
                  <CountTile label="Declined" value={collaboration.declined} tone="orange" />
                </div>
                {collaboration.recentInteraction && (
                  <div className="bg-white border-[3px] border-black rounded-xl shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-5 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 mt-0.5" strokeWidth={3} />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider mb-0.5">
                        Recent activity
                      </p>
                      <p className="text-sm font-semibold text-black/65">
                        Last messaged{' '}
                        {new Date(collaboration.recentInteraction).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* LIGHTBOX */}
      {previewIndex !== null && tryOns[previewIndex] && (
        <Lightbox
          items={tryOns}
          index={previewIndex}
          onClose={() => setPreviewIndex(null)}
          onIndexChange={setPreviewIndex}
        />
      )}

      <style jsx global>{`
        @keyframes pageFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .page-fade { animation: pageFadeIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.18s ease-out both; }

        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}

/* ── Subcomponents ──────────────────────────────────────────── */

function SocialLink({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: LucideIcon
  label: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 border-2 border-black rounded-md bg-white hover:bg-black/5 hover:-translate-y-0.5 transition-all text-xs font-bold"
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
      <span className="truncate max-w-[160px]">{label}</span>
    </a>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: string
  tone: 'green' | 'purple' | 'yellow' | 'orange' | 'pink'
}) {
  const bg =
    tone === 'green'
      ? 'bg-[#B4F056]'
      : tone === 'purple'
        ? 'bg-[#A78BFA]'
        : tone === 'yellow'
          ? 'bg-[#FFD93D]'
          : tone === 'orange'
            ? 'bg-[#FF8C69]'
            : 'bg-[#F472B6]'
  return (
    <div className="bg-white border-[3px] border-black rounded-xl shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-4">
      <div
        className={`inline-flex w-9 h-9 items-center justify-center border-2 border-black rounded-md ${bg} mb-2 shadow-[2px_2px_0_0_rgba(0,0,0,1)]`}
      >
        <Icon className="w-4 h-4" strokeWidth={3} />
      </div>
      <div className="text-xl font-black break-words">{value}</div>
      <div className="text-[10px] font-black uppercase tracking-widest text-black/50 mt-0.5">
        {label}
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-black/[0.03] border-2 border-black rounded-lg p-3 text-center">
      <div className="text-base font-black break-words">{value}</div>
      <div className="text-[9px] font-black uppercase tracking-widest text-black/45 mt-0.5">
        {label}
      </div>
    </div>
  )
}

function PriceTile({ label, amount, accent }: { label: string; amount: number; accent: string }) {
  return (
    <div className="bg-white border-2 border-black rounded-lg p-4 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: accent }} />
      <div className="text-xl font-black mt-1.5">₹{amount.toLocaleString('en-IN')}</div>
      <div className="text-[10px] font-black uppercase tracking-widest text-black/55 mt-0.5">
        {label}
      </div>
    </div>
  )
}

function CountTile({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'black' | 'green' | 'yellow' | 'orange'
}) {
  const bg =
    tone === 'green' ? 'bg-[#B4F056]' : tone === 'yellow' ? 'bg-[#FFD93D]' : tone === 'orange' ? 'bg-[#FF8C69]' : 'bg-white'
  return (
    <div className={`${bg} border-[3px] border-black rounded-lg shadow-[3px_3px_0_0_rgba(0,0,0,1)] p-4 text-center`}>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-[10px] font-black uppercase tracking-widest mt-0.5">{label}</div>
    </div>
  )
}

function TabButton({
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
      className={`relative px-4 py-2.5 text-xs font-black uppercase tracking-wider whitespace-nowrap transition-colors ${
        active ? 'text-black' : 'text-black/40 hover:text-black/70'
      }`}
    >
      {children}
      {active && <span className="absolute inset-x-0 -bottom-[2px] h-1 bg-black" />}
    </button>
  )
}

function Lightbox({
  items,
  index,
  onClose,
  onIndexChange,
}: {
  items: TryOnItem[]
  index: number
  onClose: () => void
  onIndexChange: (idx: number) => void
}) {
  const item = items[index]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && index < items.length - 1) onIndexChange(index + 1)
      if (e.key === 'ArrowLeft' && index > 0) onIndexChange(index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, items.length, onClose, onIndexChange])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 px-4 py-2 bg-white border-[3px] border-black rounded-md shadow-[3px_3px_0_0_rgba(255,255,255,1)] text-xs font-black uppercase tracking-wider hover:bg-gray-50"
        >
          Close ✕
        </button>
        <div className="w-full bg-white border-[3px] border-black rounded-xl shadow-[6px_6px_0_0_rgba(255,255,255,0.5)] overflow-hidden">
          <div className="relative w-full aspect-[3/4] bg-black/5">
            <AppImage
              src={item.imageUrl}
              alt={item.label || 'Try-on preview'}
              fill
              className="object-contain"
              sizes="(min-width: 1024px) 768px, 100vw"
            />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between w-full text-white">
          <button
            onClick={() => index > 0 && onIndexChange(index - 1)}
            disabled={index === 0}
            className="px-4 py-2 bg-white text-black border-[3px] border-black rounded-md font-black uppercase text-xs disabled:opacity-30"
          >
            ← Prev
          </button>
          <span className="text-xs font-bold tracking-wider">
            {index + 1} / {items.length}
          </span>
          <button
            onClick={() => index < items.length - 1 && onIndexChange(index + 1)}
            disabled={index === items.length - 1}
            className="px-4 py-2 bg-white text-black border-[3px] border-black rounded-md font-black uppercase text-xs disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}
