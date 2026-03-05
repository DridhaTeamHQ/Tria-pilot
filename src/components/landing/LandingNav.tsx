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
      <div className="hidden md:flex text-[11px] tracking-widest uppercase font-bold">
        <Link
          href="/register"
          className="flex-1 px-6 py-[18px] border-r border-black/10 hover:text-[#ff8a73] transition-colors flex items-center text-[#111111]"
        >
          FOR CREATORS
        </Link>
        <Link
          href="/marketplace"
          className="flex-1 px-6 py-[18px] border-r border-black/10 hover:text-[#caff33] transition-colors flex items-center justify-center text-[#111111]"
        >
          PLATFORM
        </Link>
        <div className="flex-1 px-6 py-[18px] flex items-center justify-between">
          <Link href="/onboarding/brand" className="hover:text-[#d8b4fe] transition-colors text-[#111111]">
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
      <div className="flex md:hidden items-center justify-between px-5 py-4">
        <Link href="/" className="text-xs font-black tracking-[0.25em] uppercase text-[#111111]">
          KIWIKOO
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href={isAuthenticated ? "/dashboard" : "/login"}
            className="bg-[#111111] text-white px-4 py-2 rounded-full text-[10px] font-bold hover:bg-[#ff8a73] transition-colors"
          >
            {isAuthenticated ? "DASHBOARD" : "LOG IN"}
          </Link>
          <button
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
        className="md:hidden overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? '240px' : '0' }}
      >
        <div className="bg-[#faf9f6] border-t border-black/10 text-[11px] tracking-widest uppercase font-bold">
          <Link
            href="/register"
            onClick={() => setOpen(false)}
            className="flex items-center px-5 py-5 border-b border-black/10 hover:text-[#ff8a73] transition-colors text-[#111111]"
          >
            For Creators
          </Link>
          <Link
            href="/marketplace"
            onClick={() => setOpen(false)}
            className="flex items-center px-5 py-5 border-b border-black/10 hover:text-[#caff33] transition-colors text-[#111111]"
          >
            Platform
          </Link>
          <Link
            href="/onboarding/brand"
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
