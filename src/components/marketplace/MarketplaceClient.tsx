'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { ShoppingBag, Filter, Sparkles, Search, X } from 'lucide-react'
import ProductCard from './ProductCard'

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

export default function MarketplaceClient({ products, categories, activeCategory }: MarketplaceClientProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [showSearch, setShowSearch] = useState(false)
    
    // Memoize filtered products
    const filteredProducts = useMemo(() => {
        if (!searchQuery) return products
        const query = searchQuery.toLowerCase()
        return products.filter(p => 
            p.name.toLowerCase().includes(query) ||
            p.description?.toLowerCase().includes(query)
        )
    }, [products, searchQuery])

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value)
    }, [])

    const clearSearch = useCallback(() => setSearchQuery(''), [])
    const toggleSearch = useCallback(() => setShowSearch(prev => !prev), [])

    return (
        <div className="min-h-screen bg-gradient-to-b from-cream via-cream to-white pt-24 pb-16">
                <div className="container mx-auto px-4 sm:px-6">
                    {/* Header */}
                    <div className="mb-10 animate-fade-in">
                        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-peach/20 flex items-center justify-center">
                                        <Sparkles className="w-4 h-4 text-peach" />
                                    </div>
                                    <span className="text-sm font-medium text-charcoal/50">Discover & Collaborate</span>
                                </div>
                                <h1 className="text-4xl sm:text-5xl font-serif text-charcoal">
                                    Brand <span className="italic text-charcoal/70">Marketplace</span>
                                </h1>
                                <p className="text-charcoal/50 mt-2">
                                    Find perfect collaboration opportunities tailored to your niche
                                </p>
                            </div>
                            
                            {/* Search toggle */}
                            <div className="flex items-center gap-3">
                                {showSearch && (
                                    <div className="relative animate-scale-fade">
                                        <input
                                            type="text"
                                            placeholder="Search products..."
                                            value={searchQuery}
                                            onChange={handleSearchChange}
                                            className="w-[250px] px-4 py-2.5 pr-10 rounded-full border border-charcoal/10 bg-white focus:border-charcoal/30 focus:outline-none text-sm transition-colors"
                                            autoFocus
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={clearSearch}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal/30 hover:text-charcoal/60 transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                )}
                                
                                <button
                                    onClick={toggleSearch}
                                    className={`p-3 rounded-full transition-all duration-200 ${
                                        showSearch 
                                            ? 'bg-charcoal text-cream' 
                                            : 'bg-white border border-charcoal/10 text-charcoal hover:border-charcoal/30'
                                    }`}
                                >
                                    <Search className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Category Filter */}
                        <div className="flex items-center gap-3 mb-2">
                            <Filter className="w-4 h-4 text-charcoal/40" />
                            <span className="text-sm text-charcoal/40">Filter by category</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                            {categories.map((category) => {
                                const categoryValue = category === 'All Products' ? 'all' : category.toLowerCase()
                                const isActive = activeCategory === categoryValue
                                return (
                                    <Link
                                        key={category}
                                        href={`/marketplace?category=${categoryValue}`}
                                        prefetch={true}
                                        data-cursor={isActive ? '' : 'Select'}
                                    >
                                        <span
                                            className={`inline-block px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 cursor-none ${
                                                isActive
                                                    ? 'bg-charcoal text-cream shadow-lg shadow-charcoal/20'
                                                    : 'bg-white border border-charcoal/10 text-charcoal/60 hover:border-charcoal/30 hover:text-charcoal'
                                            }`}
                                        >
                                            {category}
                                        </span>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>

                    {/* Product Count */}
                    <p className="text-sm text-charcoal/40 mb-8 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
                        {searchQuery && (
                            <span className="text-charcoal/30">
                                for &quot;{searchQuery}&quot;
                            </span>
                        )}
                    </p>

                    {/* Product Grid */}
                    {filteredProducts.length === 0 ? (
                        <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl border border-charcoal/5 p-16 text-center overflow-hidden animate-fade-in">
                            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                <div className="absolute -top-20 -right-20 w-60 h-60 bg-peach/10 rounded-full blur-3xl" />
                                <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-charcoal/5 rounded-full blur-3xl" />
                            </div>
                            
                            <ShoppingBag className="w-20 h-20 text-charcoal/10 mx-auto mb-6" />
                            <h3 className="relative text-2xl font-serif text-charcoal mb-3">No products found</h3>
                            <p className="relative text-charcoal/50 mb-6">
                                {searchQuery 
                                    ? 'Try adjusting your search terms'
                                    : 'Try adjusting your filters or check back later'
                                }
                            </p>
                            {searchQuery && (
                                <button
                                    onClick={clearSearch}
                                    className="px-6 py-3 bg-charcoal text-cream rounded-full font-medium hover:bg-charcoal/90 transition-colors"
                                >
                                    Clear Search
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {filteredProducts.map((product, index) => (
                                <ProductCard 
                                    key={product.id} 
                                    product={product} 
                                    index={index}
                                    priority={index < 4} // Priority load first 4 images
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
    )
}
