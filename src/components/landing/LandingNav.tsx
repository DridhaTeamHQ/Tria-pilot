'use client'

import Link from 'next/link'
import { useUser } from '@/lib/react-query/hooks'

export default function LandingNav() {
  const { data: user, isLoading } = useUser()
  const isAuthenticated = !isLoading && !!user

  return (
    <nav
      aria-label="Main navigation"
      className="fixed left-0 right-0 top-0 z-50 w-full border-b border-black/10 bg-[#faf9f6]/92 backdrop-blur-md"
      style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-5 lg:px-6">
        <Link
          href="/"
          className="shrink-0 text-[24px] font-black tracking-[-0.04em] text-[#111111] sm:text-[28px]"
        >
          Kiwikoo
        </Link>
        <Link
          href={isAuthenticated ? '/dashboard' : '/login'}
          className="inline-flex min-w-[112px] items-center justify-center rounded-full border-[2px] border-black bg-white px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#111111] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-colors duration-200 hover:bg-[#f2efe8] sm:min-w-[124px] sm:px-5 sm:py-3"
        >
          {isAuthenticated ? 'Dashboard' : 'Log In'}
        </Link>
      </div>
    </nav>
  )
}
