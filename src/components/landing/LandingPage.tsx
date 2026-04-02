'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  Camera,
  CircleDollarSign,
  Megaphone,
  MessageSquare,
  Package2,
  Search,
  Shirt,
  Sparkles,
  Store,
} from 'lucide-react'

const PF = 'var(--font-plus-jakarta-sans), sans-serif'

export default function LandingPage() {
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    userType: 'Influencer',
    message: '',
  })
  const [contactState, setContactState] = useState<{
    loading: boolean
    message: string | null
    kind: 'success' | 'error' | null
  }>({
    loading: false,
    message: null,
    kind: null,
  })

  async function handleContactSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setContactState({ loading: true, message: null, kind: null })

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...contactForm,
          subject: `Landing page inquiry from ${contactForm.userType}`,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to send message')
      }

      setContactForm({
        name: '',
        email: '',
        userType: 'Influencer',
        message: '',
      })
      setContactState({
        loading: false,
        message: 'Message sent. We usually reply within 24 hours.',
        kind: 'success',
      })
    } catch (error) {
      setContactState({
        loading: false,
        message: error instanceof Error ? error.message : 'Failed to send message',
        kind: 'error',
      })
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f3eb] text-[#151515]" style={{ fontFamily: PF }}>
      <div className="mx-auto max-w-[1180px] px-4 pb-20 pt-24 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[34px] border-[3px] border-black bg-[#fffdf8] shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
          <div className="grid gap-8 border-b-[3px] border-black px-5 py-8 md:grid-cols-[0.9fr_1.2fr_0.9fr] md:px-8 md:py-10">
            <HeroSideCard
              align="left"
              title="For Influencers"
              accent="#ff8a73"
              eyebrow="Create AI looks"
              lines={['Post faster', 'Earn through affiliate links', 'Turn content into income']}
              icon={<Camera className="h-6 w-6" strokeWidth={2.4} />}
            />

            <div className="flex flex-col items-center justify-center text-center">
              <div className="inline-flex items-center gap-2 rounded-full border-[2px] border-black bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={2.6} />
                Fashion commerce, rebuilt
              </div>
              <h1 className="mt-5 text-[clamp(2.7rem,8vw,5.6rem)] font-black uppercase leading-[0.88] tracking-[-0.05em] text-black">
                Where Fashion
                <br />
                Meets <span className="text-[#ff8a73]">AI</span>.
              </h1>
              <p className="mt-4 max-w-[560px] text-sm font-semibold leading-6 text-black/65 sm:text-base">
                The ultimate fashion marketplace where influencers and brands create, collaborate, and convert with AI.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link href="/signup/influencer" className="rounded-full border-[2px] border-black bg-[#ff8a73] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none sm:px-6">
                  Join as influencer
                </Link>
                <Link href="/signup/brand" className="rounded-full border-[2px] border-black bg-[#c9ff3d] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none sm:px-6">
                  Join as brand
                </Link>
              </div>
              <div className="mt-6 text-[10px] font-black uppercase tracking-[0.25em] text-black/40 sm:text-xs">
                This is where it happens
              </div>
            </div>

            <HeroSideCard
              align="right"
              title="For Brands"
              accent="#c9ff3d"
              eyebrow="Launch campaigns"
              lines={['Discover creators', 'Generate ads with AI', 'Scale what converts']}
              icon={<Megaphone className="h-6 w-6" strokeWidth={2.4} />}
            />
          </div>

          <div className="grid grid-cols-3 text-center">
            <StripCell label="No shoots" />
            <StripCell label="No stress" />
            <StripCell label="Just results" highlight />
          </div>
        </section>

        <section id="features" className="mt-8 rounded-[34px] border-[3px] border-black bg-[#fdfbf6] p-5 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] sm:p-6">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border-[2px] border-black bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <span className="inline-block h-2.5 w-2.5 rounded-full border border-black bg-[#ff8a73]" />
              Everything changes
            </div>
            <h2 className="mt-4 text-[clamp(2.1rem,6vw,4rem)] font-black uppercase leading-[0.92] tracking-[-0.04em]">
              Everything Changes
              <br />
              From Here.
            </h2>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-black/50 sm:text-xs">
              <PillTag label="For creators" />
              <PillTag label="For brands" />
              <PillTag label="Works instantly" />
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <FeatureTile
              dark={false}
              accent="#ff8a73"
              label="For creators"
              title="AI Try-On Studio"
              description="See every outfit on yourself without shoots, waiting, or physical samples."
              points={['Identity-preserving outputs', 'Fast generation flow']}
              icon={<Shirt className="h-5 w-5" strokeWidth={2.4} />}
            />
            <FeatureTile
              dark={false}
              accent="#c9ff3d"
              label="For brands"
              title="Smart Campaigns"
              description="Build creator campaigns with structure, direction, and better performance from day one."
              points={['Creator matching', 'Clear campaign briefs']}
              icon={<Search className="h-5 w-5" strokeWidth={2.4} />}
            />
            <FeatureTile
              dark={false}
              accent="#ff8a73"
              label="For creators"
              title="Affiliate Engine"
              description="Turn the content you already make into an earning system that keeps compounding."
              points={['Trackable links', 'Creator-first monetization']}
              icon={<CircleDollarSign className="h-5 w-5" strokeWidth={2.4} />}
            />
            <FeatureTile
              dark={false}
              accent="#c9ff3d"
              label="For brands"
              title="Ad Creator"
              description="Generate faster, sharper ad concepts without long production cycles."
              points={['Creative velocity', 'Visual consistency']}
              icon={<Megaphone className="h-5 w-5" strokeWidth={2.4} />}
            />
          </div>

          <AnalyticsPanel />
        </section>

        <section id="choose-path" className="mt-8 rounded-[34px] border-[3px] border-black bg-white p-5 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] sm:p-6">
          <div className="text-center">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">Choose your path</div>
            <h2 className="mt-3 text-[clamp(1.9rem,5vw,3.3rem)] font-black uppercase leading-[0.95] tracking-[-0.04em]">
              Choose Your Path
            </h2>
            <p className="mx-auto mt-3 max-w-[640px] text-sm font-semibold leading-6 text-black/65 sm:text-base">
              Creators earn in a smarter way. Brands find real performance without the old friction.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <PathCard
              accent="bg-[#ff8a73]"
              tag="For influencers"
              title="You have the style. Start earning now."
              body="Create AI looks, post faster, and turn your content into a reliable income stream."
              href="/signup/influencer"
              cta="Start creating"
            />
            <PathCard
              accent="bg-[#c9ff3d]"
              tag="For brands"
              title="Spending on marketing but not seeing real results?"
              body="Find better creators, launch faster campaigns, and build performance with less waste."
              href="/signup/brand"
              cta="Start scaling"
            />
          </div>
        </section>

        <section id="why-kiwikoo" className="mt-8 rounded-[34px] border-[3px] border-black bg-[#fdfbf6] p-5 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] sm:p-6">
          <div className="text-center">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">Why Kiwikoo</div>
            <h2 className="mt-3 text-[clamp(1.9rem,5vw,3.2rem)] font-black uppercase leading-[0.95] tracking-[-0.04em]">
              Why Kiwikoo
            </h2>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <ReasonCard icon={<Camera className="h-4 w-4" />} title="No shoots" description="No expensive production cycles or sample-based delays." />
            <ReasonCard icon={<MessageSquare className="h-4 w-4" />} title="No chaos" description="No messy creator-brand coordination or endless back and forth." />
            <ReasonCard icon={<BarChart3 className="h-4 w-4" />} title="No guesswork" description="No vague campaign outcomes. You get clearer numbers and faster loops." />
          </div>
        </section>

        <section className="mt-8 rounded-[28px] border-[3px] border-black bg-[#ff8a73] px-4 py-4 text-center text-[clamp(1.5rem,4vw,2.55rem)] font-black uppercase tracking-[-0.04em] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          CREATE -&gt; SHARE -&gt; EARN
        </section>

        <section id="contact" className="mt-8 grid gap-0 overflow-hidden rounded-[34px] border-[3px] border-black bg-white shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] md:grid-cols-[0.92fr_1.08fr]">
          <div className="border-b-[3px] border-black bg-[#f5f2ea] p-6 md:border-b-0 md:border-r-[3px] md:p-8">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">Contact</div>
            <h2 className="mt-3 text-[clamp(2rem,5vw,3.6rem)] font-black uppercase leading-[0.95] tracking-[-0.04em]">
              Got Something In Mind?
              <br />
              Let&apos;s Talk.
            </h2>
            <p className="mt-4 max-w-[420px] text-sm font-semibold leading-6 text-black/65 sm:text-base">
              Queries, partnerships, brand collaborations, or creator growth ideas. We&apos;re ready when you are.
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              {['Instagram', 'LinkedIn', 'X', 'Email'].map((item) => (
                <span key={item} className="inline-flex items-center rounded-full border-[2px] border-black bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-[#fbfaf6] p-6 md:p-8">
            <form onSubmit={handleContactSubmit} className="grid gap-4">
              <LandingInput
                value={contactForm.name}
                onChange={(value) => setContactForm((prev) => ({ ...prev, name: value }))}
                placeholder="Your name"
              />
              <LandingInput
                type="email"
                value={contactForm.email}
                onChange={(value) => setContactForm((prev) => ({ ...prev, email: value }))}
                placeholder="Your email"
              />
              <select
                value={contactForm.userType}
                onChange={(event) => setContactForm((prev) => ({ ...prev, userType: event.target.value }))}
                className="h-12 rounded-[16px] border-[2px] border-black bg-white px-4 text-sm font-bold outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                <option value="Influencer">You are an influencer</option>
                <option value="Brand">You are a brand</option>
                <option value="Other">Other</option>
              </select>
              <textarea
                value={contactForm.message}
                onChange={(event) => setContactForm((prev) => ({ ...prev, message: event.target.value }))}
                placeholder="Tell us what you need"
                className="min-h-[150px] rounded-[16px] border-[2px] border-black bg-white px-4 py-3 text-sm font-bold outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                required
              />
              <button
                type="submit"
                disabled={contactState.loading}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border-[2px] border-black bg-[#c9ff3d] px-5 text-xs font-black uppercase tracking-[0.16em] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-70"
              >
                {contactState.loading ? 'Sending...' : 'Send message'}
                <ArrowRight className="h-4 w-4" strokeWidth={2.8} />
              </button>
              {contactState.message ? (
                <p className={`text-sm font-bold ${contactState.kind === 'error' ? 'text-[#d14343]' : 'text-black/70'}`}>
                  {contactState.message}
                </p>
              ) : null}
            </form>
          </div>
        </section>

        <footer className="mt-8 rounded-[34px] border-[3px] border-black bg-white px-5 py-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-5 border-b border-black/15 pb-5">
            <div className="flex gap-2">
              {['ig', 'in', 'x', 'mail'].map((item) => (
                <span key={item} className="inline-flex h-9 w-9 items-center justify-center rounded-full border-[2px] border-black bg-[#f6f2ea] text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  {item}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-5 text-[10px] font-black uppercase tracking-[0.16em] text-black/55 sm:text-xs">
              <Link href="/about" className="hover:text-black">About us</Link>
              <Link href="/privacy" className="hover:text-black">Privacy policy</Link>
              <Link href="/terms" className="hover:text-black">Terms of use</Link>
              <Link href="/marketplace" className="hover:text-black">Marketplace</Link>
            </div>
          </div>
          <div className="flex flex-col gap-4 pt-5 md:flex-row md:items-end md:justify-between">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-black/45">
              Copyright 2026 Kiwikoo. All rights reserved.
            </div>
            <div className="kiwikoo-wordmark text-[clamp(3rem,12vw,7rem)] leading-none text-black/8">KIWIKOO</div>
          </div>
        </footer>
      </div>
    </div>
  )
}

function HeroSideCard({
  align,
  title,
  accent,
  eyebrow,
  lines,
  icon,
}: {
  align: 'left' | 'right'
  title: string
  accent: string
  eyebrow: string
  lines: string[]
  icon: React.ReactNode
}) {
  return (
    <div className={`flex flex-col justify-between gap-4 ${align === 'right' ? 'md:items-end' : ''}`}>
      <div className="rounded-[28px] border-[3px] border-black bg-white p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className={`flex items-center gap-3 ${align === 'right' ? 'md:flex-row-reverse' : ''}`}>
          <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border-[2px] border-black" style={{ backgroundColor: accent }}>
            {icon}
          </div>
          <div className={align === 'right' ? 'text-right' : ''}>
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-black/45">{eyebrow}</div>
            <div className="mt-1 text-sm font-black uppercase tracking-[0.16em]">{title}</div>
          </div>
        </div>
      </div>
      <div className={`rounded-[28px] border-[3px] border-black bg-[linear-gradient(180deg,#ffffff_0%,#f3efe6_100%)] p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${align === 'right' ? 'md:max-w-[260px]' : 'md:max-w-[250px]'}`}>
        <div className="rounded-[22px] border-[2px] border-dashed border-black/20 bg-white/75 p-4">
          <div className="mb-4 h-32 rounded-[20px] border-[2px] border-black bg-[radial-gradient(circle_at_top,#ffe4da_0%,#fffdf8_60%)]" />
          <div className="space-y-2">
            {lines.map((line) => (
              <div key={line} className="rounded-full border-[2px] border-black bg-[#f7f4ec] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em]">
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StripCell({ label, highlight = false }: { label: string; highlight?: boolean }) {
  return (
    <div className={`border-r-[2px] border-black px-3 py-3 text-[11px] font-black uppercase tracking-[0.16em] last:border-r-0 sm:text-sm ${highlight ? 'bg-[#ff8a73]' : 'bg-[#f1ede3]'}`}>
      {label}
    </div>
  )
}

function PillTag({ label }: { label: string }) {
  return (
    <span className="rounded-full border-[2px] border-black bg-white px-3 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
      {label}
    </span>
  )
}

function FeatureTile({
  dark,
  accent,
  label,
  title,
  description,
  points,
  icon,
}: {
  dark: boolean
  accent: string
  label: string
  title: string
  description: string
  points: string[]
  icon: React.ReactNode
}) {
  return (
    <div className={`rounded-[26px] border-[3px] border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${dark ? 'bg-[#111111] text-white' : 'bg-white text-black'}`}>
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-[2px] border-black bg-white text-black">
          {icon}
        </span>
        <span className="rounded-full border-[2px] border-black px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]" style={{ backgroundColor: accent }}>
          {label}
        </span>
      </div>
      <h3 className="mt-4 text-[clamp(1.3rem,3vw,2rem)] font-black uppercase leading-[0.95] tracking-[-0.03em]">{title}</h3>
      <p className={`mt-3 text-sm font-semibold leading-6 ${dark ? 'text-white/75' : 'text-black/65'}`}>{description}</p>
      <div className="mt-5 space-y-2">
        {points.map((point) => (
          <div key={point} className={`rounded-full border-[2px] border-black px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] ${dark ? 'bg-white/10' : 'bg-[#f7f3eb]'}`}>
            {point}
          </div>
        ))}
      </div>
    </div>
  )
}

function AnalyticsPanel() {
  return (
    <div className="mt-4 rounded-[28px] border-[3px] border-black bg-[#111111] p-5 text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">For both</div>
          <h3 className="mt-2 text-[clamp(1.4rem,3vw,2.3rem)] font-black uppercase leading-[0.95] tracking-[-0.03em]">
            Real-Time Analytics
            <br />
            Marketplace
          </h3>
        </div>
        <div className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#ff8a73]">
          24.7%
        </div>
      </div>
      <p className="mt-3 max-w-[560px] text-sm font-semibold leading-6 text-white/65">
        Track performance, spot what is converting, and move faster with cleaner campaign signals.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[22px] border border-white/15 bg-white/5 p-4">
          <div className="flex items-end gap-3 pt-6">
            <ChartBar height="42%" color="#ff8a73" />
            <ChartBar height="70%" color="#ffb49c" />
            <ChartBar height="58%" color="#f6f2ea" />
            <ChartBar height="84%" color="#c9ff3d" />
            <ChartBar height="64%" color="#ffe4da" />
            <ChartBar height="74%" color="#c9ff3d" />
          </div>
        </div>
        <div className="grid gap-3">
          <MiniMetric icon={<Store className="h-4 w-4" />} label="Campaign activity" value="+38%" />
          <MiniMetric icon={<Package2 className="h-4 w-4" />} label="Marketplace conversions" value="12.4k" />
          <MiniMetric icon={<BarChart3 className="h-4 w-4" />} label="Creator response rate" value="89%" />
        </div>
      </div>
    </div>
  )
}

function ChartBar({ height, color }: { height: string; color: string }) {
  return <div className="flex-1 rounded-t-[10px] border border-black/50" style={{ height, backgroundColor: color }} />
}

function MiniMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-white/15 bg-white/5 px-4 py-3">
      <div className="flex items-center gap-2 text-white/55">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-[0.16em]">{label}</span>
      </div>
      <div className="mt-2 text-xl font-black uppercase">{value}</div>
    </div>
  )
}

function PathCard({
  accent,
  tag,
  title,
  body,
  href,
  cta,
}: {
  accent: string
  tag: string
  title: string
  body: string
  href: string
  cta: string
}) {
  return (
    <div className={`rounded-[28px] border-[3px] border-black p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${accent}`}>
      <div className="inline-flex rounded-full border-[2px] border-black bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        {tag}
      </div>
      <h3 className="mt-4 text-[clamp(1.35rem,3vw,2rem)] font-black leading-[0.98] tracking-[-0.03em]">
        {title}
      </h3>
      <p className="mt-3 max-w-[460px] text-sm font-semibold leading-6 text-black/75">
        {body}
      </p>
      <Link
        href={href}
        className="mt-6 inline-flex items-center gap-2 rounded-full border-[2px] border-black bg-white px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.16em] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
      >
        {cta}
        <ArrowRight className="h-4 w-4" strokeWidth={2.8} />
      </Link>
    </div>
  )
}

function ReasonCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="rounded-[22px] border-[3px] border-black bg-white p-4 text-center shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border-[2px] border-black bg-[#fff2ed]">
        {icon}
      </div>
      <div className="mt-3 text-[11px] font-black uppercase tracking-[0.18em]">{title}</div>
      <p className="mt-2 text-sm font-semibold leading-6 text-black/65">{description}</p>
    </div>
  )
}

function LandingInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-12 rounded-[16px] border-[2px] border-black bg-white px-4 text-sm font-bold outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
      required
    />
  )
}
