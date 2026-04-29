/**
 * INFLUENCER DETAIL PAGE — Neo-brutalism profile with try-on gallery
 *
 * Brand-side creator profile. Shows the creator's bio, stats, socials,
 * pricing, badge tier, and a gallery of every try-on visual they've
 * generated on the platform.
 */
'use client'

import { useEffect, useState } from 'react'
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
  type LucideIcon,
} from 'lucide-react'
import { BrutalLoader } from '@/components/ui/BrutalLoader'
import { AppImage } from '@/components/ui/AppImage'
import { toast } from '@/lib/simple-sonner'

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
  pricePerPost: number | null
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

function formatFollowers(n: number): string {
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

export default function InfluencerDetailPage({
  params,
}: {
  params: Promise<{ influencerId: string }>
}) {
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [tryOns, setTryOns] = useState<TryOnItem[]>([])
  const [loading, setLoading] = useState(true)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { influencerId: id } = await params
        if (cancelled) return

        const res = await fetch(`/api/brand/influencers/${id}/profile`, {
          credentials: 'include',
        })
        if (!res.ok) throw new Error('Failed to load profile')
        const data = await res.json()
        if (cancelled) return
        setProfile(data.profile)
        setTryOns(data.tryOns || [])
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

  const handleMessage = () => {
    if (profile) router.push(`/brand/inbox?to=${profile.id}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFCF5] flex items-center justify-center">
        <BrutalLoader size="lg" tone="brand" label="Loading profile" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#FFFCF5] pt-24 px-6">
        <div className="max-w-4xl mx-auto text-center py-20">
          <h1 className="text-2xl font-black mb-4">Creator Not Found</h1>
          <p className="text-black/60 mb-6">This creator profile doesn&apos;t exist or hasn&apos;t been approved yet.</p>
          <Link
            href="/brand/influencers"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#B4F056] border-[3px] border-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Creators
          </Link>
        </div>
      </div>
    )
  }

  const initials = (profile.name || '?').charAt(0).toUpperCase()
  const stats: Array<{ icon: LucideIcon; label: string; value: string }> = [
    { icon: Users, label: 'Followers', value: formatFollowers(profile.followers) },
    { icon: TrendingUp, label: 'Engagement', value: profile.engagementRate ? `${profile.engagementRate.toFixed(1)}%` : '—' },
  ]
  if (profile.pricePerPost) {
    stats.push({ icon: IndianRupee, label: 'Per Post', value: `₹${profile.pricePerPost.toLocaleString('en-IN')}` })
  }
  if (profile.audienceType) {
    stats.push({ icon: Users, label: 'Audience', value: profile.audienceType })
  }

  return (
    <div className="min-h-screen bg-[#FFFCF5] pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/brand/influencers"
          className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-wider text-black/60 hover:text-black mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={3} />
          Back to Creators
        </Link>

        {/* ── HERO CARD ─────────────────────────────────────────── */}
        <div className="bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
          <div className="relative">
            {/* Decorative top stripe */}
            <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-[#B4F056] via-[#A78BFA] to-[#FFD93D]" />

            <div className="p-6 sm:p-8 flex flex-col md:flex-row gap-6 md:gap-8">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="w-32 h-32 sm:w-40 sm:h-40 border-[3px] border-black overflow-hidden bg-gradient-to-br from-[#B4F056] to-[#FFD93D] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
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
                      className={`absolute -bottom-3 -right-3 px-2 py-1 ${badgeColor(profile.badgeTier)} border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1`}
                      title={`${profile.badgeTier} tier creator`}
                    >
                      <Award className="w-3 h-3" strokeWidth={3} />
                      <span className="text-[10px] font-black uppercase tracking-wider">{profile.badgeTier}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl sm:text-4xl font-black mb-2 break-words">{profile.name}</h1>

                {profile.niches.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {profile.niches.map((n) => (
                      <span
                        key={n}
                        className="inline-block px-3 py-1 bg-[#B4F056] border-2 border-black text-xs font-black uppercase tracking-wider"
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                )}

                {profile.bio && (
                  <p className="text-sm sm:text-base text-black/75 leading-relaxed mb-4 max-w-2xl">{profile.bio}</p>
                )}

                {/* Socials */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {profile.socials.instagram && (
                    <SocialLink href={`https://instagram.com/${profile.socials.instagram.replace('@', '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '')}`} icon={Instagram} label={profile.socials.instagram} />
                  )}
                  {profile.socials.youtube && (
                    <SocialLink href={profile.socials.youtube.startsWith('http') ? profile.socials.youtube : `https://youtube.com/${profile.socials.youtube}`} icon={Youtube} label="YouTube" />
                  )}
                  {profile.socials.website && (
                    <SocialLink href={profile.socials.website} icon={Globe} label="Website" />
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleMessage}
                    className="px-5 py-3 bg-[#B4F056] border-[3px] border-black font-black uppercase tracking-wider text-sm hover:bg-[#a3e04a] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" strokeWidth={3} />
                    Send Message
                  </button>
                  {profile.email && (
                    <a
                      href={`mailto:${profile.email}`}
                      className="px-5 py-3 bg-white border-[3px] border-black font-black uppercase tracking-wider text-sm hover:bg-gray-50 hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2"
                    >
                      <Mail className="w-4 h-4" strokeWidth={3} />
                      Email
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── STATS GRID ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4"
              >
                <Icon className="w-4 h-4 mb-2 text-black/40" strokeWidth={2.5} />
                <div className="text-2xl font-black mb-0.5 break-words">{stat.value}</div>
                <div className="text-[10px] font-black uppercase tracking-wider text-black/50">
                  {stat.label}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── PREFERRED CATEGORIES ──────────────────────────────── */}
        {profile.preferredCategories.length > 0 && (
          <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-5 mt-6">
            <h2 className="text-xs font-black uppercase tracking-widest text-black/60 mb-3">
              Prefers Working With
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile.preferredCategories.map((c) => (
                <span
                  key={c}
                  className="inline-block px-3 py-1.5 bg-[#A78BFA]/15 border-2 border-black text-xs font-bold"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── TRY-ON GALLERY ─────────────────────────────────────── */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-black flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#A78BFA]" strokeWidth={3} />
                Try-On Portfolio
              </h2>
              <p className="text-sm text-black/50 mt-0.5 font-medium">
                {tryOns.length > 0
                  ? `${tryOns.length} AI try-on visual${tryOns.length === 1 ? '' : 's'} generated by ${profile.name}`
                  : 'No try-ons generated yet'}
              </p>
            </div>
          </div>

          {tryOns.length === 0 ? (
            <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 border-[3px] border-black bg-[#FFFCF5] flex items-center justify-center">
                <ImageOff className="w-7 h-7 text-black/40" strokeWidth={2.5} />
              </div>
              <p className="text-sm font-bold text-black/60">
                {profile.name} hasn&apos;t generated any try-on visuals yet
              </p>
              <p className="text-xs text-black/40 mt-1 font-medium">
                Their portfolio will appear here as they create content
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {tryOns.map((item, idx) => (
                <button
                  key={`${item.jobId}-${item.outputIndex}`}
                  type="button"
                  onClick={() => setPreviewIndex(idx)}
                  className="group relative aspect-[3/4] border-[3px] border-black bg-black/5 overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all"
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
                      {new Date(item.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── LIGHTBOX MODAL ─────────────────────────────────────── */}
      {previewIndex !== null && tryOns[previewIndex] && (
        <Lightbox
          items={tryOns}
          index={previewIndex}
          onClose={() => setPreviewIndex(null)}
          onIndexChange={setPreviewIndex}
        />
      )}
    </div>
  )
}

/* ── Subcomponents ───────────────────────────────────────────── */

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
      className="inline-flex items-center gap-1.5 px-3 py-1.5 border-2 border-black bg-white hover:bg-black/5 transition-colors text-xs font-bold"
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
      <span className="truncate max-w-[160px]">{label}</span>
    </a>
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
          className="absolute -top-12 right-0 px-4 py-2 bg-white border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] text-xs font-black uppercase tracking-wider hover:bg-gray-50"
        >
          Close ✕
        </button>
        <div className="w-full bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(255,255,255,0.5)] overflow-hidden">
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
            className="px-4 py-2 bg-white text-black border-[3px] border-black font-black uppercase text-xs disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <span className="text-xs font-bold tracking-wider">
            {index + 1} / {items.length}
          </span>
          <button
            onClick={() => index < items.length - 1 && onIndexChange(index + 1)}
            disabled={index === items.length - 1}
            className="px-4 py-2 bg-white text-black border-[3px] border-black font-black uppercase text-xs disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </div>
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
      `}</style>
    </div>
  )
}
