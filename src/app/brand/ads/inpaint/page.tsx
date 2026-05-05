'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2, AlertTriangle, RefreshCw } from 'lucide-react'
import { toast } from '@/lib/simple-sonner'
import AdInpaintModal from '@/components/brand/AdInpaintModal'

type InpaintDraft = {
  id: string
  imageUrl?: string
  imageBase64?: string
  preset?: string
}

type SmartEditOptions = {
  referenceImageBase64?: string
  scope?: 'auto' | 'local' | 'subject' | 'full_frame'
  task?: 'auto' | 'hold_product' | 'wear_accessory' | 'pose_change' | 'text_edit' | 'remove_object' | 'stylized_effect' | 'replace_region' | 'add_object' | 'scene_edit' | 'general_edit'
  expansionOverride?: { left: number; top: number; width: number; height: number }
}

export default function BrandAdsInpaintPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const creativeId = searchParams.get('id')
  const presetParam = searchParams.get('preset') || undefined
  const [draft, setDraft] = useState<InpaintDraft | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [isLoadingDraft, setIsLoadingDraft] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    if (!creativeId) {
      setDraft(null)
      setIsLoadingDraft(false)
      return
    }

    let cancelled = false
    setIsLoadingDraft(true)
    setLoadError(null)

    fetch(`/api/ads/creatives/${encodeURIComponent(creativeId)}`, {
      credentials: 'include',
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({ error: 'Failed to load creative' }))
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load creative')
        }

        if (!cancelled) {
          setDraft({
            id: data.id,
            imageUrl: data.imageUrl,
            preset: presetParam,
          })
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setDraft(null)
          const msg = error instanceof Error ? error.message : 'Failed to load creative'
          setLoadError(msg)
          toast.error(msg)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingDraft(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [creativeId, presetParam, reloadKey])

  const imageSrc = useMemo(() => draft?.imageBase64 || draft?.imageUrl || '', [draft])

  const handleApplyInpaint = async (prompt: string, maskBase64: string | undefined, options?: SmartEditOptions) => {
    if (!draft?.imageBase64 && !draft?.imageUrl) {
      toast.error('No creative available for inpaint.')
      return
    }

    setIsApplying(true)
    try {
      const response = await fetch('/api/ads/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          imageBase64: draft.imageBase64,
          imageUrl: draft.imageUrl,
          maskBase64,
          prompt,
          referenceImageBase64: options?.referenceImageBase64,
          scope: options?.scope,
          task: options?.task,
          expansionOverride: options?.expansionOverride,
          sourceAdId: draft.id,
          preset: draft.preset,
        }),
      })

      const data = await response.json().catch(() => ({ error: 'Edit failed', code: 'parse_error' }))
      if (!response.ok) {
        // Map specific error codes to actionable messages so the brand
        // knows whether to retry, rephrase, or wait
        const code = String(data?.code || '')
        let actionableMessage = data?.error || 'Edit failed'
        if (code === 'gemini_timeout') {
          actionableMessage = 'The model took too long to respond. Try a smaller selection or simpler prompt.'
        } else if (code === 'gemini_rate_limit') {
          actionableMessage = `Image service is busy. Wait ${data.retryAfter || 30}s and try again.`
        } else if (code === 'gemini_safety_blocked') {
          actionableMessage = 'Prompt was blocked by safety filters. Try rephrasing without sensitive terms.'
        } else if (code === 'gemini_no_image') {
          actionableMessage = 'Model returned no image. Try a clearer mask or more specific prompt.'
        } else if (code === 'gemini_unavailable') {
          actionableMessage = 'Image generation is temporarily unavailable. Please retry in a minute.'
        }
        throw new Error(actionableMessage)
      }

      const nextDraft: InpaintDraft = {
        id: data.id,
        imageUrl: data.imageUrl,
        imageBase64: data.imageBase64,
        preset: data.preset,
      }

      setDraft(nextDraft)
      const params = new URLSearchParams({ id: data.id })
      if (data.preset) {
        params.set('preset', data.preset)
      }
      router.replace(`/brand/ads/inpaint?${params.toString()}`)

      toast.success('Inpaint edit applied')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Edit failed')
    } finally {
      setIsApplying(false)
    }
  }

  if (isLoadingDraft) {
    return (
      <div className="min-h-screen bg-[#FFF8E6] px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border-[3px] border-black bg-white p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] md:p-6 mb-4 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-black" />
            <div>
              <h1 className="text-base font-black uppercase tracking-wider">Loading inpaint editor</h1>
              <p className="text-xs font-semibold text-black/55">Fetching your creative...</p>
            </div>
          </div>
          <div className="rounded-2xl border-[3px] border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] aspect-[4/5] inpaint-skel" />
          <style jsx>{`
            @keyframes shimmer {
              0% { background-position: -200% 0; }
              100% { background-position: 200% 0; }
            }
            .inpaint-skel {
              background: linear-gradient(90deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.10) 50%, rgba(0,0,0,0.04) 100%);
              background-size: 200% 100%;
              animation: shimmer 1.5s ease-in-out infinite;
            }
          `}</style>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#FFF8E6] px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto max-w-3xl rounded-2xl border-[3px] border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border-2 border-black bg-[#FF8C69] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <AlertTriangle className="h-6 w-6" strokeWidth={3} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black uppercase mb-1">Couldn&apos;t load creative</h1>
              <p className="text-sm font-semibold text-black/65 mb-5">{loadError}</p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={reload}
                  className="inline-flex items-center gap-2 rounded-lg border-[3px] border-black bg-[#B4F056] px-4 py-2.5 text-sm font-black uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all"
                >
                  <RefreshCw className="h-4 w-4" strokeWidth={3} />
                  Retry
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/brand/ads')}
                  className="inline-flex items-center gap-2 rounded-lg border-[3px] border-black bg-white px-4 py-2.5 text-sm font-black uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all"
                >
                  <ArrowLeft className="h-4 w-4" strokeWidth={3} />
                  Back to ads
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!draft) {
    return (
      <div className="min-h-screen bg-[#FFF8E6] px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto max-w-3xl rounded-2xl border-[3px] border-black bg-white p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] md:p-8">
          <h1 className="text-2xl font-black uppercase md:text-3xl">Inpaint</h1>
          <p className="mt-2 text-sm font-semibold text-black/70">
            No creative selected. Generate an ad first, then open Inpaint.
          </p>
          <button
            type="button"
            onClick={() => router.push('/brand/ads')}
            className="mt-6 inline-flex items-center gap-2 rounded-lg border-[3px] border-black bg-[#FFD93D] px-4 py-2.5 text-sm font-black uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back To Ads
          </button>
        </div>
      </div>
    )
  }

  return (
    <AdInpaintModal
      isOpen
      embedded
      imageSrc={imageSrc}
      isSubmitting={isApplying}
      onClose={() => router.push('/brand/ads')}
      onApply={handleApplyInpaint}
    />
  )
}
