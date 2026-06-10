'use client'

import { Share2 } from 'lucide-react'
import { toast } from '@/lib/simple-sonner'

interface ProductShareButtonProps {
  productName: string
}

export default function ProductShareButton({ productName }: ProductShareButtonProps) {
  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: productName,
          text: `Check out this product: ${productName}`,
          url,
        })
        return
      }

      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        toast.success('Product link copied')
        return
      }

      toast.error('Sharing is not supported on this browser')
    } catch {
      toast.error('Could not share this product')
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex min-h-[42px] w-full items-center justify-center gap-2 border-[3px] border-black bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-charcoal shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none rounded-lg"
    >
      <Share2 className="w-5 h-5 sm:w-4 sm:h-4 shrink-0" />
      <span className="hidden sm:inline truncate">Share</span>
    </button>
  )
}
