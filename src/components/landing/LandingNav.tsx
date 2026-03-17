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
      className="fixed left-0 right-0 top-0 z-50 w-full border-b border-black/10 bg-[#faf9f6]"
      style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}
    >
      <div className="hidden lg:flex items-center justify-between gap-5 px-6 py-4 xl:px-8">
        <div
          className="relative grid flex-1 grid-cols-3 rounded-[28px] border-[3px] border-black bg-white/88 p-2 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] backdrop-blur-sm"
          onMouseLeave={() => setHoveredItem(null)}
        >
          <div
            className="pointer-events-none absolute inset-y-2 left-2 w-[calc((100%-1rem)/3)] rounded-[20px] border-[3px] border-black bg-[#FFF4DB] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 ease-out"
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
              className="relative z-10 flex min-h-[60px] items-center justify-center px-6 text-center text-[15px] font-black uppercase tracking-[0.18em] text-[#111111]"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex shrink-0 items-center rounded-[28px] border-[3px] border-black bg-white/90 p-2 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <Link
            href={isAuthenticated ? '/dashboard' : '/login'}
            className="inline-flex min-w-[168px] items-center justify-center rounded-[20px] bg-[#111111] px-8 py-4 text-[14px] font-black uppercase tracking-[0.18em] leading-none text-white transition-colors duration-200 hover:bg-[#2a2a2a]"
          >
            {isAuthenticated ? 'DASHBOARD' : 'LOG IN'}
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5 lg:hidden">
        <Link
          href="/"
          className="min-w-0 text-[11px] font-black uppercase tracking-[0.22em] text-[#111111] sm:text-xs sm:tracking-[0.25em]"
        >
          KIWIKOO
        </Link>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href={isAuthenticated ? '/dashboard' : '/login'}
            className="rounded-full bg-[#111111] px-3 py-2.5 text-[11px] font-bold text-white transition-colors hover:bg-[#2a2a2a] sm:px-5 sm:text-xs"
          >
            {isAuthenticated ? 'DASHBOARD' : 'LOG IN'}
          </Link>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
            className="flex h-9 w-9 shrink-0 flex-col items-center justify-center gap-[5px]"
          >
            <span
              className="h-[2px] w-[22px] rounded-full bg-[#111111] transition-all duration-300 origin-center"
              style={{ transform: open ? 'rotate(45deg) translateY(7px)' : 'none' }}
            />
            <span
              className="h-[2px] w-[22px] rounded-full bg-[#111111] transition-all duration-300"
              style={{ opacity: open ? 0 : 1 }}
            />
            <span
              className="h-[2px] w-[22px] rounded-full bg-[#111111] transition-all duration-300 origin-center"
              style={{ transform: open ? 'rotate(-45deg) translateY(-7px)' : 'none' }}
            />
          </button>
        </div>
      </div>

      <div
        className="overflow-hidden transition-all duration-300 lg:hidden"
        style={{ maxHeight: open ? 'calc(100vh - 72px)' : '0' }}
      >
        <div className="max-h-[calc(100vh-72px)] overflow-y-auto border-t border-black/10 bg-[#faf9f6] text-[11px] font-bold uppercase tracking-widest">
          {PRIMARY_LINKS.map((link, index) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`flex items-center px-5 py-5 text-[#111111] ${index < PRIMARY_LINKS.length - 1 ? 'border-b border-black/10' : ''}`}
            >
              {link.label}
            </Link>
          ))}
          <div className="border-t border-black/10 px-5 py-5">
            <Link
              href={isAuthenticated ? '/dashboard' : '/login'}
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center rounded-full bg-[#111111] px-5 py-3 text-center text-xs text-white"
            >
              {isAuthenticated ? 'Dashboard' : 'Log In'}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
