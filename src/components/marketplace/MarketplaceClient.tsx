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
                        <div className="bg-white border-[3px] border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-2xl relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 border-[2px] border-black bg-[#FFD93D] flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                        <Sparkles className="w-5 h-5 text-black" />
                                    </div>
                                    <span className="text-sm font-bold uppercase tracking-widest text-charcoal/70">Discover & Collaborate</span>
                                </div>
                                <h1 className="text-5xl sm:text-6xl font-black text-charcoal mb-4 uppercase leading-[0.9]">
                                    Brand <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-charcoal to-gray-500">Marketplace</span>
                                </h1>
                                <p className="text-charcoal/70 text-lg font-medium max-w-md border-l-[3px] border-[#FFD93D] pl-4">
                                    Find perfect collaboration opportunities tailored to your niche.
                                </p>
                            </div>
                            {/* Decorative elements */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gray-100 rounded-bl-full border-l-[3px] border-b-[3px] border-black -mr-[3px] -mt-[3px] z-0 opacity-50" />
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
                                        className="w-[250px] px-4 py-2.5 pr-10 rounded-lg border-[3px] border-black bg-white focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-sm font-medium transition-all text-charcoal"
                                        autoFocus
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={clearSearch}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal hover:scale-110 transition-transform"
                                        >
                                            <X className="w-4 h-4 font-bold" />
                                        </button>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={toggleSearch}
                                className={`p-3 rounded-lg border-[3px] border-black transition-all duration-200 ${showSearch
                                    ? 'bg-peach text-charcoal shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1'
                                    : 'bg-white text-charcoal hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1'
                                    }`}
                            >
                                <Search className="w-5 h-5 font-bold" />
                            </button>
                        </div>
                    </div>

                    {/* Category Filter */}
                    <div className="flex items-center gap-3 mb-2">
                        <Filter className="w-4 h-4 text-charcoal/40" />
                        <span className="text-sm text-charcoal/40">Filter by category</span>
                    </div>

                    <div className="flex flex-wrap gap-3">
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
                                        className={`inline-block px-6 py-3 rounded-none text-sm font-bold transition-all duration-200 cursor-pointer border-[3px] uppercase tracking-wider ${isActive
                                                ? 'bg-[#FFD93D] text-black border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1'
                                                : 'bg-white border-black text-charcoal hover:bg-gray-50 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1'
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
