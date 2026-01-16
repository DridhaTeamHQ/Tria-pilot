'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { ArrowRight, Mail, Sparkles } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { getPublicSiteUrlClient, buildAuthConfirmUrl } from '@/lib/site-url'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const redirectTo = buildAuthConfirmUrl(getPublicSiteUrlClient(), '/reset-password')

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo,
      })

      if (error) throw new Error(error.message)

      toast.success('Password reset email sent! Please check your inbox.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reset email')
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
        <div className="absolute inset-0">
          <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[80%] bg-peach/40 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[70%] h-[70%] bg-orange-200/40 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-16">
          <Link href="/" className="text-4xl font-serif font-bold text-charcoal mb-8">
            Kiwikoo
          </Link>
          <h1 className="text-5xl font-serif text-charcoal leading-tight mb-6">
            Reset your <br />
            <span className="italic">password</span>
          </h1>
          <p className="text-lg text-charcoal/70 max-w-md">
            Enter your email and we’ll send a secure link to set a new password.
          </p>

          <div className="mt-12 space-y-4">
            {['Secure reset link', 'Fast and easy', 'Keep your account safe'].map((feature, index) => (
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
          <Link href="/" className="lg:hidden text-3xl font-serif font-bold text-charcoal mb-8 block">
            Kiwikoo
          </Link>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h2 className="text-3xl font-serif text-charcoal mb-2">Forgot password</h2>
            <p className="text-charcoal/60 mb-8">We’ll email you a link to reset it.</p>
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
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/40" />
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
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
                  Sending...
                </span>
              ) : (
                <>
                  Send reset link
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </motion.form>

          <p className="mt-8 text-center text-charcoal/60">
            Remembered your password?{' '}
            <Link href="/login" className="text-charcoal font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

