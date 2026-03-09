'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
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

const DRAFT_KEY = 'brand_ads_inpaint_draft'

export default function BrandAdsInpaintPage() {
  const router = useRouter()
  const [draft, setDraft] = useState<InpaintDraft | null>(null)
  const [isApplying, setIsApplying] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const raw = window.sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return

    try {
      const parsed = JSON.parse(raw) as InpaintDraft
      if (parsed?.id && (parsed.imageBase64 || parsed.imageUrl)) {
        setDraft(parsed)
      }
    } catch {
      // Ignore corrupt session payload
    }
  }, [])

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

      const data = await response.json().catch(() => ({ error: 'Edit failed' }))
      if (!response.ok) {
        throw new Error(data.error || 'Edit failed')
      }

      const nextDraft: InpaintDraft = {
        id: data.id,
        imageUrl: data.imageUrl,
        imageBase64: data.imageBase64,
        preset: data.preset,
      }

      setDraft(nextDraft)
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(nextDraft))
      }

      toast.success('Inpaint edit applied')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Edit failed')
    } finally {
      setIsApplying(false)
    }
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
