'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, LayoutGroup } from 'framer-motion'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowRight, Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/auth-client'

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F9F8F4]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#FF8C69] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-black/60 font-medium">Loading...</p>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [userType, setUserType] = useState<'influencer' | 'brand'>('influencer')

  useEffect(() => {
    const from = searchParams.get('from')
    if (from === 'brand') {
      setUserType('brand')
    }
  }, [searchParams])

  const bgImage = userType === 'influencer'
    ? '/assets/auth-bg-influencer.png'
    : '/assets/auth-bg-brand.png'

  const isLayoutFlipped = userType === 'brand'

  useEffect(() => {
    const confirmed = searchParams.get('confirmed')
    const error = searchParams.get('error')
    if (confirmed === 'true') {
      toast.success('Email confirmed! You can now sign in.')
    } else if (error) {
      toast.error('Authentication error. Please try again.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()

      // Sign in with Supabase
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      if (signInError) throw signInError

      toast.success('Signed in successfully!')

      // CRITICAL: Always redirect to /dashboard
      // Dashboard will handle role-based routing
      window.location.href = '/dashboard'

    } catch (error: any) {
      console.error('Login error:', error)
      toast.error(error.message || 'Failed to sign in')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full relative flex overflow-hidden bg-[#F9F8F4]">
      {/* MOBILE BACKGROUND */}
      <div
        className="lg:hidden absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${bgImage}')` }}
      >
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm" />
      </div>

      {/* DESKTOP LAYOUT */}
      <LayoutGroup>
        <motion.div
          layout
          className={`hidden lg:flex w-full relative z-0 h-screen ${isLayoutFlipped ? 'flex-row-reverse' : 'flex-row'}`}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >

          {/* IMAGE SIDE */}
          <motion.div
            layout
            className="flex-1 relative overflow-hidden h-full"
          >
            <motion.div
              key={userType}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 bg-cover bg-no-repeat transition-all duration-700"
              style={{
                backgroundImage: `url('${bgImage}')`,
                backgroundPosition: isLayoutFlipped ? 'right center' : 'left center'
              }}
            />
          </motion.div>

          {/* FORM SIDE */}
          <motion.div
            layout
            className="w-full lg:w-[45%] xl:w-[40%] flex items-center justify-center p-6 lg:p-12 relative z-10 bg-transparent"
          >
            <motion.div
              layout
              className="w-full max-w-[400px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="mb-10">
                <h2 className="text-4xl font-black text-black mb-2 uppercase tracking-tight">
                  Sign In
                </h2>
                <p className="text-black/60 font-medium text-lg">
                  {userType === 'influencer' ? 'Welcome back Creator.' : 'Enter Brand Portal.'}
                </p>
              </div>

              {/* Role Switcher */}
              <div className="flex p-1 bg-white border-2 border-black mb-10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <button
                  onClick={() => setUserType('influencer')}
                  className={`flex-1 py-3 text-sm font-black uppercase tracking-wider transition-all border-r-2 border-black ${userType === 'influencer' ? 'bg-[#FF8C69] text-black' : 'text-black/40 hover:text-black hover:bg-gray-50'}`}
                >
                  Influencer
                </button>
                <button
                  onClick={() => setUserType('brand')}
                  className={`flex-1 py-3 text-sm font-black uppercase tracking-wider transition-all ${userType === 'brand' ? 'bg-[#B4F056] text-black' : 'text-black/40 hover:text-black hover:bg-gray-50'}`}
                >
                  Brand
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-black">Email Address</label>
                  <div className="relative group">
                    <div className={`absolute left-0 top-0 bottom-0 w-12 border-r-2 border-black flex items-center justify-center bg-white border-2 border-r-2 border-black z-10`}>
                      <Mail className="w-5 h-5 text-black" strokeWidth={2.5} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-16 pr-4 py-4 bg-white border-2 border-black text-black font-bold placeholder:text-black/30 outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                      placeholder="hello@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black uppercase tracking-widest text-black">Password</label>
                    <Link href="/forgot-password" className="text-xs font-bold underline decoration-2 hover:text-[#FF8C69]">Forgot?</Link>
                  </div>
                  <div className="relative group">
                    <div className={`absolute left-0 top-0 bottom-0 w-12 border-r-2 border-black flex items-center justify-center bg-white border-2 border-r-2 border-black z-10`}>
                      <Lock className="w-5 h-5 text-black" strokeWidth={2.5} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-16 pr-12 py-4 bg-white border-2 border-black text-black font-bold placeholder:text-black/30 outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-black/5 rounded-lg z-20"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5 text-black" /> : <Eye className="w-5 h-5 text-black" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-4 font-black text-lg uppercase tracking-wider border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2 ${userType === 'influencer' ? 'bg-[#FF8C69] hover:bg-[#ff9f80]' : 'bg-[#B4F056] hover:bg-[#c3f570]'}`}
                >
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-black" />
                  ) : (
                    <>
                      Sign In <ArrowRight className="w-6 h-6 text-black" strokeWidth={3} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-black/60 font-bold text-sm">
                  Don't have an account?{' '}
                  <Link href="/register" className="text-black underline decoration-2 hover:bg-[#FFD93D] transition-colors px-1">
                    Join Now
                  </Link>
                </p>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </LayoutGroup>
    </div>
  )
}
