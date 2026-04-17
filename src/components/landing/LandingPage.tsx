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

        <section id="creator-brand-paths" className="border-t-[3px] border-black bg-[#0e1117] px-5 py-14 text-white sm:px-8 lg:px-10 lg:py-16">
          <motion.div
            className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-end"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/70 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-[#ff8c69]" />
                Audience modes
              </span>
              <h2 className="mt-5 text-[clamp(2.7rem,6vw,5.8rem)] font-black leading-[0.88] tracking-[-0.07em] text-white">
                Built as
                <br />
                two distinct
                <br />
                experiences.
              </h2>
            </div>

            <p className="max-w-[640px] text-[17px] leading-8 text-white/62 lg:justify-self-end">
              These are no longer brochure blocks. Each side now behaves like its own product world, with stronger contrast, mood, and motion so creators and brands immediately feel the difference.
            </p>
          </motion.div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
            <AudienceShowcaseCard
              eyebrow="For creators"
              accentWord="CREATE"
              tone="coral"
              title={`Your lookbook,\nyour speed,\nyour revenue.`}
              body="Generate AI looks, publish faster, and turn every visual into a monetizable surface without shoots, delays, or brand chasing."
              points={['AI look generation', 'Affiliate-ready output', 'Creator-first speed']}
              href="/signup/influencer"
              cta="Start creating"
              icon={<Sparkles className="h-5 w-5" strokeWidth={2.3} />}
            />
            <AudienceShowcaseCard
              eyebrow="For brands"
              accentWord="SCALE"
              tone="lime"
              title={`Campaign systems\nwithout the\nproduction drag.`}
              body="Source the right creators, build stronger campaign visuals, and launch with cleaner approvals, better signal, and less wasted spend."
              points={['Creator matching', 'Visual campaign engine', 'Clearer performance signal']}
              href="/signup/brand"
              cta="Start scaling"
              icon={<Rocket className="h-5 w-5" strokeWidth={2.3} />}
            />
          </div>
        </section>

        <section id="what-you-get" className="border-t-[3px] border-black bg-[linear-gradient(180deg,#11151d_0%,#161b24_100%)] px-5 py-14 text-white sm:px-8 lg:px-10 lg:py-16">
          <motion.div
            className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/70">
                <span className="h-2 w-2 rounded-full bg-[#cbff2e]" />
                Platform architecture
              </span>
              <h2 className="mt-5 text-[clamp(2.8rem,6vw,5.9rem)] font-black leading-[0.88] tracking-[-0.07em] text-white">
                What Kiwikoo
                <br />
                actually does.
              </h2>
            </div>

            <div className="space-y-4 lg:justify-self-end">
              <p className="max-w-[620px] text-[17px] leading-8 text-white/60">
                The old white cards are gone. This section now reads like a product system: clearer hierarchy, stronger depth, and feature blocks that feel cinematic instead of generic.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Try-on', 'Campaign ops', 'Affiliate flow'].map((label) => (
                  <span key={label} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white/64">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.06fr_0.94fr]">
            <div className="space-y-5">
              <FeatureStripCard
                index="01"
                icon={<Camera className="h-5 w-5" strokeWidth={2.2} />}
                title="AI Try-On Studio"
                body="Create production-grade fashion visuals with less coordination overhead and faster creative iteration."
                tag="Virtual looks"
                tone="blue"
              />
              <FeatureStripCard
                index="02"
                icon={<Rocket className="h-5 w-5" strokeWidth={2.2} />}
                title="Campaign Workflows"
                body="Move from creator selection to campaign-ready assets with fewer approval loops and better operational flow."
                tag="Campaign-ready"
                tone="teal"
              />
              <FeatureStripCard
                index="03"
                icon={<BadgeDollarSign className="h-5 w-5" strokeWidth={2.2} />}
                title="Affiliate Engine"
                body="Connect visual output to revenue behavior so creators and brands can see where momentum actually converts."
                tag="Creator revenue"
                tone="pink"
              />
            </div>

            <SignalStage />
          </div>
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

function AudienceShowcaseCard({
  eyebrow,
  accentWord,
  tone,
  title,
  body,
  points,
  href,
  cta,
  icon,
}: {
  eyebrow: string
  accentWord: string
  tone: 'coral' | 'lime'
  title: string
  body: string
  points: string[]
  href: string
  cta: string
  icon: ReactNode
}) {
  const isCoral = tone === 'coral'
  const borderTone = isCoral ? 'rgba(255,140,120,0.45)' : 'rgba(203,255,46,0.38)'
  const glow = isCoral ? 'rgba(255,140,120,0.28)' : 'rgba(203,255,46,0.22)'
  const background = isCoral
    ? 'linear-gradient(145deg, #1b1112 0%, #2d1514 42%, #18161e 100%)'
    : 'linear-gradient(145deg, #12170d 0%, #1a2310 42%, #14171c 100%)'
  const accent = isCoral ? '#ff8c69' : '#cbff2e'
  const buttonStyle = isCoral ? 'bg-[#ff8c69] text-black' : 'bg-[#cbff2e] text-black'

  return (
    <motion.article
      className="group relative overflow-hidden rounded-[34px] border p-7 sm:p-8"
      initial={{ opacity: 0, y: 28, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8, rotate: isCoral ? -0.45 : 0.45 }}
      style={{
        borderColor: borderTone,
        background,
        boxShadow: `0 28px 80px -42px ${glow}, inset 0 0 0 1px rgba(255,255,255,0.03)`,
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.08),transparent_18%),radial-gradient(circle_at_82%_20%,rgba(255,255,255,0.08),transparent_20%)]" />
      <motion.div
        className="pointer-events-none absolute -right-5 top-5 text-[clamp(4.5rem,10vw,7rem)] font-black leading-none tracking-[-0.08em] text-white/[0.06]"
        animate={{ x: [0, -6, 0], opacity: [0.06, 0.1, 0.06] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      >
        {accentWord}
      </motion.div>

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/78">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/8">
              {icon}
            </span>
            {eyebrow}
          </span>
          <span className="hidden text-[11px] font-black uppercase tracking-[0.18em] text-white/35 sm:block">
            Live mode
          </span>
        </div>

        <h3 className="mt-10 whitespace-pre-line text-[clamp(2.3rem,4.2vw,4.4rem)] font-black leading-[0.9] tracking-[-0.07em] text-white">
          {title}
        </h3>
        <p className="mt-5 max-w-[34rem] text-[17px] leading-8 text-white/62">{body}</p>

        <div className="mt-7 flex flex-wrap gap-2">
          {points.map((point) => (
            <span key={point} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white/72">
              {point}
            </span>
          ))}
        </div>

        <div className="mt-10 flex items-end justify-between gap-5">
          <Link
            href={href}
            className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[13px] font-black uppercase tracking-[0.12em] shadow-[0_10px_30px_-16px_rgba(0,0,0,0.9)] transition-transform duration-300 hover:-translate-y-0.5 ${buttonStyle}`}
          >
            {cta}
            <ArrowRight className="h-4 w-4" strokeWidth={2.7} />
          </Link>

          <div className="flex items-center gap-2">
            {[0, 1, 2].map((dot) => (
              <span
                key={dot}
                className={`rounded-full ${dot === 1 ? 'h-4 w-4' : 'h-2.5 w-2.5'}`}
                style={{ backgroundColor: dot === 1 ? accent : 'rgba(255,255,255,0.24)' }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.article>
  )
}

function FeatureStripCard({
  index,
  icon,
  title,
  body,
  tag,
  tone,
}: {
  index: string
  icon: ReactNode
  title: string
  body: string
  tag: string
  tone: 'blue' | 'teal' | 'pink'
}) {
  const accent = tone === 'blue' ? '#8da2ff' : tone === 'teal' ? '#2fc8b9' : '#ff5fae'
  const glow = tone === 'blue' ? 'rgba(141,162,255,0.18)' : tone === 'teal' ? 'rgba(47,200,185,0.18)' : 'rgba(255,95,174,0.18)'

  return (
    <motion.article
      className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.035] p-6 backdrop-blur-sm"
      initial={{ opacity: 0, x: -24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ x: 8 }}
      style={{ boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.02), 0 24px 60px -40px ${glow}` }}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-px" style={{ background: `linear-gradient(180deg, transparent, ${accent}, transparent)` }} />
      <motion.div
        className="pointer-events-none absolute -right-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full blur-3xl"
        style={{ backgroundColor: glow }}
        animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-5">
          <div className="pt-1 text-[11px] font-black uppercase tracking-[0.16em] text-white/36">
            {index}
          </div>
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]" style={{ color: accent }}>
            {icon}
          </div>
          <div className="max-w-[34rem]">
            <h3 className="text-[clamp(1.8rem,3vw,2.8rem)] font-black leading-[0.94] tracking-[-0.05em] text-white">
              {title}
            </h3>
            <p className="mt-3 text-[16px] leading-7 text-white/58">{body}</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-4 sm:items-end">
          <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/72">
            {tag}
          </span>
          <div className="flex items-center gap-2">
            {[0, 1, 2, 3].map((dot) => (
              <span
                key={dot}
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: dot < 3 ? accent : 'rgba(255,255,255,0.16)', opacity: dot < 3 ? 1 - dot * 0.2 : 1 }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.article>
  )
}

function SignalStage() {
  const steps = [
    { label: 'Source signal', icon: <Camera className="h-4 w-4" strokeWidth={2.2} />, accent: '#8da2ff' },
    { label: 'Build asset', icon: <Store className="h-4 w-4" strokeWidth={2.2} />, accent: '#ff8c69' },
    { label: 'Launch output', icon: <Sparkles className="h-4 w-4" strokeWidth={2.2} />, accent: '#cbff2e' },
  ]

  return (
    <motion.div
      className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#090d12] p-5 sm:p-6"
      initial={{ opacity: 0, x: 24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
      style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.03), 0 40px 80px -48px rgba(0,0,0,0.9)' }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(141,162,255,0.12),transparent_20%),radial-gradient(circle_at_86%_14%,rgba(203,255,46,0.1),transparent_18%),radial-gradient(circle_at_70%_76%,rgba(255,95,174,0.08),transparent_20%)]" />

      <div className="relative z-10 rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,#111722_0%,#0d1119_100%)] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/42">Experience board</div>
            <div className="mt-2 text-[clamp(1.8rem,3vw,2.7rem)] font-black leading-[0.94] tracking-[-0.05em] text-white">
              From visual input
              <br />
              to measurable output.
            </div>
          </div>
          <div className="rounded-[20px] border border-white/10 bg-white/[0.05] px-5 py-4 text-right">
            <div className="text-[34px] font-black leading-none text-[#ff8c69]">AI</div>
            <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/38">Signal engine</div>
          </div>
        </div>

        <div className="relative mt-10">
          <div className="absolute left-[10%] right-[10%] top-6 h-px bg-gradient-to-r from-[#8da2ff]/25 via-[#ff8c69]/25 to-[#cbff2e]/25" />
          <div className="grid gap-4 sm:grid-cols-3">
            {steps.map((step, index) => (
              <motion.div
                key={step.label}
                className="relative rounded-[22px] border border-white/8 bg-white/[0.03] p-5"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.35, delay: index * 0.08 }}
              >
                <motion.div
                  className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: step.accent }}
                  animate={{ scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: index * 0.25 }}
                />
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]" style={{ color: step.accent }}>
                  {step.icon}
                </div>
                <div className="mt-5 text-[11px] font-black uppercase tracking-[0.16em] text-white/42">Step {index + 1}</div>
                <div className="mt-2 text-[20px] font-black leading-tight text-white">{step.label}</div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Creator', value: 'Visual system' },
            { label: 'Brand', value: 'Campaign engine' },
            { label: 'Outcome', value: 'Revenue signal' },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              className="rounded-[18px] border border-white/8 bg-black/20 p-4"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.3, delay: 0.2 + index * 0.08 }}
            >
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/38">{item.label}</div>
              <div className="mt-2 text-[17px] font-bold text-white/84">{item.value}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
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
