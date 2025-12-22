'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
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
    ChevronDown,
    AlertTriangle,
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

interface ImproveSuggestion {
    category: 'lighting' | 'composition' | 'product_clarity' | 'background'
    suggestion: string
    priority: 'high' | 'medium' | 'low'
    promptModifier: string
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

const PRIORITY_COLORS = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
}

const CATEGORY_LABELS: Record<string, string> = {
    lighting: 'Lighting',
    composition: 'Composition',
    product_clarity: 'Product Clarity',
    background: 'Background',
}

// ═══════════════════════════════════════════════════════════════
// QUALITY BADGE COMPONENT
// ═══════════════════════════════════════════════════════════════

function QualityBadge({ score }: { score: number }) {
    let color = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
    let label = 'Needs Work'

    if (score >= 80) {
        color = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800'
        label = 'High Quality'
    } else if (score >= 60) {
        color = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
        label = 'Medium Quality'
    }

    return (
        <div
            className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                color
            )}
            title="AI quality score based on composition, clarity, and brand safety"
        >
            <span className="font-bold">{score}</span>
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
    onImprove,
    onDownload,
    onAssign,
    onImageClick,
    regenerating,
}: {
    creative: AdCreative
    onRegenerate: () => void
    onImprove: () => void
    onDownload: () => void
    onAssign: () => void
    onImageClick: () => void
    regenerating: boolean
}) {
    const [showAllCopy, setShowAllCopy] = useState(false)

    const canRegenerate = creative.regenerationCount < creative.maxRegenerations
    const relativeDate = getRelativeDate(creative.createdAt)

    return (
        <Card className="overflow-hidden group">
            {/* Image */}
            <div
                className="relative aspect-[4/5] cursor-pointer overflow-hidden"
                onClick={onImageClick}
            >
                <img
                    src={creative.imageUrl}
                    alt="Ad creative"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            </div>

            <CardContent className="p-4 space-y-3">
                {/* Metadata Row */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <span>{creative.campaign?.title || 'Unassigned'}</span>
                        <span>•</span>
                        <span>{relativeDate}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        {creative.platforms.map(p => (
                            <span key={p} className="text-zinc-400">
                                {PLATFORM_ICONS[p]}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Quality Badge */}
                <QualityBadge score={creative.qualityScore} />

                {/* Copy Preview */}
                {creative.copyVariants.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                            {creative.copyVariants[0]}
                        </p>
                        {creative.copyVariants.length > 1 && (
                            <button
                                onClick={() => setShowAllCopy(!showAllCopy)}
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                                {showAllCopy ? 'Show less' : `View all ${creative.copyVariants.length} variants`}
                                <ChevronDown className={cn("h-3 w-3 transition-transform", showAllCopy && "rotate-180")} />
                            </button>
                        )}
                        {showAllCopy && (
                            <div className="space-y-2 pt-1">
                                {creative.copyVariants.slice(1).map((copy, i) => (
                                    <p key={i} className="text-sm text-zinc-500 dark:text-zinc-500">
                                        {copy}
                                    </p>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={onRegenerate}
                        disabled={!canRegenerate || regenerating}
                        className="flex-1"
                        title={!canRegenerate ? 'Regeneration limit reached' : undefined}
                    >
                        {regenerating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Regen
                            </>
                        )}
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={onImprove}
                        className="flex-1"
                    >
                        <Sparkles className="h-4 w-4 mr-1" />
                        Improve
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={onDownload}
                        className="shrink-0"
                    >
                        <Download className="h-4 w-4" />
                    </Button>
                    {!creative.campaign && (
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={onAssign}
                            className="shrink-0"
                        >
                            <Tag className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                {!canRegenerate && (
                    <p className="text-xs text-zinc-500 text-center">
                        Regeneration limit reached
                    </p>
                )}
            </CardContent>
        </Card>
    )
}

// ═══════════════════════════════════════════════════════════════
// IMPROVE MODAL COMPONENT
// ═══════════════════════════════════════════════════════════════

function ImproveModal({
    open,
    onClose,
    creative,
    onApply,
}: {
    open: boolean
    onClose: () => void
    creative: AdCreative | null
    onApply: (suggestion: ImproveSuggestion) => void
}) {
    const [suggestions, setSuggestions] = useState<ImproveSuggestion[]>([])
    const [loading, setLoading] = useState(false)
    const [applying, setApplying] = useState<string | null>(null)

    useEffect(() => {
        if (open && creative) {
            fetchSuggestions()
        }
    }, [open, creative])

    const fetchSuggestions = async () => {
        if (!creative) return

        setLoading(true)
        try {
            const res = await fetch('/api/ads/improve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adImage: creative.imageUrl }),
            })

            if (res.ok) {
                const data = await res.json()
                setSuggestions(data.suggestions || [])
            }
        } catch (error) {
            console.error('Failed to fetch suggestions:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleApply = async (suggestion: ImproveSuggestion) => {
        setApplying(suggestion.suggestion)
        await onApply(suggestion)
        setApplying(null)
        onClose()
    }

    // Group suggestions by category
    const groupedSuggestions = suggestions.reduce((acc, s) => {
        if (!acc[s.category]) acc[s.category] = []
        acc[s.category].push(s)
        return acc
    }, {} as Record<string, ImproveSuggestion[]>)

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Improve This Creative</DialogTitle>
                    <DialogDescription>
                        AI-generated suggestions to enhance your ad
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                    </div>
                ) : suggestions.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500">
                        <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No suggestions available for this creative</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(groupedSuggestions).map(([category, items]) => (
                            <div key={category} className="space-y-3">
                                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                                    {CATEGORY_LABELS[category] || category}
                                </h3>
                                <div className="space-y-2">
                                    {items.map((suggestion, i) => (
                                        <div
                                            key={i}
                                            className="flex items-start gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={cn(
                                                        "text-xs font-medium px-2 py-0.5 rounded-full",
                                                        PRIORITY_COLORS[suggestion.priority]
                                                    )}>
                                                        {suggestion.priority.charAt(0).toUpperCase() + suggestion.priority.slice(1)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                                    {suggestion.suggestion}
                                                </p>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => handleApply(suggestion)}
                                                disabled={applying !== null}
                                            >
                                                {applying === suggestion.suggestion ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    'Apply'
                                                )}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </DialogContent>
        </Dialog>
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

    return (
        <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <button
                className="absolute top-4 right-4 text-white hover:text-zinc-300 transition-colors"
                onClick={onClose}
            >
                <X className="h-8 w-8" />
            </button>
            <img
                src={imageUrl}
                alt="Creative preview"
                className="max-w-full max-h-full object-contain"
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
    const [improveModal, setImproveModal] = useState<AdCreative | null>(null)
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

    const handleImprove = async (suggestion: ImproveSuggestion) => {
        if (!improveModal) return

        try {
            const res = await fetch(`/api/ads/${improveModal.id}/regenerate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ promptModifier: suggestion.promptModifier }),
            })

            if (!res.ok) {
                throw new Error('Improvement failed')
            }

            toast.success('Creative improved!')
            // Refresh
            const refreshRes = await fetch('/api/ads/creatives')
            const refreshData = await refreshRes.json()
            setCreatives(refreshData.creatives || [])
        } catch (error) {
            toast.error('Improvement failed')
        }
    }

    const handleDownload = async (creative: AdCreative) => {
        try {
            const res = await fetch(creative.imageUrl)
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `creative-${creative.id}.jpg`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
            toast.success('Download started')
        } catch (error) {
            toast.error('Download failed')
        }
    }

    const hasActiveFilters = campaignFilter !== 'all' || platformFilter !== 'all' || qualityFilter !== 'all'

    return (
        <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900 pt-24 pb-12">
            <div className="container mx-auto px-4 max-w-7xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                            Ad Creatives
                        </h1>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            All generated ad creatives across your campaigns
                        </p>
                    </div>
                    <Button onClick={() => router.push('/brand/ads')} size="lg">
                        <Plus className="h-5 w-5 mr-2" />
                        Generate New Ad
                    </Button>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-wrap items-center gap-3 mb-8 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <Select value={campaignFilter} onValueChange={setCampaignFilter}>
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="Campaign" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Campaigns</SelectItem>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {campaigns.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={platformFilter} onValueChange={(v) => setPlatformFilter(v as Platform | 'all')}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Platform" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Platforms</SelectItem>
                            <SelectItem value="instagram">Instagram</SelectItem>
                            <SelectItem value="facebook">Facebook</SelectItem>
                            <SelectItem value="google">Google Ads</SelectItem>
                            <SelectItem value="influencer">Influencer</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={qualityFilter} onValueChange={(v) => setQualityFilter(v as QualityTier)}>
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder="Quality" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(QUALITY_CONFIG).map(([key, config]) => (
                                <SelectItem key={key} value={key}>{config.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'newest' | 'oldest')}>
                        <SelectTrigger className="w-36">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
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
                            className="text-sm text-primary hover:underline ml-auto"
                        >
                            Clear filters
                        </button>
                    )}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="h-10 w-10 animate-spin text-zinc-400" />
                    </div>
                ) : filteredCreatives.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <ImageIcon className="h-16 w-16 text-zinc-300 dark:text-zinc-600 mb-4" />
                        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                            {creatives.length === 0 ? 'No ad creatives yet' : 'No creatives match your filters'}
                        </h2>
                        <p className="text-zinc-500 dark:text-zinc-400 mb-6 max-w-md">
                            {creatives.length === 0
                                ? 'Generate your first ad to get started.'
                                : 'Try adjusting your filters to see more creatives.'}
                        </p>
                        {creatives.length === 0 && (
                            <Button onClick={() => router.push('/brand/ads')}>
                                Generate Ad
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
                                onImprove={() => setImproveModal(creative)}
                                onDownload={() => handleDownload(creative)}
                                onAssign={() => toast.info('Campaign assignment coming soon')}
                                onImageClick={() => setLightboxImage(creative.imageUrl)}
                                regenerating={regenerating === creative.id}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            <ImproveModal
                open={improveModal !== null}
                onClose={() => setImproveModal(null)}
                creative={improveModal}
                onApply={handleImprove}
            />

            <Lightbox
                open={lightboxImage !== null}
                onClose={() => setLightboxImage(null)}
                imageUrl={lightboxImage || ''}
            />
        </div>
    )
}
