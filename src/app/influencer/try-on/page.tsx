'use client'
import './studio.css'

import { useState, useEffect, Suspense, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { toast } from 'sonner'
import { Upload, Sparkles, Palette, Download, ArrowRight, X, PartyPopper, AlertTriangle, Loader2, Share2, RefreshCw, Check, ShoppingBag, Copy, Link as LinkIcon, User } from 'lucide-react'
import { useProduct, useUser } from '@/lib/react-query/hooks'
import { safeParseResponse } from '@/lib/api-utils'
import { useProductLink } from '@/lib/hooks/useProductLink'
import { createClient } from '@/lib/auth-client'
import { showErrorToast, showInfoToast, showSuccessToast, showWarningToast } from '@/lib/kiwikoo-toast'

// Try-on preset type (v3)
interface TryOnPreset {
    id: string
    name: string
    description: string
    category: string
    vibe?: string
    poseHint?: string
    framingHint?: string
    sceneObjects?: string
    styleTags?: string[]
    faceStability?: 'max' | 'high'
    lightingHint?: string
}
// Inline loading animation - no popup overlay
import { ShareModal } from '@/components/tryon/ShareModal'
import { bounceInVariants } from '@/lib/animations'
import { BrutalLoader } from '@/components/ui/BrutalLoader'

interface Product {
    id: string
    name: string
    category?: string
    brand?: {
        companyName: string
    }
    tryOnImage?: string
}

const SHOW_ACCESSORIES_SECTION = false
const TRYON_PRESETS_CACHE_KEY = 'tryon:presets:v1'
const TRYON_IDENTITY_IMAGES_CACHE_KEY = 'tryon:identity-images:v1'
const TRYON_PROFILE_IMAGES_CACHE_KEY = 'tryon:profile-images:v1'
const TRYON_PRESETS_CACHE_TTL_MS = 10 * 60 * 1000
const TRYON_LIBRARY_CACHE_TTL_MS = 5 * 60 * 1000

type SessionCacheEntry<T> = {
    timestamp: number
    data: T
}

function readSessionCache<T>(key: string, ttlMs: number): T | null {
    if (typeof window === 'undefined') return null

    try {
        const raw = window.sessionStorage.getItem(key)
        if (!raw) return null

        const parsed = JSON.parse(raw) as SessionCacheEntry<T>
        if (!parsed || typeof parsed.timestamp !== 'number') {
            window.sessionStorage.removeItem(key)
            return null
        }

        if (Date.now() - parsed.timestamp > ttlMs) {
            window.sessionStorage.removeItem(key)
            return null
        }

        return parsed.data
    } catch {
        window.sessionStorage.removeItem(key)
        return null
    }
}

function writeSessionCache<T>(key: string, data: T) {
    if (typeof window === 'undefined') return

    try {
        const payload: SessionCacheEntry<T> = {
            timestamp: Date.now(),
            data,
        }
        window.sessionStorage.setItem(key, JSON.stringify(payload))
    } catch {
        // Ignore cache write failures (private browsing, quota, etc.)
    }
}

function scheduleDeferredTask(task: () => void, timeout = 800) {
    if (typeof window === 'undefined') {
        return () => undefined
    }

    const idleWindow = window as typeof window & {
        requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
        cancelIdleCallback?: (handle: number) => void
    }

    if (typeof idleWindow.requestIdleCallback === 'function') {
        const handle = idleWindow.requestIdleCallback(() => task(), { timeout })
        return () => {
            if (typeof idleWindow.cancelIdleCallback === 'function') {
                idleWindow.cancelIdleCallback(handle)
            }
        }
    }

    const handle = window.setTimeout(task, timeout)
    return () => window.clearTimeout(handle)
}

function TryOnPageContent() {
    const router = useRouter()
    const { data: user } = useUser()
    const searchParams = useSearchParams()
    const productId = searchParams.get('productId')

    const [personImage, setPersonImage] = useState<string>('')
    const [personImageBase64, setPersonImageBase64] = useState<string>('')
    const [clothingImage, setClothingImage] = useState<string>('')
    const [clothingImageBase64, setClothingImageBase64] = useState<string>('')
    const [backgroundImage, setBackgroundImage] = useState<string>('')
    const [backgroundImageBase64, setBackgroundImageBase64] = useState<string>('')
    const [editType, setEditType] = useState<'clothing_change' | 'background_change' | 'lighting_change' | 'pose_change' | 'camera_change'>('clothing_change')
    const [userRequest, setUserRequest] = useState<string>('')

    const [savedProfileImages, setSavedProfileImages] = useState<Array<{ id: string; imageUrl: string; isPrimary: boolean; label: string | null }>>([])
    const [savedProfileImagesLoading, setSavedProfileImagesLoading] = useState(false)
    const [savedProfileImagesReady, setSavedProfileImagesReady] = useState(false)
    const [saveUploadedPersonToProfile, setSaveUploadedPersonToProfile] = useState(false)
    // Identity images for better face consistency (auto-fetched from profile)
    const [identityImages, setIdentityImages] = useState<Array<{ type: string; imageUrl: string }>>([])
    const [identityImagesLoading, setIdentityImagesLoading] = useState(false)
    const [useIdentityImages, setUseIdentityImages] = useState(true) // Toggle for using identity refs
    // NEW: Accessory states for Edit Mode
    const [accessoryImages, setAccessoryImages] = useState<string[]>([])
    const [accessoryTypes, setAccessoryTypes] = useState<('purse' | 'shoes' | 'hat' | 'jewelry' | 'bag' | 'watch' | 'sunglasses' | 'scarf' | 'other')[]>([])
    const [loading, setLoading] = useState(false)
    const [retryAfterSeconds, setRetryAfterSeconds] = useState(0)
    const [retryReason, setRetryReason] = useState<'job_in_progress' | 'rate_limit' | null>(null)
    const [activeJobId, setActiveJobId] = useState<string | null>(null)
    const [queueStatus, setQueueStatus] = useState<'idle' | 'queued' | 'generating'>('idle')
    const [uploadingImage, setUploadingImage] = useState<'person' | 'clothing' | 'background' | 'accessory' | null>(null)
    // Multi-variant support: generate 3 variants, user selects one
    const [result, setResult] = useState<{ jobId: string; imageUrl: string; base64Image?: string } | null>(null)
    const [variants, setVariants] = useState<Array<{ imageUrl: string; base64Image?: string; variantId: number; label?: string }>>([])
    const [selectedVariant, setSelectedVariant] = useState<number>(0)
    const [product, setProduct] = useState<Product | null>(null)
    const [selectedPreset, setSelectedPreset] = useState<string>('')
    const [presetCategory, setPresetCategory] = useState<string>('all')
    const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '3:4' | '9:16'>('1:1')
    const [quality, setQuality] = useState<'1K' | '2K'>('2K')
    const [activeTab, setActiveTab] = useState<'builder' | 'prompt'>('builder')
    const [dragOver, setDragOver] = useState<'person' | 'clothing' | null>(null)
    const [showCelebration, setShowCelebration] = useState(false)
    const [showShareModal, setShowShareModal] = useState(false)
    const [elapsedSeconds, setElapsedSeconds] = useState(0)
    const [downloading, setDownloading] = useState(false)
    const generateInFlightRef = useRef(false)
    const lastGenerateAttemptAtRef = useRef(0)
    const pollCooldownUntilRef = useRef(0)
    const pollAttemptRef = useRef(0)

    // Presets
    const [presets, setPresets] = useState<TryOnPreset[]>([])
    const [presetsLoading, setPresetsLoading] = useState(true)
    const [presetCategories, setPresetCategories] = useState<string[]>([])
    const selectedPresetDetails = presets.find((preset) => preset.id === selectedPreset) ?? null

    const fetchPresets = useCallback(async ({ force = false }: { force?: boolean } = {}) => {
        if (!force) {
            const cached = readSessionCache<{ presets: TryOnPreset[]; categories: string[] }>(
                TRYON_PRESETS_CACHE_KEY,
                TRYON_PRESETS_CACHE_TTL_MS
            )
            if (cached) {
                setPresets(cached.presets)
                setPresetCategories(cached.categories)
                setPresetsLoading(false)
                return cached.presets
            }
        }

        setPresetsLoading(true)
        try {
            const res = await fetch('/api/presets')
            const data = await safeParseResponse(res, 'presets')
            if (res.ok && data.presets) {
                const nextPresets = data.presets as TryOnPreset[]
                const nextCategories = (data.categories || []) as string[]
                setPresets(nextPresets)
                setPresetCategories(nextCategories)
                writeSessionCache(TRYON_PRESETS_CACHE_KEY, {
                    presets: nextPresets,
                    categories: nextCategories,
                })
                return nextPresets
            }
        } catch (e) {
            console.error('Failed to fetch presets:', e)
        } finally {
            setPresetsLoading(false)
        }

        return [] as TryOnPreset[]
    }, [])

    useEffect(() => {
        void fetchPresets()
    }, [fetchPresets])

    // Countdown timer for loading state
    useEffect(() => {
        if (loading) {
            setElapsedSeconds(0)
            const interval = setInterval(() => {
                setElapsedSeconds(prev => prev + 1)
            }, 1000)
            return () => clearInterval(interval)
        }
    }, [loading])

    // Reset retry cooldown on mount so we never show a stale "Job in progress" from a previous session
    useEffect(() => {
        setRetryAfterSeconds(0)
        setRetryReason(null)
    }, [])

    // Retry cooldown timer (for 429 / job-in-progress responses)
    useEffect(() => {
        if (retryAfterSeconds <= 0) {
            setRetryReason(null)
            return
        }
        const t = setInterval(() => {
            setRetryAfterSeconds(prev => Math.max(0, prev - 1))
        }, 1000)
        return () => clearInterval(t)
    }, [retryAfterSeconds])

    const pollTryOnJob = useCallback(async (
        jobId: string,
        options?: { onStatus?: (status: 'pending' | 'processing') => void }
    ) => {
        const startedAt = Date.now()
        const timeoutMs = 10 * 60 * 1000
        const baseIntervalMs = 3000
        let consecutiveRateLimitCount = 0

        while (Date.now() - startedAt < timeoutMs) {
            const now = Date.now()
            const cooldownUntil = pollCooldownUntilRef.current
            if (cooldownUntil > now) {
                await new Promise(resolve => setTimeout(resolve, cooldownUntil - now))
            }

            try {
                const pollResponse = await fetch(`/api/tryon/jobs/${jobId}`, { cache: 'no-store', credentials: 'include' })
                const pollData = await safeParseResponse<any>(pollResponse, 'try-on job polling')
                const status = pollData?.status as string | undefined

                pollAttemptRef.current += 1
                consecutiveRateLimitCount = 0

                if (status === 'pending' || status === 'processing') {
                    options?.onStatus?.(status)
                    const dynamicIntervalMs = Math.min(12000, baseIntervalMs + Math.floor(pollAttemptRef.current / 3) * 1000)
                    const jitterMs = Math.floor(Math.random() * 350)
                    await new Promise(resolve => setTimeout(resolve, dynamicIntervalMs + jitterMs))
                    continue
                }

                if (status === 'completed' || status === 'failed') {
                    return pollData
                }

                await new Promise(resolve => setTimeout(resolve, baseIntervalMs))
            } catch (error) {
                const structured = error as (Error & { status?: number; retryAfterSeconds?: number })
                const isRateLimited = structured?.status === 429 || structured?.status === 503

                if (!isRateLimited) {
                    throw error
                }

                consecutiveRateLimitCount += 1
                const serverRetry = Math.max(1, Number(structured?.retryAfterSeconds ?? (structured?.status === 503 ? 12 : 8)))
                const exponentialPenalty = Math.min(120, 2 ** Math.min(consecutiveRateLimitCount, 6))
                const retrySeconds = Math.max(serverRetry, exponentialPenalty)
                pollCooldownUntilRef.current = Date.now() + retrySeconds * 1000

                setRetryAfterSeconds(prev => Math.max(prev, retrySeconds))
                setRetryReason('rate_limit')

                const remainingMs = timeoutMs - (Date.now() - startedAt)
                const waitMs = Math.min(retrySeconds * 1000, remainingMs)
                if (waitMs <= 0) break

                await new Promise(resolve => setTimeout(resolve, waitMs))
            }
        }

        throw new Error('Generation is taking longer than expected. Please check Generations history.')
    }, [])

    useEffect(() => {
        if (!user?.id || generateInFlightRef.current) return

        let cancelled = false
        const restoreActiveJob = async () => {
            try {
                const response = await fetch('/api/tryon/jobs/active', { cache: 'no-store', credentials: 'include' })

                if (response.status === 404) {
                    sessionStorage.removeItem('tryonActiveJobId')
                    return
                }

                const active = await safeParseResponse<any>(response, 'active try-on job')
                if (!active?.jobId || (active?.status !== 'pending' && active?.status !== 'processing')) {
                    sessionStorage.removeItem('tryonActiveJobId')
                    return
                }

                if (cancelled) return

                const restoredJobId = String(active.jobId)
                setActiveJobId(restoredJobId)
                setLoading(true)
                setQueueStatus(active.status === 'pending' ? 'queued' : 'generating')
                sessionStorage.setItem('tryonActiveJobId', restoredJobId)

                const finalJob = await pollTryOnJob(restoredJobId, {
                    onStatus: (status) => {
                        setQueueStatus(status === 'pending' ? 'queued' : 'generating')
                    },
                })

                if (cancelled) return

                if (finalJob.status === 'failed') {
                    throw new Error(finalJob.error || 'Try-on generation failed')
                }

                if (!finalJob.imageUrl && !finalJob.base64Image) {
                    throw new Error('Try-on completed but no image was returned')
                }

                setVariants([])
                setResult({
                    jobId: restoredJobId,
                    imageUrl: finalJob.imageUrl || '',
                    base64Image: finalJob.base64Image,
                })
                showSuccessToast('Try-on ready', 'Your existing generated image is ready.')
                setShowCelebration(true)
                setTimeout(() => setShowCelebration(false), 5000)
            } catch (error) {
                if (cancelled) return
                const structured = error as (Error & { status?: number })
                if (structured?.status !== 404) {
                    const message = error instanceof Error ? error.message : 'Failed to resume active try-on job'
                    showErrorToast('Try-on resume failed', message)
                }
            } finally {
                if (cancelled) return
                setLoading(false)
                setActiveJobId(null)
                setQueueStatus('idle')
                pollAttemptRef.current = 0
                pollCooldownUntilRef.current = 0
                sessionStorage.removeItem('tryonActiveJobId')
            }
        }

        restoreActiveJob()
        return () => {
            cancelled = true
        }
    }, [user?.id, pollTryOnJob])

    const fetchIdentityImages = useCallback(async ({ force = false }: { force?: boolean } = {}) => {
        if (!force) {
            const cached = readSessionCache<Array<{ type: string; imageUrl: string }>>(
                TRYON_IDENTITY_IMAGES_CACHE_KEY,
                TRYON_LIBRARY_CACHE_TTL_MS
            )
            if (cached) {
                setIdentityImages(cached)
                return cached
            }
        }

        setIdentityImagesLoading(true)
        try {
            const res = await fetch('/api/identity-images')
            const data = await safeParseResponse(res, 'identity-images')
            if (!res.ok) return []

            const images = Array.isArray(data)
                ? data
                : (Array.isArray(data?.images) ? data.images : [])

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
            writeSessionCache(TRYON_IDENTITY_IMAGES_CACHE_KEY, normalized)
            return normalized
        } catch (e) {
            console.warn('Failed to load identity images:', e)
            return []
        } finally {
            setIdentityImagesLoading(false)
        }
    }, [])

    useEffect(() => {
        const cancelDeferredLoad = scheduleDeferredTask(() => {
            void fetchIdentityImages()
        }, 1200)

        return cancelDeferredLoad
    }, [fetchIdentityImages])

    const { data: productData, isLoading: productLoading } = useProduct(productId)
    const { maskedLink, originalUrl, displayUrl, loading: linkLoading, copyLink, copied: linkCopied } = useProductLink(productId)

    const fetchSavedProfileImages = useCallback(async () => {
        const cached = readSessionCache<Array<{ id: string; imageUrl: string; isPrimary: boolean; label: string | null }>>(
            TRYON_PROFILE_IMAGES_CACHE_KEY,
            TRYON_LIBRARY_CACHE_TTL_MS
        )
        if (cached) {
            setSavedProfileImages(cached)
            setSavedProfileImagesLoading(false)
            setSavedProfileImagesReady(true)
            return cached
        }

        setSavedProfileImagesLoading(true)
        try {
            const res = await fetch('/api/profile-images')
            const data = await safeParseResponse(res, 'profile-images')
            if (!res.ok) throw new Error(data.error || 'Failed to fetch profile images')
            const nextImages = (data.images || []) as Array<{ id: string; imageUrl: string; isPrimary: boolean; label: string | null }>
            setSavedProfileImages(nextImages)
            writeSessionCache(TRYON_PROFILE_IMAGES_CACHE_KEY, nextImages)
            return nextImages
        } catch (e) {
            console.warn('Failed to load profile images:', e)
            return []
        } finally {
            setSavedProfileImagesLoading(false)
            setSavedProfileImagesReady(true)
        }
    }, [])

    const refreshSavedProfileImages = useCallback(async () => {
        setSavedProfileImagesLoading(true)
        try {
            const res = await fetch('/api/profile-images')
            const data = await safeParseResponse(res, 'profile-images')
            if (!res.ok) throw new Error(data.error || 'Failed to fetch profile images')
            const nextImages = (data.images || []) as Array<{ id: string; imageUrl: string; isPrimary: boolean; label: string | null }>
            setSavedProfileImages(nextImages)
            writeSessionCache(TRYON_PROFILE_IMAGES_CACHE_KEY, nextImages)
            return nextImages
        } catch (e) {
            console.warn('Failed to load profile images:', e)
            return []
        } finally {
            setSavedProfileImagesLoading(false)
            setSavedProfileImagesReady(true)
        }
    }, [])

    useEffect(() => {
        const cancelDeferredLoad = scheduleDeferredTask(() => {
            void fetchSavedProfileImages()
        }, 600)

        return cancelDeferredLoad
    }, [fetchSavedProfileImages])

    // Auto-select the primary (or first) saved profile image so the button is immediately usable
    const autoPersonLoadedRef = useRef(false)
    useEffect(() => {
        if (autoPersonLoadedRef.current) return
        if (personImage || personImageBase64) return
        if (savedProfileImages.length === 0) return

        const pick = savedProfileImages.find((img) => img.isPrimary) || savedProfileImages[0]
        if (!pick?.imageUrl) return

        autoPersonLoadedRef.current = true
            ; (async () => {
                try {
                    setUploadingImage('person')
                    const res = await fetch(pick.imageUrl)
                    const blob = await res.blob()
                    const base64: string = await new Promise((resolve, reject) => {
                        const reader = new FileReader()
                        reader.onloadend = () => resolve(reader.result as string)
                        reader.onerror = () => reject(new Error('Failed to read image'))
                        reader.readAsDataURL(blob)
                    })
                    setPersonImage(base64)
                    setPersonImageBase64(base64)
                } catch {
                    console.warn('[tryon] auto-select person image failed')
                } finally {
                    setUploadingImage(null)
                }
            })()
    }, [savedProfileImages, personImage, personImageBase64])

    // Track if we've already loaded the product image to prevent infinite loops
    const productImageLoadedRef = useRef<string | null>(null)

    useEffect(() => {
        if (productData && productData.id) {
            // Legacy logic: API returns images array with isTryOnReference flag
            const tryOnImageUrl = productData.images?.find((img: any) => img.isTryOnReference)?.imagePath

            setProduct({
                id: productData.id,
                name: productData.name,
                category: productData.category,
                brand: productData.brand,
                tryOnImage: tryOnImageUrl,
            })

            // Auto-load clothing image if found and not already loaded for this product
            if (tryOnImageUrl && productImageLoadedRef.current !== productData.id) {
                productImageLoadedRef.current = productData.id
                setClothingImage(tryOnImageUrl)

                fetch(tryOnImageUrl)
                    .then((res) => res.blob())
                    .then((blob) => {
                        const reader = new FileReader()
                        reader.onloadend = () => {
                            setClothingImageBase64(reader.result as string)
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
    }, [productData])

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
                        .then(() => refreshSavedProfileImages())
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
    }, [refreshSavedProfileImages, saveUploadedPersonToProfile])

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

    const handleSelectProductImage = async (imageUrl: string) => {
        setClothingImage(imageUrl)
        try {
            // Fetch blob for base64 conversion (needed for generation API)
            const res = await fetch(imageUrl)
            const blob = await res.blob()
            const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result as string)
                reader.readAsDataURL(blob)
            })
            setClothingImageBase64(base64)
            toast.success('Selected garment style')
        } catch (e) {
            console.error('Failed to load image blob', e)
        }
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
        if (generateInFlightRef.current) {
            return
        }
        const now = Date.now()
        if (now - lastGenerateAttemptAtRef.current < 2500) {
            toast.error('Please wait a moment before trying again.')
            return
        }
        lastGenerateAttemptAtRef.current = now

        if (retryAfterSeconds > 0) {
            toast.error(`Rate limited. Try again in ${retryAfterSeconds}s.`)
            return
        }
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
        setQueueStatus('idle')
        generateInFlightRef.current = true
        pollAttemptRef.current = 0
        pollCooldownUntilRef.current = 0

        try {
            // Collect identity references (Flash: 1-2 strong face refs)
            const allAdditionalImages: string[] = []

            let resolvedIdentityImages = identityImages
            if (useIdentityImages && resolvedIdentityImages.length === 0) {
                resolvedIdentityImages = await fetchIdentityImages()
            }

            // Add identity images if available and enabled
            if (useIdentityImages && resolvedIdentityImages.length > 0) {
                const faceOnlyTypes = new Set(['face_front', 'face_smile', 'face_left', 'face_right'])
                const identityForModel = resolvedIdentityImages.filter((x) => faceOnlyTypes.has(x.type)).slice(0, 2)

                for (const idImg of identityForModel) {
                    const base64 = await urlToBase64(idImg.imageUrl)
                    if (base64) {
                        allAdditionalImages.push(base64)
                    }
                }
            }

            const submitTimeoutMs = 115000
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), submitTimeoutMs)

            let response: Response
            try {
                response = await fetch('/api/tryon', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    signal: controller.signal,
                    body: JSON.stringify({
                        personImage: personImageBase64 || personImage,
                        personImages: allAdditionalImages.length > 0 ? allAdditionalImages : undefined,
                        editType,
                        clothingImage: clothingImageBase64 || clothingImage || undefined,
                        backgroundImage: backgroundImageBase64 || backgroundImage || undefined,
                        accessoryImages: accessoryImages.length > 0 ? accessoryImages : undefined,
                        accessoryTypes: accessoryTypes.length > 0 ? accessoryTypes : undefined,
                        model: 'flash',
                        stylePreset: selectedPreset || undefined,
                        userRequest: userRequest || undefined,
                        aspectRatio,
                        resolution: quality,
                    }),
                })
            } finally {
                clearTimeout(timeoutId)
            }
            // Safe parse handles non-JSON and error responses gracefully
            const data = await safeParseResponse(response, 'try-on generation')

            if (!response.ok) {
                throw new Error(data?.error || 'Failed to submit try-on job')
            }

            const jobId = data?.jobId as string | undefined
            if (!jobId) {
                throw new Error('Try-on job was accepted without a job id')
            }

            // Inline completion (no worker): API returned image directly
            if (data?.status === 'completed' && (data?.imageUrl || data?.base64Image)) {
                const variants = Array.isArray(data?.variants) ? data.variants : [{ imageUrl: data?.imageUrl, base64Image: data?.base64Image, variantId: 0, label: 'Nano Banana Pro' }]
                setVariants(variants.map((v: any, idx: number) => ({ imageUrl: v?.imageUrl, base64Image: v?.base64Image, variantId: idx, label: v?.label })))
                setSelectedVariant(0)
                setResult({
                    jobId,
                    imageUrl: data?.imageUrl || variants[0]?.imageUrl || '',
                    base64Image: data?.base64Image ?? variants[0]?.base64Image,
                })
                showSuccessToast('Try-on generated', 'Your image is ready to preview.')
                setShowCelebration(true)
                setTimeout(() => setShowCelebration(false), 5000)
                return
            }

            setActiveJobId(jobId)
            setQueueStatus('queued')
            sessionStorage.setItem('tryonActiveJobId', jobId)
            showInfoToast('Generation started', 'Your try-on job has been accepted.')

            const finalJob = await pollTryOnJob(jobId, {
                onStatus: (status) => {
                    setQueueStatus(status === 'pending' ? 'queued' : 'generating')
                },
            })

            if (finalJob.status === 'failed') {
                throw new Error(finalJob.error || 'Try-on generation failed')
            }

            if (!finalJob.imageUrl && !finalJob.base64Image) {
                throw new Error('Try-on completed but no image was returned')
            }

            setVariants([])
            setResult({
                jobId,
                imageUrl: finalJob.imageUrl || '',
                base64Image: finalJob.base64Image,
            })
            showSuccessToast('Try-on generated', 'Your image is ready to preview.')

            setShowCelebration(true)
            // Show celebration for 5 seconds to let success video play fully
            setTimeout(() => setShowCelebration(false), 5000)
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                showWarningToast('Request timed out', 'Checking your active try-on job now.')
                try {
                    const activeRes = await fetch('/api/tryon/jobs/active', { cache: 'no-store', credentials: 'include' })
                    const active = await safeParseResponse<any>(activeRes, 'active try-on job after timeout')
                    if (activeRes.ok && active?.jobId && (active?.status === 'pending' || active?.status === 'processing')) {
                        const timeoutJobId = String(active.jobId)
                        setActiveJobId(timeoutJobId)
                        setQueueStatus(active.status === 'pending' ? 'queued' : 'generating')
                        const finalJob = await pollTryOnJob(timeoutJobId, {
                            onStatus: (status) => {
                                setQueueStatus(status === 'pending' ? 'queued' : 'generating')
                            },
                        })

                        if (finalJob.status === 'failed') {
                            throw new Error(finalJob.error || 'Try-on generation failed')
                        }

                        if (!finalJob.imageUrl && !finalJob.base64Image) {
                            throw new Error('Try-on completed but no image was returned')
                        }

                        setVariants([])
                        setResult({
                            jobId: timeoutJobId,
                            imageUrl: finalJob.imageUrl || '',
                            base64Image: finalJob.base64Image,
                        })
                        showSuccessToast('Try-on complete', 'Your generated image is now ready.')
                        setShowCelebration(true)
                        setTimeout(() => setShowCelebration(false), 5000)
                        return
                    }
                } catch (resumeError) {
                    console.warn('Failed to resume timed-out job:', resumeError)
                }

                showErrorToast('Generation timed out', 'Please try again.')
                return
            }

            // Handle structured error codes from API
            const structured = error as (Error & { status?: number; retryAfterSeconds?: number; code?: string })
            const errorMessage = error instanceof Error ? error.message : 'Generation failed'

            const is429 = structured?.status === 429
            const is503 = structured?.status === 503
            const code = structured?.code
            const isJobInProgress = is429 && (code === 'JOB_IN_PROGRESS' || /already in progress/i.test(errorMessage))
            const isServerBusy = is503 || (is429 && code === 'SERVER_BUSY')
            const isProviderRateLimit = is429 && code === 'RATE_LIMIT'
            if (is429 || is503) {
                const retry = Math.max(1, Math.min(1800, Number(structured?.retryAfterSeconds ?? (is503 ? 20 : 15))))
                setRetryAfterSeconds(retry)
                setRetryReason(isJobInProgress ? 'job_in_progress' : 'rate_limit')

                const msg = isJobInProgress
                    ? `A try-on is still in progress. Please wait ${retry}s.`
                    : isServerBusy
                        ? `Service is busy. Please wait ${retry}s and try again.`
                        : isProviderRateLimit
                            ? `Model provider is rate-limited. Please wait ${retry}s before retrying.`
                            : `Too many requests. Please wait ${retry}s before trying again.`
                toast.error(msg)
                return
            }

            if (structured?.status === 500 && /rate limit|timeout/i.test(errorMessage)) {
                toast.error('Generation failed: rate limit or timeout. Please try again in a minute.')
                return
            }

            // Check for specific error codes embedded in the error message
            if (code === 'ONBOARDING_INCOMPLETE' || errorMessage.includes('PROFILE_INCOMPLETE') || errorMessage.includes('complete your influencer profile')) {
                toast.error('Complete your onboarding before using try-on studio.')
                router.push('/onboarding/influencer')
                return
            }

            if (code === 'ACCOUNT_REJECTED') {
                toast.error('Your profile was rejected. Update it and resubmit for review.')
                router.push('/onboarding/influencer?mode=resubmit')
                return
            }

            if (errorMessage.includes('NOT_APPROVED') || errorMessage.includes('pending') || errorMessage.includes('approval')) {
                toast.error('Your account is pending approval. Please wait for admin review.')
                return
            }

            if (errorMessage.includes('USER_NOT_FOUND')) {
                toast.error('Session expired. Please log out and log in again.')
                router.push('/login')
                return
            }

            if (code === 'PROFILE_SETUP_FAILED') {
                toast.error('Your creator profile is still being prepared. Please refresh once and try again.')
                return
            }

            if (code === 'INVALID_TRYON_INPUT' || code === 'MISSING_IMAGES') {
                toast.error('Please upload both a person photo and a clothing image, then try again.')
                return
            }

            if (code === 'TRYON_STORAGE_FAILED') {
                toast.error('The image was generated but saving it failed. Please try again.')
                return
            }

            if (code === 'TRYON_GENERATION_FAILED' || code === 'TRYON_REQUEST_FAILED') {
                toast.error('The try-on server hit an issue. Please try again in a moment.')
                return
            }

            toast.error(errorMessage)
        } finally {
            setLoading(false)
            setActiveJobId(null)
            setQueueStatus('idle')
            pollAttemptRef.current = 0
            pollCooldownUntilRef.current = 0
            sessionStorage.removeItem('tryonActiveJobId')
            generateInFlightRef.current = false
        }
    }

    const handleDownload = async () => {
        if (!result || downloading) return

        setDownloading(true)
        try {
            // Use base64 if available (much faster and avoids cross-origin fetch issues)
            if (result.base64Image) {
                const base64Data = result.base64Image.startsWith('data:')
                    ? result.base64Image
                    : `data:image/jpeg;base64,${result.base64Image}`

                const link = document.createElement('a')
                link.href = base64Data
                link.download = `kiwikoo-tryon-${result.jobId || Date.now()}.jpg`
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
                link.download = `kiwikoo-tryon-${result.jobId || Date.now()}.jpg`
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                window.URL.revokeObjectURL(blobUrl)
                toast.success('Image downloaded!')
            }
        } catch (error) {
            console.error('Download error:', error)
            toast.error('Failed to download image')
        } finally {
            setDownloading(false)
        }
    }

    const hasPersonInput = Boolean(personImageBase64 || personImage)
    const hasClothingInput = Boolean(clothingImageBase64 || clothingImage)
    const hasBackgroundInput = Boolean(backgroundImageBase64 || backgroundImage)
    const missingRequiredInput =
        !hasPersonInput ||
        (editType === 'clothing_change' && !hasClothingInput) ||
        (editType === 'background_change' && !hasBackgroundInput)
    const isGenerateDisabled = loading || retryAfterSeconds > 0 || missingRequiredInput

    return (
        <div className="studio-layout">
            {/* ══════ CELEBRATION OVERLAY ══════ */}
            <AnimatePresence>
                {showCelebration && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="relative z-[101] flex items-center gap-6 bg-white p-8 border-[4px] border-black shadow-[12px_12px_0_0_#000]">
                            <div className="p-4 bg-[#FFD93D] border-[4px] border-black shadow-[6px_6px_0_0_#000]"><PartyPopper className="w-10 h-10 text-black" /></div>
                            <div><h3 className="text-4xl font-black uppercase tracking-tighter">Success!</h3><p className="text-sm font-bold uppercase tracking-widest bg-[var(--kcoral)] border-[2px] border-black px-2 py-1 mt-2 inline-block">Try-on Ready</p></div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ══════ LEFT COLUMN — IDENTITY LIBRARY ══════ */}
            <aside className="studio-left">
                <div className="studio-header">
                    <h1 className="text-xl font-black uppercase tracking-tighter leading-tight relative z-10">AI Influencer<br/>Studio</h1>
                    <p className="text-[9px] font-bold uppercase tracking-widest mt-1 opacity-60 relative z-10">Powered by Kiwikoo</p>
                </div>
                <div className="flex-1 p-5 space-y-6 overflow-y-auto">
                    {/* Create New */}
                    <button type="button" onClick={() => { setPersonImage(''); setPersonImageBase64(''); setClothingImage(''); setClothingImageBase64(''); setResult(null); setVariants([]); }} className="neo-btn w-full h-28 border-[4px] border-dashed border-black bg-white hover:bg-[#FFD93D] hover:border-solid transition-all flex flex-col items-center justify-center gap-1 shadow-[4px_4px_0_0_#000]">
                        <span className="text-3xl font-black">+</span>
                        <span className="text-xs font-black uppercase tracking-wider">Create New</span>
                    </button>

                    {/* Saved Identities */}
                    <div>
                        <div className="flex justify-between items-center mb-3 border-b-[2px] border-black pb-2">
                            <h3 className="font-black uppercase tracking-wider text-[11px] flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-black inline-block" /> Your Identities</h3>
                            <button type="button" onClick={fetchSavedProfileImages} className="text-[10px] font-bold uppercase underline hover:text-[var(--kcoral)] transition-colors">Refresh</button>
                        </div>
                        {savedProfileImagesLoading ? (
                            <div className="text-xs font-bold uppercase animate-pulse border-[2px] border-black p-4 text-center"><RefreshCw className="w-3 h-3 inline animate-spin mr-1" />Loading...</div>
                        ) : savedProfileImages.length === 0 ? (
                            <div className="text-[11px] font-bold text-black/50 border-[2px] border-dashed border-black/20 p-4 text-center uppercase">No saved photos yet</div>
                        ) : (
                            <div className="grid grid-cols-3 gap-2.5">
                                {savedProfileImages.slice(0, 9).map((img, idx) => (
                                    <button key={img.id} type="button" onClick={() => handleSelectSavedPersonImage(img.imageUrl)} className={`studio-identity-thumb studio-fade-up studio-fade-up-${Math.min(idx + 1, 4)} ${personImage === img.imageUrl ? 'studio-identity-thumb--selected' : ''}`}>
                                        <Image src={img.imageUrl} unoptimized width={100} height={100} alt="saved" className="w-full h-full object-cover" />
                                        {img.isPrimary && <div className="absolute top-0 left-0 bg-[#FFD93D] text-black text-[7px] font-black px-1.5 py-0.5 uppercase border-r-[2px] border-b-[2px] border-black">★</div>}
                                        {personImage === img.imageUrl && <div className="absolute top-0 right-0 bg-[#FF8C69] border-l-[2px] border-b-[2px] border-black p-1"><Check className="w-2.5 h-2.5 text-white" /></div>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Identity images status */}
                    {identityImages.length > 0 && (
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase border-[2px] border-black bg-[#FFF1E6] px-3 py-2">
                            <Check className="w-3 h-3" /> {identityImages.length} face ref{identityImages.length > 1 ? 's' : ''} loaded
                        </div>
                    )}
                </div>

                {/* Bottom promo */}
                <div className="studio-promo">
                    <h4 className="font-black uppercase text-xs leading-tight flex items-center gap-1.5 relative z-10"><Sparkles className="w-3.5 h-3.5" /> Studio Active</h4>
                    <p className="text-[9px] font-bold bg-white text-black inline-block px-1.5 py-0.5 border-[2px] border-black uppercase mt-1.5 shadow-[2px_2px_0_0_rgba(0,0,0,0.15)] relative z-10">Unlimited high-fidelity try-ons</p>
                </div>
            </aside>

            {/* ══════ CENTER COLUMN — CANVAS ══════ */}
            <main className="studio-center">
                <div className="w-full max-w-2xl px-4 flex flex-col items-center justify-center z-10 relative" style={{ minHeight: '60vh' }}>
                    {loading ? (
                        <div className="studio-loading-frame aspect-[4/5] max-h-[65vh]">
                            <Loader2 className="w-14 h-14 animate-spin mb-4 relative z-10" />
                            <span className="relative z-10 text-xl font-black uppercase bg-[#FFD93D] border-[3px] border-black px-4 py-2 shadow-[4px_4px_0_0_#000]">{queueStatus === 'queued' ? 'In Queue...' : 'Generating...'}</span>
                            <div className="relative z-10 mt-4 text-xs font-bold bg-white px-3 py-1.5 border-[2px] border-black shadow-[3px_3px_0_0_var(--kcoral)] uppercase tabular-nums">{elapsedSeconds}s elapsed</div>
                        </div>
                    ) : result ? (
                        <div className="studio-result-frame aspect-[4/5] max-h-[65vh] group">
                            <Image unoptimized width={1200} height={1200}
                                src={result.base64Image ? (result.base64Image.startsWith('data:') ? result.base64Image : `data:image/jpeg;base64,${result.base64Image}`) : result.imageUrl}
                                alt="Generated Result"
                                className="w-full h-full object-contain bg-neutral-900"
                                onError={(e) => { const t = e.target as HTMLImageElement; if (t.src !== result.imageUrl) t.src = result.imageUrl; }}
                            />
                            {/* Hover action buttons */}
                            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                <button type="button" onClick={handleDownload} disabled={downloading} className="neo-btn w-11 h-11 bg-white border-[3px] border-black shadow-[3px_3px_0_0_#000] hover:bg-[#FFD93D] flex items-center justify-center transition-colors">
                                    {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                                </button>
                                <button type="button" onClick={() => setShowShareModal(true)} className="neo-btn w-11 h-11 bg-white border-[3px] border-black shadow-[3px_3px_0_0_#000] hover:bg-[var(--kcoral)] flex items-center justify-center transition-colors">
                                    <Share2 className="w-5 h-5" />
                                </button>
                            </div>
                            {/* Variant thumbnails */}
                            {variants.length > 1 && (
                                <div className="absolute bottom-0 left-0 right-0 p-3 bg-white/90 backdrop-blur border-t-[3px] border-black flex gap-2 justify-center z-20">
                                    {variants.map((v, idx) => (
                                        <button type="button" key={idx} onClick={() => { setSelectedVariant(idx); setResult({ jobId: result.jobId, imageUrl: v.imageUrl, base64Image: v.base64Image }); }} className={`w-16 h-16 border-[3px] overflow-hidden transition-all ${selectedVariant === idx ? 'border-black shadow-[4px_4px_0_0_#FFD93D] scale-110' : 'border-black/30 opacity-60 hover:opacity-100'}`}>
                                            <Image unoptimized width={80} height={80} src={v.base64Image || v.imageUrl} alt={`V${idx + 1}`} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="studio-idle-frame aspect-[4/5] max-h-[65vh]">
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="w-24 h-24 bg-white border-[4px] border-black shadow-[6px_6px_0_0_#FFD93D] flex items-center justify-center mb-6 animate-pulse">
                                    <Sparkles className="w-12 h-12 text-[var(--kcoral)]" />
                                </div>
                                <h2 className="text-3xl font-black uppercase mb-2 tracking-tighter">Ready to Create</h2>
                                <p className="text-sm font-bold text-black/50 mb-6 uppercase tracking-wider">Your canvas awaits</p>
                                <div className="flex gap-3">
                                    <span className="font-bold text-[10px] border-[2px] border-black bg-[#FFD93D] px-3 py-1.5 shadow-[3px_3px_0_0_#000] uppercase">1. Upload</span>
                                    <span className="font-bold text-[10px] border-[2px] border-black bg-[#FF8C69] px-3 py-1.5 shadow-[3px_3px_0_0_#000] uppercase text-white">2. Style</span>
                                    <span className="font-bold text-[10px] border-[2px] border-black bg-[#FFB39A] px-3 py-1.5 shadow-[3px_3px_0_0_#000] uppercase">3. Generate</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Floating Generate Bar */}
                <div className="studio-generate-bar">
                    {retryAfterSeconds > 0 && (
                        <div className="absolute -top-11 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black text-white px-3 py-1.5 text-[11px] font-black uppercase shadow-[3px_3px_0_0_var(--kcoral)] border-[3px] border-black tracking-widest">
                            Wait {retryAfterSeconds}s
                        </div>
                    )}
                    <button type="button" onClick={handleGenerate} disabled={isGenerateDisabled}
                        className={`neo-btn flex-1 py-4 text-base font-black uppercase flex items-center justify-center gap-3 border-[4px] border-black transition-all ${isGenerateDisabled ? 'bg-gray-200 text-gray-400 border-gray-400 shadow-none cursor-not-allowed' : 'bg-[#FFD93D] text-black shadow-[6px_6px_0_0_#000] hover:bg-[var(--kcoral)]'}`}
                    >
                        {loading ? 'Processing...' : retryAfterSeconds > 0 ? `Wait ${retryAfterSeconds}s` : (<><Sparkles className="w-5 h-5" /> Generate Try-On</>)}
                    </button>
                </div>
            </main>

            {/* ══════ RIGHT COLUMN — BUILDER / PROMPT ══════ */}
            <aside className="studio-right">
                {/* Tab bar */}
                <div className="studio-tabs">
                    <button type="button" onClick={() => setActiveTab('builder')} className={`studio-tab ${activeTab === 'builder' ? 'studio-tab--active-builder' : 'studio-tab--inactive'}`}>Builder</button>
                    <button type="button" onClick={() => setActiveTab('prompt')} className={`studio-tab ${activeTab === 'prompt' ? 'studio-tab--active-prompt' : 'studio-tab--inactive'}`}>Prompt</button>
                </div>

                <div className="p-5 flex-1 space-y-7 overflow-y-auto pb-28">
                    {activeTab === 'builder' ? (<>
                        {/* ── Base Identity Upload ── */}
                        <div className="space-y-3">
                            <div className="studio-badge bg-[#FFD93D]"><span className="w-2 h-2 bg-black rounded-full inline-block" /> Base Identity</div>
                            <div onDragOver={(e) => { e.preventDefault(); setDragOver('person'); }} onDragLeave={() => setDragOver(null)} onDrop={(e) => handleDrop(e, 'person')}
                                className={`relative ${personImage ? 'studio-dropzone--filled' : 'studio-dropzone'} h-28 flex items-center px-5 gap-4 shadow-[4px_4px_0_0_#000] rounded-xl`}
                            >
                                <input type="file" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'person')} accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" />
                                {personImage ? (<>
                                    <div className="relative w-20 h-20 border-[4px] border-black shadow-[4px_4px_0_0_#FF8C69] group overflow-hidden bg-white">
                                        <Image src={personImage} width={80} height={80} unoptimized alt="Person" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    </div>
                                    <div className="flex-1">
                                        <span className="block font-black text-sm uppercase mb-1">Identity Set</span>
                                        <span className="block text-[10px] font-bold uppercase py-0.5 px-2 bg-black text-white w-max">Ready</span>
                                    </div>
                                    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPersonImage(''); setPersonImageBase64(''); }} className="z-20 bg-[var(--kcoral)] hover:bg-black hover:text-white border-[4px] border-black p-2 shadow-[4px_4px_0_0_#000] transition-colors"><X className="w-5 h-5" /></button>
                                </>) : (
                                    <div className="w-full flex-col text-center justify-center items-center gap-1">
                                        <div className="bg-black text-[var(--kcoral)] p-2 rounded-full inline-block border-[2px] border-black shadow-[3px_3px_0_0_rgba(17,17,17,0.3)] mb-2"><User className="w-5 h-5" /></div>
                                        <div className="font-black uppercase text-sm w-full">Upload Face</div>
                                        <div className="font-bold uppercase text-[9px] text-black/50">Optimal: Clear lighting, front facing</div>
                                    </div>
                                )}
                            </div>
                            <label className="flex items-center gap-2 text-[10px] font-bold text-black cursor-pointer ml-1 mt-2">
                                <div className={`w-4 h-4 border-[3px] flex items-center justify-center transition-all ${saveUploadedPersonToProfile ? 'bg-[var(--kcoral)] border-black shadow-[2px_2px_0_0_#000]' : 'border-black bg-white shadow-none'}`}>
                                    {saveUploadedPersonToProfile && <Check className="w-3 h-3 text-black" />}
                                </div>
                                <input type="checkbox" className="hidden" checked={saveUploadedPersonToProfile} onChange={(e) => setSaveUploadedPersonToProfile(e.target.checked)} />
                                SAVE TO IDENTITY VAULT
                            </label>
                        </div>

                        {/* ── Garment Reference ── */}
                        <div className="space-y-3">
                            <div className="studio-badge bg-[#FF8C69] text-black"><span className="w-2 h-2 bg-black rounded-full inline-block" /> Garment Reference</div>
                            <div onDragOver={(e) => { e.preventDefault(); setDragOver('clothing'); }} onDragLeave={() => setDragOver(null)} onDrop={(e) => handleDrop(e, 'clothing')}
                                className={`relative ${clothingImage ? 'studio-dropzone--filled' : 'studio-dropzone'} aspect-[16/9] flex items-center justify-center group shadow-[6px_6px_0_0_#000] rounded-xl overflow-hidden`}
                            >
                                <input type="file" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'clothing')} accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" disabled={!!product} />
                                {clothingImage ? (<>
                                    <Image src={clothingImage} width={400} height={250} unoptimized alt="Clothing" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
                                    {!product && (
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-10">
                                            <span className="bg-white text-black font-black uppercase text-xs px-4 py-2 border-[3px] border-black shadow-[4px_4px_0_0_#000]">Change Garment</span>
                                        </div>
                                    )}
                                    {!product && (
                                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setClothingImage(''); setClothingImageBase64(''); }} className="absolute top-3 right-3 bg-[var(--kcoral)] hover:bg-black hover:text-white border-[4px] border-black p-2 shadow-[4px_4px_0_0_#000] z-20 transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000]">
                                            <X className="w-5 h-5" />
                                        </button>
                                    )}
                                </>) : (
                                    <div className="flex flex-col items-center gap-3 font-black uppercase text-sm group-hover:-translate-y-2 transition-transform duration-300">
                                        <div className="bg-[#FFD93D] p-4 rounded-full border-[3px] border-black shadow-[4px_4px_0_0_rgba(17,17,17,0.2)]"><ShoppingBag className="w-8 h-8 text-black" /></div>
                                        <span>Upload Garment</span>
                                        <p className="text-[9px] font-bold text-black/50 tracking-widest bg-white border-black border-2 px-2 py-1 shadow-[2px_2px_0_0_#FFD93D]">DRAG & DROP</p>
                                    </div>
                                )}
                            </div>
                            {/* Product images */}
                            {productData?.images && productData.images.length > 0 && (
                                <div className="flex gap-2.5 overflow-x-auto pb-3 scrollbar-thin">
                                    {productData.images.map((img: any, idx: number) => {
                                        const url = typeof img === 'string' ? img : img.imagePath
                                        return (
                                            <button type="button" key={idx} onClick={() => handleSelectProductImage(url)} className={`neo-btn flex-shrink-0 w-16 h-16 border-[3px] border-black bg-white overflow-hidden transition-all relative ${clothingImage === url ? 'shadow-[3px_3px_0_0_#FF8C69] scale-105' : 'hover:shadow-[3px_3px_0_0_#000] opacity-80 hover:opacity-100'}`}>
                                                <Image src={url} width={80} height={80} unoptimized alt="Style" className="w-full h-full object-cover" />
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* ── Background (conditional) ── */}
                        {editType === 'background_change' && (
                            <div className="space-y-3">
                                <div className="studio-badge bg-white"><span className="w-2 h-2 bg-black rounded-full inline-block" /> Background Ref</div>
                                <div className={`relative ${backgroundImage ? 'studio-dropzone--filled' : 'studio-dropzone'} aspect-[16/9] flex items-center justify-center`}>
                                    <input type="file" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'background')} accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" />
                                    {backgroundImage ? (<>
                                        <Image src={backgroundImage} width={400} height={250} unoptimized alt="BG" className="w-full h-full object-cover" />
                                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setBackgroundImage(''); setBackgroundImageBase64(''); }} className="absolute top-2 right-2 bg-[var(--kcoral)] border-[3px] border-black p-1.5 z-20"><X className="w-4 h-4" /></button>
                                    </>) : (
                                        <div className="flex items-center gap-2 font-black uppercase text-xs"><Upload className="w-5 h-5" /> Upload Background</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── Scene & Style Presets ── */}
                        <div className="space-y-3 pt-5 border-t-[4px] border-black">
                            <div className="flex justify-between items-center gap-2">
                                <div className="studio-badge bg-[#FFD93D]"><span className="w-2 h-2 bg-black rounded-full inline-block" /> Scene & Style</div>
                                <select value={presetCategory} onChange={(e) => setPresetCategory(e.target.value)} className="text-[10px] font-black uppercase bg-white border-[3px] border-black py-1.5 px-2 outline-none shadow-[2px_2px_0_0_#000] cursor-pointer hover:bg-gray-50">
                                    <option value="all">ALL</option>
                                    {presetCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            {presetsLoading ? (
                                <div className="text-sm font-black uppercase animate-pulse border-[3px] border-black text-center py-6"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading...</div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    <button type="button" onClick={() => setSelectedPreset('')} className={`studio-preset-card ${selectedPreset === '' ? 'studio-preset-card--selected' : ''}`}>
                                        <div className="relative z-10"><span className="font-black text-xs uppercase">Default</span><br /><span className="text-[9px] font-bold border border-black px-1 bg-white inline-block mt-1">Clothing Only</span></div>
                                    </button>
                                    {presets.filter(p => presetCategory === 'all' || p.category === presetCategory).map(preset => (
                                        <button type="button" key={preset.id} onClick={() => setSelectedPreset(preset.id)} className={`studio-preset-card ${selectedPreset === preset.id ? 'studio-preset-card--selected' : ''}`}>
                                            <div className="relative z-10 w-full">
                                                <div className="text-[8px] font-black uppercase bg-black text-white inline-block px-1 py-0.5 mb-1.5 shadow-[2px_2px_0_0_#FFD93D]">{preset.category}</div>
                                                {preset.faceStability === 'max' && <span className="text-[7px] font-black uppercase bg-[#FFD93D] border border-black px-1 ml-1">FACE MAX</span>}
                                                <div className="font-black text-[11px] uppercase leading-tight line-clamp-2">{preset.name}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ── Aspect Ratio ── */}
                        <div className="space-y-3 pt-5 border-t-[4px] border-black">
                            <div className="studio-badge bg-white">Aspect Ratio</div>
                            <div className="grid grid-cols-3 gap-2">
                                {['1:1', '4:5', '9:16'].map((ratio) => (
                                    <button type="button" key={ratio} onClick={() => setAspectRatio(ratio as any)} className={`neo-btn py-3 border-[3px] border-black font-black text-base uppercase transition-all ${aspectRatio === ratio ? 'bg-[#FFD93D] shadow-[4px_4px_0_0_#000]' : 'bg-white hover:bg-[#F9F8F4] hover:shadow-[3px_3px_0_0_#000]'}`}>
                                        {ratio}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>) : (
                        /* ══════ PROMPT TAB ══════ */
                        <div className="space-y-7 h-full flex flex-col">
                            <div className="space-y-3 flex-1 flex flex-col">
                                <div className="studio-badge bg-white">Custom Prompt</div>
                                <textarea
                                    value={userRequest}
                                    onChange={(e) => setUserRequest(e.target.value)}
                                    placeholder="Describe physical traits, lighting, mood, camera framing... (e.g. 'cinematic lighting, 35mm lens, looking at camera')"
                                    className="flex-1 w-full min-h-[200px] resize-none border-[4px] border-black bg-[#F9F8F4] p-5 font-bold text-base outline-none focus:bg-white focus:shadow-[6px_6px_0_0_#FFD93D] transition-all"
                                />
                            </div>
                            <div className="space-y-3">
                                <div className="studio-badge bg-white">Aspect Ratio</div>
                                <div className="grid grid-cols-3 gap-2">
                                    {['1:1', '4:5', '9:16'].map((ratio) => (
                                        <button type="button" key={ratio} onClick={() => setAspectRatio(ratio as any)} className={`neo-btn py-3 border-[3px] border-black font-black text-base uppercase transition-all ${aspectRatio === ratio ? 'bg-[#FFD93D] shadow-[4px_4px_0_0_#000]' : 'bg-white hover:bg-[#F9F8F4] hover:shadow-[3px_3px_0_0_#000]'}`}>
                                            {ratio}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* Share Modal */}
            {result && <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} imageUrl={result.imageUrl} imageBase64={result.base64Image} productId={productId || undefined} />}
        </div>
    )

}

export default function TryOnPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#FDFBF7] pt-24 flex items-center justify-center">
                <BrutalLoader size="lg" tone="influencer" label="Generating try-on" />
            </div>
        }>
            <TryOnPageContent />
        </Suspense>
    )
}

