'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, Mail, Shield, Sparkles, Save, Lock } from 'lucide-react'
import { useUser } from '@/lib/react-query/hooks'

// Reusing Brutalist components for consistency
function BrutalCard({ children, className = '', title }: { children: React.ReactNode, className?: string, title?: string }) {
  return (
    <div className={`bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 relative ${className}`}>
      {title && (
        <div className="absolute -top-4 left-6 bg-white px-4 border-[3px] border-black text-sm font-bold uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          {title}
        </div>
      )}
      {children}
    </div>
  )
}

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
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
        <div className="text-center">
          <p className="text-black/60 mb-4 font-bold">Please sign in to access settings.</p>
          <Link href="/login" className="text-black font-black uppercase tracking-wide hover:underline border-[3px] border-black px-6 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] pt-28 pb-20">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="mb-12">
          <Link href="/profile" className="inline-flex items-center gap-2 text-black font-bold uppercase tracking-wide mb-6 hover:translate-x-[-4px] transition-transform">
            <ArrowLeft className="w-5 h-5" />
            Back to profile
          </Link>
          <h1 className="text-5xl font-black text-black uppercase mb-2">Settings</h1>
          <p className="text-lg font-bold text-black/60 border-l-[4px] border-[#FFD93D] pl-4">
            Manage your account security and preferences
          </p>
        </div>

        <BrutalCard title="Account Security">
          <div className="flex items-start gap-6 mb-8">
            <div className="w-16 h-16 border-[3px] border-black bg-[#FFD93D] flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <Lock className="w-8 h-8 text-black" />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase">Email Address</h2>
              <p className="text-black/70 font-medium">Update the email address associated with your account.</p>
            </div>
          </div>

          <form onSubmit={handleChangeEmail} className="space-y-6 max-w-xl">
            <div className="space-y-2">
              <label htmlFor="newEmail" className="block text-sm font-bold uppercase tracking-wide text-black">
                New Email Address
              </label>
              <div className="relative">
                <input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-[3px] border-black text-black font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all placeholder:text-black/30"
                />
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/40" />
              </div>
              <p className="text-xs font-bold text-black/50 uppercase tracking-wide">
                We'll send a confirmation link to your new address.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-bold uppercase tracking-wide text-black">
                Current Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-white border-[3px] border-black text-black font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all placeholder:text-black/30"
                />
                <Shield className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/40" />
              </div>
              <p className="text-xs font-bold text-black/50 uppercase tracking-wide">
                Required to verify your identity.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 bg-black text-white font-black uppercase tracking-wider border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                    <Sparkles className="w-5 h-5" />
                  </motion.div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>
          </form>
        </BrutalCard>
      </div>
    </div>
  )
}
