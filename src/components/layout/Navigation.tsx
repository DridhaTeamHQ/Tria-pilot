'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Home,
  Star,
  ShoppingBag,
  LayoutDashboard,
  Mail,
  User,
  Box,
  Megaphone,
  Menu,
  X,
  LogOut,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { useUser } from '@/lib/react-query/hooks'

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: user, isLoading } = useUser()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)

  // Don't show navigation on auth pages
  if (pathname?.startsWith('/login') || pathname?.startsWith('/register')) {
    return null
  }

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      if (response.ok) {
        setLogoutDialogOpen(false)
        router.push('/login')
        router.refresh()
      }
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Hide Home button when user is logged in
  const influencerLinks = user
    ? [
        { href: '/influencer/try-on', label: 'Try-On Studio', icon: Star },
        { href: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
        { href: '/influencer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/inbox', label: 'Inbox', icon: Mail },
        { href: '/profile', label: 'Profile', icon: User },
      ]
    : [
        { href: '/', label: 'Home', icon: Home },
        { href: '/influencer/try-on', label: 'Try-On Studio', icon: Star },
        { href: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
        { href: '/influencer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/inbox', label: 'Inbox', icon: Mail },
        { href: '/profile', label: 'Profile', icon: User },
      ]

  const brandLinks = user
    ? [
        { href: '/brand/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/brand/marketplace', label: 'Influencers', icon: ShoppingBag },
        { href: '/brand/products', label: 'Products', icon: Box },
        { href: '/brand/campaigns', label: 'Campaigns', icon: Megaphone },
        { href: '/inbox', label: 'Inbox', icon: Mail },
        { href: '/profile', label: 'Profile', icon: User },
      ]
    : [
        { href: '/', label: 'Home', icon: Home },
        { href: '/brand/marketplace', label: 'Influencers', icon: ShoppingBag },
        { href: '/brand/products', label: 'Products', icon: Box },
        { href: '/brand/campaigns', label: 'Campaigns', icon: Megaphone },
        { href: '/inbox', label: 'Inbox', icon: Mail },
        { href: '/profile', label: 'Profile', icon: User },
      ]

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/')

  // Determine which links to show based on user role
  // Use pathname as fallback hint if user data isn't loaded yet
  const isBrandPath = pathname?.startsWith('/brand')
  
  // Explicitly check user role - must be exactly 'BRAND' to show brand links
  // NEVER show Try-On Studio for brands - only for influencers
  const userRole = user?.role
  let isBrand = false
  
  if (userRole === 'BRAND') {
    // User is explicitly a brand
    isBrand = true
  } else if (!isLoading && !user && isBrandPath) {
    // User data not loaded yet, but we're on a brand path - assume brand
    isBrand = true
  } else if (userRole === 'INFLUENCER') {
    // User is explicitly an influencer
    isBrand = false
  }
  // If userRole is undefined/null and not on brand path, default to influencer (isBrand = false)
  
  const links = isBrand ? brandLinks : influencerLinks
  const userInitial = user?.name?.charAt(0).toUpperCase() || 'U'
  
  // Debug: Log user role for troubleshooting
  if (process.env.NODE_ENV === 'development') {
    console.log('[Navigation]', {
      userRole,
      isBrand,
      pathname,
      isLoading,
      hasUser: !!user,
      showingLinks: links.map(l => l.label),
    })
  }

  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <span className="text-2xl font-bold">Kiwikoo</span>
            <span className="text-green-500">★</span>
          </Link>

          {/* Desktop Navigation - Centered */}
          <div className="hidden md:flex items-center justify-center gap-1 flex-1">
            {links.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive(link.href)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span>{link.label}</span>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* User Avatar - Right Side */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-zinc-900 font-semibold flex-shrink-0">
              {userInitial}
            </div>
            {user && (
              <Button variant="ghost" size="sm" onClick={() => setLogoutDialogOpen(true)} className="hidden sm:flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                <span className="hidden lg:inline">Logout</span>
              </Button>
            )}

            {/* Mobile Menu Button */}
            <button
              className="md:hidden flex-shrink-0"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col gap-2">
              {links.map((link) => {
                const Icon = link.icon
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(link.href)
                        ? 'bg-primary text-primary-foreground'
                        : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{link.label}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Gamified Logout Dialog */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-zinc-900" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">Ready to leave? 🎯</DialogTitle>
            <DialogDescription className="text-center pt-2">
              You&apos;re doing great! Your progress is saved. Come back soon to continue your journey!
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-3">
                <Trophy className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                <div>
                  <p className="font-semibold text-sm">Keep up the amazing work!</p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Your achievements are waiting for you when you return ✨
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setLogoutDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              Stay
            </Button>
            <Button
              onClick={handleLogout}
              className="w-full sm:w-auto bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </nav>
  )
}

