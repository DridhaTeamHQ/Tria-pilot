'use client'

import { useState, type FormEvent, type ReactNode } from 'react'
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
  Mail,
  Megaphone,
  Phone,
  Rocket,
  Sparkles,
  Store,
  UserRoundX,
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

  async function handleContactSubmit(event: FormEvent<HTMLFormElement>) {
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
    <div className="bg-[#fbfaf6] text-[#111111]" style={{ fontFamily: PF }}>
      <section className="overflow-hidden border-b-[2px] border-black bg-[#fbfaf6] pt-[72px] lg:pt-[74px]">
        <div className="relative mx-auto max-w-[1438px] px-0">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(17,17,17,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(17,17,17,0.06)_1px,transparent_1px)] bg-[size:34px_34px]" />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-[42%] bg-[radial-gradient(circle_at_28%_60%,rgba(255,140,120,0.18),transparent_48%)]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-[50%] bg-[radial-gradient(circle_at_38%_30%,rgba(203,255,46,0.16),transparent_46%),radial-gradient(circle_at_88%_74%,rgba(255,140,120,0.14),transparent_32%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-[-18px] text-center kiwikoo-wordmark text-[clamp(8rem,19vw,17.9rem)] leading-[1.14] tracking-[0.01em] text-black/[0.04]">
            KIWIKOO
          </div>
          <div className="pointer-events-none absolute left-0 top-[96px] h-[67px] w-[73.8px] overflow-visible text-[#e77142]">
            <svg viewBox="0 0 74 67" className="h-full w-full" fill="none" aria-hidden="true">
              <path d="M0 0V67" stroke="currentColor" strokeWidth="2" />
              <path
                d="M0 30C14 30 20 40 20 52C20 61 13 66 6 66C1 66 -3 62 -3 56C-3 50 1 46 6 46"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path d="M6 46C17 46 27 53 38 61C50 69 61 52 73 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="pointer-events-none absolute right-[7.25%] top-[196px] text-black/25">
            <ChartColumn className="h-[56px] w-[56px]" strokeWidth={1.7} />
          </div>

          <div className="relative flex min-h-[620px] flex-col items-center justify-between px-4 pb-1 pt-8 text-center sm:px-6 md:min-h-[620px] lg:min-h-[660px] lg:px-8">
            <div className="pointer-events-none absolute left-[-2%] top-[226px] hidden w-[240px] md:block lg:left-[0.4%] lg:top-[156px] lg:w-[320px] xl:left-[0.8%] xl:top-[146px] xl:w-[397px] 2xl:w-[430px]">
              <Image
                src="/landing/hero-influencer.png"
                alt="Influencer mascot"
                width={960}
                height={1536}
                sizes="(min-width: 1536px) 430px, (min-width: 1280px) 397px, (min-width: 1024px) 320px, 240px"
                className="h-auto w-full object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,0.1)] [transform:scaleX(1.03)]"
                priority
              />
            </div>
            <div className="pointer-events-none absolute right-[-5%] top-[224px] hidden h-[300px] w-[255px] overflow-hidden md:block lg:right-[-0.8%] lg:top-[164px] lg:h-[430px] lg:w-[370px] xl:right-0 xl:top-[150px] xl:h-[550px] xl:w-[474px] 2xl:right-[0.8%] 2xl:h-[590px] 2xl:w-[510px]">
              <div className="absolute inset-y-0 left-0 z-[1] w-[34px] bg-[linear-gradient(255deg,#fff_4%,rgba(255,255,255,0)_29%)]" />
              <Image
                src="/landing/hero-brand.png"
                alt="Brand studio display"
                width={1250}
                height={1325}
                sizes="(min-width: 1536px) 510px, (min-width: 1280px) 474px, (min-width: 1024px) 370px, 255px"
                className="h-full w-full object-contain object-right drop-shadow-[0_24px_32px_rgba(0,0,0,0.08)]"
                priority
              />
            </div>

            <div className="relative z-10 mx-auto max-w-[924px] pt-5">
              <h1 className="text-center text-[clamp(3.2rem,7.4vw,6.65rem)] font-black uppercase leading-[1.02] tracking-[-0.06em] text-black">
                <span className="block whitespace-nowrap">Where Fashion</span>
                <span className="block whitespace-nowrap">
                  Meets <span className="text-[#ff8c78]">AI</span>
                </span>
              </h1>
              <p className="mx-auto mt-5 max-w-[720px] text-[15px] font-semibold leading-7 text-black/55 sm:text-[17px]">
                The ultimate fashion marketplace where influencers and brands connect,
                <br className="hidden sm:block" />
                create, and convert <span className="font-black text-black">- POWERED BY AI.</span>
              </p>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/signup/influencer"
                  className="inline-flex min-w-[250px] items-center justify-center rounded-full border-[2px] border-black bg-[#ff8c78] px-8 py-4 text-[15px] font-black uppercase tracking-[0.03em] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                >
                  Join as Influencer
                </Link>
                <Link
                  href="/signup/brand"
                  className="inline-flex min-w-[220px] items-center justify-center rounded-full border-[2px] border-black bg-[#cbff2e] px-8 py-4 text-[15px] font-black uppercase tracking-[0.03em] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                >
                  Join as Brand
                </Link>
              </div>

              <div className="mt-10 text-[14px] font-black uppercase tracking-[0.45em] text-black/75">
                This is where it happens.
              </div>
            </div>

            <div className="relative z-10 mt-8 flex w-full flex-col items-center gap-4 md:mt-0 md:block">
              <HeroBadge
                className="w-fit md:absolute md:bottom-[48px] md:left-[4%] lg:bottom-[38px] lg:left-[6%] xl:bottom-[54px] xl:left-[7%]"
                icon={<Sparkles className="h-4 w-4" strokeWidth={2.4} />}
                title="For Influencers"
                subtitle="who want to earn"
              />
              <HeroBadge
                className="w-fit md:absolute md:bottom-[62px] md:right-[4%] lg:bottom-[52px] lg:right-[6%] xl:bottom-[68px] xl:right-[7.5%]"
                icon={<Store className="h-4 w-4" strokeWidth={2.4} />}
                title="For Brands"
                subtitle="who want to scale"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 border-t-[2px] border-black">
          <StripCell label="No Shoots" />
          <StripCell label="No Stress" />
          <StripCell label="Just Results" active />
        </div>
      </section>

      <section id="what-you-get" className="border-b-[2px] border-black bg-[#f7f7f4] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-[1220px]">
          <div className="text-center">
            <MiniPill label="What You Get" />
            <h2 className="mt-5 text-[clamp(2.5rem,7vw,5rem)] font-black uppercase leading-[0.92] tracking-[-0.06em] text-black">
              Everything Changes
              <br />
              From Here.
            </h2>
          </div>

          <div className="mt-9 grid gap-5 lg:grid-cols-2">
            <FeaturePanel
              label="For Creators"
              accent="coral"
              items={[
                {
                  icon: <Camera className="h-5 w-5" strokeWidth={2.3} />,
                  title: 'AI Try-On Studio',
                  description: 'See yourself in outfits - without ever wearing them.',
                },
                {
                  icon: <BadgeDollarSign className="h-5 w-5" strokeWidth={2.3} />,
                  title: 'Affiliate Engine',
                  description: 'Every post you make? It can earn.',
                },
              ]}
            />

            <FeaturePanel
              label="For Brands"
              accent="lime"
              items={[
                {
                  icon: <Rocket className="h-5 w-5" strokeWidth={2.3} />,
                  title: 'Smart Campaigns',
                  description: 'Plan it. Launch it. Scale it. All in one flow.',
                },
                {
                  icon: <Megaphone className="h-5 w-5" strokeWidth={2.3} />,
                  title: 'Ad Creator',
                  description: 'Create ads that people actually stop for.',
                },
              ]}
            />
          </div>

          <div className="mt-5 overflow-hidden rounded-[8px] border-[2px] border-black bg-[#131313] p-6 text-white shadow-[0_8px_0_0_rgba(0,0,0,1)]">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <MiniPill label="For Both" dark />
                <div className="mt-8 space-y-7">
                  <FeatureLine
                    icon={<ChartColumn className="h-5 w-5" strokeWidth={2.2} />}
                    title="Real-Time Analytics"
                    description="No guessing. Just clear numbers."
                    dark
                  />
                  <FeatureLine
                    icon={<Store className="h-5 w-5" strokeWidth={2.2} />}
                    title="Marketplace"
                    description="Find the best in your product discovery space."
                    dark
                  />
                </div>
              </div>

              <div className="relative rounded-[8px] bg-[radial-gradient(circle_at_88%_18%,rgba(203,255,46,0.16),transparent_32%),linear-gradient(180deg,#0f0f0f_0%,#121212_100%)] p-5">
                <div className="absolute -left-5 bottom-4 z-10 rounded-[8px] border border-white/12 bg-[#2a2a2a] px-6 py-5 shadow-[0_4px_0_0_rgba(0,0,0,0.45)]">
                  <div className="text-[18px] font-black leading-none text-[#cbff2e]">40M+</div>
                  <div className="mt-2 text-[8px] font-black uppercase tracking-[0.14em] text-white/45">Data Points</div>
                </div>
                <div className="absolute -right-4 -top-2 z-10 rounded-[8px] border border-white/12 bg-[#2f2f2f] px-6 py-5 text-right shadow-[0_4px_0_0_rgba(0,0,0,0.45)]">
                  <div className="text-[18px] font-black leading-none text-[#ff9d85]">99.9%</div>
                  <div className="mt-2 text-[8px] font-black uppercase tracking-[0.14em] text-white/45">Accuracy</div>
                </div>

                <div className="ml-auto mt-6 w-full max-w-[630px] rounded-[8px] border border-white/14 bg-[#1b1b1b] px-7 py-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-white/75">
                    <div className="flex items-center gap-2">
                      <ChartColumn className="h-4 w-4 text-[#cbff2e]" strokeWidth={2.2} />
                      <span>Market Pulse Analytics</span>
                    </div>
                    <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-[#cbff2e]" />
                      <span className="h-2 w-2 rounded-full bg-[#ff8c78]" />
                      <span className="h-2 w-2 rounded-full bg-white/40" />
                    </div>
                  </div>

                  <div className="mt-8 grid h-[210px] grid-cols-12 items-end gap-3 border-b border-white/10 pb-12">
                    {[
                      { label: 'Feb', height: '24%' },
                      { label: 'Mar', height: '46%' },
                      { label: 'Apr', height: '31%' },
                      { label: 'Apr', height: '72%', tone: 'coral' as const, glow: true },
                      { label: 'May', height: '46%' },
                      { label: 'Jun', height: '62%' },
                      { label: 'Jul', height: '31%' },
                      { label: 'Aug', height: '89%' },
                      { label: 'Sep', height: '46%' },
                      { label: 'Oct', height: '80%', tone: 'lime' as const, glow: true },
                      { label: 'Nov', height: '62%' },
                      { label: 'Dec', height: '72%' },
                    ].map((bar, index) => (
                      <div key={`${bar.label}-${index}`} className="relative flex h-full flex-col justify-end">
                        <div
                          className={`rounded-t-[5px] ${
                            bar.tone === 'coral'
                              ? 'bg-[#ff8c78]'
                              : bar.tone === 'lime'
                                ? 'bg-[#cbff2e]'
                                : 'bg-white/10'
                          } ${bar.glow ? 'shadow-[0_0_18px_rgba(255,140,120,0.45)]' : ''} ${bar.tone === 'lime' && bar.glow ? 'shadow-[0_0_18px_rgba(203,255,46,0.4)]' : ''}`}
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
            </div>
          </div>
        </div>
      </section>

      <section className="border-b-[2px] border-black bg-white px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-[1220px]">
          <div className="text-center">
            <h2 className="text-[clamp(2.25rem,6vw,4.3rem)] font-black uppercase leading-[0.95] tracking-[-0.05em] text-black">
              Choose Your Path
            </h2>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <PathPanel
              label="For Influencers"
              tone="coral"
              title={`You've got the style?\nStart Earning now`}
              body="Create AI looks, post instantly, and earn from every conversion - without shoots, delays, or chasing brands."
              href="/signup/influencer"
              cta="Start Creating"
            />
            <PathPanel
              label="For Brands"
              tone="lime"
              title="Spending on marketing but not seeing real results?? There's a smarter way."
              body="Find the right creators, generate high-performing ads, and launch campaigns that actually convert - all powered by AI."
              href="/signup/brand"
              cta="Start Scaling"
            />
          </div>

          <div className="mt-14 border-t-[2px] border-black pt-14 text-center">
            <h2 className="flex items-center justify-center gap-3 text-[clamp(2rem,5vw,3.6rem)] font-black uppercase leading-none tracking-[-0.04em] text-black">
              <span>Why</span>
              <span className="kiwikoo-wordmark text-[1.16em] leading-none text-black">Kiwikoo</span>
            </h2>
            <p className="mx-auto mt-5 max-w-[650px] text-[17px] leading-7 text-black/55">
              We've eliminated the friction of creative production.
              <br />
              Scale your brand with zero overhead.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            <WhyCard
              icon={<UserRoundX className="h-5 w-5" strokeWidth={2.2} />}
              tone="coral"
              title="No Shoots"
              body="Skip the expensive phase. Get directly into the high end."
            />
            <WhyCard
              icon={<CircleDot className="h-5 w-5" strokeWidth={2.2} />}
              tone="lime"
              title="No Chasing Creators / Brands"
              body="End the endless email threads. Our platform automates communication easily"
            />
            <WhyCard
              icon={<ChartColumn className="h-5 w-5" strokeWidth={2.2} />}
              tone="coral"
              title="No Guesswork"
              body="Data-driven creative selection. Know exactly what converts before you push live."
            />
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-b-[2px] border-black bg-[#ff8c78] px-4 py-5 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_50%,rgba(255,255,255,0.22),transparent_18%),radial-gradient(circle_at_88%_50%,rgba(255,255,255,0.18),transparent_18%),linear-gradient(to_right,rgba(17,17,17,0.09)_1px,transparent_1px)] bg-[size:auto,auto,120px_120px]" />
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[1px] -translate-y-1/2 bg-black/10" />
        <div className="relative mx-auto flex max-w-[1220px] items-center justify-center">
          <div className="inline-flex w-full flex-wrap items-center justify-center gap-3 text-center text-black sm:gap-5 lg:flex-nowrap lg:gap-7">
            <BandWord label="Create" />
            <BandArrow />
            <BandWord label="Share" />
            <BandArrow />
            <BandWord label="Earn" />
          </div>
        </div>
      </section>

      <section id="contact" className="border-b-[2px] border-black bg-[#f5f5f2] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto grid max-w-[1220px] gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
          <div className="pt-4">
            <div className="text-[12px] font-bold uppercase tracking-[0.12em] text-black/55">Contact</div>
            <h2 className="mt-4 text-[clamp(2.3rem,5vw,4rem)] font-black uppercase leading-[0.95] tracking-[-0.04em] text-black">
              Got Something In Mind?
              <br />
              Let's Talk.
            </h2>

            <div className="mt-10 flex flex-col gap-5 sm:flex-row sm:flex-wrap">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border-[2px] border-black bg-white">
                  <Mail className="h-4 w-4" strokeWidth={2.2} />
                </span>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-black/45">Email us at</div>
                  <a href="mailto:team@kiwikoo.com" className="text-[18px] font-semibold text-black/80 underline underline-offset-4">
                    team@kiwikoo.com
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border-[2px] border-black bg-white">
                  <Phone className="h-4 w-4" strokeWidth={2.2} />
                </span>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-black/45">Contact number</div>
                  <div className="text-[18px] font-semibold text-black/80">+91 89775 33164</div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-[2px] border-[#2d5fff] bg-white p-4 shadow-[0_8px_0_0_rgba(0,0,0,1)] sm:p-5">
            <form onSubmit={handleContactSubmit} className="grid gap-4">
              <FormField
                label="Name"
                value={contactForm.name}
                onChange={(value) => setContactForm((prev) => ({ ...prev, name: value }))}
                placeholder=""
              />
              <FormField
                type="email"
                label="Email"
                value={contactForm.email}
                onChange={(value) => setContactForm((prev) => ({ ...prev, email: value }))}
                placeholder=""
              />
              <div>
                <div className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-black/65">You Are</div>
                <select
                  value={contactForm.userType}
                  onChange={(event) => setContactForm((prev) => ({ ...prev, userType: event.target.value }))}
                  className="h-12 w-full rounded-[6px] border-[2px] border-black bg-white px-4 text-[14px] font-semibold text-black outline-none"
                >
                  <option value="Influencer">Influencer</option>
                  <option value="Brand">Brand</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <div className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-black/65">Tell Us About It</div>
                <textarea
                  value={contactForm.message}
                  onChange={(event) => setContactForm((prev) => ({ ...prev, message: event.target.value }))}
                  placeholder="Your message goes here..."
                  className="min-h-[150px] w-full rounded-[6px] border-[2px] border-black bg-white px-4 py-3 text-[14px] font-medium text-black outline-none"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={contactState.loading}
                className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-full border-[2px] border-black bg-[#cbff2e] px-6 text-[13px] font-black uppercase tracking-[0.05em] shadow-[0_4px_0_0_rgba(0,0,0,1)] transition hover:translate-y-[2px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-70"
              >
                {contactState.loading ? 'Sending...' : 'Send Message'}
                <ArrowRight className="h-4 w-4" strokeWidth={2.6} />
              </button>
              {contactState.message ? (
                <p className={`text-[13px] font-semibold ${contactState.kind === 'error' ? 'text-[#cf3d3d]' : 'text-black/65'}`}>
                  {contactState.message}
                </p>
              ) : null}
            </form>
          </div>
        </div>
      </section>

      <footer className="relative overflow-hidden bg-[#fbfaf6] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1220px] flex-col gap-8">
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
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border-[2px] border-black bg-white"
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
        </div>

        <div className="pointer-events-none mx-auto mt-8 max-w-[1220px] kiwikoo-wordmark text-[clamp(4.8rem,20vw,12rem)] leading-none text-black/[0.04]">
          KIWIKOO
        </div>
      </footer>
    </div>
  )
}

function HeroBadge({
  icon,
  title,
  subtitle,
  className = '',
}: {
  icon: ReactNode
  title: string
  subtitle: string
  className?: string
}) {
  return (
    <div className={`rounded-[8px] border-[2px] border-black bg-white px-4 py-4 text-left shadow-[0_6px_0_0_rgba(0,0,0,1)] ${className}`}>
      <div className="mb-2 text-black">{icon}</div>
      <div className="text-[16px] font-black uppercase leading-tight text-black">{title}</div>
      <div className="text-[14px] font-medium leading-tight text-black/65">{subtitle}</div>
    </div>
  )
}

function StripCell({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <div
      className={`border-r-[2px] border-black px-3 py-4 text-center text-[clamp(1.3rem,3vw,2.15rem)] font-black uppercase leading-none tracking-[-0.04em] text-black last:border-r-0 ${
        active ? 'bg-[#ff8c78]' : 'bg-[#f2f0eb] text-black/35'
      }`}
    >
      {label}
    </div>
  )
}

function MiniPill({ label, dark = false }: { label: string; dark?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border-[2px] px-4 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${
        dark ? 'border-white/15 bg-[#111111] text-white/90' : 'border-black/45 bg-white text-black/75'
      }`}
    >
      {label}
    </span>
  )
}

function InfoPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border-[2px] border-black/30 bg-white px-5 py-2 text-[15px] font-medium text-black/75">
      {label}
    </span>
  )
}

function FeaturePanel({
  label,
  accent,
  items,
}: {
  label: string
  accent: 'coral' | 'lime'
  items: { icon: ReactNode; title: string; description: string }[]
}) {
  return (
    <div className={`rounded-[8px] border-[2px] border-black p-5 shadow-[0_6px_0_0_rgba(0,0,0,1)] ${accent === 'coral' ? 'bg-[linear-gradient(180deg,#fff_0%,#fff3ee_100%)]' : 'bg-[linear-gradient(180deg,#fff_0%,#f7ffe3_100%)]'}`}>
      <MiniPill label={label} />
      <div className="mt-6 space-y-7">
        {items.map((item) => (
          <FeatureLine
            key={item.title}
            icon={item.icon}
            title={item.title}
            description={item.description}
          />
        ))}
      </div>
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
    <div className={`flex h-full flex-col rounded-[10px] border-[2px] border-black p-5 shadow-[0_6px_0_0_rgba(0,0,0,1)] ${tone === 'coral' ? 'bg-[#ff8c78]' : 'bg-[#cbff2e]'}`}>
      <MiniPill label={label} />
      <div className="mt-6 flex flex-1 flex-col">
        <h3 className="min-h-[3.15em] whitespace-pre-line text-[clamp(1.9rem,3vw,3rem)] font-bold leading-[1.05] tracking-[-0.04em] text-black">
          {title}
        </h3>
        <p className="mt-4 min-h-[4.9em] max-w-[520px] text-[17px] leading-7 text-black/80">{body}</p>
      </div>
      <Link
        href={href}
        className="mt-7 inline-flex items-center justify-center gap-2 self-start rounded-full border-[2px] border-black bg-white px-6 py-3 text-[15px] font-black uppercase tracking-[0.04em] shadow-[0_4px_0_0_rgba(0,0,0,1)] transition hover:translate-y-[2px] hover:shadow-none"
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
    <div className="rounded-[10px] border-[2px] border-black bg-white p-7 shadow-[0_6px_0_0_rgba(0,0,0,1)]">
      <div className="flex items-start gap-7">
        <div className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] border-[2px] border-black ${tone === 'coral' ? 'bg-[#ff8c78]' : 'bg-[#cbff2e]'}`}>
          {icon}
        </div>
        <div className="min-w-0 text-left">
          <div className="text-[20px] font-black uppercase leading-[1.05] text-black sm:text-[22px]">{title}</div>
          <p className="mt-3 max-w-[280px] text-[16px] leading-7 text-black/55">{body}</p>
        </div>
      </div>
    </div>
  )
}

function BandWord({ label }: { label: string }) {
  return (
    <span className="text-[clamp(2.2rem,7vw,4.9rem)] font-black uppercase leading-[0.9] tracking-[-0.06em]">
      {label}
    </span>
  )
}

function BandArrow() {
  return (
    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border-[2px] border-black/15 bg-white/20 text-[clamp(1.8rem,3vw,2.5rem)] font-black leading-none shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]">
      →
    </span>
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
        className="h-12 w-full rounded-[6px] border-[2px] border-black bg-white px-4 text-[14px] font-medium text-black outline-none"
        required
      />
    </div>
  )
}
