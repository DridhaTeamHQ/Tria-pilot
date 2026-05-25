'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ImageCarouselProps {
  images: string[]
}

export default function ImageCarousel({ images }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center bg-[#F6F1E8] sm:aspect-square">
        <span className="text-sm font-bold text-black/40">No images available</span>
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
    <div className="bg-white">
      <div className="relative flex aspect-[4/5] max-h-[68vh] min-h-[320px] items-center justify-center overflow-hidden bg-[#F7F7F2] sm:aspect-square sm:max-h-none sm:min-h-0 group">
        <Image
          key={images[currentIndex]}
          src={images[currentIndex]}
          alt={`Product image ${currentIndex + 1}`}
          fill
          sizes="(max-width: 768px) 96vw, 50vw"
          className="object-contain p-2 sm:p-4"
          priority={currentIndex === 0}
        />
        {images.length > 1 && (
          <>
            <button
              type="button"
              className="absolute left-2 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border-2 border-black bg-white/95 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] backdrop-blur transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none sm:left-4 sm:h-12 sm:w-12 sm:border-[3px] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:hover:bg-black sm:hover:text-white"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                prevImage();
              }}
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5 stroke-[3] sm:h-6 sm:w-6" />
            </button>
            <button
              type="button"
              className="absolute right-2 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border-2 border-black bg-white/95 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] backdrop-blur transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none sm:right-4 sm:h-12 sm:w-12 sm:border-[3px] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:hover:bg-black sm:hover:text-white"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                nextImage();
              }}
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5 stroke-[3] sm:h-6 sm:w-6" />
            </button>
            <div className="absolute bottom-2 right-2 z-30 rounded-full border border-white/30 bg-black/65 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur sm:bottom-3 sm:right-3">
              {currentIndex + 1}/{images.length}
            </div>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto border-t-[3px] border-black bg-white p-2 sm:gap-3 sm:p-3 relative z-30">
          {images.map((image, index) => (
            <button
              type="button"
              key={index}
              onClick={() => goToImage(index)}
              className={`relative h-16 w-16 flex-none overflow-hidden rounded-xl border-2 bg-[#F7F7F2] transition-all sm:h-20 sm:w-20 ${index === currentIndex
                  ? 'border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : 'border-black/15 opacity-70 hover:border-black/50 hover:opacity-100'
                }`}
              aria-label={`Show image ${index + 1}`}
            >
              <Image
                src={image}
                alt={`Thumbnail ${index + 1}`}
                fill
                sizes="80px"
                className="object-contain p-1"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
