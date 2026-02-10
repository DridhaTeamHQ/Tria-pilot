'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
    Sparkles,
    Users,
    Target,
    Package,
    Inbox,
    User,
    LogOut
} from 'lucide-react'

const navItems = [
    { href: '/brand/campaigns', label: 'Campaigns', icon: Target },
    { href: '/brand/profile', label: 'Profile', icon: User },
    { href: '/brand/influencers', label: 'Influencers', icon: Users },
    { href: '/brand/ads', label: 'Ads', icon: Sparkles },
    { href: '/brand/products', label: 'Products', icon: Package },
    { href: '/brand/inbox', label: 'Inbox', icon: Inbox },
]

interface BrandNavbarProps {
    brandName?: string
}

export default function BrandNavbar({ brandName = 'Brand' }: BrandNavbarProps) {
    const pathname = usePathname()
    const router = useRouter()

    const handleLogout = async () => {
        window.location.href = '/api/auth/logout'
    }

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b-[3px] border-black">
            <div className="container mx-auto px-6">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link
                        href="/brand/dashboard"
                        className="flex items-center gap-2 font-black text-xl"
                    >
                        <span>Kiwikoo</span>
                    </Link>

                    {/* Navigation Links */}
                    <div className="hidden md:flex items-center gap-2">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href ||
                                pathname?.startsWith(item.href + '/')

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`
                                        flex items-center gap-2 px-4 py-2 font-medium text-sm
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

                    {/* User Section */}
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#B4F056] border-2 border-black flex items-center justify-center font-bold text-sm">
                            {brandName?.charAt(0)?.toUpperCase() || 'B'}
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-black bg-white hover:bg-gray-50 transition-colors font-medium text-sm"
                            title="Logout"
                        >
                            <LogOut className="w-4 h-4" strokeWidth={2} />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                <div className="md:hidden flex items-center gap-2 pb-3 overflow-x-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href ||
                            pathname?.startsWith(item.href + '/')

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`
                                    flex items-center gap-1.5 px-3 py-1.5 font-medium text-xs whitespace-nowrap
                                    rounded-full border-2 border-black transition-all
                                    ${isActive
                                        ? 'bg-[#B4F056]'
                                        : 'bg-white'
                                    }
                                `}
                            >
                                <item.icon className="w-3.5 h-3.5" strokeWidth={2} />
                                <span>{item.label}</span>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </nav>
    )
}
