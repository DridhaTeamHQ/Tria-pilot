'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
    Plus,
    Package,
    Loader2,
    Trash2,
    Edit2,
    X,
    Camera,
    Save,
    ExternalLink,
    Shirt
} from 'lucide-react'

// Define Interface (shared with Server Component ideally, but defined here for now)
export interface Product {
    id: string
    name: string
    description?: string
    category?: string
    price?: number
    link?: string
    tags?: string[]
    audience?: string
    cover_image?: string
    tryon_image?: string
    images?: string[]
    active: boolean
    created_at: string
}

interface ProductsClientProps {
    initialProducts: Product[]
}

const CATEGORIES = ['Clothing', 'Accessories', 'Footwear', 'Beauty', 'Lifestyle', 'Electronics', 'Home', 'Other']
const AUDIENCES = ['Men', 'Women', 'Unisex', 'Kids']

export default function ProductsClient({ initialProducts }: ProductsClientProps) {
    const router = useRouter()
    // Hydrate state from Server Prop
    const [products, setProducts] = useState<Product[]>(initialProducts)
    // No loading state needed for initial load (it's instant)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)

    // Update internal state when server prop changes (e.g. after router.refresh())
    useEffect(() => {
        setProducts(initialProducts)
    }, [initialProducts])

    // Form state
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [category, setCategory] = useState('')
    const [price, setPrice] = useState('')
    const [link, setLink] = useState('')
    const [tags, setTags] = useState('')
    const [audience, setAudience] = useState('')
    const [images, setImages] = useState<string[]>([])
    const [coverIndex, setCoverIndex] = useState(0)
    const [tryonIndex, setTryonIndex] = useState<number | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)

    // Replaces "fetchProducts" - requests a Server Component refresh
    const refreshData = () => {
        router.refresh()
    }

    const resetForm = () => {
        setName('')
        setDescription('')
        setCategory('')
        setPrice('')
        setLink('')
        setTags('')
        setAudience('')
        setImages([])
        setCoverIndex(0)
        setTryonIndex(null)
        setEditingProduct(null)
        setShowForm(false)
    }

    const openEditForm = (product: Product) => {
        setEditingProduct(product)
        setName(product.name)
        setDescription(product.description || '')
        setCategory(product.category || '')
        setPrice(product.price?.toString() || '')
        setLink(product.link || '')
        setTags(product.tags?.join(', ') || '')
        setAudience(product.audience || '')
        setImages(product.images || [])

        // Find cover and tryon indices
        if (product.images && product.images.length > 0) {
            const coverIdx = product.cover_image
                ? product.images.findIndex(img => img === product.cover_image)
                : 0
            setCoverIndex(coverIdx >= 0 ? coverIdx : 0)

            const tryonIdx = product.tryon_image
                ? product.images.findIndex(img => img === product.tryon_image)
                : null
            setTryonIndex(tryonIdx !== null && tryonIdx >= 0 ? tryonIdx : null)
        } else {
            setCoverIndex(0)
            setTryonIndex(null)
        }

        setShowForm(true)
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files) return

        Array.from(files).forEach(file => {
            const reader = new FileReader()
            reader.onload = (event) => {
                const base64 = event.target?.result as string
                setImages(prev => [...prev, base64])
            }
            reader.readAsDataURL(file)
        })
    }

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index))

        // Adjust cover/tryon indices
        if (coverIndex === index) {
            setCoverIndex(0)
        } else if (coverIndex > index) {
            setCoverIndex(prev => prev - 1)
        }

        if (tryonIndex === index) {
            setTryonIndex(null)
        } else if (tryonIndex !== null && tryonIndex > index) {
            setTryonIndex(prev => prev !== null ? prev - 1 : null)
        }
    }

    const setCover = (index: number) => {
        setCoverIndex(index)
        toast.success('Cover image set!')
    }

    const setTryon = (index: number) => {
        if (tryonIndex === index) {
            // Toggle off if clicking same image
            setTryonIndex(null)
            toast.info('Try-on image removed')
        } else {
            setTryonIndex(index)
            toast.success('Try-on image set!')
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) {
            toast.error('Product name is required')
            return
        }

        // 1. Optimistic Update
        const tempId = `temp-${Date.now()}`
        const optimisticProduct: Product = {
            id: editingProduct?.id || tempId,
            name: name.trim(),
            description: description.trim() || undefined,
            category: category || undefined,
            price: price ? parseFloat(price) : undefined,
            link: link.trim() || undefined,
            tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
            audience: audience || undefined,
            cover_image: images[coverIndex] || images[0] || undefined,
            tryon_image: tryonIndex !== null ? images[tryonIndex] : undefined,
            images: images,
            active: true,
            created_at: new Date().toISOString()
        }

        // Snapshot previous state for rollback
        const previousProducts = [...products]

        // Update UI immediately
        setProducts(prev => {
            if (editingProduct) {
                return prev.map(p => p.id === editingProduct.id ? optimisticProduct : p)
            }
            return [optimisticProduct, ...prev]
        })

        // Close form immediately for "instant" feel
        setShowForm(false)
        toast.info(editingProduct ? 'Saving changes...' : 'Creating product...')

        // Reset form state now (or after success? doing it now is riskier but feels faster)
        // Let's reset purely UI state, but keep data fields until success just in case we need to reopen?
        // Actually, for "instant" feel, we close the modal.

        try {
            const productData = { ...optimisticProduct }
            // Remove temp fields if any
            if (productData.id.startsWith('temp-')) delete (productData as any).id

            const method = editingProduct ? 'PUT' : 'POST'
            const url = editingProduct
                ? `/api/brand/products/${editingProduct.id}`
                : '/api/brand/products'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData),
            })

            const data = await res.json()

            if (!res.ok) throw new Error(data.error)

            // Success: Update with real data (server response might have generated fields like ID)
            const realProduct = data.product

            // Update the temp product with the real one
            setProducts(prev => prev.map(p => p.id === tempId ? realProduct : (p.id === realProduct.id ? realProduct : p)))

            toast.success(editingProduct ? 'Product updated!' : 'Product created!')
            resetForm()
            // We still trigger refresh to sync server cache, but UI is already consistent
            refreshData()
        } catch (error) {
            console.error('Failed to save product:', error)
            toast.error(error instanceof Error ? error.message : 'Failed to save product')

            // Revert State
            setProducts(previousProducts)
            setShowForm(true) // Re-open form
        }
    }

    const handleDelete = async (productId: string) => {
        if (!confirm('Are you sure you want to delete this product?')) return

        // 1. Optimistic Delete
        const previousProducts = [...products]
        setProducts(prev => prev.filter(p => p.id !== productId))
        toast.info('Deleting product...')

        try {
            const res = await fetch(`/api/brand/products/${productId}`, {
                method: 'DELETE',
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error)
            }

            toast.success('Product deleted!')
            refreshData()
        } catch (error) {
            console.error('Failed to delete product:', error)
            toast.error('Failed to delete product')
            // Revert
            setProducts(previousProducts)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-black" />
            </div>
        )
    }

    // Rendering logic for interactive form...
    // (Truncated for brevity in thought, but full code is in call)
    return (
        <div className="container mx-auto px-6 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-black mb-1">Products</h1>
                    <p className="text-black/60 font-medium">
                        Manage your product catalog • {products.length} products
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-3 bg-[#B4F056] border-[3px] border-black font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all"
                >
                    <Plus className="w-5 h-5" strokeWidth={2.5} />
                    Add Product
                </button>
            </div>

            {/* Product Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b-[3px] border-black">
                            <h2 className="text-xl font-black">
                                {editingProduct ? 'Edit Product' : 'Add New Product'}
                            </h2>
                            <button onClick={resetForm} className="p-2 hover:bg-gray-100">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Name */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider mb-2">
                                    Product Name *
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-black font-bold focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none"
                                    placeholder="e.g., Summer Collection T-Shirt"
                                    required
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-3 border-2 border-black font-medium focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none resize-none"
                                    placeholder="Describe your product..."
                                />
                            </div>

                            {/* Category & Audience */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider mb-2">
                                        Category
                                    </label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-black font-bold bg-white focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none"
                                    >
                                        <option value="">Select category</option>
                                        {CATEGORIES.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider mb-2">
                                        Target Audience
                                    </label>
                                    <select
                                        value={audience}
                                        onChange={(e) => setAudience(e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-black font-bold bg-white focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none"
                                    >
                                        <option value="">Select audience</option>
                                        {AUDIENCES.map(aud => (
                                            <option key={aud} value={aud}>{aud}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Price & Link */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider mb-2">
                                        Price (₹)
                                    </label>
                                    <input
                                        type="number"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-black font-bold focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none"
                                        placeholder="999"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider mb-2">
                                        Product Link
                                    </label>
                                    <input
                                        type="url"
                                        value={link}
                                        onChange={(e) => setLink(e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-black font-medium focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>

                            {/* Tags */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider mb-2">
                                    Tags (comma separated)
                                </label>
                                <input
                                    type="text"
                                    value={tags}
                                    onChange={(e) => setTags(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-black font-medium focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none"
                                    placeholder="summer, casual, cotton"
                                />
                            </div>

                            {/* Images with Cover/Try-On Selection */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider mb-2">
                                    Product Images
                                </label>
                                <p className="text-xs text-black/60 mb-3">
                                    Click image to set as <span className="text-[#B4F056] font-bold">COVER</span> (display) or <span className="text-[#FF6B35] font-bold">TRY-ON</span> (virtual try-on)
                                </p>
                                <div className="flex flex-wrap gap-3 mb-3">
                                    {images.map((img, index) => (
                                        <div
                                            key={index}
                                            className={`relative w-24 h-24 border-2 ${coverIndex === index ? 'border-[#B4F056] ring-2 ring-[#B4F056]' :
                                                tryonIndex === index ? 'border-[#FF6B35] ring-2 ring-[#FF6B35]' :
                                                    'border-black'
                                                }`}
                                        >
                                            <img
                                                src={img}
                                                alt={`Product ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />

                                            {/* Remove button */}
                                            <button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 border-2 border-black flex items-center justify-center z-10"
                                            >
                                                <X className="w-3 h-3 text-white" />
                                            </button>

                                            {/* Labels */}
                                            <div className="absolute bottom-0 left-0 right-0 flex">
                                                {coverIndex === index && (
                                                    <span className="flex-1 text-[10px] font-black bg-[#B4F056] text-center py-0.5 border-t-2 border-black">
                                                        COVER
                                                    </span>
                                                )}
                                                {tryonIndex === index && (
                                                    <span className="flex-1 text-[10px] font-black bg-[#FF6B35] text-white text-center py-0.5 border-t-2 border-black">
                                                        TRY-ON
                                                    </span>
                                                )}
                                            </div>

                                            {/* Selection buttons on hover */}
                                            <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex flex-col gap-1 items-center justify-center">
                                                <button
                                                    type="button"
                                                    onClick={() => setCover(index)}
                                                    className={`text-[9px] font-black px-2 py-1 ${coverIndex === index
                                                        ? 'bg-[#B4F056] text-black'
                                                        : 'bg-white/90 text-black hover:bg-[#B4F056]'
                                                        }`}
                                                >
                                                    SET COVER
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setTryon(index)}
                                                    className={`text-[9px] font-black px-2 py-1 ${tryonIndex === index
                                                        ? 'bg-[#FF6B35] text-white'
                                                        : 'bg-white/90 text-black hover:bg-[#FF6B35] hover:text-white'
                                                        }`}
                                                >
                                                    {tryonIndex === index ? 'REMOVE TRY-ON' : 'SET TRY-ON'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-24 h-24 border-2 border-dashed border-black flex flex-col items-center justify-center gap-1 hover:bg-gray-50"
                                    >
                                        <Camera className="w-6 h-6" />
                                        <span className="text-[10px] font-black uppercase">Add</span>
                                    </button>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />

                                {/* Legend */}
                                {images.length > 0 && (
                                    <div className="flex gap-4 text-xs mt-2">
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 bg-[#B4F056] border border-black" />
                                            <span>Cover: Main display image</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 bg-[#FF6B35] border border-black" />
                                            <span>Try-On: Sent to virtual try-on</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t-2 border-black">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="flex-1 py-3 font-black uppercase border-2 border-black hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-3 font-black uppercase bg-[#B4F056] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            {editingProduct ? 'Update' : 'Create'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Products Grid */}
            {products.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-black/20">
                    <Package className="w-16 h-16 mx-auto mb-4 text-black/30" />
                    <h3 className="text-xl font-black text-black/60 mb-2">No Products Yet</h3>
                    <p className="text-black/40 font-medium mb-6">
                        Add your first product to get started
                    </p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#B4F056] border-[3px] border-black font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    >
                        <Plus className="w-5 h-5" />
                        Add Product
                    </button>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {products.map((product) => (
                        <div
                            key={product.id}
                            className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden group"
                        >
                            {/* Image */}
                            <div className="aspect-square bg-gray-100 relative">
                                {product.cover_image || product.images?.[0] ? (
                                    <img
                                        src={product.cover_image || product.images?.[0]}
                                        alt={product.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Package className="w-12 h-12 text-black/20" />
                                    </div>
                                )}
                                {!product.active && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <span className="bg-red-500 text-white px-3 py-1 font-black text-sm uppercase">
                                            Inactive
                                        </span>
                                    </div>
                                )}
                                {/* Try-On indicator */}
                                {product.tryon_image && (
                                    <div className="absolute top-2 right-2 bg-[#FF6B35] text-white px-2 py-1 text-[10px] font-black flex items-center gap-1 border border-black">
                                        <Shirt className="w-3 h-3" />
                                        TRY-ON
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                <h3 className="font-black text-lg mb-1 truncate">{product.name}</h3>
                                <div className="flex items-center gap-2 text-sm text-black/60 mb-3">
                                    {product.category && (
                                        <span className="bg-gray-100 px-2 py-0.5 font-bold">
                                            {product.category}
                                        </span>
                                    )}
                                    {product.price && (
                                        <span className="font-black">₹{product.price}</span>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openEditForm(product)}
                                        className="flex-1 py-2 border-2 border-black font-bold text-sm uppercase hover:bg-gray-100 flex items-center justify-center gap-1"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                        Edit
                                    </button>
                                    {product.link && (
                                        <a
                                            href={product.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 border-2 border-black hover:bg-gray-100"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    )}
                                    <button
                                        onClick={() => handleDelete(product.id)}
                                        className="p-2 border-2 border-black hover:bg-red-100"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-600" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
