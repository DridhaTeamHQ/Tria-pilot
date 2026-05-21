'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Check, X } from 'lucide-react'

interface Props<V> {
  label: string
  anyLabel?: string
  value: V | V[] | null
  onChange: (value: V | V[] | null) => void
  options: { value: V; label: string; hint?: string }[]
  accentColor?: string
  className?: string
  isMulti?: boolean
}

export function FilterDropdown<V extends string | number>(props: Props<V>) {
  const {
    label,
    anyLabel = 'Any',
    value,
    onChange,
    options,
    accentColor,
    className,
    isMulti = false,
  } = props

  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selected = value
  const hasValue = isMulti 
    ? Array.isArray(selected) && selected.length > 0
    : selected !== null && selected !== 'all'

  const handleSelect = (v: V) => {
    if (isMulti) {
      const arr = Array.isArray(selected) ? (selected as V[]) : []
      if (arr.includes(v)) {
        const next = arr.filter((x) => x !== v)
        onChange(next.length ? next : null)
      } else {
        onChange([...arr, v])
      }
    } else {
      onChange(v === selected ? null : v)
      setOpen(false)
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
    setOpen(false)
  }

  const triggerLabel = useMemo(() => {
    if (!hasValue) return anyLabel
    if (isMulti && Array.isArray(selected)) {
      if (selected.length === 1) {
        return options.find((o) => o.value === selected[0])?.label || anyLabel
      }
      return `${selected.length} selected`
    }
    return options.find((o) => o.value === selected)?.label || anyLabel
  }, [hasValue, selected, options, anyLabel, isMulti])

  return (
    <>
      <div className="relative inline-block" ref={containerRef}>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`group relative inline-flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs transition-all duration-300 border-2 ${
            hasValue
              ? 'bg-black border-black text-white shadow-lg shadow-black/20 hover:-translate-y-0.5'
              : 'bg-white border-gray-200 text-black/60 hover:bg-gray-50 hover:border-black/40 hover:text-black hover:-translate-y-0.5 shadow-sm'
          } ${open ? 'ring-4 ring-[#B4F056]/20 border-black' : ''} ${className || ''}`}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          {accentColor && hasValue && (
            <div
              className="w-2 h-2 rounded-full shadow-sm ring-2 ring-white/20"
              style={{ background: accentColor }}
            />
          )}
          <div className="flex flex-col items-start leading-none gap-0.5">
            <span className="text-[9px] font-semibold uppercase tracking-widest opacity-60">{label}</span>
            <span className="text-xs font-semibold tracking-tight">{triggerLabel}</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-500 text-black/40 group-hover:text-black ${open ? 'rotate-180 text-[#B4F056] opacity-100' : ''}`}
            strokeWidth={2}
          />
        </button>

        {open && (
          <div
            className="absolute top-full left-0 mt-2 filter-pop bg-white/95 backdrop-blur-xl border border-gray-100 shadow-2xl shadow-black/10 rounded-2xl overflow-hidden z-[9999]"
            style={{
              minWidth: 220,
            }}
          >
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-black/60">{label}</span>
              {hasValue && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[10px] font-black uppercase tracking-wider text-black/60 hover:text-black transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <ul className="max-h-72 overflow-y-auto py-2 scrollbar-thin">
              {options.map((opt) => {
                const active = isMulti
                  ? Array.isArray(selected) && (selected as V[]).includes(opt.value)
                  : selected === opt.value
                return (
                  <li key={String(opt.value)} className="px-2 py-0.5">
                    <button
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-3 text-left rounded-xl transition-all duration-200 ${
                        active 
                          ? 'bg-[#B4F056] text-black shadow-md shadow-[#B4F056]/20' 
                          : 'hover:bg-gray-50 text-black/80 hover:text-black'
                      }`}
                      role="option"
                      aria-selected={active}
                    >
                      <span className="flex-1 min-w-0">
                        <span className={`block truncate text-xs font-black ${active ? 'text-black' : 'text-black/80'}`}>{opt.label}</span>
                        {opt.hint && (
                          <span className={`block text-[10px] font-bold mt-0.5 truncate ${active ? 'text-black/60' : 'text-black/40'}`}>
                            {opt.hint}
                          </span>
                        )}
                      </span>
                      <div
                        className={`flex-shrink-0 w-5 h-5 rounded-lg border-2 transition-all duration-300 flex items-center justify-center ${
                          active 
                            ? 'bg-black border-black scale-100' 
                            : 'bg-white border-gray-300 scale-95'
                        }`}
                      >
                        {active && <Check className="w-3.5 h-3.5 text-[#B4F056]" strokeWidth={4} />}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

    </>
  )
}


