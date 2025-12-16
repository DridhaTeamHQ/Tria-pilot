'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ShoppingBag, Filter, Sparkles, Search, X } from 'lucide-react'
import ProductCard from './ProductCard'
import BlobCursor from './BlobCursor'

interface ProductImage {
    id: string
    imagePath: string
}

interface Product {
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

interface MarketplaceClientProps {
    products: Product[]
    categories: string[]
    activeCategory: string
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1
        }
    }
}

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
        opacity: 1, 
        y: 0,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 25
        }
    }
}

export default function MarketplaceClient({ products, categories, activeCategory }: MarketplaceClientProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [showSearch, setShowSearch] = useState(false)
    
    // Filter products by search
    const filteredProducts = searchQuery 
        ? products.filter(p => 
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description?.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : products

    return (
        <>
            <BlobCursor />
            
            <div className="min-h-screen bg-gradient-to-b from-cream via-cream to-white pt-24 pb-16">
                <div className="container mx-auto px-4 sm:px-6">
                    {/* Header */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="mb-12"
                    >
                        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
                            <div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="flex items-center gap-2 mb-3"
                                >
                                    <div className="w-8 h-8 rounded-full bg-peach/20 flex items-center justify-center">
                                        <Sparkles className="w-4 h-4 text-peach" />
                                    </div>
                                    <span className="text-sm font-medium text-charcoal/50">Discover & Collaborate</span>
                                </motion.div>
                                <motion.h1 
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.15 }}
                                    className="text-4xl sm:text-5xl font-serif text-charcoal"
                                >
                                    Brand <span className="italic text-charcoal/70">Marketplace</span>
                                </motion.h1>
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-charcoal/50 mt-2"
                                >
                                    Find perfect collaboration opportunities tailored to your niche
                                </motion.p>
                            </div>
                            
                            {/* Search toggle */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.25 }}
                                className="flex items-center gap-3"
                            >
                                <AnimatePresence>
                                    {showSearch && (
                                        <motion.div
                                            initial={{ width: 0, opacity: 0 }}
                                            animate={{ width: 250, opacity: 1 }}
                                            exit={{ width: 0, opacity: 0 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                            className="relative overflow-hidden"
                                        >
                                            <input
                                                type="text"
                                                placeholder="Search products..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full px-4 py-2.5 pr-10 rounded-full border border-charcoal/10 bg-white focus:border-charcoal/30 focus:outline-none text-sm"
                                                autoFocus
                                            />
                                            {searchQuery && (
                                                <button
                                                    onClick={() => setSearchQuery('')}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal/30 hover:text-charcoal/60"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setShowSearch(!showSearch)}
                                    className={`p-3 rounded-full transition-colors ${
                                        showSearch 
                                            ? 'bg-charcoal text-cream' 
                                            : 'bg-white border border-charcoal/10 text-charcoal hover:border-charcoal/30'
                                    }`}
                                >
                                    <Search className="w-5 h-5" />
                                </motion.button>
                            </motion.div>
                        </div>

                        {/* Category Filter */}
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex items-center gap-3 mb-2"
                        >
                            <Filter className="w-4 h-4 text-charcoal/40" />
                            <span className="text-sm text-charcoal/40">Filter by category</span>
                        </motion.div>
                        
                        <motion.div 
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="flex flex-wrap gap-2"
                        >
                            {categories.map((category, idx) => {
                                const categoryValue = category === 'All Products' ? 'all' : category.toLowerCase()
                                const isActive = activeCategory === categoryValue
                                return (
                                    <motion.div
                                        key={category}
                                        variants={itemVariants}
                                        custom={idx}
                                    >
                                        <Link
                                            href={`/marketplace?category=${categoryValue}`}
                                            data-cursor={isActive ? '' : 'Select'}
                                        >
                                            <motion.span
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                className={`inline-block px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 cursor-none ${
                                                    isActive
                                                        ? 'bg-charcoal text-cream shadow-lg shadow-charcoal/20'
                                                        : 'bg-white border border-charcoal/10 text-charcoal/60 hover:border-charcoal/30 hover:text-charcoal'
                                                }`}
                                            >
                                                {category}
                                            </motion.span>
                                        </Link>
                                    </motion.div>
                                )
                            })}
                        </motion.div>
                    </motion.div>

                    {/* Product Count */}
                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-sm text-charcoal/40 mb-8 flex items-center gap-2"
                    >
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
                        {searchQuery && (
                            <span className="text-charcoal/30">
                                for &ldquo;{searchQuery}&rdquo;
                            </span>
                        )}
                    </motion.p>

                    {/* Product Grid */}
                    <AnimatePresence mode="wait">
                        {filteredProducts.length === 0 ? (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -30 }}
                                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                className="relative bg-white/80 backdrop-blur-sm rounded-3xl border border-charcoal/5 p-16 text-center overflow-hidden"
                            >
                                {/* Background decoration */}
                                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                    <div className="absolute -top-20 -right-20 w-60 h-60 bg-peach/10 rounded-full blur-3xl" />
                                    <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-charcoal/5 rounded-full blur-3xl" />
                                </div>
                                
                                <motion.div
                                    animate={{ 
                                        y: [0, -8, 0],
                                        rotate: [0, 3, 0]
                                    }}
                                    transition={{ 
                                        duration: 4, 
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                >
                                    <ShoppingBag className="w-20 h-20 text-charcoal/10 mx-auto mb-6" />
                                </motion.div>
                                <h3 className="relative text-2xl font-serif text-charcoal mb-3">No products found</h3>
                                <p className="relative text-charcoal/50 mb-6">
                                    {searchQuery 
                                        ? 'Try adjusting your search terms'
                                        : 'Try adjusting your filters or check back later'
                                    }
                                </p>
                                {searchQuery && (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setSearchQuery('')}
                                        className="px-6 py-3 bg-charcoal text-cream rounded-full font-medium"
                                    >
                                        Clear Search
                                    </motion.button>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="grid"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                            >
                                {filteredProducts.map((product, index) => (
                                    <ProductCard 
                                        key={product.id} 
                                        product={product} 
                                        index={index} 
                                    />
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </>
    )
}

