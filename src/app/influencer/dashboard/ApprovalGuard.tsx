'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface ApprovalGuardProps {
  userId: string
  children: React.ReactNode
}

export default function ApprovalGuard({ userId, children }: ApprovalGuardProps) {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [isApproved, setIsApproved] = useState(false)

  useEffect(() => {
    async function checkApproval() {
      try {
        const res = await fetch('/api/auth/profile-status', {
          credentials: 'include',
          cache: 'no-store',
        })

        if (res.status === 401) {
          router.replace('/login')
          return
        }

        if (!res.ok) {
          throw new Error('Failed to check approval status')
        }

        const data = await res.json()
        const approvalStatus = String(data?.approval_status || 'none').toLowerCase()
        const onboardingCompleted = Boolean(data?.onboarding_completed)

        if (!onboardingCompleted) {
          router.replace('/onboarding/influencer')
        } else if (approvalStatus === 'approved') {
          setIsApproved(true)
        } else if (approvalStatus === 'rejected') {
          router.replace('/onboarding/influencer?mode=resubmit')
        } else {
          router.replace('/influencer/pending')
        }
      } catch (error) {
        console.error('Error checking approval:', error)
        // On error, allow access (fail open) - server-side checks are primary
      } finally {
        setIsChecking(false)
      }
    }

    if (userId) {
      checkApproval()
    }
  }, [userId, router])

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-peach border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-charcoal/60">Checking approval status...</p>
        </div>
      </div>
    )
  }

  if (!isApproved) {
    return null // Redirecting
  }

  return <>{children}</>
}
