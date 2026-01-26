'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowRight, Loader2, Mail, Lock, Eye, EyeOff, Sparkles, TrendingUp, Camera, ShoppingBag } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#FF8C69] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/60 font-medium">Loading...</p>
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
  const [showPassword, setShowPassword] = useState(false)

  // Determine which background to use
  const [userType, setUserType] = useState<'influencer' | 'brand'>('influencer')

  useEffect(() => {
    const from = searchParams.get('from')
    if (from === 'brand') {
      setUserType('brand')
    }
  }, [searchParams])

  const bgImage = userType === 'influencer'
    ? '/assets/login-influencer-background.png'
    : '/assets/login-brand-background.jpg'

  const features = userType === 'influencer'
    ? [
      { icon: Camera, text: 'Virtual Try-On Studio', color: '#FF8C69' },
      { icon: TrendingUp, text: 'Grow Your Influence', color: '#B4F056' },
      { icon: Sparkles, text: 'AI-Powered Content', color: '#FFD93D' },
    ]
    : [
      { icon: ShoppingBag, text: 'Product Campaigns', color: '#B4F056' },
      { icon: TrendingUp, text: 'Real-Time Analytics', color: '#FF8C69' },
      { icon: Sparkles, text: 'Smart Matching', color: '#FFD93D' },
    ]

  useEffect(() => {
    const confirmed = searchParams.get('confirmed')
    const error = searchParams.get('error')

    if (confirmed === 'true') {
      toast.success('Email confirmed! You can now sign in.')
      return
    }
    if (error === 'confirmation_failed') {
      toast.error('Confirmation link is invalid or expired.')
    }
    if (error === 'email_not_confirmed') {
      toast.error('Please verify your email address before signing in.', {
        duration: 6000,
        action: {
          label: 'Resend Email',
          onClick: async () => {
            const emailToResend = email.trim().toLowerCase()
            if (!emailToResend) {
              toast.error('Please enter your email address first')
              return
            }
            try {
              const res = await fetch('/api/auth/resend-confirmation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailToResend }),
              })
              const data = await res.json()
              if (res.ok) {
                toast.success('Confirmation email sent!')
              } else {
                toast.error(data.error || 'Failed to resend')
              }
            } catch {
              toast.error('Failed to resend confirmation email')
            }
          }
        }
      })
    }
  }, [searchParams, email])

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
      const normalizedEmail = email.trim().toLowerCase()

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password, rememberMe }),
      })

      const data = await response.json()

      if (data?.requiresProfile && data?.next) {
        toast.info('One-time setup required. Please complete your profile.')
        router.push(data.next)
        return
      }

      if (!response.ok) {
        if (response.status === 403 && data?.emailConfirmed === false) {
          toast.error(data.error || 'Please verify your email address.', {
            duration: 6000,
            action: {
              label: 'Resend Email',
              onClick: () => toast.info('Resend feature coming soon')
            }
          })
          return
        }

        if (data?.canResetPassword) {
          toast.error(data.error || 'Invalid password', {
            duration: 5000,
            action: {
              label: 'Reset Password',
              onClick: () => router.push('/forgot-password')
            }
          })
          return
        }

        throw new Error(data.error || 'Login failed')
      }

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
    <div className="min-h-screen w-full relative flex overflow-hidden">
      {/* BACKGROUND */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url('${bgImage}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Subtle vignette */}
      <div className="absolute inset-0 z-[1] pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.25)_100%)]" />

      {/* CONTENT CONTAINER */}
      <div className="relative z-10 w-full flex">

        {/* LEFT SIDE - Branding & Info */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-20 py-12">
          {/* Logo - Neo-brutal style */}
          <motion.div
            initial={{ opacity: 0, y: -20, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ duration: 0.6, type: "spring" }}
            className="mb-10"
          >
            <span className="inline-block px-4 py-2 bg-[#F9F8F4] text-2xl font-black text-black border-[3px] border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              Kiwikoo
            </span>
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mb-6"
          >
            <h1 className="text-5xl xl:text-6xl font-black text-white leading-[1.1] drop-shadow-[3px_3px_0px_rgba(0,0,0,0.8)]">
              Welcome<br />
              <span className="text-[#FF8C69] italic font-serif">back!</span>
            </h1>
          </motion.div>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg text-white/90 max-w-md mb-10 leading-relaxed font-medium drop-shadow-[1px_1px_0px_rgba(0,0,0,0.5)]"
          >
            {userType === 'influencer'
              ? 'Your fashion studio awaits. Continue creating stunning virtual try-ons.'
              : 'Your brand dashboard is ready. Track campaigns and connect with creators.'
            }
          </motion.p>

          {/* Features - Neo-brutal pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="space-y-3"
          >
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1, type: "spring" }}
                whileHover={{ x: 5, rotate: 1 }}
                className="inline-flex items-center gap-3 px-4 py-2.5 bg-[#F9F8F4] border-[3px] border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mr-2 cursor-default"
              >
                <div
                  className="w-8 h-8 flex items-center justify-center rounded-lg border-2 border-black"
                  style={{ backgroundColor: feature.color }}
                >
                  <feature.icon className="w-4 h-4 text-black" strokeWidth={2.5} />
                </div>
                <span className="font-bold text-black">{feature.text}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Stats badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-12 flex gap-4"
          >
            <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
              <span className="text-2xl font-black text-white">10K+</span>
              <p className="text-xs text-white/70 font-medium">Creators</p>
            </div>
            <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
              <span className="text-2xl font-black text-white">500+</span>
              <p className="text-xs text-white/70 font-medium">Brands</p>
            </div>
            <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
              <span className="text-2xl font-black text-white">1M+</span>
              <p className="text-xs text-white/70 font-medium">Try-Ons</p>
            </div>
          </motion.div>
        </div>

        {/* RIGHT SIDE - Form Card */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 lg:pr-12 xl:pr-20">
          <motion.div
            initial={{ opacity: 0, y: 40, rotate: 2 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.3 }}
            className="w-full max-w-[400px]"
          >
            {/* Neo-Brutal Card */}
            <div className="bg-[#F9F8F4] rounded-2xl p-8 border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              {/* Logo - Mobile only */}
              <motion.div
                initial={{ scale: 0.8, rotate: -5 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="text-center mb-2 lg:hidden"
              >
                <span className="inline-block px-3 py-1 bg-[#B4F056] text-lg font-black text-black border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  Kiwikoo
                </span>
              </motion.div>

              {/* Headline */}
              <div className="text-center mb-8">
                <h1 className="text-2xl font-black text-black leading-tight">
                  Sign in to<br />
                  <span className="text-[#FF8C69] italic font-serif text-3xl">your studio</span>
                </h1>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-bold text-black mb-1.5">Email</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#FF8C69] rounded-lg border-2 border-black flex items-center justify-center">
                      <Mail className="w-4 h-4 text-black" strokeWidth={2.5} />
                    </div>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-14 pr-4 py-3 rounded-xl bg-white border-[2px] border-black text-black placeholder:text-black/40 font-medium focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-bold text-black mb-1.5">Password</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#FFD93D] rounded-lg border-2 border-black flex items-center justify-center">
                      <Lock className="w-4 h-4 text-black" strokeWidth={2.5} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-14 pr-12 py-3 rounded-xl bg-white border-[2px] border-black text-black placeholder:text-black/40 font-medium focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-black/5 rounded-lg transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4 text-black/60" /> : <Eye className="w-4 h-4 text-black/60" />}
                    </button>
                  </div>
                </div>

                {/* Remember me & Forgot password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-black/80 cursor-pointer select-none">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-5 h-5 rounded border-2 border-black appearance-none bg-white checked:bg-[#B4F056] cursor-pointer transition-all"
                      />
                      {rememberMe && (
                        <svg className="absolute top-0.5 left-0.5 w-4 h-4 text-black pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="font-medium">Remember me</span>
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-black/60 font-medium hover:text-black hover:underline transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* CTA Button - Neo-brutal */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02, x: -2, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3.5 mt-2 bg-[#FF8C69] text-black rounded-xl font-black text-base flex items-center justify-center gap-2 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
                    </>
                  )}
                </motion.button>
              </form>

              {/* Sign Up Link */}
              <div className="mt-6 text-center">
                <p className="text-sm text-black/60">
                  Don&apos;t have an account?{' '}
                  <Link href="/register" className="text-black font-bold hover:underline">
                    Sign up
                  </Link>
                </p>
              </div>

              {/* Role switcher pills */}
              <div className="mt-4 flex justify-center gap-2">
                <button
                  onClick={() => setUserType('influencer')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border-2 border-black transition-all ${userType === 'influencer'
                      ? 'bg-[#FF8C69] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      : 'bg-white hover:bg-[#F9F8F4]'
                    }`}
                >
                  Influencer
                </button>
                <button
                  onClick={() => setUserType('brand')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border-2 border-black transition-all ${userType === 'brand'
                      ? 'bg-[#B4F056] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      : 'bg-white hover:bg-[#F9F8F4]'
                    }`}
                >
                  Brand
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
