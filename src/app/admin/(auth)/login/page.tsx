'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowRight, Shield, Sparkles } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { DecorativeShapes } from '@/components/brutal/onboarding/DecorativeShapes'

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-cream">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-peach border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-charcoal/60">Loading…</p>
          </div>
        </div>
      }
    >
      <AdminLoginContent />
    </Suspense>
  )
}

function AdminLoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const error = searchParams.get('error')
    const confirmed = searchParams.get('confirmed')
    if (error === 'not_admin') {
      toast.error('This account is not an admin.')
    }
    if (confirmed === 'true') {
      toast.success('Email confirmed! You can now sign in as admin.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast.error('Please enter email and password')
      return
    }

    setLoading(true)
    try {
      const normalizedEmail = email.trim().toLowerCase()
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password, rememberMe: true }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || 'Login failed')

      await queryClient.invalidateQueries({ queryKey: ['user'] })
      router.push('/admin')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-[#FDF6EC] font-sans overflow-hidden relative">
      <div className="lg:hidden absolute inset-0 z-0">
        <DecorativeShapes />
      </div>

      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="hidden lg:flex lg:w-1/2 relative border-r-[3px] border-black bg-[#FFD93D]/10 items-center justify-center p-12 overflow-hidden"
      >
        <DecorativeShapes />
        <div className="relative z-10 max-w-lg">
          <Link href="/" className="text-5xl font-black text-black mb-8 block font-serif tracking-tight">
            Kiwikoo
          </Link>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] w-fit mb-8">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-bold tracking-wider uppercase">Admin Portal</span>
          </div>
          <h1 className="text-6xl font-black text-black leading-none mb-6 font-serif">
            Command <br />
            <span className="italic text-[#FF8C69]">Center</span>
          </h1>
          <p className="text-xl text-black/80 font-medium border-l-4 border-black pl-6 py-2">
            Manage influencer approvals, monitor platform growth, and oversee operations with precision.
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="w-full lg:w-1/2 flex items-center justify-center px-8 py-12 relative z-10"
      >
        <div className="w-full max-w-md bg-white p-8 rounded-xl border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <Link href="/" className="lg:hidden text-4xl font-black text-black mb-8 block font-serif">
            Kiwikoo
          </Link>

          <h2 className="text-3xl font-black text-black mb-2 font-serif">Admin Access</h2>
          <p className="text-black/60 mb-8 font-medium">Enter your credentials to continue.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-bold text-black uppercase tracking-wide">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="admin@kiwikoo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border-2 border-black bg-[#FDF6EC] text-black placeholder:text-black/30 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:-translate-y-0.5 transition-all font-medium"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-bold text-black uppercase tracking-wide">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border-2 border-black bg-[#FDF6EC] text-black placeholder:text-black/30 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:-translate-y-0.5 transition-all font-medium"
              />
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 bg-[#B4F056] text-black font-black text-lg rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                    <Sparkles className="w-5 h-5" />
                  </motion.div>
                  Verifying...
                </span>
              ) : (
                <>
                  ENTER DASHBOARD
                  <ArrowRight className="w-6 h-6" strokeWidth={3} />
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-8 pt-6 border-t-2 border-black/10 flex flex-col gap-3 text-center">
            <p className="text-sm text-black/60 font-medium">
              Need access?{' '}
              <Link href="/admin/register" className="text-black font-bold underline decoration-2 underline-offset-2 hover:text-[#FF8C69] transition-colors">
                Create Account
              </Link>
            </p>
            <Link href="/login" className="text-xs text-black/40 font-bold uppercase tracking-wider hover:text-black transition-colors">
              ← Go to Regular Sign In
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

