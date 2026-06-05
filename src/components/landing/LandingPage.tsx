'use client'

import { type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useUser } from '@/lib/react-query/hooks'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BadgeDollarSign,
  Camera,
  ChartColumn,
  CircleDot,
  Eye,
  Facebook,
  Instagram,
  Linkedin,
  Megaphone,
  Rocket,
  Sparkles,
  Star,
  Store,
  Youtube,
  UserRoundX,
  Zap,
} from 'lucide-react'

const PF = 'var(--font-plus-jakarta-sans), sans-serif'

export default function LandingPage() {
  const { data: user, isLoading } = useUser()
  const isLoggedIn = !!user && !isLoading
  return (
    <div className="overflow-x-clip bg-[#f7eee4] px-2 pb-6 pt-[100px] text-[#111111] sm:px-4 sm:pb-8 lg:px-6 lg:pt-[104px]" style={{ fontFamily: PF }}>
      <div className="mx-auto w-full max-w-[1320px] overflow-hidden rounded-[24px] border-[3px] border-black bg-[#fbfaf6] shadow-[6px_6px_0_0_rgba(0,0,0,1)] sm:rounded-[30px] sm:shadow-[8px_8px_0_0_rgba(0,0,0,1)] lg:rounded-[34px] lg:shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
        <section className="relative overflow-hidden px-4 py-5 sm:px-8 sm:py-6 lg:px-10 lg:py-10">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(17,17,17,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(17,17,17,0.06)_1px,transparent_1px)] bg-[size:42px_42px]" />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-[28%] bg-[radial-gradient(circle_at_22%_62%,rgba(255,140,120,0.18),transparent_52%)]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-[34%] bg-[radial-gradient(circle_at_35%_40%,rgba(203,255,46,0.16),transparent_46%)]" />
          <div className="pointer-events-none absolute -left-4 top-[92px] h-[88px] w-[88px] rounded-full border-[3px] border-[#ff5aa9] bg-[#ff5aa9] shadow-[6px_6px_0_0_rgba(0,0,0,1)] hidden sm:block" />
          <div className="pointer-events-none absolute -right-8 bottom-20 h-[92px] w-[92px] rounded-full border-[3px] border-black bg-[#ffd243] shadow-[6px_6px_0_0_rgba(0,0,0,1)] hidden sm:block" />
          <div className="pointer-events-none absolute inset-x-0 top-3 text-center kiwikoo-wordmark text-[clamp(5rem,17vw,14rem)] leading-none tracking-[0.02em] text-black/[0.04]">
            KIWIKOO
          </div>

          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div className="max-w-[620px] pt-1 text-center lg:pt-3 lg:text-left">
              <h1 className="mt-2 text-[clamp(2.7rem,12vw,6.2rem)] font-black uppercase leading-[0.9] tracking-[-0.07em] text-black sm:mt-3">
                Where Fashion
                <br />
                Meets <span className="text-[#ff8c78]">AI.</span>
              </h1>
              <p className="mt-4 max-w-[560px] text-[16px] leading-7 text-black/68 max-lg:mx-auto sm:mt-6 sm:text-[18px] sm:leading-8">
                The easiest way for creators and brands to create, launch, and convert with AI-powered fashion tools.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:mt-8 lg:justify-start">
                <Link
                  href="/signup/influencer"
                  className="group relative inline-flex h-auto min-h-[56px] sm:min-h-[72px] w-full sm:w-auto sm:min-w-[210px] items-center justify-center overflow-hidden rounded-[16px] border-[3px] border-black bg-[#F47E5C] px-5 py-3 text-[16px] font-black text-black shadow-[5px_5px_0_0_rgba(0,0,0,1)] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                >
                  <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.4),transparent_45%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <span className="relative block h-[1.6em] overflow-hidden">
                    <span className="block transition-all duration-300 group-hover:-translate-y-[1.6em] group-hover:opacity-0">
                      Start Creating
                    </span>
                    <span className="absolute inset-x-0 top-[1.6em] block text-center text-[0.9em] uppercase tracking-[0.08em] opacity-0 transition-all duration-300 group-hover:top-0 group-hover:opacity-100">
                      Creator
                    </span>
                  </span>
                </Link>
                <Link
                  href="/signup/brand"
                  className="group relative inline-flex h-auto min-h-[56px] sm:min-h-[72px] w-full sm:w-auto sm:min-w-[210px] items-center justify-center overflow-hidden rounded-[16px] border-[3px] border-black bg-[#B4E600] px-5 py-3 text-[16px] font-black text-black shadow-[5px_5px_0_0_rgba(0,0,0,1)] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                >
                  <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.35),transparent_45%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <span className="relative block h-[1.6em] overflow-hidden">
                    <span className="block transition-all duration-300 group-hover:-translate-y-[1.6em] group-hover:opacity-0">
                      Start Scaling
                    </span>
                    <span className="absolute inset-x-0 top-[1.6em] block text-center text-[0.9em] uppercase tracking-[0.08em] opacity-0 transition-all duration-300 group-hover:top-0 group-hover:opacity-100">
                      Brand
                    </span>
                  </span>
                </Link>
              </div>
            </div>

            <div className="group relative mx-auto w-full max-w-[420px] sm:max-w-[520px]">
              <div className="absolute -left-2 top-12 z-20 rounded-[22px] border-[3px] border-black bg-[#FFD93D] px-4 py-4 shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition-transform duration-300 group-hover:-translate-y-2 group-hover:rotate-[-8deg] sm:-left-5 hidden sm:block">
                <Zap className="h-8 w-8 text-black" strokeWidth={2.4} />
              </div>
              <div className="absolute right-0 top-2 z-20 rounded-[22px] border-[3px] border-black bg-[#89a6ff] px-4 py-4 shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-2 group-hover:rotate-[8deg] hidden sm:block">
                <Sparkles className="h-8 w-8 text-black" strokeWidth={2.4} />
              </div>
              <div className="absolute right-6 top-28 z-20 rounded-[22px] border-[3px] border-black bg-[#B4E600] px-4 py-4 shadow-[5px_5px_0_0_rgba(0,0,0,1)] transition-transform duration-300 group-hover:translate-y-1 group-hover:rotate-[6deg] hidden sm:block">
                <Star className="h-7 w-7 text-black" strokeWidth={2.4} />
              </div>

              <div className="relative min-h-[280px] sm:min-h-[500px]">
                <div className="absolute inset-x-[16%] inset-y-[12%] rounded-[30px] border-[3px] border-black bg-[linear-gradient(180deg,#fff7ec_0%,#f6ffd9_100%)] shadow-[7px_7px_0_0_rgba(0,0,0,1)] transition-transform duration-500 group-hover:scale-[1.01]" />
                <div className="pointer-events-none absolute inset-x-[20%] inset-y-[18%] rounded-[26px] bg-[radial-gradient(circle_at_25%_30%,rgba(255,140,120,0.2),transparent_38%),radial-gradient(circle_at_78%_28%,rgba(203,255,46,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.75),rgba(255,247,232,0.45))]" />
                <div className="absolute bottom-4 right-1 z-10 w-[170px] rotate-[5deg] rounded-[22px] border-[3px] border-black bg-white p-2.5 shadow-[5px_5px_0_0_rgba(0,0,0,1)] transition-transform duration-300 group-hover:translate-y-1 group-hover:rotate-[8deg] sm:bottom-5 sm:right-0 sm:w-[250px] sm:rotate-[7deg] sm:rounded-[26px] sm:p-3 sm:shadow-[7px_7px_0_0_rgba(0,0,0,1)]">
                  <div className="relative h-[132px] overflow-hidden rounded-[16px] bg-[#fff6f2] sm:h-[190px] sm:rounded-[18px]">
                    <Image
                      src="/landing/hero-brand.webp"
                      alt="Brand setup"
                      fill
                      sizes="(min-width: 1024px) 250px, 170px"
                      className="object-contain object-center"
                      priority
                    />
                  </div>
                </div>
                <div className="absolute inset-x-[8%] bottom-[12px] top-[8%] z-20 flex items-end justify-center">
                  <div className="relative h-full w-full">
                    <Image
                      src="/landing/hero-influencer.png"
                      alt="Creator"
                      fill
                      sizes="(min-width: 1024px) 420px, 78vw"
                      className="object-contain object-bottom drop-shadow-[0_18px_28px_rgba(0,0,0,0.18)] transition-transform duration-500 group-hover:scale-[1.03]"
                      priority
                    />
                  </div>
                </div>
                <div className="absolute bottom-3 left-1/2 z-10 flex max-w-[calc(100%-1rem)] -translate-x-1/2 items-center gap-2 rounded-full border-[3px] border-black bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-transform duration-300 group-hover:-translate-y-1 sm:bottom-5 sm:w-max sm:px-5 sm:text-[12px] sm:shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#B4E600]" />
                  Fashion AI studio
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="creator-brand-paths" className="border-t-[3px] border-black bg-white px-4 py-10 sm:px-8 sm:py-12 lg:px-10 lg:py-14">
          <div className="text-center">
            <h2 className="text-[clamp(2.35rem,5vw,3.8rem)] font-black leading-[0.95] tracking-[-0.05em] text-black">
              Built for Creators and Brands
            </h2>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <PathPanel
              label="For Creators"
              tone="coral"
              title={`You've got the style?\nStart earning now.`}
              body="Create AI looks, post faster, and earn from every conversion without shoots, delays, or chasing brands."
              href="/signup/influencer"
              cta="Start creating"
            />
            <PathPanel
              label="For Brands"
              tone="lime"
              title="Spending on marketing without clear results? There's a smarter way."
              body="Find the right creators, generate strong campaign visuals with AI and launch with more confidence."
              href="/signup/brand"
              cta="Start scaling"
            />
          </div>
        </section>

        <section id="what-you-get" className="relative overflow-hidden border-t-[3px] border-black bg-[linear-gradient(180deg,#fffaf6_0%,#fff7fb_45%,#f9fff4_100%)] px-4 py-10 sm:px-8 sm:py-12 lg:px-10 lg:py-14">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(255,90,169,0.12),transparent_22%),radial-gradient(circle_at_86%_22%,rgba(137,166,255,0.12),transparent_24%),radial-gradient(circle_at_50%_82%,rgba(203,255,46,0.1),transparent_26%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(17,17,17,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(17,17,17,0.04)_1px,transparent_1px)] bg-[size:42px_42px] opacity-35" />

          <motion.div
            className="relative z-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-[760px]">
                <h2 className="text-[clamp(2.6rem,5.4vw,4.5rem)] font-black leading-[0.94] tracking-[-0.065em] text-black">
                  What Kiwikoo
                  <br />
                  can do for you
                </h2>
                <p className="mt-4 max-w-[620px] text-[17px] leading-7 text-black/58">
                  Smooth, clear, and easy to scan. Kiwikoo brings creative tools, campaign flow, and live performance into one polished system.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:max-w-[820px] lg:flex-1">
                <MetricChip value="Fast" label="smooth visual creation" tone="pink" />
                <MetricChip value="Smart" label="campaign-ready flow" tone="blue" />
                <MetricChip value="Live" label="analytics + discovery" tone="lime" />
              </div>
            </div>

            <div className="mt-8 flex justify-center lg:mt-10">
              <GlassFeatureStack />
            </div>
          </motion.div>

          <motion.div
            className="relative z-10 mt-10 grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-center"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
          >
            <div className="rounded-[24px] border-[3px] border-black bg-[#fffdf7] p-5 shadow-[5px_5px_0_0_rgba(0,0,0,1)] sm:rounded-[28px] sm:p-6 sm:shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
              <MiniPill label="For creators + brands" />
              <div className="mt-6">
                <div className="text-[clamp(2rem,3.6vw,3rem)] font-black leading-[0.94] tracking-[-0.05em] text-black">
                  Keep it clean,
                  <br />
                  fast, and easy to get.
                </div>
                <p className="mt-4 max-w-[470px] text-[15px] leading-7 text-black/60">
                  Everything sits in one balanced flow, so the section feels sharper, lighter, and more intentional instead of crowded.
                </p>
              </div>

              <div className="mt-7 space-y-4">
                <InsightPill
                  icon={<ChartColumn className="h-5 w-5" strokeWidth={2.2} />}
                  title="Real-Time Analytics"
                  description="Clear performance signals with a softer dashboard feel."
                  tone="pink"
                />
                <InsightPill
                  icon={<Store className="h-5 w-5" strokeWidth={2.2} />}
                  title="Creator Discovery"
                  description="Find products, creators, and outcomes in one easy flow."
                  tone="lime"
                />
              </div>
            </div>

            <VibeBoard />
          </motion.div>
        </section>

        <section id="why-kiwikoo" className="border-t-[3px] border-black bg-[#fbfaf6] px-4 py-10 sm:px-8 sm:py-12 lg:px-10 lg:py-14">
          <div className="text-center">
            <h2 className="text-[clamp(2.35rem,5vw,3.8rem)] font-black leading-[0.95] tracking-[-0.05em] text-black">
              Why Kiwikoo
            </h2>
            <p className="mx-auto mt-4 max-w-[680px] text-[18px] leading-8 text-black/60">
              We remove the friction from creator-brand production so the work feels faster, sharper, and easier to trust.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            <WhyCard
              icon={<UserRoundX className="h-5 w-5" strokeWidth={2.2} />}
              tone="coral"
              title="No Shoots"
              body="Skip the expensive first step and move straight into polished visual output."
            />
            <WhyCard
              icon={<CircleDot className="h-5 w-5" strokeWidth={2.2} />}
              tone="lime"
              title="No Chasing Creators / Brands"
              body="Better communication and faster campaign progress."
            />
            <WhyCard
              icon={<Megaphone className="h-5 w-5" strokeWidth={2.2} />}
              tone="coral"
              title="No Guesswork"
              body="Use stronger performance signals before you spend time or money at scale."
            />
          </div>
        </section>

        <section className="relative overflow-hidden border-t-[3px] border-black bg-[#ff8c78] px-4 py-5 sm:px-8 sm:py-6 lg:px-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_50%,rgba(255,255,255,0.22),transparent_16%),radial-gradient(circle_at_90%_50%,rgba(255,255,255,0.18),transparent_18%)]" />
          <div className="relative flex flex-nowrap items-center justify-center gap-3 text-center text-black sm:gap-5">
            <BandWord label="Create" />
            <BandArrow />
            <BandWord label="Share" />
            <BandArrow />
            <BandWord label="Earn" />
          </div>
        </section>

        <footer className="border-t-[3px] border-black bg-[#fbfaf6] px-5 py-12 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-10">

            {/* Top Section */}
            <div className="grid gap-10 md:grid-cols-3 md:items-start">

              {/* Brand + Description */}
              <div>
                <h2 className="text-2xl font-black tracking-tight">KIWIKOO</h2>
                <p className="mt-3 text-[14px] leading-6 text-black/60 max-w-[260px]">
                  AI-powered fashion platform helping creators and brands create, launch and earn faster.
                </p>

                {/* Social Icons */}
                <div className="mt-5 flex gap-3">
                  {[Facebook, Instagram, Youtube, Linkedin].map((Icon, i) => (
                    <span
                      key={i}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border-[2px] border-black bg-white shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                    >
                      <Icon className="h-4 w-4" strokeWidth={2.2} />
                    </span>
                  ))}
                </div>
              </div>

              {/* Links */}
              <div className="grid grid-cols-2 gap-8 text-[13px] font-bold uppercase tracking-[0.08em]">

                <div>
                  <div className="mb-3 text-black/40">Company</div>
                  <div className="space-y-2 text-black">
                    <Link href="/about" className="block hover:underline">About</Link>
                    <Link href="/signup/influencer" className="block hover:underline">Creators</Link>
                    <Link href="/signup/brand" className="block hover:underline">Brands</Link>
                    <Link href="/marketplace" className="block hover:underline">Marketplace</Link>
                  </div>
                </div>

                <div>
                  <div className="mb-3 text-black/40">Legal</div>
                  <div className="space-y-2 text-black">
                    <Link href="/privacy" className="block hover:underline">Privacy</Link>
                    <Link href="/terms" className="block hover:underline">Terms</Link>
                  </div>
                </div>
              </div>

              {/* CTA Section */}
              <div className="rounded-[20px] border-[3px] border-black bg-[#ff8c78] p-5 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                <h3 className="text-[18px] font-black leading-tight text-black">
                  Start your journey today 🚀
                </h3>
                <p className="mt-2 text-[13px] text-black/70">
                  Join creators & brands using AI fashion tools.
                </p>

                  <Link
                    href={isLoggedIn ? "/marketplace" : "/signup/influencer"}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-full border-[2px] border-black bg-black px-4 py-2 text-[12px] font-bold uppercase text-white transition hover:translate-y-[2px] hover:shadow-none shadow-[3px_3px_0_0_rgba(0,0,0,1)]"
                  >
                    Get Started
                  </Link>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="flex flex-row items-center justify-center gap-2 border-t pt-6 text-[8px] font-bold uppercase tracking-tight text-black/60 sm:justify-between sm:gap-4 sm:text-[12px] sm:tracking-[0.08em] md:text-[10px] lg:text-[12px]">
              <div className="text-center">Made with in India</div>
              <div className="text-center">(C) 2026 DRIDHATECHNOLOGIES</div>
              <div className="text-center">ENGLISH (US)</div>
            </div>

            {/* Background Wordmark */}
            <div className="kiwikoo-wordmark text-[clamp(3.8rem,15vw,11rem)] leading-none text-black/[0.04] text-center overflow-hidden">
              KIWIKOO
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

function MiniPill({ label, dark = false }: { label: string; dark?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border-[2px] px-4 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${dark ? 'border-white/15 bg-[#111111] text-white/90' : 'border-black/35 bg-white text-black/75'
        }`}
    >
      {label}
    </span>
  )
}

function MetricChip({
  value,
  label,
  tone,
}: {
  value: string
  label: string
  tone: 'pink' | 'blue' | 'lime'
}) {
  const toneStyles =
    tone === 'pink'
      ? 'bg-[#ffd4ea]'
      : tone === 'blue'
        ? 'bg-[#d9e3ff]'
        : 'bg-[#efffc0]'

  return (
    <motion.div
      className={`rounded-[16px] border-[3px] border-black ${toneStyles} p-3 shadow-[3px_3px_0_0_rgba(0,0,0,1)] sm:rounded-[18px] sm:p-3.5 sm:shadow-[4px_4px_0_0_rgba(0,0,0,1)]`}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <div className="text-[22px] font-black leading-none tracking-[-0.05em] text-black sm:text-[24px]">{value}</div>
      <div className="mt-1.5 text-[10px] font-black uppercase leading-4 tracking-[0.12em] text-black/65">{label}</div>
    </motion.div>
  )
}

function GlassFeatureStack() {
  const cards = [
    {
      label: 'Create',
      title: 'AI Try-On',
      description: 'Virtual looks in a softer, faster studio flow.',
      accent: 'from-[#89a6ff] to-[#d8b7ff]',
      icon: <Camera className="h-5 w-5" strokeWidth={2.2} />,
      rotateClass: 'lg:rotate-[-15deg]',
    },
    {
      label: 'Launch',
      title: 'Campaign Flow',
      description: 'Approvals, assets, and launches in one line of motion.',
      accent: 'from-[#ffb7d6] to-[#ffd6f0]',
      icon: <Rocket className="h-5 w-5" strokeWidth={2.2} />,
      rotateClass: 'lg:rotate-[5deg]',
    },
    {
      label: 'Earn',
      title: 'Revenue Loop',
      description: 'Track performance and turn creator energy into growth.',
      accent: 'from-[#e4ff9d] to-[#cbff2e]',
      icon: <BadgeDollarSign className="h-5 w-5" strokeWidth={2.2} />,
      rotateClass: 'lg:rotate-[15deg]',
    },
  ] as const

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <div className="group relative flex flex-col items-center gap-4 sm:gap-5 lg:min-h-[320px] lg:flex-row lg:justify-center lg:pt-2">
        <div className="pointer-events-none absolute inset-x-0 top-4 hidden h-[200px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.72)_0%,rgba(255,255,255,0.12)_58%,transparent_78%)] blur-2xl lg:block" />
        {cards.map((card, index) => (
          <motion.div
            key={card.title}
            className={`relative z-10 h-[250px] w-full max-w-[310px] overflow-hidden rounded-[24px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.68),rgba(255,255,255,0.34))] p-5 shadow-[0_18px_34px_rgba(0,0,0,0.12)] backdrop-blur-[14px] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:h-[270px] sm:rounded-[28px] sm:p-6 sm:shadow-[0_26px_50px_rgba(0,0,0,0.14)] lg:h-[290px] lg:w-[260px] lg:max-w-none lg:mx-[-42px] lg:group-hover:mx-[14px] lg:group-hover:rotate-0 ${card.rotateClass}`}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.45, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
            style={{ zIndex: cards.length - index }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${card.accent} opacity-[0.16]`} />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.78),transparent_30%),radial-gradient(circle_at_84%_30%,rgba(255,255,255,0.38),transparent_24%),radial-gradient(circle_at_52%_92%,rgba(255,255,255,0.28),transparent_26%)]" />
            <div className="relative flex h-full flex-col justify-between text-black">
              <div>
                <div className={`inline-flex h-11 w-11 items-center justify-center rounded-[14px] bg-gradient-to-br ${card.accent} shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]`}>
                  {card.icon}
                </div>
                <div className="mt-5 text-[11px] font-black uppercase tracking-[0.14em] text-black/42 sm:mt-6 sm:text-[12px]">{card.label}</div>
                <div className="mt-2 text-[26px] font-black leading-[0.94] tracking-[-0.06em] sm:text-[30px] lg:text-[31px]">{card.title}</div>
              </div>

              <div>
                <div className="max-w-[240px] text-[13px] leading-6 text-black/55 sm:text-[14px] sm:leading-7 lg:max-w-[210px] lg:text-[14px]">{card.description}</div>
                <div className="mt-5 flex justify-end border-t border-black/10 pt-4">
                  <div className="relative h-8 w-[96px] overflow-hidden rounded-full border border-black/10 bg-white/35">
                    <span className={`absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-gradient-to-br ${card.accent} opacity-90`} />
                    <span className="absolute left-[36px] top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-black/16 bg-white/72" />
                    <span className="absolute right-2 top-1/2 h-[14px] w-[34px] -translate-y-1/2 rounded-full bg-black/8" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function InsightPill({
  icon,
  title,
  description,
  tone,
}: {
  icon: ReactNode
  title: string
  description: string
  tone: 'pink' | 'lime'
}) {
  const toneClass = tone === 'pink' ? 'bg-[#ffe1f1]' : 'bg-[#f2ffc9]'

  return (
    <motion.div
      className={`flex items-start gap-3 rounded-[16px] border-[3px] border-black ${toneClass} p-3 shadow-[3px_3px_0_0_rgba(0,0,0,1)] sm:rounded-[18px] sm:p-3.5 sm:shadow-[4px_4px_0_0_rgba(0,0,0,1)]`}
      whileHover={{ x: 2 }}
      transition={{ duration: 0.2 }}
    >
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[2px] border-black bg-white text-black">
        {icon}
      </span>
      <div>
        <div className="text-[18px] font-bold leading-tight text-black">{title}</div>
        <div className="mt-1 text-[14px] leading-5 text-black/65">{description}</div>
      </div>
    </motion.div>
  )
}

function VibeBoard() {
  return (
    <div className="grid gap-8 sm:gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
      <motion.div
        className="relative flex justify-center lg:justify-start"
        initial={{ opacity: 0, x: -18 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <AnalyticsGlowCard />
      </motion.div>

      <motion.div
        className="relative max-w-[660px]"
        initial={{ opacity: 0, x: 18 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.06 }}
      >
        <h3 className="text-[clamp(2.5rem,5.8vw,5rem)] font-black uppercase leading-[0.9] tracking-[-0.07em] text-black">
          Real-Time
          <br />
          Analytics
        </h3>
        <div className="mt-5 max-w-[560px] border-l-[4px] border-black pl-4 text-[15px] leading-7 text-black/58 sm:mt-7 sm:pl-5 sm:text-[17px] sm:leading-[1.8]">
          Stop guessing. Start knowing. Our analytics engine gives creators and brands the structural insights they need in milliseconds.
        </div>

        <div className="mt-8 max-w-[540px] space-y-4">
          <EditorialFeatureRow
            icon={<Zap className="h-5 w-5" strokeWidth={2.6} />}
            title="Sub-Second Latency"
          />
          <EditorialFeatureRow
            icon={<Eye className="h-5 w-5" strokeWidth={2.6} />}
            title="Total Transparency"
          />
        </div>
      </motion.div>
    </div>
  )
}

function AnalyticsGlowCard() {
  const bars = [
    { shell: 'h-[40%]', fill: 'h-[60%]' },
    { shell: 'h-[60%]', fill: 'h-[40%]' },
    { shell: 'h-[75%]', fill: 'h-[80%]' },
    { shell: 'h-[45%]', fill: 'h-[50%]' },
    { shell: 'h-[85%]', fill: 'h-[90%]' },
    { shell: 'h-[65%]', fill: 'h-[70%]' },
    { shell: 'h-[95%]', fill: 'h-[85%]' },
  ]

  return (
    <div className="group relative flex w-full max-w-[300px] flex-col rounded-xl border-[3px] border-black bg-[#fffaf6] p-3.5 shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all duration-300 hover:translate-y-[-2px]">
      <div className="absolute inset-0 rounded-xl bg-[radial-gradient(circle_at_18%_18%,rgba(137,166,255,0.16),transparent_26%),radial-gradient(circle_at_84%_22%,rgba(255,140,120,0.16),transparent_24%),radial-gradient(circle_at_66%_80%,rgba(203,255,46,0.14),transparent_28%)] opacity-80" />
      <div className="absolute inset-px rounded-[11px] bg-[#fffaf6]" />

      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-[linear-gradient(135deg,#89a6ff_0%,#ffb59e_100%)]">
              <svg className="h-4 w-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-[13px] font-semibold text-black">Performance Analytics</h3>
          </div>

          <span className="flex items-center gap-1 rounded-full bg-[#cbff2e]/30 px-2 py-1 text-xs font-medium text-black/70">
            <span className="h-1.5 w-1.5 rounded-full bg-[#8eaf00]" />
            Weekly
          </span>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-black/8 bg-white/80 p-2.5">
            <p className="text-xs font-medium text-black/45">Total Views</p>
            <p className="text-base font-semibold text-black">24.5K</p>
            <span className="text-xs font-medium text-[#5f7eff]">+12.3%</span>
          </div>

          <div className="rounded-lg border border-black/8 bg-white/80 p-2.5">
            <p className="text-xs font-medium text-black/45">Conversions</p>
            <p className="text-base font-semibold text-black">1.2K</p>
            <span className="text-xs font-medium text-[#ff8c78]">+8.1%</span>
          </div>
        </div>

        <div className="mb-3 h-20 w-full overflow-hidden rounded-lg border border-black/8 bg-white/80 p-2.5">
          <div className="flex h-full w-full items-end justify-between gap-1">
            {bars.map((bar, index) => (
              <div key={`${bar.shell}-${index}`} className={`${bar.shell} w-2.5 rounded-sm bg-[#89a6ff]/25`}>
                <motion.div
                  className={`${bar.fill} w-full rounded-sm bg-[linear-gradient(180deg,#89a6ff_0%,#ff8c78_100%)]`}
                  initial={{ scaleY: 0.6, transformOrigin: 'bottom' }}
                  whileInView={{ scaleY: 1, transformOrigin: 'bottom' }}
                  viewport={{ once: true, amount: 0.8 }}
                  transition={{ duration: 0.38, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-black/45">Last 7 days</span>
            <svg className="h-4 w-4 text-black/45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <button
            type="button"
            className="flex items-center gap-1 rounded-lg border border-black/10 bg-[#111111] px-2.5 py-1 text-[11px] font-medium text-white transition-all duration-300 hover:bg-black/90"
          >
            View Details
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function EditorialFeatureRow({
  icon,
  title,
}: {
  icon: ReactNode
  title: string
}) {
  return (
    <motion.div
      className="flex items-center gap-3 rounded-[4px] border-[3px] border-black bg-[#f4f4f4] px-4 py-3.5 shadow-[3px_3px_0_0_rgba(0,0,0,1)] sm:px-5 sm:py-4 sm:shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
      whileHover={{ x: 2 }}
      transition={{ duration: 0.2 }}
    >
      <span className="inline-flex text-[#667400]">
        {icon}
      </span>
      <span className="text-[clamp(1rem,1.6vw,1.35rem)] font-black uppercase tracking-[0.02em] text-black">
        {title}
      </span>
    </motion.div>
  )
}

function PathPanel({
  label,
  tone,
  title,
  body,
  href,
  cta,
}: {
  label: string
  tone: 'coral' | 'lime'
  title: string
  body: string
  href: string
  cta: string
}) {
  const isCoral = tone === 'coral'
  const accent = isCoral ? '#ff8c78' : '#cbff2e'

  return (
    <div
      className="group relative h-full"
      style={{ perspective: '900px' }}
    >
      <div
        className="relative flex h-full flex-col overflow-hidden border-[3px] border-black p-5 transition-transform duration-500 ease-out sm:p-8 group-hover:[transform:rotateY(-2deg)_rotateX(2deg)_scale(1.02)]"
        style={{
          borderRadius: '48px 48px 12px 48px',
          background: isCoral
            ? 'linear-gradient(145deg, #ff8c78 0%, #ffb89e 40%, #ffe8de 100%)'
            : 'linear-gradient(145deg, #cbff2e 0%, #e2ff80 40%, #f4ffe0 100%)',
          boxShadow: `5px 5px 0 0 rgba(0,0,0,1), inset 0 -60px 80px -40px rgba(0,0,0,0.08)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Large faded accent circle */}
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-30 blur-[2px]"
          style={{ border: `3px solid ${isCoral ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.1)'}` }}
        />
        <div
          className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full opacity-20 blur-[1px]"
          style={{ border: `3px solid ${isCoral ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.08)'}` }}
        />

        {/* Label */}
        <div className="inline-flex w-fit items-center gap-2 rounded-full border-[2.5px] border-black bg-white px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.1em] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
          <CircleDot className="h-3 w-3" strokeWidth={3} />
          {label}
        </div>

        <div className="mt-6 flex flex-1 flex-col sm:mt-7">
          <h3 className="min-h-[3.15em] whitespace-pre-line text-[clamp(1.75rem,8vw,3rem)] font-black leading-[1.03] tracking-[-0.05em] text-black">
            {title}
          </h3>
          <p className="mt-4 max-w-[520px] text-[15px] leading-7 text-black/60 sm:text-[17px] sm:leading-8">{body}</p>
        </div>

        {/* CTA */}
        <Link
          href={href}
          className="mt-7 inline-flex items-center justify-center gap-2.5 self-start rounded-full border-[3px] border-black bg-black px-6 py-3 text-[13px] font-black uppercase tracking-[0.06em] text-white shadow-[3px_3px_0_0_rgba(0,0,0,0.3)] transition-all duration-300 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none sm:mt-8 sm:px-7 sm:py-3.5 sm:text-[14px] sm:shadow-[4px_4px_0_0_rgba(0,0,0,0.3)]"
        >
          {cta}
          <ArrowRight className="h-4 w-4" strokeWidth={2.7} />
        </Link>

        {/* Bottom-right decorative dot cluster */}
        <div className="pointer-events-none absolute bottom-5 right-6 flex items-end gap-1.5 opacity-25">
          <div className="h-2 w-2 rounded-full bg-black" />
          <div className="h-3 w-3 rounded-full bg-black" />
          <div className="h-1.5 w-1.5 rounded-full bg-black" />
        </div>
      </div>
    </div>
  )
}

function WhyCard({
  icon,
  tone,
  title,
  body,
}: {
  icon: ReactNode
  tone: 'coral' | 'lime'
  title: string
  body: string
}) {
  return (
    <div className="group rounded-[20px] border-[3px] border-black bg-white p-5 shadow-[5px_5px_0_0_rgba(0,0,0,1)] transition-transform duration-300 hover:-translate-y-1 sm:rounded-[24px] sm:p-6 sm:shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
      <div className="flex items-start gap-4 sm:gap-5">
        <div className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border-[3px] border-black ${tone === 'coral' ? 'bg-[#ff8c78]' : 'bg-[#cbff2e]'} shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition-transform duration-300 group-hover:rotate-[-8deg] sm:h-14 sm:w-14 sm:rounded-[16px] sm:shadow-[4px_4px_0_0_rgba(0,0,0,1)]`}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="text-[22px] font-black leading-[1.02] tracking-[-0.04em] text-black sm:text-[24px]">{title}</div>
          <p className="mt-3 text-[15px] leading-7 text-black/60 sm:text-[17px] sm:leading-8">{body}</p>
        </div>
      </div>
    </div>
  )
}

function BandWord({ label }: { label: string }) {
  return (
    <span className="text-[clamp(1.2rem,4vw,1.8rem)] sm:text-[clamp(2.2rem,6vw,4.8rem)] font-black uppercase leading-[0.9] tracking-[-0.06em]">
      {label}
    </span>
  )
}

function BandArrow() {
  return (
    <span className="inline-flex shrink-0 h-7 w-7 sm:h-12 sm:w-12 items-center justify-center rounded-full border-[1.5px] sm:border-[2px] border-black/15 bg-white/25 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]">
      <ArrowRight className="h-3.5 w-3.5 sm:h-6 sm:w-6" strokeWidth={3} />
    </span>
  )
}

function ContactItem({
  icon,
  label,
  content,
}: {
  icon: ReactNode
  label: string
  content: ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border-[2px] border-black bg-white shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
        {icon}
      </span>
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-black/45">{label}</div>
        <div className="text-[18px] font-semibold text-black/80">{content}</div>
      </div>
    </div>
  )
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  type?: string
}) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-black/65">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-[12px] border-[2px] border-black bg-white px-4 text-[14px] font-medium text-black outline-none"
        required
      />
    </div>
  )
}
