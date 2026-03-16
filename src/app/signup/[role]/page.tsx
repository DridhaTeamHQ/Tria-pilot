'use client'

import React, { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Sparkles, User, Users, Zap } from 'lucide-react'
import { createClient } from '@/lib/auth-client'
import { getPublicSiteUrlClient } from '@/lib/site-url'

export default function SignupPage() {
  const router = useRouter()
  const params = useParams()
  const role = (params.role as string)?.toLowerCase() || 'influencer'
  const isInfluencer = role === 'influencer'

  const bgImage = isInfluencer
    ? '/assets/signup-influencer-background.png'
    : '/assets/signup-brand-background.png'
  const accentButtonClass = isInfluencer
    ? 'bg-[#FF8C69] hover:bg-[#ff9f80]'
    : 'bg-[#B4F056] hover:bg-[#c3f570]'
  const accentColor = isInfluencer ? '#FF8C69' : '#B4F056'

  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  })

  const features = isInfluencer
    ? [
        { icon: Sparkles, text: 'AI-powered try-on content', color: '#FF8C69' },
        { icon: Users, text: 'Brand-ready collaboration profile', color: '#B4F056' },
        { icon: Zap, text: 'Fast creator onboarding', color: '#FFD93D' },
      ]
    : [
        { icon: Users, text: 'Discover verified influencers', color: '#B4F056' },
        { icon: Sparkles, text: 'Generate polished campaign assets', color: '#FF8C69' },
        { icon: Zap, text: 'Launch products with less friction', color: '#FFD93D' },
      ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.agreeTerms) {
      toast.error('Please agree to the Terms of Service')
      return
    }
    if (formData.username.trim().length < 3) {
      toast.error('Username must be at least 3 characters')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: formData.username.trim().toLowerCase(),
          password: formData.password,
          role: isInfluencer ? 'INFLUENCER' : 'BRAND',
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Signup failed')
      }

      if (data?.requiresManualLogin) {
        toast.success('Account created. Please sign in.')
        router.push('/login')
        return
      }

      toast.success('Account created!')
      router.push('/dashboard')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signup failed'
      const normalized = message.toLowerCase()

      if (normalized.includes('already') || normalized.includes('exists')) {
        toast.error('Username already exists. Please sign in.')
      } else {
        toast.error(message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const siteUrl = getPublicSiteUrlClient()

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${siteUrl}/auth/callback?role=${role}`,
          queryParams: {
            prompt: 'select_account',
          },
        },
      })

      if (error) throw new Error(error.message)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Google signup failed')
      setLoading(false)
    }
  }

  const copy = isInfluencer
    ? {
        eyebrow: 'Influencer Sign Up',
        title: 'Welcome,',
        subtitle: 'sign up to continue',
        sideTitle: 'Build your creator front row',
        sideAccent: 'lookbook access',
        sideBody: 'Create a profile that feels premium from the first click, then move straight into products, try-ons, and collaborations.',
      }
    : {
        eyebrow: 'Brand Sign Up',
        title: 'Welcome,',
        subtitle: 'sign up to continue',
        sideTitle: 'Open your campaign command center',
        sideAccent: 'brand access',
        sideBody: 'Set up products, discover creators, and keep every launch in one place with a bold Kiwikoo workflow.',
      }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-x-hidden bg-[#F9F8F4]">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${bgImage}')` }}
      />
      <div className="absolute inset-0 bg-[#f9f8f4]/80 backdrop-blur-[2px]" />

      <div className="relative z-10 lg:hidden">
        <div className="flex min-h-[100dvh] items-center justify-center px-4 py-8">
          <SignupCard
            eyebrow={copy.eyebrow}
            title={copy.title}
            subtitle={copy.subtitle}
            formData={formData}
            setFormData={setFormData}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            showConfirmPassword={showConfirmPassword}
            setShowConfirmPassword={setShowConfirmPassword}
            handleSubmit={handleSubmit}
            handleGoogleSignup={handleGoogleSignup}
            loading={loading}
            accentButtonClass={accentButtonClass}
            isInfluencer={isInfluencer}
          />
        </div>
      </div>

      <div className="relative z-10 hidden min-h-[100dvh] lg:flex">
        <div className="relative flex min-h-[100dvh] w-[52%] items-end p-12 xl:p-16">
          <div className="max-w-xl rounded-[30px] border-[3px] border-black bg-[#ECE8E1]/92 p-8 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] backdrop-blur-sm">
            <div className="mb-4 inline-flex rounded-full border-[3px] border-black bg-white px-4 py-2 text-sm font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              {copy.eyebrow}
            </div>
            <h1 className="text-[clamp(2.5rem,4vw,4rem)] font-black uppercase leading-[0.95] text-black">
              {copy.sideTitle}
            </h1>
            <p className="mt-3 text-[clamp(1.4rem,2vw,2rem)] font-black italic leading-none" style={{ color: accentColor }}>
              {copy.sideAccent}
            </p>
            <p className="mt-5 text-lg font-semibold leading-relaxed text-black/68">
              {copy.sideBody}
            </p>

            <div className="mt-8 space-y-3">
              {features.map((feature) => (
                <div
                  key={feature.text}
                  className="flex items-center gap-3 rounded-2xl border-[3px] border-black bg-white px-4 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl border-[2px] border-black"
                    style={{ backgroundColor: feature.color }}
                  >
                    <feature.icon className="h-5 w-5 text-black" strokeWidth={2.5} />
                  </div>
                  <span className="font-bold text-black">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex w-[48%] items-center justify-center px-8 py-10 xl:px-14">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="w-full max-w-[440px]"
          >
            <SignupCard
              eyebrow={copy.eyebrow}
              title={copy.title}
              subtitle={copy.subtitle}
              formData={formData}
              setFormData={setFormData}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              showConfirmPassword={showConfirmPassword}
              setShowConfirmPassword={setShowConfirmPassword}
              handleSubmit={handleSubmit}
              handleGoogleSignup={handleGoogleSignup}
              loading={loading}
              accentButtonClass={accentButtonClass}
              isInfluencer={isInfluencer}
            />
          </motion.div>
        </div>
      </div>
    </div>
  )
}

type FormState = {
  username: string
  password: string
  confirmPassword: string
  agreeTerms: boolean
}

type SignupCardProps = {
  eyebrow: string
  title: string
  subtitle: string
  formData: FormState
  setFormData: React.Dispatch<React.SetStateAction<FormState>>
  showPassword: boolean
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>
  showConfirmPassword: boolean
  setShowConfirmPassword: React.Dispatch<React.SetStateAction<boolean>>
  handleSubmit: (e: React.FormEvent) => void
  handleGoogleSignup: () => void
  loading: boolean
  accentButtonClass: string
  isInfluencer: boolean
}

function SignupCard({
  eyebrow,
  title,
  subtitle,
  formData,
  setFormData,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  handleSubmit,
  handleGoogleSignup,
  loading,
  accentButtonClass,
  isInfluencer,
}: SignupCardProps) {
  return (
    <div className="rounded-[30px] border-[3px] border-black bg-[#ECE8E1]/95 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] backdrop-blur-sm sm:p-8">
      <div className="mb-3 inline-flex rounded-full border-[3px] border-black bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.22em] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        {eyebrow}
      </div>
      <div className="mb-6">
        <h2 className="text-[2.2rem] font-black leading-none text-black">{title}</h2>
        <p className="mt-1 text-base font-semibold text-black/65">{subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField label="Username" icon={<User className="h-4 w-4 text-black" strokeWidth={2.5} />} iconBg="#B4F056">
          <input
            type="text"
            placeholder="your username"
            value={formData.username}
            onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
            required
            className="h-14 w-full rounded-2xl border-[3px] border-black bg-white pl-16 pr-4 text-base font-semibold text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none transition-all placeholder:text-black/35 focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          />
        </AuthField>

        <AuthField label="Password" icon={<Lock className="h-4 w-4 text-black" strokeWidth={2.5} />} iconBg="#FFD93D">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="password"
            value={formData.password}
            onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
            required
            className="h-14 w-full rounded-2xl border-[3px] border-black bg-white pl-16 pr-12 text-base font-semibold text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none transition-all placeholder:text-black/35 focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-lg p-2 hover:bg-black/5"
          >
            {showPassword ? <EyeOff className="h-4 w-4 text-black" /> : <Eye className="h-4 w-4 text-black" />}
          </button>
        </AuthField>

        <AuthField label="Confirm Password" icon={<Lock className="h-4 w-4 text-black" strokeWidth={2.5} />} iconBg="#A78BFA">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="confirm password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            required
            className="h-14 w-full rounded-2xl border-[3px] border-black bg-white pl-16 pr-12 text-base font-semibold text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none transition-all placeholder:text-black/35 focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-lg p-2 hover:bg-black/5"
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4 text-black" /> : <Eye className="h-4 w-4 text-black" />}
          </button>
        </AuthField>

        <label className="flex items-start gap-3 rounded-2xl border-[3px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <span className="relative mt-0.5">
            <input
              type="checkbox"
              checked={formData.agreeTerms}
              onChange={(e) => setFormData((prev) => ({ ...prev, agreeTerms: e.target.checked }))}
              className="h-5 w-5 appearance-none rounded border-[2px] border-black bg-white checked:bg-[#B4F056]"
            />
            {formData.agreeTerms && (
              <svg className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </span>
          <span className="text-sm font-semibold leading-snug text-black/70">
            I agree to the <span className="font-black text-black">Terms</span> and <span className="font-black text-black">Privacy Policy</span>
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className={`flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-[3px] border-black font-black text-sm uppercase tracking-[0.18em] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${accentButtonClass}`}
        >
          {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Creating</> : <>Let&apos;s go <ArrowRight className="h-5 w-5" strokeWidth={2.5} /></>}
        </button>
      </form>

      <div className="mt-6">
        <p className="mb-3 text-center text-xs font-black uppercase tracking-[0.22em] text-black/45">Continue with</p>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={loading}
            className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Continue with Google"
          >
            <GoogleIcon className="h-6 w-6" />
          </button>
        </div>
      </div>

      <div className="mt-5 text-center">
        <p className="text-sm font-bold text-black/60">
          Already have an account?{' '}
          <Link href="/login" className="px-1 text-black underline decoration-2 transition-colors hover:bg-[#FFD93D]">
            Sign In
          </Link>
        </p>
        <p className="mt-2 text-xs font-semibold text-black/50">
          {isInfluencer ? 'Set up your creator profile in minutes.' : 'Get your brand workspace ready fast.'}
        </p>
      </div>
    </div>
  )
}

function AuthField({
  label,
  icon,
  iconBg,
  children,
}: {
  label: string
  icon: React.ReactNode
  iconBg: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-black uppercase tracking-[0.2em] text-black">{label}</label>
      <div className="relative">
        <div
          className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl border-[2px] border-black"
          style={{ backgroundColor: iconBg }}
        >
          {icon}
        </div>
        {children}
      </div>
    </div>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      <path d="M1 1h22v22H1z" fill="none" />
    </svg>
  )
}
