'use client'

/**
 * ONBOARDING CHECKLIST
 *
 * Sticky card on the brand dashboard showing activation progress.
 * Auto-hides itself once all 5 steps are complete (and remembers a
 * manual dismissal via localStorage so brands can hide it earlier).
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  Sparkles,
  X,
  Loader2,
} from 'lucide-react'

interface ChecklistItem {
  id: string
  label: string
  description: string
  done: boolean
  cta: { label: string; href: string }
}

interface OnboardingStatus {
  items: ChecklistItem[]
  completed: number
  total: number
  percent: number
  isFullyOnboarded: boolean
}

const DISMISS_KEY = 'kiwikoo:onboarding-dismissed:v1'

export default function OnboardingChecklist() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === '1') setDismissed(true)
    } catch {
      /* ignore */
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/brand/onboarding-status', { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setStatus(data)
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

  const handleDismiss = () => {
    setDismissed(true)
    try {
      window.localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  if (!hydrated) return null
  if (dismissed) return null
  if (loading) {
    return (
      <div className="bg-white border-[3px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-5 flex items-center gap-3">
        <Loader2 className="w-4 h-4 animate-spin text-black/30" />
        <span className="text-xs font-bold text-black/40">Loading your activation checklist…</span>
      </div>
    )
  }
  if (!status) return null
  if (status.isFullyOnboarded) {
    return (
      <div className="bg-[#B4F056]/30 border-[3px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" strokeWidth={3} />
          <p className="text-sm font-black uppercase tracking-wider">
            You&apos;re fully set up — go run a campaign 🚀
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1.5 hover:bg-black/10 rounded transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" strokeWidth={3} />
        </button>
      </div>
    )
  }

  const nextItem = status.items.find((i) => !i.done)

  return (
    <div className="bg-white border-[3px] border-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#B4F056]/40 to-[#FFD93D]/40 px-5 py-3 border-b-2 border-black flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 flex-shrink-0" strokeWidth={3} />
          <h2 className="text-xs font-black uppercase tracking-widest truncate">
            Get Started Checklist
          </h2>
          <span className="text-[10px] font-black bg-black text-white px-2 py-0.5 rounded">
            {status.completed} / {status.total}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="text-[10px] font-black uppercase tracking-wider px-2 py-1 hover:bg-black/10 rounded transition-colors"
          >
            {collapsed ? 'Expand' : 'Collapse'}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 hover:bg-black/10 rounded transition-colors"
            aria-label="Dismiss"
            title="Dismiss for now"
          >
            <X className="w-3.5 h-3.5" strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-black/5 border-b-2 border-black relative">
        <div
          className="absolute inset-y-0 left-0 bg-[#B4F056] transition-all duration-500"
          style={{ width: `${status.percent}%` }}
        />
      </div>

      {/* Collapsed view: only show next action */}
      {collapsed && nextItem ? (
        <Link
          href={nextItem.cta.href}
          className="block p-4 hover:bg-[#FFD93D]/10 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <Circle className="w-4 h-4 text-black/30 flex-shrink-0" strokeWidth={3} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-black/40">
                Next step
              </p>
              <p className="text-sm font-black truncate">{nextItem.label}</p>
            </div>
            <span className="text-xs font-black uppercase tracking-wider px-3 py-1.5 bg-[#B4F056] border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] group-hover:-translate-y-0.5 transition-all">
              {nextItem.cta.label}
            </span>
          </div>
        </Link>
      ) : (
        <ul className="divide-y-2 divide-black/8">
          {status.items.map((item) => (
            <li key={item.id}>
              {item.done ? (
                <div className="px-5 py-3 flex items-center gap-3 bg-[#B4F056]/15">
                  <CheckCircle2 className="w-5 h-5 text-black flex-shrink-0" strokeWidth={3} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold line-through text-black/55 truncate">
                      {item.label}
                    </p>
                    <p className="text-[11px] text-black/40 font-semibold truncate">
                      {item.description}
                    </p>
                  </div>
                </div>
              ) : (
                <Link
                  href={item.cta.href}
                  className="px-5 py-3 flex items-center gap-3 hover:bg-[#FFD93D]/10 transition-colors group"
                >
                  <Circle className="w-5 h-5 text-black/30 flex-shrink-0 group-hover:text-black transition-colors" strokeWidth={3} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black truncate">{item.label}</p>
                    <p className="text-[11px] text-black/50 font-semibold truncate">
                      {item.description}
                    </p>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-white border-2 border-black hidden sm:inline-flex items-center gap-1 group-hover:bg-[#B4F056] group-hover:-translate-y-0.5 transition-all">
                    {item.cta.label}
                    <ChevronRight className="w-3 h-3" strokeWidth={3} />
                  </span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
