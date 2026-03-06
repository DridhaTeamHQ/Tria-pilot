'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const PF = 'var(--font-plus-jakarta-sans), sans-serif'

export default function LandingPage() {
  const globalBgRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLElement>(null)
  const heroImgRef = useRef<HTMLDivElement>(null)
  const heroTitleRef = useRef<HTMLDivElement>(null)
  const wordsRef = useRef<HTMLSpanElement[]>([])
  const arrows1Ref = useRef<HTMLSpanElement[]>([])
  const arrows2Ref = useRef<HTMLSpanElement[]>([])
  const footerSecRef = useRef<HTMLElement>(null)
  const footerClipRef = useRef<HTMLDivElement>(null)
  const footerLabelRef = useRef<HTMLDivElement>(null)
  const footerHugeRef = useRef<HTMLHeadingElement>(null)

  /* ── transparent html/body so #global-bg shows through ── */
  useEffect(() => {
    document.documentElement.classList.add('landing-transparent-bg')
    document.body.classList.add('landing-transparent-bg')
    return () => {
      document.documentElement.classList.remove('landing-transparent-bg')
      document.body.classList.remove('landing-transparent-bg')
    }
  }, [])

  /* ── Lenis + GSAP scroll animations ── */
  useEffect(() => {
    const globalBg = globalBgRef.current
    const hero = heroRef.current
    const heroImg = heroImgRef.current
    const heroTitle = heroTitleRef.current
    const words = wordsRef.current.filter(Boolean)
    const arrows1 = arrows1Ref.current.filter(Boolean)
    const arrows2 = arrows2Ref.current.filter(Boolean)
    const footerSec = footerSecRef.current
    const footerClip = footerClipRef.current
    const footerLbl = footerLabelRef.current
    const footerHuge = footerHugeRef.current

    if (!hero) return

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Lenis smooth scroll (skip when user prefers reduced motion)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lenis: any = null
    const tick = (time: number) => { lenis?.raf(time * 1000) }

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
        .catch(() => { /* native scroll fallback */ })
    }

    // Skip scroll-driven animations when user prefers reduced motion
    if (prefersReducedMotion) {
      ScrollTrigger.getAll().forEach((t) => t.kill())
      return () => { }
    }

    // ── Global Background Parallax Pan ──
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

    // ── Hero Parallax: title ──
    if (heroTitle) {
      gsap.to(heroTitle, {
        yPercent: -100,
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

    // ── Hero Parallax: image scale ──
    if (heroImg) {
      gsap.to(heroImg, {
        scale: 1.15,
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

    // ── Arrows 1 → coral ──
    arrows1.forEach((arrow) => {
      gsap.fromTo(
        arrow,
        { opacity: 0.2, color: '#d1d1d1' },
        {
          opacity: 1,
          color: '#ff8a73',
          scrollTrigger: {
            trigger: arrow,
            start: 'top 80%',
            end: 'top 40%',
            scrub: true,
            invalidateOnRefresh: true,
          },
        }
      )
    })

    // ── Reveal Words ──
    if (words.length) {
      gsap.to(words, {
        opacity: 1,
        stagger: 0.1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: words[0],
          start: 'top 85%',
          end: 'bottom 50%',
          scrub: 1,
          invalidateOnRefresh: true,
        },
      })
    }

    // ── Arrows 2 → kiwi ──
    arrows2.forEach((arrow) => {
      gsap.fromTo(
        arrow,
        { opacity: 0.2, color: '#d1d1d1' },
        {
          opacity: 1,
          color: '#caff33',
          scrollTrigger: {
            trigger: arrow,
            start: 'top 80%',
            end: 'top 40%',
            scrub: true,
            invalidateOnRefresh: true,
          },
        }
      )
    })

    // ── Footer Image Scale (clip-path) ──
    if (footerSec && footerClip) {
      gsap.fromTo(
        footerClip,
        { clipPath: 'inset(0% 0% 0% 0%)', borderRadius: '0px' },
        {
          clipPath: 'inset(10% 20% 10% 20%)',
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

    // ── Footer Label Reveal ──
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

    // ── Footer Huge Text ──
    if (footerHuge) {
      gsap.from(footerHuge, {
        yPercent: 50,
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
        if (lenis && typeof lenis.destroy === 'function') lenis.destroy()
      } catch {
        // no-op
      }
      gsap.ticker.remove(tick)
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [])

  return (
    <div
      className="antialiased relative bg-transparent overflow-x-hidden"
      style={{ fontFamily: PF, color: '#111111' }}
    >
      {/* Grid overlay */}
      <div className="grid-overlay" aria-hidden />

      {/* ── GLOBAL PARALLAX BACKGROUND ── */}
      <div
        ref={globalBgRef}
        id="global-bg"
        className="fixed top-0 left-0 w-full h-[120vh] z-[-2] bg-cover bg-center will-change-transform"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1550614000-4b95d85824b0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')",
        }}
      />

      {/* ── MAIN CONTAINER ── */}
      <div
        className="landing-main-wrapper w-full max-w-[1600px] mx-auto border-l border-r border-black/10 relative bg-transparent overflow-x-hidden"
        style={{ marginTop: 'clamp(52px, 8vw, 60px)' }}
      >

        {/* ━━━━━━━━━━ HERO SECTION ━━━━━━━━━━ */}
        <section
          ref={heroRef}
          className="relative w-full grid-line-x overflow-hidden flex flex-col justify-end"
          style={{ height: 'clamp(500px, 90vh, 1200px)' }}
        >
          {/* Hero image */}
          <div
            ref={heroImgRef}
            id="hero-img"
            className="absolute inset-0 hero-bg-image opacity-90"
            style={{ transform: 'scale(1.05)' }}
          />
          {/* Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#faf9f6] via-[#faf9f6]/40 to-transparent" />

          {/* Content Wrapper for proper stacking */}
          <div className="relative z-10 flex flex-col h-full w-full justify-between">
            {/* KIWIKOO title - Flex growing to take available space above the bar */}
            <div
              ref={heroTitleRef}
              id="hero-title-container"
              className="flex-1 flex items-center justify-center pointer-events-none pb-10"
            >
              <h1
                className="leading-none font-black tracking-tighter text-[#111111] opacity-90 mix-blend-multiply relative"
                style={{ fontSize: 'clamp(2.5rem, 16vw, 15rem)' }}
              >
                KIWIKOO
                <span
                  className="leading-none font-black tracking-tighter text-transparent absolute left-0 top-0"
                  style={{
                    WebkitTextStroke: '1px rgba(17,17,17,0.4)',
                  }}
                >
                  KIWIKOO
                </span>
              </h1>
            </div>

            {/* Bottom Data Bar */}
            <div className="relative z-20 flex flex-col md:flex-row w-full text-sm bg-[#faf9f6] border-strong-t">
              {/* Left: tagline + CTA */}
              <div className="md:w-3/4 p-8 md:p-12 grid-line-y flex flex-col justify-center gap-6">
                <p className="max-w-2xl text-gray-800 text-lg md:text-xl font-bold leading-relaxed">
                  The ultimate fashion marketplace connecting influencers with the hottest brands. Try, Share, and Earn with vertically integrated AI.
                </p>
                <Link
                  href="/register"
                  className="neo-btn border-2 border-[#111111] bg-[#caff33] px-8 py-4 font-extrabold text-[#111111] inline-flex items-center gap-3 w-max rounded-xl"
                  style={{ boxShadow: '4px 4px 0px rgba(17,17,17,1)' }}
                >
                  GET STARTED
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
              {/* Right: Instant widget */}
              <div className="md:w-1/4 p-8 flex flex-col justify-center bg-white relative overflow-hidden">
                <div className="absolute -right-4 -top-4 text-9xl font-black text-gray-100 pointer-events-none select-none leading-none">
                  AI
                </div>
                <div className="relative z-10">
                  <div className="text-[#ff8a73] font-black text-5xl mb-2 tracking-tighter">Instant</div>
                  <div className="text-[#111111] font-bold text-xs tracking-widest uppercase mb-4">
                    Virtual Try-On Output
                  </div>
                  <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div className="w-full h-full bg-[#ff8a73] animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━ ARROW TRANSITION 1 ━━━━━━━━━━ */}
        <section className="grid grid-cols-3 w-full grid-line-x font-bold text-gray-300 text-2xl tracking-tighter py-12 bg-[#faf9f6]">
          <div className="col-span-1 grid-line-y flex flex-col items-center gap-2">
            <span>\/\/</span><span>\/\/</span><span>\/\/</span>
          </div>
          <div className="col-span-1 grid-line-y flex flex-col items-center gap-2 text-[#111111]">
            <span ref={(el) => { if (el) arrows1Ref.current[0] = el }} className="arrow-down-main">\/\/</span>
            <span ref={(el) => { if (el) arrows1Ref.current[1] = el }} className="arrow-down-main">\/\/</span>
            <span ref={(el) => { if (el) arrows1Ref.current[2] = el }} className="arrow-down-main">\/\/</span>
          </div>
          <div className="col-span-1 flex flex-col items-center gap-2">
            <span>\/\/</span><span>\/\/</span><span>\/\/</span>
          </div>
        </section>

        {/* ━━━━━━━━━━ STATEMENT TEXT ━━━━━━━━━━ */}
        <section className="grid grid-cols-1 md:grid-cols-4 w-full grid-line-x bg-white">
          <div className="md:col-span-3 p-10 md:p-20 grid-line-y min-w-0">
            <h2
              className="font-black uppercase tracking-tighter leading-[0.9] text-[#111111]"
              style={{ fontSize: 'clamp(2.2rem, 7vw, 5.5rem)' }}
            >
              <span
                ref={(el) => { if (el) wordsRef.current[0] = el }}
                className="reveal-word opacity-20 inline-block"
              >WHERE</span>{' '}
              <span
                ref={(el) => { if (el) wordsRef.current[1] = el }}
                className="reveal-word opacity-20 text-[#ff8a73] inline-block"
              >FASHION</span>{' '}
              <span
                ref={(el) => { if (el) wordsRef.current[2] = el }}
                className="reveal-word opacity-20 inline-block"
              >MEETS</span>
              <br />
              <span
                ref={(el) => { if (el) wordsRef.current[3] = el }}
                className="reveal-word opacity-20 inline-block"
              >ARTIFICIAL</span>{' '}
              <span
                ref={(el) => { if (el) wordsRef.current[4] = el }}
                className="reveal-word opacity-20 text-[#caff33] inline-block"
              >INTELLIGENCE.</span>
            </h2>
          </div>
          <div className="md:col-span-1 p-10 text-sm text-gray-800 flex flex-col justify-center bg-[#faf9f6] border-t md:border-t-0 border-black/10">
            <p className="mb-6 font-black text-[#111111] uppercase tracking-widest text-xs">The New Standard</p>
            <p className="mb-6 font-bold leading-relaxed">
              We merge the creativity of Gen-Z influencers with cutting-edge AI rendering. It&apos;s stable, fast, and diffuses seamlessly into your social feed.
            </p>
            <p className="font-bold leading-relaxed">
              Turn your influence into income without the wait of physical shipping.
            </p>
          </div>
        </section>

        {/* ━━━━━━━━━━ OUR FEATURES — SVG K KNOCKOUT MASK ━━━━━━━━━━
            SVG <mask>: white rect = opaque background, black text = transparent hole
            revealing #global-bg through the letter K.                              */}
        <section
          className="w-full relative flex flex-col justify-start border-strong-b overflow-hidden bg-transparent"
          style={{ height: 'clamp(280px, 60vh, 700px)' }}
        >
          {/* SVG Knockout Layer */}
          <svg
            className="absolute inset-0 w-full h-full z-0 pointer-events-none"
            aria-hidden
          >
            <defs>
              <mask id="k-knockout">
                {/* White → draws solid background */}
                <rect width="100%" height="100%" fill="white" />
                {/* Black text → punches transparent hole */}
                <text
                  x="50%"
                  y="50%"
                  dy=".35em"
                  textAnchor="middle"
                  fontFamily="'Plus Jakarta Sans', sans-serif"
                  fontWeight="900"
                  letterSpacing="-0.05em"
                  fill="black"
                  style={{ fontSize: 'min(65vw, 75vh)' }}
                >
                  K
                </text>
              </mask>
            </defs>
            {/* #faf9f6 background with K punched out */}
            <rect width="100%" height="100%" fill="#faf9f6" mask="url(#k-knockout)" />
          </svg>

          {/* "Our Features" pill */}
          <div className="relative z-10 w-full text-center pt-16 md:pt-20 pointer-events-none">
            <h3 className="font-bold tracking-[0.4em] text-sm text-gray-500 uppercase bg-[#faf9f6]/90 px-4 py-2 rounded-full inline-block backdrop-blur-sm shadow-sm border border-black/5">
              Our Features
            </h3>
          </div>
        </section>

        {/* ━━━━━━━━━━ SOLUTIONS CARDS GRID ━━━━━━━━━━ */}
        <section className="grid grid-cols-1 md:grid-cols-3 w-full border-strong-b bg-[#faf9f6]">
          {/* Card 1 */}
          <div className="grid-line-y p-10 flex flex-col justify-between hover:bg-white transition-colors min-h-[400px] border-b md:border-b-0 border-black/10">
            <div className="flex justify-between items-start mb-12">
              <div className="w-10 h-10 rounded-full border-2 border-[#111111] flex items-center justify-center bg-[#ff8a73] text-[#111111] font-bold">
                1
              </div>
            </div>
            <div>
              <h4 className="text-3xl font-black text-[#111111] uppercase mb-4 tracking-tighter leading-none">
                Automated<br />Content Creation
              </h4>
              <p className="text-sm font-semibold text-gray-500">
                Generate high-quality try-on images instantly. Keep your feed fresh without buying new wardrobes.
              </p>
            </div>
          </div>
          {/* Card 2 */}
          <div className="grid-line-y p-10 flex flex-col justify-between hover:bg-white transition-colors min-h-[400px] border-b md:border-b-0 border-black/10">
            <div className="flex justify-between items-start mb-12">
              <div className="w-10 h-10 rounded-full border-2 border-[#111111] flex items-center justify-center bg-[#caff33] text-[#111111] font-bold">
                2
              </div>
            </div>
            <div>
              <h4 className="text-3xl font-black text-[#111111] uppercase mb-4 tracking-tighter leading-none">
                Influencer X<br />Brand
              </h4>
              <p className="text-sm font-semibold text-gray-500">
                Access thousands of verified influencers. Launch campaigns and track performance seamlessly.
              </p>
            </div>
          </div>
          {/* Card 3 */}
          <div className="p-10 flex flex-col justify-between hover:bg-white transition-colors min-h-[400px]">
            <div className="flex justify-between items-start mb-12">
              <div className="w-10 h-10 rounded-full border-2 border-[#111111] flex items-center justify-center bg-[#d8b4fe] text-[#111111] font-bold">
                3
              </div>
            </div>
            <div>
              <h4 className="text-3xl font-black text-[#111111] uppercase mb-4 tracking-tighter leading-none">
                Deep<br />Analytics
              </h4>
              <p className="text-sm font-semibold text-gray-500">
                Real-time insights. Transparent, trackable, and honest conversion data for every campaign.
              </p>
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━ ARROW TRANSITION 2 ━━━━━━━━━━ */}
        <section className="grid grid-cols-3 w-full grid-line-x font-bold text-gray-300 text-2xl tracking-tighter py-12 relative z-20 bg-white">
          <div className="col-span-1 grid-line-y flex flex-col items-center gap-2">
            <span>\/\/</span><span>\/\/</span><span>\/\/</span>
          </div>
          <div className="col-span-1 grid-line-y flex flex-col items-center gap-2 text-[#111111]">
            <span ref={(el) => { if (el) arrows2Ref.current[0] = el }} className="arrow-down-main-2">\/\/</span>
            <span ref={(el) => { if (el) arrows2Ref.current[1] = el }} className="arrow-down-main-2">\/\/</span>
            <span ref={(el) => { if (el) arrows2Ref.current[2] = el }} className="arrow-down-main-2">\/\/</span>
          </div>
          <div className="col-span-1 flex flex-col items-center gap-2">
            <span>\/\/</span><span>\/\/</span><span>\/\/</span>
          </div>
        </section>

        {/* ━━━━━━━━━━ FOOTER SCALING IMAGE SEQUENCE ━━━━━━━━━━ */}
        <section
          ref={footerSecRef}
          id="footer-image-section"
          className="w-full h-[85vh] grid-line-x flex justify-center items-end pb-12 bg-white relative overflow-hidden"
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
            The Future of Virtual Try-On
          </div>
        </section>

        {/* ━━━━━━━━━━ MASSIVE FOOTER TITLE ━━━━━━━━━━ */}
        <section className="w-full border-strong-b flex justify-center items-center py-10 bg-[#caff33] overflow-hidden relative">
          <h1
            ref={footerHugeRef}
            id="footer-huge-text"
            className="font-black tracking-tighter text-transparent whitespace-nowrap leading-[0.8] select-none"
            style={{
              fontSize: 'clamp(2.5rem, 17vw, 16rem)',
              WebkitTextStroke: '3px rgba(17,17,17,0.85)'
            }}
          >
            KIWIKOO
          </h1>
        </section>

        {/* ━━━━━━━━━━ BOTTOM FOOTER ━━━━━━━━━━ */}
        <footer className="grid grid-cols-1 md:grid-cols-2 w-full text-xs font-bold uppercase bg-white">
          {/* Left */}
          <div className="p-8 md:p-12 grid-line-y grid-line-x flex flex-col justify-between gap-10">
            <div className="flex gap-12">
              <div>
                <div className="text-gray-400 mb-4 tracking-widest">COMPANY</div>
                <ul className="space-y-3 text-[#111111]">
                  <li><Link href="/about" className="hover:text-[#ff8a73] transition-colors uppercase">About Us</Link></li>
                  <li><Link href="/register" className="hover:text-[#ff8a73] transition-colors">Join Us</Link></li>
                  <li><Link href="/#marketplace" className="hover:text-[#ff8a73] transition-colors">Marketplace</Link></li>
                </ul>
              </div>
              <div>
                <div className="text-gray-400 mb-4 tracking-widest">LEGAL</div>
                <ul className="space-y-3 text-[#111111]">
                  <li><Link href="/privacy" className="hover:text-[#ff8a73] transition-colors uppercase">Privacy Policy</Link></li>
                  <li><Link href="/terms" className="hover:text-[#ff8a73] transition-colors uppercase">Terms of Use</Link></li>
                </ul>
              </div>
            </div>
            <div className="text-gray-500 tracking-widest">© 2026 KIWIKOO. ALL RIGHTS RESERVED.</div>
          </div>
          {/* Right */}
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
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
            <div className="text-gray-400 tracking-widest">ENGLISH (US)</div>
          </div>
        </footer>

      </div>
    </div>
  )
}
