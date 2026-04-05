'use client'

import { type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
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
  Store,
  UserRoundX,
} from 'lucide-react'

const PF = 'var(--font-plus-jakarta-sans), sans-serif'

export default function LandingPage() {
  return (
    <div className="bg-[#f7eee4] px-3 pb-8 pt-[106px] text-[#111111] sm:px-4 lg:px-6 lg:pt-[128px]" style={{ fontFamily: PF }}>
      <div className="mx-auto max-w-[1320px] overflow-hidden rounded-[34px] border-[3px] border-black bg-[#fbfaf6] shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
        <section className="relative overflow-hidden px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(17,17,17,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(17,17,17,0.06)_1px,transparent_1px)] bg-[size:42px_42px]" />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-[28%] bg-[radial-gradient(circle_at_22%_62%,rgba(255,140,120,0.18),transparent_52%)]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-[34%] bg-[radial-gradient(circle_at_35%_40%,rgba(203,255,46,0.16),transparent_46%)]" />
          <div className="pointer-events-none absolute -left-4 top-[92px] h-[88px] w-[88px] rounded-full border-[3px] border-[#ff5aa9] bg-[#ff5aa9] shadow-[6px_6px_0_0_rgba(0,0,0,1)]" />
          <div className="pointer-events-none absolute -right-8 bottom-20 h-[92px] w-[92px] rounded-full border-[3px] border-black bg-[#ffd243] shadow-[6px_6px_0_0_rgba(0,0,0,1)]" />
          <div className="pointer-events-none absolute inset-x-0 top-3 text-center kiwikoo-wordmark text-[clamp(5rem,17vw,14rem)] leading-none tracking-[0.02em] text-black/[0.04]">
            KIWIKOO
          </div>

          <div className="relative z-10 grid gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div className="max-w-[620px] pt-4 text-center lg:pt-8 lg:text-left">
              <h1 className="mt-5 text-[clamp(3.3rem,7vw,6.2rem)] font-black uppercase leading-[0.9] tracking-[-0.07em] text-black">
                Where Fashion
                <br />
                Meets <span className="text-[#ff8c78]">AI.</span>
              </h1>
              <p className="mt-6 max-w-[560px] text-[18px] leading-8 text-black/68 max-lg:mx-auto">
                The cleanest way for influencers and brands to create, launch, and convert with AI-powered fashion tools.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
                <Link
                  href="/signup/influencer"
                  className="inline-flex items-center justify-center rounded-[16px] border-[3px] border-black bg-[#ffd243] px-7 py-4 text-[18px] font-black text-black shadow-[5px_5px_0_0_rgba(0,0,0,1)] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                >
                  Start creating
                </Link>
                <div className="rounded-full border-[2px] border-black bg-white px-4 py-2 text-[13px] font-bold uppercase tracking-[0.16em] text-black/70">
                  Fashion AI studio
                </div>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[520px]">
              <div className="absolute -left-2 top-12 z-20 rounded-[22px] border-[3px] border-black bg-[#2bb7aa] px-4 py-4 shadow-[6px_6px_0_0_rgba(0,0,0,1)] sm:-left-5">
                <ChartColumn className="h-8 w-8 text-black" strokeWidth={2.4} />
              </div>
              <div className="absolute right-0 top-2 z-20 rounded-full border-[3px] border-black bg-[#89a6ff] px-6 py-3 text-[16px] font-black text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] sm:text-[18px]">
                Kiwikoo
              </div>
              <div className="absolute right-6 top-28 z-20 rounded-full border-[3px] border-black bg-[#cbff2e] px-4 py-2 text-[12px] font-black uppercase tracking-[0.08em] text-black shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
                AI-powered
              </div>

              <div className="relative min-h-[430px] sm:min-h-[500px]">
                <div className="absolute inset-x-[16%] inset-y-[12%] rounded-[30px] border-[3px] border-black bg-[linear-gradient(180deg,#fff7ec_0%,#f6ffd9_100%)] shadow-[7px_7px_0_0_rgba(0,0,0,1)]" />
                <div className="pointer-events-none absolute inset-x-[20%] inset-y-[18%] rounded-[26px] bg-[radial-gradient(circle_at_25%_30%,rgba(255,140,120,0.2),transparent_38%),radial-gradient(circle_at_78%_28%,rgba(203,255,46,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.75),rgba(255,247,232,0.45))]" />
                <div className="absolute bottom-4 right-0 z-10 w-[220px] rotate-[7deg] rounded-[26px] border-[3px] border-black bg-white p-3 shadow-[7px_7px_0_0_rgba(0,0,0,1)] sm:w-[250px]">
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
                <div className="absolute inset-x-[6%] bottom-0 top-[12%] z-10 flex items-end justify-center">
                  <div className="relative h-full w-full">
                    <Image
                      src="/landing/hero-influencer.png"
                      alt="Influencer"
                      fill
                      sizes="(min-width: 1024px) 420px, 70vw"
                      className="object-contain object-bottom drop-shadow-[0_18px_28px_rgba(0,0,0,0.18)]"
                      priority
                    />
                  </div>
                </div>
                <div className="absolute bottom-5 left-5 z-20 rounded-full border-[3px] border-black bg-white px-4 py-2 text-[12px] font-black uppercase tracking-[0.08em] text-black shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
                  Available for brands
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="what-you-get" className="border-t-[3px] border-black bg-[#fbfaf6] px-5 py-12 sm:px-8 lg:px-10 lg:py-14">
          <div className="text-center">
            <div className="text-[14px] font-semibold text-black/50">Passion led us here</div>
            <h2 className="mt-3 text-[clamp(2.4rem,5vw,4rem)] font-black leading-[0.95] tracking-[-0.05em] text-black">
              What Kiwikoo can do for you
            </h2>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            <ServiceCard
              icon={<Camera className="h-6 w-6" strokeWidth={2.2} />}
              tone="blue"
              title="AI Try-On Studio"
              body="Create fashion looks without physical shoots or back-and-forth production."
            />
            <ServiceCard
              icon={<Rocket className="h-6 w-6" strokeWidth={2.2} />}
              tone="teal"
              title="Campaign Workflows"
              body="Help brands launch creator-ready campaigns with cleaner approvals and assets."
            />
            <ServiceCard
              icon={<BadgeDollarSign className="h-6 w-6" strokeWidth={2.2} />}
              tone="pink"
              title="Affiliate Engine"
              body="Turn creator output into measurable earning potential and real marketplace action."
            />
          </div>

          <div className="mt-6 rounded-[28px] border-[3px] border-black bg-[#111111] p-6 text-white shadow-[8px_8px_0_0_rgba(0,0,0,1)] lg:p-8">
            <div className="grid gap-8 lg:grid-cols-[0.84fr_1.16fr] lg:items-center">
              <div>
                <MiniPill label="For Both" dark />
                <div className="mt-7 space-y-6">
                  <FeatureLine
                    icon={<ChartColumn className="h-5 w-5" strokeWidth={2.2} />}
                    title="Real-Time Analytics"
                    description="No guessing. Just clear numbers."
                    dark
                  />
                  <FeatureLine
                    icon={<Store className="h-5 w-5" strokeWidth={2.2} />}
                    title="Marketplace"
                    description="Find products, creators, and outcomes in one place."
                    dark
                  />
                </div>
              </div>

              <AnalyticsPanel />
            </div>
          </div>
        </section>

        <section className="border-t-[3px] border-black bg-white px-5 py-12 sm:px-8 lg:px-10 lg:py-14">
          <div className="text-center">
            <div className="text-[14px] font-semibold text-black/50">Choose your path</div>
            <h2 className="mt-3 text-[clamp(2.35rem,5vw,3.8rem)] font-black leading-[0.95] tracking-[-0.05em] text-black">
              Built for creators and brands
            </h2>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <PathPanel
              label="For Influencers"
              tone="coral"
              title={`You've got the style?\nStart earning now.`}
              body="Create AI looks, post faster, and earn from every conversion without shoots, delays, or chasing brands."
              href="/signup/influencer"
              cta="Start creating"
            />
            <PathPanel
              label="For Brands"
              tone="lime"
              title="Spending on marketing without seeing the result? There's a smarter way."
              body="Find the right creators, generate strong campaign visuals, and launch with more confidence."
              href="/signup/brand"
              cta="Start scaling"
            />
          </div>
        </section>

        <section className="border-t-[3px] border-black bg-[#fbfaf6] px-5 py-12 sm:px-8 lg:px-10 lg:py-14">
          <div className="text-center">
            <div className="text-[14px] font-semibold text-black/50">Why Kiwikoo</div>
            <h2 className="mt-3 text-[clamp(2.35rem,5vw,3.8rem)] font-black leading-[0.95] tracking-[-0.05em] text-black">
              Clearer creative growth
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
              body="Fewer loose threads. Better communication and faster campaign progress."
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
                  { icon: <CircleDot className="h-4 w-4" strokeWidth={2.2} />, label: 'X' },
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

            <div className="kiwikoo-wordmark text-[clamp(4.8rem,18vw,10rem)] leading-none text-black/[0.05]">
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
      className={`inline-flex items-center rounded-full border-[2px] px-4 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${
        dark ? 'border-white/15 bg-[#111111] text-white/90' : 'border-black/35 bg-white text-black/75'
      }`}
    >
      {label}
    </span>
  )
}

function ServiceCard({
  icon,
  tone,
  title,
  body,
}: {
  icon: ReactNode
  tone: 'blue' | 'teal' | 'pink'
  title: string
  body: string
}) {
  const accent =
    tone === 'blue'
      ? 'bg-[#a8b9ff]'
      : tone === 'teal'
        ? 'bg-[#2bb7aa]'
        : 'bg-[#ff62b8]'

  return (
    <div className="rounded-[24px] border-[3px] border-black bg-white p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
      <div className={`inline-flex h-16 w-16 items-center justify-center rounded-[18px] border-[3px] border-black ${accent} shadow-[4px_4px_0_0_rgba(0,0,0,1)]`}>
        {icon}
      </div>
      <h3 className="mt-6 text-[28px] font-black leading-[1.02] tracking-[-0.04em] text-black">{title}</h3>
      <p className="mt-3 text-[17px] leading-8 text-black/60">{body}</p>
    </div>
  )
}

function FeatureLine({
  icon,
  title,
  description,
  dark = false,
}: {
  icon: ReactNode
  title: string
  description: string
  dark?: boolean
}) {
  return (
    <div className="flex items-start gap-4">
      <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[2px] ${dark ? 'border-white/35 bg-black text-white' : 'border-black bg-white text-black'}`}>
        {icon}
      </span>
      <div>
        <div className={`text-[22px] font-bold leading-tight ${dark ? 'text-white' : 'text-black'}`}>{title}</div>
        <div className={`mt-1 text-[16px] leading-6 ${dark ? 'text-white/65' : 'text-black/65'}`}>{description}</div>
      </div>
    </div>
  )
}

function AnalyticsPanel() {
  const bars = [
    { label: 'Jan', height: '28%' },
    { label: 'Feb', height: '42%' },
    { label: 'Mar', height: '34%' },
    { label: 'Apr', height: '66%', tone: 'coral' as const },
    { label: 'May', height: '46%' },
    { label: 'Jun', height: '58%' },
    { label: 'Jul', height: '36%' },
    { label: 'Aug', height: '82%' },
    { label: 'Sep', height: '44%' },
    { label: 'Oct', height: '72%', tone: 'lime' as const },
    { label: 'Nov', height: '58%' },
    { label: 'Dec', height: '66%' },
  ]

  return (
    <div className="relative rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_84%_18%,rgba(203,255,46,0.12),transparent_30%),linear-gradient(180deg,#151515_0%,#191919_100%)] p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
      <div className="absolute -left-8 bottom-16 z-20 rounded-[16px] border border-white/12 bg-[#2a2a2a] px-5 py-4 shadow-[0_5px_0_0_rgba(0,0,0,0.4)]">
        <div className="text-[26px] font-black leading-none text-[#cbff2e]">40M+</div>
        <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/40">Data Points</div>
      </div>
      <div className="absolute -right-3 -top-3 rounded-[16px] border border-white/12 bg-[#2e2e2e] px-5 py-4 text-right shadow-[0_5px_0_0_rgba(0,0,0,0.4)]">
        <div className="text-[26px] font-black leading-none text-[#ff9d85]">99.9%</div>
        <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/40">Accuracy</div>
      </div>

      <div className="rounded-[20px] border border-white/10 bg-[#1c1c1c] px-5 py-5">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-white/70">
          <div className="flex items-center gap-2">
            <ChartColumn className="h-4 w-4 text-[#cbff2e]" strokeWidth={2.2} />
            <span>Market Pulse Analytics</span>
          </div>
          <div className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-[#cbff2e]" />
            <span className="h-2 w-2 rounded-full bg-[#ff8c78]" />
            <span className="h-2 w-2 rounded-full bg-white/35" />
          </div>
        </div>

        <div className="mt-8 grid h-[220px] grid-cols-12 items-end gap-2 border-b border-white/10 pb-12">
          {bars.map((bar, index) => (
            <div key={`${bar.label}-${index}`} className="relative flex h-full flex-col justify-end">
              <div
                className={`rounded-t-[6px] ${
                  bar.tone === 'coral'
                    ? 'bg-[#ff8c78] shadow-[0_0_16px_rgba(255,140,120,0.4)]'
                    : bar.tone === 'lime'
                      ? 'bg-[#cbff2e] shadow-[0_0_16px_rgba(203,255,46,0.35)]'
                      : 'bg-white/10'
                }`}
                style={{ height: bar.height }}
              />
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase tracking-[0.12em] text-white/35">
                {bar.label}
              </span>
            </div>
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
  return (
    <div className={`flex h-full flex-col rounded-[24px] border-[3px] border-black p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)] ${tone === 'coral' ? 'bg-[#ff8c78]' : 'bg-[#cbff2e]'}`}>
      <MiniPill label={label} />
      <div className="mt-6 flex flex-1 flex-col">
        <h3 className="min-h-[3.15em] whitespace-pre-line text-[clamp(2rem,3vw,3rem)] font-black leading-[1.03] tracking-[-0.05em] text-black">
          {title}
        </h3>
        <p className="mt-4 max-w-[520px] text-[18px] leading-8 text-black/78">{body}</p>
      </div>
      <Link
        href={href}
        className="mt-7 inline-flex items-center justify-center gap-2 self-start rounded-full border-[3px] border-black bg-white px-6 py-3 text-[15px] font-black uppercase tracking-[0.04em] shadow-[0_4px_0_0_rgba(0,0,0,1)] transition hover:translate-y-[2px] hover:shadow-none"
      >
        {cta}
        <ArrowRight className="h-4 w-4" strokeWidth={2.7} />
      </Link>
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
    <div className="rounded-[24px] border-[3px] border-black bg-white p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
      <div className="flex items-start gap-5">
        <div className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] border-[3px] border-black ${tone === 'coral' ? 'bg-[#ff8c78]' : 'bg-[#cbff2e]'} shadow-[4px_4px_0_0_rgba(0,0,0,1)]`}>
          {icon}
        </div>
        <div>
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
