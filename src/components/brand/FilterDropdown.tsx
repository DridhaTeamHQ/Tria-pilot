'use client'

/**
 * FILTER DROPDOWN
 *
 * Reusable dropdown trigger + popover for filter UIs. Animated open/close,
 * click-outside to close, ESC to close, active state showing the current
 * selection on the trigger button.
 */

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export interface FilterOption<V = string> {
  value: V
  label: string
  hint?: string
}

interface BaseProps<V> {
  label: string
  options: FilterOption<V>[]
  /** "Any" placeholder used when nothing is selected */
  anyLabel?: string
  /** Optional icon before the label inside the trigger */
  accentColor?: string
  className?: string
}

interface SingleProps<V> extends BaseProps<V> {
  multi?: false
  value: V | null | undefined
  onChange: (v: V | null) => void
}

interface MultiProps<V> extends BaseProps<V> {
  multi: true
  value: V[]
  onChange: (v: V[]) => void
}

type Props<V> = SingleProps<V> | MultiProps<V>

export function FilterDropdown<V extends string | number>(props: Props<V>) {
  const { label, options, anyLabel = 'Any', accentColor, className } = props
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ left: number; top: number; width: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Position the popover relative to the trigger
  useEffect(() => {
    if (!open) return
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      const POP_WIDTH = Math.max(rect.width, 220)
      const left = Math.min(rect.left, window.innerWidth - POP_WIDTH - 16)
      setCoords({ left: Math.max(16, left), top: rect.bottom + 8, width: POP_WIDTH })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  // Click outside + ESC to close
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return
      }
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const isMulti = (props as MultiProps<V>).multi === true
  const selected = isMulti ? (props as MultiProps<V>).value : (props as SingleProps<V>).value
  const hasValue = isMulti ? (selected as V[]).length > 0 : selected != null && selected !== ''
  const selectedLabels = isMulti
    ? (selected as V[])
        .map((v) => options.find((o) => o.value === v)?.label)
        .filter(Boolean) as string[]
    : hasValue
      ? [options.find((o) => o.value === selected)?.label || String(selected)]
      : []

  const triggerLabel = hasValue
    ? selectedLabels.length === 1
      ? selectedLabels[0]
      : `${selectedLabels.length} selected`
    : anyLabel

  const handleSelect = (val: V) => {
    if (isMulti) {
      const arr = selected as V[]
      const next = arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]
      ;(props as MultiProps<V>).onChange(next)
    } else {
      const cur = selected
      ;(props as SingleProps<V>).onChange(cur === val ? null : val)
      setOpen(false)
    }
  }

  const handleClear = () => {
    if (isMulti) (props as MultiProps<V>).onChange([])
    else (props as SingleProps<V>).onChange(null)
    setOpen(false)
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`group relative inline-flex items-center gap-2 px-3.5 py-2 border-2 border-black rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200 ${
          hasValue
            ? 'bg-black text-white shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5'
            : 'bg-white text-black/70 hover:bg-[#FFD93D]/30 hover:text-black hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]'
        } ${open ? 'shadow-[3px_3px_0_0_rgba(0,0,0,1)] -translate-y-0.5' : ''} ${className || ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {accentColor && hasValue && (
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: accentColor }}
          />
        )}
        <span className="flex flex-col items-start leading-none">
          <span className="text-[9px] tracking-widest opacity-60 mb-0.5">{label}</span>
          <span className="text-xs">{triggerLabel}</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          strokeWidth={3}
        />
      </button>

      {open && coords && (
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            left: coords.left,
            top: coords.top,
            width: coords.width,
            zIndex: 60,
          }}
          className="filter-pop bg-white border-[3px] border-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] rounded-lg overflow-hidden"
          role="listbox"
        >
          <div className="px-3 py-2 border-b-2 border-black bg-[#F9F8F4] flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
            {hasValue && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[10px] font-black uppercase tracking-wider text-black/50 hover:text-black"
              >
                Clear
              </button>
            )}
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {options.map((opt) => {
              const active = isMulti
                ? (selected as V[]).includes(opt.value)
                : selected === opt.value
              return (
                <li key={String(opt.value)}>
                  <button
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs font-bold transition-colors ${
                      active ? 'bg-[#B4F056]/40' : 'hover:bg-[#FFD93D]/20'
                    }`}
                    role="option"
                    aria-selected={active}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block truncate">{opt.label}</span>
                      {opt.hint && (
                        <span className="block text-[10px] text-black/45 font-semibold mt-0.5 truncate">
                          {opt.hint}
                        </span>
                      )}
                    </span>
                    <span
                      className={`flex-shrink-0 w-5 h-5 border-2 border-black flex items-center justify-center transition-all ${
                        active ? 'bg-[#B4F056] scale-100' : 'bg-white scale-90'
                      } ${isMulti ? 'rounded' : 'rounded-full'}`}
                    >
                      {active && <Check className="w-3 h-3" strokeWidth={3.5} />}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <style jsx global>{`
        @keyframes filterPopIn {
          from {
            opacity: 0;
            transform: translateY(-6px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .filter-pop {
          animation: filterPopIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) both;
          transform-origin: top left;
        }
      `}</style>
    </>
  )
}
