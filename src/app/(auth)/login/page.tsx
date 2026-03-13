'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, LayoutGroup } from 'framer-motion'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowRight, Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/auth-client'
import { getPublicSiteUrlClient } from '@/lib/site-url'
import { isSyntheticEmail } from '@/lib/auth-username'

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
  const router = useRouter()
  const searchParams = useSearchParams()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [showRecoveryEmailInput, setShowRecoveryEmailInput] = useState(false)
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
  const isUsernameEntry = Boolean(identifier.trim()) && !identifier.includes('@')

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

  const waitForServerSession = async () => {
    // Avoid a first-login bounce by waiting until /api/auth/me can read the fresh cookie.
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
      const redirectTarget = searchParams.get('redirect') || '/dashboard'
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
        // Force a full navigation to ensure middleware/layouts read fresh auth cookies.
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
      const redirectTarget = searchParams.get('redirect') || '/dashboard'
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
    <div className="min-h-screen w-full relative bg-[#F9F8F4]">
      {/* MOBILE BACKGROUND */}
      <div
        className="lg:hidden absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${bgImage}')` }}
      >
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm" />
      </div>

      {/* MOBILE FORM */}
      <div className="lg:hidden relative z-10 min-h-screen px-4 py-6 flex items-center justify-center">
        <div className="w-full max-w-md bg-white/95 border-[3px] border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="mb-6">
            <h2 className="text-3xl font-black text-black mb-1 uppercase tracking-tight">Sign In</h2>
            <p className="text-black/60 font-medium">
              {userType === 'influencer' ? 'Welcome back Creator.' : 'Enter Brand Portal.'}
            </p>
          </div>

          <div className="flex p-1 bg-white border-2 border-black mb-6">
            <button type="button"
              onClick={() => setUserType('influencer')}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-wider transition-all border-r-2 border-black ${userType === 'influencer' ? 'bg-[#FF8C69] text-black' : 'text-black/40 hover:text-black hover:bg-gray-50'}`}
            >
              Influencer
            </button>
            <button type="button"
              onClick={() => setUserType('brand')}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-wider transition-all ${userType === 'brand' ? 'bg-[#B4F056] text-black' : 'text-black/40 hover:text-black hover:bg-gray-50'}`}
            >
              Brand
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-black">Username / Email</label>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-11 border-r-2 border-black flex items-center justify-center bg-white border-2 border-r-2 border-black z-10">
                  <Mail className="w-4 h-4 text-black" strokeWidth={2.5} />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-14 pr-4 py-3 bg-white border-2 border-black text-black font-bold placeholder:text-black/30 outline-none focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                  placeholder="username or email"
                  required
                />
              </div>
            </div>

            {isUsernameEntry && (
              <div className="space-y-2 rounded-xl border-[2px] border-black bg-[#FFF4CC] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-black">Recovery Email</label>
                    <p className="text-[11px] font-bold text-black/60">Optional for username-only accounts.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRecoveryEmailInput((prev) => !prev)}
                    className="border-2 border-black bg-white px-3 py-1 text-[11px] font-black uppercase tracking-wide"
                  >
                    {showRecoveryEmailInput ? 'Hide' : 'Add'}
                  </button>
                </div>
                {showRecoveryEmailInput && (
                  <>
                    <input
                      type="email"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-black text-black font-bold placeholder:text-black/30 outline-none focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
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
              <div className="flex justify-between items-center">
                <label className="text-xs font-black uppercase tracking-widest text-black">Password</label>
                <Link href="/forgot-password" className="text-xs font-bold underline decoration-2 hover:text-[#FF8C69]">Forgot?</Link>
              </div>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-11 border-r-2 border-black flex items-center justify-center bg-white border-2 border-r-2 border-black z-10">
                  <Lock className="w-4 h-4 text-black" strokeWidth={2.5} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-14 pr-12 py-3 bg-white border-2 border-black text-black font-bold placeholder:text-black/30 outline-none focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                  placeholder="password"
                      required
                    />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-black/5 rounded-lg z-20"
                >
                  {showPassword ? <EyeOff className="w-4 h-4 text-black" /> : <Eye className="w-4 h-4 text-black" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 font-black text-base uppercase tracking-wider border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2 ${userType === 'influencer' ? 'bg-[#FF8C69] hover:bg-[#ff9f80]' : 'bg-[#B4F056] hover:bg-[#c3f570]'}`}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin text-black" /> : <>Sign In <ArrowRight className="w-5 h-5 text-black" strokeWidth={3} /></>}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t-2 border-black/10"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#F9F8F4] lg:bg-white px-2 text-black/40 font-black tracking-widest">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full mb-5 py-3 font-black text-sm uppercase tracking-wider bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-3 text-black"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
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
            Google
          </button>

          <div className="mt-5 text-center">
            <p className="text-black/60 font-bold text-sm">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-black underline decoration-2 hover:bg-[#FFD93D] transition-colors px-1">
                Join Now
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* DESKTOP LAYOUT */}
      <LayoutGroup>
        <motion.div
          layout
          className={`hidden lg:flex min-h-screen w-full relative z-0 overflow-x-hidden ${isLayoutFlipped ? 'flex-row-reverse' : 'flex-row'}`}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >

          {/* IMAGE SIDE */}
          <motion.div
            layout
            className="relative hidden min-h-screen lg:block lg:w-[52%] xl:w-[56%] overflow-hidden"
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
            className="w-full lg:w-[48%] xl:w-[44%] min-w-0 flex items-center justify-center px-8 py-10 xl:px-14 relative z-10 bg-transparent overflow-y-auto"
          >
            <motion.div
              layout
              className="w-full max-w-[520px]"
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
                <button type="button"
                  onClick={() => setUserType('influencer')}
                  className={`flex-1 py-3 text-sm font-black uppercase tracking-wider transition-all border-r-2 border-black ${userType === 'influencer' ? 'bg-[#FF8C69] text-black' : 'text-black/40 hover:text-black hover:bg-gray-50'}`}
                >
                  Influencer
                </button>
                <button type="button"
                  onClick={() => setUserType('brand')}
                  className={`flex-1 py-3 text-sm font-black uppercase tracking-wider transition-all ${userType === 'brand' ? 'bg-[#B4F056] text-black' : 'text-black/40 hover:text-black hover:bg-gray-50'}`}
                >
                  Brand
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-black">Username / Email</label>
                  <div className="relative group">
                    <div className={`absolute left-0 top-0 bottom-0 w-12 border-r-2 border-black flex items-center justify-center bg-white border-2 border-r-2 border-black z-10`}>
                      <Mail className="w-5 h-5 text-black" strokeWidth={2.5} />
                    </div>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full pl-16 pr-4 py-4 bg-white border-2 border-black text-black font-bold placeholder:text-black/30 outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                      placeholder="username or email"
                      required
                    />
                  </div>
                </div>

            {isUsernameEntry && (
              <div className="space-y-2 rounded-xl border-[2px] border-black bg-[#FFF4CC] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-black">Recovery Email</label>
                    <p className="text-[11px] font-bold text-black/60">Optional for username-only accounts.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRecoveryEmailInput((prev) => !prev)}
                    className="border-2 border-black bg-white px-3 py-1 text-[11px] font-black uppercase tracking-wide"
                  >
                    {showRecoveryEmailInput ? 'Hide' : 'Add'}
                  </button>
                </div>
                {showRecoveryEmailInput && (
                  <>
                    <input
                      type="email"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-black text-black font-bold placeholder:text-black/30 outline-none focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
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

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t-2 border-black/10"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#F9F8F4] lg:bg-transparent px-3 text-black/40 font-black tracking-[0.18em] backdrop-blur-sm whitespace-nowrap">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full mb-8 py-4 px-4 font-black text-[13px] xl:text-sm uppercase tracking-[0.18em] bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-3 text-black whitespace-nowrap"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24">
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
                Sign in with Google
              </button>

              <div className="mt-8 text-center">
                <p className="text-black/60 font-bold text-sm">
                  Don&apos;t have an account?{' '}
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

