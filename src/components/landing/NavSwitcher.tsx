'use client'

import { usePathname } from 'next/navigation'
import BrutalNavbar from '@/components/brutal/BrutalNavbar'
import LandingNav from './LandingNav'
import { useUser } from '@/lib/react-query/hooks'

export default function NavSwitcher() {
  const pathname = usePathname()
  const { data: user, isLoading } = useUser()
  const isLandingPage = pathname === '/'
  const isContactPage = pathname === '/contact'

  if (isContactPage || isLandingPage) {
    return <LandingNav />
  }

  return <BrutalNavbar />
}
