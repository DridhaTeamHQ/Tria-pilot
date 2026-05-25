'use client'

import { useMemo, useState } from 'react'
import { Wand2, Copy, Check, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { toast } from '@/lib/simple-sonner'

interface CaptionVariant {
  text: string
  hashtags: string[]
}

interface ToneResult {
  platform: string
  tone: string
  captions: CaptionVariant[]
}

type PlatformKey = 'instagram' | 'tiktok' | 'youtube_shorts' | 'twitter'
type ToneKey = 'casual' | 'storytelling' | 'cta_heavy'

const TONE_CARDS: Array<{
  key: ToneKey
  label: string
  description: string
  chipClass: string
}> = [
  {
    key: 'casual',
    label: 'Casual',
    description: 'Natural, friendly, easy to post.',
    chipClass: 'bg-[#B4F056]',
  },
  {
    key: 'storytelling',
    label: 'Storytelling',
    description: 'A little narrative, more personality.',
    chipClass: 'bg-[#A78BFA]',
  },
  {
    key: 'cta_heavy',
    label: 'CTA-heavy',
    description: 'Built to drive clicks and saves.',
    chipClass: 'bg-[#FFD93D]',
  },
]

export default function CaptionGenerator({
  imageUrl,
  imageDataUrl,
  productName,
  productCategory,
  productDescription,
  affiliateLink,
  niches,
  defaultPlatform = 'instagram',
}: {
  imageUrl?: string
  imageDataUrl?: string
  productName?: string
  productCategory?: string
  productDescription?: string
  affiliateLink?: string
  niches?: string[]
  defaultPlatform?: PlatformKey
}) {
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<ToneResult[]>([])
  const [loading, setLoading] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const orderedResults = useMemo(() => {
    const byTone = new Map(results.map((result) => [result.tone, result]))
    return TONE_CARDS.map((card) => ({
      ...card,
      result: byTone.get(card.key),
    }))
  }, [results])

  const generate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/influencer/generate-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          imageUrl,
          imageDataUrl,
          productName,
          productCategory,
          productDescription,
          niches,
          platforms: [defaultPlatform],
          tones: TONE_CARDS.map((card) => card.key),
          count: 1,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to generate captions')
      }
      const data = await res.json()
      setResults(Array.isArray(data.results) ? data.results : [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate captions')
    } finally {
      setLoading(false)
    }
  }

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopiedKey(null), 2000)
    } catch {
      toast.error('Could not copy')
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true)
          if (results.length === 0) void generate()
        }}
        className="inline-flex items-center gap-2 rounded-full border-[3px] border-black bg-[#A78BFA] px-4 py-2.5 text-sm font-black uppercase tracking-wider text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5"
      >
        <Wand2 className="h-4 w-4" strokeWidth={3} />
        Caption That Sells
      </button>
    )
  }

  return (
    <div className="w-full rounded-[24px] border-[4px] border-black bg-white p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#A78BFA]" strokeWidth={3} />
            <h3 className="text-xs font-black uppercase tracking-[0.2em]">Caption That Sells</h3>
          </div>
          <p className="mt-2 text-sm font-semibold text-black/60">
            Three ready-to-post options so the creator can pick a vibe and move fast.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void generate()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full border-[3px] border-black bg-[#B4F056] px-4 py-2 text-[11px] font-black uppercase tracking-wider shadow-[3px_3px_0_0_#000] transition-all hover:-translate-y-0.5 disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} strokeWidth={3} />
            {loading ? 'Refreshing' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs font-bold text-black/50 transition hover:text-black"
          >
            Close
          </button>
        </div>
      </div>

      {loading && results.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-black/30" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {orderedResults.map((card) => {
            const caption = card.result?.captions?.[0]
            const fullText = caption
              ? caption.hashtags.length
                ? `${caption.text}\n\n${caption.hashtags.join(' ')}`
                : caption.text
              : ''
            const copied = copiedKey === card.key
            const combinedText = affiliateLink
              ? `${fullText}\n\nShop here: ${affiliateLink}`
              : fullText

            return (
              <div
                key={card.key}
                className="flex h-full flex-col rounded-[22px] border-[3px] border-black bg-[#F9F8F4] p-4 shadow-[4px_4px_0_0_#000]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className={`inline-flex rounded-full border-2 border-black px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${card.chipClass}`}>
                      {card.label}
                    </div>
                    <p className="mt-2 text-xs font-semibold text-black/55">{card.description}</p>
                  </div>
                </div>

                <div className="mt-4 flex-1 rounded-[18px] border-2 border-black bg-white p-4">
                  {caption ? (
                    <>
                      <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-black/85">
                        {caption.text}
                      </p>
                      {caption.hashtags.length > 0 ? (
                        <p className="mt-3 break-words text-[12px] font-semibold leading-relaxed text-[#7C5DFA]">
                          {caption.hashtags.join(' ')}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-sm font-semibold text-black/40">
                      {loading ? 'Generating this version...' : 'Tap refresh to generate this version again.'}
                    </p>
                  )}
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => void copy(card.key, fullText)}
                    disabled={!caption}
                    className={`inline-flex items-center justify-center gap-2 rounded-full border-[3px] border-black px-4 py-2 text-xs font-black uppercase shadow-[3px_3px_0_0_#000] transition-all ${
                      copied ? 'bg-[#B4F056]' : 'bg-white hover:-translate-y-0.5'
                    } ${caption ? '' : 'cursor-not-allowed opacity-50'}`}
                  >
                    {copied ? <Check className="h-4 w-4" strokeWidth={3} /> : <Copy className="h-4 w-4" strokeWidth={3} />}
                    {copied ? 'Copied' : 'Copy Caption'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void copy(`${card.key}-combo`, combinedText)}
                    disabled={!caption || !affiliateLink}
                    className={`inline-flex items-center justify-center gap-2 rounded-full border-[3px] border-black px-4 py-2 text-xs font-black uppercase shadow-[3px_3px_0_0_#000] transition-all ${
                      copiedKey === `${card.key}-combo` ? 'bg-[#FFD93D]' : 'bg-[#FFF8DB] hover:-translate-y-0.5'
                    } ${caption && affiliateLink ? '' : 'cursor-not-allowed opacity-50'}`}
                  >
                    {copiedKey === `${card.key}-combo` ? <Check className="h-4 w-4" strokeWidth={3} /> : <Copy className="h-4 w-4" strokeWidth={3} />}
                    {copiedKey === `${card.key}-combo` ? 'Copied Both' : 'Copy Both'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
