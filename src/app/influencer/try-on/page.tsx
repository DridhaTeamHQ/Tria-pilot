'use client'

import './studio.css'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import {
  AlertTriangle,
  Check,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react'
import { useProduct, useUser } from '@/lib/react-query/hooks'
import { safeParseResponse } from '@/lib/api-utils'
import { showErrorToast, showInfoToast, showSuccessToast, showWarningToast } from '@/lib/kiwikoo-toast'
import { BrutalLoader } from '@/components/ui/BrutalLoader'
import { MonaLisaGenerationLoader } from '@/components/ui/MonaLisaGenerationLoader'

const MIN_TRYON_SOURCES = 3
const ASPECT_RATIOS = ['1:1', '4:5', '9:16'] as const
const RESOLUTIONS = ['1K', '2K'] as const
const POLISH_LIMIT = 240

function resolveStoredImageUrl(url?: string | null) {
  if (!url) return ''
  if (url.startsWith('/api/images/proxy')) return url
  try {
    const parsed = new URL(url)
    const isSupabase = (parsed.hostname.endsWith('.supabase.co') || parsed.hostname.endsWith('.supabase.in')) && parsed.pathname.includes('/storage/')
    return isSupabase ? `/api/images/proxy?url=${encodeURIComponent(parsed.toString())}` : url
  } catch {
    return url
  }
}

function toImageSrc(image?: string | null) {
  if (!image) return ''
  if (image.startsWith('data:') || image.startsWith('http://') || image.startsWith('https://')) return image
  return `data:image/jpeg;base64,${image}`
}

function normalizePhoto(raw: any) {
  const id = String(raw?.id ?? '')
  const imageUrl = String(raw?.imageUrl ?? raw?.image_url ?? '')
  if (!id || !imageUrl) return null
  return {
    id,
    imageUrl,
    source: String(raw?.source ?? 'app_upload'),
    status: String(raw?.status ?? 'pending'),
    qualityScore: raw?.qualityScore ?? raw?.quality_score ?? null,
    selectionScore: raw?.selectionScore ?? null,
    analysis: raw?.analysis ?? null,
    approvedForTryOn: Boolean(raw?.approvedForTryOn ?? raw?.approved_for_tryon ?? false),
    rejectionReasons: Array.isArray(raw?.rejectionReasons) ? raw.rejectionReasons : Array.isArray(raw?.rejection_reasons) ? raw.rejection_reasons : [],
    createdAt: String(raw?.createdAt ?? raw?.created_at ?? ''),
    updatedAt: String(raw?.updatedAt ?? raw?.updated_at ?? ''),
    isActive: raw?.isActive ?? raw?.is_active,
  }
}

function dedupeById(items: any[]) {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (!item || !item.id || seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

function getApprovedPhotos(photos: any[]) {
  return photos.filter((photo) => photo.status === 'approved' && photo.isActive !== false)
}

function deriveRecommendations(photos: any[]) {
  const approved = getApprovedPhotos(photos)
    .sort((a, b) => (b.selectionScore ?? b.qualityScore ?? 0) - (a.selectionScore ?? a.qualityScore ?? 0))
  return {
    selected: approved.slice(0, 3),
    alternates: approved.slice(3, 8),
    totalApproved: approved.length,
    isReadyForTryOn: approved.length >= MIN_TRYON_SOURCES,
    minRequired: MIN_TRYON_SOURCES,
    photosNeeded: Math.max(0, MIN_TRYON_SOURCES - approved.length),
  }
}

function normalizeRecommendation(raw: any, photos: any[]) {
  const fallback = deriveRecommendations(photos)
  const selected = dedupeById((Array.isArray(raw?.selected) ? raw.selected : []).map(normalizePhoto).filter(Boolean))
  const alternates = dedupeById((Array.isArray(raw?.alternates) ? raw.alternates : []).map(normalizePhoto).filter(Boolean))
  if (!selected.length && !alternates.length) return fallback
  return {
    selected: selected.length ? selected : fallback.selected,
    alternates: alternates.length ? alternates : fallback.alternates,
    totalApproved: fallback.totalApproved,
    isReadyForTryOn: fallback.isReadyForTryOn,
    minRequired: fallback.minRequired,
    photosNeeded: fallback.photosNeeded,
  }
}

function normalizeResult(raw: any) {
  if (!raw) return { outputs: [] }
  const outputs = Array.isArray(raw.outputs)
    ? raw.outputs
        .map((output: any, index: number) => ({
          referenceImageId: String(output?.referenceImageId ?? output?.reference_image_id ?? ''),
          status: String(output?.status ?? 'completed'),
          imageUrl: String(output?.imageUrl ?? output?.image_url ?? ''),
          base64Image: output?.base64Image ?? output?.base64_image ?? '',
          error: output?.error ? String(output.error) : '',
          label: String(output?.label ?? `Variant ${index + 1}`),
        }))
        .filter((output: any) => output.imageUrl || output.base64Image || output.error)
    : []
  return {
    jobId: raw.jobId ?? raw.job_id ?? '',
    status: raw.status ?? '',
    imageUrl: raw.imageUrl ?? raw.image_url ?? '',
    base64Image: raw.base64Image ?? raw.base64_image ?? '',
    outputs,
    error: raw.error ? String(raw.error) : '',
    output_image_path: raw.output_image_path ?? '',
  }
}

function pickProductImage(product: any, selected: string) {
  if (selected) return selected
  if (product?.tryOnImage) return product.tryOnImage
  const first = product?.images?.[0]
  if (!first) return ''
  if (typeof first === 'string') return first
  return first.imagePath ?? first.imageUrl ?? first.image_url ?? first.path ?? ''
}

export default function TryOnPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FDFBF7] pt-24 flex items-center justify-center"><BrutalLoader size="lg" tone="influencer" label="Loading try-on studio" /></div>}>
      <TryOnPageContent />
    </Suspense>
  )
}

function TryOnPageContent() {
  const { data: user } = useUser()
  const searchParams = useSearchParams()
  const productId = searchParams.get('productId')
  const { data: productData, isLoading: productLoading } = useProduct(productId)

  const [photos, setPhotos] = useState<any[]>([])
  const [recommendations, setRecommendations] = useState<any | null>(null)
  const [loadingLibrary, setLoadingLibrary] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [archivingId, setArchivingId] = useState('')
  const [selectedReferenceIds, setSelectedReferenceIds] = useState<string[]>([])
  const [activeSlot, setActiveSlot] = useState(0)
  const [selectedGarmentImage, setSelectedGarmentImage] = useState('')
  const [polishNotes, setPolishNotes] = useState('')
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '9:16'>('4:5')
  const [resolution, setResolution] = useState<'1K' | '2K'>('2K')
  const [submitting, setSubmitting] = useState(false)
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0)
  const [activeJobId, setActiveJobId] = useState('')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [result, setResult] = useState<any | null>(null)
  const [selectedOutputIndex, setSelectedOutputIndex] = useState(0)
  const [garmentIntel, setGarmentIntel] = useState<any | null>(null)
  const [loadingRecommend, setLoadingRecommend] = useState(false)
  const [selectionMode, setSelectionMode] = useState<'auto' | 'manual'>('auto')
  const photosRef = useRef<any[]>([])
  const generateInFlightRef = useRef(false)
  const pollAttemptRef = useRef(0)
  const pollCooldownUntilRef = useRef(0)

  const photoMap = useMemo(() => new Map(photos.map((photo) => [photo.id, photo])), [photos])
  const approvedPhotos = useMemo(() => getApprovedPhotos(photos), [photos])
  const recommendationPhotoKey = useMemo(
    () => photos.map((photo) => `${photo.id}:${photo.status}:${photo.isActive !== false}`).join('|'),
    [photos]
  )
  const derivedRecommendations = useMemo(() => deriveRecommendations(photos), [photos])
  const currentRecommendations = recommendations ?? derivedRecommendations
  const candidatePhotos = useMemo(
    () => dedupeById([...currentRecommendations.selected, ...currentRecommendations.alternates, ...approvedPhotos]),
    [approvedPhotos, currentRecommendations.alternates, currentRecommendations.selected]
  )
  const defaultSelectedReferenceIds = useMemo(
    () =>
      (currentRecommendations.selected.length ? currentRecommendations.selected : approvedPhotos)
        .slice(0, 3)
        .map((photo: any) => photo.id)
        .filter(Boolean),
    [approvedPhotos, currentRecommendations.selected]
  )
  const selectedPhotos = selectedReferenceIds.map((id) => photoMap.get(id)).filter(Boolean)
  const selectedProductImage = pickProductImage(productData, selectedGarmentImage)
  const outputs = useMemo(() => {
    if (!result) return []
    if (Array.isArray(result.outputs) && result.outputs.length) return result.outputs
    if (result.imageUrl || result.base64Image || result.output_image_path) {
      return [
        {
          referenceImageId: selectedReferenceIds[0] ?? '',
          status: result.status ?? 'completed',
          imageUrl: result.imageUrl || result.output_image_path || '',
          base64Image: result.base64Image,
          error: result.error || '',
          label: 'Result',
        },
      ]
    }
    return []
  }, [result, selectedReferenceIds])
  const selectedOutput = outputs[selectedOutputIndex] ?? outputs[0] ?? null
  const hasCompleteSelection = selectedReferenceIds.filter(Boolean).length === 3 && selectedPhotos.length === 3
  const hasManualSelection = selectionMode === 'manual' && hasCompleteSelection
  const readyForTryOn = currentRecommendations.totalApproved >= currentRecommendations.minRequired
  const isGenerating = submitting || Boolean(activeJobId)
  const visibleCandidatePhotos = candidatePhotos.slice(0, 8)
  const generationLabel = hasManualSelection ? 'Generate with chosen sources' : 'Generate with AI-picked sources'
  const generationHint = hasManualSelection
    ? 'You are locking the three visible source slots for this run.'
    : 'AI will keep re-ranking approved photos for this garment before each run.'

  const loadLibrary = useCallback(async () => {
    setLoadingLibrary(true)
    try {
      const libRes = await fetch('/api/reference-photos', { cache: 'no-store', credentials: 'include' })
      const libData = await safeParseResponse<any>(libRes, 'reference photos')
      const nextPhotos = Array.isArray(libData?.photos) ? libData.photos.map(normalizePhoto).filter(Boolean) : []
      setPhotos(nextPhotos)
      try {
        const recRes = await fetch('/api/reference-photos/recommendations', { cache: 'no-store', credentials: 'include' })
        if (recRes.ok) {
          const recData = await safeParseResponse<any>(recRes, 'reference photo recommendations')
          setRecommendations(normalizeRecommendation(recData, nextPhotos))
        } else {
          setRecommendations(deriveRecommendations(nextPhotos))
        }
      } catch {
        setRecommendations(deriveRecommendations(nextPhotos))
      }
    } catch (error) {
      console.error('[try-on] library load failed:', error)
      showErrorToast('Library unavailable', 'We could not load your reference photo library.')
      setPhotos([])
      setRecommendations(deriveRecommendations([]))
    } finally {
      setLoadingLibrary(false)
    }
  }, [])

  useEffect(() => {
    void loadLibrary()
  }, [loadLibrary])

  /* useEffect(() => {
    if (true) return
    return
    if (!ids.length) return // Don't set empty array — would loop
    setSelectedReferenceIds(ids)
  }, [approvedPhotos, currentRecommendations.selected, selectedReferenceIds.length]) */

  useEffect(() => {
    if (!defaultSelectedReferenceIds.length) return

    setSelectedReferenceIds((previousIds) => {
      if (previousIds.length > 0) return previousIds
      if (
        previousIds.length === defaultSelectedReferenceIds.length &&
        previousIds.every((id, index) => id === defaultSelectedReferenceIds[index])
      ) {
        return previousIds
      }
      return defaultSelectedReferenceIds
    })
  }, [defaultSelectedReferenceIds])

  useEffect(() => {
    if (!activeJobId) return
    setElapsedSeconds(0)
    const timer = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [activeJobId])

  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  useEffect(() => {
    if (retryAfterSeconds <= 0) return
    const timer = setInterval(() => setRetryAfterSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(timer)
  }, [retryAfterSeconds])

  // Garment-aware recommendation: when product image changes, re-rank photos
  useEffect(() => {
    const currentPhotos = photosRef.current
    if (!selectedProductImage || !currentPhotos.length) return
    let cancelled = false
    const fetchRecommendations = async () => {
      setLoadingRecommend(true)
      try {
        const isBase64 = selectedProductImage.startsWith('data:image/')
        const body: Record<string, string> = {}
        if (isBase64) {
          body.garmentBase64 = selectedProductImage
        } else {
          body.garmentImageUrl = selectedProductImage
        }
        const res = await fetch('/api/tryon/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error('Recommend API failed')
        const data = await res.json()
        if (cancelled) return

        setGarmentIntel(data.garmentIntel ?? null)

        // Update photo selection scores from garment recommendations
        let nextPhotos = currentPhotos
        if (Array.isArray(data.recommendations) && data.recommendations.length) {
          const scoreMap = new Map(data.recommendations.map((r: any) => [r.id, r]))
          nextPhotos = currentPhotos.map((photo) => {
            const rec = scoreMap.get(photo.id) as any
            if (rec) {
              return { ...photo, selectionScore: rec.score / 100, garmentSuitability: rec.suitability, garmentReasoning: rec.reasoning }
            }
            return photo
          })
          setPhotos(nextPhotos)
        }

        const nextPhotoMap = new Map(nextPhotos.map((photo) => [photo.id, photo]))
        const approvedRankablePhotos = getApprovedPhotos(nextPhotos)
        const rankedCandidatePhotos = Array.isArray(data.recommendations)
          ? dedupeById(
              data.recommendations
                .map((recommendation: any) => nextPhotoMap.get(String(recommendation?.id ?? '')))
                .filter(Boolean)
            )
          : []
        const rankedPhotos = rankedCandidatePhotos.length
          ? rankedCandidatePhotos
          : approvedRankablePhotos
              .slice()
              .sort((left, right) => (right.selectionScore ?? right.qualityScore ?? 0) - (left.selectionScore ?? left.qualityScore ?? 0))

        setRecommendations({
          selected: rankedPhotos.slice(0, 3),
          alternates: rankedPhotos.slice(3, 8),
          totalApproved: approvedRankablePhotos.length,
          isReadyForTryOn: approvedRankablePhotos.length >= MIN_TRYON_SOURCES,
          minRequired: MIN_TRYON_SOURCES,
          photosNeeded: Math.max(0, MIN_TRYON_SOURCES - approvedRankablePhotos.length),
        })

        if (Array.isArray(data.top3) && data.top3.length >= 3) {
          setSelectedReferenceIds(data.top3.slice(0, 3))
          setSelectionMode('auto')
        } else if (rankedPhotos.length >= 3) {
          setSelectedReferenceIds(rankedPhotos.slice(0, 3).map((photo: any) => photo.id))
          setSelectionMode('auto')
        }
      } catch (err) {
        console.warn('[try-on] garment recommendation failed:', err)
      } finally {
        if (!cancelled) setLoadingRecommend(false)
      }
    }
    void fetchRecommendations()
    return () => { cancelled = true }
  }, [recommendationPhotoKey, selectedProductImage])

  const refreshAll = useCallback(async () => {
    await loadLibrary()
  }, [loadLibrary])

  const pollTryOnJob = useCallback(async (jobId: string) => {
    const startedAt = Date.now()
    const timeoutMs = 10 * 60 * 1000
    while (Date.now() - startedAt < timeoutMs) {
      const now = Date.now()
      if (pollCooldownUntilRef.current > now) {
        await new Promise((resolve) => setTimeout(resolve, pollCooldownUntilRef.current - now))
      }
      try {
        const res = await fetch(`/api/tryon/jobs/${jobId}`, { cache: 'no-store', credentials: 'include' })
        const data = normalizeResult(await safeParseResponse<any>(res, 'try-on job polling'))
        pollAttemptRef.current += 1
        if (data.status === 'pending' || data.status === 'processing') {
          await new Promise((resolve) => setTimeout(resolve, Math.min(12000, 2500 + Math.floor(pollAttemptRef.current / 3) * 1000)))
          continue
        }
        return data
      } catch (error) {
        const structured = error as Error & { status?: number; retryAfterSeconds?: number }
        if (structured.status !== 429 && structured.status !== 503) throw error
        const retrySeconds = Math.max(1, Number(structured.retryAfterSeconds ?? (structured.status === 503 ? 12 : 8)))
        pollCooldownUntilRef.current = Date.now() + retrySeconds * 1000
        setRetryAfterSeconds((s) => Math.max(s, retrySeconds))
        await new Promise((resolve) => setTimeout(resolve, Math.min(retrySeconds * 1000, timeoutMs - (Date.now() - startedAt))))
      }
    }
    throw new Error('Generation is taking longer than expected. Please check your generation history.')
  }, [])

  const updateSelectedSlot = useCallback((slot: number, photoId: string) => {
    setSelectedReferenceIds((prev) => {
      const next = [...prev]
      while (next.length < 3) next.push('')
      const otherIndex = next.findIndex((id, index) => index !== slot && id === photoId)
      const previous = next[slot]
      next[slot] = photoId
      if (otherIndex >= 0) next[otherIndex] = previous || ''
      return next
    })
    setSelectionMode('manual')
    setActiveSlot(slot)
  }, [])

  const uploadReferencePhoto = useCallback(async (file: File) => {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/reference-photos', { method: 'POST', body: form, credentials: 'include' })
      const data = await safeParseResponse<any>(res, 'reference photo upload')
      showSuccessToast('Photo uploaded', data?.message || 'Your reference photo is being analyzed.')
      await refreshAll()
    } catch (error) {
      showErrorToast('Upload failed', error instanceof Error ? error.message : 'Failed to upload photo.')
    } finally {
      setUploading(false)
    }
  }, [refreshAll])

  const archivePhoto = useCallback(async (photoId: string) => {
    if (!window.confirm('Archive this reference photo?')) return
    setArchivingId(photoId)
    try {
      const res = await fetch(`/api/reference-photos?id=${encodeURIComponent(photoId)}`, { method: 'DELETE', credentials: 'include' })
      await safeParseResponse(res, 'reference photo archive')
      showInfoToast('Photo archived', 'The photo was removed from your active library.')
      setSelectedReferenceIds((prev) => prev.map((id) => (id === photoId ? '' : id)))
      await refreshAll()
    } catch (error) {
      showErrorToast('Archive failed', error instanceof Error ? error.message : 'Failed to archive photo.')
    } finally {
      setArchivingId('')
    }
  }, [refreshAll])

  const submitTryOn = useCallback(async () => {
    if (!currentRecommendations.isReadyForTryOn) {
      showWarningToast('More library photos needed', `${currentRecommendations.photosNeeded} more approved photo${currentRecommendations.photosNeeded === 1 ? '' : 's'} are required before try-on is enabled.`)
      return
    }
    if (!productId && !selectedProductImage) {
      showWarningToast('Choose a garment', 'Open the page from a product or choose a product image first.')
      return
    }

    const sourceIds = selectedReferenceIds.filter(Boolean)
    const useAutoSelect = selectionMode === 'auto' || sourceIds.length !== 3
    const isGarmentBase64 = Boolean(selectedProductImage?.startsWith('data:image/'))

    const payload: Record<string, unknown> = {
      productId: productId || undefined,
      clothingImage: isGarmentBase64 ? selectedProductImage : undefined,
      garmentImageUrl: !isGarmentBase64 ? (selectedProductImage || undefined) : undefined,
      polishNotes: polishNotes.trim() || undefined,
      aspectRatio,
      resolution,
      model: 'production',
    }

    if (useAutoSelect) {
      payload.autoSelect = true
    } else {
      payload.selectedReferenceImageIds = sourceIds
    }

    generateInFlightRef.current = true
    setSubmitting(true)
    setRetryAfterSeconds(0)
    setResult(null)

    try {
      const res = await fetch('/api/tryon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const data = normalizeResult(await safeParseResponse<any>(res, 'try-on generation'))

      // If the API returned which photos were auto-selected, update our state
      if (useAutoSelect && Array.isArray((data as any).selectedPhotoIds)) {
        setSelectedReferenceIds((data as any).selectedPhotoIds.slice(0, 3))
        setSelectionMode('auto')
      }

      if (data.jobId && (data.status === 'pending' || data.status === 'processing')) {
        setActiveJobId(String(data.jobId))
        const finalJob = await pollTryOnJob(String(data.jobId))
        setResult(finalJob)
        setSelectedOutputIndex(0)
        showSuccessToast('Try-on ready', 'Your new try-on is finished.')
      } else if (data.jobId && !data.outputs?.length && !data.imageUrl && !data.base64Image) {
        setActiveJobId(String(data.jobId))
        const finalJob = await pollTryOnJob(String(data.jobId))
        setResult(finalJob)
        setSelectedOutputIndex(0)
        showSuccessToast('Try-on ready', 'Your new try-on is finished.')
      } else {
        setResult(data)
        setSelectedOutputIndex(0)
        showSuccessToast('Try-on ready', 'We generated your three try-on images.')
      }
    } catch (error) {
      const structured = error as Error & { retryAfterSeconds?: number }
      if (structured.retryAfterSeconds) setRetryAfterSeconds(structured.retryAfterSeconds)
      showErrorToast('Try-on failed', error instanceof Error ? error.message : 'Generation failed.')
    } finally {
      setSubmitting(false)
      setActiveJobId('')
      generateInFlightRef.current = false
    }
  }, [aspectRatio, currentRecommendations.isReadyForTryOn, currentRecommendations.photosNeeded, pollTryOnJob, polishNotes, productId, resolution, selectedProductImage, selectedReferenceIds, selectionMode])

  const downloadCurrent = useCallback(() => {
    if (!selectedOutput?.imageUrl && !selectedOutput?.base64Image) return
    const a = document.createElement('a')
    a.href = selectedOutput.imageUrl ? resolveStoredImageUrl(selectedOutput.imageUrl) : toImageSrc(selectedOutput.base64Image)
    a.download = 'try-on.png'
    a.click()
  }, [selectedOutput])

  return (
    <div className="min-h-screen bg-[#F6F1E8] pt-20 text-black lg:pt-24">
      <div className="mx-auto max-w-[1480px] px-4 pb-10 lg:px-6">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-black/50">Influencer try-on studio</p>
            <h1 className="mt-2 text-3xl font-black uppercase tracking-tight sm:text-4xl xl:text-5xl">Library-first try-on</h1>
            <p className="mt-2 text-sm font-semibold text-black/70">
              Upload sources, let AI choose the best three, and override only when you want more control.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[560px]">
            <div className="rounded-2xl border-[3px] border-black bg-white px-4 py-3 shadow-[5px_5px_0_0_#000]">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-black/50">Approved sources</div>
              <div className="mt-1 text-lg font-black">{loadingLibrary ? 'Checking...' : `${currentRecommendations.totalApproved}/${currentRecommendations.minRequired}`}</div>
              <div className="text-xs font-semibold text-black/60">
                {readyForTryOn ? 'Enough photos for AI picks' : `${currentRecommendations.photosNeeded} more needed`}
              </div>
            </div>
            <div className="rounded-2xl border-[3px] border-black bg-white px-4 py-3 shadow-[5px_5px_0_0_#000]">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-black/50">Selection mode</div>
              <div className="mt-1 text-lg font-black">{selectionMode === 'manual' ? 'Manual override' : 'AI auto-pick'}</div>
              <div className="text-xs font-semibold text-black/60">{selectedPhotos.length}/3 slots filled</div>
            </div>
            <div className="rounded-2xl border-[3px] border-black bg-white px-4 py-3 shadow-[5px_5px_0_0_#000]">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-black/50">Run status</div>
              <div className="mt-1 text-lg font-black">{isGenerating ? `Generating ${elapsedSeconds}s` : outputs.length ? `${outputs.length} ready` : 'Ready to run'}</div>
              <div className="text-xs font-semibold text-black/60">{retryAfterSeconds > 0 ? `Retry after ${retryAfterSeconds}s` : 'One source at a time for better fidelity'}</div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)]">
          <section className="space-y-4 lg:row-span-2 lg:sticky lg:top-[96px] lg:self-start">
            <div className="rounded-[28px] border-[4px] border-black bg-white p-5 shadow-[8px_8px_0_0_#000]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.25em] text-black/50">Reference library</div>
                  <h2 className="mt-1 text-2xl font-black uppercase">Upload and manage source photos</h2>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border-[3px] border-black bg-[#FFD93D] px-4 py-2 text-sm font-black uppercase shadow-[4px_4px_0_0_#000]">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Add photo
                  <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ''; if (file) void uploadReferencePhoto(file) }} />
                </label>
              </div>
              <p className="mt-3 text-sm text-black/60">Use clear source photos. Any approved library photo can now be AI-ranked for garment fit and face fidelity.</p>
              <div className="mt-4 grid max-h-[420px] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                {!photos.length && !loadingLibrary ? <div className="col-span-full rounded-2xl border-2 border-dashed border-black/20 bg-[#F9F8F4] p-6 text-center text-sm font-semibold text-black/60">No source photos yet. Upload at least three approved photos to unlock AI try-on selection.</div> : null}
                {photos.map((photo) => (
                  <div key={photo.id} className="group relative overflow-hidden rounded-2xl border-[3px] border-black bg-[#F9F8F4] shadow-[4px_4px_0_0_#000]">
                    <div className="relative aspect-[4/5]">
                      <Image src={resolveStoredImageUrl(photo.imageUrl)} alt="Reference photo" fill unoptimized className="object-cover" />
                      <div className="absolute left-2 top-2 rounded-full border-2 border-black bg-white px-2 py-0.5 text-[10px] font-black uppercase">{photo.status}</div>
                      {photo.status === 'approved' ? <div className="absolute right-2 top-2 rounded-full border-2 border-black bg-[#9CFF6B] px-2 py-0.5 text-[10px] font-black uppercase">approved</div> : null}
                      <button type="button" onClick={() => void archivePhoto(photo.id)} disabled={archivingId === photo.id} className="absolute bottom-2 right-2 rounded-full border-2 border-black bg-white p-2 text-black shadow-[2px_2px_0_0_#000] transition hover:bg-[#FF8C69]">{archivingId === photo.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}</button>
                    </div>
                    <div className="space-y-1 p-3">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50">{String(photo.source).replace('_', ' ')}</div>
                      <div className="text-xs font-semibold text-black/70">{photo.status === 'approved' ? 'Eligible for AI recommendations' : photo.rejectionReasons[0] || 'Waiting for analysis'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border-[4px] border-black bg-white p-5 shadow-[8px_8px_0_0_#000]">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black uppercase">Recommended sources</h2>
                <button type="button" onClick={() => void refreshAll()} className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-[#F9F8F4] px-3 py-2 text-xs font-black uppercase shadow-[2px_2px_0_0_#000]"><RefreshCw className="h-3.5 w-3.5" />{loadingRecommend ? 'Analyzing...' : 'Refresh'}</button>
              </div>
              {garmentIntel ? (
                <div className="mt-3 rounded-2xl border-2 border-black bg-[#E8F5E9] p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50">Garment intelligence</div>
                  <div className="mt-1 text-sm font-bold">{garmentIntel.description || `${garmentIntel.type} (${garmentIntel.coverage})`}</div>
                  {garmentIntel.coverage === 'upper_only' && garmentIntel.bottomWearSuggestion ? (
                    <div className="mt-1 text-xs text-black/60">Will pair with: {garmentIntel.bottomWearSuggestion}</div>
                  ) : null}
                </div>
              ) : null}
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border-2 border-black bg-[#F9F8F4] p-3 text-sm font-semibold">{garmentIntel ? 'Photos ranked for this garment. Click a slot to override.' : 'Select a garment to get AI-ranked photo recommendations.'}</div>
                {[0, 1, 2].map((slot) => {
                  const photo = photoMap.get(selectedReferenceIds[slot] ?? '')
                  const suitability = photo?.garmentSuitability as string | undefined
                  const suitColor = suitability === 'excellent' ? 'bg-[#9CFF6B]' : suitability === 'good' ? 'bg-[#FFD93D]' : suitability === 'fair' ? 'bg-[#FFB74D]' : suitability === 'poor' ? 'bg-[#FF8A80]' : 'bg-[#F9F8F4]'
                  return (
                    <button key={slot} type="button" onClick={() => setActiveSlot(slot)} className={`flex items-center gap-3 rounded-2xl border-[3px] p-3 text-left shadow-[4px_4px_0_0_#000] ${activeSlot === slot ? 'border-[#FF8C69] bg-[#FFF6F0]' : 'border-black bg-white'}`}>
                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border-2 border-black bg-[#F9F8F4]">{photo ? <Image src={resolveStoredImageUrl(photo.imageUrl)} alt={`Slot ${slot + 1}`} width={64} height={64} unoptimized className="h-full w-full object-cover" /> : <ImageIcon className="h-6 w-6 text-black/40" />}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-black/50">Source {slot + 1}</div>
                        <div className="truncate text-sm font-bold">{photo ? `Photo ${photo.id.slice(0, 8)}` : 'Pick a source photo'}</div>
                        <div className="flex items-center gap-2 text-xs text-black/60">
                          {photo?.selectionScore != null ? (
                            <>
                              <span className={`rounded-full border border-black/20 px-2 py-0.5 text-[10px] font-black uppercase ${suitColor}`}>{suitability || 'scored'}</span>
                              <span>Score {Math.round((photo.selectionScore || 0) * 100)}/100</span>
                            </>
                          ) : 'No selection yet'}
                        </div>
                        {photo?.garmentReasoning ? <div className="mt-0.5 truncate text-[10px] text-black/40">{photo.garmentReasoning}</div> : null}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-[28px] border-[4px] border-black bg-white p-5 shadow-[8px_8px_0_0_#000]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.25em] text-black/50">Selected garment</div>
                  <h2 className="mt-1 text-2xl font-black uppercase">{productLoading ? 'Loading product...' : productData?.name || 'No product selected'}</h2>
                </div>
                {productId ? <div className="rounded-full border-2 border-black bg-[#FFD93D] px-3 py-1 text-[10px] font-black uppercase">Product mode</div> : null}
              </div>
              {productData?.brand?.companyName ? <div className="mt-2 text-sm font-semibold text-black/70">{productData.brand.companyName}</div> : null}
              {productId ? (
                <div className="mt-4 rounded-2xl border-2 border-black bg-[#F9F8F4] p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50">Product images</div>
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {(productData?.images ?? []).map((image: any, index: number) => {
                      const imageUrl = typeof image === 'string' ? image : image.imagePath ?? image.imageUrl ?? image.image_url ?? image.path ?? ''
                      if (!imageUrl) return null
                      const active = selectedProductImage === imageUrl
                      return <button key={`${imageUrl}-${index}`} type="button" onClick={() => setSelectedGarmentImage(imageUrl)} className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 ${active ? 'border-[#FF8C69]' : 'border-black'} bg-white`}><Image src={resolveStoredImageUrl(imageUrl)} alt="Product image" width={64} height={64} unoptimized className="h-full w-full object-cover" /></button>
                    })}
                  </div>
                </div>
              ) : <div className="mt-4 rounded-2xl border-2 border-dashed border-black/20 bg-[#F9F8F4] p-4 text-sm font-semibold text-black/60">Open this page from a product so we can link the try-on to a garment.</div>}

              <div className="mt-5 grid gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-black/50">Polish notes</label>
                  <textarea value={polishNotes} onChange={(event) => setPolishNotes(event.target.value.slice(0, POLISH_LIMIT))} maxLength={POLISH_LIMIT} placeholder="Crop, cleanup, wrinkle handling, color cleanup, light retouching." className="mt-2 min-h-[108px] w-full rounded-2xl border-[3px] border-black bg-[#F9F8F4] p-4 text-sm font-semibold outline-none focus:bg-white" />
                  <div className="mt-1 text-[11px] font-semibold text-black/50">{polishNotes.length}/{POLISH_LIMIT}</div>
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-black/50">Aspect ratio</div>
                  <div className="mt-2 grid grid-cols-3 gap-2">{ASPECT_RATIOS.map((ratio) => <button key={ratio} type="button" onClick={() => setAspectRatio(ratio)} className={`rounded-2xl border-[3px] px-3 py-3 text-sm font-black uppercase shadow-[3px_3px_0_0_#000] ${aspectRatio === ratio ? 'border-black bg-[#FFD93D]' : 'border-black bg-white'}`}>{ratio}</button>)}</div>
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-black/50">Resolution</div>
                  <div className="mt-2 grid grid-cols-2 gap-2">{RESOLUTIONS.map((item) => <button key={item} type="button" onClick={() => setResolution(item)} className={`rounded-2xl border-[3px] px-3 py-3 text-sm font-black uppercase shadow-[3px_3px_0_0_#000] ${resolution === item ? 'border-black bg-[#9CFF6B]' : 'border-black bg-white'}`}>{item}</button>)}</div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border-[4px] border-black bg-white p-5 shadow-[8px_8px_0_0_#000]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.25em] text-black/50">Source chooser</div>
                  <h2 className="mt-1 text-2xl font-black uppercase">Override only if needed</h2>
                </div>
                <div className="rounded-full border-2 border-black bg-[#F9F8F4] px-3 py-1 text-[10px] font-black uppercase">Slot {activeSlot + 1}</div>
              </div>
              <div className="mt-4 grid max-h-[420px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                {visibleCandidatePhotos.map((photo) => {
                  const active = selectedReferenceIds.includes(photo.id)
                  const slotIndex = selectedReferenceIds.findIndex((id) => id === photo.id)
                  return (
                    <button key={photo.id} type="button" onClick={() => updateSelectedSlot(activeSlot, photo.id)} className={`overflow-hidden rounded-2xl border-[3px] text-left shadow-[4px_4px_0_0_#000] ${active ? 'border-[#FF8C69] bg-[#FFF6F0]' : 'border-black bg-white'}`}>
                      <div className="relative aspect-[4/5]">
                        <Image src={resolveStoredImageUrl(photo.imageUrl)} alt="Candidate source" fill unoptimized className="object-cover" />
                        <div className="absolute left-2 top-2 rounded-full border-2 border-black bg-white px-2 py-0.5 text-[10px] font-black uppercase">{active ? `slot ${slotIndex + 1}` : 'candidate'}</div>
                      </div>
                      <div className="space-y-1 p-3">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50">{String(photo.source).replace('_', ' ')}</div>
                        <div className="text-sm font-bold">{photo.status === 'approved' ? 'AI-ranked approved source' : 'Pending review'}</div>
                        <div className="text-xs text-black/60">{photo.selectionScore != null ? `Selection score ${Math.round((photo.selectionScore || 0) * 100)}/100` : 'No score yet'}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-[28px] border-[4px] border-black bg-white p-5 shadow-[8px_8px_0_0_#000]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.25em] text-black/50">Try-on output</div>
                  <h2 className="mt-1 text-2xl font-black uppercase">Three generated variants</h2>
                </div>
                {isGenerating ? <div className="rounded-full border-2 border-black bg-[#FFD93D] px-3 py-1 text-[10px] font-black uppercase">Running {elapsedSeconds}s</div> : null}
              </div>
              {isGenerating ? (
                <div className="mt-4">
                  <MonaLisaGenerationLoader
                    elapsedSeconds={elapsedSeconds}
                    title="Painting your try-on"
                    description="The model is working through one source image at a time so the garment swap stays more stable."
                  />
                </div>
              ) : selectedOutput ? (
                <div className="mt-4 space-y-4">
                  <div className="mx-auto max-w-[760px] overflow-hidden rounded-[24px] border-[4px] border-black bg-[#F9F8F4] shadow-[6px_6px_0_0_#000]">
                    <div className="relative aspect-[4/5]">
                      <Image src={selectedOutput.imageUrl ? resolveStoredImageUrl(selectedOutput.imageUrl) : toImageSrc(selectedOutput.base64Image)} alt="Try-on result" fill unoptimized className="object-cover" />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {outputs.map((output: any, index: number) => (
                      <button key={`${output.referenceImageId || index}-${index}`} type="button" onClick={() => setSelectedOutputIndex(index)} className={`overflow-hidden rounded-2xl border-[3px] text-left shadow-[4px_4px_0_0_#000] ${selectedOutputIndex === index ? 'border-[#FF8C69] bg-[#FFF6F0]' : 'border-black bg-white'}`}>
                        <div className="relative aspect-[4/5]">
                          {output.imageUrl || output.base64Image ? <Image src={output.imageUrl ? resolveStoredImageUrl(output.imageUrl) : toImageSrc(output.base64Image)} alt={`Variant ${index + 1}`} fill unoptimized className="object-cover" /> : <div className="flex h-full items-center justify-center bg-[#F9F8F4]"><AlertTriangle className="h-6 w-6 text-black/40" /></div>}
                        </div>
                        <div className="space-y-1 p-3">
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50">{output.label || `Variant ${index + 1}`}</div>
                          <div className="text-xs font-semibold text-black/60">{output.error || output.status || 'ready'}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={downloadCurrent} className="inline-flex items-center gap-2 rounded-full border-[3px] border-black bg-white px-4 py-2 text-sm font-black uppercase shadow-[4px_4px_0_0_#000]">Download</button>
                  </div>
                </div>
              ) : <div className="mt-4 rounded-[24px] border-2 border-dashed border-black/20 bg-[#F9F8F4] p-6 text-sm font-semibold text-black/65">Select three approved reference photos, choose a garment, add polish notes if needed, then generate three clothing-swap outputs.</div>}
            </div>

            <div className="rounded-[28px] border-[4px] border-black bg-white p-5 shadow-[8px_8px_0_0_#000]">
              <div className={`flex items-center gap-2 rounded-2xl border-2 border-black px-3 py-2 text-sm font-black uppercase ${currentRecommendations.isReadyForTryOn ? 'bg-[#9CFF6B]' : 'bg-[#FFD93D]'}`}>
                {currentRecommendations.isReadyForTryOn ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                {currentRecommendations.isReadyForTryOn ? 'Library ready' : `Need ${currentRecommendations.photosNeeded} more approved photo${currentRecommendations.photosNeeded === 1 ? '' : 's'}`}
              </div>
              <button type="button" onClick={() => void submitTryOn()} disabled={submitting || !readyForTryOn} className={`mt-3 flex w-full items-center justify-center gap-3 rounded-[22px] border-[4px] border-black px-4 py-4 text-base font-black uppercase shadow-[6px_6px_0_0_#000] ${submitting || !readyForTryOn ? 'cursor-not-allowed bg-black/10 text-black/30 shadow-none' : 'bg-[#FFD93D]'}`}>{submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}{submitting ? 'Generating...' : generationLabel}</button>
              {retryAfterSeconds > 0 ? <div className="mt-2 text-center text-sm font-semibold text-black/60">Retry after {retryAfterSeconds}s</div> : null}
              <div className="mt-3 rounded-2xl border-2 border-black bg-[#F9F8F4] p-3 text-xs font-semibold text-black/70">{generationHint}</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
