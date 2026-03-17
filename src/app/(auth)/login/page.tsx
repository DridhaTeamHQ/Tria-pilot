'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, LayoutGroup } from 'framer-motion'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import { createClient } from '@/lib/auth-client'
import { getPublicSiteUrlClient } from '@/lib/site-url'
import { isSyntheticEmail } from '@/lib/auth-username'

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F9F8F4]">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#FF8C69] border-t-transparent" />
            <p className="font-medium text-black/60">Loading...</p>
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
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [showRecoveryEmailInput, setShowRecoveryEmailInput] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [userType, setUserType] = useState<'influencer' | 'brand'>('influencer')

  const getSafeRedirectTarget = () => {
    const redirectTarget = searchParams.get('redirect') || '/dashboard'
    return redirectTarget.startsWith('/admin') ? '/dashboard' : redirectTarget
  }

  useEffect(() => {
    const from = searchParams.get('from')
    if (from === 'brand') {
      setUserType('brand')
    }
  }, [searchParams])

  useEffect(() => {
    const confirmed = searchParams.get('confirmed')
    const error = searchParams.get('error')
    const details = searchParams.get('details')
    const requestedRole = searchParams.get('requested')
    const actualRole = searchParams.get('actual')

    if (confirmed === 'true') {
      toast.success('Email confirmed! You can now sign in.')
    } else if (error === 'role_mismatch') {
      const requestedLabel = requestedRole === 'brand' ? 'brand' : 'influencer'
      const actualLabel = actualRole === 'brand' ? 'brand' : 'influencer'
      toast.error(`This Google account is already linked to a ${actualLabel} account. Use the ${actualLabel} login or a different Google account for ${requestedLabel}.`)
    } else if (error) {
      toast.error(`Authentication error: ${details || 'Please try again.'}`)
    }
  }, [searchParams])

  const accentColor = userType === 'influencer' ? '#FF8C69' : '#B4F056'
  const accentButtonClass = userType === 'influencer'
    ? 'bg-[#FF8C69] hover:bg-[#ff9f80]'
    : 'bg-[#B4F056] hover:bg-[#c3f570]'
  const patternSurfaceClass = userType === 'influencer'
    ? 'bg-[radial-gradient(circle_at_12%_18%,rgba(255,140,105,0.16),transparent_18%),radial-gradient(circle_at_82%_16%,rgba(255,217,61,0.12),transparent_20%),radial-gradient(circle_at_68%_76%,rgba(255,140,105,0.10),transparent_18%),linear-gradient(180deg,#fffdf8_0%,#fbf6ee_100%)]'
    : 'bg-[radial-gradient(circle_at_12%_18%,rgba(180,240,86,0.18),transparent_18%),radial-gradient(circle_at_82%_18%,rgba(255,217,61,0.12),transparent_20%),radial-gradient(circle_at_70%_78%,rgba(180,240,86,0.10),transparent_18%),linear-gradient(180deg,#fffdf8_0%,#f7f3e8_100%)]'
  const panelCopy = userType === 'influencer'
    ? {
        title: 'Welcome,',
        subtitle: 'sign in to continue',
        sideTitle: 'Come back to the studio',
        sideAccent: 'creator mode',
        sideBody: 'Access try-ons, campaign requests, and your creator dashboard without losing the playful Kiwikoo energy.',
      }
    : {
        title: 'Welcome,',
        subtitle: 'sign in to continue',
        sideTitle: 'Step back into the brand suite',
        sideAccent: 'campaign mode',
        sideBody: 'Launch products, manage collaborations, and review generated assets from one bold control room.',
      }
  const floatingLabel = userType === 'influencer' ? 'Influencer Login' : 'Brand Login'

  const isLayoutFlipped = userType === 'brand'
  const isUsernameEntry = Boolean(identifier.trim()) && !identifier.includes('@')

  const waitForServerSession = async () => {
    for (let i = 0; i < 10; i++) {
      const meRes = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (meRes.ok) {
        const meData = await meRes.json().catch(() => null)
        if (meData?.user) return meData.user
      }
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          identifier: identifier.trim().toLowerCase(),
          password,
          rememberMe: true,
        }),
      })

      const data = await res.json().catch(() => ({ error: 'Request failed' }))

      if (!res.ok) {
        if (data?.noUserFound || data?.errorCode === 'USER_NOT_FOUND') {
          toast.error('No user found with this username/email. Please sign up first.')
          return
        }

        toast.error(data.error ?? 'Failed to sign in. Please try again.')
        return
      }

      const sessionUser = await waitForServerSession()
      const redirectTarget = getSafeRedirectTarget()
      const normalizedRecoveryEmail = recoveryEmail.trim().toLowerCase()

      if (sessionUser && isSyntheticEmail(sessionUser.email) && normalizedRecoveryEmail) {
        const recoveryRes = await fetch('/api/auth/change-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newEmail: normalizedRecoveryEmail, password }),
        })

        const recoveryData = await recoveryRes.json().catch(() => ({}))
        if (recoveryRes.ok) {
          toast.success('Signed in. Check both inboxes to confirm your recovery email.')
        } else {
          toast.error(recoveryData?.error || 'Signed in, but we could not start recovery email setup.')
        }
      } else {
        toast.success('Signed in successfully!')
      }

      if (typeof window !== 'undefined') {
        window.location.assign(redirectTarget)
        return
      }

      if (sessionUser) {
        router.replace(redirectTarget)
      } else {
        router.replace('/dashboard')
      }
    } catch (error: unknown) {
      console.error('Login error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const supabase = createClient()
      const siteUrl = getPublicSiteUrlClient()
      const redirectTarget = getSafeRedirectTarget()
      const callbackUrl = new URL('/auth/callback', siteUrl)
      callbackUrl.searchParams.set('next', redirectTarget)
      callbackUrl.searchParams.set('role', userType)

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl.toString(),
          queryParams: {
            prompt: 'select_account',
          },
        },
      })

      if (error) {
        toast.error('Failed to initialize Google Sign In.')
      }
    } catch (error) {
      console.error('Google login error:', error)
      toast.error('An error occurred during Google Sign In.')
    }
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-x-hidden bg-[#F9F8F4]">
      <div className={`absolute inset-0 ${patternSurfaceClass}`} />
      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] [background-size:34px_34px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(255,217,61,0.18),transparent_22%),radial-gradient(circle_at_86%_18%,rgba(255,140,105,0.14),transparent_18%),radial-gradient(circle_at_70%_80%,rgba(180,240,86,0.14),transparent_20%)]" />

      <div className="relative z-10 lg:hidden">
        <div className="flex min-h-[100dvh] items-center justify-center px-4 py-8">
          <AuthCardShell floatingLabel={floatingLabel} accentColor={accentColor}>
            <AuthCard
              title={panelCopy.title}
              subtitle={panelCopy.subtitle}
              userType={userType}
              onUserTypeChange={setUserType}
              identifier={identifier}
              onIdentifierChange={setIdentifier}
              password={password}
              onPasswordChange={setPassword}
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword((prev) => !prev)}
              loading={loading}
              handleSubmit={handleSubmit}
              isUsernameEntry={isUsernameEntry}
              showRecoveryEmailInput={showRecoveryEmailInput}
              onToggleRecoveryEmail={() => setShowRecoveryEmailInput((prev) => !prev)}
              recoveryEmail={recoveryEmail}
              onRecoveryEmailChange={setRecoveryEmail}
              handleGoogleLogin={handleGoogleLogin}
              accentButtonClass={accentButtonClass}
            />
          </AuthCardShell>
        </div>
      </div>

      <LayoutGroup>
        <motion.div
          layout
          className={`relative z-10 hidden w-full lg:flex lg:min-h-[100dvh] lg:px-4 lg:py-8 xl:px-6 xl:py-10 ${isLayoutFlipped ? 'flex-row-reverse' : 'flex-row'}`}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            layout
            className="relative hidden overflow-hidden lg:block lg:w-[50%] xl:w-[54%]"
          >
            <motion.div
              key={userType}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            />
            <motion.div
              className="absolute left-[4%] top-[8%] h-[68%] w-[72%] rounded-[42px] border border-black/6 bg-white/16 blur-[1px]"
              animate={{ y: [0, -10, 0], x: [0, 6, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute right-[8%] top-[8%] h-[42%] w-[28%] rounded-[36px] border border-black/5 bg-white/14"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute left-[10%] top-[16%] h-[clamp(10rem,18vw,15rem)] w-[clamp(10rem,18vw,15rem)] rounded-full border-[5px] border-black/65 bg-[radial-gradient(circle,rgba(255,255,255,0.34)_0%,rgba(255,255,255,0.12)_72%,transparent_100%)]"
              animate={{ rotate: [0, 5, 0], y: [0, -12, 0] }}
              transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute left-[15%] top-[24%] h-[clamp(2.75rem,4.2vw,3.8rem)] w-[clamp(2.75rem,4.2vw,3.8rem)] rounded-full border-[4px] border-black bg-[#FF8C69]"
              animate={{ y: [0, -10, 0], x: [0, 8, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute bottom-[14%] left-[12%] h-[clamp(4.5rem,7vw,6rem)] w-[clamp(4.5rem,7vw,6rem)] rounded-[28px] border-[4px] border-black/70 bg-[#B4F056]/38"
              animate={{ y: [0, 10, 0], rotate: [0, -4, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute bottom-[4%] left-[34%] h-6 w-6 rotate-45 border-[3px] border-black/80 bg-[#FFD93D]/70"
              animate={{ y: [0, -8, 0], rotate: [45, 65, 45] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute bottom-[8%] right-[10%] h-[clamp(10rem,18vw,14rem)] w-[clamp(7rem,12vw,9rem)] rotate-[8deg] border-[4px] border-black/70 bg-[#FFD93D]/40"
              animate={{ y: [0, 14, 0], rotate: [8, 12, 8] }}
              transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute right-[6%] top-[4%] h-16 w-16 text-[#FF8C69]"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" stroke="black" strokeWidth="0.8">
                <path d="M12 0L14.5 9L24 12L14.5 15L12 24L9.5 15L0 12L9.5 9L12 0Z" />
              </svg>
            </motion.div>
            <motion.div
              className="absolute left-[2%] top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-black/75"
              animate={{ y: ['-50%', 'calc(-50% - 10px)', '-50%'] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="relative flex min-h-full items-center px-8 py-8 xl:px-12">
              <div className="max-w-[560px] rounded-[28px] border-[3px] border-black bg-[#ECE8E1]/92 p-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] backdrop-blur-sm xl:p-7">
                <h1 className="text-[clamp(2.3rem,3.8vw,3.7rem)] font-black uppercase leading-[0.94] text-black">
                  {panelCopy.sideTitle}
                </h1>
                <p
                  className="mt-2 text-[clamp(1.2rem,1.8vw,1.7rem)] font-black italic leading-none"
                  style={{ color: accentColor }}
                >
                  {panelCopy.sideAccent}
                </p>
                <p className="mt-4 max-w-lg text-[clamp(0.98rem,1.25vw,1.15rem)] font-semibold leading-relaxed text-black/68">
                  {panelCopy.sideBody}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            layout
            className="flex w-full items-center justify-center px-6 py-6 lg:w-[50%] xl:w-[46%] xl:px-10"
          >
            <motion.div
              layout
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="w-full max-w-[430px]"
            >
              <AuthCardShell floatingLabel={floatingLabel} accentColor={accentColor}>
                <AuthCard
                  title={panelCopy.title}
                  subtitle={panelCopy.subtitle}
                  userType={userType}
                  onUserTypeChange={setUserType}
                  identifier={identifier}
                  onIdentifierChange={setIdentifier}
                  password={password}
                  onPasswordChange={setPassword}
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword((prev) => !prev)}
                  loading={loading}
                  handleSubmit={handleSubmit}
                  isUsernameEntry={isUsernameEntry}
                  showRecoveryEmailInput={showRecoveryEmailInput}
                  onToggleRecoveryEmail={() => setShowRecoveryEmailInput((prev) => !prev)}
                  recoveryEmail={recoveryEmail}
                  onRecoveryEmailChange={setRecoveryEmail}
                  handleGoogleLogin={handleGoogleLogin}
                  accentButtonClass={accentButtonClass}
                />
              </AuthCardShell>
            </motion.div>
          </motion.div>
        </motion.div>
      </LayoutGroup>
    </div>
  )
}

type AuthCardProps = {
  title: string
  subtitle: string
  userType: 'influencer' | 'brand'
  onUserTypeChange: (type: 'influencer' | 'brand') => void
  identifier: string
  onIdentifierChange: (value: string) => void
  password: string
  onPasswordChange: (value: string) => void
  showPassword: boolean
  onTogglePassword: () => void
  loading: boolean
  handleSubmit: (e: React.FormEvent) => void
  isUsernameEntry: boolean
  showRecoveryEmailInput: boolean
  onToggleRecoveryEmail: () => void
  recoveryEmail: string
  onRecoveryEmailChange: (value: string) => void
  handleGoogleLogin: () => void
  accentButtonClass: string
}

function AuthCard({
  title,
  subtitle,
  userType,
  onUserTypeChange,
  identifier,
  onIdentifierChange,
  password,
  onPasswordChange,
  showPassword,
  onTogglePassword,
  loading,
  handleSubmit,
  isUsernameEntry,
  showRecoveryEmailInput,
  onToggleRecoveryEmail,
  recoveryEmail,
  onRecoveryEmailChange,
  handleGoogleLogin,
  accentButtonClass,
}: AuthCardProps) {
  return (
    <div className="relative z-20 rounded-[30px] border-[4px] border-black bg-[#FFFDF8] p-5 pt-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] backdrop-blur-sm sm:p-6 sm:pt-7">
      <div className="mb-4">
        <h2 className="text-[1.95rem] font-black leading-none text-black sm:text-[2.1rem]">{title}</h2>
        <p className="mt-1 text-[0.98rem] font-semibold text-black/65">{subtitle}</p>
      </div>

      <div className="mb-4 flex rounded-2xl border-[3px] border-black bg-white p-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <button
          type="button"
          onClick={() => onUserTypeChange('influencer')}
          className={`flex-1 rounded-xl py-2.5 text-xs font-black uppercase tracking-[0.22em] transition-all ${userType === 'influencer' ? 'bg-[#FF8C69] text-black' : 'text-black/40 hover:bg-black/[0.04] hover:text-black'}`}
        >
          Influencer
        </button>
        <button
          type="button"
          onClick={() => onUserTypeChange('brand')}
          className={`flex-1 rounded-xl py-2.5 text-xs font-black uppercase tracking-[0.22em] transition-all ${userType === 'brand' ? 'bg-[#B4F056] text-black' : 'text-black/40 hover:bg-black/[0.04] hover:text-black'}`}
        >
          Brand
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-[0.2em] text-black">Username / Email</label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl border-[2px] border-black bg-white">
              <Mail className="h-4 w-4 text-black" strokeWidth={2.5} />
            </div>
            <input
              type="text"
              value={identifier}
              onChange={(e) => onIdentifierChange(e.target.value)}
              className="h-13 w-full rounded-2xl border-[3px] border-black bg-white pl-16 pr-4 text-base font-semibold text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none transition-all placeholder:text-black/35 focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:h-14"
              placeholder="username or email"
              required
            />
          </div>
        </div>

        {isUsernameEntry && (
          <div className="space-y-2 rounded-2xl border-[3px] border-black bg-[#FFF4CC] p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <label className="text-xs font-black uppercase tracking-[0.2em] text-black">Recovery Email</label>
                <p className="mt-1 text-[11px] font-bold text-black/60">Optional for username-only accounts.</p>
              </div>
              <button
                type="button"
                onClick={onToggleRecoveryEmail}
                className="rounded-xl border-[2px] border-black bg-white px-3 py-1 text-[11px] font-black uppercase tracking-wide shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              >
                {showRecoveryEmailInput ? 'Hide' : 'Add'}
              </button>
            </div>

            {showRecoveryEmailInput && (
              <>
                <input
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => onRecoveryEmailChange(e.target.value)}
                  className="h-13 w-full rounded-2xl border-[3px] border-black bg-white px-4 text-base font-semibold text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none transition-all placeholder:text-black/35 focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:h-14"
                  placeholder="Add email for forgot password"
                />
                <p className="text-[11px] font-bold text-black/60">
                  Only needed if this username-based account still uses an internal recovery email.
                </p>
              </>
            )}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-[0.2em] text-black">Password</label>
            <Link href="/forgot-password" className="text-xs font-bold underline decoration-2 hover:text-[#FF8C69]">
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <div className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl border-[2px] border-black bg-white">
              <Lock className="h-4 w-4 text-black" strokeWidth={2.5} />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className="h-13 w-full rounded-2xl border-[3px] border-black bg-white pl-16 pr-12 text-base font-semibold text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none transition-all placeholder:text-black/35 focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:h-14"
              placeholder="password"
              required
            />
            <button
              type="button"
              onClick={onTogglePassword}
              className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-lg p-2 hover:bg-black/5"
            >
              {showPassword ? <EyeOff className="h-4 w-4 text-black" /> : <Eye className="h-4 w-4 text-black" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`flex h-13 w-full items-center justify-center gap-2 rounded-2xl border-[3px] border-black font-black text-sm uppercase tracking-[0.18em] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:h-14 ${accentButtonClass}`}
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin text-black" /> : <>Let&apos;s go <ArrowRight className="h-5 w-5 text-black" strokeWidth={3} /></>}
        </button>
      </form>

      <div className="mt-4">
        <p className="mb-2 text-center text-[11px] font-black uppercase tracking-[0.22em] text-black/45 sm:text-xs">Continue with</p>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:h-14 sm:w-14"
            aria-label="Continue with Google"
          >
            <GoogleIcon className="h-6 w-6" />
          </button>
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-[13px] font-bold text-black/60 sm:text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="px-1 text-black underline decoration-2 transition-colors hover:bg-[#FFD93D]">
            Join Now
          </Link>
        </p>
      </div>
    </div>
  )
}

function AuthCardShell({
  children,
  floatingLabel,
  accentColor,
}: {
  children: React.ReactNode
  floatingLabel: string
  accentColor: string
}) {
  return (
    <div className="relative w-full max-w-[440px] pt-10 sm:pt-11">
      <div className="absolute left-1/2 top-2 z-30 w-[min(74%,300px)] -translate-x-1/2">
        <div className="flex min-h-[52px] w-full items-center justify-center gap-3 rounded-full border-[3px] border-black bg-gradient-to-r from-[#FFE066] to-[#FFD93D] px-4 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:min-h-[56px] sm:px-5">
          <div className="h-3 w-3 rounded-full border border-black" style={{ backgroundColor: accentColor }} />
          <span className="text-center text-xs font-black uppercase tracking-[0.18em] text-black sm:text-sm">{floatingLabel}</span>
        </div>
      </div>
      {children}
      <div
        className="absolute right-[-12px] top-[13%] hidden h-[70%] w-10 overflow-hidden rounded-r-[24px] border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] xl:block"
        style={{ background: `linear-gradient(180deg, ${accentColor} 0%, #FFD93D 100%)` }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.15) 2px, transparent 2px)',
            backgroundSize: '10px 10px',
          }}
        />
      </div>
      <div className="absolute -bottom-3 left-8 right-8 hidden h-2.5 rounded-full border-[3px] border-black bg-[#FFD93D] xl:block" />
    </div>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
      <path d="M1 1h22v22H1z" fill="none" />
    </svg>
  )
}
