'use client'

import { useState, useEffect } from 'react'
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
        <img
          src={src}
          alt={alt}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div className="relative max-w-7xl max-h-full">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  )
}

