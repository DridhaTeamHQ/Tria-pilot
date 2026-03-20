'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Sparkles,
  Users,
  Target,
  Package,
  Inbox,
  User,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react'
import LogoutButton from '@/components/LogoutButton'

const navItems = [
  { href: '/brand/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/brand/campaigns', label: 'Campaigns', icon: Target },
  { href: '/brand/profile', label: 'Profile', icon: User },
  { href: '/brand/influencers', label: 'Influencers', icon: Users },
  { href: '/brand/ads/creatives', label: 'Ad Creatives', icon: Sparkles },
  { href: '/brand/products', label: 'Products', icon: Package },
  { href: '/brand/inbox', label: 'Inbox', icon: Inbox },
]

interface BrandNavbarProps {
  brandName?: string
}

export default function BrandNavbar({ brandName = 'Brand' }: BrandNavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const activeHref =
    navItems
      .filter((item) => pathname === item.href || pathname?.startsWith(`${item.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href || null

  const isActive = (href: string) => activeHref === href

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
        window.location.assign('/')
        return
      }
      router.replace('/')
    } finally {
      if (typeof window !== 'undefined') {
        setIsLoggingOut(false)
      }
    }
  }, [isLoggingOut, router])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#F9F8F4] border-b-[3px] border-black">
      <div className="w-full max-w-[2000px] mx-auto px-3 sm:px-5 lg:px-6 xl:px-8">
        <div className="grid h-14 grid-cols-[auto_1fr_auto] items-center gap-2 lg:h-16 lg:gap-4">
          <Link
            href="/brand/dashboard"
            className="text-[2rem] md:text-[1.9rem] lg:text-[2.1rem] font-black tracking-tight text-black hover:text-[#B4F056] transition-colors shrink-0 leading-none"
          >
            Kiwikoo
          </Link>

          <nav className="hidden lg:flex min-w-0 items-center justify-center gap-1 lg:gap-1.5 px-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-2.5 lg:px-3 py-1.5 rounded-xl text-sm lg:text-[15px] font-bold transition-all duration-150 flex items-center justify-center gap-1.5 border-2 border-black whitespace-nowrap ${
                    active
                      ? 'bg-[#B4F056] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                      : 'bg-white text-black hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="hidden lg:flex items-center justify-end gap-2 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-[#B4F056] border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-black font-black text-sm">
              {brandName?.charAt(0)?.toUpperCase() || 'B'}
            </div>
            <LogoutButton
              onClick={() => void handleLogout()}
              disabled={isLoggingOut}
              title="Logout"
              expandOnHover={false}
            />
          </div>

          <button
            type="button"
            className="lg:hidden p-2 rounded-xl border-2 border-black bg-white hover:bg-gray-50 transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5 text-black" /> : <Menu className="w-5 h-5 text-black" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-white border-t-2 border-black">
          <div className="container mx-auto px-4 py-3 space-y-2 max-h-[calc(100dvh-3.5rem)] overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-black text-base font-bold transition-all ${
                    active
                      ? 'bg-[#B4F056] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                      : 'bg-white text-black hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </Link>
              )
            })}

            <div className="pt-2 border-t-2 border-black mt-2">
              <LogoutButton
                onClick={() => {
                  setMobileOpen(false)
                  void handleLogout()
                }}
                disabled={isLoggingOut}
                fullWidth
                className="text-base"
              />
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
