'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  Camera,
  Megaphone,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react'

type Role = 'INFLUENCER' | 'BRAND'

const ROLE_CONTENT: Record<
  Role,
  {
    title: string
    kicker: string
    description: string
    accent: string
    bg: string
    iconBg: string
    buttonBg: string
    shadow: string
    bullets: string[]
    tags: { icon: typeof Zap; label: string }[]
    Icon: typeof Camera
  }
> = {
  INFLUENCER: {
    title: 'Creator runway',
    kicker: 'For influencers',
    description: 'Create try-ons, pitch faster, and keep your content pipeline moving without the usual production drag.',
    accent: '#FF8C69',
    bg: 'bg-[linear-gradient(145deg,#fff6ef_0%,#fffdf8_42%,#ffe1d6_100%)]',
    iconBg: 'bg-[#FF8C69]',
    buttonBg: 'bg-[#FF8C69] hover:bg-[#ff9f80]',
    shadow: 'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]',
    bullets: [
      'Generate virtual try-ons in minutes',
      'Build a sharper content portfolio',
      'Access campaign requests and brand deals',
    ],
    tags: [
      { icon: Zap, label: 'Try-ons' },
      { icon: Sparkles, label: 'Content' },
    ],
    Icon: Camera,
  },
  BRAND: {
    title: 'Campaign control',
    kicker: 'For brands',
    description: 'Launch products, find creators, and turn scattered workflows into one clear performance engine.',
    accent: '#B4F056',
    bg: 'bg-[linear-gradient(145deg,#f6ffe8_0%,#fffdf8_42%,#edf8cb_100%)]',
    iconBg: 'bg-[#B4F056]',
    buttonBg: 'bg-[#B4F056] hover:bg-[#c3f570]',
    shadow: 'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]',
    bullets: [
      'Discover and brief the right creators faster',
      'Generate ad creatives and product visuals',
      'Keep campaigns, products, and inbox in one flow',
    ],
    tags: [
      { icon: Users, label: 'Discovery' },
      { icon: Megaphone, label: 'Campaigns' },
    ],
    Icon: Building2,
  },
}

export default function RegisterPage() {
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
      <RegisterContent />
    </Suspense>
  )
}

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedRole, setSelectedRole] = useState<Role>('INFLUENCER')

  useEffect(() => {
    const roleParam = searchParams.get('role')
    if (roleParam === 'brand') {
      setSelectedRole('BRAND')
    } else if (roleParam === 'influencer') {
      setSelectedRole('INFLUENCER')
    }
  }, [searchParams])

  const handleJoin = (role: Role) => {
    router.push(`/signup/${role.toLowerCase()}`)
  }

  const selectedContent = ROLE_CONTENT[selectedRole]

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#F9F8F4]">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#fffaf3_0%,#f6efe1_100%)]" />
      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(0,0,0,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.045)_1px,transparent_1px)] [background-size:34px_34px]" />
      <div className="absolute left-[-8%] top-[-4%] h-[30rem] w-[30rem] rounded-full bg-[#FF8C69]/28 blur-3xl" />
      <div className="absolute right-[-6%] top-[8%] h-[28rem] w-[28rem] rounded-full bg-[#B4F056]/24 blur-3xl" />
      <div className="absolute bottom-[-10%] left-[12%] h-[24rem] w-[24rem] rounded-full bg-[#FFD93D]/22 blur-3xl" />
      <div className="absolute bottom-[0%] right-[16%] h-[20rem] w-[20rem] rounded-full bg-[#FF8C69]/18 blur-3xl" />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-8 max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border-[3px] border-black bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.22em] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <Sparkles className="h-4 w-4" />
              Start with a side
            </div>
            <h1 className="text-[clamp(2.6rem,6vw,5rem)] font-black uppercase leading-[0.92] text-black">
              Join the
              <br />
              Kiwikoo flow
            </h1>
            <p className="mt-4 max-w-2xl text-base font-semibold leading-relaxed text-black/65 sm:text-lg">
              Pick the mode that fits you best. Influencers get a faster content engine. Brands get a sharper campaign workspace.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
            <div className="grid gap-5">
              <RoleCard
                role="INFLUENCER"
                active={selectedRole === 'INFLUENCER'}
                onSelect={() => setSelectedRole('INFLUENCER')}
                onContinue={() => handleJoin('INFLUENCER')}
              />
              <RoleCard
                role="BRAND"
                active={selectedRole === 'BRAND'}
                onSelect={() => setSelectedRole('BRAND')}
                onContinue={() => handleJoin('BRAND')}
              />
            </div>

            <motion.aside
              key={selectedRole}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className={`relative overflow-hidden rounded-[34px] border-[4px] border-black p-6 sm:p-7 ${selectedContent.bg} ${selectedContent.shadow}`}
            >
              <div className="absolute right-6 top-6 h-16 w-16 rounded-full border-[4px] border-black/80 bg-white/35" />
              <div
                className="absolute right-11 top-11 h-7 w-7 rounded-full border-[3px] border-black"
                style={{ backgroundColor: selectedContent.accent }}
              />
              <div className="absolute bottom-6 left-6 h-14 w-14 rounded-[20px] border-[4px] border-black/75 bg-white/35" />

              <div className="relative z-10">
                <h2 className="max-w-xl text-[clamp(2.4rem,5vw,4.4rem)] font-black uppercase leading-[0.92] text-black">
                  {selectedContent.title}
                </h2>
                <p
                  className="mt-3 text-[clamp(1.15rem,1.8vw,1.55rem)] font-black italic leading-none"
                  style={{ color: selectedContent.accent }}
                >
                  {selectedRole === 'INFLUENCER' ? 'Make content move quicker' : 'Run campaigns with less drag'}
                </p>
                <p className="mt-5 max-w-xl text-base font-semibold leading-relaxed text-black/68 sm:text-lg">
                  {selectedContent.description}
                </p>

                <ul className="mt-7 space-y-3">
                  {selectedContent.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3 text-base font-bold text-black/82">
                      <span
                        className="mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-[2px] border-black"
                        style={{ backgroundColor: selectedContent.accent }}
                      />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => handleJoin(selectedRole)}
                  className={`mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-[3px] border-black font-black uppercase tracking-[0.18em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${selectedContent.buttonBg}`}
                >
                  Continue as {selectedRole.toLowerCase()}
                  <ArrowRight className="h-5 w-5" strokeWidth={3} />
                </button>
              </div>
            </motion.aside>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full border-[3px] border-black bg-white px-5 py-2 text-sm font-black uppercase tracking-[0.18em] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
            >
              Already have an account
              <span className="underline">Sign in</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function RoleCard({
  role,
  active,
  onSelect,
  onContinue,
}: {
  role: Role
  active: boolean
  onSelect: () => void
  onContinue: () => void
}) {
  const content = ROLE_CONTENT[role]
  const Icon = content.Icon

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.995 }}
      className={`w-full rounded-[30px] border-[4px] border-black p-5 text-left transition-all sm:p-6 ${active ? `${content.bg} shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]` : 'bg-white shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-[3px] border-black ${active ? content.iconBg : 'bg-[#F1EEE6]'}`}>
          <Icon className="h-8 w-8 text-black" strokeWidth={2.5} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-2xl font-black uppercase text-black sm:text-3xl">
              {role === 'INFLUENCER' ? 'Influencer' : 'Brand'}
            </h3>
          </div>

          <p className="mt-2 max-w-xl text-sm font-semibold leading-relaxed text-black/65 sm:text-base">
            {content.description}
          </p>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onContinue()
            }}
            className={`mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-2xl border-[3px] border-black px-5 font-black uppercase tracking-[0.16em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${content.buttonBg}`}
          >
            Continue
            <ArrowRight className="h-4 w-4" strokeWidth={3} />
          </button>
        </div>
      </div>
    </motion.button>
  )
}
