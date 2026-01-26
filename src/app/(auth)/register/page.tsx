'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { toast } from 'sonner'
import { Sparkles, ArrowRight, Camera, Building2, Zap, Star, Users, Megaphone, Check } from 'lucide-react'
import { createClient } from '@/lib/auth-client'
import { getPublicSiteUrlClient, buildAuthConfirmUrl } from '@/lib/site-url'

type Role = 'INFLUENCER' | 'BRAND'

function RegisterPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // Check URL params for role preselection
  useEffect(() => {
    const roleParam = searchParams.get('role')
    if (roleParam === 'influencer') {
      setSelectedRole('INFLUENCER')
    } else if (roleParam === 'brand') {
      setSelectedRole('BRAND')
    }
  }, [searchParams])

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role)
  }

  const handleJoin = (role: Role) => {
    // Route to new premium signup pages
    const routeRole = role.toLowerCase()
    router.push(`/signup/${routeRole}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRole) {
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
    if (!name.trim()) {
      toast.error(selectedRole === 'BRAND' ? 'Please enter your company name' : 'Please enter your full name')
      return
    }
    setLoading(true)

    try {
      const supabase = createClient()
      const siteUrl = getPublicSiteUrlClient()
      const redirectUrl = buildAuthConfirmUrl(siteUrl, '/login?confirmed=true')

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            role: selectedRole,
            name: name.trim(),
          },
        },
      })

      if (authError) {
        let errorMessage = authError.message
        if (authError.message.includes('User already registered')) {
          errorMessage = 'An account with this email already exists. Please sign in instead.'
        }
        throw new Error(errorMessage)
      }

      if (!authData.user) {
        throw new Error('Failed to create user account. Please try again.')
      }

      const roleLowercase = selectedRole.toLowerCase() as 'influencer' | 'brand'

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: authData.user.id,
          email: email.trim().toLowerCase(),
          role: roleLowercase,
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

  // Stats data
  const stats = [
    { value: '10K+', label: 'Influencers', color: 'bg-green-500' },
    { value: '500+', label: 'Brands', color: 'bg-orange-500' },
    { value: '1M+', label: 'Try-Ons Generated', color: 'bg-purple-500' },
    { value: '98%', label: 'Satisfaction', color: 'bg-blue-500' },
  ]

  if (showForm) {
    // Form step
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{
          backgroundImage: `url('/assests/signup sign in background image.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-[#F9F8F4]/80" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md bg-white border-2 border-black rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-8"
        >
          <button
            onClick={() => setShowForm(false)}
            className="text-sm text-black/60 hover:text-black mb-4 flex items-center gap-1"
          >
            ← Back
          </button>

          <h2 className="text-2xl font-bold text-black mb-2">
            Create your account
          </h2>
          <p className="text-black/60 mb-6">
            Signing up as {selectedRole === 'INFLUENCER' ? 'an Influencer' : 'a Brand'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                {selectedRole === 'BRAND' ? 'Company Name' : 'Full Name'}
              </label>
              <input
                type="text"
                placeholder={selectedRole === 'BRAND' ? 'Your company name' : 'Your full name'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-black bg-white text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-black bg-white text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 rounded-xl border-2 border-black bg-white text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <p className="text-xs text-black/50 mt-1">Minimum 8 characters</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#FF8C69] text-black font-bold rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-black/50">
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex"
      style={{
        backgroundImage: `url('/assests/signup sign in background image.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* NO global overlay - neo-brutalist is bold */}

      {/* Left Side - Messaging & Stats */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 hidden lg:flex lg:w-1/2 flex-col justify-center px-16 py-8"
      >
        {/* Subtle warm gradient ONLY behind left text for readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#F9F8F4]/90 via-[#F9F8F4]/70 to-transparent" />
        {/* Logo - Moved up */}
        <Link href="/" className="relative z-10 text-3xl font-bold text-black mb-8 tracking-tight">
          Kiwikoo
        </Link>

        {/* Main Headline - Adjusted font weight */}
        <h1 className="relative z-10 text-5xl xl:text-6xl font-bold text-black leading-[1.1] mb-6">
          Start your<br />
          <span className="italic font-serif font-medium">fashion journey.</span>
        </h1>

        {/* Subtext */}
        <p className="relative z-10 text-lg text-black/80 max-w-md mb-12">
          Join thousands of influencers and brands revolutionizing fashion with AI-powered virtual try-ons.
        </p>

        {/* Stats Grid */}
        <div className="relative z-10 grid grid-cols-2 gap-6 max-w-sm">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="flex items-start gap-4"
            >
              <div className={`w-6 h-6 ${stat.color} rounded-full flex items-center justify-center mt-1 text-white shadow-sm`}>
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
              </div>
              <div>
                <p className="text-2xl font-bold text-black">{stat.value}</p>
                <p className="text-sm font-medium text-black/60">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Vertical Divider */}
      <div className="hidden lg:block w-px bg-black/10 relative z-10" />

      {/* Right Side - Role Selection Cards */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full lg:w-1/2 flex flex-col justify-center px-8 lg:px-16 py-12"
      >
        {/* Mobile Logo */}
        <Link href="/" className="lg:hidden text-2xl font-black text-black mb-8 tracking-tight">
          Kiwikoo
        </Link>

        <h2 className="text-3xl font-bold text-black mb-2">Join Kiwikoo</h2>
        <p className="text-black/60 mb-8">Select how you want to use Kiwikoo</p>

        {/* Influencer Card - Thinner border, cleaner look */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ y: -4, scale: 1.01 }}
          className={`relative bg-white border-2 border-black rounded-2xl p-6 mb-5 cursor-pointer transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.95)] ${selectedRole === 'INFLUENCER' ? 'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] -translate-y-1' : ''}`}
          onClick={() => handleRoleSelect('INFLUENCER')}
        >
          {/* Selected Indicator */}
          {selectedRole === 'INFLUENCER' && (
            <div className="absolute top-4 right-4 w-6 h-6 bg-[#B4F056] rounded-full border-2 border-black flex items-center justify-center">
              <Check className="w-4 h-4 text-black" />
            </div>
          )}

          <div className="flex items-start gap-5">
            {/* Icon - Thinner strokes, subtle color */}
            <div className="w-14 h-14 bg-[#FFF5EE] border-2 border-black rounded-2xl flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
              <Camera className="w-7 h-7 text-gray-800" strokeWidth={1.5} />
            </div>

            <div className="flex-1">
              <h3 className="text-xl font-bold text-black mb-1">Influencer</h3>
              <p className="text-sm text-black/60 mb-4">
                Create virtual try-ons, grow your portfolio, and connect with brands.
              </p>

              {/* Features */}
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="flex items-center gap-1.5 text-sm text-black/80">
                  <Zap className="w-4 h-4" />
                  AI Virtual Try-On
                </div>
                <div className="flex items-center gap-1.5 text-sm text-black/80">
                  <Star className="w-4 h-4" />
                  Portfolio Showcase
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleJoin('INFLUENCER')
                }}
                className="px-6 py-3 bg-[#FF8C69] text-black font-bold rounded-full border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2"
              >
                Join as Influencer
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Brand Card - Thinner border */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          whileHover={{ y: -4, scale: 1.01 }}
          className={`relative bg-white border-2 border-black rounded-2xl p-6 mb-8 cursor-pointer transition-all shadow-[5px_5px_0px_0px_rgba(0,0,0,0.85)] hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,0.95)] ${selectedRole === 'BRAND' ? 'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] -translate-y-1' : ''}`}
          onClick={() => handleRoleSelect('BRAND')}
        >
          {/* Selected Indicator */}
          {selectedRole === 'BRAND' && (
            <div className="absolute top-4 right-4 w-6 h-6 bg-[#B4F056] rounded-full border-2 border-black flex items-center justify-center">
              <Check className="w-4 h-4 text-black" />
            </div>
          )}

          <div className="flex items-start gap-5">
            {/* Icon - Thinner strokes */}
            <div className="w-14 h-14 bg-[#FFF5EE] border-2 border-black rounded-2xl flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
              <Building2 className="w-7 h-7 text-gray-800" strokeWidth={1.5} />
            </div>

            <div className="flex-1">
              <h3 className="text-xl font-bold text-black mb-1">Brand</h3>
              <p className="text-sm text-black/60 mb-4">
                Discover influencers, manage products, and run campaigns.
              </p>

              {/* Features */}
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="flex items-center gap-1.5 text-sm text-black/80">
                  <Users className="w-4 h-4" />
                  Influencer Discovery
                </div>
                <div className="flex items-center gap-1.5 text-sm text-black/80">
                  <Megaphone className="w-4 h-4" />
                  Campaign Management
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleJoin('BRAND')
                }}
                className="px-6 py-3 bg-[#FF8C69] text-black font-bold rounded-full border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2"
              >
                Join as Brand
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Sign In Link - Added pill background for visibility */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-1.5 px-6 py-3 bg-white border-2 border-black rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all">
            <span className="text-black/70 font-medium">Already have an account?</span>
            <Link href="/login" className="font-bold text-black border-b-2 border-black hover:text-[#FF8C69] transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// Wrap in Suspense for Next.js 15 static generation (useSearchParams requires it)
export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#FDF6EC]">
        <div className="w-16 h-16 border-[4px] border-[#FF8C69] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RegisterPageContent />
    </Suspense>
  )
}
