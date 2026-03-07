'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Download, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'

function resolveImageUrl(url: string): string {
    if (!url) return ''
    if (url.startsWith('/api/images/proxy')) return url
    if (url.includes('supabase.co/storage')) {
        return `/api/images/proxy?url=${encodeURIComponent(url)}`
    }
    return url
}

function GalleryViewFallback() {
    return (
        <div className="fixed inset-0 z-[150] bg-[#FDF6EC] flex items-center justify-center">
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
    const backPath = searchParams.get('back') || ''
    const downloadName = searchParams.get('download') || `kiwikoo-image-${Date.now()}.jpg`
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
        <div className="fixed inset-0 z-[150] bg-[#FDF6EC] flex flex-col">
            <header className="flex items-center gap-2 border-b-[3px] border-black bg-white px-3 py-3">
                <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex items-center gap-1 rounded-lg border-[2px] border-black bg-white px-3 py-2 text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    aria-label="Back"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </button>

                <p className="min-w-0 flex-1 truncate text-center text-sm font-black text-black">
                    {title}
                </p>

                <button
                    type="button"
                    onClick={handleDownload}
                    disabled={downloading || !imageUrl}
                    className="inline-flex items-center gap-1 rounded-lg border-[2px] border-black bg-[#FFD93D] px-3 py-2 text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Download image"
                >
                    <Download className="h-4 w-4" />
                    {downloading ? '...' : 'Save'}
                </button>
            </header>

            <main className="flex-1 overflow-hidden p-4">
                <div className="flex h-full w-full items-center justify-center rounded-xl border-[3px] border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                    {!imageUrl ? (
                        <div className="flex flex-col items-center gap-2 text-black/60">
                            <ImageIcon className="h-10 w-10" />
                            <p className="text-sm font-bold">Image not found</p>
                        </div>
                    ) : imageError ? (
                        <div className="flex flex-col items-center gap-2 text-black/60">
                            <ImageIcon className="h-10 w-10" />
                            <p className="text-sm font-bold">Image failed to load</p>
                        </div>
                    ) : (
                        <img
                            src={imageUrl}
                            alt={title}
                            className="max-h-full max-w-full object-contain"
                            onError={() => setImageError(true)}
                        />
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
