/**
 * INFLUENCER PENDING PAGE
 * 
 * Shows approval status for influencers.
 * Uses new auth state system - no legacy assumptions.
 */
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { CheckCircle2, Clock, RefreshCw, ShieldAlert } from 'lucide-react'
import { createClient } from '@/lib/auth-client'

type Status = 'draft' | 'pending' | 'approved' | 'rejected'

export default function InfluencerPendingPage() {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('pending')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStatus() {
      try {
        const supabase = createClient()
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (!authUser) {
          router.replace('/login')
          return
        }

        // Fetch from profiles table
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('approval_status, onboarding_completed')
          .eq('id', authUser.id)
          .single()

        if (error || !profile) {
          console.error('Error fetching profile:', error)
          setStatus('draft')
          setLoading(false)
          return
        }

        // Use exact approval_status value (no null handling)
        const approvalStatus = (profile.approval_status as Status) || 'draft'
        setStatus(approvalStatus)

        // If onboarding not completed → redirect (should be caught by layout, but defensive)
        if (!profile.onboarding_completed) {
          router.replace('/onboarding/influencer')
          return
        }

        // If approved → redirect to dashboard
        if (approvalStatus === 'approved') {
          toast.success("You're approved! Redirecting...")
          setTimeout(() => {
            router.replace('/dashboard')
          }, 1000)
          return
        }

        setLoading(false)
      } catch (error) {
        console.error('Error fetching status:', error)
        setStatus('draft')
        setLoading(false)
      }
    }

    fetchStatus()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-peach border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-charcoal/60">Loading…</p>
        </div>
      </div>
    )
  }

  const isRejected = status === 'rejected'
  const isPending = status === 'pending' || status === 'draft'

  return (
    <div className="min-h-screen bg-cream">
      <div className="container mx-auto px-6 py-14">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          <div className="text-center mb-10">
            <Link href="/" className="text-3xl font-serif font-bold text-charcoal">
              Kiwikoo
            </Link>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-charcoal mt-4">
              {isRejected ? 'Application rejected' : 'Approval in progress'}
            </h1>
            <p className="text-charcoal/60 mt-3">
              {isRejected
                ? "Your influencer application wasn't approved. You can contact support for next steps."
                : "Your account is created, but influencer features are locked until an admin approves you."}
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-charcoal/10 p-8">
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  isRejected ? 'bg-red-500/10' : 'bg-peach/20'
                }`}
              >
                {isRejected ? (
                  <ShieldAlert className="w-6 h-6 text-red-600" />
                ) : (
                  <Clock className="w-6 h-6 text-peach" />
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-charcoal">
                  Status: <span className={isRejected ? 'text-red-600' : 'text-peach'}>{status}</span>
                </h2>
                <p className="text-charcoal/60 mt-1">
                  {isRejected
                    ? "If you believe this is a mistake, reach out and we'll review it."
                    : "You'll receive an email once approved. Reviews typically complete within 24–48 hours."}
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                { title: 'Submit profile', detail: 'Complete onboarding and identity photos.' },
                { title: 'Admin review', detail: 'We check for authenticity and quality.' },
                { title: 'Get approved', detail: 'Unlock collaborations and try-on tools.' },
              ].map((stepItem) => (
                <div key={stepItem.title} className="rounded-2xl border border-charcoal/10 p-4 bg-cream/40">
                  <div className="font-semibold text-charcoal">{stepItem.title}</div>
                  <p className="text-sm text-charcoal/60 mt-1">{stepItem.detail}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => window.location.reload()}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-charcoal text-cream font-medium hover:bg-charcoal/90 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Check status
              </button>

              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-charcoal/15 text-charcoal font-medium hover:bg-charcoal/5"
              >
                Browse marketplace
              </Link>

              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-charcoal/15 text-charcoal font-medium hover:bg-charcoal/5"
              >
                Contact support
              </Link>
            </div>

            <div className="mt-8 p-5 rounded-2xl bg-cream/60 border border-charcoal/5">
              <div className="flex items-center gap-2 text-charcoal font-medium">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                What you can do now
              </div>
              <ul className="mt-3 text-sm text-charcoal/70 space-y-2">
                <li>- Browse the marketplace and explore products</li>
                <li>- Keep your profile details updated</li>
                <li>- Check this page for approval status</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
