'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
    Sparkles,
    Users,
    Target,
    Package,
    Inbox,
    User,
    LogOut,
    ImageIcon,
    Menu,
    X,
} from 'lucide-react'

const navItems = [
    { href: '/brand/campaigns', label: 'Campaigns', icon: Target },
    { href: '/brand/profile', label: 'Profile', icon: User },
    { href: '/brand/influencers', label: 'Influencers', icon: Users },
    { href: '/brand/ads', label: 'Create Ad', icon: Sparkles },
    { href: '/brand/ads/creatives', label: 'Ad Creatives', icon: ImageIcon },
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

    const handleLogout = useCallback(async () => {
        if (isLoggingOut) return
        setIsLoggingOut(true)
        try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
            if (typeof window !== 'undefined') {
                localStorage.clear()
                sessionStorage.clear()
            }
        } finally {
            if (typeof window !== 'undefined') {
                window.location.assign('/')
                return
            }
            router.replace('/')
        }
    }, [isLoggingOut, router])

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b-[3px] border-black">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="flex items-center justify-between h-12 md:h-14">
                    {/* Logo */}
                    <Link
                        href="/brand/dashboard"
                        className="flex items-center gap-2 font-black text-lg md:text-xl leading-none"
                    >
                        <span>Kiwikoo</span>
                    </Link>

                    {/* Desktop Navigation Links */}
                    <div className="hidden lg:flex items-center gap-1.5">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href ||
                                pathname?.startsWith(item.href + '/')

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`
                                        flex items-center gap-1.5 px-3 py-1.5 font-medium text-xs md:text-sm
                                        rounded-full border-2 border-black transition-all
                                        ${isActive
                                            ? 'bg-[#B4F056] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                            : 'bg-white hover:bg-gray-50'
                                        }
                                    `}
                                >
                                    <item.icon className="w-4 h-4" strokeWidth={2} />
                                    <span>{item.label}</span>
                                </Link>
                            )
                        })}
                    </div>

                    {/* Desktop User Section */}
                    <div className="hidden lg:flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#B4F056] border-2 border-black flex items-center justify-center font-bold text-xs">
                            {brandName?.charAt(0)?.toUpperCase() || 'B'}
                        </div>
                        <button type="button"
                            onClick={() => void handleLogout()}
                            disabled={isLoggingOut}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-black bg-white hover:bg-gray-50 transition-colors font-medium text-xs md:text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                            title="Logout"
                        >
                            <LogOut className="w-4 h-4" strokeWidth={2} />
                            <span>Logout</span>
                        </button>
                    </div>

                    {/* Mobile hamburger */}
                    <button type="button"
                        className="lg:hidden p-1.5 rounded-lg border-2 border-black bg-white hover:bg-gray-50 transition-colors"
                        onClick={() => setMobileOpen(!mobileOpen)}
                    >
                        {mobileOpen
                            ? <X className="w-4 h-4 text-black" />
                            : <Menu className="w-4 h-4 text-black" />
                        }
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileOpen && (
                <div className="lg:hidden bg-white border-t-2 border-black animate-[slideDown_0.2s_ease-out]">
                    <style>{`@keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                    <div className="container mx-auto px-4 py-2.5 space-y-1.5">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href ||
                                pathname?.startsWith(item.href + '/')

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={`
                                        flex items-center gap-2.5 px-3.5 py-2 font-medium text-sm
                                        rounded-lg border-2 border-black transition-all
                                        ${isActive
                                            ? 'bg-[#B4F056] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                            : 'bg-white hover:bg-gray-50'
                                        }
                                    `}
                                >
                                    <item.icon className="w-4 h-4" strokeWidth={2} />
                                    <span>{item.label}</span>
                                </Link>
                            )
                        })}

                        <div className="pt-2 border-t-2 border-black mt-2">
                            <button type="button"
                                onClick={() => { setMobileOpen(false); void handleLogout() }}
                                disabled={isLoggingOut}
                                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-600 bg-white border-2 border-black hover:bg-red-50 transition-colors font-medium text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                <LogOut className="w-4 h-4" strokeWidth={2} />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    )
}

