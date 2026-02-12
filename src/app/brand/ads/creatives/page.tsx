'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
    staggerContainer,
    staggerItem,
    cardHover,
    pageVariants,
    overlayVariants,
    scaleFade,
} from '@/lib/animations'
import { cn } from '@/lib/utils'
import type { Platform } from '@/lib/ads/ad-styles'
import {
    Plus,
    RefreshCw,
    Sparkles,
    Download,
    X,
    Instagram,
    Facebook,
    Globe,
    Users,
    ImageIcon,
    ZoomIn,
    AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import BrutalCard from '@/components/brutal/BrutalCard'
import { BrutalLoader } from '@/components/ui/BrutalLoader'

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface AdCreative {
    id: string
    imageUrl: string
    qualityScore: number
    campaign?: { id: string; title: string }
    platforms: Platform[]
    copyVariants: string[]
    createdAt: string
    regenerationCount: number
    maxRegenerations: number
}

interface Campaign {
    id: string
    title: string
    status: string
}

type QualityTier = 'all' | 'high' | 'medium' | 'low'

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const PLATFORM_ICONS: Record<Platform, React.ReactNode> = {
    instagram: <Instagram className="h-4 w-4" />,
    facebook: <Facebook className="h-4 w-4" />,
    google: <Globe className="h-4 w-4" />,
    influencer: <Users className="h-4 w-4" />,
}

const QUALITY_CONFIG: Record<QualityTier, { min: number; max: number; label: string }> = {
    all: { min: 0, max: 100, label: 'All' },
    high: { min: 80, max: 100, label: 'High (80+)' },
    medium: { min: 60, max: 79, label: 'Medium' },
    low: { min: 0, max: 59, label: 'Low' },
}

// ═══════════════════════════════════════════════════════════════
// QUALITY BADGE — NEO-BRUTALIST
// ═══════════════════════════════════════════════════════════════

function QualityBadge({ score }: { score: number }) {
    let bg = 'bg-[#FF8C69]' // coral low
    let label = 'Needs work'
    if (score >= 80) {
        bg = 'bg-[#B4F056]'
        label = 'High'
    } else if (score >= 60) {
        bg = 'bg-[#FFD93D]'
        label = 'Medium'
    }
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 border-[2px] border-black text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
                bg
            )}
        >
            {score} — {label}
        </span>
    )
}

// ═══════════════════════════════════════════════════════════════
// CREATIVE CARD — NEO-BRUTALIST
// ═══════════════════════════════════════════════════════════════

function CreativeCard({
    creative,
    onRegenerate,
    onDownload,
    onImageClick,
    regenerating,
}: {
    creative: AdCreative
    onRegenerate: () => void
    onDownload: () => void
    onImageClick: () => void
    regenerating: boolean
}) {
    const [imageError, setImageError] = useState(false)
    const [imageLoading, setImageLoading] = useState(true)
    const relativeDate = getRelativeDate(creative.createdAt)

    const getImageSrc = (url: string) => {
        if (!url) return ''
        if (url.includes('supabase.co/storage'))
            return `/api/images/proxy?url=${encodeURIComponent(url)}`
        return url
    }

    return (
        <motion.div variants={staggerItem}>
            <BrutalCard
                className={cn(
                    'overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]',
                    'p-0'
                )}
            >
                {/* Image */}
                <div
                    className="group relative aspect-[4/5] cursor-pointer overflow-hidden bg-[#FFFDF5] border-b-[3px] border-black"
                    onClick={onImageClick}
                >
                    {imageLoading && !imageError && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/90 border-b-[3px] border-black">
                            <BrutalLoader size="sm" />
                        </div>
                    )}
                    {imageError ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-[#FFFDF5] border-b-[3px] border-black">
                            <AlertCircle className="h-10 w-10 text-black mb-2" />
                            <p className="text-xs font-bold text-black">Image failed to load</p>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setImageError(false)
                                    setImageLoading(true)
                                }}
                                className="mt-3 px-3 py-1.5 border-[2px] border-black bg-[#FFD93D] text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                            >
                                Retry
                            </button>
                        </div>
                    ) : (
                        <img
                            src={getImageSrc(creative.imageUrl)}
                            alt="Ad creative"
                            className={cn(
                                'w-full h-full object-cover transition-all duration-300',
                                imageLoading ? 'opacity-0 scale-105' : 'opacity-100 scale-100 hover:scale-105'
                            )}
                            onError={() => {
                                setImageError(true)
                                setImageLoading(false)
                            }}
                            onLoad={() => setImageLoading(false)}
                        />
                    )}
                    {/* Hover zoom hint */}
                    <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/20 to-transparent">
                        <span className="flex items-center gap-1.5 px-2 py-1 bg-white border-[2px] border-black text-[10px] font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <ZoomIn className="h-3.5 w-3.5" /> Click to zoom
                        </span>
                    </div>
                </div>

                <div className="p-3 space-y-3 bg-white">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className="text-[11px] font-bold text-black">
                            {creative.campaign?.title || 'Unassigned'}
                        </span>
                        <span className="text-[10px] text-black/50">{relativeDate}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {creative.platforms.map((p) => (
                            <span
                                key={p}
                                className="p-1 border-[1.5px] border-black bg-[#FFFDF5]"
                                title={p}
                            >
                                {PLATFORM_ICONS[p]}
                            </span>
                        ))}
                    </div>
                    <QualityBadge score={creative.qualityScore} />
                    <div className="flex gap-2 pt-1">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                onRegenerate()
                            }}
                            disabled={regenerating}
                            className={cn(
                                'flex-1 flex items-center justify-center gap-2 py-2.5 border-[2px] border-black text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all',
                                regenerating
                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    : 'bg-[#FF8C69] hover:bg-[#ff9d7d] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                            )}
                        >
                            {regenerating ? (
                                <BrutalLoader size="sm" className="!min-h-0" />
                            ) : (
                                <>
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    Regenerate
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                onDownload()
                            }}
                            className="flex items-center justify-center py-2.5 px-3 bg-black text-white border-[2px] border-black font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-black/90 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                        >
                            <Download className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            </BrutalCard>
        </motion.div>
    )
}

// ═══════════════════════════════════════════════════════════════
// LIGHTBOX — NEO-BRUTALIST
// ═══════════════════════════════════════════════════════════════

function Lightbox({
    open,
    onClose,
    imageUrl,
}: {
    open: boolean
    onClose: () => void
    imageUrl: string
}) {
    const src = imageUrl.includes('supabase.co/storage')
        ? `/api/images/proxy?url=${encodeURIComponent(imageUrl)}`
        : imageUrl

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    key="lightbox"
                    variants={overlayVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        variants={scaleFade}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="relative max-w-[90vw] max-h-[90vh] bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-2"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            className="absolute -top-2 -right-2 z-10 w-10 h-10 bg-[#FF8C69] border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center hover:bg-[#ff9d7d] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                            onClick={onClose}
                            aria-label="Close"
                        >
                            <X className="h-5 w-5 text-black" />
                        </button>
                        <img
                            src={src}
                            alt="Creative preview"
                            className="max-w-full max-h-[85vh] object-contain block"
                        />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

function getRelativeDate(dateStr: string): string {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function CreativesPage() {
    const router = useRouter()
    const [creatives, setCreatives] = useState<AdCreative[]>([])
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [campaignFilter, setCampaignFilter] = useState<string>('all')
    const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all')
    const [qualityFilter, setQualityFilter] = useState<QualityTier>('all')
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
    const [loading, setLoading] = useState(true)
    const [regenerating, setRegenerating] = useState<string | null>(null)
    const [lightboxImage, setLightboxImage] = useState<string | null>(null)

    useEffect(() => {
        Promise.all([
            fetch('/api/ads/creatives').then((r) => r.json()),
            fetch('/api/campaigns').then((r) => r.json()),
        ])
            .then(([creativesData, campaignsData]) => {
                setCreatives(creativesData.creatives || [])
                setCampaigns(campaignsData || [])
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const filteredCreatives = creatives
        .filter((c) => {
            if (campaignFilter !== 'all') {
                if (campaignFilter === 'unassigned') return !c.campaign
                return c.campaign?.id === campaignFilter
            }
            return true
        })
        .filter((c) => (platformFilter === 'all' ? true : c.platforms.includes(platformFilter)))
        .filter((c) => {
            if (qualityFilter === 'all') return true
            const { min, max } = QUALITY_CONFIG[qualityFilter]
            return c.qualityScore >= min && c.qualityScore <= max
        })
        .sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime()
            const dateB = new Date(b.createdAt).getTime()
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
        })

    const handleRegenerate = async (creative: AdCreative) => {
        setRegenerating(creative.id)
        try {
            const res = await fetch(`/api/ads/${creative.id}/regenerate`, { method: 'POST' })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Regeneration failed')
            }
            toast.success('Creative regenerated!')
            const refreshRes = await fetch('/api/ads/creatives')
            const refreshData = await refreshRes.json()
            setCreatives(refreshData.creatives || [])
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Regeneration failed')
        } finally {
            setRegenerating(null)
        }
    }

    const handleDownload = async (creative: AdCreative) => {
        try {
            const url = creative.imageUrl.includes('supabase.co/storage')
                ? `/api/images/proxy?url=${encodeURIComponent(creative.imageUrl)}`
                : creative.imageUrl
            const res = await fetch(url)
            const blob = await res.blob()
            const blobUrl = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = blobUrl
            a.download = `creative-${creative.id}.jpg`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(blobUrl)
            toast.success('Download started')
        } catch {
            toast.error('Download failed')
        }
    }

    const hasActiveFilters =
        campaignFilter !== 'all' || platformFilter !== 'all' || qualityFilter !== 'all'

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            className="min-h-screen bg-[#FFFDF5] pt-24 pb-16"
        >
            <div className="container mx-auto px-4 max-w-6xl">
                {/* Header */}
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1
                            className="text-4xl md:text-5xl font-black text-black"
                            style={{ fontFamily: 'Playfair Display, serif' }}
                        >
                            Ad Creatives
                        </h1>
                        <p className="text-black/50 mt-1">
                            All generated ad creatives across your campaigns
                        </p>
                    </div>
                    <motion.button
                        type="button"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => router.push('/brand/ads')}
                        className="flex items-center gap-2 px-5 py-2.5 border-[3px] border-black bg-[#FFD93D] font-black text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-shadow"
                    >
                        <Plus className="h-4 w-4" />
                        Generate New Ad
                    </motion.button>
                </div>

                {/* Filters — neo-brutalist chips */}
                <BrutalCard className="p-4 mb-8">
                    <p className="text-[10px] font-black uppercase text-black/50 mb-3">Filters</p>
                    <div className="flex flex-wrap gap-3">
                        {/* Campaign */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-bold text-black/60 mr-1">Campaign</span>
                            <select
                                value={campaignFilter}
                                onChange={(e) => setCampaignFilter(e.target.value)}
                                className="border-[2px] border-black bg-white px-3 py-1.5 text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-[#FFD93D]"
                            >
                                <option value="all">All</option>
                                <option value="unassigned">Unassigned</option>
                                {campaigns.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {/* Platform */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-bold text-black/60 mr-1">Platform</span>
                            {(['all', 'instagram', 'facebook', 'google', 'influencer'] as const).map(
                                (p) => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setPlatformFilter(p === 'all' ? 'all' : p)}
                                        className={cn(
                                            'px-2.5 py-1 text-[10px] font-bold border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all',
                                            platformFilter === p
                                                ? 'bg-[#FFD93D] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                                                : 'bg-white hover:bg-[#FFFDF5]'
                                        )}
                                    >
                                        {p === 'all' ? 'All' : PLATFORM_ICONS[p]}
                                    </button>
                                )
                            )}
                        </div>
                        {/* Quality */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-bold text-black/60 mr-1">Quality</span>
                            {(['all', 'high', 'medium', 'low'] as const).map((q) => (
                                <button
                                    key={q}
                                    type="button"
                                    onClick={() => setQualityFilter(q)}
                                    className={cn(
                                        'px-2.5 py-1 text-[10px] font-bold border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all',
                                        qualityFilter === q
                                            ? 'bg-[#C3B1E1] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                                            : 'bg-white hover:bg-[#FFFDF5]'
                                    )}
                                >
                                    {QUALITY_CONFIG[q].label}
                                </button>
                            ))}
                        </div>
                        {/* Sort */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-bold text-black/60 mr-1">Sort</span>
                            {(['newest', 'oldest'] as const).map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setSortOrder(s)}
                                    className={cn(
                                        'px-2.5 py-1 text-[10px] font-bold border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all',
                                        sortOrder === s
                                            ? 'bg-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                                            : 'bg-white hover:bg-[#FFFDF5]'
                                    )}
                                >
                                    {s === 'newest' ? 'Newest' : 'Oldest'}
                                </button>
                            ))}
                        </div>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={() => {
                                    setCampaignFilter('all')
                                    setPlatformFilter('all')
                                    setQualityFilter('all')
                                }}
                                className="text-[10px] font-bold text-black/60 hover:text-black underline ml-auto"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                </BrutalCard>

                {/* Content */}
                {loading ? (
                    <BrutalCard className="flex flex-col items-center justify-center py-24">
                        <BrutalLoader size="lg" />
                        <p className="mt-6 text-xs font-black uppercase text-black/50">
                            Loading creatives
                        </p>
                    </BrutalCard>
                ) : filteredCreatives.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-24"
                    >
                        <BrutalCard className="flex flex-col items-center justify-center p-12 max-w-md text-center">
                            <div className="w-16 h-16 border-[3px] border-black bg-[#FFD93D] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center mb-4">
                                <ImageIcon className="h-8 w-8 text-black" />
                            </div>
                            <h2 className="text-xl font-black text-black mb-2">
                                {creatives.length === 0
                                    ? 'No ad creatives yet'
                                    : 'No creatives match filters'}
                            </h2>
                            <p className="text-sm text-black/60 mb-6">
                                {creatives.length === 0
                                    ? 'Generate your first AI-powered ad to get started.'
                                    : 'Try adjusting your filters.'}
                            </p>
                            {creatives.length === 0 && (
                                <motion.button
                                    type="button"
                                    whileHover={{ y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => router.push('/brand/ads')}
                                    className="flex items-center gap-2 px-5 py-2.5 border-[3px] border-black bg-[#B4F056] font-black text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                >
                                    <Sparkles className="h-4 w-4" />
                                    Generate Your First Ad
                                </motion.button>
                            )}
                        </BrutalCard>
                    </motion.div>
                ) : (
                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                    >
                        {filteredCreatives.map((creative) => (
                            <CreativeCard
                                key={creative.id}
                                creative={creative}
                                onRegenerate={() => handleRegenerate(creative)}
                                onDownload={() => handleDownload(creative)}
                                onImageClick={() => setLightboxImage(creative.imageUrl)}
                                regenerating={regenerating === creative.id}
                            />
                        ))}
                    </motion.div>
                )}
            </div>

            <Lightbox
                open={lightboxImage !== null}
                onClose={() => setLightboxImage(null)}
                imageUrl={lightboxImage || ''}
            />
        </motion.div>
    )
}
