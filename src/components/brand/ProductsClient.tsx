'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { AppImage } from '@/components/ui/AppImage'
import { toast } from '@/lib/simple-sonner'
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
    Shirt,
    Sparkles,
    ChevronDown
} from 'lucide-react'
import { PortalModal } from '@/components/ui/PortalModal'

export interface Product {
    id: string
    name: string
    description?: string
    category?: string
    price?: number
    discount?: number
    stock?: number
    sku?: string
    try_on_compatible?: boolean
    link?: string
    tags?: string[]
    audience?: string
    cover_image?: string
    tryon_image?: string
    images?: string[]
    active: boolean
    created_at: string
}

interface GeneratedProductVisual {
    id: string
    label: string
    preset: string
    imageUrl: string
    imageBase64: string
}

interface ProductsClientProps {
    initialProducts: Product[]
}

const CATEGORIES = ['Clothing', 'Accessories', 'Footwear', 'Beauty', 'Lifestyle', 'Electronics', 'Home', 'Other']
const AUDIENCES = ['Men', 'Women', 'Unisex', 'Kids']
const MAX_IMAGES = 8
const MAX_IMAGE_DIMENSION = 1600
const MAX_PRODUCT_PAYLOAD_BYTES = 9 * 1024 * 1024
const MIN_JPEG_QUALITY = 0.55

async function fileToDataUrl(file: File): Promise<string> {
    return await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error('Failed to read image file'))
        reader.readAsDataURL(file)
    })
}

async function compressImageDataUrl(dataUrl: string): Promise<string> {
    return await new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
            const maxSide = Math.max(img.width, img.height)
            const scale = maxSide > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / maxSide : 1
            const targetWidth = Math.max(1, Math.round(img.width * scale))
            const targetHeight = Math.max(1, Math.round(img.height * scale))

            const canvas = document.createElement('canvas')
            canvas.width = targetWidth
            canvas.height = targetHeight
            const ctx = canvas.getContext('2d')
            if (!ctx) {
                reject(new Error('Failed to process image'))
                return
            }

            ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

            let quality = 0.86
            let output = canvas.toDataURL('image/jpeg', quality)

            // Keep reducing quality for large images to avoid request body overflow.
            while (output.length > 2_000_000 && quality > MIN_JPEG_QUALITY) {
                quality -= 0.08
                output = canvas.toDataURL('image/jpeg', quality)
            }

            resolve(output)
        }
        img.onerror = () => reject(new Error('Invalid image file'))
        img.src = dataUrl
    })
}

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
    const [discount, setDiscount] = useState('')
    const [stock, setStock] = useState('')
    const [sku, setSku] = useState('')
    const [tryOnCompatible, setTryOnCompatible] = useState(false)
    const [link, setLink] = useState('')
    const [tags, setTags] = useState('')
    const [audience, setAudience] = useState('')
    const [images, setImages] = useState<string[]>([])
    const [coverIndex, setCoverIndex] = useState(0)
    const [tryonIndex, setTryonIndex] = useState<number | null>(null)
    const [generatingVisuals, setGeneratingVisuals] = useState(false)
    const [generatedVisuals, setGeneratedVisuals] = useState<GeneratedProductVisual[]>([])

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
        setDiscount('')
        setStock('')
        setSku('')
        setTryOnCompatible(false)
        setLink('')
        setTags('')
        setAudience('')
        setImages([])
        setCoverIndex(0)
        setTryonIndex(null)
        setGeneratedVisuals([])
        setEditingProduct(null)
        setShowForm(false)
    }

    const openEditForm = (product: Product) => {
        setEditingProduct(product)
        setName(product.name)
        setDescription(product.description || '')
        setCategory(product.category || '')
        setPrice(product.price?.toString() || '')
        setDiscount(product.discount?.toString() || '')
        setStock(product.stock?.toString() ?? '')
        setSku(product.sku || '')
        setTryOnCompatible(product.try_on_compatible ?? false)
        setLink(product.link || '')
        setTags(product.tags?.join(', ') || '')
        setAudience(product.audience || '')
        setImages(product.images || [])
        setGeneratedVisuals([])

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

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files) return
        const incoming = Array.from(files)

        if (images.length + incoming.length > MAX_IMAGES) {
            toast.error(`Maximum ${MAX_IMAGES} images allowed`)
            return
        }

        try {
            const processed: string[] = []
            for (const file of incoming) {
                const rawDataUrl = await fileToDataUrl(file)
                const compressed = await compressImageDataUrl(rawDataUrl)
                processed.push(compressed)
            }
            setImages(prev => [...prev, ...processed])
        } catch (error) {
            console.error('Image upload processing error:', error)
            toast.error('Failed to process selected image(s). Please try smaller files.')
        } finally {
            // Allow selecting the same file again after failure/success.
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
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

    const handleGenerateProductVisuals = async () => {
        const sourceImage = images[coverIndex] || images[0]
        if (!sourceImage) {
            toast.error('Upload at least one product image first.')
            return
        }

        setGeneratingVisuals(true)
        setGeneratedVisuals([])

        try {
            const res = await fetch('/api/brand/products/generate-visuals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productImage: sourceImage,
                    productName: name.trim() || undefined,
                    category: category || undefined,
                    description: description.trim() || undefined,
                    audience: audience || undefined,
                    tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
                    price: price ? parseFloat(price) : undefined,
                }),
            })

            const data = await res.json().catch(() => ({ error: 'Request failed' }))
            if (!res.ok) {
                throw new Error(data?.error || 'Failed to generate product visuals')
            }

            const visuals = Array.isArray(data.visuals) ? (data.visuals as GeneratedProductVisual[]) : []
            if (visuals.length === 0) {
                throw new Error('No product visuals were returned')
            }

            const newImages = visuals.map((visual) => visual.imageUrl || visual.imageBase64).filter(Boolean)
            const startIndex = images.length
            setImages(prev => [...prev, ...newImages])
            setGeneratedVisuals(visuals)
            setCoverIndex(startIndex)

            if (data.partial) {
                toast.success(`Generated ${visuals.length} visuals. A couple of variations may need another try.`)
            } else {
                toast.success(`Generated ${visuals.length} polished product visuals.`)
            }
        } catch (error) {
            console.error('Generate product visuals error:', error)
            toast.error(error instanceof Error ? error.message : 'Failed to generate product visuals')
        } finally {
            setGeneratingVisuals(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) {
            toast.error('Product name is required')
            return
        }
        setSaving(true)

        // 1. Optimistic Update
        const tempId = `temp-${Date.now()}`
        const optimisticProduct: Product = {
            id: editingProduct?.id || tempId,
            name: name.trim(),
            description: description.trim() || undefined,
            category: category || undefined,
            price: price ? parseFloat(price) : undefined,
            discount: discount ? parseFloat(discount) : undefined,
            stock: stock ? parseInt(stock, 10) : undefined,
            sku: sku.trim() || undefined,
            try_on_compatible: tryOnCompatible,
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

        try {
            const productData = { ...optimisticProduct }
            // Remove temp fields if any
            if (productData.id.startsWith('temp-')) delete (productData as any).id

            const method = editingProduct ? 'PUT' : 'POST'
            const url = editingProduct
                ? `/api/brand/products/${editingProduct.id}`
                : '/api/brand/products'
            const payload = JSON.stringify(productData)
            const payloadBytes = new TextEncoder().encode(payload).length
            if (payloadBytes > MAX_PRODUCT_PAYLOAD_BYTES) {
                toast.error('Images are too large. Please remove a few images or upload smaller ones.')
                setProducts(previousProducts)
                setShowForm(true)
                return
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: payload,
            })

            const responseText = await res.text()
            const data = responseText ? JSON.parse(responseText) : {}

            if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)

            // Success: Update with real data (server response might have generated fields like ID)
            const realProduct = data.product

            // Update the temp product with the real one
            setProducts(prev => prev.map(p => p.id === tempId ? realProduct : (p.id === realProduct.id ? realProduct : p)))

            toast.success(editingProduct ? 'Product updated!' : 'Product created!')
            resetForm()
            // We still trigger refresh to sync server cache, but UI is already consistent
            refreshData()
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to save product'
            toast.error(message)

            // Revert State
            setProducts(previousProducts)
            setShowForm(true) // Re-open form
        } finally {
            setSaving(false)
        }
    }

    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)

    useEffect(() => {
        const isModalOpen = showForm || Boolean(deleteConfirm)
        if (!isModalOpen) return

        const originalOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return
            if (deleteConfirm) {
                setDeleteConfirm(null)
                return
            }
            if (showForm) {
                resetForm()
            }
        }

        window.addEventListener('keydown', onKeyDown)
        return () => {
            document.body.style.overflow = originalOverflow
            window.removeEventListener('keydown', onKeyDown)
        }
    }, [showForm, deleteConfirm])

    const handleDeleteClick = (product: Product) => {
        setDeleteConfirm({ id: product.id, name: product.name })
    }

    const handleDelete = async (productId: string) => {
        setDeleteConfirm(null)
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

    return (
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 animate-fade-in">
            {/* Header */}
            <div className="w-full max-w-[1440px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
                <div className="space-y-1">
                    <h1 className="text-3xl sm:text-4xl font-black text-black tracking-tight">Products</h1>
                    <p className="text-black/60 font-bold text-sm sm:text-base">
                        Manage your product catalog · {products.length} items
                    </p>
                </div>
                <button type="button"
                    onClick={() => setShowForm(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-[#B4F056] border-[3px] border-black font-black uppercase text-sm tracking-wider shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all"
                >
                    <Plus className="w-5 h-5" strokeWidth={3} />
                    Add Product
                </button>
            </div>

            {/* Product Form Modal */}
            <PortalModal
                isOpen={showForm}
                onClose={resetForm}
            >
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-[2px]">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white rounded-2xl border-[3px] border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] w-full max-w-2xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <form
                            onSubmit={handleSubmit}
                            className="space-y-0"
                        >
                            <div className="sticky top-0 z-10 bg-white flex items-center justify-between p-4 border-b-[3px] border-black">
                                <h2 className="text-xl font-black">
                                    {editingProduct ? 'Edit Product' : 'Add New Product'}
                                </h2>
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="p-2 hover:bg-black/5 transition-colors rounded-full"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 space-y-8">
                                {/* Basic Info */}
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="block text-xs font-black uppercase tracking-wider text-black">
                                            Product Name
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full px-4 py-3 border-2 border-black font-bold focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none"
                                            placeholder="Enter product name"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-xs font-black uppercase tracking-wider text-black">
                                            Description
                                        </label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            rows={4}
                                            className="w-full px-4 py-3 border-2 border-black font-medium focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none resize-none"
                                            placeholder="Tell more about your product..."
                                        />
                                    </div>

                                    {/* Price and Discount */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="block text-xs font-black uppercase tracking-wider text-black">
                                                Price (₹)
                                            </label>
                                            <input
                                                type="number"
                                                required
                                                value={price}
                                                onChange={(e) => setPrice(e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-black font-bold focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-xs font-black uppercase tracking-wider text-black">
                                                Discount (%)
                                            </label>
                                            <input
                                                type="number"
                                                value={discount}
                                                onChange={(e) => setDiscount(e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-black font-bold focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="block text-xs font-black uppercase tracking-wider text-black">
                                                Category
                                            </label>
                                            <div className="relative">
                                                <select
                                                    value={category}
                                                    onChange={(e) => setCategory(e.target.value)}
                                                    className="w-full px-4 py-3 border-2 border-black font-bold focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none appearance-none pr-10 bg-white"
                                                >
                                                    <option value="">Select Category</option>
                                                    <option value="Clothing">Clothing</option>
                                                    <option value="Footwear">Footwear</option>
                                                    <option value="Accessories">Accessories</option>
                                                    <option value="Beauty">Beauty</option>
                                                </select>
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                    <ChevronDown className="w-5 h-5 text-black" strokeWidth={3} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-xs font-black uppercase tracking-wider text-black">
                                                Target Audience
                                            </label>
                                            <div className="relative">
                                                <select
                                                    value={audience}
                                                    onChange={(e) => setAudience(e.target.value)}
                                                    className="w-full px-4 py-3 border-2 border-black font-bold focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none appearance-none pr-10 bg-white"
                                                >
                                                    <option value="">Select Audience</option>
                                                    <option value="Men">Men</option>
                                                    <option value="Women">Women</option>
                                                    <option value="Unisex">Unisex</option>
                                                    <option value="Kids">Kids</option>
                                                </select>
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                    <ChevronDown className="w-5 h-5 text-black" strokeWidth={3} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="block text-xs font-black uppercase tracking-wider text-black">
                                                Stock
                                            </label>
                                            <input
                                                type="number"
                                                value={stock}
                                                onChange={(e) => setStock(e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-black font-bold focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-xs font-black uppercase tracking-wider text-black">
                                                SKU
                                            </label>
                                            <input
                                                type="text"
                                                value={sku}
                                                onChange={(e) => setSku(e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-black font-bold focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none"
                                                placeholder="e.g. SKU-001"
                                            />
                                        </div>
                                    </div>

                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center justify-center">
                                            <input
                                                type="checkbox"
                                                checked={tryOnCompatible}
                                                onChange={(e) => setTryOnCompatible(e.target.checked)}
                                                className="peer appearance-none w-6 h-6 border-2 border-black rounded-md checked:bg-[#B4F056] transition-colors cursor-pointer"
                                            />
                                            <div className="absolute opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none">
                                                <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-wider text-black select-none">
                                            Try-On Compatible
                                        </span>
                                    </label>

                                    <div className="space-y-2">
                                        <label className="block text-xs font-black uppercase tracking-wider text-black">
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

                                    <div className="space-y-2">
                                        <label className="block text-xs font-black uppercase tracking-wider text-black">
                                            Tags (Comma Separated)
                                        </label>
                                        <input
                                            type="text"
                                            value={tags}
                                            onChange={(e) => setTags(e.target.value)}
                                            className="w-full px-4 py-3 border-2 border-black font-medium focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none"
                                            placeholder="summer, casual, cotton"
                                        />
                                    </div>

                                    {/* Images */}
                                    <div className="space-y-4">
                                        <label className="block text-xs font-black uppercase tracking-wider text-black">
                                            Product Images
                                        </label>

                                        {/* AI Visuals Banner */}
                                        <div className="bg-[#FDF4D0] border-2 border-black rounded-3xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                                            <div className="space-y-1 text-center sm:text-left">
                                                <h3 className="text-sm font-bold uppercase tracking-tight text-black">Upload once, generate neat visuals</h3>
                                                <p className="text-xs font-bold text-black/40 leading-tight max-w-sm">
                                                    Add your base product image, then generate 3 clean storefront visuals using the ad creative engine.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleGenerateProductVisuals}
                                                disabled={generatingVisuals || images.length === 0}
                                                className="flex items-center gap-3 px-5 py-2 bg-[#CAC4A8] border-2 border-black rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-[#BDB79A] transition-all disabled:opacity-50 text-left"
                                            >
                                                <Sparkles className="w-4 h-4 shrink-0" />
                                                <div className="flex flex-col leading-[1.2]">
                                                    <span>Generate 3</span>
                                                    <span>Visuals</span>
                                                </div>
                                            </button>
                                        </div>

                                        <p className="text-[10px] font-bold text-black/40">
                                            Click image to set as <span className="text-[#B4F056]">COVER</span> (display) or <span className="text-[#FF8A00]">TRY-ON</span> (virtual try-on)
                                        </p>

                                        <div className="flex flex-wrap gap-4">
                                            {images.length < MAX_IMAGES && (
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="w-24 h-24 border-2 border-dashed border-black flex flex-col items-center justify-center gap-1 hover:bg-black/5 transition-colors"
                                                >
                                                    <Camera className="w-6 h-6 opacity-40" />
                                                    <span className="text-[10px] font-black uppercase text-black/40">Add</span>
                                                </button>
                                            )}
                                            {images.map((img, index) => (
                                                <div
                                                    key={index}
                                                    className={`relative w-24 h-24 border-2 group transition-all ${coverIndex === index ? 'border-[#B4F056] ring-2 ring-[#B4F056]/20' : tryonIndex === index ? 'border-[#FF8A00] ring-2 ring-[#FF8A00]/20' : 'border-black'}`}
                                                >
                                                    <AppImage src={img} alt="Product" className="object-cover" sizes="96px" />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeImage(index)}
                                                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 border-2 border-black text-white flex items-center justify-center rounded-full z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                    
                                                    {/* Selection Overlays */}
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col pointer-events-auto">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); setCover(index); }}
                                                            className="flex-1 text-[8px] font-black text-white uppercase hover:bg-[#B4F056]/40 transition-colors"
                                                        >
                                                            Set Cover
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); setTryon(index); }}
                                                            className="flex-1 border-t border-white/20 text-[8px] font-black text-white uppercase hover:bg-[#FF8A00]/40 transition-colors"
                                                        >
                                                            Set Try-On
                                                        </button>
                                                    </div>

                                                    {/* Status Badges */}
                                                    {coverIndex === index && (
                                                        <div className="absolute bottom-0 left-0 right-0 bg-[#B4F056] border-t-2 border-black text-[8px] font-black uppercase text-center py-0.5 text-black">
                                                            Cover
                                                        </div>
                                                    )}
                                                    {tryonIndex === index && (
                                                        <div className="absolute bottom-0 left-0 right-0 bg-[#FF8A00] border-t-2 border-black text-[8px] font-black uppercase text-center py-0.5 text-white">
                                                            Try-On
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="sticky bottom-0 bg-white pt-6 pb-2 flex flex-col sm:flex-row gap-4">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="flex-1 py-3 border-2 border-black font-black uppercase tracking-wider hover:bg-black/5 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 py-3 bg-[#B4F056] border-2 border-black font-black uppercase tracking-wider shadow-[4px_4px_0px_0px_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : editingProduct ? 'Update Product' : 'Create Product'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </motion.div>
                </div>
            </PortalModal>

            {/* Products Grid */}
            {products.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-black/20 rounded-3xl">
                    <Package className="w-16 h-16 mx-auto mb-4 text-black/10" />
                    <h3 className="text-xl font-black text-black/40 mb-6 uppercase">No Products Yet</h3>
                    <button type="button"
                        onClick={() => setShowForm(true)}
                        className="px-8 py-3 bg-[#B4F056] border-[3px] border-black font-black uppercase shadow-[4px_4px_0px_0px_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                    >
                        Add Your First Product
                    </button>
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {products.map((product) => (
                        <div
                            key={product.id}
                            className="group relative overflow-hidden rounded-2xl border-[3px] border-black bg-white shadow-[6px_6px_0px_0px_#000] hover:shadow-[10px_10px_0px_0px_#000] transition-all hover:-translate-y-1"
                        >
                            <div className="aspect-[4/5] bg-[#F3F0E8] overflow-hidden border-b-[3px] border-black">
                                <AppImage src={product.cover_image || product.images?.[0] || ''} alt={product.name} className="object-cover transition-transform duration-700 group-hover:scale-110" />
                            </div>
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="min-w-0">
                                        <h3 className="text-lg font-black truncate">{product.name}</h3>
                                        <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest">{product.category || 'Other'}</p>
                                    </div>
                                    <p className="text-lg font-black">₹{product.price || 0}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => openEditForm(product)} className="flex items-center justify-center gap-2 h-11 bg-black text-white border-2 border-black rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-[#B4F056] hover:text-black transition-colors">
                                        <Edit2 className="w-4 h-4" /> Edit
                                    </button>
                                    <button onClick={() => handleDeleteClick(product)} className="flex items-center justify-center h-11 bg-white border-2 border-black rounded-xl text-red-500 hover:bg-red-50 transition-colors">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Delete Confirmation */}
            <PortalModal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
            >
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="p-8 text-center space-y-6 bg-white border-[3px] border-black shadow-[12px_12px_0px_0px_#000] rounded-3xl max-w-md w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-20 h-20 bg-red-50 border-[3px] border-black rounded-full flex items-center justify-center mx-auto shadow-[4px_4px_0px_0px_#000]">
                            <Trash2 className="w-10 h-10 text-red-500" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black mb-2 uppercase text-black">Delete Product?</h3>
                            <p className="text-black/60 font-medium">
                                Are you sure you want to delete <span className="font-bold text-black">"{deleteConfirm?.name}"</span>? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 py-4 border-2 border-black font-black uppercase tracking-wider hover:bg-black/5 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => deleteConfirm && handleDelete(deleteConfirm.id)}
                                className="flex-1 py-4 bg-red-500 text-white border-2 border-black font-black uppercase tracking-wider shadow-[4px_4px_0px_0px_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                            >
                                Delete
                            </button>
                        </div>
                    </motion.div>
                </div>
            </PortalModal>
        </div>
    )
}
