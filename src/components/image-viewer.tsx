'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, ImageOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ImageViewerProps {
  src: string
  alt: string
  className?: string
}

export function ImageViewer({ src, alt, className = '' }: ImageViewerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Reset error state when src changes
  useEffect(() => {
    if (src) {
      setHasError(false)
      setIsLoading(true)
    }
  }, [src])

  if (!src) return null

  if (hasError) {
    return (
      <div className={`${className} bg-cream flex flex-col items-center justify-center gap-2`}>
        <ImageOff className="w-8 h-8 text-charcoal/20" />
        <span className="text-charcoal/40 text-xs text-center px-2">Image unavailable</span>
        {src.includes('supabase.co') && (
          <span className="text-charcoal/30 text-xs text-center px-2">
            Storage bucket may need to be public
          </span>
        )}
      </div>
    )
  }

  return (
    <>
      <div className={`${className} relative`}>
        {isLoading && (
          <div className="absolute inset-0 bg-cream flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-charcoal/20 border-t-charcoal/60 rounded-full animate-spin" />
          </div>
        )}
        <Image
          src={src}
          alt={alt}
          width={1200}
          height={1200}
          unoptimized
          className={`${className} cursor-pointer hover:opacity-90 transition-opacity ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          onClick={() => setIsOpen(true)}
          onLoad={() => {
            setIsLoading(false)
          }}
          onError={(e) => {
            console.error('Image failed to load:', src)
            console.error('Error details:', e)
            setHasError(true)
            setIsLoading(false)
          }}
        />
      </div>
      {isOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-start justify-center bg-black/85 p-3 pt-[max(0.75rem,3vh)] backdrop-blur-md sm:items-center sm:p-6"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="my-auto w-full max-w-[min(94vw,1220px)] overflow-hidden rounded-[28px] border-[3px] border-black bg-[#FFFDF8] shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-[3px] border-black bg-[#FFF4D9] px-4 py-3 sm:px-5">
              <p className="truncate pr-3 text-xs font-black uppercase tracking-wide text-black sm:text-sm">
                {alt || 'Image Preview'}
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-xl border-[2px] border-black bg-white text-black hover:bg-[#FFD93D]"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex max-h-[calc(min(92dvh,920px)-64px)] items-center justify-center bg-[#FFF8E8] p-3 sm:p-4">
              <Image
                src={src}
                alt={alt}
                width={1600}
                height={1600}
                unoptimized
                className="max-h-[calc(min(92dvh,920px)-96px)] max-w-full rounded-2xl border-[2px] border-black bg-white object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
