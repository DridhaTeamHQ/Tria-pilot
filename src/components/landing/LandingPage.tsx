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

        <section id="what-you-get" className="relative overflow-hidden border-t-[3px] border-black bg-[linear-gradient(180deg,#fffaf6_0%,#fff7fb_45%,#f9fff4_100%)] px-5 py-12 sm:px-8 lg:px-10 lg:py-14">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(255,90,169,0.12),transparent_22%),radial-gradient(circle_at_86%_22%,rgba(137,166,255,0.12),transparent_24%),radial-gradient(circle_at_50%_82%,rgba(203,255,46,0.1),transparent_26%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(17,17,17,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(17,17,17,0.04)_1px,transparent_1px)] bg-[size:42px_42px] opacity-35" />

          <motion.div
            className="relative z-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,560px)] lg:items-start">
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

              <div className="flex flex-col gap-7 lg:items-end">
                <div className="grid gap-3 sm:grid-cols-3 lg:w-full">
                  <MetricChip value="Fast" label="smooth visual creation" tone="pink" />
                  <MetricChip value="Smart" label="campaign-ready flow" tone="blue" />
                  <MetricChip value="Live" label="analytics + marketplace" tone="lime" />
                </div>

                <div className="w-full lg:pt-3">
                  <GlassFeatureStack />
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="relative z-10 mt-10 grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-center"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
          >
            <div className="rounded-[28px] border-[3px] border-black bg-[#fffdf7] p-6 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
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
      className={`rounded-[18px] border-[3px] border-black ${toneStyles} p-3.5 shadow-[4px_4px_0_0_rgba(0,0,0,1)]`}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <div className="text-[24px] font-black leading-none tracking-[-0.05em] text-black">{value}</div>
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
      rotation: -14,
      desktop: 'lg:left-10 lg:top-8',
    },
    {
      label: 'Launch',
      title: 'Campaign Flow',
      description: 'Approvals, assets, and launches in one line of motion.',
      accent: 'from-[#ffb7d6] to-[#ffd6f0]',
      icon: <Rocket className="h-5 w-5" strokeWidth={2.2} />,
      rotation: 4,
      desktop: 'lg:left-[188px] lg:top-14',
    },
    {
      label: 'Earn',
      title: 'Revenue Loop',
      description: 'Track performance and turn creator energy into growth.',
      accent: 'from-[#e4ff9d] to-[#cbff2e]',
      icon: <BadgeDollarSign className="h-5 w-5" strokeWidth={2.2} />,
      rotation: -24,
      desktop: 'lg:left-[370px] lg:top-5',
    },
  ] as const

  return (
    <div className="relative mx-auto flex w-full max-w-[620px] flex-col items-center gap-4 lg:h-[360px] lg:max-w-[620px] lg:block">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          className={`relative h-[245px] w-full max-w-[260px] overflow-hidden rounded-[28px] border border-white/50 bg-[linear-gradient(180deg,rgba(255,255,255,0.58),rgba(255,255,255,0.32))] p-5 shadow-[0_28px_55px_rgba(0,0,0,0.12)] backdrop-blur-[18px] transition-all duration-500 lg:absolute lg:w-[260px] ${card.desktop}`}
          initial={{ opacity: 0, y: 20, rotate: card.rotation }}
          whileInView={{ opacity: 1, y: 0, rotate: card.rotation }}
          viewport={{ once: true, amount: 0.3 }}
          whileHover={{ y: -6, rotate: card.rotation * 0.35 }}
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
              <div className="mt-6 text-[12px] font-black uppercase tracking-[0.14em] text-black/42">{card.label}</div>
              <div className="mt-2 text-[26px] font-black leading-[0.96] tracking-[-0.06em]">{card.title}</div>
            </div>

            <div>
              <div className="text-[13px] leading-6 text-black/55">{card.description}</div>
              <div className="mt-5 h-px bg-black/10" />
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-black/36">
                  Kiwikoo flow
                </span>
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
      className={`flex items-start gap-3 rounded-[18px] border-[3px] border-black ${toneClass} p-3.5 shadow-[4px_4px_0_0_rgba(0,0,0,1)]`}
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
    <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
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
        <div className="mt-7 max-w-[560px] border-l-[4px] border-black pl-5 text-[17px] leading-[1.8] text-black/58">
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
      className="flex items-center gap-3 rounded-[4px] border-[3px] border-black bg-[#f4f4f4] px-5 py-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
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
