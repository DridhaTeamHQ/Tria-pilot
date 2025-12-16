'use client'

import { useState, useEffect, useRef, memo, useCallback } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingBag, ArrowRight, Eye } from 'lucide-react'

interface ProductImage {
    id: string
    imagePath: string
}

interface ProductCardProps {
    product: {
        id: string
        name: string
        description: string | null
        category: string | null
        price: any
        imagePath: string
        brand: {
            id: string
            companyName: string | null
            user: {
                name: string | null
                slug: string | null
            } | null
        }
        images: ProductImage[]
    }
    index: number
    priority?: boolean
}

// Memoized component for performance
const ProductCard = memo(function ProductCard({ product, index, priority = false }: ProductCardProps) {
    const [isHovered, setIsHovered] = useState(false)
    const [currentImageIndex, setCurrentImageIndex] = useState(0)
    const [imagesLoaded, setImagesLoaded] = useState<Set<number>>(new Set([0]))
    const [firstImageLoaded, setFirstImageLoaded] = useState(false)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    
    // Collect all available images - memoize to prevent recalculation
    const uniqueImages = useRef<string[]>([])
    
    if (uniqueImages.current.length === 0) {
        const allImages = [
            ...(product.images?.map(img => img.imagePath) || []),
            product.imagePath
        ].filter(Boolean) as string[]
        uniqueImages.current = [...new Set(allImages)]
    }
    
    const hasMultipleImages = uniqueImages.current.length > 1
    const currentImage = uniqueImages.current[currentImageIndex] || null

    // Preload next images on hover
    const preloadImages = useCallback(() => {
        if (hasMultipleImages && typeof window !== 'undefined') {
            uniqueImages.current.forEach((src, idx) => {
                if (idx !== 0) {
                    const img = new window.Image()
                    img.src = src
                    img.onload = () => {
                        setImagesLoaded(prev => new Set([...prev, idx]))
                    }
                }
            })
        }
    }, [hasMultipleImages])

    // Auto-cycle images on hover
    useEffect(() => {
        if (isHovered && hasMultipleImages) {
            // Preload all images when hovering
            preloadImages()
            
            intervalRef.current = setInterval(() => {
                setCurrentImageIndex(prev => (prev + 1) % uniqueImages.current.length)
            }, 1500)
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
            // Don't reset to 0 immediately to avoid flash
            if (!isHovered) {
                setTimeout(() => setCurrentImageIndex(0), 300)
            }
        }
        
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [isHovered, hasMultipleImages, preloadImages])

    const handleMouseEnter = useCallback(() => setIsHovered(true), [])
    const handleMouseLeave = useCallback(() => setIsHovered(false), [])

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
                delay: Math.min(index * 0.05, 0.3), // Cap delay at 300ms
                duration: 0.4,
                ease: [0.25, 0.1, 0.25, 1]
            }}
        >
            <Link href={`/marketplace/${product.id}`} prefetch={index < 8}>
                <div 
                    data-cursor="View"
                    className={`group relative bg-white rounded-2xl overflow-hidden border border-charcoal/5 cursor-none transform-gpu transition-all duration-300 ${
                        isHovered ? 'shadow-2xl shadow-charcoal/15 -translate-y-2 border-charcoal/10' : 'shadow-sm hover:shadow-md'
                    }`}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    {/* Image Container */}
                    <div className="aspect-[4/5] relative overflow-hidden bg-cream">
                        {/* Skeleton loader */}
                        {!firstImageLoaded && (
                            <div className="absolute inset-0 bg-gradient-to-br from-cream via-charcoal/5 to-cream animate-pulse">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skeleton-shimmer" />
                            </div>
                        )}
                        
                        {/* Images stack - no AnimatePresence for smoother transitions */}
                        {uniqueImages.current.map((imgSrc, idx) => (
                            <div
                                key={imgSrc}
                                className={`absolute inset-0 transition-opacity duration-500 ease-out ${
                                    idx === currentImageIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                                }`}
                            >
                                <Image
                                    src={imgSrc}
                                    alt={idx === 0 ? product.name : `${product.name} - ${idx + 1}`}
                                    fill
                                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                    className={`object-cover transition-transform duration-700 ease-out ${
                                        isHovered ? 'scale-105' : 'scale-100'
                                    }`}
                                    priority={priority && idx === 0}
                                    loading={idx === 0 ? (priority ? 'eager' : 'lazy') : 'lazy'}
                                    onLoad={() => {
                                        if (idx === 0) setFirstImageLoaded(true)
                                        setImagesLoaded(prev => new Set([...prev, idx]))
                                    }}
                                    placeholder="blur"
                                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAwEPwAB//9k="
                                />
                            </div>
                        ))}
                        
                        {/* No image fallback */}
                        {!currentImage && (
                            <div className="absolute inset-0 flex items-center justify-center bg-cream">
                                <ShoppingBag className="w-12 h-12 text-charcoal/10" />
                            </div>
                        )}
                        
                        {/* Gradient overlay */}
                        <div 
                            className={`absolute inset-0 bg-gradient-to-t from-charcoal/50 via-transparent to-transparent transition-opacity duration-300 ${
                                isHovered ? 'opacity-100' : 'opacity-0'
                            }`}
                        />
                        
                        {/* Image indicators */}
                        {hasMultipleImages && (
                            <div 
                                className={`absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 transition-all duration-300 ${
                                    isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                                }`}
                            >
                                {uniqueImages.current.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={`h-1 rounded-full transition-all duration-300 ${
                                            idx === currentImageIndex 
                                                ? 'w-5 bg-white' 
                                                : 'w-1.5 bg-white/50'
                                        }`}
                                    />
                                ))}
                            </div>
                        )}
                        
                        {/* View button */}
                        <div
                            className={`absolute top-3 right-3 transition-all duration-300 ${
                                isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                            }`}
                        >
                            <div className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-lg">
                                <Eye className="w-4 h-4 text-charcoal" />
                            </div>
                        </div>
                        
                        {/* Category tag */}
                        <div className="absolute top-3 left-3">
                            <span className="px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-charcoal/80 shadow-sm">
                                {product.category || 'Product'}
                            </span>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                        <h3 
                            className={`font-semibold text-charcoal text-base mb-1 line-clamp-1 transition-transform duration-300 ${
                                isHovered ? 'translate-x-1' : ''
                            }`}
                        >
                            {product.name}
                        </h3>
                        
                        <p className="text-sm text-charcoal/50 line-clamp-2 mb-3 min-h-[36px]">
                            {product.description || 'Discover this amazing product'}
                        </p>
                        
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-charcoal/40">
                                by <span className="text-charcoal/60 font-medium">{product.brand.user?.name || 'Brand'}</span>
                            </span>
                            
                            <div
                                className={`flex items-center gap-1 text-charcoal/70 text-xs font-medium transition-all duration-300 ${
                                    isHovered ? 'opacity-100' : 'opacity-60'
                                }`}
                            >
                                <span>View</span>
                                <ArrowRight className={`w-3 h-3 transition-transform duration-300 ${
                                    isHovered ? 'translate-x-1' : ''
                                }`} />
                            </div>
                        </div>
                    </div>
                    
                    {/* Bottom accent line */}
                    <div
                        className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-peach to-charcoal transition-all duration-500 ease-out ${
                            isHovered ? 'w-full' : 'w-0'
                        }`}
                    />
                </div>
            </Link>
        </motion.div>
    )
})

export default ProductCard
