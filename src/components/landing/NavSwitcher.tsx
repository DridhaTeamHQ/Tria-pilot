'use client'

import { usePathname } from 'next/navigation'
import BrutalNavbar from '@/components/brutal/BrutalNavbar'
import LandingNav from './LandingNav'

export default function NavSwitcher() {
  const pathname = usePathname()
  const isLandingPage = pathname === '/'
  const isContactPage = pathname === '/contact'
  const isBrandRoute = pathname?.startsWith('/brand')

  if (isBrandRoute) {
    return null
  }

  if (isContactPage || isLandingPage) {
    return <LandingNav />
  }

  return <BrutalNavbar />
}
