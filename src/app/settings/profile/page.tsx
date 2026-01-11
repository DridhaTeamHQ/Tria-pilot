'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, Mail, Shield, Sparkles } from 'lucide-react'
import { useUser } from '@/lib/react-query/hooks'

export default function SettingsProfilePage() {
  const { data: user, isLoading } = useUser()
  const [newEmail, setNewEmail] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user?.email) setNewEmail(user.email)
  }, [user?.email])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('email_changed') === 'true') {
      toast.success('Email confirmed! Your sign-in email has been updated.')
    }
  }, [])

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail.trim()) {
      toast.error('Please enter an email address')
      return
    }
    if (!password) {
      toast.error('Please confirm your password')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/auth/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail: newEmail.trim().toLowerCase(), password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to request email change')

      toast.success('Email change requested. Please check your inbox to confirm the new email.')
      setPassword('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change email')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-peach border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-charcoal/60">Loading settings...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <p className="text-charcoal/60 mb-4">Please sign in to access settings.</p>
          <Link href="/login" className="text-charcoal font-medium hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="container mx-auto px-6 py-12">
        <div className="mb-8">
          <Link href="/profile" className="inline-flex items-center gap-2 text-charcoal/70 hover:text-charcoal">
            <ArrowLeft className="w-4 h-4" />
            Back to profile
          </Link>
          <h1 className="text-4xl font-serif font-bold text-charcoal mt-4 mb-2">Settings</h1>
          <p className="text-charcoal/60">Manage your account details</p>
        </div>

        <div className="bg-white rounded-2xl border border-charcoal/10 p-8 max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-peach/20 flex items-center justify-center">
              <Mail className="w-6 h-6 text-peach" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-charcoal">Email</h2>
              <p className="text-sm text-charcoal/60">Change the email you use to sign in</p>
            </div>
          </div>

          <form onSubmit={handleChangeEmail} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="newEmail" className="block text-sm font-medium text-charcoal">
                New email address
              </label>
              <input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-subtle bg-white/50 text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-peach/50 focus:border-peach transition-all"
              />
              <p className="text-xs text-charcoal/50">You’ll need to confirm this email via a link we send you.</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-charcoal">
                Confirm password
              </label>
              <div className="relative">
                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/40" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-subtle bg-white/50 text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-peach/50 focus:border-peach transition-all"
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={saving}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 bg-charcoal text-cream font-medium rounded-full flex items-center justify-center gap-2 hover:bg-charcoal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                    <Sparkles className="w-5 h-5" />
                  </motion.div>
                  Saving...
                </span>
              ) : (
                <>
                  Save changes
                  <Sparkles className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </form>
        </div>
      </div>
    </div>
  )
}

