'use client'

import Link from 'next/link'
import { Menu } from 'lucide-react'
import { useUser } from '@/lib/react-query/hooks'

export default function LandingNav() {
  const { data: user, isLoading } = useUser()
  const authResolving = isLoading && typeof user === 'undefined'
  const isAuthenticated = !authResolving && !!user
  const primaryHref = isAuthenticated ? '/dashboard' : '/signup/influencer'
  const primaryLabel = authResolving ? 'Loading' : isAuthenticated ? 'Dashboard' : 'Influencer login'
  const secondaryHref = isAuthenticated ? '/marketplace' : '/signup/brand'
  const secondaryLabel = isAuthenticated ? 'Marketplace' : 'Brand login'

  return (
    <nav
      aria-label="Main navigation"
      className="fixed left-0 right-0 top-0 z-50 border-b border-black/10 bg-[#f7f3eb]/92 backdrop-blur-md"
      style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}
    >
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="kiwikoo-wordmark shrink-0 text-[22px] font-black text-black sm:text-[24px]">
          Kiwikoo
        </Link>

        <div className="hidden items-center gap-5 text-[11px] font-black uppercase tracking-[0.16em] text-black/55 md:flex">
          <Link href="/" className="hover:text-black">Home</Link>
          <Link href="/#features" className="hover:text-black">What we do</Link>
          <Link href="/marketplace" className="hover:text-black">Marketplace</Link>
          <Link href="/#contact" className="hover:text-black">Contact</Link>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border-[2px] border-black bg-white text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] md:hidden"
            aria-label="Menu"
          >
            <Menu className="h-4 w-4" strokeWidth={2.6} />
          </button>
          <Link
            href={primaryHref}
            aria-disabled={authResolving}
            className={`hidden rounded-full border-[2px] border-black px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition sm:inline-flex ${authResolving ? 'pointer-events-none bg-white opacity-70' : 'bg-[#ff8a73] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'}`}
          >
            {primaryLabel}
          </Link>
          <Link
            href={secondaryHref}
            className="inline-flex rounded-full border-[2px] border-black bg-[#c9ff3d] px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
          >
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </nav>
  )
}
