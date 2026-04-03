'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'

const navLinkClass =
  'flex w-full items-center justify-center rounded-2xl bg-black/5 px-4 py-4 text-[16px] font-bold text-gray-800 transition-all duration-300 hover:bg-black/10 hover:text-black active:scale-[0.98]'

const loginButtonClass =
  'inline-flex items-center justify-center rounded-full border-[1.5px] border-black/80 px-7 py-[11px] text-[13px] font-bold uppercase tracking-wider transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.2)] active:translate-y-0 active:shadow-none'

const desktopNavItemClass =
  'relative inline-flex items-center px-4 py-2 text-[15px] transition-colors duration-300 z-10'

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/#what-you-get', label: 'What You Get' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/#contact', label: 'Contact us' }
]

export default function LandingNav() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const activeIndex = pathname === '/' ? 0 : pathname === '/marketplace' ? 2 : 0

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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

          <div
            className="hidden items-center gap-2 lg:flex"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {LINKS.map((link, idx) => {
              const isActive = activeIndex === idx
              const isHovered = hoveredIndex === idx
              const isTarget = isHovered || (isActive && hoveredIndex === null)

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  className={`${desktopNavItemClass} ${isTarget ? 'font-[900] text-black' : 'font-[800] text-[#333333] hover:text-black'}`}
                >
                  {isTarget && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-[20px] border-[1.5px] border-black/15 bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] -z-10"
                      initial={false}
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 30
                      }}
                    />
                  )}
                  {link.label}
                </Link>
              )
            })}
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
            {LINKS.map(link => (
              <Link key={link.href} href={link.href} className={navLinkClass} onClick={() => setOpen(false)}>
                {link.label}
              </Link>
            ))}
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
