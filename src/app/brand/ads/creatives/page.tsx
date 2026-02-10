'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
    Plus,
    RefreshCw,
    Sparkles,
    Download,
    Tag,
    X,
    Instagram,
    Facebook,
    Globe,
    Users,
    Loader2,
    ImageIcon,
    ZoomIn,
    AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Platform } from '@/lib/ads/ad-styles'

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface AdCreative {
    id: string
    imageUrl: string
    qualityScore: number
    campaign?: {
        id: string
        title: string
    }
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
    medium: { min: 60, max: 79, label: 'Medium (60-79)' },
    low: { min: 0, max: 59, label: 'Low (<60)' },
}

// ═══════════════════════════════════════════════════════════════
// QUALITY BADGE COMPONENT
// ═══════════════════════════════════════════════════════════════

function QualityBadge({ score }: { score: number }) {
    let color = 'bg-[#FF8C69] text-black border-black'
    let label = 'Needs Work'

    if (score >= 80) {
        color = 'bg-[#B4F056] text-black border-black'
        label = 'High Quality'
    } else if (score >= 60) {
        color = 'bg-[#FFD93D] text-black border-black'
        label = 'Medium Quality'
    }

    return (
        <div className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]", color)}>
            <span className="font-black">{score}</span>
            <span>{label}</span>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// CREATIVE CARD COMPONENT
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

    // Use server-side proxy for Supabase images
    const getImageSrc = (url: string) => {
        if (!url) return ''
        if (url.includes('supabase.co/storage')) {
            return `/api/images/proxy?url=${encodeURIComponent(url)}`
        }
        return url
    }

    return (
        <Card className="overflow-hidden group bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all duration-300">
            {/* Image Container */}
            <div
                className="relative aspect-[4/5] cursor-pointer overflow-hidden bg-gray-100 border-b-[3px] border-black"
                onClick={onImageClick}
            >
                {imageLoading && !imageError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                        <Loader2 className="h-8 w-8 animate-spin text-black" />
                    </div>
                )}

                {imageError ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-black/50 bg-gray-50 p-4">
                        <AlertCircle className="h-12 w-12 mb-3 text-red-500" />
                        <p className="text-sm font-bold text-black">Image failed to load</p>
                        <p className="text-xs text-black/60 mt-2 text-center max-w-[200px] break-all font-mono">
                            {creative.imageUrl.substring(0, 60)}...
                        </p>
                        <Button
                            size="sm"
                            variant="outline"
                            className="mt-4"
                            onClick={(e) => {
                                e.stopPropagation()
                                setImageError(false)
                                setImageLoading(true)
                            }}
                        >
                            Retry
                        </Button>
                    </div>
                ) : (
                    <img
                        src={getImageSrc(creative.imageUrl)}
                        alt="Ad creative"
                        className={cn(
                            "w-full h-full object-cover transition-all duration-500",
                            imageLoading ? "opacity-0 scale-105" : "opacity-100 scale-100 group-hover:scale-105"
                        )}
                        onError={() => {
                            console.error('[CreativeCard] Image load failed:', creative.imageUrl)
                            setImageError(true)
                            setImageLoading(false)
                        }}
                        onLoad={() => setImageLoading(false)}
                    />
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-white text-black font-bold px-4 py-2 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform">
                        <ZoomIn className="h-5 w-5" strokeWidth={2.5} />
                        View
                    </div>
                </div>
            </div>

            <CardContent className="p-5 space-y-4">
                {/* Metadata Row */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-black/60 font-bold">
                        <span className="uppercase tracking-wide">{creative.campaign?.title || 'Unassigned'}</span>
                        <span className="text-black/30">•</span>
                        <span>{relativeDate}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {creative.platforms.map(p => (
                            <span key={p} className="text-black/60 hover:text-black transition-colors bg-gray-100 p-1 rounded border border-black/10">
                                {PLATFORM_ICONS[p]}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Quality Badge */}
                <QualityBadge score={creative.qualityScore} />

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={onRegenerate}
                        disabled={regenerating}
                        className="flex-1 bg-white border-2 border-black text-black font-bold hover:bg-[#FFD93D] hover:text-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                    >
                        {regenerating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                <RefreshCw className="h-4 w-4 mr-2" strokeWidth={2.5} />
                                Regenerate
                            </>
                        )}
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={onDownload}
                        className="shrink-0 bg-white border-2 border-black text-black hover:bg-[#6EC1E4] hover:text-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all h-9 w-9"
                    >
                        <Download className="h-4 w-4" strokeWidth={2.5} />
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

// ═══════════════════════════════════════════════════════════════
// LIGHTBOX COMPONENT
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
    if (!open) return null

    // Proxy the URL for lightbox too
    const src = imageUrl.includes('supabase.co/storage')
        ? `/api/images/proxy?url=${encodeURIComponent(imageUrl)}`
        : imageUrl

    return (
        <div
            className="fixed inset-0 z-50 bg-[#FDF6EC]/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <button
                className="absolute top-6 right-6 bg-white text-black border-2 border-black p-2 rounded-full hover:bg-red-500 hover:text-white transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                onClick={onClose}
            >
                <X className="h-8 w-8" strokeWidth={2.5} />
            </button>
            <img
                src={src}
                alt="Creative preview"
                className="max-w-full max-h-[85vh] object-contain rounded-xl border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

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
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function CreativesPage() {
    const router = useRouter()

    // Data state
    const [creatives, setCreatives] = useState<AdCreative[]>([])
    const [campaigns, setCampaigns] = useState<Campaign[]>([])

    // Filter state
    const [campaignFilter, setCampaignFilter] = useState<string>('all')
    const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all')
    const [qualityFilter, setQualityFilter] = useState<QualityTier>('all')
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')

    // UI state
    const [loading, setLoading] = useState(true)
    const [regenerating, setRegenerating] = useState<string | null>(null)
    const [lightboxImage, setLightboxImage] = useState<string | null>(null)

    // Fetch data
    useEffect(() => {
        Promise.all([
            fetch('/api/ads/creatives').then(r => r.json()),
            fetch('/api/campaigns').then(r => r.json()),
        ])
            .then(([creativesData, campaignsData]) => {
                setCreatives(creativesData.creatives || [])
                setCampaigns(campaignsData || [])
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    // Filter creatives
    const filteredCreatives = creatives
        .filter(c => {
            if (campaignFilter !== 'all') {
                if (campaignFilter === 'unassigned') return !c.campaign
                return c.campaign?.id === campaignFilter
            }
            return true
        })
        .filter(c => {
            if (platformFilter !== 'all') {
                return c.platforms.includes(platformFilter)
            }
            return true
        })
        .filter(c => {
            if (qualityFilter !== 'all') {
                const { min, max } = QUALITY_CONFIG[qualityFilter]
                return c.qualityScore >= min && c.qualityScore <= max
            }
            return true
        })
        .sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime()
            const dateB = new Date(b.createdAt).getTime()
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
        })

    // Handlers
    const handleRegenerate = async (creative: AdCreative) => {
        setRegenerating(creative.id)
        try {
            const res = await fetch(`/api/ads/${creative.id}/regenerate`, {
                method: 'POST',
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Regeneration failed')
            }

            toast.success('Creative regenerated!')
            // Refresh creatives
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
            // Use proxy for download too
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
        } catch (error) {
            toast.error('Download failed')
        }
    }

    const hasActiveFilters = campaignFilter !== 'all' || platformFilter !== 'all' || qualityFilter !== 'all'

    return (
        <div className="min-h-screen bg-[#FDF6EC] pt-24 pb-12">
            <div className="container mx-auto px-4 max-w-7xl relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b-[3px] border-black pb-8">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black text-black mb-3 tracking-tight">
                            Ad Creatives
                        </h1>
                        <p className="text-lg font-medium text-black/70">
                            Manage and regenerate your AI-generated assets.
                        </p>
                    </div>
                    <Button
                        onClick={() => router.push('/brand/ads')}
                        size="lg"
                        className="bg-black text-white border-[3px] border-black hover:bg-[#B4F056] hover:text-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all font-bold text-lg h-14 px-8"
                    >
                        <Plus className="h-6 w-6 mr-2" strokeWidth={3} />
                        New Ad
                    </Button>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-wrap items-center gap-4 mb-10 p-6 bg-white rounded-xl border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <Select value={campaignFilter} onValueChange={setCampaignFilter}>
                        <SelectTrigger className="w-56 bg-white border-2 border-black font-bold shadow-sm focus:ring-0">
                            <SelectValue placeholder="Campaign" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-2 border-black font-medium">
                            <SelectItem value="all" className="cursor-pointer hover:bg-gray-100">All Campaigns</SelectItem>
                            <SelectItem value="unassigned" className="cursor-pointer hover:bg-gray-100">Unassigned</SelectItem>
                            {campaigns.map(c => (
                                <SelectItem key={c.id} value={c.id} className="cursor-pointer hover:bg-gray-100">{c.title}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={platformFilter} onValueChange={(v) => setPlatformFilter(v as Platform | 'all')}>
                        <SelectTrigger className="w-44 bg-white border-2 border-black font-bold shadow-sm focus:ring-0">
                            <SelectValue placeholder="Platform" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-2 border-black font-medium">
                            <SelectItem value="all">All Platforms</SelectItem>
                            <SelectItem value="instagram">Instagram</SelectItem>
                            <SelectItem value="facebook">Facebook</SelectItem>
                            <SelectItem value="google">Google Ads</SelectItem>
                            <SelectItem value="influencer">Influencer</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={qualityFilter} onValueChange={(v) => setQualityFilter(v as QualityTier)}>
                        <SelectTrigger className="w-44 bg-white border-2 border-black font-bold shadow-sm focus:ring-0">
                            <SelectValue placeholder="Quality" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-2 border-black font-medium">
                            {Object.entries(QUALITY_CONFIG).map(([key, config]) => (
                                <SelectItem key={key} value={key}>{config.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'newest' | 'oldest')}>
                        <SelectTrigger className="w-40 bg-white border-2 border-black font-bold shadow-sm focus:ring-0">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-2 border-black font-medium">
                            <SelectItem value="newest">Newest first</SelectItem>
                            <SelectItem value="oldest">Oldest first</SelectItem>
                        </SelectContent>
                    </Select>

                    {hasActiveFilters && (
                        <button
                            onClick={() => {
                                setCampaignFilter('all')
                                setPlatformFilter('all')
                                setQualityFilter('all')
                            }}
                            className="text-sm font-bold text-red-500 hover:text-black underline hover:no-underline transition-colors ml-auto"
                        >
                            Clear filters
                        </button>
                    )}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-32">
                        <Loader2 className="h-10 w-10 animate-spin text-purple-400" />
                    </div>
                ) : filteredCreatives.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center">
                        <div className="w-20 h-20 rounded-full bg-zinc-800/50 flex items-center justify-center mb-6">
                            <ImageIcon className="h-10 w-10 text-zinc-600" />
                        </div>
                        <h2 className="text-2xl font-black text-black mb-3 text-center">
                            {creatives.length === 0 ? 'No ad creatives yet' : 'No creatives match filters'}
                        </h2>
                        <p className="text-black/60 mb-8 max-w-md font-medium text-center">
                            {creatives.length === 0
                                ? 'Generate your first AI-powered ad creative to get started.'
                                : 'Try adjusting your filters to see more creatives.'}
                        </p>
                        {creatives.length === 0 && (
                            <Button
                                onClick={() => router.push('/brand/ads')}
                                className="bg-[#B4F056] text-black border-[3px] border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all font-bold px-8 py-6 text-lg"
                            >
                                <Sparkles className="h-5 w-5 mr-2" strokeWidth={2.5} />
                                Generate Your First Ad
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredCreatives.map(creative => (
                            <CreativeCard
                                key={creative.id}
                                creative={creative}
                                onRegenerate={() => handleRegenerate(creative)}
                                onDownload={() => handleDownload(creative)}
                                onImageClick={() => setLightboxImage(creative.imageUrl)}
                                regenerating={regenerating === creative.id}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Lightbox */}
            <Lightbox
                open={lightboxImage !== null}
                onClose={() => setLightboxImage(null)}
                imageUrl={lightboxImage || ''}
            />
        </div>
    )
}
