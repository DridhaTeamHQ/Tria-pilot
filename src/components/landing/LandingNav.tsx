'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

// Enhanced classes with rich aesthetics
const navLinkClass =
  'flex w-full items-center justify-center rounded-2xl bg-black/5 px-4 py-4 text-[16px] font-bold text-gray-800 transition-all duration-300 hover:bg-black/10 hover:text-black active:scale-[0.98]'

const loginButtonClass =
  'inline-flex items-center justify-center rounded-full border-[1.5px] border-black/80 px-7 py-[11px] text-[13px] font-bold uppercase tracking-wider transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.2)] active:translate-y-0 active:shadow-none'

const desktopNavItemClass =
  'relative inline-flex items-center px-1 py-2 text-[14px] font-bold text-black/60 transition-colors duration-300 hover:text-black group'

const desktopNavUnderlineClass =
  'absolute -bottom-1 left-0 h-[2px] w-full origin-left scale-x-0 bg-black transition-transform duration-300 ease-out group-hover:scale-x-100'

const desktopActiveItemClass =
  'inline-flex items-center rounded-full bg-black/5 px-5 py-2 text-[14px] font-bold text-black transition-all hover:bg-black/10'

export default function LandingNav() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Add scroll listener for dynamic navbar background
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  return (
    <>
      <nav
        aria-label="Main navigation"
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${scrolled || open
            ? 'border-b border-black/5 bg-white/80 shadow-sm backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent'
          }`}
        style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}
      >
        <div
          className={`mx-auto flex max-w-[1438px] items-center justify-between gap-5 px-5 transition-all duration-500 lg:px-8 xl:px-10 ${scrolled ? 'py-3' : 'py-5'
            }`}
        >
          <Link
            href="/"
            className="kiwikoo-wordmark relative z-50 text-[24px] font-black leading-none text-black transition-transform duration-300 hover:scale-105 sm:text-[28px]"
            onClick={() => setOpen(false)}
          >
            Kiwikoo
          </Link>

          <div className="hidden items-center gap-10 lg:flex">
            <Link href="/" className={desktopActiveItemClass}>
              Home
            </Link>
            <Link href="/#what-you-get" className={desktopNavItemClass}>
              What You Get
              <span className={desktopNavUnderlineClass} />
            </Link>
            <Link href="/marketplace" className={desktopNavItemClass}>
              Marketplace
              <span className={desktopNavUnderlineClass} />
            </Link>
            <Link href="/#contact" className={desktopNavItemClass}>
              Contact us
              <span className={desktopNavUnderlineClass} />
            </Link>
          </div>

          <div className="hidden items-center gap-4 lg:flex">
            <Link
              href="/login"
              className={`${loginButtonClass} bg-[#ff8c78] text-black border-transparent shadow-[0_4px_14px_0_rgba(255,140,120,0.39)] hover:shadow-[0_6px_20px_rgba(255,140,120,0.23)] hover:border-[#ff8c78]/50`}
            >
              Influencer Login
            </Link>
            <Link href="/login?from=brand" className={`${loginButtonClass} bg-white text-black`}>
              Brand Login
            </Link>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((prev) => !prev)}
            className="relative z-50 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/5 text-black transition-all duration-300 hover:bg-black/10 active:scale-90 lg:hidden"
          >
            <div className="relative flex h-5 w-5 items-center justify-center">
              <span
                className={`absolute h-[2px] w-5 bg-black transition-all duration-300 ${open ? 'rotate-45' : '-translate-y-1.5'
                  }`}
              />
              <span
                className={`absolute h-[2px] w-5 bg-black transition-all duration-300 ${open ? 'opacity-0' : 'opacity-100'
                  }`}
              />
              <span
                className={`absolute h-[2px] w-5 bg-black transition-all duration-300 ${open ? '-rotate-45' : 'translate-y-1.5'
                  }`}
              />
            </div>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-white/95 backdrop-blur-3xl transition-all duration-500 ease-in-out lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
      >
        <div
          className={`flex h-full flex-col justify-center px-6 transition-transform duration-500 ease-in-out ${open ? 'translate-y-0 scale-100' : 'translate-y-8 scale-95'
            }`}
          style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}
        >
          <div className="flex flex-col gap-4 text-center">
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
            <div className="mt-8 flex flex-col gap-3">
              <Link
                href="/login"
                className={`${loginButtonClass} bg-[#ff8c78] text-black border-transparent w-full`}
                onClick={() => setOpen(false)}
              >
                Influencer Login
              </Link>
              <Link
                href="/login?from=brand"
                className={`${loginButtonClass} bg-white text-black w-full`}
                onClick={() => setOpen(false)}
              >
                Brand Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
