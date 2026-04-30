'use client'

/**
 * CAPTION GENERATOR
 *
 * Drop-in component for the creator's try-on result screen. Calls
 * /api/influencer/generate-caption with the image URL + product context
 * and renders 3 platform-tailored captions with copy-to-clipboard.
 */

import { useState } from 'react'
import { Wand2, Copy, Check, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { toast } from '@/lib/simple-sonner'

interface CaptionVariant {
  text: string
  hashtags: string[]
}

interface PlatformResult {
  platform: string
  tone: string
  captions: CaptionVariant[]
}

type PlatformKey = 'instagram' | 'tiktok' | 'youtube_shorts' | 'twitter'
type ToneKey = 'casual' | 'aspirational' | 'witty' | 'authentic' | 'bold'

const PLATFORM_LABELS: Record<PlatformKey, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube_shorts: 'YT Shorts',
  twitter: 'Twitter / X',
}

const TONES: ToneKey[] = ['authentic', 'casual', 'aspirational', 'witty', 'bold']

export default function CaptionGenerator({
  imageUrl,
  productName,
  productCategory,
  productDescription,
  niches,
  defaultPlatform = 'instagram',
}: {
  imageUrl?: string
  productName?: string
  productCategory?: string
  productDescription?: string
  niches?: string[]
  defaultPlatform?: PlatformKey
}) {
  const [open, setOpen] = useState(false)
  const [platform, setPlatform] = useState<PlatformKey>(defaultPlatform)
  const [tone, setTone] = useState<ToneKey>('authentic')
  const [results, setResults] = useState<PlatformResult[]>([])
  const [loading, setLoading] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const generate = async () => {
    setLoading(true)
    setResults([])
    try {
      const res = await fetch('/api/influencer/generate-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          imageUrl,
          productName,
          productCategory,
          productDescription,
          niches,
          platforms: [platform],
          tone,
          count: 3,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to generate captions')
      }
      const data = await res.json()
      setResults(data.results || [])
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
          if (results.length === 0) generate()
        }}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#A78BFA] border-[3px] border-black rounded-xl text-sm font-black uppercase tracking-wider text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all"
      >
        <Wand2 className="w-4 h-4" strokeWidth={3} />
        Generate Caption
      </button>
    )
  }

  return (
    <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-xl p-5 mt-4 animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#A78BFA]" strokeWidth={3} />
          <h3 className="text-xs font-black uppercase tracking-widest">AI Caption Generator</h3>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs font-bold text-black/50 hover:text-black"
        >
          Close
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex items-center gap-1 bg-black/5 rounded-lg p-1">
          {(Object.keys(PLATFORM_LABELS) as PlatformKey[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              disabled={loading}
              className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md transition-all ${
                platform === p ? 'bg-black text-white' : 'text-black/60 hover:text-black'
              }`}
            >
              {PLATFORM_LABELS[p]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-black/5 rounded-lg p-1">
          {TONES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTone(t)}
              disabled={loading}
              className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md transition-all ${
                tone === t ? 'bg-[#B4F056] text-black' : 'text-black/60 hover:text-black'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-[#B4F056] border-2 border-black rounded-lg text-[11px] font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 disabled:opacity-50 transition-all"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} strokeWidth={3} />
          {loading ? 'Generating' : 'Regenerate'}
        </button>
      </div>

      {/* Results */}
      {loading && results.length === 0 ? (
        <div className="py-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-black/30" />
        </div>
      ) : results.length === 0 ? (
        <p className="text-center py-8 text-sm font-bold text-black/40">
          Pick your platform and tone above, then click Regenerate.
        </p>
      ) : (
        <div className="space-y-3">
          {results.map((result, ridx) =>
            result.captions.map((cap, cidx) => {
              const fullText = cap.hashtags.length
                ? `${cap.text}\n\n${cap.hashtags.join(' ')}`
                : cap.text
              const key = `${ridx}-${cidx}`
              const copied = copiedKey === key
              return (
                <div key={key} className="border-2 border-black rounded-lg p-3 bg-[#F9F8F4]">
                  <p className="text-sm font-medium text-black/85 leading-relaxed mb-2 whitespace-pre-wrap">
                    {cap.text}
                  </p>
                  {cap.hashtags.length > 0 && (
                    <p className="text-[12px] text-[#A78BFA] font-semibold leading-relaxed mb-3 break-words">
                      {cap.hashtags.join(' ')}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => copy(key, fullText)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-wider transition-all border-2 border-black ${
                      copied ? 'bg-[#B4F056] text-black' : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3" strokeWidth={3} />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" strokeWidth={3} />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              )
            }),
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
      `}</style>
    </div>
  )
}
