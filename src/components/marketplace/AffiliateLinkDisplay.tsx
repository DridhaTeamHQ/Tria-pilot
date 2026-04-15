'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Copy, Check, Link as LinkIcon, ExternalLink, Loader2 } from 'lucide-react'
import { toast } from '@/lib/simple-sonner'

interface AffiliateLinkResponse {
    maskedUrl: string
    linkCode: string
    originalUrl: string
    productId: string
    productName: string | null
}

interface AffiliateLinkDisplayProps {
    productId: string
}

export function AffiliateLinkDisplay({ productId }: AffiliateLinkDisplayProps) {
    const [copied, setCopied] = useState(false)

    const { data: linkData, isLoading, error } = useQuery<AffiliateLinkResponse>({
        queryKey: ['affiliate-link', productId],
        queryFn: async () => {
            const res = await fetch(`/api/links/product/${productId}`)
            if (!res.ok) {
                throw new Error('Failed to fetch affiliate link')
            }
            return res.json()
        },
    })

    const handleCopy = async () => {
        if (!linkData?.maskedUrl) return

        try {
            await navigator.clipboard.writeText(linkData.maskedUrl)
            setCopied(true)
            toast.success('Affiliate link copied to clipboard!')
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            toast.error('Failed to copy link')
        }
    }

    if (isLoading) {
        return (
            <div className="flex h-[120px] w-full items-center justify-center border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <Loader2 className="h-6 w-6 animate-spin text-charcoal/40" />
            </div>
        )
    }

    if (error || !linkData) {
        return null // Gracefully hide if error
    }

    return (
        <div className="group relative mt-4 border-[3px] border-black bg-[#BAFCA2] p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:p-6 sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="absolute -top-3 left-4 border-[2px] border-black bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:left-6 sm:text-xs">
                Your Affiliate Link
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 overflow-hidden">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-black/60 sm:text-xs">
                        Share this link to track conversions
                    </p>
                    <div className="flex items-center gap-2 overflow-hidden rounded border-2 border-black/10 bg-black/5 p-2 font-mono text-xs font-bold text-black sm:text-sm">
                        <LinkIcon className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
                        <span className="truncate">{linkData.maskedUrl}</span>
                    </div>
                </div>

                <div className="flex shrink-0 gap-2">
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="flex flex-1 items-center justify-center gap-2 border-[3px] border-black bg-white px-4 py-2 text-xs font-black uppercase tracking-tight shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:bg-gray-50 sm:flex-none sm:text-sm"
                    >
                        {copied ? (
                            <>
                                <Check className="h-4 w-4" />
                                Copied
                            </>
                        ) : (
                            <>
                                <Copy className="h-4 w-4" />
                                Copy Link
                            </>
                        )}
                    </button>

                    <a
                        href={linkData.maskedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center border-[3px] border-black bg-black p-2 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none sm:p-3"
                        title="Test Link"
                    >
                        <ExternalLink className="h-4 w-4" />
                    </a>
                </div>
            </div>
        </div>
    )
}
