'use client'

import { useState, useEffect, memo, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
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
        brand?: {
            id: string
            companyName: string | null
            user?: {
                name: string | null
                slug: string | null
            } | null
        } | null
        images: ProductImage[]
    }
    index: number
    priority?: boolean
}

function formatPrice(price: any): string {
    if (!price) return ''
    const numPrice = typeof price === 'string' ? parseFloat(price) : price
    if (isNaN(numPrice)) return ''
    return `Rs. ${numPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const ProductCard = memo(function ProductCard({ product, index, priority = false }: ProductCardProps) {
    const router = useRouter()
    const [isHovered, setIsHovered] = useState(false)
    const [firstImageLoaded, setFirstImageLoaded] = useState(false)
    const [canHover, setCanHover] = useState(false)

    const uniqueImages = useMemo(() => {
        const allImages = [
            ...(product.images?.map((img) => img.imagePath) || []),
            product.imagePath,
        ].filter(Boolean) as string[]
        return [...new Set(allImages)]
    }, [product.images, product.imagePath])

    const hasMultipleImages = uniqueImages.length > 1
    const currentImageIndex = isHovered && canHover && hasMultipleImages ? 1 : 0
    const currentImage = uniqueImages[currentImageIndex] || null

    useEffect(() => {
        if (typeof window === 'undefined') return
        const media = window.matchMedia('(hover: hover) and (pointer: fine)')
        const update = () => setCanHover(media.matches)
        update()
        media.addEventListener('change', update)
        return () => media.removeEventListener('change', update)
    }, [])

    useEffect(() => {
        if (!(isHovered && canHover && hasMultipleImages)) return
        for (let idx = 1; idx < uniqueImages.length; idx += 1) {
            const img = new window.Image()
            img.src = uniqueImages[idx]
        }
    }, [isHovered, canHover, hasMultipleImages, uniqueImages])

    const handleMouseEnter = useCallback(() => {
        if (canHover) setIsHovered(true)
    }, [canHover])

    const handleMouseLeave = useCallback(() => setIsHovered(false), [])

    const brandName = product.brand?.companyName || product.brand?.user?.name || 'Brand'
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
            <div
                data-cursor="View"
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/marketplace/${product.id}`)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        router.push(`/marketplace/${product.id}`)
                    }
                }}
                className={`group relative bg-white border-[3px] border-black rounded-xl overflow-hidden cursor-pointer transform-gpu transition-all duration-200 p-0 ${isHovered ? 'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] -translate-y-1' : 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <div className="aspect-[4/5] sm:aspect-[3/4] relative overflow-hidden bg-white border-b-[3px] border-black">
                    {!firstImageLoaded && (
                        <div className="absolute inset-0 bg-gradient-to-br from-cream via-charcoal/5 to-cream animate-pulse">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skeleton-shimmer" />
                        </div>
                    )}

                    {uniqueImages.map((imgSrc, idx) => (
                        <div
                            key={imgSrc}
                            className={`absolute inset-0 transition-opacity duration-400 ease-out ${idx === currentImageIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                        >
                            <Image
                                src={imgSrc}
                                alt={idx === 0 ? product.name : `${product.name} - ${idx + 1}`}
                                fill
                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                className={`object-cover transition-transform duration-500 ease-out ${isHovered ? 'scale-105' : 'scale-100'}`}
                                priority={priority && idx === 0}
                                loading={idx === 0 ? (priority ? 'eager' : 'lazy') : 'lazy'}
                                onLoad={() => {
                                    if (idx === 0) setFirstImageLoaded(true)
                                }}
                                placeholder="blur"
                                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAwEPwAB//9k="
                            />
                        </div>
                    ))}

                    {!currentImage && (
                        <div className="absolute inset-0 flex items-center justify-center bg-cream">
                            <ShoppingBag className="w-12 h-12 text-charcoal/10" />
                        </div>
                    )}

                    {hasMultipleImages && canHover && (
                        <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 transition-all duration-300 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                            {uniqueImages.slice(0, 2).map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`h-1 rounded-full transition-all duration-300 ${idx === currentImageIndex ? 'w-5 bg-charcoal' : 'w-1.5 bg-charcoal/30'}`}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-2 p-2.5 sm:space-y-2.5 sm:p-3.5">
                    <h3 className="font-semibold text-charcoal text-[13px] sm:text-[15px] line-clamp-2 leading-tight min-h-[34px] sm:min-h-[38px]">
                        {product.name}
                    </h3>

                    <div className="flex items-center gap-1.5 text-[11px] sm:text-sm text-charcoal/60">
                        <span className="truncate">{brandName}</span>
                        {priceDisplay && (
                            <>
                                <span className="text-charcoal/30">|</span>
                                <span className="font-medium text-charcoal/80">{priceDisplay}</span>
                            </>
                        )}
                    </div>

                    <div className="flex items-center justify-between gap-1.5 sm:gap-2 pt-1">
                        <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-white border-[2px] border-black rounded-md text-[10px] sm:text-[11px] font-bold text-charcoal shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap">
                            {product.category || 'Product'}
                        </span>

                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/influencer/try-on?productId=${product.id}`)
                            }}
                            className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-[#FFD93D] text-black border-[2px] border-black rounded-md text-[10px] sm:text-[11px] font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center gap-1 whitespace-nowrap"
                        >
                            Try-On
                            <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    )
})

export default ProductCard


