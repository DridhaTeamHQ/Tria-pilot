'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useUser } from '@/lib/react-query/hooks'

const PRIMARY_LINKS = [
  { href: '/signup/influencer', label: 'FOR INFLUENCERS' },
  { href: '/register', label: 'PLATFORM' },
  { href: '/signup/brand', label: 'FOR BRANDS' },
]

export default function LandingNav() {
  const [open, setOpen] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<number | null>(null)
  const { data: user, isLoading } = useUser()
  const isAuthenticated = !isLoading && !!user

  return (
    <nav
      aria-label="Main navigation"
      className="fixed left-0 right-0 top-0 z-50 w-full pt-6"
      style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}
    >
      <div className="mx-auto hidden max-w-7xl items-center justify-between gap-4 px-5 lg:flex">
        <div
          className="relative grid flex-1 grid-cols-3 rounded-full border-[4px] border-black bg-white p-1.5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
          onMouseLeave={() => setHoveredItem(null)}
        >
          <div
            className="pointer-events-none absolute inset-y-1.5 left-1.5 w-[calc((100%-0.75rem)/3)] rounded-full border-[3px] border-black bg-[#FFD93D] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 ease-out"
            style={{
              opacity: hoveredItem === null ? 0 : 1,
              transform: `translateX(${(hoveredItem ?? 0) * 100}%)`,
            }}
          />
          {PRIMARY_LINKS.map((link, index) => (
            <Link
              key={link.href}
              href={link.href}
              onMouseEnter={() => setHoveredItem(index)}
              onFocus={() => setHoveredItem(index)}
              className="relative z-10 flex min-h-[44px] items-center justify-center px-4 text-center text-[12px] font-black uppercase tracking-[0.18em] text-black transition-colors hover:text-black"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex shrink-0 items-center rounded-full border-[4px] border-black bg-white p-1.5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <Link
            href={isAuthenticated ? '/dashboard' : '/login'}
            className="inline-flex min-h-[44px] min-w-[120px] items-center justify-center rounded-full bg-black px-8 text-[12px] font-black uppercase tracking-[0.18em] text-white transition-transform hover:-translate-y-0.5 hover:bg-black/90"
          >
            {isAuthenticated ? 'DASHBOARD' : 'LOG IN'}
          </Link>
        </div>
      </div>

      <div className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-full border-[4px] border-black bg-white p-2 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] lg:hidden">
        <Link
          href="/"
          className="ml-4 min-w-0 text-[14px] font-black uppercase tracking-[0.22em] text-black"
        >
          KIWIKOO
        </Link>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href={isAuthenticated ? '/dashboard' : '/login'}
            className="rounded-full border-[3px] border-black bg-[#FFD93D] px-4 py-2 text-[11px] font-black uppercase tracking-[0.15em] text-black transition-transform hover:-translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:text-xs"
          >
            {isAuthenticated ? 'DASHBOARD' : 'LOG IN'}
          </Link>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
            className="mr-1 flex h-9 w-9 shrink-0 flex-col items-center justify-center gap-[4px] rounded-full border-[3px] border-black bg-white transition-colors hover:bg-black/5"
          >
            <span
              className="h-[2px] w-[16px] rounded-full bg-black transition-all duration-300 origin-center"
              style={{ transform: open ? 'rotate(45deg) translateY(5px)' : 'none' }}
            />
            <span
              className="h-[2px] w-[16px] rounded-full bg-black transition-all duration-300"
              style={{ opacity: open ? 0 : 1 }}
            />
            <span
              className="h-[2px] w-[16px] rounded-full bg-black transition-all duration-300 origin-center"
              style={{ transform: open ? 'rotate(-45deg) translateY(-5px)' : 'none' }}
            />
          </button>
        </div>
      </div>

      <div
        className="absolute left-4 right-4 top-[88px] overflow-hidden rounded-3xl border-[4px] border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 lg:hidden"
        style={{ 
          maxHeight: open ? '400px' : '0',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          borderWidth: open ? '4px' : '0px'
        }}
      >
        <div className="flex flex-col p-4 text-[13px] font-black uppercase tracking-widest">
          {PRIMARY_LINKS.map((link, index) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`flex items-center rounded-xl p-4 text-black transition-colors hover:bg-[#F4F4F0]`}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 pt-2">
            <Link
              href={isAuthenticated ? '/dashboard' : '/login'}
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center rounded-2xl border-[3px] border-black bg-black p-4 text-center text-[13px] text-white transition-transform hover:-translate-y-0.5"
            >
              {isAuthenticated ? 'DASHBOARD' : 'LOG IN'}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
