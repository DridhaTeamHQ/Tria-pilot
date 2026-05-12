'use client'

/**
 * SMART DISCOVERY WIDGET
 *
 * Lives on the brand dashboard. Auto-fetches the top creators from
 * /api/brand/smart-discovery (matchmaker + vetting), shows them as
 * compact cards with trust scores + reasons + one-click invite.
 *
 * Hides itself when the brand has no products (it would be empty noise).
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppImage } from '@/components/ui/AppImage'
import { toast } from '@/lib/simple-sonner'
import {
  Sparkles,
  Loader2,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  Send,
  ExternalLink,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { staggerContainer, staggerItem, slideUp, fadeIn } from '@/lib/animations'

interface SmartPick {
  creatorId: string
  name: string | null
  avatarUrl: string | null
  niches: string[]
  followers: number | null
  engagementRate: number | null
  pricePerPost: number | null
  badgeTier: string | null
  matchScore: number
  trustScore: number
  trustLabel: string
  trustTone: 'green' | 'yellow' | 'orange' | 'red'
  reason: string
}

function formatFollowers(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function trustColor(tone: 'green' | 'yellow' | 'orange' | 'red'): string {
  if (tone === 'green') return 'bg-[#B4F056]'
  if (tone === 'yellow') return 'bg-[#FFD93D]'
  if (tone === 'orange') return 'bg-[#FF8C69]'
  return 'bg-red-300'
}

export default function SmartDiscoveryWidget() {
  const [picks, setPicks] = useState<SmartPick[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [invitingId, setInvitingId] = useState<string | null>(null)

  const load = async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/brand/smart-discovery', { credentials: 'include' })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || 'Failed to fetch')
      }
      const data = await res.json()
      setPicks(data.picks || [])
      if (data.reason === 'no_products') {
        setError('Add products to your catalog to unlock personalized creator recommendations.')
      } else if (data.reason === 'no_creators') {
        setError('No approved creators on the platform right now.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleInvite = async (creatorId: string) => {
    if (invitingId) return
    setInvitingId(creatorId)
    try {
      const res = await fetch('/api/collaborations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          influencerId: creatorId,
          notes: 'Invitation from your dashboard smart-discovery picks',
        }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || 'Invite failed')
      }
      toast.success('Invite sent — creator will see it on their dashboard')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send invite')
    } finally {
      setInvitingId(null)
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white border-[3px] border-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-[#A78BFA]" strokeWidth={3} />
          <h2 className="text-xs font-black uppercase tracking-widest">
            Creators perfect for you
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border-2 border-black p-3 space-y-2 skeleton-shimmer"
              style={{ minHeight: 120 }}
            />
          ))}
        </div>
        <style jsx>{`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          .skeleton-shimmer {
            background: linear-gradient(90deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.10) 50%, rgba(0,0,0,0.04) 100%);
            background-size: 200% 100%;
            animation: shimmer 1.5s ease-in-out infinite;
          }
        `}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-[#F9F8F4] border-[3px] border-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] p-8 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-16 h-16 bg-[#A78BFA]/10 -translate-y-8 translate-x-8 rotate-45" />
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="w-16 h-16 bg-white border-2 border-black flex items-center justify-center shadow-[4px_4px_0_0_rgba(0,0,0,1)] rotate-3">
            <Sparkles className="w-8 h-8 text-[#A78BFA]" strokeWidth={3} />
          </div>
          <div className="max-w-md">
            <h2 className="text-xl font-black text-black mb-2 uppercase tracking-tight">Personalized Recommendations</h2>
            <p className="text-sm text-black/60 font-bold leading-relaxed">{error}</p>
          </div>
          {error.toLowerCase().includes('add products') && (
            <Link
              href="/brand/products"
              className="inline-flex items-center gap-2 px-8 py-3 bg-[#B4F056] border-2 border-black text-xs font-black uppercase tracking-widest shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
            >
              Unlock Creator Matches
              <ArrowRight className="w-4 h-4" strokeWidth={3} />
            </Link>
          )}
        </div>
      </div>
    )
  }

  if (picks.length === 0) return null

  return (
    <motion.div
      variants={slideUp}
      initial="initial"
      animate="animate"
      className="bg-white border-[3px] border-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-[#A78BFA] flex-shrink-0" strokeWidth={3} />
          <h2 className="text-xs font-black uppercase tracking-widest truncate">
            Creators perfect for you
          </h2>
          <span className="text-[10px] font-black bg-[#A78BFA]/20 border border-black px-2 py-0.5 rounded ml-1">
            AI picked
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setRefreshing(true)
            load(true)
          }}
          disabled={refreshing}
          className="text-[10px] font-black uppercase tracking-wider px-2 py-1 hover:bg-black/5 rounded transition-colors flex items-center gap-1 disabled:opacity-50"
          title="Refresh picks"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={3} />
          Refresh
        </button>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
      >
        {picks.map((pick) => (
          <motion.div
            key={pick.creatorId}
            variants={staggerItem}
            className="group border-2 border-black p-3 hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all bg-white"
          >
            {/* Header */}
            <div className="flex items-start gap-2.5 mb-2.5">
              <div className="relative w-11 h-11 bg-gradient-to-br from-[#B4F056] to-[#FFD93D] border-2 border-black flex items-center justify-center shrink-0">
                {pick.avatarUrl ? (
                  <AppImage
                    src={pick.avatarUrl}
                    alt={pick.name || 'Creator'}
                    className="object-cover"
                    sizes="44px"
                  />
                ) : (
                  <span className="font-black">
                    {(pick.name || '?').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-black text-sm truncate">{pick.name || 'Creator'}</h3>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 ${trustColor(pick.trustTone)} border border-black text-[9px] font-black uppercase tracking-widest`}
                    title={`Trust score: ${pick.trustScore}/100`}
                  >
                    <ShieldCheck className="w-2.5 h-2.5" strokeWidth={3} />
                    {pick.trustLabel}
                  </span>
                  <span className="text-[9px] font-black uppercase bg-black text-white px-1.5 py-0.5">
                    {pick.matchScore}% fit
                  </span>
                </div>
              </div>
            </div>

            {/* Reason */}
            <p className="text-[11px] text-black/65 font-semibold mb-2.5 line-clamp-2 min-h-[2.4em]">
              {pick.reason}
            </p>

            {/* Stats line */}
            <div className="flex items-center gap-2 text-[10px] font-bold text-black/45 mb-3 truncate">
              <span>{formatFollowers(pick.followers)} followers</span>
              {pick.engagementRate != null && <span>· {pick.engagementRate}% eng</span>}
              {pick.pricePerPost != null && <span>· ₹{formatFollowers(pick.pricePerPost)}/post</span>}
            </div>

            {/* Actions */}
            <div className="flex gap-1.5">
              <Link
                href={`/brand/influencers/${pick.creatorId}`}
                className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 border-2 border-black text-[10px] font-black uppercase tracking-wider hover:bg-black/5 transition-colors"
              >
                <ExternalLink className="w-3 h-3" strokeWidth={3} />
                View
              </Link>
              <button
                type="button"
                onClick={() => handleInvite(pick.creatorId)}
                disabled={invitingId === pick.creatorId}
                className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 bg-[#B4F056] border-2 border-black text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition-all disabled:opacity-50"
              >
                {invitingId === pick.creatorId ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3 h-3" strokeWidth={3} />
                    Invite
                  </>
                )}
              </button>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <Link
        href="/brand/influencers"
        className="mt-4 w-full inline-flex items-center justify-center gap-2 py-2 border-2 border-dashed border-black/25 hover:border-black hover:bg-[#FFD93D]/15 text-[11px] font-black uppercase tracking-wider transition-all"
      >
        Discover more creators
        <ArrowRight className="w-3.5 h-3.5" strokeWidth={3} />
      </Link>
    </motion.div>
  )
}
