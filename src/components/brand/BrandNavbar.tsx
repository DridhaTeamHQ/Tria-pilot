'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { AppImage } from '@/components/ui/AppImage'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Sparkles,
  Users,
  Target,
  Package,
  Inbox,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { setAuthToast } from '@/components/auth-toast-bridge'
import LogoutButton from '@/components/LogoutButton'

const navItems = [
  { href: '/brand/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/brand/campaigns', label: 'Campaigns', icon: Target },
  { href: '/brand/influencers', label: 'Creators', icon: Users },
  { href: '/brand/ads', label: 'Ad Creatives', icon: Sparkles },
  { href: '/brand/products', label: 'Products', icon: Package },
  { href: '/brand/inbox', label: 'Inbox', icon: Inbox },
]

interface BrandNavbarProps {
  brandName?: string
  avatarUrl?: string | null
}

export default function BrandNavbar({ brandName = 'Brand', avatarUrl = null }: BrandNavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [avatarFailed, setAvatarFailed] = useState(false)
  const showAvatarImage = Boolean(avatarUrl) && !avatarFailed

  const activeHref =
    navItems
      .filter((item) => pathname === item.href || pathname?.startsWith(`${item.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href || null

  const isActive = (href: string) => activeHref === href

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('sb-') || key.startsWith('supabase')) {
            localStorage.removeItem(key);
          }
        });
        sessionStorage.clear()
        setAuthToast('logged_out')
      }
      setMobileOpen(false)
      window.location.href = '/'
      return
    } catch (error) {
      console.error('Logout error:', error)
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
      return
    }
  }, [isLoggingOut])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#F9F8F4] border-b-[3px] border-black">
      <div className="mx-auto w-full max-w-[2000px] px-3 sm:px-5 lg:px-6 xl:px-8">
        <div className="grid h-14 grid-cols-[auto_1fr_auto] items-center gap-2 sm:h-16 lg:h-16 lg:gap-4">
          <Link
            href="/brand/dashboard"
            className="kiwikoo-wordmark flex h-11 items-center translate-y-[1.5px] shrink-0 text-[1.6rem] font-black leading-none text-black transition-colors hover:text-[#B4F056] sm:text-[1.85rem] sm:h-auto sm:translate-y-0 lg:text-[2.1rem]"
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
                  className={`px-2.5 lg:px-3 py-1.5 rounded-xl text-sm lg:text-[15px] font-bold transition-all duration-150 flex items-center justify-center gap-1.5 border-2 border-black whitespace-nowrap ${active
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
            <Link
              href="/brand/profile"
              className="relative w-9 h-9 overflow-hidden rounded-xl bg-[#B4F056] border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-black font-black text-sm transition-transform hover:-translate-y-0.5"
              title="Profile"
            >
              {showAvatarImage ? (
                <AppImage
                  src={avatarUrl!}
                  alt={brandName || 'Brand'}
                  className="object-contain bg-white p-0.5"
                  sizes="36px"
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                brandName?.charAt(0)?.toUpperCase() || 'B'
              )}
            </Link>
            <LogoutButton
              onClick={() => void handleLogout()}
              disabled={isLoggingOut}
              title="Logout"
              expandOnHover={false}
            />
          </div>

          <button
            type="button"
            className="lg:hidden rounded-xl border-2 border-black bg-white p-2.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-colors hover:bg-gray-50"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5 text-black" /> : <Menu className="w-5 h-5 text-black" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-white border-t-2 border-black">
          <div className="mx-auto w-full max-w-[2000px] px-3 py-3 space-y-2 max-h-[calc(100dvh-3.5rem)] overflow-y-auto sm:px-5">
            <Link
              href="/brand/profile"
              onClick={() => setMobileOpen(false)}
              className="mb-3 flex items-center gap-3 rounded-xl border-2 border-black bg-[#F9F8F4] px-4 py-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
            >
              <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border-2 border-black bg-[#B4F056] font-black text-black">
                {showAvatarImage ? (
                  <AppImage
                    src={avatarUrl!}
                    alt={brandName || 'Brand'}
                    className="object-contain bg-white p-0.5"
                    sizes="48px"
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  brandName?.charAt(0)?.toUpperCase() || 'B'
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-bold text-black">{brandName || 'Brand'}</p>
                <p className="text-sm text-black/60">Brand account - Profile</p>
              </div>
            </Link>

            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-black text-base font-bold transition-all ${active
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
