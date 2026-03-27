'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Download, ImageIcon, X } from 'lucide-react'
import { toast } from 'sonner'

function sanitizeInternalPath(path: string): string | null {
    const value = path.trim()
    if (!value.startsWith('/') || value.startsWith('//')) return null
    if (value.includes('\r') || value.includes('\n')) return null
    return value
}

function sanitizeDownloadName(fileName: string): string {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    return safeName || 'kiwikoo-image.jpg'
}

function resolveImageUrl(url: string): string {
    if (!url) return ''

    if (url.startsWith('/api/images/proxy')) return url

    try {
        const parsed = new URL(url)
        const isSupabaseStorageHost =
            (parsed.hostname.endsWith('.supabase.co') || parsed.hostname.endsWith('.supabase.in')) &&
            parsed.pathname.includes('/storage/')

        if (['http:', 'https:'].includes(parsed.protocol) && isSupabaseStorageHost) {
            return `/api/images/proxy?url=${encodeURIComponent(parsed.toString())}`
        }
    } catch {
        return ''
    }

    return ''
}

function GalleryViewFallback() {
    return (
        <div className="fixed inset-0 z-[250] bg-[#FDF6EC] flex items-center justify-center">
            <div className="rounded-xl border-[3px] border-black bg-white px-6 py-4 font-bold shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                Loading image...
            </div>
        </div>
    )
}

function GalleryViewContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [downloading, setDownloading] = useState(false)
    const [imageError, setImageError] = useState(false)

    const rawImageUrl = searchParams.get('image') || ''
    const title = searchParams.get('title') || 'Image Viewer'
    const backPath = sanitizeInternalPath(searchParams.get('back') || '')
    const downloadName = sanitizeDownloadName(
        searchParams.get('download') || `kiwikoo-image-${Date.now()}.jpg`
    )
    const imageUrl = resolveImageUrl(rawImageUrl)

    const handleBack = () => {
        if (backPath) {
            router.push(backPath)
            return
        }
        if (window.history.length > 1) {
            router.back()
            return
        }
        router.push('/')
    }

    const handleDownload = async () => {
        if (!imageUrl) return
        try {
            setDownloading(true)
            const response = await fetch(imageUrl)
            if (!response.ok) {
                throw new Error(`Failed with status ${response.status}`)
            }
            const blob = await response.blob()
            const blobUrl = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = blobUrl
            link.download = downloadName
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(blobUrl)
            toast.success('Image downloaded')
        } catch (error) {
            console.error('Download failed:', error)
            toast.error('Unable to download image')
        } finally {
            setDownloading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[250] flex min-h-0 flex-col bg-[#141414] text-white">

            <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-white/10 bg-black/75 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md sm:px-4">
                <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex shrink-0 items-center gap-1 rounded-xl border-2 border-white/20 bg-white/10 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-white/15"
                    aria-label="Back"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </button>

                <p className="min-w-0 flex-1 truncate text-center text-xs font-black text-white/90 sm:text-sm">
                    {title}
                </p>

                <button
                    type="button"
                    onClick={handleDownload}
                    disabled={downloading || !imageUrl}
                    className="inline-flex shrink-0 items-center gap-1 rounded-xl border-2 border-[#FFD93D] bg-[#FFD93D] px-3 py-2 text-xs font-bold text-black transition-colors hover:bg-[#ffe169] disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Download image"
                >
                    <Download className="h-4 w-4" />
                    {downloading ? '...' : 'Save'}
                </button>

                <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex shrink-0 items-center justify-center rounded-xl border-2 border-white/20 bg-white/10 p-2 text-white transition-colors hover:bg-white/15"
                    aria-label="Close viewer"
                >
                    <X className="h-4 w-4" />
                </button>
            </header>

            <main className="flex min-h-0 flex-1 overflow-hidden p-3 sm:p-5">
                <div className="relative flex min-h-0 h-full w-full items-center justify-center overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,#2b2b2b_0%,#181818_45%,#101010_100%)]">
                    <div className="pointer-events-none absolute inset-0 opacity-40">
                        <div className="absolute -left-10 top-6 h-32 w-32 rounded-full bg-[#FFD93D]/12 blur-3xl" />
                        <div className="absolute right-0 top-1/3 h-40 w-40 rounded-full bg-[#B4F056]/10 blur-3xl" />
                        <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
                    </div>
                    {!imageUrl ? (
                        <div className="relative z-10 flex flex-col items-center gap-2 text-white/55">
                            <ImageIcon className="h-10 w-10" />
                            <p className="text-sm font-bold">Image not found</p>
                        </div>
                    ) : imageError ? (
                        <div className="relative z-10 flex flex-col items-center gap-2 text-white/55">
                            <ImageIcon className="h-10 w-10" />
                            <p className="text-sm font-bold">Image failed to load</p>
                        </div>
                    ) : (
                        <div className="relative z-10 flex h-full min-h-0 w-full items-center justify-center p-3 sm:p-6">
                            <img
                                src={imageUrl}
                                alt={title}
                                className="block h-auto w-auto max-h-[calc(100dvh-8rem)] max-w-full rounded-2xl object-contain shadow-[0_18px_60px_rgba(0,0,0,0.45)] sm:max-h-[calc(100dvh-9.5rem)]"
                                onError={() => setImageError(true)}
                            />
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

export default function GalleryViewPage() {
    return (
        <Suspense fallback={<GalleryViewFallback />}>
            <GalleryViewContent />
        </Suspense>
    )
}

