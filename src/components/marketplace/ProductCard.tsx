'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
}

export default function ProductCard({ product, index }: ProductCardProps) {
    const [isHovered, setIsHovered] = useState(false)
    const [currentImageIndex, setCurrentImageIndex] = useState(0)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    
    // Collect all available images
    const allImages = [
        ...(product.images?.map(img => img.imagePath) || []),
        product.imagePath
    ].filter(Boolean) as string[]
    
    // Remove duplicates
    const uniqueImages = [...new Set(allImages)]
    const hasMultipleImages = uniqueImages.length > 1

    // Auto-cycle images on hover
    useEffect(() => {
        if (isHovered && hasMultipleImages) {
            intervalRef.current = setInterval(() => {
                setCurrentImageIndex(prev => (prev + 1) % uniqueImages.length)
            }, 1200) // Change image every 1.2 seconds
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
            setCurrentImageIndex(0)
        }
        
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [isHovered, hasMultipleImages, uniqueImages.length])

    const currentImage = uniqueImages[currentImageIndex] || null

    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
                delay: index * 0.08,
                type: "spring",
                stiffness: 300,
                damping: 25
            }}
        >
            <Link href={`/marketplace/${product.id}`}>
                <motion.div 
                    data-cursor="View"
                    className="group relative bg-white rounded-3xl overflow-hidden border border-charcoal/5 cursor-none"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    whileHover={{ 
                        y: -8,
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)"
                    }}
                    transition={{ 
                        type: "spring", 
                        stiffness: 300, 
                        damping: 20 
                    }}
                >
                    {/* Image Container */}
                    <div className="aspect-[4/5] relative overflow-hidden bg-gradient-to-br from-cream to-charcoal/5">
                        <AnimatePresence mode="wait">
                            {currentImage ? (
                                <motion.div
                                    key={currentImage}
                                    initial={{ opacity: 0, scale: 1.1 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                                    className="absolute inset-0"
                                >
                                    <Image
                                        src={currentImage}
                                        alt={product.name}
                                        fill
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                                        className="object-cover"
                                        loading="lazy"
                                    />
                                </motion.div>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <ShoppingBag className="w-16 h-16 text-charcoal/10" />
                                </div>
                            )}
                        </AnimatePresence>
                        
                        {/* Gradient overlay on hover */}
                        <motion.div 
                            className="absolute inset-0 bg-gradient-to-t from-charcoal/60 via-charcoal/10 to-transparent"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: isHovered ? 1 : 0 }}
                            transition={{ duration: 0.3 }}
                        />
                        
                        {/* Image indicators */}
                        {hasMultipleImages && (
                            <motion.div 
                                className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ 
                                    opacity: isHovered ? 1 : 0, 
                                    y: isHovered ? 0 : 10 
                                }}
                                transition={{ duration: 0.3 }}
                            >
                                {uniqueImages.map((_, idx) => (
                                    <motion.div
                                        key={idx}
                                        className={`h-1 rounded-full transition-all duration-300 ${
                                            idx === currentImageIndex 
                                                ? 'w-6 bg-white' 
                                                : 'w-1.5 bg-white/50'
                                        }`}
                                        animate={{
                                            scale: idx === currentImageIndex ? 1 : 0.8
                                        }}
                                    />
                                ))}
                            </motion.div>
                        )}
                        
                        {/* View button */}
                        <motion.div
                            className="absolute top-4 right-4"
                            initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                            animate={{ 
                                opacity: isHovered ? 1 : 0, 
                                scale: isHovered ? 1 : 0.8,
                                rotate: isHovered ? 0 : -10
                            }}
                            transition={{ duration: 0.3, type: "spring", stiffness: 400 }}
                        >
                            <div className="w-12 h-12 rounded-full bg-white/95 backdrop-blur flex items-center justify-center shadow-lg">
                                <Eye className="w-5 h-5 text-charcoal" />
                            </div>
                        </motion.div>
                        
                        {/* Category tag - top left */}
                        <motion.div
                            className="absolute top-4 left-4"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ 
                                opacity: isHovered ? 1 : 0.9, 
                                x: 0 
                            }}
                        >
                            <span className="px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-charcoal shadow-sm">
                                {product.category || 'Product'}
                            </span>
                        </motion.div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                        <motion.h3 
                            className="font-semibold text-charcoal text-lg mb-1 line-clamp-1"
                            animate={{ x: isHovered ? 4 : 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        >
                            {product.name}
                        </motion.h3>
                        
                        <p className="text-sm text-charcoal/50 line-clamp-2 mb-4 min-h-[40px]">
                            {product.description || 'Discover this amazing product'}
                        </p>
                        
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-charcoal/40 flex items-center gap-1">
                                by <span className="text-charcoal/60 font-medium">{product.brand.user?.name || 'Brand'}</span>
                            </span>
                            
                            <motion.div
                                className="flex items-center gap-1 text-charcoal/70 text-sm font-medium"
                                animate={{ 
                                    x: isHovered ? 0 : -4,
                                    opacity: isHovered ? 1 : 0.7
                                }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            >
                                <span>Explore</span>
                                <motion.span
                                    animate={{ x: isHovered ? 4 : 0 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                >
                                    <ArrowRight className="w-4 h-4" />
                                </motion.span>
                            </motion.div>
                        </div>
                    </div>
                    
                    {/* Bottom border animation */}
                    <motion.div
                        className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-peach via-charcoal to-peach"
                        initial={{ width: "0%" }}
                        animate={{ width: isHovered ? "100%" : "0%" }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                </motion.div>
            </Link>
        </motion.div>
    )
}

