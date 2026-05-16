'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0
}

export default function RouteProgress() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    const done = window.setTimeout(() => setLoading(false), 180)
    return () => window.clearTimeout(done)
  }, [pathname])

  useEffect(() => {
    const start = () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
      setLoading(true)
      timeoutRef.current = window.setTimeout(() => setLoading(false), 4500)
    }

    const handleClick = (event: MouseEvent) => {
      if (isModifiedClick(event)) return
      const target = event.target as HTMLElement | null
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null
      if (!anchor || anchor.target || anchor.hasAttribute('download')) return

      const nextUrl = new URL(anchor.href, window.location.href)
      if (nextUrl.origin !== window.location.origin) return
      if (nextUrl.pathname === window.location.pathname && nextUrl.search === window.location.search) return

      start()
    }

    window.addEventListener('popstate', start)
    document.addEventListener('click', handleClick, true)
    return () => {
      window.removeEventListener('popstate', start)
      document.removeEventListener('click', handleClick, true)
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    }
  }, [])

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 top-0 z-[2147483646] h-[3px] origin-left bg-[#FF8C69] shadow-[0_0_18px_rgba(255,140,105,0.65)] transition-all duration-300 ${
        loading ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
      }`}
    />
  )
}
