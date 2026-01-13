'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const SKIP_PREFIXES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth/confirm',
  '/complete-profile',
  '/admin/login',
  '/admin/register',
]

export default function ProfileCompletionGate() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!pathname) return
    if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) return

    let cancelled = false
    async function run() {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json().catch(() => null)
        if (cancelled) return
        if (data?.requiresProfile && data?.next) {
          router.replace(data.next)
        }
      } catch {
        // ignore
      }
    }
    run()

    return () => {
      cancelled = true
    }
  }, [pathname, router])

  return null
}

