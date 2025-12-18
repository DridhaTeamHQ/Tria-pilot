'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ImageViewerProps {
  src: string
  alt: string
  className?: string
}

export function ImageViewer({ src, alt, className = '' }: ImageViewerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hasError, setHasError] = useState(false)

  if (!src) return null

  if (hasError) {
    return (
      <div className={`${className} bg-cream flex items-center justify-center`}>
        <span className="text-charcoal/40 text-sm">Image unavailable</span>
      </div>
    )
  }

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`${className} cursor-pointer hover:opacity-90 transition-opacity`}
        onClick={() => setIsOpen(true)}
        onError={() => {
          console.error('Image failed to load:', src)
          setHasError(true)
        }}
      />
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

