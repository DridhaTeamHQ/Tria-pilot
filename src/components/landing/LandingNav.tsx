'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useUser } from '@/lib/react-query/hooks'

const PRIMARY_LINKS = [
  { href: '/signup/influencer', label: 'FOR INFLUENCERS' },
  { href: '/register', label: 'PLATFORM' },
  { href: '/signup/brand', label: 'FOR BRANDS' },
]

export default function LandingNav() {
  const [open, setOpen] = useState(false)
  const { data: user, isLoading } = useUser()
  const isAuthenticated = !isLoading && !!user

  return (
    <nav
      aria-label="Main navigation"
      className="fixed left-0 right-0 top-0 z-50 w-full border-b border-black/10 bg-[#faf9f6]/92 backdrop-blur-md"
      style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}
    >
      <div className="mx-auto hidden max-w-7xl items-center gap-6 px-5 py-3 lg:flex xl:px-6">
        <Link
          href="/"
          className="shrink-0 text-[28px] font-black tracking-[-0.04em] text-[#111111]"
        >
          Kiwikoo
        </Link>

        <div className="flex min-w-0 flex-1 justify-center">
          <div className="flex items-center gap-2 rounded-full border-[2px] border-black bg-white px-2 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            {PRIMARY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#111111] transition-colors duration-200 hover:bg-[#FFF4DB]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Link
            href={isAuthenticated ? '/dashboard' : '/login'}
            className="inline-flex min-w-[120px] items-center justify-center rounded-full border-[2px] border-black bg-white px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#111111] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-colors duration-200 hover:bg-[#f2efe8]"
          >
            {isAuthenticated ? 'Dashboard' : 'Log In'}
          </Link>
          {!isAuthenticated && (
            <Link
              href="/register"
              className="inline-flex min-w-[148px] items-center justify-center gap-2 rounded-full border-[2px] border-black bg-[#B4F056] px-6 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#111111] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-colors duration-200 hover:bg-[#c5f76e]"
            >
              Get Started
              <ArrowRight className="h-4 w-4" strokeWidth={3} />
            </Link>
          )}
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
            className="rounded-full border-[2px] border-black bg-white px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#111111] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-colors hover:bg-[#f2efe8] sm:px-4 sm:text-xs"
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
              className={`flex items-center px-5 py-5 text-[#111111] ${
                index < PRIMARY_LINKS.length - 1 ? 'border-b border-black/10' : ''
              }`}
            >
              {link.label}
            </Link>
          ))}
          {!isAuthenticated && (
            <div className="border-t border-black/10 px-5 py-5">
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-full border-[2px] border-black bg-[#B4F056] px-5 py-3 text-center text-xs text-[#111111] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                Get Started
                <ArrowRight className="h-4 w-4" strokeWidth={3} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
