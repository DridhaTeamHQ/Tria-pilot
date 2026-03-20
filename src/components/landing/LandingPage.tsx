'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const PF = 'var(--font-plus-jakarta-sans), sans-serif'

type LenisLike = {
  raf: (timeMs: number) => void
  on: (event: string, callback: () => void) => void
  destroy: () => void
}

export default function LandingPage() {
  const [audienceView, setAudienceView] = useState<'influencer' | 'brand'>('influencer')
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

  const globalBgRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLElement>(null)
  const heroImgRef = useRef<HTMLDivElement>(null)
  const heroTitleRef = useRef<HTMLDivElement>(null)
  const footerSecRef = useRef<HTMLElement>(null)
  const footerClipRef = useRef<HTMLDivElement>(null)
  const footerLabelRef = useRef<HTMLDivElement>(null)
  const footerHugeRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    document.documentElement.classList.add('landing-transparent-bg')
    document.body.classList.add('landing-transparent-bg')
    return () => {
      document.documentElement.classList.remove('landing-transparent-bg')
      document.body.classList.remove('landing-transparent-bg')
    }
  }, [])

  useEffect(() => {
    const globalBg = globalBgRef.current
    const hero = heroRef.current
    const heroImg = heroImgRef.current
    const heroTitle = heroTitleRef.current
    const footerSec = footerSecRef.current
    const footerClip = footerClipRef.current
    const footerLbl = footerLabelRef.current
    const footerHuge = footerHugeRef.current

    if (!hero) return

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let lenis: LenisLike | null = null
    const tick = (time: number) => {
      lenis?.raf(time * 1000)
    }

    if (!prefersReducedMotion) {
      import('@studio-freight/lenis')
        .then(({ default: Lenis }) => {
          lenis = new Lenis({
            duration: 1.2,
            easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
          })
          lenis.on('scroll', ScrollTrigger.update)
          gsap.ticker.add(tick)
          gsap.ticker.lagSmoothing(0)
        })
        .catch(() => {})
    }

    if (prefersReducedMotion) {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
      return () => {}
    }

    if (globalBg) {
      gsap.to(globalBg, {
        yPercent: -20,
        ease: 'none',
        scrollTrigger: {
          trigger: document.body,
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
          invalidateOnRefresh: true,
        },
      })
    }

    if (heroTitle) {
      gsap.to(heroTitle, {
        yPercent: -80,
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.5,
          invalidateOnRefresh: true,
        },
      })
    }

    if (heroImg) {
      gsap.to(heroImg, {
        scale: 1.12,
        ease: 'none',
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
          invalidateOnRefresh: true,
        },
      })
    }

    if (footerSec && footerClip) {
      gsap.fromTo(
        footerClip,
        { clipPath: 'inset(0% 0% 0% 0%)', borderRadius: '0px' },
        {
          clipPath: 'inset(8% 18% 8% 18%)',
          borderRadius: '24px',
          ease: 'none',
          scrollTrigger: {
            trigger: footerSec,
            start: 'top bottom',
            end: 'center center',
            scrub: true,
            invalidateOnRefresh: true,
          },
        }
      )
    }

    if (footerSec && footerLbl) {
      gsap.to(footerLbl, {
        opacity: 1,
        scrollTrigger: {
          trigger: footerSec,
          start: 'center center',
          end: 'bottom center',
          scrub: true,
          invalidateOnRefresh: true,
        },
      })
    }

    if (footerHuge) {
      gsap.from(footerHuge, {
        yPercent: 40,
        opacity: 0,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: footerHuge,
          start: 'top 95%',
          end: 'bottom bottom',
          scrub: 1,
          invalidateOnRefresh: true,
        },
      })
    }

    return () => {
      try {
        lenis?.destroy()
      } catch {}
      gsap.ticker.remove(tick)
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
    }
  }, [])

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

  const audienceContent = {
    influencer: {
      label: 'For Influencers',
      labelColor: '#ff8a73',
      title: "You've got the style. Why aren't you earning yet?",
      intro: [
        "You're already posting.",
        'Already creating.',
        'Already building an audience.',
      ],
      body:
        'Now turn that into income. Create AI looks, post instantly, and earn from every click, view, and conversion without shoots, delays, or chasing brands.',
      ctaLabel: 'Start Creating →',
      href: '/signup/influencer',
      accentBg: '#ff8a73',
    },
    brand: {
      label: 'For Brands',
      labelColor: '#b3f500',
      title: "Spending on marketing but not seeing real results? There's a smarter way.",
      intro: ["You don't need more effort.", 'You need better execution.'],
      body:
        'Find the right creators, generate high-performing ads, and launch campaigns that actually convert, all powered by AI.',
      ctaLabel: 'Start Scaling →',
      href: '/signup/brand',
      accentBg: '#caff33',
    },
  } as const

  const activeAudience = audienceContent[audienceView]

  return (
    <div
      className="antialiased relative bg-transparent overflow-x-hidden"
      style={{ fontFamily: PF, color: '#111111' }}
    >
      <div className="grid-overlay" aria-hidden />

      <div
        ref={globalBgRef}
        id="global-bg"
        className="fixed top-0 left-0 z-[-2] h-screen w-full bg-cover bg-center will-change-transform md:h-[120vh]"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1550614000-4b95d85824b0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')",
        }}
      />

      <div
        className="landing-main-wrapper w-full max-w-[1600px] mx-auto border-l border-r border-black/10 relative bg-transparent overflow-x-hidden"
        style={{ marginTop: 'clamp(52px, 8vw, 60px)' }}
      >
        <section
          ref={heroRef}
          className="relative w-full grid-line-x overflow-hidden flex flex-col justify-end"
          style={{ height: 'clamp(500px, 90vh, 1200px)' }}
        >
          <div
            ref={heroImgRef}
            id="hero-img"
            className="absolute inset-0 hero-bg-image opacity-90"
            style={{ transform: 'scale(1.05)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#faf9f6] via-[#faf9f6]/40 to-transparent" />

          <div className="relative z-10 flex flex-col h-full w-full justify-between">
            <div
              ref={heroTitleRef}
              id="hero-title-container"
              className="flex-1 flex items-center justify-center pointer-events-none pb-10"
            >
              <h1
                className="leading-none font-black tracking-tighter text-[#111111] opacity-90 mix-blend-multiply relative"
                style={{ fontSize: 'clamp(2.5rem, 12vw, 15rem)' }}
              >
                KIWIKOO
                <span
                  className="leading-none font-black tracking-tighter text-transparent absolute left-0 top-0"
                  style={{ WebkitTextStroke: '1px rgba(17,17,17,0.4)' }}
                >
                  KIWIKOO
                </span>
              </h1>
            </div>

            <div className="relative z-20 flex flex-col md:flex-row w-full text-sm bg-[#faf9f6] border-strong-t">
              <div className="md:w-3/4 p-8 md:p-12 grid-line-y flex flex-col justify-center min-w-0">
                <h2
                  className="font-black uppercase tracking-tight leading-[0.94] text-[#111111]"
                  style={{ fontSize: 'clamp(1.85rem, 4.4vw, 4rem)' }}
                >
                  Where Fashion Meets
                  <br />
                  <span className="text-[#ff8a73]">AI.</span>
                  <br />
                  <span className="text-[#b3f500]">This is where it happens.</span>
                </h2>
                <p className="hidden max-w-2xl text-gray-800 text-lg md:text-xl font-bold leading-relaxed">
                  The ultimate fashion marketplace where influencers and brands connect, create, and convert — powered by AI.
                </p>
                <div className="hidden flex-col sm:flex-row gap-4">
                  <Link
                    href="/signup/influencer"
                    className="neo-btn border-2 border-[#111111] bg-[#ff8a73] px-8 py-4 font-extrabold text-[#111111] inline-flex items-center justify-center gap-3 rounded-xl"
                    style={{ boxShadow: '4px 4px 0px rgba(17,17,17,1)' }}
                  >
                    Join as Influencer
                  </Link>
                  <Link
                    href="/signup/brand"
                    className="neo-btn border-2 border-[#111111] bg-[#caff33] px-8 py-4 font-extrabold text-[#111111] inline-flex items-center justify-center gap-3 rounded-xl"
                    style={{ boxShadow: '4px 4px 0px rgba(17,17,17,1)' }}
                  >
                    Join as Brand
                  </Link>
                </div>
              </div>
              <div className="md:w-1/4 p-8 md:p-10 flex flex-col justify-center bg-white relative overflow-hidden">
                <div className="hidden absolute -right-4 -top-4 text-9xl font-black text-gray-100 pointer-events-none select-none leading-none">
                  AI
                </div>
                <div className="hidden relative z-10">
                  <div className="text-[#ff8a73] font-black text-4xl md:text-5xl mb-2 tracking-tighter">
                    No shoots.
                  </div>
                  <div className="text-[#111111] font-bold text-xs tracking-widest uppercase mb-4">
                    No stress. Just results.
                  </div>
                  <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div className="w-full h-full bg-[#ff8a73] animate-pulse" />
                  </div>
                </div>
                <div className="relative z-10 space-y-4">
                  <p className="font-black text-[#111111] uppercase tracking-[0.22em] text-xs">KIWIKOO</p>
                  <p className="font-bold leading-relaxed text-[15px] md:text-base text-gray-700">
                    For creators who want to earn. For brands that want to scale.
                  </p>
                  <p className="font-bold leading-relaxed text-[15px] md:text-base text-gray-700">
                    This is where content, commerce, and AI finally work in one flow.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-4 w-full grid-line-x bg-white">
          <div className="md:col-span-3 p-8 md:p-12 grid-line-y min-w-0 flex flex-col justify-center gap-5 md:gap-6">
            <div className="space-y-2">
              <p className="text-sm font-black uppercase tracking-[0.28em] text-gray-500">
                Where Fashion Meets AI
              </p>
              <p className="max-w-2xl text-[1.05rem] md:text-[1.38rem] font-bold leading-[1.45] text-gray-700">
                For creators who want to earn.
                <br />
                For brands that want to scale.
                <br />
                This is where it happens.
              </p>
            </div>
            <p className="max-w-3xl text-gray-800 text-[1.08rem] md:text-[1.42rem] font-bold leading-[1.48]">
              The ultimate fashion marketplace where influencers and brands connect, create, and convert — powered by AI.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/signup/influencer"
                className="neo-btn border-2 border-[#111111] bg-[#ff8a73] px-8 py-4 font-extrabold text-[#111111] inline-flex items-center justify-center gap-3 rounded-xl"
                style={{ boxShadow: '4px 4px 0px rgba(17,17,17,1)' }}
              >
                Join as Influencer
              </Link>
              <Link
                href="/signup/brand"
                className="neo-btn border-2 border-[#111111] bg-[#caff33] px-8 py-4 font-extrabold text-[#111111] inline-flex items-center justify-center gap-3 rounded-xl"
                style={{ boxShadow: '4px 4px 0px rgba(17,17,17,1)' }}
              >
                Join as Brand
              </Link>
            </div>
          </div>
          <div className="md:col-span-1 p-8 md:p-10 text-sm text-gray-800 flex flex-col justify-center bg-[#faf9f6] border-t md:border-t-0 border-black/10">
            <p className="hidden mb-6 font-black text-[#111111] uppercase tracking-widest text-xs">KIWIKOO</p>
            <p className="hidden mb-6 font-bold leading-relaxed">
              For creators who want to earn. For brands that want to scale.
            </p>
            <p className="hidden font-bold leading-relaxed">
              This is where content, commerce, and AI finally work in one flow.
            </p>
            <div className="relative z-10">
              <div className="text-[#ff8a73] font-black text-4xl md:text-5xl mb-2 tracking-tighter">
                No shoots.
              </div>
              <div className="text-[#111111] font-bold text-xs tracking-widest uppercase mb-4">
                No stress. Just results.
              </div>
              <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                <div className="w-full h-full bg-[#ff8a73] animate-pulse" />
              </div>
            </div>
          </div>
        </section>

        <section className="w-full border-strong-b bg-[#faf9f6]">
          <div className="grid grid-cols-1 md:grid-cols-[1.15fr_0.85fr]">
            <div className="grid-line-y border-b border-black/10 p-6 sm:p-8 md:border-b-0 md:p-12">
              <div className="inline-flex items-center gap-2 rounded-full border-[3px] border-black bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-gray-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <span className="h-3.5 w-3.5 rounded-full bg-[#ff8a73] border-2 border-black" />
                What We Give You
              </div>
              <h3 className="mt-6 text-[clamp(2.2rem,5vw,4.8rem)] font-black uppercase tracking-tight leading-[0.9] text-[#111111]">
                Everything changes
                <br />
                from here.
              </h3>
            </div>
            <div className="p-6 sm:p-8 md:p-12">
              <p className="mt-4 text-[15px] font-semibold leading-relaxed text-gray-600 md:text-lg">
                You don&apos;t need more tools.
                <br />
                You need something that actually works.
                <br />
                <br />
                Here&apos;s what you can do once you&apos;re in.
              </p>
            </div>
          </div>
        </section>

        <section className="w-full border-strong-b bg-[#faf9f6] px-5 py-6 md:px-8 md:py-8">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
          <FeatureCard
            label="For Creators"
            labelColor="#ff8a73"
            title="AI Try-On Studio"
            description="See yourself in outfits without ever wearing them."
            bordered
          />
          <FeatureCard
            label="For Creators"
            labelColor="#ff8a73"
            title="Affiliate Engine"
            description="Every post you make? It can earn."
            bordered
          />
          <FeatureCard
            label="For Brands"
            labelColor="#b3f500"
            title="Smart Campaigns"
            description="Plan it. Launch it. Scale it. All in one flow."
          />
          <FeatureCard
            label="For Brands"
            labelColor="#b3f500"
            title="Ad Creator"
            description="Create ads that people actually stop for."
            bordered
          />
          <FeatureCard
            label="For Both"
            labelColor="#d8b4fe"
            title="Real-Time Analytics"
            description="No guessing. Just clear numbers."
            bordered
          />
          <FeatureCard
            label="For Both"
            labelColor="#d8b4fe"
            title="Marketplace"
            description="Find the right products. Connect faster."
          />
          </div>
        </section>

        <section className="w-full border-strong-b bg-white">
          <div className="mx-auto flex max-w-4xl flex-col items-center px-5 py-7 text-center md:px-8 md:py-12">
            <div
              className="inline-flex rounded-full border-[3px] border-black bg-[#faf9f6] p-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              role="tablist"
              aria-label="Audience switch"
            >
              <button
                type="button"
                onClick={() => setAudienceView('influencer')}
                className={`rounded-full px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-colors md:px-5 md:py-2.5 md:text-[11px] ${
                  audienceView === 'influencer' ? 'text-[#111111]' : 'text-gray-500'
                }`}
                style={{
                  backgroundColor: audienceView === 'influencer' ? '#ff8a73' : 'transparent',
                }}
              >
                Influencers
              </button>
              <button
                type="button"
                onClick={() => setAudienceView('brand')}
                className={`rounded-full px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-colors md:px-5 md:py-2.5 md:text-[11px] ${
                  audienceView === 'brand' ? 'text-[#111111]' : 'text-gray-500'
                }`}
                style={{
                  backgroundColor: audienceView === 'brand' ? '#caff33' : 'transparent',
                }}
              >
                Brands
              </button>
            </div>

            <div className="mt-5 w-full rounded-[24px] border-[3px] border-black bg-[#faf9f6] px-5 py-6 text-left shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] md:mt-6 md:rounded-[28px] md:px-8 md:py-9">
              <div
                className="text-[10px] font-black uppercase tracking-[0.24em] md:text-xs md:tracking-[0.28em]"
                style={{ color: activeAudience.labelColor }}
              >
                {activeAudience.label}
              </div>
              <h3 className="mt-3 max-w-3xl text-[clamp(1.55rem,3vw,3rem)] font-black leading-[1] tracking-tight text-[#111111] md:mt-4">
                {activeAudience.title}
              </h3>
              <div className="mt-4 space-y-1.5 text-[15px] font-semibold leading-relaxed text-gray-600 md:mt-5 md:space-y-2 md:text-[1.02rem]">
                {activeAudience.intro.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
              <p className="mt-5 max-w-3xl text-[14px] font-semibold leading-[1.7] text-gray-700 md:mt-6 md:text-[1rem]">
                {activeAudience.body}
              </p>
              <Link
                href={activeAudience.href}
                className="mt-5 inline-flex items-center gap-3 rounded-xl border-2 border-[#111111] px-4 py-2.5 text-sm font-black text-[#111111] md:mt-6 md:px-5 md:py-3 md:text-base"
                style={{
                  boxShadow: '4px 4px 0px rgba(17,17,17,1)',
                  backgroundColor: activeAudience.accentBg,
                }}
              >
                {activeAudience.ctaLabel}
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] w-full border-strong-b bg-[#faf9f6]">
          <div className="grid-line-y p-8 md:p-12 border-b md:border-b-0 border-black/10">
            <div className="text-xs font-black uppercase tracking-[0.28em] text-[#111111]">Why Us</div>
            <h3 className="mt-6 text-[clamp(2rem,4vw,4.4rem)] font-black leading-[0.95] tracking-tight text-[#111111]">
              Built different.
              <br />
              Because the old way doesn&apos;t work anymore.
            </h3>
            <div className="mt-6 space-y-2 text-lg font-semibold text-gray-600">
              <p>You&apos;ve seen how it usually goes.</p>
              <p>Expensive shoots.</p>
              <p>Endless coordination.</p>
              <p>Campaigns that don&apos;t convert.</p>
            </div>
            <p className="mt-6 max-w-2xl text-base md:text-lg font-semibold leading-relaxed text-gray-700">
              We changed that.
              <br />
              <br />
              From creators turning content into income to brands turning reach into revenue, Kiwikoo powers the full journey.
            </p>
          </div>
          <div className="p-8 md:p-12 bg-white">
            <div className="grid gap-4">
              {[
                'No expensive photoshoots',
                'No manual creator hunting',
                'No guesswork in campaigns',
                'No delays in execution',
              ].map((item, index) => (
                <div
                  key={item}
                  className="flex items-center gap-4 rounded-2xl border-2 border-[#111111] bg-[#faf9f6] px-5 py-5"
                  style={{ boxShadow: '4px 4px 0px rgba(17,17,17,1)' }}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#111111] font-black text-[#111111]"
                    style={{ backgroundColor: index % 2 === 0 ? '#caff33' : '#ff8a73' }}
                  >
                    {index + 1}
                  </div>
                  <div className="text-base font-bold text-[#111111]">{item}</div>
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-2xl border-2 border-[#111111] bg-[#111111] px-6 py-6 text-center text-xl font-black text-white">
              Create → Share → Earn. That&apos;s it.
            </div>
          </div>
        </section>

        <section
          ref={footerSecRef}
          id="footer-image-section"
          className="relative flex h-[58vh] w-full items-end justify-center overflow-hidden bg-white pb-8 grid-line-x sm:h-[68vh] sm:pb-10 md:h-[85vh] md:pb-12"
        >
          <div className="absolute inset-0 z-0 bg-[#faf9f6]" />
          <div
            ref={footerClipRef}
            className="footer-clip-image absolute inset-0 z-10"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          </div>
          <div
            ref={footerLabelRef}
            id="footer-img-label"
            className="relative z-20 font-bold text-sm tracking-[0.2em] text-white mt-auto uppercase"
            style={{ opacity: 0 }}
          >
            No shoots. No stress. Just results.
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-[0.9fr_1.1fr] w-full border-strong-b bg-white">
          <div className="grid-line-y p-8 md:p-12 border-b md:border-b-0 border-black/10">
            <div className="text-xs font-black uppercase tracking-[0.28em] text-[#111111]">Contact</div>
            <h3 className="mt-6 text-[clamp(2rem,4vw,4.4rem)] font-black leading-[0.95] tracking-tight text-[#111111]">
              Got something in mind?
              <br />
              Let&apos;s talk.
            </h3>
            <div className="mt-6 space-y-2 text-lg font-semibold text-gray-600">
              <p>Thinking about partnering?</p>
              <p>Have a question?</p>
              <p>Or just curious?</p>
              <p>We&apos;re here.</p>
            </div>
            <p className="mt-6 text-base md:text-lg font-semibold leading-relaxed text-gray-700">
              Queries and collaborations, we&apos;re all in.
            </p>
            <div
              className="mt-8 rounded-2xl border-2 border-[#111111] bg-[#faf9f6] px-6 py-6 text-sm font-bold leading-relaxed text-gray-700"
              style={{ boxShadow: '4px 4px 0px rgba(17,17,17,1)' }}
            >
              <div className="uppercase tracking-[0.2em] text-xs text-gray-500">Email</div>
              <a href="mailto:team@dridhatechnologies.com" className="mt-2 block text-lg font-black text-[#111111]">
                team@dridhatechnologies.com
              </a>
              <div className="mt-4 text-sm font-semibold text-gray-500">
                We usually reply within 24 hours.
              </div>
            </div>
          </div>
          <div className="p-8 md:p-12 bg-[#faf9f6]">
            <form onSubmit={handleContactSubmit} className="grid gap-5">
              <input
                type="text"
                placeholder="Name"
                value={contactForm.name}
                onChange={(event) => setContactForm((prev) => ({ ...prev, name: event.target.value }))}
                className="rounded-2xl border-2 border-[#111111] bg-white px-5 py-4 font-semibold text-[#111111] outline-none"
                style={{ boxShadow: '4px 4px 0px rgba(17,17,17,1)' }}
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={contactForm.email}
                onChange={(event) => setContactForm((prev) => ({ ...prev, email: event.target.value }))}
                className="rounded-2xl border-2 border-[#111111] bg-white px-5 py-4 font-semibold text-[#111111] outline-none"
                style={{ boxShadow: '4px 4px 0px rgba(17,17,17,1)' }}
                required
              />
              <select
                value={contactForm.userType}
                onChange={(event) => setContactForm((prev) => ({ ...prev, userType: event.target.value }))}
                className="rounded-2xl border-2 border-[#111111] bg-white px-5 py-4 font-semibold text-[#111111] outline-none"
                style={{ boxShadow: '4px 4px 0px rgba(17,17,17,1)' }}
              >
                <option value="Influencer">You are: Influencer</option>
                <option value="Brand">You are: Brand</option>
                <option value="Other">You are: Other</option>
              </select>
              <textarea
                placeholder="Message"
                value={contactForm.message}
                onChange={(event) => setContactForm((prev) => ({ ...prev, message: event.target.value }))}
                className="min-h-[180px] rounded-2xl border-2 border-[#111111] bg-white px-5 py-4 font-semibold text-[#111111] outline-none"
                style={{ boxShadow: '4px 4px 0px rgba(17,17,17,1)' }}
                required
              />
              <button
                type="submit"
                disabled={contactState.loading}
                className="inline-flex items-center justify-center gap-3 rounded-2xl border-2 border-[#111111] bg-[#caff33] px-6 py-4 font-black text-[#111111] disabled:cursor-not-allowed disabled:opacity-70"
                style={{ boxShadow: '4px 4px 0px rgba(17,17,17,1)' }}
              >
                {contactState.loading ? 'Sending...' : 'Send Message'}
              </button>
              {contactState.message ? (
                <p className={`text-sm font-bold ${contactState.kind === 'error' ? 'text-[#ff4d4f]' : 'text-[#111111]'}`}>
                  {contactState.message}
                </p>
              ) : null}
            </form>
          </div>
        </section>

        <section className="w-full border-strong-b flex justify-center items-center aspect-[5/1] bg-[#caff33] overflow-hidden relative">
          <h1
            ref={footerHugeRef}
            id="footer-huge-text"
            className="font-black tracking-tighter text-transparent whitespace-nowrap leading-[0.8] select-none"
            style={{
              fontSize: 'clamp(2.5rem, 17vw, 16rem)',
              WebkitTextStroke: '3px rgba(17,17,17,0.85)',
            }}
          >
            KIWIKOO
          </h1>
        </section>

        <footer className="grid grid-cols-1 md:grid-cols-2 w-full text-xs font-bold uppercase bg-white">
          <div className="p-8 md:p-12 grid-line-y grid-line-x flex flex-col justify-between gap-10">
            <div className="flex gap-12">
              <div>
                <div className="text-gray-400 mb-4 tracking-widest">Company</div>
                <ul className="space-y-3 text-[#111111]">
                  <li><Link href="/about" className="hover:text-[#ff8a73] transition-colors uppercase">About Us</Link></li>
                  <li><Link href="/register" className="hover:text-[#ff8a73] transition-colors">Join Us</Link></li>
                  <li><Link href="/#marketplace" className="hover:text-[#ff8a73] transition-colors">Marketplace</Link></li>
                </ul>
              </div>
              <div>
                <div className="text-gray-400 mb-4 tracking-widest">Legal</div>
                <ul className="space-y-3 text-[#111111]">
                  <li><Link href="/privacy" className="hover:text-[#ff8a73] transition-colors uppercase">Privacy Policy</Link></li>
                  <li><Link href="/terms" className="hover:text-[#ff8a73] transition-colors uppercase">Terms of Use</Link></li>
                </ul>
              </div>
            </div>
            <div className="text-gray-500 tracking-widest">(C) 2026 KIWIKOO. ALL RIGHTS RESERVED.</div>
          </div>
          <div className="p-8 md:p-12 grid-line-x flex flex-col justify-between items-start md:items-end text-left md:text-right bg-[#faf9f6] border-t md:border-t-0 border-black/10 gap-10">
            <div>
              <Link
                href="/register"
                className="neo-btn border-2 border-[#111111] px-8 py-4 font-black hover:bg-[#111111] hover:text-white transition-colors inline-flex items-center gap-4 group bg-white rounded-xl"
                style={{ boxShadow: '4px 4px 0px rgba(17,17,17,1)' }}
              >
                CREATE ACCOUNT
                <svg
                  className="w-5 h-5 group-hover:translate-x-2 transition-transform shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
            <div className="text-gray-400 tracking-widest">English (US)</div>
          </div>
        </footer>
      </div>
    </div>
  )
}

function FeatureCard({
  label,
  labelColor,
  title,
  description,
  bordered = false,
}: {
  label: string
  labelColor: string
  title: string
  description: string
  bordered?: boolean
}) {
  const words = title.split(' ')
  const head = words.length > 1 ? words.slice(0, -1).join(' ') : title
  const tail = words.length > 1 ? words[words.length - 1] : null

  return (
    <div
      className={`flex min-h-[220px] flex-col justify-between rounded-[28px] border-[3px] border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(17,17,17,1)] transition-transform duration-200 hover:-translate-y-1 md:min-h-[260px] md:p-8 ${bordered ? 'md:translate-y-1' : ''}`}
    >
      <div className="space-y-5">
        <div
          className="inline-flex items-center gap-2 rounded-full border-2 border-black px-3 py-2 text-[10px] font-black uppercase tracking-[0.24em] md:text-xs"
          style={{ color: '#111111', backgroundColor: `${labelColor}22` }}
        >
          <span
            className="h-3 w-3 rounded-full border-2 border-black"
            style={{ backgroundColor: labelColor }}
          />
          {label}
        </div>
        <div>
          <h4 className="mb-3 text-[1.8rem] font-black uppercase tracking-tight leading-[0.92] text-[#111111] md:text-[2.15rem]">
            {head}
            {tail ? <br /> : null}
            {tail}
          </h4>
          <p className="max-w-[28ch] text-[15px] font-semibold leading-relaxed text-gray-600 md:text-base">
            {description}
          </p>
        </div>
      </div>
      <div
        className="mt-6 h-2 rounded-full border-2 border-black"
        style={{ background: `linear-gradient(90deg, ${labelColor} 0%, ${labelColor}88 100%)` }}
      />
    </div>
  )
}
