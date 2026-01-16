'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowRight, Shield, Sparkles, KeyRound } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { getPublicSiteUrlClient, buildAuthConfirmUrl } from '@/lib/site-url'

export default function AdminRegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast.error('Please enter email and password')
      return
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (!code.trim()) {
      toast.error('Admin signup code is required')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const emailRedirectTo = buildAuthConfirmUrl(
        getPublicSiteUrlClient(),
        '/admin/login?confirmed=true'
      )

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { emailRedirectTo },
      })

      if (error) throw new Error(error.message)
      if (!data.user?.id) throw new Error('Failed to create admin user')

      const res = await fetch('/api/admin/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: data.user.id, code: code.trim() }),
      })
      const out = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(out?.error || 'Failed to grant admin access')

      toast.success('Admin account created! Please confirm your email, then sign in.')
      window.location.href = '/admin/login'
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create admin account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-cream">
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
      >
        <div className="absolute inset-0">
          <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-peach/40 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-orange-200/40 rounded-full blur-[100px]" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16">
          <Link href="/" className="text-4xl font-serif font-bold text-charcoal mb-8">
            Kiwikoo
          </Link>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 border border-charcoal/10 w-fit">
            <Shield className="w-4 h-4 text-charcoal" />
            <span className="text-xs font-semibold tracking-wider uppercase text-charcoal">Admin setup</span>
          </div>
          <h1 className="text-5xl font-serif text-charcoal leading-tight mt-6 mb-6">
            Create <br />
            <span className="italic">Admin</span>
          </h1>
          <p className="text-lg text-charcoal/70 max-w-md">Use the admin signup code to create an admin account.</p>
        </div>
      </motion.div>

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

          <h2 className="text-3xl font-serif text-charcoal mb-2">Admin registration</h2>
          <p className="text-charcoal/60 mb-8">Create a separate admin account (not influencer/brand).</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-charcoal">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-subtle bg-white/50 text-charcoal focus:outline-none focus:ring-2 focus:ring-peach/50 focus:border-peach transition-all"
                placeholder="admin@company.com"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-charcoal">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-subtle bg-white/50 text-charcoal focus:outline-none focus:ring-2 focus:ring-peach/50 focus:border-peach transition-all"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-charcoal">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-subtle bg-white/50 text-charcoal focus:outline-none focus:ring-2 focus:ring-peach/50 focus:border-peach transition-all"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-charcoal">Admin signup code</label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/40" />
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-subtle bg-white/50 text-charcoal focus:outline-none focus:ring-2 focus:ring-peach/50 focus:border-peach transition-all"
                  placeholder="Enter admin code"
                />
              </div>
              <p className="text-xs text-charcoal/50">This prevents random users from creating admin accounts.</p>
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
                  Creating…
                </span>
              ) : (
                <>
                  Create admin
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </form>

          <p className="mt-8 text-center text-charcoal/60">
            Already have an admin account?{' '}
            <Link href="/admin/login" className="text-charcoal font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

