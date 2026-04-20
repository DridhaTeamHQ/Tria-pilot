'use client'

import { type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BadgeDollarSign,
  Camera,
  ChartColumn,
  CircleDot,
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
  return (
    <div className="bg-[#f7eee4] px-3 pb-8 pt-[88px] text-[#111111] sm:px-4 lg:px-6 lg:pt-[104px] overflow-x-hidden" style={{ fontFamily: PF }}>
      <div className="mx-auto max-w-[1320px] overflow-hidden rounded-[34px] border-[3px] border-black bg-[#fbfaf6] shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
        <section className="relative overflow-hidden px-5 py-6 sm:px-8 lg:px-10 lg:py-10">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(17,17,17,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(17,17,17,0.06)_1px,transparent_1px)] bg-[size:42px_42px]" />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-[28%] bg-[radial-gradient(circle_at_22%_62%,rgba(255,140,120,0.18),transparent_52%)]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-[34%] bg-[radial-gradient(circle_at_35%_40%,rgba(203,255,46,0.16),transparent_46%)]" />
          <div className="pointer-events-none absolute -left-4 top-[92px] h-[88px] w-[88px] rounded-full border-[3px] border-[#ff5aa9] bg-[#ff5aa9] shadow-[6px_6px_0_0_rgba(0,0,0,1)] hidden sm:block" />
          <div className="pointer-events-none absolute -right-8 bottom-20 h-[92px] w-[92px] rounded-full border-[3px] border-black bg-[#ffd243] shadow-[6px_6px_0_0_rgba(0,0,0,1)] hidden sm:block" />
          <div className="pointer-events-none absolute inset-x-0 top-3 text-center kiwikoo-wordmark text-[clamp(5rem,17vw,14rem)] leading-none tracking-[0.02em] text-black/[0.04]">
            KIWIKOO
          </div>

          <div className="relative z-10 grid gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div className="max-w-[620px] pt-1 text-center lg:pt-3 lg:text-left">
              <h1 className="mt-3 text-[clamp(3.3rem,7vw,6.2rem)] font-black uppercase leading-[0.9] tracking-[-0.07em] text-black">
                Where Fashion
                <br />
                Meets <span className="text-[#ff8c78]">AI.</span>
              </h1>
              <p className="mt-6 max-w-[560px] text-[18px] leading-8 text-black/68 max-lg:mx-auto">
                The easiest way for creators and brands to create, launch, and convert with AI-powered fashion tools.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <Link
                  href="/signup/influencer"
                  className="group relative inline-flex h-auto min-h-[56px] sm:min-h-[72px] w-full sm:w-auto sm:min-w-[210px] items-center justify-center overflow-hidden rounded-[16px] border-[3px] border-black bg-[#FF8C69] px-5 py-3 text-[16px] font-black text-black shadow-[5px_5px_0_0_rgba(0,0,0,1)] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
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
                  className="group relative inline-flex h-auto min-h-[56px] sm:min-h-[72px] w-full sm:w-auto sm:min-w-[210px] items-center justify-center overflow-hidden rounded-[16px] border-[3px] border-black bg-[#cbff2e] px-5 py-3 text-[16px] font-black text-black shadow-[5px_5px_0_0_rgba(0,0,0,1)] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
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

            <div className="group relative mx-auto w-full max-w-[520px]">
              <div className="absolute -left-2 top-12 z-20 rounded-[22px] border-[3px] border-black bg-[#FFD93D] px-4 py-4 shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition-transform duration-300 group-hover:-translate-y-2 group-hover:rotate-[-8deg] sm:-left-5 hidden sm:block">
                <Zap className="h-8 w-8 text-black" strokeWidth={2.4} />
              </div>
              <div className="absolute right-0 top-2 z-20 rounded-[22px] border-[3px] border-black bg-[#89a6ff] px-4 py-4 shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-2 group-hover:rotate-[8deg] hidden sm:block">
                <Sparkles className="h-8 w-8 text-black" strokeWidth={2.4} />
              </div>
              <div className="absolute right-6 top-28 z-20 rounded-[22px] border-[3px] border-black bg-[#cbff2e] px-4 py-4 shadow-[5px_5px_0_0_rgba(0,0,0,1)] transition-transform duration-300 group-hover:translate-y-1 group-hover:rotate-[6deg] hidden sm:block">
                <Star className="h-7 w-7 text-black" strokeWidth={2.4} />
              </div>

              <div className="relative min-h-[320px] sm:min-h-[500px]">
                <div className="absolute inset-x-[16%] inset-y-[12%] rounded-[30px] border-[3px] border-black bg-[linear-gradient(180deg,#fff7ec_0%,#f6ffd9_100%)] shadow-[7px_7px_0_0_rgba(0,0,0,1)] transition-transform duration-500 group-hover:scale-[1.01]" />
                <div className="pointer-events-none absolute inset-x-[20%] inset-y-[18%] rounded-[26px] bg-[radial-gradient(circle_at_25%_30%,rgba(255,140,120,0.2),transparent_38%),radial-gradient(circle_at_78%_28%,rgba(203,255,46,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.75),rgba(255,247,232,0.45))]" />
                <div className="absolute bottom-5 right-0 z-10 w-[220px] rotate-[7deg] rounded-[26px] border-[3px] border-black bg-white p-3 shadow-[7px_7px_0_0_rgba(0,0,0,1)] transition-transform duration-300 group-hover:translate-y-1 group-hover:rotate-[10deg] sm:w-[250px]">
                  <div className="relative h-[170px] overflow-hidden rounded-[18px] bg-[#fff6f2] sm:h-[190px]">
                    <Image
                      src="/landing/hero-brand.png"
                      alt="Brand setup"
                      fill
                      sizes="(min-width: 1024px) 250px, 220px"
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
                      sizes="(min-width: 1024px) 420px, 70vw"
                      className="object-contain object-bottom drop-shadow-[0_18px_28px_rgba(0,0,0,0.18)] transition-transform duration-500 group-hover:scale-[1.03]"
                      priority
                    />
                  </div>
                </div>
                <div className="absolute bottom-4 left-1/2 z-10 flex w-max -translate-x-1/2 items-center gap-2 rounded-full border-[3px] border-black bg-white px-5 py-2 text-[12px] font-black uppercase tracking-[0.08em] text-black shadow-[5px_5px_0_0_rgba(0,0,0,1)] transition-transform duration-300 group-hover:-translate-y-1 sm:bottom-5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#cbff2e]" />
                  Fashion AI studio
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="creator-brand-paths" className="border-t-[3px] border-black bg-white px-5 py-12 sm:px-8 lg:px-10 lg:py-14">
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
              body="Find the right creators, generate strong campaign visuals, and launch with more confidence."
              href="/signup/brand"
              cta="Start scaling"
            />
          </div>
        </section>

        <section id="what-you-get" className="relative overflow-hidden border-t-[3px] border-black bg-[linear-gradient(180deg,#fffaf6_0%,#fff7fb_45%,#f9fff4_100%)] px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
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
                <div className="inline-flex items-center gap-2 rounded-full border-[2px] border-black bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#89a6ff]" />
                  Platform overview
                </div>
                <h2 className="mt-5 text-[clamp(2.8rem,6vw,5rem)] font-black leading-[0.92] tracking-[-0.07em] text-black">
                  What <span className="bg-[linear-gradient(90deg,#89a6ff_0%,#c874ff_52%,#ff73bb_100%)] bg-clip-text text-transparent">Kiwikoo</span>
                  <br />
                  can do for you
                </h2>
                <p className="mt-5 max-w-[700px] text-[18px] leading-8 text-black/62">
                  A cleaner, lighter product section with smooth motion, cooler copy, and feature cards that feel modern without fighting the rest of your website.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:max-w-[420px]">
                <MetricChip value="Fast" label="smooth visual creation" tone="pink" />
                <MetricChip value="Smart" label="campaign-ready flow" tone="blue" />
                <MetricChip value="Live" label="analytics + marketplace" tone="lime" />
              </div>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              <GenZFeatureCard
                icon={<Camera className="h-6 w-6" strokeWidth={2.2} />}
                accent="blue"
                eyebrow="Create"
                title="AI Try-On Studio"
                body="Instant vibe checks for outfits and product visuals without a long shoot-production loop."
                tags={['Virtual looks', 'Faster previews']}
                preview="studio"
                delay={0}
              />
              <GenZFeatureCard
                icon={<Rocket className="h-6 w-6" strokeWidth={2.2} />}
                accent="pink"
                eyebrow="Launch"
                title="Campaign Workflows"
                body="Bring creators, assets, and approvals into one smoother campaign flow that moves faster."
                tags={['Creator-ready', 'Simple approvals']}
                preview="workflow"
                delay={0.08}
              />
              <GenZFeatureCard
                icon={<BadgeDollarSign className="h-6 w-6" strokeWidth={2.2} />}
                accent="violet"
                eyebrow="Earn"
                title="Affiliate Engine"
                body="Track action, connect products to posts, and turn creator energy into clearer revenue signals."
                tags={['Revenue loop', 'Live tracking']}
                preview="network"
                delay={0.16}
              />
            </div>
          </motion.div>

          <motion.div
            className="relative z-10 mt-6 grid gap-5 lg:grid-cols-[0.92fr_1.08fr]"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
          >
            <div className="rounded-[30px] border-[3px] border-black bg-[#fffdf7] p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)] lg:p-7">
              <MiniPill label="For creators + brands" />
              <div className="mt-6">
                <div className="text-[clamp(2rem,4vw,3.2rem)] font-black leading-[0.93] tracking-[-0.06em] text-black">
                  Keep it clean,
                  <br />
                  fast, and easy to get.
                </div>
                <p className="mt-4 max-w-[520px] text-[17px] leading-8 text-black/64">
                  The section still feels premium, but now the motion is softer and the layout stays bright so it matches the rest of your landing page.
                </p>
              </div>

              <div className="mt-8 space-y-4">
                <InsightPill
                  icon={<ChartColumn className="h-5 w-5" strokeWidth={2.2} />}
                  title="Real-Time Analytics"
                  description="Clear performance signals with a softer dashboard feel."
                  tone="pink"
                />
                <InsightPill
                  icon={<Store className="h-5 w-5" strokeWidth={2.2} />}
                  title="Creator Marketplace"
                  description="Find products, creators, and outcomes in one easy flow."
                  tone="lime"
                />
              </div>
            </div>

            <VibeBoard />
          </motion.div>
        </section>

        <section id="why-kiwikoo" className="border-t-[3px] border-black bg-[#fbfaf6] px-5 py-12 sm:px-8 lg:px-10 lg:py-14">
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

        <section className="relative overflow-hidden border-t-[3px] border-black bg-[#ff8c78] px-5 py-6 sm:px-8 lg:px-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_50%,rgba(255,255,255,0.22),transparent_16%),radial-gradient(circle_at_90%_50%,rgba(255,255,255,0.18),transparent_18%)]" />
          <div className="relative flex flex-wrap items-center justify-center gap-3 text-center text-black sm:gap-5">
            <BandWord label="Create" />
            <BandArrow />
            <BandWord label="Share" />
            <BandArrow />
            <BandWord label="Earn" />
          </div>
        </section>

        <footer className="border-t-[3px] border-black bg-[#fbfaf6] px-5 py-10 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="flex items-center gap-3">
                {[
                  { icon: <Facebook className="h-4 w-4" strokeWidth={2.2} />, label: 'Facebook' },
                  { icon: <Instagram className="h-4 w-4" strokeWidth={2.2} />, label: 'Instagram' },
                  { icon: <Youtube className="h-4 w-4" strokeWidth={2.2} />, label: 'YouTube' },
                  { icon: <Linkedin className="h-4 w-4" strokeWidth={2.2} />, label: 'LinkedIn' },
                ].map((item) => (
                  <span
                    key={item.label}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border-[2px] border-black bg-white shadow-[3px_3px_0_0_rgba(0,0,0,1)]"
                    aria-label={item.label}
                  >
                    {item.icon}
                  </span>
                ))}
              </div>

              <div className="grid gap-6 text-[12px] font-bold uppercase tracking-[0.08em] text-black/65 sm:grid-cols-3 sm:gap-10">
                <div>
                  <div className="mb-2 text-black/35">Company</div>
                  <div className="space-y-2 text-black">
                    <Link href="/about" className="block hover:underline">About Us</Link>
                    <Link href="/signup/influencer" className="block hover:underline">Join Us</Link>
                    <Link href="/marketplace" className="block hover:underline">Marketplace</Link>
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-black/35">Legal</div>
                  <div className="space-y-2 text-black">
                    <Link href="/privacy" className="block hover:underline">Privacy Policy</Link>
                    <Link href="/terms" className="block hover:underline">Terms of Use</Link>
                  </div>
                </div>
                <div className="space-y-2 text-right max-sm:text-left">
                  <div>(C) 2026 DRIDHATECHNOLOGIES. ALL RIGHTS RESERVED.</div>
                  <div>ENGLISH (US)</div>
                </div>
              </div>
            </div>

            <div className="kiwikoo-wordmark text-[clamp(4.8rem,18vw,10rem)] leading-none text-black/[0.05] overflow-hidden">
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
      className={`rounded-[22px] border-[3px] border-black ${toneStyles} p-4 shadow-[5px_5px_0_0_rgba(0,0,0,1)]`}
      whileHover={{ y: -4, rotate: -1.5 }}
      transition={{ type: 'spring', stiffness: 240, damping: 18 }}
    >
      <div className="text-[28px] font-black leading-none tracking-[-0.06em] text-black">{value}</div>
      <div className="mt-2 text-[11px] font-black uppercase leading-5 tracking-[0.12em] text-black/65">{label}</div>
    </motion.div>
  )
}

function GenZFeatureCard({
  icon,
  accent,
  eyebrow,
  title,
  body,
  tags,
  preview,
  delay = 0,
}: {
  icon: ReactNode
  accent: 'blue' | 'pink' | 'violet'
  eyebrow: string
  title: string
  body: string
  tags: string[]
  preview: 'studio' | 'workflow' | 'network'
  delay?: number
}) {
  const cardTone =
    accent === 'blue'
      ? 'bg-[#f7f9ff]'
      : accent === 'pink'
        ? 'bg-[#fff7fc]'
        : 'bg-[#faf7ff]'
  const glowTone =
    accent === 'blue'
      ? 'bg-[#89a6ff]/18'
      : accent === 'pink'
        ? 'bg-[#ff73bb]/16'
        : 'bg-[#b280ff]/18'
  const iconTone =
    accent === 'blue'
      ? 'bg-[#e5ecff] text-[#5f7eff]'
      : accent === 'pink'
        ? 'bg-[#ffe0f0] text-[#e24ea0]'
        : 'bg-[#eee3ff] text-[#8855ff]'
  const borderGlow =
    accent === 'blue'
      ? 'rgba(137,166,255,0.34)'
      : accent === 'pink'
        ? 'rgba(255,115,187,0.32)'
        : 'rgba(178,128,255,0.3)'

  return (
    <motion.div
      className={`group relative flex min-h-[360px] flex-col overflow-hidden rounded-[28px] border-[3px] border-black ${cardTone} p-5 shadow-[7px_7px_0_0_rgba(0,0,0,1)] sm:p-6`}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.995 }}
      style={{ transformOrigin: 'center bottom' }}
    >
      <motion.div
        className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full ${glowTone} blur-[6px]`}
        animate={{ scale: [1, 1.06, 1], x: [0, -4, 0], y: [0, 4, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ boxShadow: `inset 0 0 0 1px ${borderGlow}` }}
      />
      <motion.div
        className={`inline-flex h-14 w-14 items-center justify-center rounded-[16px] border-[2px] border-black/80 ${iconTone} shadow-[4px_4px_0_0_rgba(0,0,0,0.9)]`}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.25 }}
      >
        <motion.span animate={{ y: [0, -1.5, 0] }} transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }} className="inline-flex">
          {icon}
        </motion.span>
      </motion.div>
      <div className="mt-6 text-[11px] font-black uppercase tracking-[0.16em] text-black/48">{eyebrow}</div>
      <h3 className="mt-2 min-h-[2.1em] text-[28px] font-black leading-[1] tracking-[-0.045em] text-black">{title}</h3>
      <p className="mt-4 text-[16px] leading-7 text-black/58">{body}</p>
      <FeaturePreview preview={preview} accent={accent} />
      <div className="mt-5 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border-[2px] border-black/65 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-black"
          >
            {tag}
          </span>
        ))}
      </div>
    </motion.div>
  )
}

function FeaturePreview({
  preview,
  accent,
}: {
  preview: 'studio' | 'workflow' | 'network'
  accent: 'blue' | 'pink' | 'violet'
}) {
  const glow =
    accent === 'blue'
      ? 'rgba(137,166,255,0.34)'
      : accent === 'pink'
        ? 'rgba(255,115,187,0.34)'
        : 'rgba(178,128,255,0.34)'

  if (preview === 'studio') {
    return (
      <div className="relative mt-6 h-[118px] overflow-hidden rounded-[18px] border-[2px] border-black bg-[linear-gradient(180deg,#111827_0%,#1f2937_100%)]">
        <div className="absolute inset-x-0 bottom-0 h-8 bg-[linear-gradient(180deg,rgba(190,120,255,0)_0%,rgba(190,120,255,0.35)_100%)]" />
        <motion.div
          className="absolute bottom-0 left-1/2 h-[84px] w-[34px] -translate-x-1/2 rounded-t-[18px] bg-[linear-gradient(180deg,#92f3ff_0%,#ff92c9_48%,#ffe36f_100%)]"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ boxShadow: `0 0 24px ${glow}` }}
        />
        <div className="absolute bottom-0 left-[22%] right-[22%] h-px bg-[linear-gradient(90deg,transparent,#d17eff,transparent)]" />
      </div>
    )
  }

  if (preview === 'workflow') {
    return (
      <div className="relative mt-6 h-[118px] overflow-hidden rounded-[18px] border-[2px] border-black bg-[linear-gradient(180deg,#101722_0%,#182235_100%)]">
        {[
          { top: '20%', left: '12%' },
          { top: '26%', left: '42%' },
          { top: '56%', left: '66%' },
          { top: '60%', left: '26%' },
          { top: '24%', left: '72%' },
        ].map((node, index) => (
          <motion.span
            key={`${node.top}-${node.left}`}
            className="absolute h-3 w-3 rounded-full bg-[#d676ff]"
            style={{ top: node.top, left: node.left, boxShadow: `0 0 14px ${glow}` }}
            animate={{ scale: [1, 1.18, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2.6, repeat: Infinity, delay: index * 0.2, ease: 'easeInOut' }}
          />
        ))}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 118" preserveAspectRatio="none">
          <path d="M38 30 C 90 30, 90 42, 128 40 S 180 74, 208 72 S 245 34, 264 28" fill="none" stroke="#6be4ff" strokeWidth="2" strokeOpacity="0.85" />
          <path d="M38 30 C 88 62, 118 84, 198 72" fill="none" stroke="#d676ff" strokeWidth="1.8" strokeOpacity="0.7" />
        </svg>
      </div>
    )
  }

  return (
    <div className="relative mt-6 h-[118px] overflow-hidden rounded-[18px] border-[2px] border-black bg-[radial-gradient(circle_at_50%_50%,#1f2445_0%,#141729_52%,#0d101d_100%)]">
      <motion.div
        className="absolute left-1/2 top-1/2 h-[68px] w-[68px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#a47cff]"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ boxShadow: `0 0 24px ${glow}` }}
      />
      <div className="absolute left-[18%] top-[26%] h-4 w-4 rounded-full bg-[#8fdcff]" style={{ boxShadow: `0 0 12px ${glow}` }} />
      <div className="absolute right-[16%] top-[56%] h-3 w-3 rounded-full bg-[#d676ff]" style={{ boxShadow: `0 0 12px ${glow}` }} />
      <div className="absolute left-[26%] bottom-[18%] h-2.5 w-2.5 rounded-full bg-[#ff84cb]" style={{ boxShadow: `0 0 10px ${glow}` }} />
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
      className={`flex items-start gap-4 rounded-[22px] border-[3px] border-black ${toneClass} p-4 shadow-[5px_5px_0_0_rgba(0,0,0,1)]`}
      whileHover={{ x: 4, y: -2 }}
      transition={{ type: 'spring', stiffness: 240, damping: 18 }}
    >
      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[2px] border-black bg-white text-black">
        {icon}
      </span>
      <div>
        <div className="text-[22px] font-bold leading-tight text-black">{title}</div>
        <div className="mt-1 text-[16px] leading-6 text-black/65">{description}</div>
      </div>
    </motion.div>
  )
}

function VibeBoard() {
  return (
    <div className="relative overflow-hidden rounded-[30px] border-[3px] border-black bg-[#f7f8ff] p-5 text-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] lg:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,90,169,0.12),transparent_24%),radial-gradient(circle_at_86%_18%,rgba(137,166,255,0.14),transparent_22%),radial-gradient(circle_at_64%_84%,rgba(203,255,46,0.12),transparent_24%)]" />
      <div className="relative flex items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-black/48">Live product preview</div>
          <div className="mt-2 text-[32px] font-black leading-[0.94] tracking-[-0.05em] text-black">
            Smooth insights,
            <br />
            lighter vibe.
          </div>
        </div>
        <div className="rounded-[18px] border-[2px] border-black bg-white px-4 py-3 text-right shadow-[4px_4px_0_0_rgba(0,0,0,0.92)]">
          <div className="text-[22px] font-black leading-none text-[#8b63ff]">LIVE</div>
          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-black/45">Synced stack</div>
        </div>
      </div>

      <div className="relative mt-7 overflow-hidden rounded-[24px] border-[2px] border-black bg-white p-4 sm:p-5">
        <motion.div
          className="flex w-max gap-3"
          animate={{ x: [0, -18, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        >
          {[
            { label: 'Moodboard', tone: 'bg-[#ffe1f1]', icon: <Sparkles className="h-5 w-5" strokeWidth={2.2} /> },
            { label: 'Looks', tone: 'bg-[#e5ecff]', icon: <Camera className="h-5 w-5" strokeWidth={2.2} /> },
            { label: 'Campaign', tone: 'bg-[#e9e3ff]', icon: <Rocket className="h-5 w-5" strokeWidth={2.2} /> },
            { label: 'Sales', tone: 'bg-[#f2ffc9]', icon: <BadgeDollarSign className="h-5 w-5" strokeWidth={2.2} /> },
          ].map((item) => (
            <div
              key={item.label}
              className={`flex min-w-[140px] items-center gap-3 rounded-[20px] border-[2px] border-black px-4 py-4 font-black uppercase tracking-[0.1em] text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] ${item.tone}`}
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border-[2px] border-black bg-white">
                {item.icon}
              </span>
              <span className="text-[11px]">{item.label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      <div className="relative mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[24px] border-[2px] border-black bg-white p-4">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.14em] text-black/48">
            <span>Signal flow</span>
            <span>Always moving</span>
          </div>
          <div className="mt-5 space-y-4">
            {[
              { label: 'Looks generated', value: '92%', tone: '#ff5aa9' },
              { label: 'Campaign approval speed', value: '74%', tone: '#89a6ff' },
              { label: 'Affiliate conversion pulse', value: '61%', tone: '#cbff2e' },
            ].map((bar) => (
              <div key={bar.label}>
                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.1em] text-black/60">
                  <span>{bar.label}</span>
                  <span>{bar.value}</span>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full border border-black/10 bg-black/5">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: bar.tone }}
                    initial={{ width: 0 }}
                    whileInView={{ width: bar.value }}
                    viewport={{ once: true, amount: 0.7 }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          {[
            { title: 'Creator mode', body: 'Make the visual, share the drop, track the energy.', icon: <Camera className="h-4 w-4" strokeWidth={2.2} />, tone: 'bg-[#ffd4ea] text-black' },
            { title: 'Brand mode', body: 'Build cleaner launches with briefs, assets, and proof.', icon: <Rocket className="h-4 w-4" strokeWidth={2.2} />, tone: 'bg-[#d9e3ff] text-black' },
            { title: 'Revenue mode', body: 'See what converts and double down without guessing.', icon: <BadgeDollarSign className="h-4 w-4" strokeWidth={2.2} />, tone: 'bg-[#efffc0] text-black' },
          ].map((item, index) => (
            <motion.div
              key={item.title}
              className={`rounded-[22px] border-[2px] border-black p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)] ${item.tone}`}
              initial={{ x: 24, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.45, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border-[2px] border-black bg-white">
                  {item.icon}
                </span>
                <div className="text-[18px] font-black leading-tight">{item.title}</div>
              </div>
              <div className="mt-2 text-[14px] leading-6 text-black/70">{item.body}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
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
        className="relative flex h-full flex-col overflow-hidden border-[3px] border-black p-7 transition-transform duration-500 ease-out sm:p-8 group-hover:[transform:rotateY(-2deg)_rotateX(2deg)_scale(1.02)]"
        style={{
          borderRadius: '48px 48px 12px 48px',
          background: isCoral
            ? 'linear-gradient(145deg, #ff8c78 0%, #ffb89e 40%, #ffe8de 100%)'
            : 'linear-gradient(145deg, #cbff2e 0%, #e2ff80 40%, #f4ffe0 100%)',
          boxShadow: `8px 8px 0 0 rgba(0,0,0,1), inset 0 -60px 80px -40px rgba(0,0,0,0.08)`,
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

        <div className="mt-7 flex flex-1 flex-col">
          <h3 className="min-h-[3.15em] whitespace-pre-line text-[clamp(2rem,3vw,3rem)] font-black leading-[1.03] tracking-[-0.05em] text-black">
            {title}
          </h3>
          <p className="mt-4 max-w-[520px] text-[17px] leading-8 text-black/60">{body}</p>
        </div>

        {/* CTA */}
        <Link
          href={href}
          className="mt-8 inline-flex items-center justify-center gap-2.5 self-start rounded-full border-[3px] border-black bg-black px-7 py-3.5 text-[14px] font-black uppercase tracking-[0.06em] text-white shadow-[4px_4px_0_0_rgba(0,0,0,0.3)] transition-all duration-300 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
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
    <div className="group rounded-[24px] border-[3px] border-black bg-white p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)] transition-transform duration-300 hover:-translate-y-1">
      <div className="flex items-start gap-5">
        <div className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] border-[3px] border-black ${tone === 'coral' ? 'bg-[#ff8c78]' : 'bg-[#cbff2e]'} shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-transform duration-300 group-hover:rotate-[-8deg]`}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="text-[24px] font-black leading-[1.02] tracking-[-0.04em] text-black">{title}</div>
          <p className="mt-3 text-[17px] leading-8 text-black/60">{body}</p>
        </div>
      </div>
    </div>
  )
}

function BandWord({ label }: { label: string }) {
  return (
    <span className="text-[clamp(2.2rem,6vw,4.8rem)] font-black uppercase leading-[0.9] tracking-[-0.06em]">
      {label}
    </span>
  )
}

function BandArrow() {
  return (
    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border-[2px] border-black/15 bg-white/25 text-[clamp(1.8rem,3vw,2.5rem)] font-black leading-none shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]">
      →
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
