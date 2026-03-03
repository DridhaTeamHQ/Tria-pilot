'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowRight, Lock, Sparkles } from 'lucide-react'

export default function ResetPasswordClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // Optional: if user lands here directly from an email link, we can pass through token_hash/type
  // (Preferred path is /auth/confirm which verifies OTP then redirects here.)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          token_hash,
          type,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to reset password')
      }

      toast.success('Password updated! Please sign in.')
      router.push('/login')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-cream">
      {/* Left Side */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
      >
        <div className="absolute inset-0">
          <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[80%] bg-peach/40 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[70%] h-[70%] bg-orange-200/40 rounded-full blur-[100px]" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16">
          <Link href="/" className="text-4xl font-serif font-bold text-charcoal mb-8">
            Kiwikoo
          </Link>
          <h1 className="text-5xl font-serif text-charcoal leading-tight mb-6">
            Set a new <br />
            <span className="italic">password</span>
          </h1>
          <p className="text-lg text-charcoal/70 max-w-md">Choose a strong password to protect your account.</p>
        </div>
      </motion.div>

      {/* Right Side - Form */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="w-full lg:w-1/2 flex items-center justify-center px-8 py-12"
      >
        <div className="w-full max-w-md">
          <Link href="/" className="lg:hidden text-3xl font-serif font-bold text-charcoal mb-8 block">
            Kiwikoo
          </Link>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h2 className="text-3xl font-serif text-charcoal mb-2">Reset password</h2>
            <p className="text-charcoal/60 mb-8">Enter your new password below.</p>
          </motion.div>

          <motion.form
            onSubmit={handleSubmit}
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-charcoal">
                New password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/40" />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-subtle bg-white/50 text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-peach/50 focus:border-peach transition-all"
                />
              </div>
              <p className="text-xs text-charcoal/50">Minimum 8 characters</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-charcoal">
                Confirm password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/40" />
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-subtle bg-white/50 text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-peach/50 focus:border-peach transition-all"
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 bg-charcoal text-cream font-medium rounded-full flex items-center justify-center gap-2 hover:bg-charcoal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                    <Sparkles className="w-5 h-5" />
                  </motion.div>
                  Updating...
                </span>
              ) : (
                <>
                  Update password
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </motion.form>

          <p className="mt-8 text-center text-charcoal/60">
            Back to{' '}
            <Link href="/login" className="text-charcoal font-medium hover:underline">
              sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

