'use client'

import { useState, useEffect, useRef, memo, useCallback } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShoppingBag, ArrowRight } from 'lucide-react'

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

// Format price helper
function formatPrice(price: any): string {
    if (!price) return ''
    const numPrice = typeof price === 'string' ? parseFloat(price) : price
    if (isNaN(numPrice)) return ''
    return `Rs. ${numPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const ProductCard = memo(function ProductCard({ product, index, priority = false }: ProductCardProps) {
    const [isHovered, setIsHovered] = useState(false)
    const [currentImageIndex, setCurrentImageIndex] = useState(0)
    const [imagesLoaded, setImagesLoaded] = useState<Set<number>>(new Set([0]))
    const [firstImageLoaded, setFirstImageLoaded] = useState(false)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)

    // Collect all available images
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
            preloadImages()

            intervalRef.current = setInterval(() => {
                setCurrentImageIndex(prev => (prev + 1) % uniqueImages.current.length)
            }, 1500)
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
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

    const brandName = product.brand.companyName || product.brand.user?.name || 'Brand'
    const priceDisplay = formatPrice(product.price)

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                delay: Math.min(index * 0.05, 0.3),
                duration: 0.4,
                ease: [0.25, 0.1, 0.25, 1]
            }}
        >
            <Link href={`/marketplace/${product.id}`} prefetch={index < 8}>
                <div
                    data-cursor="View"
                    className={`group relative bg-cream/50 rounded-3xl overflow-hidden cursor-pointer transform-gpu transition-all duration-300 p-4 ${isHovered ? 'shadow-xl shadow-charcoal/10 -translate-y-1' : 'shadow-sm hover:shadow-md'
                        }`}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    {/* Image Container - Rounded */}
                    <div className="aspect-[3/4] relative overflow-hidden rounded-2xl bg-white mb-4">
                        {/* Skeleton loader */}
                        {!firstImageLoaded && (
                            <div className="absolute inset-0 bg-gradient-to-br from-cream via-charcoal/5 to-cream animate-pulse">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skeleton-shimmer" />
                            </div>
                        )}

                        {/* Images stack */}
                        {uniqueImages.current.map((imgSrc, idx) => (
                            <div
                                key={imgSrc}
                                className={`absolute inset-0 transition-opacity duration-500 ease-out ${idx === currentImageIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                                    }`}
                            >
                                <Image
                                    src={imgSrc}
                                    alt={idx === 0 ? product.name : `${product.name} - ${idx + 1}`}
                                    fill
                                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                    className={`object-cover transition-transform duration-700 ease-out ${isHovered ? 'scale-105' : 'scale-100'
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

                        {/* Image indicators */}
                        {hasMultipleImages && (
                            <div
                                className={`absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 transition-all duration-300 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                                    }`}
                            >
                                {uniqueImages.current.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={`h-1 rounded-full transition-all duration-300 ${idx === currentImageIndex
                                            ? 'w-5 bg-charcoal'
                                            : 'w-1.5 bg-charcoal/30'
                                            }`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                        {/* Product Name */}
                        <h3 className="font-semibold text-charcoal text-base line-clamp-2 leading-tight min-h-[40px]">
                            {product.name}
                        </h3>

                        {/* Brand + Price Row */}
                        <div className="flex items-center gap-2 text-sm text-charcoal/60">
                            <span className="truncate">{brandName}</span>
                            {priceDisplay && (
                                <>
                                    <span className="text-charcoal/30">|</span>
                                    <span className="font-medium text-charcoal/80">{priceDisplay}</span>
                                </>
                            )}
                        </div>

                        {/* Buttons Row */}
                        <div className="flex items-center justify-between pt-2">
                            {/* Category Tag */}
                            <span className="px-3 py-1.5 bg-white border border-charcoal/10 rounded-full text-xs font-medium text-charcoal/70">
                                {product.category || 'Product'}
                            </span>

                            {/* Try Tryon Button - Using button instead of Link to avoid nested anchor */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    e.preventDefault()
                                    window.location.href = `/influencer/try-on?productId=${product.id}`
                                }}
                                className="px-4 py-1.5 bg-charcoal text-white rounded-full text-xs font-medium hover:bg-charcoal/90 transition-colors flex items-center gap-1.5"
                            >
                                Try Tryon
                                <ArrowRight className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    )
})

export default ProductCard
