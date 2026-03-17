'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useUser } from '@/lib/react-query/hooks'

export default function LandingNav() {
  const [open, setOpen] = useState(false)
  const { data: user, isLoading } = useUser()
  const isAuthenticated = !isLoading && !!user


  return (
    <nav
      aria-label="Main navigation"
      className="fixed top-0 left-0 right-0 w-full z-50 bg-[#faf9f6] border-b border-black/10"
      style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}
    >
      {/* ─── Desktop 3-col grid ─── */}
      <div className="hidden lg:flex text-[11px] tracking-widest uppercase font-bold">
        <Link
          href="/signup/influencer"
          className="flex-1 px-6 py-[18px] border-r border-black/10 hover:text-[#ff8a73] transition-colors flex items-center text-[#111111]"
        >
          FOR INFLUENCERS
        </Link>
        <Link
          href="/register"
          className="flex-1 px-6 py-[18px] border-r border-black/10 hover:text-[#caff33] transition-colors flex items-center justify-center text-[#111111]"
        >
          PLATFORM
        </Link>
        <div className="flex-1 px-6 py-[18px] flex items-center justify-between">
          <Link href="/signup/brand" className="hover:text-[#d8b4fe] transition-colors text-[#111111]">
            FOR BRANDS
          </Link>
          <Link
            href={isAuthenticated ? "/dashboard" : "/login"}
            className="bg-[#111111] text-white px-4 py-2 rounded-full text-[10px] hover:bg-[#ff8a73] transition-colors leading-none"
          >
            {isAuthenticated ? "DASHBOARD" : "LOG IN"}
          </Link>
        </div>
      </div>

      {/* ─── Mobile single row ─── */}
      <div className="flex lg:hidden items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <Link href="/" className="min-w-0 text-[11px] font-black tracking-[0.22em] uppercase text-[#111111] sm:text-xs sm:tracking-[0.25em]">
          KIWIKOO
        </Link>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href={isAuthenticated ? "/dashboard" : "/login"}
            className="bg-[#111111] text-white px-3 py-2.5 rounded-full text-[11px] font-bold hover:bg-[#ff8a73] transition-colors sm:px-5 sm:text-xs"
          >
            {isAuthenticated ? "DASHBOARD" : "LOG IN"}
          </Link>
          <button type="button"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
            className="w-9 h-9 flex flex-col items-center justify-center gap-[5px] shrink-0"
          >
            <span
              className="w-[22px] h-[2px] bg-[#111111] rounded-full transition-all duration-300 origin-center"
              style={{ transform: open ? 'rotate(45deg) translateY(7px)' : 'none' }}
            />
            <span
              className="w-[22px] h-[2px] bg-[#111111] rounded-full transition-all duration-300"
              style={{ opacity: open ? 0 : 1 }}
            />
            <span
              className="w-[22px] h-[2px] bg-[#111111] rounded-full transition-all duration-300 origin-center"
              style={{ transform: open ? 'rotate(-45deg) translateY(-7px)' : 'none' }}
            />
          </button>
        </div>
      </div>

      {/* ─── Mobile dropdown ─── */}
      <div
        className="lg:hidden overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? 'calc(100vh - 72px)' : '0' }}
      >
        <div className="max-h-[calc(100vh-72px)] overflow-y-auto bg-[#faf9f6] border-t border-black/10 text-[11px] tracking-widest uppercase font-bold">
          <Link
            href="/signup/influencer"
            onClick={() => setOpen(false)}
            className="flex items-center px-5 py-5 border-b border-black/10 hover:text-[#ff8a73] transition-colors text-[#111111]"
          >
            For Influencers
          </Link>
          <Link
            href="/register"
            onClick={() => setOpen(false)}
            className="flex items-center px-5 py-5 border-b border-black/10 hover:text-[#caff33] transition-colors text-[#111111]"
          >
            Platform
          </Link>
          <Link
            href="/signup/brand"
            onClick={() => setOpen(false)}
            className="flex items-center px-5 py-5 hover:text-[#d8b4fe] transition-colors text-[#111111]"
          >
            For Brands
          </Link>
        </div>
      </div>
    </nav>
  )
}
