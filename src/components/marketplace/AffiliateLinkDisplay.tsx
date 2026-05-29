'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Copy, Check, Link as LinkIcon, ExternalLink, Loader2, Sparkles } from 'lucide-react'
import { toast } from '@/lib/simple-sonner'

interface AffiliateLinkResponse {
    maskedUrl: string
    linkCode: string
    originalUrl: string
    affiliateTag?: string | null
    storeId?: string | null
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

    const handleRecordSale = async () => {
        if (!linkData?.linkCode) return

        const amount = 1000 // Test amount
        try {
            const res = await fetch('/api/links/simulate-conversion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ linkCode: linkData.linkCode, amount }),
            })

            if (!res.ok) throw new Error('Failed to record sale')
            toast.success(`Test sale of ₹${amount} recorded! Check Analytics.`)
        } catch (err) {
            toast.error('Failed to record test sale')
        }
    }

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
            <div className="flex h-[76px] w-full items-center justify-center border-[3px] border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <Loader2 className="h-6 w-6 animate-spin text-charcoal/40" />
            </div>
        )
    }

    if (error || !linkData) {
        return null // Gracefully hide if error
    }

    return (
        <div className="group relative mt-3 border-[3px] border-black bg-[#BAFCA2] p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="absolute -top-3 left-4 border-[2px] border-black bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                Your Affiliate Link
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 overflow-hidden">
                    <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-black/60 sm:text-[10px]">
                        Share this link to track conversions
                    </p>
                    <div className="flex items-center gap-2 overflow-hidden rounded border-2 border-black/10 bg-black/5 p-1.5 font-mono text-[10px] font-bold text-black sm:text-xs">
                        <LinkIcon className="h-3 w-3 shrink-0" />
                        <span className="truncate">{linkData.maskedUrl}</span>
                    </div>
                </div>

                <div className="flex shrink-0 gap-2">
                    <button
                        type="button"
                        onClick={handleRecordSale}
                        className="flex flex-1 items-center justify-center gap-2 border-[3px] border-black bg-pink-400 px-3 py-2 text-[10px] font-black uppercase tracking-tight shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:bg-pink-500 sm:flex-none"
                        title="Simulate a purchase for testing"
                    >
                        <Sparkles className="h-3.5 w-3.5" />
                        Test Sale
                    </button>

                    <button
                        type="button"
                        onClick={handleCopy}
                        className="flex flex-1 items-center justify-center gap-2 border-[3px] border-black bg-white px-3 py-2 text-[10px] font-black uppercase tracking-tight shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:bg-gray-50 sm:flex-none"
                    >
                        {copied ? (
                            <>
                                <Check className="h-3.5 w-3.5" />
                                Copied
                            </>
                        ) : (
                            <>
                                <Copy className="h-3.5 w-3.5" />
                                Copy Link
                            </>
                        )}
                    </button>

                    <a
                        href={linkData.maskedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center border-[3px] border-black bg-black p-2 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                        title="Test Link"
                    >
                        <ExternalLink className="h-4 w-4" />
                    </a>
                </div>
            </div>
        </div>
    )
}
