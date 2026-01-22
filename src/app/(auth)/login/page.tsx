'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { toast } from 'sonner'
import { Sparkles, ArrowRight } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-cream">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-peach border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-charcoal/60">Loading...</p>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  useEffect(() => {
    const confirmed = searchParams.get('confirmed')
    const error = searchParams.get('error')

    if (confirmed === 'true') {
      toast.success('Email confirmed! You can now sign in.')
      return
    }
    if (error === 'confirmation_failed') {
      toast.error('Confirmation link is invalid or expired. Please try signing up again.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      toast.error('Please enter your email')
      return
    }
    if (!password) {
      toast.error('Please enter your password')
      return
    }

    setLoading(true)

    try {
      // Normalize email on client side too
      const normalizedEmail = email.trim().toLowerCase()

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password, rememberMe }),
      })

      const data = await response.json()

      // Handle users that exist in Supabase but not in Prisma
      if (data?.requiresProfile && data?.next) {
        toast.info('One-time setup required. Please complete your profile.')
        router.push(data.next)
        return
      }

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      // Invalidate and refetch user data immediately
      await queryClient.invalidateQueries({ queryKey: ['user'] })

      toast.success('Welcome back! 🎉')
      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      toast.error(errorMessage, {
        duration: 4000,
        position: 'top-center',
      })
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen flex bg-cream">
      {/* Left Side - Branding */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
      >
        {/* Gradient Background */}
        <div className="absolute inset-0">
          <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-peach/40 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-orange-200/40 rounded-full blur-[100px]" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16">
          <Link href="/" className="text-4xl font-serif font-bold text-charcoal mb-8">
            Kiwikoo
          </Link>
          <h1 className="text-5xl font-serif text-charcoal leading-tight mb-6">
            Welcome back to <br />
            <span className="italic">your fashion studio</span>
          </h1>
          <p className="text-lg text-charcoal/70 max-w-md">
            Continue creating stunning virtual try-ons and connecting with brands that match your style.
          </p>

          {/* Feature List */}
          <div className="mt-12 space-y-4">
            {[
              'AI-powered virtual try-on',
              'Connect with top brands',
              'Grow your influence',
            ].map((feature, index) => (
              <motion.div
                key={feature}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="flex items-center gap-3 text-charcoal/80"
              >
                <Sparkles className="w-5 h-5 text-peach" />
                <span>{feature}</span>
              </motion.div>
            ))}
          </div>
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
          {/* Mobile Logo */}
          <Link href="/" className="lg:hidden text-3xl font-serif font-bold text-charcoal mb-8 block">
            Kiwikoo
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-3xl font-serif text-charcoal mb-2">Sign in</h2>
            <p className="text-charcoal/60 mb-8">
              Enter your credentials to access your account
            </p>
          </motion.div>

          <motion.form
            onSubmit={handleSubmit}
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-charcoal">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-subtle bg-white/50 text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-peach/50 focus:border-peach transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-charcoal">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-subtle bg-white/50 text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-peach/50 focus:border-peach transition-all"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-charcoal/70 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-subtle accent-charcoal"
                />
                Remember me
              </label>

              <Link href="/forgot-password" className="text-sm text-charcoal hover:underline">
                Forgot password?
              </Link>
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
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="w-5 h-5" />
                  </motion.div>
                  Signing in...
                </span>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </motion.form>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 text-center text-charcoal/60"
          >
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-charcoal font-medium hover:underline">
              Create one
            </Link>
          </motion.p>

          <p className="mt-4 text-center text-xs text-charcoal/40">
            Admin?{' '}
            <Link href="/admin/login" className="text-charcoal/70 hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
