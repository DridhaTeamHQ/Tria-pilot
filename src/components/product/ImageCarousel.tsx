'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ImageCarouselProps {
  images: string[]
}

export default function ImageCarousel({ images }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (images.length === 0) {
    return (
      <div className="aspect-square bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
        <span className="text-zinc-400">No images available</span>
      </div>
    )
  }

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const goToImage = (index: number) => {
    setCurrentIndex(index)
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Main Image */}
      <div className="relative aspect-[4/5] bg-zinc-100 dark:bg-zinc-800 overflow-hidden sm:aspect-square sm:rounded-lg">
        <Image
          src={images[currentIndex]}
          alt={`Product image ${currentIndex + 1}`}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority={currentIndex === 0}
        />
        {images.length > 1 && (
          <>
            <button type="button"
              className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center border-[3px] border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-colors hover:bg-black hover:text-white hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] sm:left-4 sm:h-12 sm:w-12 sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              onClick={prevImage}
              aria-label="Previous image"
            >
              <ChevronLeft className="h-6 w-6 stroke-[3]" />
            </button>
            <button type="button"
              className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center border-[3px] border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-colors hover:bg-black hover:text-white hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] sm:right-4 sm:h-12 sm:w-12 sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              onClick={nextImage}
              aria-label="Next image"
            >
              <ChevronRight className="h-6 w-6 stroke-[3]" />
            </button>
            <div className="absolute bottom-2 right-2 rounded bg-black/55 px-2 py-1 text-xs text-white">
              {currentIndex + 1}/{images.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:px-0">
          {images.map((image, index) => (
            <button type="button"
              key={index}
              onClick={() => goToImage(index)}
              className={`relative aspect-square min-w-[72px] overflow-hidden rounded-lg border-2 transition-colors sm:min-w-0 sm:flex-1 ${index === currentIndex
                ? 'border-primary'
                : 'border-transparent hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              aria-label={`Show image ${index + 1}`}
            >
              <Image
                src={image}
                alt={`Thumbnail ${index + 1}`}
                fill
                sizes="(max-width: 640px) 72px, 20vw"
                className="object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
