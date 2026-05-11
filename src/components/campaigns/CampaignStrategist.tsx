'use client'

import { useState, useRef, useEffect, useCallback, type KeyboardEvent, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppImage } from '@/components/ui/AppImage'
import {
    Send,
    Bot,
    User,
    ArrowLeft,
    Sparkles,
    CheckCircle2,
    Loader2,
    Rocket,
    ChevronRight,
    ImagePlus,
    X,
    Download,
    Wand2,
    RefreshCw,
    RotateCcw,
} from 'lucide-react'
import { toast } from '@/lib/simple-sonner'
import type {
    StrategistPhase,
    StrategistMessage,
    CampaignStrategyOutput,
    GeneratedCampaignImage,
    PickedProduct,
    CreatorSuggestion,
    PerformanceBrief,
} from '@/lib/campaigns/campaign-strategist-types'
import { STRATEGIST_PHASES } from '@/lib/campaigns/campaign-strategist-types'

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   AUTO-CONTINUATION MESSAGES
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const AUTO_CONTINUE_MESSAGES: Partial<Record<StrategistPhase, string>> = {
    researcher: '[SYSTEM: Auto-triggered Research Phase. Deliver the full research brief now. Do not ask the user to wait.]',
    ideator: '[SYSTEM: Auto-triggered Ideation Phase. Based on the research, deliver content ideas, hooks, angles, AND generate 1-2 campaign concept visuals by including [IMAGE_GEN:detailed description] markers in your response. Visual generation is MANDATORY in this phase.]',
    // scripter & analyst are NOT auto-triggered — user reviews ideation first
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PHASE PROGRESS BAR
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function PhaseProgressBar({ currentPhase }: { currentPhase: StrategistPhase }) {
    const currentIndex = STRATEGIST_PHASES.findIndex((p) => p.id === currentPhase)

    return (
        <div className="flex items-center gap-0.5 overflow-x-auto hide-scrollbar">
            {STRATEGIST_PHASES.map((phase, i) => {
                const isActive = i === currentIndex
                const isDone = i < currentIndex
                const isFuture = i > currentIndex

                return (
                    <div key={phase.id} className="flex items-center gap-0.5 shrink-0">
                        <div
                            className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full transition-all duration-500 ${isActive
                                ? 'bg-[#B4F056] text-black scale-105'
                                : isDone
                                    ? 'bg-black/8 text-black/70'
                                    : 'text-black/25'
                                }`}
                        >
                            <span className={`text-sm transition-transform duration-300 ${isActive ? 'animate-pulse' : ''}`}>
                                {isDone ? '✓' : phase.emoji}
                            </span>
                            <span className={`hidden sm:inline ${isFuture ? 'text-black/25' : ''}`}>
                                {phase.label}
                            </span>
                        </div>
                        {i < STRATEGIST_PHASES.length - 1 && (
                            <ChevronRight
                                className={`w-3 h-3 shrink-0 transition-colors duration-300 ${isDone ? 'text-black/30' : 'text-black/10'}`}
                                strokeWidth={3}
                            />
                        )}
                    </div>
                )
            })}
        </div>
    )
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CAMPAIGN STRATEGY CARD
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function CampaignStrategyCard({
    payload,
    createdId,
    isCreating,
    onApprove,
}: {
    payload: CampaignStrategyOutput
    createdId: string | null
    isCreating: boolean
    onApprove: () => void
}) {
    return (
        <div className="bg-white border border-black/8 rounded-2xl overflow-hidden shadow-lg animate-slideUp">
            <div className="bg-gradient-to-r from-[#B4F056] to-[#d4ff8a] px-5 py-3 flex items-center gap-2">
                <Rocket className="w-4 h-4" strokeWidth={2.5} />
                <h3 className="text-xs font-black uppercase tracking-wider">Campaign Strategy Ready</h3>
                <span className="ml-auto text-[9px] font-black uppercase bg-black/10 px-2 py-0.5 rounded-full tracking-wider">Draft</span>
            </div>

            <div className="p-5 space-y-3">
                <div>
                    <h4 className="text-base font-black text-black">{payload.title}</h4>
                    <p className="text-sm text-black/50 mt-1 leading-relaxed">{payload.brief}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-black/[0.03] rounded-lg p-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-black/40 mb-1">Goal</p>
                        <p className="text-sm font-bold capitalize">{payload.goal}</p>
                    </div>
                    <div className="bg-black/[0.03] rounded-lg p-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-black/40 mb-1">Budget</p>
                        <p className="text-sm font-bold">
                            {payload.budget?.budget_type === 'daily'
                                ? `₹${payload.budget?.daily_budget?.toLocaleString() ?? '—'}/day`
                                : `₹${payload.budget?.total_budget?.toLocaleString() ?? '—'} total`}
                        </p>
                    </div>
                </div>

                {payload.audience && (
                    <div className="bg-black/[0.03] rounded-lg p-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-black/40 mb-1">Target Audience</p>
                        <p className="text-sm font-medium text-black/70">
                            {payload.audience.gender && payload.audience.gender !== 'Any' ? `${payload.audience.gender}, ` : ''}
                            {payload.audience.age_min && payload.audience.age_max ? `${payload.audience.age_min}-${payload.audience.age_max}y` : ''}
                            {payload.audience.location ? ` in ${payload.audience.location}` : ''}
                            {payload.audience.interests?.length ? ` · ${payload.audience.interests.slice(0, 4).join(', ')}` : ''}
                        </p>
                    </div>
                )}

                {payload.content_angles && payload.content_angles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                        {payload.content_angles.slice(0, 5).map((angle, i) => (
                            <span key={i} className="text-[11px] font-bold bg-[#FFD93D]/50 px-2.5 py-1 rounded-full">
                                {typeof angle === 'string' ? angle : (angle as { angle?: string }).angle ?? ''}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="px-5 pb-5">
                {createdId ? (
                    <Link
                        href="/brand/campaigns"
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#B4F056] border-2 border-black rounded-xl font-black uppercase text-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        Draft Campaign Saved — View All
                    </Link>
                ) : (
                    <button type="button"
                        onClick={onApprove}
                        disabled={isCreating}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#B4F056] border-2 border-black rounded-xl font-black uppercase text-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isCreating ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Creating Campaign...</>
                        ) : (
                            <><Rocket className="w-4 h-4" /> Approve & Create Campaign</>
                        )}
                    </button>
                )}
            </div>
        </div>
    )
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   GENERATED IMAGE GALLERY
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function GeneratedImageGallery({ images, onRegenerate }: { images: GeneratedCampaignImage[]; onRegenerate?: (description: string) => void }) {
    const handleDownload = (image: GeneratedCampaignImage, index: number) => {
        const a = document.createElement('a')
        a.href = image.imageBase64
        a.download = `campaign-visual-${index + 1}.png`
        a.click()
    }

    return (
        <div className="space-y-3 mt-3">
            <div className="flex items-center gap-2">
                <Wand2 className="w-3.5 h-3.5 text-[#A78BFA]" strokeWidth={2.5} />
                <p className="text-[10px] font-black uppercase tracking-wider text-[#A78BFA]">
                    AI Generated Campaign Visuals
                </p>
            </div>
            <div className={`grid gap-3 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {images.map((img, idx) => (
                    <div key={idx} className="relative aspect-square group overflow-hidden rounded-xl border border-black/10 shadow-sm">
                        <AppImage
                            src={img.imageBase64}
                            alt={img.description}
                            className="object-cover transition-transform group-hover:scale-[1.02]"
                            sizes="(min-width: 768px) 33vw, 100vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                            <p className="text-[11px] font-medium text-white/90 line-clamp-2 mb-2">{img.description}</p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleDownload(img, idx)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 rounded-lg text-[10px] font-black uppercase text-black hover:bg-white transition-colors"
                                >
                                    <Download className="w-3 h-3" />
                                    Save
                                </button>
                                {onRegenerate && (
                                    <button
                                        type="button"
                                        onClick={() => onRegenerate(img.description)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#A78BFA]/90 rounded-lg text-[10px] font-black uppercase text-white hover:bg-[#A78BFA] transition-colors"
                                    >
                                        <RefreshCw className="w-3 h-3" />
                                        Regenerate
                                    </button>
                                )}
                            </div>
                        </div>
                        {img.preset && (
                            <span className="absolute top-2 left-2 text-[9px] font-black uppercase bg-black/60 text-white px-2 py-0.5 rounded-full">
                                {img.preset}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   IMAGE UPLOAD PREVIEW
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function ImageUploadPreview({ images, onRemove }: { images: string[]; onRemove: (index: number) => void }) {
    if (images.length === 0) return null

    return (
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            {images.map((img, i) => (
                <div key={i} className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 border-black/15 group">
                    <AppImage src={img} alt={`Upload ${i + 1}`} className="object-cover" sizes="64px" />
                    <button
                        type="button"
                        onClick={() => onRemove(i)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    >
                        <X className="w-3 h-3" strokeWidth={3} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent h-4" />
                </div>
            ))}
        </div>
    )
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TYPING INDICATOR
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function TypingIndicator({ phase, isGeneratingImage }: { phase: StrategistPhase; isGeneratingImage?: boolean }) {
    const phaseInfo = STRATEGIST_PHASES.find((p) => p.id === phase)
    const label = isGeneratingImage
        ? '🎨 Generating campaign visual...'
        : phaseInfo
            ? `${phaseInfo.emoji} ${phaseInfo.description}`
            : 'Thinking'

    return (
        <div className="flex gap-3 items-end animate-fadeIn">
            <div className="w-8 h-8 rounded-full bg-[#B4F056] flex items-center justify-center flex-shrink-0 mb-0.5">
                <Bot className="w-4 h-4 text-black" strokeWidth={2.5} />
            </div>
            <div className="bg-white border border-black/8 rounded-2xl rounded-bl-md px-5 py-3.5 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                        <span className="w-2 h-2 bg-[#B4F056] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-[#B4F056] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-[#B4F056] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <p className="text-[12px] font-semibold text-black/40">{label}</p>
                </div>
            </div>
        </div>
    )
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SUGGESTION CHIPS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const PHASE_SUGGESTIONS: Partial<Record<StrategistPhase, string[]>> = {
    intake: [
        'Launching a new product',
        'Want more sales',
        'Need awareness for our brand',
        'Budget around ₹50K/month',
    ],
    ideator: [
        '✅ Looks great — write the scripts now',
        '🎨 Generate more campaign visuals',
        'I want lifestyle images with models',
        'Try a different visual style',
        'Tweak the content angles',
    ],
    scripter: [
        '✅ Scripts look good — optimize & finalize',
        'More script variants',
        'Make the hooks punchier',
        'Add a TikTok-specific version',
    ],
    analyst: [
        'Finalize the campaign',
        'More A/B test ideas',
    ],
    complete: [
        'Refine targeting',
        'More ad variants',
        'Generate a campaign visual for this strategy',
        'Adjust budget strategy',
    ],
}

function SuggestionChips({
    phase,
    onSelect,
    disabled,
}: {
    phase: StrategistPhase
    onSelect: (text: string) => void
    disabled: boolean
}) {
    const suggestions = PHASE_SUGGESTIONS[phase]
    if (!suggestions || suggestions.length === 0) return null

    return (
        <div className="flex flex-wrap gap-2">
            {suggestions.map((text, i) => (
                <button type="button"
                    key={i}
                    onClick={() => onSelect(text)}
                    disabled={disabled}
                    className="text-[12px] font-semibold border border-black/12 px-4 py-2 bg-white hover:bg-[#B4F056]/20 hover:border-[#B4F056] transition-all disabled:opacity-30 disabled:cursor-not-allowed rounded-full text-black/50 hover:text-black"
                >
                    {text}
                </button>
            ))}
        </div>
    )
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PHASE TRANSITION BANNER
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function PhaseTransitionBanner({ phase }: { phase: StrategistPhase }) {
    const phaseInfo = STRATEGIST_PHASES.find((p) => p.id === phase)
    if (!phaseInfo) return null

    return (
        <div className="flex items-center gap-3 animate-fadeIn">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#B4F056] to-transparent" />
            <div className="flex items-center gap-1.5 px-4 py-1.5 bg-[#B4F056]/15 rounded-full">
                <span className="text-sm">{phaseInfo.emoji}</span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-black/60">{phaseInfo.label}</span>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-[#B4F056] via-[#B4F056] to-transparent" />
        </div>
    )
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MESSAGE RENDERER (Markdown-lite)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function renderMarkdown(content: string) {
    const cleaned = content.replace(/```campaign_create[\s\S]*?```/g, '').trim()
    const lines = cleaned.split('\n')
    const elements: React.ReactNode[] = []
    let i = 0

    while (i < lines.length) {
        const line = lines[i]

        if (line.startsWith('### ')) {
            elements.push(
                <h4 key={i} className="text-xs font-black uppercase tracking-widest text-black/45 mt-5 mb-2">
                    {line.slice(4)}
                </h4>,
            )
        } else if (line.startsWith('## ')) {
            elements.push(
                <h3 key={i} className="text-[15px] font-black text-black mt-5 mb-2 pb-1.5 border-b border-black/6">
                    {line.slice(3)}
                </h3>,
            )
        } else if (line.startsWith('# ')) {
            elements.push(
                <h2 key={i} className="text-lg font-black text-black mt-4 mb-3">
                    {line.slice(2)}
                </h2>,
            )
        }
        else if (/^\d+\.\s/.test(line)) {
            elements.push(
                <p key={i} className="text-[13px] font-medium ml-1 mb-1.5 leading-relaxed">
                    {formatInlineMarkdown(line)}
                </p>,
            )
        }
        else if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ')) {
            elements.push(
                <p key={i} className="text-[13px] font-medium ml-3 mb-1 leading-relaxed flex items-start gap-2">
                    <span className="inline-block w-1.5 h-1.5 bg-[#B4F056] rounded-full mt-[7px] shrink-0" />
                    <span>{formatInlineMarkdown(line.replace(/^[-•*]\s/, ''))}</span>
                </p>,
            )
        }
        else if (line.match(/^\s+[-•*]\s/)) {
            elements.push(
                <p key={i} className="text-[13px] font-medium ml-7 mb-1 leading-relaxed text-black/65 flex items-start gap-2">
                    <span className="inline-block w-1 h-1 bg-black/20 rounded-full mt-[8px] shrink-0" />
                    <span>{formatInlineMarkdown(line.trim().replace(/^[-•*]\s/, ''))}</span>
                </p>,
            )
        }
        else if (line.match(/^-{3,}$/) || line.match(/^_{3,}$/)) {
            elements.push(<hr key={i} className="border-t border-black/6 my-4" />)
        }
        else if (line.trim()) {
            elements.push(
                <p key={i} className="text-[13px] font-medium leading-[1.75] mb-1.5 text-black/75">
                    {formatInlineMarkdown(line)}
                </p>,
            )
        }
        else {
            elements.push(<div key={i} className="h-2" />)
        }

        i++
    }

    return <div>{elements}</div>
}

function formatInlineMarkdown(text: string): React.ReactNode {
    const parts: React.ReactNode[] = []
    let remaining = text
    let key = 0

    while (remaining.length > 0) {
        const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
        const codeMatch = remaining.match(/`(.+?)`/)
        const italicMatch = remaining.match(/(?<!\*)\*([^*]+?)\*(?!\*)/)

        const matches = [
            boldMatch ? { idx: remaining.indexOf(boldMatch[0]), match: boldMatch, type: 'bold' } : null,
            codeMatch ? { idx: remaining.indexOf(codeMatch[0]), match: codeMatch, type: 'code' } : null,
            italicMatch ? { idx: remaining.indexOf(italicMatch[0]), match: italicMatch, type: 'italic' } : null,
        ].filter(Boolean) as Array<{ idx: number; match: RegExpMatchArray; type: string }>

        if (matches.length === 0) { parts.push(remaining); break }

        matches.sort((a, b) => a.idx - b.idx)
        const earliest = matches[0]

        if (earliest.idx > 0) parts.push(remaining.slice(0, earliest.idx))

        if (earliest.type === 'bold') {
            parts.push(<strong key={key++} className="font-bold text-black">{earliest.match[1]}</strong>)
        } else if (earliest.type === 'code') {
            parts.push(<code key={key++} className="bg-black/5 px-1.5 py-0.5 text-[12px] font-mono rounded">{earliest.match[1]}</code>)
        } else if (earliest.type === 'italic') {
            parts.push(<em key={key++} className="italic">{earliest.match[1]}</em>)
        }

        remaining = remaining.slice(earliest.idx + earliest.match[0].length)
    }

    return <>{parts}</>
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PRODUCT PICKER MODAL
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

interface CatalogProduct {
    id: string
    name: string
    description?: string | null
    category?: string | null
    price?: number | string | null
    cover_image?: string | null
    images?: string[] | null
}

function ProductPickerModal({
    open,
    onClose,
    onPick,
}: {
    open: boolean
    onClose: () => void
    onPick: (products: PickedProduct[]) => void
}) {
    const [products, setProducts] = useState<CatalogProduct[]>([])
    const [loading, setLoading] = useState(false)
    const [selected, setSelected] = useState<Set<string>>(new Set())

    useEffect(() => {
        if (!open) return
        setLoading(true)
        fetch('/api/brand/products', { credentials: 'include' })
            .then((r) => r.json())
            .then((d) => setProducts(d.products || []))
            .catch(() => toast.error('Failed to load your products'))
            .finally(() => setLoading(false))
    }, [open])

    if (!open) return null

    const toggle = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const confirm = () => {
        const picked: PickedProduct[] = products
            .filter((p) => selected.has(p.id))
            .map((p) => ({
                id: p.id,
                name: p.name,
                description: p.description,
                category: p.category,
                price: p.price ? Number(p.price) : null,
                coverImage: p.cover_image || p.images?.[0] || null,
            }))
        if (picked.length === 0) {
            toast.error('Pick at least one product')
            return
        }
        onPick(picked)
        setSelected(new Set())
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-black/10">
                <div className="px-5 py-4 border-b border-black/8 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-wider">Use my products</h3>
                        <p className="text-[11px] text-black/50 mt-0.5">Pick from your Kiwikoo catalog</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-6 h-6 animate-spin text-black/30" />
                        </div>
                    ) : products.length === 0 ? (
                        <div className="text-center py-16">
                            <p className="text-sm font-semibold text-black/60 mb-2">No products in your catalog yet</p>
                            <Link href="/brand/products" className="text-[12px] text-[#A78BFA] hover:underline font-bold">
                                Add products →
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {products.map((p) => {
                                const img = p.cover_image || p.images?.[0]
                                const isSelected = selected.has(p.id)
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => toggle(p.id)}
                                        className={`text-left relative rounded-xl overflow-hidden border-2 transition-all ${isSelected ? 'border-[#B4F056] shadow-md' : 'border-black/10 hover:border-black/30'}`}
                                    >
                                        <div className="aspect-square bg-black/[0.04] relative">
                                            {img ? (
                                                <AppImage src={img} alt={p.name} fill className="object-cover" sizes="160px" />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center text-black/20">
                                                    <ImagePlus className="w-8 h-8" />
                                                </div>
                                            )}
                                            {isSelected && (
                                                <div className="absolute top-2 right-2 w-6 h-6 bg-[#B4F056] rounded-full flex items-center justify-center shadow">
                                                    <CheckCircle2 className="w-4 h-4" strokeWidth={3} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="px-2 py-2">
                                            <p className="text-[11px] font-bold line-clamp-1">{p.name}</p>
                                            {p.price ? (
                                                <p className="text-[10px] text-black/50 mt-0.5">₹{Number(p.price).toLocaleString('en-IN')}</p>
                                            ) : null}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="px-5 py-3 border-t border-black/8 flex items-center justify-between gap-3 bg-black/[0.02]">
                    <p className="text-[12px] font-semibold text-black/50">
                        {selected.size > 0 ? `${selected.size} selected` : 'Select up to 10 products'}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-[12px] font-bold text-black/60 hover:bg-black/5 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirm}
                            disabled={selected.size === 0}
                            className="px-5 py-2 text-[12px] font-black bg-[#B4F056] border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
                        >
                            Use selected
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PICKED PRODUCT CHIPS (shown inside user message)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function PickedProductChips({ products }: { products: PickedProduct[] }) {
    if (!products.length) return null
    return (
        <div className="flex flex-wrap gap-2 mb-3">
            {products.map((p) => (
                <div key={p.id} className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full pl-1 pr-3 py-1 border border-white/20">
                    {p.coverImage ? (
                        <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                            <AppImage src={p.coverImage} alt={p.name} width={24} height={24} className="object-cover w-full h-full" sizes="24px" />
                        </div>
                    ) : (
                        <div className="w-6 h-6 rounded-full bg-white/20" />
                    )}
                    <span className="text-[11px] font-bold whitespace-nowrap">{p.name}</span>
                    {p.price ? <span className="text-[10px] opacity-70">₹{p.price.toLocaleString('en-IN')}</span> : null}
                </div>
            ))}
        </div>
    )
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CREATOR SUGGESTION CARDS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function CreatorSuggestionCards({ creators }: { creators: CreatorSuggestion[] }) {
    const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set())
    const [invitingId, setInvitingId] = useState<string | null>(null)

    if (!creators.length) return null

    const inviteCreator = async (creatorId: string) => {
        if (invitedIds.has(creatorId) || invitingId) return
        setInvitingId(creatorId)
        try {
            const res = await fetch('/api/collaborations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    influencerId: creatorId,
                    notes: 'Auto-invitation sent via Kiwikoo Campaign Strategist',
                }),
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.error || 'Failed to send invite')
            }
            setInvitedIds((prev) => new Set([...prev, creatorId]))
            toast.success('Invite sent — creator will see it in their dashboard')
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to send invite')
        } finally {
            setInvitingId(null)
        }
    }

    const inviteAll = async () => {
        const remaining = creators.slice(0, 6).filter((c) => !invitedIds.has(c.creatorId))
        if (remaining.length === 0) return
        toast.success(`Sending ${remaining.length} invites...`)
        for (const c of remaining) {
            // Sequentially to avoid hammering the API
            // eslint-disable-next-line no-await-in-loop
            await inviteCreator(c.creatorId)
        }
    }

    const allInvited = creators.slice(0, 6).every((c) => invitedIds.has(c.creatorId))

    return (
        <div className="mt-4 bg-gradient-to-br from-[#A78BFA]/10 to-[#B4F056]/10 rounded-xl p-4 border border-black/8">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Sparkles className="w-3.5 h-3.5 text-[#A78BFA]" strokeWidth={2.5} />
                <p className="text-[11px] font-black uppercase tracking-wider text-black/70">
                    Creators on Kiwikoo who fit
                </p>
                <span className="text-[10px] font-bold text-black/40">{creators.length} matches</span>
                <button
                    type="button"
                    onClick={inviteAll}
                    disabled={allInvited || invitingId !== null}
                    className="ml-auto text-[10px] font-black uppercase tracking-wider px-3 py-1.5 bg-[#B4F056] border-2 border-black rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none transition-all"
                >
                    {allInvited ? 'All invited ✓' : 'Invite all'}
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {creators.slice(0, 6).map((c) => {
                    const invited = invitedIds.has(c.creatorId)
                    const inviting = invitingId === c.creatorId
                    const v = c.vetting
                    const trustBg =
                        v?.trustTone === 'green' ? 'bg-[#B4F056]'
                            : v?.trustTone === 'yellow' ? 'bg-[#FFD93D]'
                                : v?.trustTone === 'orange' ? 'bg-[#FF8C69]'
                                    : v?.trustTone === 'red' ? 'bg-red-300'
                                        : 'bg-black/10'
                    return (
                        <div key={c.creatorId} className="bg-white rounded-lg p-3 border border-black/6 hover:border-black/15 transition-colors">
                            <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                        <p className="text-[12px] font-black truncate">{c.name || 'Creator'}</p>
                                        <span className="text-[10px] font-black bg-black text-white px-1.5 py-0.5 whitespace-nowrap">
                                            {c.matchScore}% fit
                                        </span>
                                        {v && (
                                            <span
                                                className={`text-[9px] font-black uppercase tracking-widest ${trustBg} border border-black px-1.5 py-0.5 whitespace-nowrap`}
                                                title={`Trust ${v.trustScore}/100 · Authenticity ${v.authenticityScore} · Activity ${v.activityScore}`}
                                            >
                                                ✓ {v.trustLabel}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-black/45 line-clamp-2 mb-1.5">{c.reason || c.bio || 'Strong audience match'}</p>
                                    <div className="flex items-center gap-2 text-[10px] text-black/50">
                                        {c.followers != null && (
                                            <span className="font-bold">{formatFollowers(c.followers)} followers</span>
                                        )}
                                        {c.pricePerPost != null && (
                                            <span>· ₹{c.pricePerPost.toLocaleString('en-IN')}/post</span>
                                        )}
                                    </div>
                                    {v?.flags && v.flags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                            {v.flags.slice(0, 2).map((f, idx) => (
                                                <span
                                                    key={idx}
                                                    className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 border ${f.level === 'warning'
                                                            ? 'bg-[#FF8C69]/20 border-[#FF8C69] text-black'
                                                            : f.level === 'positive'
                                                                ? 'bg-[#B4F056]/30 border-black/30 text-black'
                                                                : 'bg-black/5 border-black/30 text-black/60'
                                                        }`}
                                                    title={f.detail || f.label}
                                                >
                                                    {f.level === 'warning' ? '⚠' : f.level === 'positive' ? '✓' : '·'} {f.label}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {(!v?.flags?.length && c.niches.length > 0) && (
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                            {c.niches.slice(0, 3).map((n) => (
                                                <span key={n} className="text-[9px] bg-black/5 text-black/55 px-1.5 py-0.5 rounded-full">
                                                    {n}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => inviteCreator(c.creatorId)}
                                    disabled={invited || inviting}
                                    className={`flex-shrink-0 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 border-2 border-black rounded-md transition-all ${invited
                                            ? 'bg-black/10 text-black/40 cursor-default'
                                            : 'bg-[#A78BFA]/15 hover:bg-[#A78BFA]/30 hover:-translate-y-0.5'
                                        }`}
                                >
                                    {invited ? '✓ Sent' : inviting ? '...' : 'Invite'}
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>

            {creators.length > 6 && (
                <p className="text-[11px] text-black/40 mt-3 text-center font-semibold">
                    +{creators.length - 6} more — refine the brief and I&apos;ll narrow it down
                </p>
            )}
        </div>
    )
}

function formatFollowers(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PERFORMANCE BRIEF CARD
   Indian D2C tracking infrastructure: targets + COD attribution.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function PerformanceBriefCard({ brief }: { brief: PerformanceBrief }) {
    const [copied, setCopied] = useState(false)
    const [showSurvey, setShowSurvey] = useState(false)
    const [showSnippet, setShowSnippet] = useState(false)
    const t = brief.targets

    const copySnippet = async () => {
        try {
            await navigator.clipboard.writeText(brief.codCheckoutSnippet)
            setCopied(true)
            toast.success('Snippet copied to clipboard')
            setTimeout(() => setCopied(false), 2000)
        } catch {
            toast.error('Could not copy')
        }
    }

    return (
        <div className="bg-white border-[3px] border-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] overflow-hidden">
            <div className="bg-gradient-to-r from-[#A78BFA]/30 to-[#FFD93D]/30 px-5 py-3 border-b-2 border-black">
                <p className="text-[11px] font-black uppercase tracking-widest">📊 Performance Brief</p>
                <p className="text-[10px] text-black/50 font-semibold mt-0.5">
                    Tracking + targets so you can measure ROI on day one
                </p>
            </div>

            {/* Targets */}
            <div className="p-5">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-black/50 mb-3">Targets</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
                    <TargetTile label="Target CAC" value={`₹${t.targetCAC.toLocaleString('en-IN')}`} tone="green" />
                    <TargetTile label="Target ROAS" value={`${t.targetROAS}x`} tone="purple" />
                    <TargetTile label="Conversions" value={String(t.conversionsNeeded)} tone="yellow" />
                    <TargetTile label="Conv rate" value={`${t.targetConversionRate}%`} tone="orange" />
                </div>
                <div
                    className={`text-[11px] font-bold p-3 border-2 border-black ${t.isAchievable ? 'bg-[#B4F056]/20' : 'bg-[#FF8C69]/20'
                        }`}
                >
                    {t.isAchievable ? '✅ ' : '⚠️ '}{t.reasoning}
                </div>
            </div>

            {/* Survey + COD Snippet */}
            <div className="border-t-2 border-black/10">
                <button
                    type="button"
                    onClick={() => setShowSurvey((v) => !v)}
                    className="w-full px-5 py-3 flex items-center justify-between hover:bg-black/[0.02] transition-colors"
                >
                    <div className="text-left">
                        <p className="text-[12px] font-black uppercase tracking-wider">Post-purchase survey</p>
                        <p className="text-[10px] text-black/50 font-semibold mt-0.5">
                            Capture COD attribution that click-tracking misses
                        </p>
                    </div>
                    <span className="text-[10px] font-black uppercase">{showSurvey ? 'Hide' : 'Show'}</span>
                </button>
                {showSurvey && (
                    <div className="px-5 pb-4 -mt-1">
                        <div className="bg-[#F9F8F4] border-2 border-black p-3">
                            <p className="text-sm font-black mb-2">{brief.postPurchaseSurvey.question}</p>
                            <ul className="space-y-1 text-xs text-black/70 font-semibold list-disc list-inside">
                                {brief.postPurchaseSurvey.options.map((opt, i) => (
                                    <li key={i}>{opt}</li>
                                ))}
                            </ul>
                        </div>
                        <p className="text-[10px] text-black/50 font-semibold mt-2 leading-relaxed">
                            {brief.postPurchaseSurvey.instruction}
                        </p>
                    </div>
                )}
            </div>

            <div className="border-t-2 border-black/10">
                <button
                    type="button"
                    onClick={() => setShowSnippet((v) => !v)}
                    className="w-full px-5 py-3 flex items-center justify-between hover:bg-black/[0.02] transition-colors"
                >
                    <div className="text-left">
                        <p className="text-[12px] font-black uppercase tracking-wider">COD attribution snippet</p>
                        <p className="text-[10px] text-black/50 font-semibold mt-0.5">
                            Drop into your checkout success page
                        </p>
                    </div>
                    <span className="text-[10px] font-black uppercase">{showSnippet ? 'Hide' : 'Show'}</span>
                </button>
                {showSnippet && (
                    <div className="px-5 pb-4 -mt-1">
                        <pre className="bg-black text-[#B4F056] text-[10px] font-mono p-3 overflow-x-auto border-2 border-black whitespace-pre-wrap leading-relaxed">
                            {brief.codCheckoutSnippet}
                        </pre>
                        <button
                            type="button"
                            onClick={copySnippet}
                            className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 border-2 border-black text-[10px] font-black uppercase tracking-wider transition-all ${copied
                                    ? 'bg-[#B4F056]'
                                    : 'bg-white hover:bg-[#FFD93D]/30 hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]'
                                }`}
                        >
                            {copied ? '✓ Copied' : 'Copy snippet'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

function TargetTile({ label, value, tone }: { label: string; value: string; tone: 'green' | 'purple' | 'yellow' | 'orange' }) {
    const bg =
        tone === 'green' ? 'bg-[#B4F056]'
            : tone === 'purple' ? 'bg-[#A78BFA]'
                : tone === 'yellow' ? 'bg-[#FFD93D]'
                    : 'bg-[#FF8C69]'
    return (
        <div className={`${bg} border-2 border-black p-2.5`}>
            <div className="text-base font-black break-words">{value}</div>
            <div className="text-[9px] font-black uppercase tracking-widest text-black/65 mt-0.5">{label}</div>
        </div>
    )
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MAIN COMPONENT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const INITIAL_MESSAGE: StrategistMessage = {
    role: 'assistant',
    content: `Hey 👋 I'm your campaign strategist. Let's build something that actually performs — quick chat, no fluff.

You can pick products from your Kiwikoo catalog with the **Use my products** button, or just tell me what you're promoting. I'll pull in matching creators and generate sample ad visuals as we go.

So — what are we launching?`,

    phase: 'intake',
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CHAT PERSISTENCE
   Saves conversation state to localStorage so a half-finished
   chat survives page reloads / navigation. Strips heavy base64
   images before persisting to stay under storage quota.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const STORAGE_KEY = 'kiwikoo:campaign-strategist:v1'
const STORAGE_TTL_MS = 24 * 60 * 60 * 1000 // 24h

interface PersistedState {
    savedAt: number
    messages: StrategistMessage[]
    phase: StrategistPhase
    campaignPayload: CampaignStrategyOutput | null
    createdCampaignId: string | null
    phaseTransitions: number[]
}

function stripHeavyContent(messages: StrategistMessage[]): StrategistMessage[] {
    return messages.map((m) => {
        const out: StrategistMessage = { ...m }
        // Drop base64 image payloads — they'd blow up localStorage quota
        if (out.images?.length) out.images = undefined
        if (out.generatedImages?.length) {
            out.generatedImages = out.generatedImages.map((g) => ({ ...g, imageBase64: '' }))
        }
        return out
    })
}

function loadPersistedState(): PersistedState | null {
    if (typeof window === 'undefined') return null
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as PersistedState
        if (!parsed?.savedAt || Date.now() - parsed.savedAt > STORAGE_TTL_MS) {
            window.localStorage.removeItem(STORAGE_KEY)
            return null
        }
        if (!Array.isArray(parsed.messages) || parsed.messages.length === 0) return null
        return parsed
    } catch {
        return null
    }
}

export default function CampaignStrategist() {
    const router = useRouter()

    // Initial state matches server render. We hydrate from localStorage AFTER
    // mount in an effect to avoid hydration mismatches.
    const [messages, setMessages] = useState<StrategistMessage[]>([INITIAL_MESSAGE])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [phase, setPhase] = useState<StrategistPhase>('intake')
    const [campaignPayload, setCampaignPayload] = useState<CampaignStrategyOutput | null>(null)
    const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null)
    const [isCreatingCampaign, setIsCreatingCampaign] = useState(false)
    const [phaseTransitions, setPhaseTransitions] = useState<Set<number>>(new Set())
    const [hasHydrated, setHasHydrated] = useState(false)
    const [pendingImages, setPendingImages] = useState<string[]>([])
    const [storedProductImages, setStoredProductImages] = useState<string[]>([])
    const [isGeneratingImage, setIsGeneratingImage] = useState(false)
    const [productPickerOpen, setProductPickerOpen] = useState(false)
    const [pickedProductsForNext, setPickedProductsForNext] = useState<PickedProduct[]>([])
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const autoProgressRef = useRef(false)

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [])

    useEffect(() => {
        scrollToBottom()
    }, [messages, loading, scrollToBottom])

    useEffect(() => {
        if (!loading) textareaRef.current?.focus()
    }, [loading])

    // Hydrate from localStorage AFTER mount (avoids SSR mismatch)
    useEffect(() => {
        const persisted = loadPersistedState()
        if (persisted) {
            if (persisted.messages.length) setMessages(persisted.messages)
            setPhase(persisted.phase)
            setCampaignPayload(persisted.campaignPayload)
            setCreatedCampaignId(persisted.createdCampaignId)
            setPhaseTransitions(new Set(persisted.phaseTransitions))
        }
        setHasHydrated(true)
    }, [])

    // Persist chat state to localStorage whenever it changes
    useEffect(() => {
        if (typeof window === 'undefined') return
        // Don't write before hydration finishes — would clobber the saved chat
        if (!hasHydrated) return
        // Don't persist a fresh empty chat
        if (messages.length <= 1 && phase === 'intake' && !campaignPayload) {
            return
        }
        try {
            const payload: PersistedState = {
                savedAt: Date.now(),
                messages: stripHeavyContent(messages),
                phase,
                campaignPayload,
                createdCampaignId,
                phaseTransitions: Array.from(phaseTransitions),
            }
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
        } catch (err) {
            // Quota exceeded — drop the heaviest fields and retry once
            try {
                const minimal: PersistedState = {
                    savedAt: Date.now(),
                    messages: messages.map((m) => ({
                        role: m.role,
                        content: m.content,
                        phase: m.phase,
                        pickedProducts: m.pickedProducts,
                        creatorSuggestions: m.creatorSuggestions,
                        campaignPayload: m.campaignPayload,
                    })),
                    phase,
                    campaignPayload,
                    createdCampaignId,
                    phaseTransitions: Array.from(phaseTransitions),
                }
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal))
            } catch {
                console.warn('Could not persist chat state', err)
            }
        }
    }, [messages, phase, campaignPayload, createdCampaignId, phaseTransitions, hasHydrated])

    const handleStartOver = useCallback(() => {
        if (!confirm('Start a new campaign chat? Your current conversation will be cleared.')) return
        try {
            window.localStorage.removeItem(STORAGE_KEY)
        } catch {
            // ignore
        }
        setMessages([INITIAL_MESSAGE])
        setPhase('intake')
        setCampaignPayload(null)
        setCreatedCampaignId(null)
        setPhaseTransitions(new Set())
        setPickedProductsForNext([])
        setPendingImages([])
        setStoredProductImages([])
        setInput('')
    }, [])

    // Auto-resize textarea
    const autoResize = useCallback(() => {
        const el = textareaRef.current
        if (!el) return
        el.style.height = 'auto'
        el.style.height = `${Math.min(el.scrollHeight, 160)}px`
    }, [])

    useEffect(() => {
        autoResize()
    }, [input, autoResize])

    // Handle image upload
    const handleImageUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files) return

        const maxImages = 10 - pendingImages.length
        const filesToProcess = Array.from(files).slice(0, maxImages)

        for (const file of filesToProcess) {
            if (file.size > 10 * 1024 * 1024) {
                toast.error(`${file.name} is too large (max 10MB)`)
                continue
            }

            const reader = new FileReader()
            reader.onload = (ev) => {
                const base64 = ev.target?.result as string
                if (base64) {
                    setPendingImages(prev => [...prev, base64])
                }
            }
            reader.readAsDataURL(file)
        }

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }, [pendingImages.length])

    const removeImage = useCallback((index: number) => {
        setPendingImages(prev => prev.filter((_, i) => i !== index))
    }, [])

    /**
     * Fetch creator suggestions for the picked products and inject them
     * as an assistant attachment in the latest assistant message.
     */
    const fetchCreatorSuggestions = useCallback(async (productIds: string[]) => {
        try {
            const res = await fetch('/api/campaigns/recommend-creators', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ productIds, limit: 6, skipLLM: true }),
            })
            if (!res.ok) return
            const data = await res.json()
            const suggestions: CreatorSuggestion[] = (data.creators || []).map((c: any) => ({
                creatorId: c.creatorId,
                name: c.profile?.name ?? null,
                bio: c.profile?.bio ?? null,
                niches: c.profile?.niches ?? [],
                followers: c.profile?.followers ?? null,
                matchScore: c.matchScore ?? 0,
                pricePerPost: c.profile?.pricePerPost ?? null,
                badgeTier: c.profile?.badgeTier ?? null,
                reason: c.reason ?? '',
                vetting: c.vetting ?? null,
            }))

            if (suggestions.length === 0) return

            // Append as a side-attachment on the most recent assistant message
            setMessages((prev) => {
                if (prev.length === 0) return prev
                const last = prev[prev.length - 1]
                if (last.role !== 'assistant') return prev
                return [
                    ...prev.slice(0, -1),
                    { ...last, creatorSuggestions: suggestions },
                ]
            })
        } catch (err) {
            console.error('Creator suggestion fetch failed:', err)
        }
    }, [])

    /**
     * Handle product picker confirmation — drop the picked products into
     * the user's next message and pre-populate input with a friendly prompt.
     */
    const handleProductPick = useCallback((picked: PickedProduct[]) => {
        setPickedProductsForNext(picked)
        setProductPickerOpen(false)

        const list = picked
            .map((p) => `${p.name}${p.price ? ` (₹${p.price})` : ''}${p.category ? ` — ${p.category}` : ''}`)
            .join(', ')
        setInput((prev) => prev || `I want to run a campaign for: ${list}. Help me build it.`)
        toast.success(`${picked.length} product${picked.length > 1 ? 's' : ''} added to the brief`)
    }, [])

    /**
     * Core send function — handles both user messages and auto-continuation
     */
    const sendMessage = useCallback(async (
        text?: string,
        opts?: { isAutoContinue?: boolean; targetPhase?: StrategistPhase }
    ) => {
        const isAutoContinue = opts?.isAutoContinue ?? false
        const targetPhase = opts?.targetPhase ?? phase
        const userMessage = (text || input).trim()
        if (!userMessage || loading) return

        // Capture pending images for this message
        const messageImages = isAutoContinue ? [] : [...pendingImages]
        const messagePickedProducts = isAutoContinue ? [] : pickedProductsForNext

        if (!isAutoContinue) {
            setInput('')
            // Store product images persistently for future generation
            if (messageImages.length > 0) {
                setStoredProductImages(prev => {
                    const combined = [...prev, ...messageImages]
                    return combined.slice(0, 10) // Keep max 10
                })
            }
            setPendingImages([])
            setPickedProductsForNext([])
        }

        // Only add visible user messages (not auto-continue triggers)
        if (!isAutoContinue) {
            setMessages((prev) => [
                ...prev,
                {
                    role: 'user',
                    content: userMessage,
                    phase: targetPhase,
                    images: messageImages.length > 0 ? messageImages : undefined,
                    pickedProducts: messagePickedProducts.length > 0 ? messagePickedProducts : undefined,
                },
            ])
        }

        // Kick off creator suggestion fetch in parallel (non-blocking)
        if (messagePickedProducts.length > 0) {
            fetchCreatorSuggestions(messagePickedProducts.map((p) => p.id))
        }

        setLoading(true)
        if (messageImages.length > 0) {
            setIsGeneratingImage(false)
        }

        try {
            const currentMessages = isAutoContinue
                ? messages
                : [...messages, { role: 'user' as const, content: userMessage, phase: targetPhase, images: messageImages.length > 0 ? messageImages : undefined }]

            const response = await fetch('/api/campaigns/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    phase: targetPhase,
                    conversationHistory: currentMessages.map((m) => ({
                        role: m.role,
                        content: m.content,
                    })),
                    // Always send stored product images for Gemini generation reference
                    images: messageImages.length > 0
                        ? messageImages
                        : storedProductImages.length > 0
                            ? storedProductImages
                            : undefined,
                }),
            })

            if (!response.ok) throw new Error('Failed to get response')

            const data = await response.json()

            const newPhase = data.phase as StrategistPhase | undefined
            const didTransition = newPhase && newPhase !== targetPhase

            if (didTransition) {
                setPhase(newPhase)
            }

            if (data.campaignPayload) {
                setCampaignPayload(data.campaignPayload)
                // Campaign created = flow is DONE, force complete and stop auto-progression
                setPhase('complete')
                autoProgressRef.current = false
            }

            if (data.createdCampaignId) {
                setCreatedCampaignId(data.createdCampaignId)
            }

            // Handle generated images
            const generatedImages: GeneratedCampaignImage[] = data.generatedImages || []
            const performanceBrief: PerformanceBrief | null = data.performanceBrief || null

            setMessages((prev) => {
                const newMessages = [
                    ...prev,
                    {
                        role: 'assistant' as const,
                        content: data.response,
                        phase: data.campaignPayload ? 'complete' as StrategistPhase : (newPhase || targetPhase),
                        campaignPayload: data.campaignPayload || null,
                        generatedImages: generatedImages.length > 0 ? generatedImages : undefined,
                        performanceBrief,
                    },
                ]

                if (didTransition) {
                    setPhaseTransitions((prev) => new Set([...prev, newMessages.length - 1]))
                }

                return newMessages
            })

            // AUTO-PROGRESSION — only if no campaign payload (flow not done)
            if (!data.campaignPayload && didTransition && newPhase && newPhase !== 'complete' && AUTO_CONTINUE_MESSAGES[newPhase]) {
                autoProgressRef.current = true
            }
        } catch {
            toast.error('Failed to get AI response. Please try again.')
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: "I couldn't complete that request. Please check your connection and try again.",
                    phase: targetPhase,
                },
            ])
        } finally {
            setLoading(false)
            setIsGeneratingImage(false)
        }
    }, [input, loading, messages, phase, pendingImages, storedProductImages, pickedProductsForNext, fetchCreatorSuggestions])

    // Effect for auto-progression
    useEffect(() => {
        if (autoProgressRef.current && !loading) {
            autoProgressRef.current = false
            const autoContinueMsg = AUTO_CONTINUE_MESSAGES[phase]
            if (autoContinueMsg) {
                const timer = setTimeout(() => {
                    sendMessage(autoContinueMsg, { isAutoContinue: true, targetPhase: phase })
                }, 1500)
                return () => clearTimeout(timer)
            }
        }
    }, [loading, phase, sendMessage])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        sendMessage()
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    const handleApprove = async () => {
        if (createdCampaignId) {
            router.push('/brand/campaigns')
            return
        }

        if (!campaignPayload) return

        setIsCreatingCampaign(true)
        try {
            const res = await fetch('/api/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    goal: campaignPayload.goal,
                    title: campaignPayload.title,
                    audience: {
                        age_min: campaignPayload.audience?.age_min,
                        age_max: campaignPayload.audience?.age_max,
                        gender: campaignPayload.audience?.gender,
                        location: campaignPayload.audience?.location,
                        interests: campaignPayload.audience?.interests,
                    },
                    creative: {
                        headline: campaignPayload.creative?.headline,
                        description: campaignPayload.creative?.description,
                        cta_text: campaignPayload.creative?.cta_text,
                    },
                    budget: {
                        budget_type: campaignPayload.budget?.budget_type || 'daily',
                        daily_budget: campaignPayload.budget?.daily_budget,
                        total_budget: campaignPayload.budget?.total_budget,
                    },
                }),
            })

            if (!res.ok) throw new Error('Failed to create campaign')

            const data = await res.json()
            setCreatedCampaignId(data.id)
            toast.success('🚀 Campaign created successfully!')
        } catch {
            toast.error('Failed to create campaign. Please try again.')
        } finally {
            setIsCreatingCampaign(false)
        }
    }

    const isAutoProgressing = loading && phase !== 'intake' && phase !== 'complete'

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col bg-[#FAFAF8]">

            {/* ── STICKY HEADER ────────────────────────────────── */}
            <div className="flex-shrink-0 bg-white/90 backdrop-blur-md border-b border-black/8 z-10">
                <div className="mx-auto max-w-3xl px-4">
                    <div className="flex items-center gap-3 py-3">
                        <Link
                            href="/brand/campaigns"
                            className="w-8 h-8 rounded-full border border-black/12 flex items-center justify-center hover:bg-black/5 transition-colors"
                            title="Back to campaigns"
                        >
                            <ArrowLeft className="w-4 h-4 text-black/50" strokeWidth={2} />
                        </Link>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                                <Sparkles className="w-4 h-4 text-[#B4F056]" strokeWidth={2.5} />
                                <h1 className="text-sm font-black uppercase tracking-wider text-black/70">
                                    AI Campaign Strategist
                                </h1>
                                <span className="text-[9px] font-black uppercase bg-[#A78BFA]/15 text-[#A78BFA] px-2 py-0.5 rounded-full">
                                    Vision + Visual Gen
                                </span>
                            </div>
                            <PhaseProgressBar currentPhase={phase} />
                        </div>
                        {hasHydrated && messages.length > 1 && (
                            <button
                                type="button"
                                onClick={handleStartOver}
                                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-black/12 hover:bg-black/5 transition-colors text-[11px] font-bold text-black/60"
                                title="Clear this conversation and start over"
                            >
                                <RotateCcw className="w-3 h-3" strokeWidth={2.5} />
                                Start over
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── SCROLLABLE CHAT AREA ─────────────────────────── */}
            <div className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">
                    {messages.map((msg, index) => (
                        <div key={index}>
                            {/* Phase transition banner */}
                            {phaseTransitions.has(index) && msg.phase && (
                                <div className="mb-4">
                                    <PhaseTransitionBanner phase={msg.phase} />
                                </div>
                            )}

                            <div
                                className={`flex gap-3 items-end animate-slideUp ${msg.role === 'user' ? 'flex-row-reverse' : ''
                                    }`}
                            >
                                {msg.role === 'assistant' && (
                                    <div className="w-8 h-8 rounded-full bg-[#B4F056] flex items-center justify-center flex-shrink-0 mb-0.5">
                                        <Bot className="w-4 h-4 text-black" strokeWidth={2.5} />
                                    </div>
                                )}
                                <div
                                    className={`max-w-[85%] px-5 py-4 ${msg.role === 'user'
                                        ? 'bg-black text-white rounded-2xl rounded-br-md'
                                        : 'bg-white border border-black/8 shadow-sm text-black rounded-2xl rounded-bl-md'
                                        }`}
                                >
                                    {/* Picked products from catalog */}
                                    {msg.pickedProducts && msg.pickedProducts.length > 0 && (
                                        <PickedProductChips products={msg.pickedProducts} />
                                    )}

                                    {/* User-uploaded images in message */}
                                    {msg.images && msg.images.length > 0 && (
                                        <div className={`flex gap-2 mb-3 ${msg.images.length > 1 ? 'flex-wrap' : ''}`}>
                                            {msg.images.map((img, imgIdx) => (
                                                <div key={imgIdx} className="relative rounded-lg overflow-hidden border border-white/20">
                                                    <AppImage
                                                        src={img}
                                                        alt={`Uploaded ${imgIdx + 1}`}
                                                        fill={false}
                                                        width={200}
                                                        height={200}
                                                        sizes="200px"
                                                        className="max-w-[200px] max-h-[200px] object-cover rounded-lg"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {msg.role === 'assistant' ? (
                                        renderMarkdown(msg.content)
                                    ) : (
                                        <p className="text-[13px] font-medium whitespace-pre-wrap leading-relaxed">
                                            {msg.content}
                                        </p>
                                    )}

                                    {/* Generated images */}
                                    {msg.generatedImages && msg.generatedImages.length > 0 && (
                                        <GeneratedImageGallery
                                            images={msg.generatedImages}
                                            onRegenerate={(desc) => sendMessage(`Regenerate this campaign visual with a different creative approach: ${desc}`)}
                                        />
                                    )}

                                    {/* Creator suggestions (only on assistant messages) */}
                                    {msg.role === 'assistant' && msg.creatorSuggestions && msg.creatorSuggestions.length > 0 && (
                                        <CreatorSuggestionCards creators={msg.creatorSuggestions} />
                                    )}
                                </div>
                                {msg.role === 'user' && (
                                    <div className="w-8 h-8 rounded-full bg-black/8 flex items-center justify-center flex-shrink-0 mb-0.5">
                                        <User className="w-4 h-4 text-black/50" strokeWidth={2.5} />
                                    </div>
                                )}
                            </div>

                            {msg.campaignPayload && (
                                <div className="mt-4 ml-11">
                                    <CampaignStrategyCard
                                        payload={msg.campaignPayload}
                                        createdId={createdCampaignId}
                                        isCreating={isCreatingCampaign}
                                        onApprove={handleApprove}
                                    />
                                </div>
                            )}

                            {msg.performanceBrief && (
                                <div className="mt-3 ml-11">
                                    <PerformanceBriefCard brief={msg.performanceBrief} />
                                </div>
                            )}
                        </div>
                    ))}

                    {loading && <TypingIndicator phase={phase} isGeneratingImage={isGeneratingImage} />}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* ── STICKY INPUT AREA ────────────────────────────── */}
            <div className="flex-shrink-0 bg-white/90 backdrop-blur-md border-t border-black/8 z-10">
                <div className="mx-auto max-w-3xl px-4 py-3 space-y-3">
                    {/* Suggestion chips + Use my products button */}
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setProductPickerOpen(true)}
                            disabled={loading}
                            className="text-[12px] font-black uppercase tracking-wider border-2 border-black px-4 py-2 bg-[#B4F056] hover:bg-[#a3e63a] transition-all disabled:opacity-30 disabled:cursor-not-allowed rounded-full text-black flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5"
                            title="Pick products from your Kiwikoo catalog"
                        >
                            <Sparkles className="w-3.5 h-3.5" strokeWidth={3} />
                            Use my products
                        </button>
                        <SuggestionChips phase={phase} onSelect={(t) => sendMessage(t)} disabled={loading} />
                    </div>

                    {/* Picked products preview (before sending) */}
                    {pickedProductsForNext.length > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-[#B4F056]/15 border border-[#B4F056]/40 rounded-lg">
                            <Sparkles className="w-3.5 h-3.5 text-black/60 flex-shrink-0" />
                            <p className="text-[11px] font-bold text-black/70 flex-1 truncate">
                                {pickedProductsForNext.length} product{pickedProductsForNext.length > 1 ? 's' : ''} ready: {pickedProductsForNext.map((p) => p.name).join(', ')}
                            </p>
                            <button
                                type="button"
                                onClick={() => setPickedProductsForNext([])}
                                className="text-[10px] font-bold text-black/40 hover:text-black"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    {/* Image upload previews */}
                    <ImageUploadPreview images={pendingImages} onRemove={removeImage} />

                    {/* Auto-progress indicator */}
                    {isAutoProgressing && (
                        <div className="flex items-center gap-2 px-1 animate-fadeIn">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#B4F056]" />
                            <p className="text-[12px] font-semibold text-black/40">
                                Auto-progressing through phases... sit back and watch the magic ✨
                            </p>
                        </div>
                    )}

                    {/* Textarea form */}
                    <form onSubmit={handleSubmit} className="flex items-end gap-2">
                        {/* Image upload button */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading || pendingImages.length >= 10}
                            className="h-[46px] w-[46px] flex items-center justify-center border-2 border-black/15 rounded-xl hover:bg-[#A78BFA]/10 hover:border-[#A78BFA] transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0 group"
                            title="Upload image for AI analysis"
                        >
                            <ImagePlus className="w-5 h-5 text-black/40 group-hover:text-[#A78BFA] transition-colors" strokeWidth={2} />
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                            className="hidden"
                        />

                        <div className="flex-1 relative">
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={
                                    isAutoProgressing
                                        ? 'AI is working autonomously...'
                                        : pendingImages.length > 0
                                            ? 'Describe what you want me to analyze in these images...'
                                            : phase === 'intake'
                                                ? 'Tell me about your brand... Upload product images for better strategy!'
                                                : phase === 'complete'
                                                    ? 'Ask me to refine anything, or approve the campaign above...'
                                                    : 'Continue the conversation...'
                                }
                                disabled={loading}
                                rows={1}
                                className="w-full resize-none px-4 py-3 bg-black/[0.03] border border-black/12 rounded-xl text-[13px] font-medium focus:border-[#B4F056] focus:ring-2 focus:ring-[#B4F056]/30 outline-none placeholder:text-black/30 transition-all leading-relaxed disabled:opacity-50"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || (!input.trim() && pendingImages.length === 0)}
                            className="h-[46px] w-[46px] flex items-center justify-center bg-[#B4F056] border-2 border-black rounded-xl font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 shrink-0"
                            aria-label="Send message"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" strokeWidth={2.5} />
                            )}
                        </button>
                    </form>

                    {/* Image upload hint */}
                    {pendingImages.length === 0 && !loading && (
                        <p className="text-[10px] font-medium text-black/25 text-center">
                            {storedProductImages.length > 0
                                ? `📷 ${storedProductImages.length} product image${storedProductImages.length > 1 ? 's' : ''} stored — AI will use them to generate campaign visuals`
                                : '📷 Upload product photos (up to 10) — AI Vision will analyze them & use them for campaign visual generation'
                            }
                        </p>
                    )}
                </div>
            </div>

            {/* Product picker modal */}
            <ProductPickerModal
                open={productPickerOpen}
                onClose={() => setProductPickerOpen(false)}
                onPick={handleProductPick}
            />

            {/* Animations & scrollbar hide */}
            <style jsx global>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-slideUp {
          animation: slideUp 0.35s ease-out;
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
      `}</style>
        </div>
    )
}
