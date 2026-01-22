'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { createClient } from '@/lib/auth-client'
import { CheckCircle2, Clock, RefreshCw, ShieldAlert } from 'lucide-react'
import { useUser } from '@/lib/react-query/hooks'

type Status = 'pending' | 'approved' | 'rejected' | null

export default function InfluencerPendingPage() {
  const { data: user, isLoading } = useUser()
  const [status, setStatus] = useState<Status>(null)
  const [loading, setLoading] = useState(false)

  const supabase = useMemo(() => {
    return createClient()
  }, [])

  async function fetchStatus() {
    if (!user?.id) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('influencer_applications')
        .select('status')
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      setStatus((data?.status as Status) ?? null)

      if (data?.status === 'approved') {
        toast.success('You’re approved! Redirecting…')
        window.location.href = '/influencer/dashboard'
      }
    } catch (e) {
      console.error(e)
      toast.error('Could not load your approval status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id) fetchStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-peach border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-charcoal/60">Loading…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <p className="text-charcoal/60 mb-4">Please sign in to continue.</p>
          <Link href="/login" className="text-charcoal font-medium hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  const isRejected = status === 'rejected'
  const isPending = !status || status === 'pending'

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
                ? 'Your influencer application wasn’t approved. You can contact support for next steps.'
                : 'Your account is created, but influencer features are locked until an admin approves you.'}
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
                  Status:{' '}
                  <span className={isRejected ? 'text-red-600' : isPending ? 'text-peach' : 'text-green-600'}>
                    {status ?? 'pending'}
                  </span>
                </h2>
                <p className="text-charcoal/60 mt-1">
                  {isRejected
                    ? 'If you believe this is a mistake, reach out and we’ll review it.'
                    : 'You’ll receive an email once approved. Reviews typically complete within 24–48 hours.'}
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
                onClick={fetchStatus}
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

