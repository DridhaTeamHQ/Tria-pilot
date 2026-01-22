'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { toast } from 'sonner'
import { Sparkles, ArrowRight, ArrowLeft, User, Building2, Camera, TrendingUp, Instagram, Youtube, Twitter, ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/auth-client'
import { getPublicSiteUrlClient, buildAuthConfirmUrl } from '@/lib/site-url'

type Role = 'INFLUENCER' | 'BRAND'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [role, setRole] = useState<Role | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSocials, setShowSocials] = useState(false)
  const [socials, setSocials] = useState({
    instagram: '',
    tiktok: '',
    youtube: '',
    twitter: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!role) {
      toast.error('Please select a role')
      return
    }
    if (!email.trim()) {
      toast.error('Please enter your email')
      return
    }
    if (!password || password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (role === 'INFLUENCER' && !name.trim()) {
      toast.error('Please enter your full name')
      return
    }
    if (role === 'BRAND' && !name.trim()) {
      toast.error('Please enter your company name')
      return
    }
    setLoading(true)

    try {
      const supabase = createClient()

      // Get the correct site URL for email redirects
      const siteUrl = getPublicSiteUrlClient()
      const redirectUrl = buildAuthConfirmUrl(siteUrl, '/login?confirmed=true')
      
      console.log('Registering user with redirect URL:', redirectUrl)
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          // After the user clicks the email confirmation link, Supabase will redirect here.
          // Ensure this URL is allowed in Supabase Auth Redirect URLs.
          emailRedirectTo: redirectUrl,
          // Also set data for custom email templates if needed
          data: {
            role: role,
            name: name.trim(),
          },
        },
      })

      if (authError) {
        // Handle specific Supabase errors
        let errorMessage = authError.message
        if (authError.message.includes('User already registered')) {
          errorMessage = 'An account with this email already exists. Please sign in instead.'
        } else if (authError.message.includes('Password')) {
          errorMessage = 'Password does not meet requirements. Please use a stronger password.'
        } else if (authError.message.includes('Email')) {
          errorMessage = 'Invalid email address. Please check and try again.'
        }
        throw new Error(errorMessage)
      }

      if (!authData.user) {
        throw new Error('Failed to create user account. Please try again.')
      }

      // Create user profile in database
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: authData.user.id,
          email: email.trim().toLowerCase(), // Normalize email
          role,
          name: name?.trim() || null,
        }),
      })

      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        let errorMessage = 'Registration failed. Please try again.'
        
        if (contentType && contentType.includes('application/json')) {
          try {
            const data = await response.json()
            errorMessage = data.error || errorMessage
          } catch {
            // If JSON parsing fails, use default message
          }
        }
        
        // If Supabase user was created but database registration failed,
        // we should still show success since the auth account exists
        // The user can complete their profile later
        if (response.status === 500 || response.status === 503) {
          toast.warning('Account created, but profile setup encountered an issue. Please sign in to complete your profile.')
          router.push('/login')
          return
        }
        
        throw new Error(errorMessage)
      }

      toast.success('Account created! Please check your email to confirm your account.')
      router.push('/login')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const roleCards = [
    {
      role: 'INFLUENCER' as Role,
      icon: Camera,
      title: 'Influencer',
      description: 'Create virtual try-ons, grow your portfolio, and connect with brands',
      features: ['AI Virtual Try-On', 'Portfolio Showcase', 'Brand Collaborations'],
    },
    {
      role: 'BRAND' as Role,
      icon: Building2,
      title: 'Brand',
      description: 'Discover influencers, manage products, and run campaigns',
      features: ['Influencer Discovery', 'Campaign Management', 'Ad Generation'],
    },
  ]

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
          <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[80%] bg-peach/40 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[70%] h-[70%] bg-orange-200/40 rounded-full blur-[100px]" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16">
          <Link href="/" className="text-4xl font-serif font-bold text-charcoal mb-8">
            Kiwikoo
          </Link>
          <h1 className="text-5xl font-serif text-charcoal leading-tight mb-6">
            Start your <br />
            <span className="italic">fashion journey</span>
          </h1>
          <p className="text-lg text-charcoal/70 max-w-md">
            Join thousands of influencers and brands revolutionizing fashion with AI-powered virtual try-ons.
          </p>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-2 gap-6">
            {[
              { value: '10K+', label: 'Influencers' },
              { value: '500+', label: 'Brands' },
              { value: '1M+', label: 'Try-Ons Generated' },
              { value: '98%', label: 'Satisfaction' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="text-charcoal"
              >
                <p className="text-3xl font-serif font-bold">{stat.value}</p>
                <p className="text-sm text-charcoal/60">{stat.label}</p>
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
        <div className="w-full max-w-lg">
          {/* Mobile Logo */}
          <Link href="/" className="lg:hidden text-3xl font-serif font-bold text-charcoal mb-8 block">
            Kiwikoo
          </Link>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-3xl font-serif text-charcoal mb-2">Join Kiwikoo</h2>
                <p className="text-charcoal/60 mb-8">Choose how you want to use Kiwikoo</p>

                <div className="space-y-4">
                  {roleCards.map((card) => {
                    const Icon = card.icon
                    const isSelected = role === card.role
                    return (
                      <motion.button
                        key={card.role}
                        type="button"
                        onClick={() => setRole(card.role)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full p-6 rounded-2xl border-2 text-left transition-all ${isSelected
                            ? 'border-charcoal bg-charcoal/5'
                            : 'border-subtle hover:border-charcoal/30 bg-white/50'
                          }`}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={`p-3 rounded-xl ${isSelected ? 'bg-charcoal text-cream' : 'bg-cream text-charcoal'
                              }`}
                          >
                            <Icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold text-charcoal mb-1">{card.title}</h3>
                            <p className="text-sm text-charcoal/60 mb-3">{card.description}</p>
                            <div className="flex flex-wrap gap-2">
                              {card.features.map((feature) => (
                                <span
                                  key={feature}
                                  className="px-2 py-1 text-xs bg-cream rounded-full text-charcoal/70"
                                >
                                  {feature}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>

                <motion.button
                  type="button"
                  onClick={() => role && setStep(2)}
                  disabled={!role}
                  whileHover={{ scale: role ? 1.02 : 1 }}
                  whileTap={{ scale: role ? 0.98 : 1 }}
                  className="w-full mt-8 py-4 bg-charcoal text-cream font-medium rounded-full flex items-center justify-center gap-2 hover:bg-charcoal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </motion.button>

                <p className="mt-6 text-center text-charcoal/60">
                  Already have an account?{' '}
                  <Link href="/login" className="text-charcoal font-medium hover:underline">
                    Sign in
                  </Link>
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 text-charcoal/60 hover:text-charcoal mb-6 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>

                <h2 className="text-3xl font-serif text-charcoal mb-2">Create your account</h2>
                <p className="text-charcoal/60 mb-8">
                  Signing up as {role === 'INFLUENCER' ? 'an Influencer' : 'a Brand'}
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="name" className="block text-sm font-medium text-charcoal">
                      {role === 'BRAND' ? 'Company Name' : 'Full Name'}
                    </label>
                    <input
                      id="name"
                      type="text"
                      placeholder={role === 'BRAND' ? 'Your company name' : 'Your full name'}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-subtle bg-white/50 text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-peach/50 focus:border-peach transition-all"
                    />
                  </div>

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
                      minLength={8}
                      className="w-full px-4 py-3 rounded-xl border border-subtle bg-white/50 text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-peach/50 focus:border-peach transition-all"
                    />
                    <p className="text-xs text-charcoal/50">Minimum 8 characters</p>
                  </div>

                  {/* Optional Social Media - Only for Influencers */}
                  {role === 'INFLUENCER' && (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => setShowSocials(!showSocials)}
                        className="w-full flex items-center justify-between text-sm text-charcoal/60 hover:text-charcoal transition-colors"
                      >
                        <span>Add Social Media (Optional)</span>
                        {showSocials ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {showSocials && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3 p-4 bg-cream/50 rounded-xl border border-subtle"
                        >
                          <p className="text-xs text-charcoal/50">
                            You can add or update these later in your profile
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs text-charcoal/60 flex items-center gap-1">
                                <Instagram className="w-3 h-3" />
                                Instagram
                              </label>
                              <input
                                type="text"
                                placeholder="@username"
                                value={socials.instagram}
                                onChange={(e) => setSocials({ ...socials, instagram: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-subtle bg-white/50 text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-peach/50 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-charcoal/60 flex items-center gap-1">
                                <span className="w-3 h-3 bg-black rounded text-white text-[8px] flex items-center justify-center font-bold">TT</span>
                                TikTok
                              </label>
                              <input
                                type="text"
                                placeholder="@username"
                                value={socials.tiktok}
                                onChange={(e) => setSocials({ ...socials, tiktok: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-subtle bg-white/50 text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-peach/50 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-charcoal/60 flex items-center gap-1">
                                <Youtube className="w-3 h-3 text-red-600" />
                                YouTube
                              </label>
                              <input
                                type="text"
                                placeholder="Channel name"
                                value={socials.youtube}
                                onChange={(e) => setSocials({ ...socials, youtube: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-subtle bg-white/50 text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-peach/50 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-charcoal/60 flex items-center gap-1">
                                <Twitter className="w-3 h-3" />
                                Twitter/X
                              </label>
                              <input
                                type="text"
                                placeholder="@username"
                                value={socials.twitter}
                                onChange={(e) => setSocials({ ...socials, twitter: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-subtle bg-white/50 text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-peach/50 text-sm"
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}

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
                        Creating account...
                      </span>
                    ) : (
                      <>
                        Create account
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </motion.button>
                </form>

                <p className="mt-6 text-center text-xs text-charcoal/50">
                  By creating an account, you agree to our Terms of Service and Privacy Policy
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
