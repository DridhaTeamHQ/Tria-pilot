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
        const res = await fetch('/api/auth/me', { 
          cache: 'no-store',
          credentials: 'include' // Ensure cookies are sent
        })
        
        // If 401, user is not authenticated - that's fine, don't redirect
        if (res.status === 401) return
        
        // If other error, log but don't redirect
        if (!res.ok) {
          console.warn('ProfileCompletionGate: /api/auth/me returned', res.status)
          return
        }
        
        const data = await res.json().catch(() => null)
        if (cancelled) return
        
        // If user needs to complete profile, redirect them
        if (data?.requiresProfile && data?.next) {
          console.log('ProfileCompletionGate: Redirecting to', data.next)
          router.replace(data.next)
        }
      } catch (error) {
        // Silently ignore network errors to avoid console spam
        if (process.env.NODE_ENV === 'development') {
          console.warn('ProfileCompletionGate error:', error)
        }
      }
    }
    run()

    return () => {
      cancelled = true
    }
  }, [pathname, router])

  return null
}

