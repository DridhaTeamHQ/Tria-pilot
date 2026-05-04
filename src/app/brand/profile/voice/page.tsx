/**
 * /brand/profile/voice — Brand voice setup
 *
 * Brand pastes 3-5 of their best past posts/captions. AI extracts a
 * voice fingerprint that conditions every future AI generation
 * (campaign briefs, captions, ad copy, hooks).
 */
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  CheckCircle2,
  Trash2,
  Plus,
  X,
  Mic,
  RefreshCw,
} from 'lucide-react'
import { toast } from '@/lib/simple-sonner'

interface BrandVoice {
  summary: string
  tone: string[]
  vocabulary: { favoredWords: string[]; avoidedWords: string[] }
  sentenceLength: string
  emojiFrequency: string
  preferredEmojis: string[]
  hashtagStyle: string
  hookPatterns: string[]
  punctuationQuirks: string[]
  dos: string[]
  donts: string[]
  exampleLine: string
}

const PLACEHOLDER_SAMPLES = [
  'Paste your best Instagram caption here. The one that got the most engagement, the one that sounds most "you"…',
  'Drop another high-performing post. Reels, carousels, photo posts — anything you wrote and were proud of.',
  'One more. The more variety, the sharper the AI can match your voice.',
]

export default function BrandVoicePage() {
  const [samples, setSamples] = useState<string[]>(['', '', ''])
  const [voice, setVoice] = useState<BrandVoice | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/brand/voice', { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        if (data.voice) setVoice(data.voice)
        if (data.updatedAt) setUpdatedAt(data.updatedAt)
        if (Array.isArray(data.samples) && data.samples.length > 0) {
          setSamples([...data.samples, '', '', ''].slice(0, Math.max(data.samples.length, 3)))
        }
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const updateSample = (idx: number, value: string) => {
    setSamples((prev) => prev.map((s, i) => (i === idx ? value : s)))
  }

  const addSample = () => {
    if (samples.length >= 8) {
      toast.error('Max 8 samples')
      return
    }
    setSamples((prev) => [...prev, ''])
  }

  const removeSample = (idx: number) => {
    if (samples.length <= 1) return
    setSamples((prev) => prev.filter((_, i) => i !== idx))
  }

  const validSamples = samples.map((s) => s.trim()).filter((s) => s.length >= 10)

  const analyze = async () => {
    if (validSamples.length === 0) {
      toast.error('Add at least one sample (10+ characters)')
      return
    }
    setAnalyzing(true)
    try {
      const res = await fetch('/api/brand/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ samples: validSamples }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to extract voice')
      setVoice(data.voice)
      setUpdatedAt(data.updatedAt)
      toast.success('Brand voice locked in 🎤')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const remove = async () => {
    if (!confirm('Remove your saved brand voice? Your samples will also be cleared.')) return
    try {
      const res = await fetch('/api/brand/voice', { method: 'DELETE', credentials: 'include' })
      if (!res.ok) throw new Error('Failed')
      setVoice(null)
      setUpdatedAt(null)
      setSamples(['', '', ''])
      toast.success('Brand voice removed')
    } catch {
      toast.error('Failed to remove voice')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFCF5] pt-24 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-black/30" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FFFCF5] pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/brand/profile"
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-black/60 hover:text-black mb-6"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={3} />
          Back to profile
        </Link>

        {/* Hero */}
        <div className="bg-white border-[3px] border-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] p-6 sm:p-8 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-[#A78BFA] border-2 border-black flex items-center justify-center shadow-[3px_3px_0_0_rgba(0,0,0,1)] flex-shrink-0">
              <Mic className="w-6 h-6" strokeWidth={3} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black mb-1">Brand Voice</h1>
              <p className="text-sm text-black/65 font-semibold leading-relaxed">
                Paste 3-5 of your best past posts or captions. Our AI will lock in your tone, vocabulary,
                and rhythm so every campaign brief, caption, hook, and ad copy sounds like{' '}
                <span className="font-black">your brand</span> — not generic GPT.
              </p>
              {voice && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-[#B4F056]/30 border-2 border-black text-[11px] font-black uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={3} />
                  Voice saved {updatedAt && `· ${new Date(updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Samples editor */}
        <div className="bg-white border-[3px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-black uppercase tracking-widest">Sample Posts</h2>
            <span className="text-[10px] font-black uppercase tracking-widest text-black/45">
              {validSamples.length} valid · max 8
            </span>
          </div>

          <div className="space-y-3">
            {samples.map((sample, idx) => (
              <div key={idx} className="relative">
                <textarea
                  value={sample}
                  onChange={(e) => updateSample(idx, e.target.value)}
                  placeholder={PLACEHOLDER_SAMPLES[idx] || `Sample ${idx + 1}…`}
                  rows={3}
                  maxLength={2000}
                  disabled={analyzing}
                  className="w-full px-4 py-3 pr-10 border-2 border-black text-sm font-medium leading-relaxed bg-white focus:shadow-[3px_3px_0_0_rgba(0,0,0,1)] focus:-translate-y-0.5 outline-none transition-all resize-y placeholder:text-black/30 disabled:opacity-50"
                />
                {samples.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSample(idx)}
                    disabled={analyzing}
                    className="absolute top-2 right-2 p-1 hover:bg-black/5 rounded transition-colors"
                    aria-label="Remove sample"
                  >
                    <X className="w-3.5 h-3.5 text-black/40" />
                  </button>
                )}
                <div className="text-[10px] text-black/35 mt-0.5 text-right font-semibold">
                  {sample.length} / 2000
                </div>
              </div>
            ))}
          </div>

          {samples.length < 8 && (
            <button
              type="button"
              onClick={addSample}
              disabled={analyzing}
              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-black/30 hover:border-black hover:bg-[#FFD93D]/10 text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={3} />
              Add another sample
            </button>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={analyze}
              disabled={analyzing || validSamples.length === 0}
              className="px-5 py-3 bg-[#B4F056] border-2 border-black font-black text-sm uppercase tracking-wider shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none flex items-center gap-2"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing…
                </>
              ) : voice ? (
                <>
                  <RefreshCw className="w-4 h-4" strokeWidth={3} />
                  Re-analyze voice
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" strokeWidth={3} />
                  Lock in my voice
                </>
              )}
            </button>
            {voice && (
              <button
                type="button"
                onClick={remove}
                disabled={analyzing}
                className="px-4 py-3 border-2 border-black font-black text-xs uppercase tracking-wider hover:bg-[#FF8C69]/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={3} />
                Remove
              </button>
            )}
          </div>
        </div>

        {/* Voice fingerprint card */}
        {voice && (
          <div className="bg-white border-[3px] border-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] p-6 voice-enter">
            <h2 className="text-xs font-black uppercase tracking-widest text-black/50 mb-4 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#A78BFA]" strokeWidth={3} />
              Your Voice Fingerprint
            </h2>

            <div className="bg-[#A78BFA]/10 border-2 border-black p-4 mb-5">
              <p className="text-base font-bold leading-relaxed">{voice.summary}</p>
              {voice.exampleLine && (
                <p className="mt-3 text-sm text-black/70 italic font-medium">
                  &ldquo;{voice.exampleLine}&rdquo;
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Section label="Tone">
                <div className="flex flex-wrap gap-1.5">
                  {voice.tone.map((t) => (
                    <span key={t} className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-[#B4F056] border-2 border-black">
                      {t}
                    </span>
                  ))}
                </div>
              </Section>

              <Section label="Style">
                <ul className="text-xs text-black/70 font-bold space-y-1">
                  <li>Sentences: <span className="capitalize">{voice.sentenceLength}</span></li>
                  <li>Emojis: <span className="capitalize">{voice.emojiFrequency}</span> {voice.preferredEmojis.length > 0 && `· ${voice.preferredEmojis.slice(0, 5).join(' ')}`}</li>
                  <li>Hashtags: <span className="capitalize">{voice.hashtagStyle}</span></li>
                </ul>
              </Section>

              {voice.vocabulary.favoredWords.length > 0 && (
                <Section label="Favored words">
                  <div className="flex flex-wrap gap-1.5">
                    {voice.vocabulary.favoredWords.slice(0, 8).map((w) => (
                      <span key={w} className="px-2 py-0.5 text-[10px] font-bold bg-[#FFD93D]/40 border border-black">
                        {w}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {voice.vocabulary.avoidedWords.length > 0 && (
                <Section label="Avoid these">
                  <div className="flex flex-wrap gap-1.5">
                    {voice.vocabulary.avoidedWords.slice(0, 8).map((w) => (
                      <span key={w} className="px-2 py-0.5 text-[10px] font-bold bg-[#FF8C69]/30 border border-black line-through">
                        {w}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {voice.dos.length > 0 && (
                <Section label="Do">
                  <ul className="text-xs text-black/70 font-semibold space-y-1 list-disc list-inside">
                    {voice.dos.slice(0, 5).map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </Section>
              )}

              {voice.donts.length > 0 && (
                <Section label="Don't">
                  <ul className="text-xs text-black/70 font-semibold space-y-1 list-disc list-inside">
                    {voice.donts.slice(0, 5).map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </Section>
              )}
            </div>

            <div className="mt-5 pt-4 border-t-2 border-dashed border-black/15">
              <p className="text-[11px] text-black/50 font-semibold">
                💡 This voice will now condition every campaign brief, caption, hook, ad copy, and creator
                outreach generated by Kiwikoo. Re-analyze any time you refresh your brand voice.
              </p>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes voiceIn {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .voice-enter { animation: voiceIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-black/[0.02] border-2 border-black p-3">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-black/50 mb-2">{label}</h3>
      {children}
    </div>
  )
}
