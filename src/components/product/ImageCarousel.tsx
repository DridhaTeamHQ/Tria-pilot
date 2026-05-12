'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ImageCarouselProps {
  images: string[]
}

export default function ImageCarousel({ images }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (images.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 rounded-2xl">
        <span className="text-black/30 font-bold text-sm uppercase tracking-widest">No images</span>
      </div>
    )
  }

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <div className="h-full flex flex-col select-none bg-transparent relative">
      {/* 3D Image Stage */}
      <div 
        className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden"
        style={{ perspective: '1200px' }}
      >
        <div className="relative w-full h-full flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
          <AnimatePresence mode="popLayout">
            {images.map((img, idx) => {
              const offset = idx - currentIndex
              const absOffset = Math.abs(offset)
              const isCenter = idx === currentIndex
              
              if (absOffset > 2) return null

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity: 1 - absOffset * 0.5,
                    scale: 1 - absOffset * 0.2,
                    x: offset * 300, // Wide spread for the raw images
                    z: -absOffset * 150,
                    rotateY: offset * 40,
                    filter: isCenter ? 'none' : 'grayscale(50%) blur(4px)',
                  }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{
                    type: "spring",
                    stiffness: 150,
                    damping: 20
                  }}
                  className={`absolute w-[95%] h-[95%] flex items-center justify-center cursor-pointer ${
                    isCenter ? 'z-50' : 'z-40'
                  }`}
                  onClick={() => setCurrentIndex(idx)}
                >
                  <div className="relative w-full h-full">
                    <Image
                      src={img}
                      alt={`Product image ${idx + 1}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.15)]"
                      priority={isCenter}
                    />
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-md border border-black/5 shadow-lg z-[60] hover:bg-black hover:text-white transition-all"
            >
              <ChevronLeft className="w-7 h-7" strokeWidth={2.5} />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-md border border-black/5 shadow-lg z-[60] hover:bg-black hover:text-white transition-all"
            >
              <ChevronRight className="w-7 h-7" strokeWidth={2.5} />
            </button>
          </>
        )}
      </div>

      {/* Subtle Pagination */}
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-2 py-6">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                index === currentIndex ? 'w-8 bg-black' : 'w-1.5 bg-black/10'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
