'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * BrandScrollReset
 *
 * On every route change inside the brand portal, reset scroll to top.
 */
export default function BrandScrollReset() {
  const pathname = usePathname()

  useEffect(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0

    const main = document.querySelector('[data-brand-main]') as HTMLElement | null
    if (main) {
      main.scrollTop = 0
    }
  }, [pathname])

  return null
}
