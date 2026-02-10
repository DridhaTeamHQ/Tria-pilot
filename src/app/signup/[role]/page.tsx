'use client'

import React, { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowRight, Loader2, Sparkles, Users, Zap, User, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/auth-client'
import { getPublicSiteUrlClient, buildAuthConfirmUrl } from '@/lib/site-url'

export default function SignupPage() {
    const router = useRouter()
    const params = useParams()
    const role = (params.role as string)?.toLowerCase() || 'influencer'

    const isInfluencer = role === 'influencer'
    const bgImage = isInfluencer
        ? '/assets/signup-influencer-background.png'
        : '/assets/signup-brand-background.png'

    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        agreeTerms: false
    })

    const features = isInfluencer
        ? [
            { icon: Sparkles, text: 'AI-powered virtual try-ons', color: '#FF8C69' },
            { icon: Users, text: 'Collaborate with top brands', color: '#B4F056' },
            { icon: Zap, text: 'Portfolio & influence growth', color: '#FFD93D' },
        ]
        : [
            { icon: Users, text: 'Access 10K+ verified influencers', color: '#B4F056' },
            { icon: Sparkles, text: 'Generate campaigns in seconds', color: '#FF8C69' },
            { icon: Zap, text: 'Real-time analytics & tracking', color: '#FFD93D' },
        ]

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.agreeTerms) {
            toast.error('Please agree to the Terms of Service')
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
            const supabase = createClient()
            const siteUrl = getPublicSiteUrlClient()
            const redirectUrl = buildAuthConfirmUrl(siteUrl, '/login?confirmed=true')

            // 1. Create Auth User
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email.trim().toLowerCase(),
                password: formData.password,
                options: {
                    emailRedirectTo: redirectUrl,
                    data: {
                        role: role,
                        name: formData.name.trim(),
                    },
                },
            })

            if (authError) throw new Error(authError.message)
            if (!authData.user) throw new Error('Failed to create account')

            // 2. Create/Update Profile (Handle Trigger Race Condition)
            const roleLowercase = role as 'influencer' | 'brand'
            const approvalStatus = roleLowercase === 'influencer' ? 'none' : 'approved'

            // Use UPSERT to handle race condition with handle_new_user trigger
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: authData.user.id,
                    email: formData.email.trim().toLowerCase(),
                    role: roleLowercase,
                    onboarding_completed: false,
                    approval_status: approvalStatus,
                }, {
                    onConflict: 'id'
                })

            if (profileError) {
                console.error('Profile creation/update error:', profileError)
                toast.warning('Account created, but profile sync failed. Please contact support.')
            }

            toast.success('Account created! Please check your email.')
            router.push('/login')

        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Signup failed')
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
            <div className="absolute inset-0 z-[1] pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.2)_100%)]" />

            {/* CONTENT CONTAINER */}
            <div className="relative z-10 w-full flex">

                {/* LEFT SIDE - Text Content */}
                <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-20 py-12">
                    {/* Logo - Neo-brutal style */}
                    <motion.div
                        initial={{ opacity: 0, y: -20, rotate: -2 }}
                        animate={{ opacity: 1, y: 0, rotate: 0 }}
                        transition={{ duration: 0.6, type: "spring" }}
                        className="mb-10"
                    >
                        <span className="inline-block px-4 py-2 bg-[#F9F8F4] text-2xl font-black text-black border-[3px] border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-default">
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
                            Join the<br />
                            <span className="text-[#FF8C69] italic font-serif">
                                {isInfluencer ? 'fashion studio' : 'brand portal'}
                            </span>
                        </h1>
                    </motion.div>

                    {/* Subtext */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-lg text-white/90 max-w-md mb-10 leading-relaxed font-medium drop-shadow-[1px_1px_0px_rgba(0,0,0,0.5)]"
                    >
                        Create your account today and start growing your influence with top fashion brands
                    </motion.p>

                    {/* Features - Neo-brutal pills */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="space-y-4"
                    >
                        {features.map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 + i * 0.1, type: "spring" }}
                                whileHover={{ x: 5, rotate: 1 }}
                                className="inline-flex items-center gap-3 px-4 py-2.5 bg-[#F9F8F4] border-[3px] border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mr-2"
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
                </div>

                {/* RIGHT SIDE - Form Card */}
                <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 lg:pr-12 xl:pr-20">
                    <motion.div
                        initial={{ opacity: 0, y: 40, rotate: 2 }}
                        animate={{ opacity: 1, y: 0, rotate: 0 }}
                        transition={{ duration: 0.8, type: "spring", bounce: 0.3 }}
                        className="w-full max-w-[420px]"
                    >
                        {/* Neo-Brutal Card */}
                        <div className="bg-[#F9F8F4] rounded-2xl p-8 border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                            {/* Card Header */}
                            <div className="text-center mb-6">
                                <motion.h2
                                    initial={{ scale: 0.9 }}
                                    animate={{ scale: 1 }}
                                    className="text-3xl font-black text-black"
                                >
                                    Sign Up
                                </motion.h2>
                                <p className="text-sm text-black/60 font-medium mt-1">
                                    {isInfluencer ? 'Join as Creator' : 'Join as Brand'}
                                </p>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Name */}
                                <div>
                                    <label className="block text-sm font-bold text-black mb-1.5">
                                        {isInfluencer ? 'Full Name' : 'Company Name'}
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#B4F056] rounded-lg border-2 border-black flex items-center justify-center">
                                            <User className="w-4 h-4 text-black" strokeWidth={2.5} />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder={isInfluencer ? 'Your name' : 'Company name'}
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            required
                                            className="w-full pl-14 pr-4 py-3 rounded-xl bg-white border-[2px] border-black text-black placeholder:text-black/40 font-medium focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all"
                                        />
                                    </div>
                                </div>

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
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
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
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
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

                                {/* Confirm Password */}
                                <div>
                                    <label className="block text-sm font-bold text-black mb-1.5">Confirm Password</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#A78BFA] rounded-lg border-2 border-black flex items-center justify-center">
                                            <Lock className="w-4 h-4 text-black" strokeWidth={2.5} />
                                        </div>
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={formData.confirmPassword}
                                            onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                            required
                                            className="w-full pl-14 pr-12 py-3 rounded-xl bg-white border-[2px] border-black text-black placeholder:text-black/40 font-medium focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-black/5 rounded-lg transition-colors"
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-4 h-4 text-black/60" /> : <Eye className="w-4 h-4 text-black/60" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Terms */}
                                <div className="flex items-start gap-3 pt-1">
                                    <div className="relative mt-0.5">
                                        <input
                                            id="terms"
                                            type="checkbox"
                                            checked={formData.agreeTerms}
                                            onChange={e => setFormData({ ...formData, agreeTerms: e.target.checked })}
                                            className="w-5 h-5 rounded border-2 border-black appearance-none bg-white checked:bg-[#B4F056] cursor-pointer transition-all"
                                        />
                                        {formData.agreeTerms && (
                                            <svg className="absolute top-0.5 left-0.5 w-4 h-4 text-black pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                    <label htmlFor="terms" className="text-sm text-black/70 leading-snug cursor-pointer">
                                        I agree to the <span className="text-black font-bold hover:underline">Terms</span> and <span className="text-black font-bold hover:underline">Privacy Policy</span>
                                    </label>
                                </div>

                                {/* CTA Button - Neo-brutal */}
                                <motion.button
                                    whileHover={{ scale: 1.02, x: -2, y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3.5 mt-2 bg-[#FF8C69] text-black rounded-xl font-black text-base flex items-center justify-center gap-2 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            Create Account
                                            <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
                                        </>
                                    )}
                                </motion.button>
                            </form>

                            {/* Sign In Link */}
                            <div className="mt-6 text-center">
                                <p className="text-sm text-black/60">
                                    Already have an account?{' '}
                                    <Link href="/login" className="text-black font-bold hover:underline">
                                        Sign In
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
