'use client'

import { usePathname } from 'next/navigation'
import Footer from '@/components/Footer'

const HIDE_FOOTER_PREFIXES = [
    '/login',
    '/register',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/auth/confirm',
    '/complete-profile',
    '/onboarding',
    '/admin',
    '/brand',
    '/influencer',
    '/dashboard',
    '/inbox',
    '/profile',
    '/settings',
]

export default function FooterSwitcher() {
    const pathname = usePathname()
    const shouldHide = pathname === '/' || pathname === '/contact' || HIDE_FOOTER_PREFIXES.some((p) => pathname?.startsWith(p))

    if (shouldHide) return null
    return <Footer />
}
