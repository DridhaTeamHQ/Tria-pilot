'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { AppImage } from '@/components/ui/AppImage'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu,
  X,
  LayoutDashboard,
  Megaphone,
  ShoppingBag,
  Sparkles,
  Box,
  Mail,
  ChevronRight,
} from 'lucide-react'
import { setAuthToast } from '@/components/auth-toast-bridge'
import { useUser } from '@/lib/react-query/hooks'
import LogoutButton from '@/components/LogoutButton'
import NotificationBell from '@/components/NotificationBell'

interface BrandNavbarProps {
  brandName?: string
  avatarUrl?: string | null
}

export default function BrandNavbar({ brandName: initialBrandName, avatarUrl: initialAvatarUrl }: BrandNavbarProps) {
  const pathname = usePathname()
  const { data: user, isLoading, isFetching } = useUser()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [avatarFailed, setAvatarFailed] = useState(false)
  const [pendingPath, setPendingPath] = useState<string | null>(null)

  useEffect(() => {
    setMobileOpen(false)
    setPendingPath(null)
  }, [pathname])

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })

      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('sb-') || key.startsWith('supabase')) {
            localStorage.removeItem(key)
          }
        })
        sessionStorage.clear()
        setAuthToast('logged_out')
        window.location.href = '/'
      }
    } catch (error) {
      console.error('Logout error:', error)
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    }
  }, [isLoggingOut])

  const isActive = (path: string) =>
    pathname === path || pathname?.startsWith(path + '/')

  const navItems = [
    { href: '/brand/dashboard', label: 'Dashboard', icon: LayoutDashboard, color: '#B4F056' },
    { href: '/brand/campaigns', label: 'Campaigns', icon: Megaphone, color: '#B4F056' },
    { href: '/brand/influencers', label: 'Creators', icon: ShoppingBag, color: '#B4F056' },
    { href: '/brand/ads', label: 'Ad Creatives', icon: Sparkles, color: '#B4F056' },
    { href: '/brand/products', label: 'Products', icon: Box, color: '#B4F056' },
  ]
  const inboxItem = { href: '/brand/inbox', label: 'Inbox', icon: Mail }
  const mobileNavItems = [...navItems, inboxItem]

  const isLoggedIn = user !== null && user !== undefined
  const authResolving = isLoading || (isFetching && !isLoggedIn)

  if (authResolving || !isLoggedIn || user?.role !== 'BRAND') {
    return null
  }

  const brandName = (user as any)?.brand_name || user?.name || user?.email || initialBrandName || 'Brand'
  const avatarUrl = (user as any)?.avatar_url || (user as any)?.avatarUrl || initialAvatarUrl || null
  const showAvatarImage = Boolean(avatarUrl) && !avatarFailed

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b-[3px] border-black bg-[rgba(249,248,244,0.85)] backdrop-blur-xl">
      <div className="mx-auto w-full max-w-[2000px] px-3 sm:px-5 lg:px-8 xl:px-12">
        <div className="grid h-20 grid-cols-[auto_1fr_auto] items-center gap-2 lg:gap-4">
          <Link
            href="/brand/dashboard"
            className="kiwikoo-wordmark flex items-center shrink-0 text-[2rem] font-black leading-none text-black transition-colors hover:text-[#B4F056]"
          >
            Kiwikoo
          </Link>

          <nav className="hidden items-center justify-center gap-1.5 lg:flex xl:gap-2">
            {navItems.map((item, idx) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + idx * 0.05 }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setPendingPath(item.href)}
                    className={`flex items-center gap-2 rounded-xl border-2 border-black px-3 py-1.5 text-sm font-bold transition-all xl:px-4 xl:py-2 xl:text-base ${pendingPath === item.href ? 'opacity-50 pointer-events-none' : ''} ${active
                      ? 'text-black shadow-[3px_3px_0_0_rgba(0,0,0,1)]'
                      : 'bg-white text-black hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]'
                      }`}
                    style={active ? { backgroundColor: item.color } : {}}
                  >
                    <Icon className="h-4 w-4 shrink-0 xl:h-5 xl:w-5" />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </Link>
                </motion.div>
              )
            })}
          </nav>

          <div className="hidden items-center justify-end gap-2 shrink-0 lg:flex lg:gap-3">
            <Link
              href={inboxItem.href}
              onClick={() => setPendingPath(inboxItem.href)}
              className={`relative flex h-10 w-10 items-center justify-center rounded-xl border-2 border-black text-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5 ${pendingPath === inboxItem.href ? 'opacity-50 pointer-events-none' : ''} ${isActive(inboxItem.href) ? 'bg-[#B4F056]' : 'bg-white'
                }`}
              title={inboxItem.label}
              aria-label={inboxItem.label}
            >
              <Mail className="h-4 w-4" />
            </Link>
            <NotificationBell role="brand" variant="brand" />
            <Link
              href="/brand/profile"
              onClick={() => setPendingPath('/brand/profile')}
              className={`relative w-10 h-10 overflow-hidden rounded-xl bg-[#B4F056] border-2 border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] flex items-center justify-center text-black font-black text-sm transition-all hover:-translate-y-0.5 ${pendingPath === '/brand/profile' ? 'opacity-50 pointer-events-none' : ''}`}
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
              className="bg-[#FF9B8F] hover:bg-[#FF8A7D] shadow-[3px_3px_0_0_rgba(0,0,0,1)]"
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

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-t-2 border-black overflow-hidden"
          >
            <div className="mx-auto w-full max-w-[2000px] px-3 py-3 space-y-2 max-h-[calc(100dvh-3.5rem)] overflow-y-auto sm:px-5">
              <Link
                href="/brand/profile"
                onClick={() => setMobileOpen(false)}
                className="mb-3 flex items-center gap-3 rounded-xl border-2 border-black bg-[#F9F8F4] px-4 py-3 shadow-[3px_3px_0_0_rgba(0,0,0,1)]"
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

              {mobileNavItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-black text-base font-bold transition-all ${active
                      ? 'bg-[#B4F056] text-black shadow-[3px_3px_0_0_rgba(0,0,0,1)]'
                      : 'bg-white text-black hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]'
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
                  title="Logout"
                  className="mt-2 h-12 !rounded-xl !bg-[#DC2626] !text-white !hover:bg-[#B91C1C] border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
