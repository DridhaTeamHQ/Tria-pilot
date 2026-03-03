'use client'

import { usePathname } from 'next/navigation'
import BrutalNavbar from '@/components/brutal/BrutalNavbar'
import LandingNav from './LandingNav'

export default function NavSwitcher() {
  const pathname = usePathname()
  const isHome = pathname === '/'

  if (isHome) return <LandingNav />
  return <BrutalNavbar />
}
