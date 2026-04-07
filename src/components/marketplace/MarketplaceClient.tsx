'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { ShoppingBag, Filter, Sparkles, Search, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
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

const DUMMY_CAMPAIGNS = [
    {
        eyebrow: 'Featured Campaign',
        title: 'Summer Streetwear Drop',
        body: 'Creators needed for casual fit checks, reels, and product-led styling edits.',
        accent: 'bg-[#FFD93D]',
        stat: '12 creators',
        tone: 'text-black',
    },
    {
        eyebrow: 'Sponsored Ad Burst',
        title: 'Beauty Launch Sprint',
        body: 'Fast-moving UGC push for launch week with try-on visuals and conversion-first hooks.',
        accent: 'bg-[#FF8C69]',
        stat: '48h launch',
        tone: 'text-black',
    },
    {
        eyebrow: 'Brand Collaboration',
        title: 'Gen-Z Campus Edit',
        body: 'Lifestyle campaign built for creators with playful styling, campus stories, and affiliate links.',
        accent: 'bg-[#B4F056]',
        stat: 'High engagement',
        tone: 'text-black',
    },
]

export default function MarketplaceClient({ products, categories, activeCategory }: MarketplaceClientProps) {
    const router = useRouter()
    const [searchInput, setSearchInput] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [activeCampaign, setActiveCampaign] = useState(0)

    // Memoize filtered products
    const filteredProducts = useMemo(() => {
        if (!searchQuery) return products
        const query = searchQuery.toLowerCase()
        return products.filter(p =>
            p.name.toLowerCase().includes(query) ||
            p.description?.toLowerCase().includes(query)
        )
    }, [products, searchQuery])

    const handleSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchInput(e.target.value)
    }, [])

    const applySearch = useCallback(() => {
        setSearchQuery(searchInput.trim())
    }, [searchInput])

    const clearSearch = useCallback(() => {
        setSearchInput('')
        setSearchQuery('')
    }, [])

    useEffect(() => {
        // Prefetch top visible product routes so first click feels instant.
        products.slice(0, 8).forEach((p) => {
            router.prefetch(`/marketplace/${p.id}`)
        })
    }, [products, router])

    useEffect(() => {
        const interval = window.setInterval(() => {
            setActiveCampaign((prev) => (prev + 1) % DUMMY_CAMPAIGNS.length)
        }, 4500)
        return () => window.clearInterval(interval)
    }, [])

    return (
        <div className="min-h-screen bg-gradient-to-b from-cream via-cream to-white pt-24 pb-16">
            <div className="container mx-auto px-4 sm:px-6">
                {/* Header */}
                <div className="mb-10 animate-fade-in">
                    <div className="mb-8 grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] xl:items-stretch">
                        <div className="relative h-full overflow-hidden rounded-[28px] border-[3px] border-black bg-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:p-8">
                            <div className="relative z-10">
                                <div className="mb-4 flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center border-[2px] border-black bg-[#FFD93D] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                        <Sparkles className="h-5 w-5 text-black" />
                                    </div>
                                    <span className="text-sm font-bold uppercase tracking-widest text-charcoal/70">Discover & Collaborate</span>
                                </div>
                                <h1 className="mb-4 text-4xl font-black uppercase leading-[0.9] text-charcoal sm:text-6xl">
                                    Brand <br /><span className="block break-all bg-gradient-to-r from-charcoal to-gray-500 bg-clip-text text-transparent sm:break-normal">Marketplace</span>
                                </h1>
                                <p className="max-w-md border-l-[3px] border-[#FFD93D] pl-4 text-lg font-medium text-charcoal/70">
                                    Find perfect collaboration opportunities tailored to your niche.
                                </p>
                            </div>
                            <div className="absolute right-0 top-0 z-0 h-32 w-32 rounded-bl-full border-b-[3px] border-l-[3px] border-black bg-gray-100 opacity-50 -mr-[3px] -mt-[3px]" />
                        </div>

                        <div className="min-h-[272px] overflow-hidden rounded-[26px] border-[3px] border-black bg-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:min-h-[300px] sm:p-6 xl:h-full">
                            <div className="h-full">
                                <div className="flex h-full flex-col justify-between overflow-hidden rounded-[24px] border-[3px] border-black bg-[#fff7e3] p-5 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-charcoal/50">
                                                {DUMMY_CAMPAIGNS[activeCampaign].eyebrow}
                                            </p>
                                            <h3 className="mt-3 text-[clamp(1.55rem,3.6vw,2.75rem)] font-black uppercase leading-[0.9] text-charcoal">
                                                {DUMMY_CAMPAIGNS[activeCampaign].title}
                                            </h3>
                                        </div>
                                        <span className={`shrink-0 rounded-full border-[3px] border-black px-4 py-2 text-xs font-black uppercase tracking-[0.12em] ${DUMMY_CAMPAIGNS[activeCampaign].accent} ${DUMMY_CAMPAIGNS[activeCampaign].tone}`}>
                                            {DUMMY_CAMPAIGNS[activeCampaign].stat}
                                        </span>
                                    </div>
                                    <p className="mt-4 max-h-[4.75rem] max-w-xl overflow-hidden border-l-[3px] border-black/20 pl-4 text-sm font-medium leading-6 text-charcoal/70 sm:max-h-[5.5rem] sm:text-base sm:leading-7">
                                        {DUMMY_CAMPAIGNS[activeCampaign].body}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Category Filter */}
                    <div className="flex items-center gap-3 mb-2">
                        <Filter className="w-4 h-4 text-charcoal/40" />
                        <span className="text-sm text-charcoal/40">Filter by category</span>
                    </div>

                    <div className="flex flex-wrap gap-2.5">
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
                                        className={`inline-block rounded-full border-[3px] px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${isActive
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

                    <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Search products, campaigns, or collab ideas..."
                                value={searchInput}
                                onChange={handleSearchInputChange}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        applySearch()
                                    }
                                }}
                                className="w-full rounded-xl border-[3px] border-black bg-white px-4 py-3 pr-11 text-sm font-medium text-charcoal transition-all focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                            />
                            {searchInput && (
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal transition-transform hover:scale-110"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={applySearch}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border-[3px] border-black bg-[#FFD93D] px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                        >
                            <Search className="h-4 w-4" />
                            Search
                        </button>
                    </div>
                </div>

                {/* Product Count */}
                <div className="mb-8 flex flex-wrap items-center gap-3 rounded-full border-[2px] border-black/10 bg-white/80 px-4 py-2 text-sm font-medium text-charcoal/50 backdrop-blur-sm">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span>
                        {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
                    </span>
                    {searchQuery && (
                        <span className="text-charcoal/35">
                            for &quot;{searchQuery}&quot;
                        </span>
                    )}
                </div>

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
                            <button type="button"
                                onClick={clearSearch}
                                className="px-6 py-3 bg-charcoal text-cream rounded-full font-medium hover:bg-charcoal/90 transition-colors"
                            >
                                Clear Search
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
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
