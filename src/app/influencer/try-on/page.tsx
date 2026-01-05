'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { toast } from 'sonner'
import { ShoppingBag, Upload, Sparkles, Palette, Download, RefreshCw, ArrowRight, X, Check, PartyPopper, AlertTriangle, Loader2, Share2, Copy, Link as LinkIcon } from 'lucide-react'
import { useProduct } from '@/lib/react-query/hooks'
import { safeParseResponse } from '@/lib/api-utils'
import { useProductLink } from '@/lib/hooks/useProductLink'

// Try-on preset type (v3)
interface TryOnPreset {
    id: string
    name: string
    description: string
    category: 'studio' | 'street' | 'outdoor' | 'lifestyle' | 'editorial' | 'traditional'
}
import { GeneratingOverlay } from '@/components/tryon/GeneratingOverlay'
import { ShareModal } from '@/components/tryon/ShareModal'
import { bounceInVariants } from '@/lib/animations'

interface Product {
    id: string
    name: string
    category?: string
    brand?: {
        companyName: string
    }
    tryOnImage?: string
}

function TryOnPageContent() {
    const searchParams = useSearchParams()
    const productId = searchParams.get('productId')

    const [personImage, setPersonImage] = useState<string>('')
    const [personImageBase64, setPersonImageBase64] = useState<string>('')
    const [additionalPersonImages, setAdditionalPersonImages] = useState<string[]>([]) // For Pro model
    const [additionalPersonImagesBase64, setAdditionalPersonImagesBase64] = useState<string[]>([]) // For Pro model
    const [clothingImage, setClothingImage] = useState<string>('')
    const [clothingImageBase64, setClothingImageBase64] = useState<string>('')
    const [backgroundImage, setBackgroundImage] = useState<string>('')
    const [backgroundImageBase64, setBackgroundImageBase64] = useState<string>('')
    const [editType, setEditType] = useState<'clothing_change' | 'background_change' | 'lighting_change' | 'pose_change' | 'camera_change'>('clothing_change')
    const [userRequest, setUserRequest] = useState<string>('')

    const [savedProfileImages, setSavedProfileImages] = useState<Array<{ id: string; imageUrl: string; isPrimary: boolean; label: string | null }>>([])
    const [savedProfileImagesLoading, setSavedProfileImagesLoading] = useState(false)
    const [saveUploadedPersonToProfile, setSaveUploadedPersonToProfile] = useState(false)
    // Identity images for better face consistency (auto-fetched from profile)
    const [identityImages, setIdentityImages] = useState<Array<{ type: string; imageUrl: string }>>([])
    const [identityImagesLoading, setIdentityImagesLoading] = useState(false)
    const [useIdentityImages, setUseIdentityImages] = useState(true) // Toggle for using identity refs
    // NEW: Accessory states for Edit Mode
    const [accessoryImages, setAccessoryImages] = useState<string[]>([])
    const [accessoryTypes, setAccessoryTypes] = useState<('purse' | 'shoes' | 'hat' | 'jewelry' | 'bag' | 'watch' | 'sunglasses' | 'scarf' | 'other')[]>([])
    const [loading, setLoading] = useState(false)
    const [uploadingImage, setUploadingImage] = useState<'person' | 'clothing' | 'background' | 'additional' | 'accessory' | null>(null)
    // Multi-variant support: PRO generates 3 variants, user selects one
    const [result, setResult] = useState<{ jobId: string; imageUrl: string; base64Image?: string } | null>(null)
    const [variants, setVariants] = useState<Array<{ imageUrl: string; base64Image?: string; variantId: number; label?: string }>>([])
    const [selectedVariant, setSelectedVariant] = useState<number>(0)
    const [product, setProduct] = useState<Product | null>(null)
    const [selectedPreset, setSelectedPreset] = useState<string>('')
    const [presetCategory, setPresetCategory] = useState<string>('all')
    const [selectedModel, setSelectedModel] = useState<'flash' | 'pro'>('flash')
    const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '3:4' | '9:16'>('4:5')
    const [quality, setQuality] = useState<'1K' | '2K' | '4K'>('2K')
    const [dragOver, setDragOver] = useState<'person' | 'clothing' | null>(null)
    const [showCelebration, setShowCelebration] = useState(false)
    const [showShareModal, setShowShareModal] = useState(false)

    // Presets
    const [presets, setPresets] = useState<TryOnPreset[]>([])
    const [presetsLoading, setPresetsLoading] = useState(true)
    const [presetCategories, setPresetCategories] = useState<string[]>([])

    // Fetch presets
    useEffect(() => {
        async function fetchPresets() {
            try {
                const res = await fetch('/api/presets')
                const data = await safeParseResponse(res, 'presets')
                if (res.ok && data.presets) {
                    setPresets(data.presets)
                    setPresetCategories(data.categories || [])
                }
            } catch (e) {
                console.error('Failed to fetch presets:', e)
            } finally {
                setPresetsLoading(false)
            }
        }
        fetchPresets()
    }, [])

    // Fetch identity images for better face consistency
    useEffect(() => {
        async function fetchIdentityImages() {
            setIdentityImagesLoading(true)
            try {
                const res = await fetch('/api/identity-images', { cache: 'no-store' })
                const data = await safeParseResponse(res, 'identity-images')
                if (!res.ok) return

                // API returns { images: [...] , requirements: [...] , ... }
                const images = Array.isArray(data)
                    ? data
                    : (Array.isArray(data?.images) ? data.images : [])

                // Sort by requirements order if provided, otherwise keep stable order
                const reqOrder = new Map<string, number>(
                    Array.isArray(data?.requirements)
                        ? data.requirements.map((r: any) => [String(r.type), Number(r.order ?? 999)])
                        : []
                )

                const normalized = images
                    .map((img: any) => ({
                        type: String(img.imageType ?? img.type ?? ''),
                        imageUrl: String(img.imageUrl ?? ''),
                    }))
                    .filter((x: any) => x.type && x.imageUrl)
                    .sort((a: any, b: any) => (reqOrder.get(a.type) ?? 999) - (reqOrder.get(b.type) ?? 999))

                setIdentityImages(normalized)
                if (normalized.length > 0) {
                    console.log(`🎭 Loaded ${normalized.length} identity reference images`)
                }
            } catch (e) {
                console.warn('Failed to load identity images:', e)
            } finally {
                setIdentityImagesLoading(false)
            }
        }
        fetchIdentityImages()
    }, [])

    const { data: productData, isLoading: productLoading } = useProduct(productId)
    const { maskedLink, originalUrl, displayUrl, loading: linkLoading, copyLink, copied: linkCopied } = useProductLink(productId)

    const fetchSavedProfileImages = useCallback(async () => {
        setSavedProfileImagesLoading(true)
        try {
            const res = await fetch('/api/profile-images', { cache: 'no-store' })
            const data = await safeParseResponse(res, 'profile-images')
            if (!res.ok) throw new Error(data.error || 'Failed to fetch profile images')
            setSavedProfileImages((data.images || []) as any[])
        } catch (e) {
            console.warn('Failed to load profile images:', e)
        } finally {
            setSavedProfileImagesLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchSavedProfileImages()
    }, [fetchSavedProfileImages])

    useEffect(() => {
        if (productData && productData.id) {
            const tryOnImageUrl = productData.images?.find((img: any) => img.isTryOnReference)?.imagePath

            setProduct({
                id: productData.id,
                name: productData.name,
                category: productData.category,
                brand: productData.brand,
                tryOnImage: tryOnImageUrl,
            })

            if (tryOnImageUrl && !clothingImage) {
                setClothingImage(tryOnImageUrl)

                fetch(tryOnImageUrl)
                    .then((res) => res.blob())
                    .then((blob) => {
                        const reader = new FileReader()
                        reader.onloadend = () => {
                            const base64 = reader.result as string
                            setClothingImageBase64(base64)
                            toast.success(`Loaded try-on reference for ${productData.name}`)
                        }
                        reader.readAsDataURL(blob)
                    })
                    .catch((error) => {
                        console.error('Failed to load image:', error)
                        toast.error('Failed to load product image')
                    })
            }
        }
    }, [productData, productId, clothingImage])

    // NOTE: No image analysis in the new pipeline (strict image edit only)

    const handleImageUpload = useCallback((file: File, type: 'person' | 'clothing' | 'background') => {
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file')
            return
        }

        const maxSize = 10 * 1024 * 1024
        if (file.size > maxSize) {
            toast.error('Image size must be less than 10MB')
            return
        }

        setUploadingImage(type)

        const reader = new FileReader()
        reader.onload = (event) => {
            const base64 = event.target?.result as string
            if (!base64 || base64.length < 100) {
                toast.error('Invalid image data')
                setUploadingImage(null)
                return
            }

            if (type === 'person') {
                setPersonImage(base64)
                setPersonImageBase64(base64)
                toast.success('Person image uploaded')
                if (saveUploadedPersonToProfile) {
                    fetch('/api/profile-images', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imageBase64: base64, label: 'tryon_upload' }),
                    })
                        .then(() => fetchSavedProfileImages())
                        .catch(() => { /* non-blocking */ })
                }
            } else {
                if (type === 'background') {
                    setBackgroundImage(base64)
                    setBackgroundImageBase64(base64)
                    toast.success('Background image uploaded')
                } else {
                    setClothingImage(base64)
                    setClothingImageBase64(base64)
                    toast.success('Clothing image uploaded')
                }
            }
            setUploadingImage(null)
        }
        reader.onerror = () => {
            toast.error('Failed to read image file')
            setUploadingImage(null)
        }
        reader.readAsDataURL(file)
    }, [fetchSavedProfileImages, saveUploadedPersonToProfile])

    const loadUrlToBase64 = async (url: string) => {
        const res = await fetch(url)
        const blob = await res.blob()
        return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = () => reject(new Error('Failed to read image'))
            reader.readAsDataURL(blob)
        })
    }

    const handleSelectSavedPersonImage = async (url: string) => {
        try {
            setUploadingImage('person')
            const base64 = await loadUrlToBase64(url)
            setPersonImage(base64)
            setPersonImageBase64(base64)
            toast.success('Selected saved photo')
        } catch {
            toast.error('Failed to load saved photo')
        } finally {
            setUploadingImage(null)
        }
    }

    // Handler for additional person images (Pro model)
    const handleAdditionalImageUpload = useCallback((file: File) => {
        if (additionalPersonImages.length >= 4) {
            toast.error('Maximum 4 additional images allowed (5 total)')
            return
        }

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file')
            return
        }

        setUploadingImage('additional')
        const reader = new FileReader()
        reader.onload = (event) => {
            const base64 = event.target?.result as string
            if (base64 && base64.length >= 100) {
                setAdditionalPersonImages(prev => [...prev, base64])
                setAdditionalPersonImagesBase64(prev => [...prev, base64])
                toast.success(`Additional photo ${additionalPersonImages.length + 1} added`)
            }
            setUploadingImage(null)
        }
        reader.onerror = () => {
            toast.error('Failed to read image file')
            setUploadingImage(null)
        }
        reader.readAsDataURL(file)
    }, [additionalPersonImages.length])

    const handleRemoveAdditionalImage = (index: number) => {
        setAdditionalPersonImages(prev => prev.filter((_, i) => i !== index))
        setAdditionalPersonImagesBase64(prev => prev.filter((_, i) => i !== index))
    }

    // NEW: Accessory upload handlers for Edit Mode
    const handleAccessoryUpload = useCallback((file: File, type: 'purse' | 'shoes' | 'hat' | 'jewelry' | 'bag' | 'watch' | 'sunglasses' | 'scarf' | 'other') => {
        if (accessoryImages.length >= 5) {
            toast.error('Maximum 5 accessories allowed')
            return
        }

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file')
            return
        }

        setUploadingImage('accessory')
        const reader = new FileReader()
        reader.onload = (event) => {
            const base64 = event.target?.result as string
            if (base64 && base64.length >= 100) {
                setAccessoryImages(prev => [...prev, base64])
                setAccessoryTypes(prev => [...prev, type])
                toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} added!`)
            }
            setUploadingImage(null)
        }
        reader.onerror = () => {
            toast.error('Failed to read image file')
            setUploadingImage(null)
        }
        reader.readAsDataURL(file)
    }, [accessoryImages.length])

    const handleRemoveAccessory = (index: number) => {
        setAccessoryImages(prev => prev.filter((_, i) => i !== index))
        setAccessoryTypes(prev => prev.filter((_, i) => i !== index))
    }

    const handleDrop = useCallback((e: React.DragEvent, type: 'person' | 'clothing') => {
        e.preventDefault()
        setDragOver(null)
        const file = e.dataTransfer.files[0]
        if (file) handleImageUpload(file, type)
    }, [handleImageUpload])

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'person' | 'clothing') => {
        const file = e.target.files?.[0]
        if (file) handleImageUpload(file, type)
    }

    // Helper to convert URL to base64
    const urlToBase64 = async (url: string): Promise<string | null> => {
        try {
            const res = await fetch(url)
            const blob = await res.blob()
            return await new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result as string)
                reader.onerror = reject
                reader.readAsDataURL(blob)
            })
        } catch {
            return null
        }
    }

    const handleGenerate = async () => {
        if (!personImage) {
            toast.error('Please upload a person image')
            return
        }
        if (editType === 'clothing_change' && !(clothingImageBase64 || clothingImage)) {
            toast.error('Please upload a clothing reference')
            return
        }
        if (editType === 'background_change' && !(backgroundImageBase64 || backgroundImage)) {
            toast.error('Please upload a background reference')
            return
        }

        setLoading(true)
        try {
            // Collect all additional person images including identity refs
            let allAdditionalImages = [...additionalPersonImagesBase64]

            // Add identity images if available and enabled
            if (useIdentityImages && identityImages.length > 0) {
                // Flash works best with a couple strong face refs; Pro can use more.
                const isFlash = selectedModel === 'flash'
                const faceOnlyTypes = new Set(['face_front', 'face_smile', 'face_left', 'face_right'])
                const identityForModel = isFlash
                    ? identityImages.filter((x) => faceOnlyTypes.has(x.type)).slice(0, 2)
                    : identityImages

                console.log(`🎭 Adding ${identityForModel.length} identity references for better face consistency`)
                for (const idImg of identityForModel) {
                    const base64 = await urlToBase64(idImg.imageUrl)
                    if (base64) {
                        allAdditionalImages.push(base64)
                    }
                }
            }

            const response = await fetch('/api/tryon', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    personImage: personImageBase64 || personImage,
                    personImages: allAdditionalImages.length > 0 ? allAdditionalImages : undefined,
                    editType,
                    clothingImage: clothingImageBase64 || clothingImage || undefined,
                    backgroundImage: backgroundImageBase64 || backgroundImage || undefined,
                    accessoryImages: accessoryImages.length > 0 ? accessoryImages : undefined,
                    accessoryTypes: accessoryTypes.length > 0 ? accessoryTypes : undefined,
                    model: selectedModel,
                    stylePreset: selectedPreset || undefined,
                    userRequest: userRequest || undefined,
                    aspectRatio,
                    resolution: quality,
                }),
            })

            // Safe parse handles non-JSON and error responses gracefully
            const data = await safeParseResponse(response, 'try-on generation')
            console.log('API Response:', data) // Debug: see what we got back

            console.log('Setting result with imageUrl:', data.imageUrl) // Debug

            // Handle multi-variant response (PRO) or single image (FLASH)
            if (data.variants && Array.isArray(data.variants) && data.variants.length > 0) {
                // PRO multi-variant response
                setVariants(data.variants.map((v: any, idx: number) => ({
                    imageUrl: v.imageUrl || data.imageUrl,
                    base64Image: v.base64Image || data.base64Image,
                    variantId: idx
                })))
                setSelectedVariant(0)
                setResult({
                    jobId: data.jobId,
                    imageUrl: data.variants[0].imageUrl || data.imageUrl,
                    base64Image: data.variants[0].base64Image || data.base64Image
                })
                toast.success(`Generated ${data.variants.length} variants! Select your favorite.`)
            } else {
                // Single image response (FLASH or fallback)
                setVariants([])
                setResult(data)
                toast.success('Try-on generated successfully!')
            }

            setShowCelebration(true)
            // Show celebration for 5 seconds to let success video play fully
            setTimeout(() => setShowCelebration(false), 5000)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Generation failed')
        } finally {
            setLoading(false)
        }
    }

    const handleDownload = async () => {
        if (!result) return

        try {
            // Use base64 if available (much faster and avoids cross-origin fetch issues)
            if (result.base64Image) {
                const base64Data = result.base64Image.startsWith('data:')
                    ? result.base64Image
                    : `data:image/jpeg;base64,${result.base64Image}`

                const link = document.createElement('a')
                link.href = base64Data
                link.download = `tria-tryon-${result.jobId || Date.now()}.jpg`
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                toast.success('Image downloaded!')
                return
            }

            // Fallback to fetching the imageUrl as a blob
            if (result.imageUrl) {
                const response = await fetch(result.imageUrl)
                const blob = await response.blob()
                const blobUrl = window.URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = blobUrl
                link.download = `tria-tryon-${result.jobId || Date.now()}.jpg`
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                window.URL.revokeObjectURL(blobUrl)
                toast.success('Image downloaded!')
            }
        } catch (error) {
            console.error('Download error:', error)
            toast.error('Failed to download image')
        }
    }

    return (
        <div className="relative min-h-screen pt-24 pb-12 overflow-hidden bg-cream">
            {/* Animated Gradient Background from Hero */}
            <div className="absolute inset-0 -z-10">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        x: [0, 50, 0],
                        y: [0, -30, 0],
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-gradient-to-br from-peach/40 to-rose/30 rounded-full blur-[120px]"
                />
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        x: [0, -40, 0],
                        y: [0, 40, 0],
                    }}
                    transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                    className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-gradient-to-tl from-orange-200/40 to-amber-100/30 rounded-full blur-[120px]"
                />
            </div>

            <div className="container mx-auto px-4 md:px-6 z-10 relative">
                {/* Generating Overlay */}
                <GeneratingOverlay isVisible={loading} modelType={selectedModel} />

                {/* Success Celebration */}
                <AnimatePresence>
                    {showCelebration && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
                        >
                            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.5, opacity: 0 }}
                                className="bg-white p-6 rounded-2xl shadow-xl z-50 flex items-center gap-4 border border-peach/20"
                            >
                                <div className="p-3 bg-peach/20 rounded-full">
                                    <PartyPopper className="w-8 h-8 text-peach" />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-charcoal font-serif">Amazing!</h3>
                                    <p className="text-sm text-charcoal/60">Your try-on is ready to view</p>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Header */}
                <div className="mb-8 text-center md:text-left">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-5xl font-serif text-charcoal tracking-tight"
                    >
                        Virtual <span className="italic text-peach">Try-On Studio</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mt-2 text-charcoal/60 max-w-2xl"
                    >
                        Upload your photo and see how products look on you with AI magic.
                    </motion.p>
                </div>

                {/* Product Badge */}
                {product && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8 p-4 rounded-2xl bg-white/40 backdrop-blur-md border border-white/40 shadow-sm"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-peach/20 flex items-center justify-center">
                                    <ShoppingBag className="w-6 h-6 text-peach" />
                                </div>
                                <div>
                                    <div className="text-xs text-charcoal/50 font-medium tracking-wider uppercase">Product Selected</div>
                                    <div className="font-serif text-charcoal text-lg">{product.name}</div>
                                </div>
                            </div>
                            <Link href="/marketplace" className="p-2 hover:bg-charcoal/5 rounded-full transition-colors">
                                <X className="w-5 h-5 text-charcoal/40 scale-90 hover:scale-100 transition-transform" />
                            </Link>
                        </div>
                        {/* Product Link Display */}
                        {productId && (
                            <div className="mt-4 pt-4 border-t border-white/30">
                                <div className="flex items-center gap-2">
                                    <LinkIcon className="w-4 h-4 text-charcoal/50" />
                                    <span className="text-xs font-medium text-charcoal/60">Product Link</span>
                                </div>
                                {linkLoading ? (
                                    <div className="flex items-center gap-2 mt-2 text-sm text-charcoal/50">
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        <span>Generating link...</span>
                                    </div>
                                ) : maskedLink && displayUrl ? (
                                    <div className="flex items-center gap-2 mt-2">
                                        <code className="flex-1 text-xs bg-white/60 px-3 py-2 rounded-lg border border-charcoal/10 text-charcoal/70 font-mono truncate">
                                            {displayUrl}
                                        </code>
                                        <button
                                            onClick={copyLink}
                                            className="p-2 hover:bg-charcoal/5 rounded-lg transition-colors"
                                            title="Copy tracked link"
                                        >
                                            {linkCopied ? (
                                                <Check className="w-4 h-4 text-emerald-600" />
                                            ) : (
                                                <Copy className="w-4 h-4 text-charcoal/50" />
                                            )}
                                        </button>
                                    </div>
                                ) : (
                                    <p className="text-xs text-charcoal/40 mt-2">Link unavailable</p>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* LEFT PANEL: Inputs */}
                    <div className="lg:col-span-5 space-y-6">

                        {/* Upload Section Card */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="p-6 rounded-3xl bg-white/40 backdrop-blur-md border border-white/50 shadow-xl shadow-peach/5 space-y-6"
                        >
                            <h3 className="font-serif text-xl text-charcoal flex items-center gap-2">
                                <Upload className="w-5 h-5 text-peach" />
                                Upload Images
                            </h3>

                            {/* Saved Profile Photos */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-charcoal/50 uppercase tracking-widest">
                                        Use Saved Photos (Profile)
                                    </span>
                                    <button
                                        type="button"
                                        onClick={fetchSavedProfileImages}
                                        className="text-xs text-charcoal/50 hover:text-charcoal transition-colors"
                                    >
                                        Refresh
                                    </button>
                                </div>
                                {savedProfileImagesLoading ? (
                                    <div className="flex items-center gap-2 text-xs text-charcoal/50">
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        Loading...
                                    </div>
                                ) : savedProfileImages.length === 0 ? (
                                    <div className="text-xs text-charcoal/50">
                                        No saved photos yet. Add some in your Profile.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-4 gap-2">
                                        {savedProfileImages.slice(0, 8).map((img) => (
                                            <button
                                                key={img.id}
                                                type="button"
                                                onClick={() => handleSelectSavedPersonImage(img.imageUrl)}
                                                className={`relative rounded-xl overflow-hidden border transition-all ${personImage && personImage === img.imageUrl
                                                    ? 'border-peach ring-2 ring-peach/20'
                                                    : 'border-white/60 hover:border-peach/40'
                                                    }`}
                                                title={img.label || 'saved photo'}
                                            >
                                                <img src={img.imageUrl} alt={img.label || 'saved'} className="w-full h-14 object-cover" />
                                                {img.isPrimary && (
                                                    <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-[10px] rounded-full">
                                                        Primary
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>





                            {/* Side-by-Side Upload Grid - Stacks on mobile */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Person Upload */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-charcoal/80">Your Photo <span className="text-rose-400">*</span></span>
                                        {personImage && (
                                            <button
                                                onClick={() => { setPersonImage(''); setPersonImageBase64(''); }}
                                                className="text-xs text-charcoal/40 hover:text-rose-500 transition-colors"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>

                                    <div
                                        onDragOver={(e) => { e.preventDefault(); setDragOver('person'); }}
                                        onDragLeave={() => setDragOver(null)}
                                        onDrop={(e) => handleDrop(e, 'person')}
                                        className={`
                                            group relative aspect-[3/4] rounded-2xl overflow-hidden transition-all duration-300 border-2 
                                            ${personImage
                                                ? 'border-transparent shadow-lg shadow-peach/20'
                                                : dragOver === 'person'
                                                    ? 'border-peach bg-peach/10 scale-[1.02]'
                                                    : 'border-dashed border-charcoal/10 hover:border-peach/50 bg-white/40 hover:bg-white/60'}
                                        `}
                                    >
                                        {personImage ? (
                                            <>
                                                <img src={personImage} alt="Person" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </>
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                                                <div className="w-14 h-14 mb-3 rounded-full bg-gradient-to-br from-white/80 to-white/40 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300 border border-white/50">
                                                    {uploadingImage === 'person' ? (
                                                        <RefreshCw className="w-6 h-6 text-peach animate-spin" />
                                                    ) : (
                                                        <Upload className="w-6 h-6 text-charcoal/40 group-hover:text-peach transition-colors" />
                                                    )}
                                                </div>
                                                <p className="text-sm font-medium text-charcoal/70 group-hover:text-charcoal transition-colors">Upload Photo</p>
                                                <p className="text-[10px] text-charcoal/40 mt-1">Best results: Good lighting</p>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'person')}
                                            accept="image/*"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />

                                        {/* Validation Badge */}
                                        {personImage && (
                                            <div className="absolute bottom-3 left-3 px-2 py-1 bg-white/90 backdrop-blur-md text-emerald-600 text-[10px] font-bold rounded-lg flex items-center gap-1 shadow-sm border border-emerald-100">
                                                <Check className="w-3 h-3" /> Ready
                                            </div>
                                        )}
                                    </div>

                                    {/* Save to Profile Checkbox */}
                                    <label className="flex items-center gap-2 text-[10px] text-charcoal/50 hover:text-charcoal/80 transition-colors cursor-pointer ml-1">
                                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${saveUploadedPersonToProfile ? 'bg-peach border-peach' : 'border-charcoal/20 bg-white'}`}>
                                            {saveUploadedPersonToProfile && <Check className="w-2.5 h-2.5 text-white" />}
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={saveUploadedPersonToProfile}
                                            onChange={(e) => setSaveUploadedPersonToProfile(e.target.checked)}
                                        />
                                        Save to Profile
                                    </label>
                                </div>

                                {/* Clothing Upload */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-charcoal/80">Clothing <span className="text-rose-400">*</span></span>
                                        {clothingImage && !product && (
                                            <button
                                                onClick={() => { setClothingImage(''); setClothingImageBase64(''); }}
                                                className="text-xs text-charcoal/40 hover:text-rose-500 transition-colors"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>

                                    <div
                                        onDragOver={(e) => { e.preventDefault(); setDragOver('clothing'); }}
                                        onDragLeave={() => setDragOver(null)}
                                        onDrop={(e) => handleDrop(e, 'clothing')}
                                        className={`
                                            group relative aspect-[3/4] rounded-2xl overflow-hidden transition-all duration-300 border-2 
                                            ${clothingImage
                                                ? 'border-transparent shadow-lg shadow-purple-500/10'
                                                : dragOver === 'clothing'
                                                    ? 'border-purple-400 bg-purple-50 scale-[1.02]'
                                                    : 'border-dashed border-charcoal/10 hover:border-purple-300 bg-white/40 hover:bg-purple-50/30'}
                                        `}
                                    >
                                        {clothingImage ? (
                                            <>
                                                <img src={clothingImage} alt="Clothing" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </>
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                                                <div className="w-14 h-14 mb-3 rounded-full bg-gradient-to-br from-white/80 to-white/40 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300 border border-white/50">
                                                    {uploadingImage === 'clothing' ? (
                                                        <RefreshCw className="w-6 h-6 text-purple-500 animate-spin" />
                                                    ) : (
                                                        <ShoppingBag className="w-6 h-6 text-charcoal/40 group-hover:text-purple-500 transition-colors" />
                                                    )}
                                                </div>
                                                <p className="text-sm font-medium text-charcoal/70 group-hover:text-charcoal transition-colors">Upload Garment</p>
                                                <p className="text-[10px] text-charcoal/40 mt-1">Or select from Hub</p>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'clothing')}
                                            accept="image/*"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            disabled={!!product}
                                        />

                                        {product && clothingImage && (
                                            <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-md text-white text-[10px] font-medium rounded-full flex items-center gap-1">
                                                <Sparkles className="w-2.5 h-2.5 text-purple-400" /> Auto-Selected
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Background Reference (only when needed) */}
                            {editType === 'background_change' && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-charcoal/80">Background Reference <span className="text-rose-400">*</span></span>
                                        {backgroundImage && (
                                            <button
                                                type="button"
                                                onClick={() => { setBackgroundImage(''); setBackgroundImageBase64(''); }}
                                                className="text-xs text-charcoal/40 hover:text-rose-500 transition-colors"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                    <div
                                        className={`relative aspect-[16/9] rounded-2xl overflow-hidden transition-all duration-300 border-2 border-dashed ${backgroundImage ? 'border-transparent shadow-md' : 'border-charcoal/10 hover:border-peach/50 bg-white/30'
                                            }`}
                                    >
                                        {backgroundImage ? (
                                            <img src={backgroundImage} alt="Background" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center shadow-sm">
                                                        {uploadingImage === 'background' ? (
                                                            <RefreshCw className="w-5 h-5 text-peach animate-spin" />
                                                        ) : (
                                                            <Upload className="w-5 h-5 text-charcoal/40" />
                                                        )}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-sm font-medium text-charcoal/70">Upload Background</p>
                                                        <p className="text-xs text-charcoal/40">Real-to-life environment reference</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'background')}
                                            accept="image/*"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* ACCESSORIES SECTION (Pro Only) */}
                            <div className="pt-4 border-t border-charcoal/5">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-purple-100 rounded-md">
                                            <ShoppingBag className="w-3 h-3 text-purple-600" />
                                        </div>
                                        <h3 className="text-sm font-bold text-charcoal">Add Accessories</h3>
                                    </div>
                                    <span className="text-xs text-charcoal/40">{accessoryImages.length}/5</span>
                                </div>

                                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                                    {['purse', 'shoes', 'hat', 'jewelry', 'other'].map((type) => (
                                        <div key={type} className="relative aspect-square rounded-xl border border-dashed border-charcoal/10 hover:border-purple-400 hover:bg-purple-50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-1 group bg-white/30">
                                            <span className="text-[10px] capitalize text-charcoal/50 group-hover:text-purple-600 font-medium">{type}</span>
                                            <span className="text-xl text-charcoal/20 group-hover:text-purple-400">+</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                onChange={(e) => e.target.files && handleAccessoryUpload(e.target.files[0], type as any)}
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Accessory Preview List */}
                                {accessoryImages.length > 0 && (
                                    <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                                        {accessoryImages.map((img: string, idx: number) => (
                                            <div key={idx} className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden border border-white shadow-sm group">
                                                <img src={img} alt="" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                    <button onClick={() => handleRemoveAccessory(idx)} className="text-white hover:text-red-400">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-white text-center truncate px-1">
                                                    {accessoryTypes[idx]}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </motion.div>


                        {/* Generate Button (Moved to Left Panel) */}
                        <div className="pt-2">
                            <button
                                onClick={handleGenerate}
                                disabled={loading || !personImageBase64 || !clothingImageBase64}
                                className={`
                    w-full py-4 rounded-full font-serif text-xl flex items-center justify-center gap-3 transition-all duration-300 shadow-xl
                    ${loading || !personImageBase64 || !clothingImageBase64
                                        ? 'bg-charcoal/10 text-charcoal/30 cursor-not-allowed'
                                        : 'bg-charcoal text-cream hover:bg-peach hover:scale-[1.02] hover:shadow-peach/30'}
                  `}
                            >
                                {loading ? (
                                    'Creating Magic...'
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5" />
                                        Generate Try-On
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* RIGHT PANEL: Output & Presets */}
                    <div className="lg:col-span-7 space-y-6">

                        {/* No analysis block in new pipeline */}

                        {/* Presets Gallery */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-serif text-xl text-charcoal flex items-center gap-2">
                                    <Palette className="w-5 h-5 text-peach" />
                                    Style Presets
                                    <span className="text-xs font-normal text-charcoal/40">(auto scene + lighting)</span>
                                </h3>
                                <div className="text-[11px] text-charcoal/50 mt-1">
                                    Tip: for “Subtle Pose” presets, use <span className="font-medium">Pro</span> and upload 1–2 extra identity photos for best face consistency.
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    <button
                                        onClick={() => setPresetCategory('all')}
                                        className={`
                                            px-3 py-1 rounded-full text-xs font-medium transition-all capitalize
                                            ${presetCategory === 'all'
                                                ? 'bg-peach/10 text-peach border border-peach/20'
                                                : 'bg-white/30 text-charcoal/40 hover:bg-white/50 border border-transparent'}
                                        `}
                                    >
                                        All
                                    </button>
                                    {presetCategories.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setPresetCategory(cat)}
                                            className={`
                                                px-3 py-1 rounded-full text-xs font-medium transition-all capitalize
                                                ${presetCategory === cat
                                                    ? 'bg-peach/10 text-peach border border-peach/20'
                                                    : 'bg-white/30 text-charcoal/40 hover:bg-white/50 border border-transparent'}
                                            `}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {presetsLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-peach" />
                                    <span className="ml-2 text-sm text-charcoal/60">Loading presets...</span>
                                </div>
                            ) : (
                                <div className="relative group/presets">
                                    {/* Left Arrow */}
                                    <button
                                        onClick={() => {
                                            const container = document.getElementById('preset-scroll-container')
                                            if (container) container.scrollBy({ left: -300, behavior: 'smooth' })
                                        }}
                                        className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-charcoal/10 flex items-center justify-center opacity-0 group-hover/presets:opacity-100 transition-opacity hover:bg-charcoal hover:text-white -ml-5"
                                    >
                                        <ArrowRight className="w-5 h-5 rotate-180" />
                                    </button>

                                    {/* Right Arrow */}
                                    <button
                                        onClick={() => {
                                            const container = document.getElementById('preset-scroll-container')
                                            if (container) container.scrollBy({ left: 300, behavior: 'smooth' })
                                        }}
                                        className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-charcoal/10 flex items-center justify-center opacity-0 group-hover/presets:opacity-100 transition-opacity hover:bg-charcoal hover:text-white -mr-5"
                                    >
                                        <ArrowRight className="w-5 h-5" />
                                    </button>

                                    {/* Scrollable Container */}
                                    <div
                                        id="preset-scroll-container"
                                        className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide scroll-smooth"
                                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                    >
                                        {/* No Preset Option */}
                                        <button
                                            onClick={() => setSelectedPreset('')}
                                            className={`
                                                flex-shrink-0 group relative p-3 rounded-2xl border text-left transition-all duration-300 overflow-hidden h-28 w-36
                                                ${selectedPreset === ''
                                                    ? 'bg-charcoal text-cream border-charcoal ring-2 ring-charcoal/20 ring-offset-2'
                                                    : 'bg-white/40 border-white/50 hover:border-peach/50 hover:bg-white/60'}
                                            `}
                                        >
                                            <div className="relative z-10 flex flex-col h-full justify-between">
                                                <div className={`w-8 h-8 rounded-full mb-2 flex items-center justify-center ${selectedPreset === '' ? 'bg-white/10' : 'bg-charcoal/5'}`}>
                                                    <X className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="font-serif text-sm">Clothing Only</div>
                                                    <div className="text-[10px] opacity-60">No scene change</div>
                                                </div>
                                            </div>
                                        </button>

                                        {/* Preset Cards */}
                                        {presets
                                            .filter(p => presetCategory === 'all' || p.category === presetCategory)
                                            .map(preset => {
                                                const categoryColors: Record<string, string> = {
                                                    studio: 'from-gray-400/40 to-slate-500/40',
                                                    street: 'from-slate-500/40 to-zinc-600/40',
                                                    outdoor: 'from-green-500/40 to-emerald-600/40',
                                                    lifestyle: 'from-pink-400/40 to-rose-500/40',
                                                    editorial: 'from-purple-500/40 to-violet-600/40',
                                                    traditional: 'from-orange-500/40 to-amber-600/40',
                                                }
                                                const bgGradient = categoryColors[preset.category] || 'from-gray-400/40 to-gray-500/40'

                                                return (
                                                    <button
                                                        key={preset.id}
                                                        onClick={() => setSelectedPreset(preset.id)}
                                                        className={`
                                                            flex-shrink-0 group relative p-3 rounded-2xl border text-left transition-all duration-300 overflow-hidden h-28 w-36
                                                            ${selectedPreset === preset.id
                                                                ? 'border-peach ring-2 ring-peach/20 ring-offset-2'
                                                                : 'border-white/50 hover:border-peach/50'}
                                                        `}
                                                    >
                                                        {/* Background Gradient */}
                                                        <div className={`absolute inset-0 z-0 bg-gradient-to-br ${bgGradient}`} />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-0" />

                                                        <div className="relative z-10 h-full flex flex-col justify-between">
                                                            {/* Category Badge */}
                                                            <div className="flex justify-between items-start">
                                                                <span className="text-[9px] uppercase tracking-wider text-white/70 bg-black/20 px-1.5 py-0.5 rounded">
                                                                    {preset.category}
                                                                </span>
                                                                {selectedPreset === preset.id && (
                                                                    <Check className="w-4 h-4 text-peach" />
                                                                )}
                                                            </div>

                                                            {/* Name & Description */}
                                                            <div className="text-white">
                                                                <div className="font-serif text-sm">{preset.name}</div>
                                                                <div className="text-[9px] opacity-70 line-clamp-2">
                                                                    {preset.description}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </button>
                                                )
                                            })}
                                    </div>
                                </div>
                            )}
                        </motion.div>

                        {/* Aspect Ratio Selection (Moved to Right Panel) */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.45 }}
                            className="mb-6"
                        >
                            <h3 className="font-serif text-2xl text-charcoal mb-4">
                                Choose Your Aspect Ratio
                            </h3>
                            <div className="flex gap-4">
                                {['1:1', '4:5', '9:16'].map((ratio) => (
                                    <button
                                        key={ratio}
                                        onClick={() => setAspectRatio(ratio as any)}
                                        className={`
                                            flex-1 py-3 rounded-lg border text-sm font-medium transition-all
                                            ${aspectRatio === ratio
                                                ? 'bg-charcoal text-white border-charcoal shadow-lg'
                                                : 'bg-white border-charcoal/20 text-charcoal/60 hover:border-charcoal/40'}
                                        `}
                                    >
                                        {ratio}
                                    </button>
                                ))}
                            </div>

                            {/* Hidden Model Selector Toggles (kept for functionality but made subtle) */}
                            <div className="flex gap-4 mt-4 opacity-50 hover:opacity-100 transition-opacity">
                                <button onClick={() => setSelectedModel(selectedModel === 'flash' ? 'pro' : 'flash')} className="text-xs text-charcoal/40 font-medium uppercase tracking-widest hover:text-peach">
                                    Current Model: {selectedModel}
                                </button>
                            </div>
                        </motion.div>

                        {/* RESULT DISPLAY */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 }}
                            className="relative rounded-[2rem] overflow-hidden bg-charcoal/5 border border-white/20 shadow-2xl min-h-[500px] flex flex-col"
                        >
                            {/* Main Result Image */}
                            {result ? (
                                <>
                                    <div className="flex-1 flex items-center justify-center group relative">
                                        <img
                                            src={result.base64Image ? (result.base64Image.startsWith('data:') ? result.base64Image : `data:image/jpeg;base64,${result.base64Image}`) : result.imageUrl}
                                            alt="Generated Result"
                                            className="w-full h-full object-contain max-h-[600px] bg-charcoal/90"
                                            onError={(e) => {
                                                console.error('Image failed to load:', result.imageUrl)
                                                const target = e.target as HTMLImageElement
                                                if (target.src !== result.imageUrl) {
                                                    console.log('Falling back to storage URL')
                                                    target.src = result.imageUrl
                                                }
                                            }}
                                        />

                                        {/* Overlay Controls (on hover) */}
                                        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4">
                                            <button
                                                onClick={handleDownload}
                                                className="px-6 py-3 bg-white text-charcoal rounded-full font-medium flex items-center gap-2 hover:bg-peach hover:text-white transition-colors"
                                            >
                                                <Download className="w-4 h-4" /> Download
                                            </button>
                                            <button
                                                onClick={() => setShowShareModal(true)}
                                                className="px-6 py-3 bg-white text-charcoal rounded-full font-medium flex items-center gap-2 hover:bg-peach hover:text-white transition-colors"
                                            >
                                                <Share2 className="w-4 h-4" /> Share
                                            </button>
                                        </div>
                                    </div>

                                    {/* Variant Selector - Shows when multiple variants exist */}
                                    {variants.length > 1 && (
                                        <div className="p-4 bg-white/80 backdrop-blur-md border-t border-white/30">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-sm font-medium text-charcoal/70">
                                                    Choose your favorite variant
                                                </span>
                                                <span className="text-xs text-charcoal/50">
                                                    {selectedVariant + 1} of {variants.length}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                {variants.map((variant, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => {
                                                            setSelectedVariant(idx)
                                                            setResult({
                                                                jobId: result?.jobId || '',
                                                                imageUrl: variant.imageUrl,
                                                                base64Image: variant.base64Image
                                                            })
                                                        }}
                                                        className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all ${selectedVariant === idx
                                                            ? 'border-peach ring-2 ring-peach/30 scale-105'
                                                            : 'border-white/50 hover:border-peach/50'
                                                            }`}
                                                    >
                                                        <img
                                                            src={variant.base64Image ? (variant.base64Image.startsWith('data:') ? variant.base64Image : `data:image/jpeg;base64,${variant.base64Image}`) : variant.imageUrl}
                                                            alt={`Variant ${idx + 1}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        {/* Variant label */}
                                                        <div className={`absolute bottom-0 left-0 right-0 py-2 text-center text-xs font-medium ${selectedVariant === idx
                                                            ? 'bg-peach text-white'
                                                            : 'bg-black/60 text-white/90'
                                                            }`}>
                                                            {variant.label || `Option ${idx + 1}`}
                                                        </div>
                                                        {selectedVariant === idx && (
                                                            <div className="absolute top-2 right-2 w-6 h-6 bg-peach rounded-full flex items-center justify-center">
                                                                <Check className="w-4 h-4 text-white" />
                                                            </div>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Product Link Display in Result Area */}
                                    {productId && result && (
                                        <div className="p-4 bg-white/80 backdrop-blur-md border-t border-white/30">
                                            <div className="flex items-center gap-2 mb-2">
                                                <LinkIcon className="w-4 h-4 text-charcoal/50" />
                                                <span className="text-sm font-medium text-charcoal/70">Share Product Link</span>
                                            </div>
                                            {linkLoading ? (
                                                <div className="flex items-center gap-2 text-sm text-charcoal/50">
                                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                    <span>Generating link...</span>
                                                </div>
                                            ) : maskedLink && displayUrl ? (
                                                <div className="flex items-center gap-2">
                                                    <code className="flex-1 text-xs bg-white/60 px-3 py-2 rounded-lg border border-charcoal/10 text-charcoal/70 font-mono truncate">
                                                        {displayUrl}
                                                    </code>
                                                    <button
                                                        onClick={copyLink}
                                                        className="p-2 hover:bg-charcoal/5 rounded-lg transition-colors"
                                                        title="Copy tracked link"
                                                    >
                                                        {linkCopied ? (
                                                            <Check className="w-4 h-4 text-emerald-600" />
                                                        ) : (
                                                            <Copy className="w-4 h-4 text-charcoal/50" />
                                                        )}
                                                    </button>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-charcoal/40">Link unavailable</p>
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="text-center p-10">
                                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                                            <Sparkles className="w-10 h-10 text-peach/50" />
                                        </div>
                                        <h3 className="text-2xl font-serif text-charcoal/40 mb-2">Ready to Create</h3>
                                        <p className="text-charcoal/30 max-w-xs mx-auto">
                                            Upload your photo and clothing to start the magic.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </motion.div>

                        {/* Action Buttons - Always Visible when result exists */}
                        {result && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex gap-4"
                            >
                                <button
                                    onClick={handleDownload}
                                    className="flex-1 px-6 py-4 bg-white border-2 border-charcoal/10 text-charcoal rounded-full font-medium flex items-center justify-center gap-2 hover:bg-charcoal hover:text-cream transition-colors"
                                >
                                    <Download className="w-5 h-5" />
                                    Download
                                </button>
                                <button
                                    onClick={() => setShowShareModal(true)}
                                    className="flex-1 px-6 py-4 bg-charcoal text-cream rounded-full font-medium flex items-center justify-center gap-2 hover:bg-peach transition-colors"
                                >
                                    <Share2 className="w-5 h-5" />
                                    Share to Social
                                </button>
                            </motion.div>
                        )}


                    </div>
                </div>
            </div>

            {/* Share Modal */}
            {result && (
                <ShareModal
                    isOpen={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    imageUrl={result.imageUrl}
                    imageBase64={result.base64Image}
                    productId={productId || undefined}
                />
            )}
        </div>
    )
}

export default function TryOnPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-cream pt-24 flex items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                    <Sparkles className="w-8 h-8 text-charcoal/30" />
                </motion.div>
            </div>
        }>
            <TryOnPageContent />
        </Suspense>
    )
}
