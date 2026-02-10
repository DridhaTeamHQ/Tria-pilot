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
        <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FDF6EC] border-b-[3px] border-black">
            <div className="container mx-auto px-4 md:px-6">
                <div className="flex items-center justify-between h-20">
                    {/* Logo */}
                    <Link
                        href="/brand/dashboard"
                        className="flex items-center gap-2 font-black text-2xl tracking-tighter"
                    >
                        <span>Kiwikoo</span>
                    </Link>

                    {/* Navigation Links */}
                    <div className="hidden md:flex items-center gap-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href ||
                                pathname?.startsWith(item.href + '/')

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`
                                        flex items-center gap-2 px-6 py-2.5 font-bold text-sm
                                        border-[2px] transition-all
                                        ${isActive
                                            ? 'bg-[#B4F056] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1'
                                            : 'bg-white border-transparent hover:border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1'
                                        }
                                    `}
                                >
                                    <item.icon className="w-4 h-4" strokeWidth={3} />
                                    <span>{item.label}</span>
                                </Link>
                            )
                        })}
                    </div>

                    {/* User Section */}
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center justify-center w-10 h-10 bg-[#FF8C69] border-[2px] border-black font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black">
                            {brandName?.charAt(0)?.toUpperCase() || 'B'}
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-5 py-2.5 bg-black text-white hover:bg-[#FFD93D] hover:text-black border-[2px] border-black transition-all font-bold text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                            title="Logout"
                        >
                            <LogOut className="w-4 h-4" strokeWidth={3} />
                            <span className="hidden md:inline">Logout</span>
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                <div className="md:hidden flex items-center gap-2 pb-4 overflow-x-auto no-scrollbar">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href ||
                            pathname?.startsWith(item.href + '/')

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`
                                    flex items-center gap-2 px-4 py-2 font-bold text-xs whitespace-nowrap
                                    border-[2px] transition-all flex-shrink-0
                                    ${isActive
                                        ? 'bg-[#B4F056] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                        : 'bg-white border-black hover:bg-gray-50'
                                    }
                                `}
                            >
                                <item.icon className="w-3.5 h-3.5" strokeWidth={3} />
                                <span>{item.label}</span>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </nav>
    )
}
