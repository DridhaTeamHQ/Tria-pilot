'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

const navLinkClass =
  'rounded-full border border-black/20 px-4 py-2 text-[14px] font-extrabold text-black transition hover:border-black'

const loginButtonClass =
  'inline-flex items-center justify-center rounded-full border-[2px] border-black px-6 py-3 text-[13px] font-black uppercase tracking-[0.06em] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'

const desktopNavItemClass =
  'inline-flex items-center py-2 text-[14px] font-extrabold text-black/72 transition hover:text-black'

const desktopActiveItemClass =
  'inline-flex items-center rounded-full border border-black/22 bg-white px-5 py-[0.65rem] text-[14px] font-extrabold text-black shadow-[0_1px_0_0_rgba(0,0,0,0.08)]'

export default function LandingNav() {
  const [open, setOpen] = useState(false)

  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 top-0 z-50 border-b border-black/15 bg-[#fbfaf6]"
      style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}
    >
      <div className="mx-auto flex max-w-[1438px] items-center justify-between gap-5 px-5 py-4 lg:px-8 xl:px-10">
        <Link href="/" className="kiwikoo-wordmark text-[22px] font-black leading-none text-black sm:text-[28px]">
          Kiwikoo
        </Link>

        <div className="hidden items-center gap-10 lg:flex">
          <Link href="/" className={desktopActiveItemClass}>
            Home
          </Link>
          <Link href="/#what-you-get" className={desktopNavItemClass}>
            What You Get
          </Link>
          <Link href="/marketplace" className={desktopNavItemClass}>
            Marketplace
          </Link>
          <Link href="/#contact" className={desktopNavItemClass}>
            Contact us
          </Link>
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/login" className={`${loginButtonClass} bg-[#ff8c78]`}>
            Influencer Login
          </Link>
          <Link href="/login?from=brand" className={`${loginButtonClass} bg-white`}>
            Brand Login
          </Link>
        </div>

        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border-[2px] border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] lg:hidden"
        >
          {open ? <X className="h-5 w-5" strokeWidth={2.5} /> : <Menu className="h-5 w-5" strokeWidth={2.5} />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-black/10 bg-[#fbfaf6] px-5 pb-5 lg:hidden">
          <div className="flex flex-col gap-3 pt-4">
            <Link href="/" className={navLinkClass} onClick={() => setOpen(false)}>
              Home
            </Link>
            <Link href="/#what-you-get" className={navLinkClass} onClick={() => setOpen(false)}>
              What You Get
            </Link>
            <Link href="/marketplace" className={navLinkClass} onClick={() => setOpen(false)}>
              Marketplace
            </Link>
            <Link href="/#contact" className={navLinkClass} onClick={() => setOpen(false)}>
              Contact us
            </Link>
            <Link href="/login" className={`${loginButtonClass} bg-[#ff8c78]`} onClick={() => setOpen(false)}>
              Influencer Login
            </Link>
            <Link href="/login?from=brand" className={`${loginButtonClass} bg-white`} onClick={() => setOpen(false)}>
              Brand Login
            </Link>
          </div>
        </div>
      ) : null}
    </nav>
  )
}
