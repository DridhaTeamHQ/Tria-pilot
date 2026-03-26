"use client"

import { AnimatePresence, motion } from "framer-motion"
import { usePathname } from "next/navigation"
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

const INTRO_FALLBACK_MS = 7000

/** Matches letterboxing and page chrome so the frame stays visually stable (no tint overlays). */
const INTRO_BG = "#111111"

/** Above Sonner (2147483646); must paint on top of all app UI. */
const INTRO_Z = 2147483647

function isHomePath(pathname: string) {
  if (!pathname) return false
  const base = pathname.split("?")[0] ?? ""
  return base === "/" || base === ""
}

export default function InitialSiteLoader() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const hasDismissedRef = useRef(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useLayoutEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    if (!isHomePath(pathname)) {
      delete (window as typeof window & { __kiwikooDismissIntro?: () => void }).__kiwikooDismissIntro
      setVisible(false)
      return
    }

    const hasSeenIntro = sessionStorage.getItem("kiwikoo_intro_seen")
    if (hasSeenIntro) {
      setVisible(false)
      return
    }

    hasDismissedRef.current = false
    const originalOverflow = document.body.style.overflow
    const originalHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"
    setVisible(true)

    function restoreBody() {
      document.body.style.overflow = originalOverflow
      document.documentElement.style.overflow = originalHtmlOverflow
    }

    function dismiss() {
      if (hasDismissedRef.current) return
      hasDismissedRef.current = true
      setVisible(false)
      sessionStorage.setItem("kiwikoo_intro_seen", "true")
      window.clearTimeout(fallbackTimer)
      restoreBody()
    }

    const fallbackTimer = window.setTimeout(() => {
      dismiss()
    }, INTRO_FALLBACK_MS)

      ; (window as typeof window & { __kiwikooDismissIntro?: () => void }).__kiwikooDismissIntro = dismiss

    return () => {
      window.clearTimeout(fallbackTimer)
      restoreBody()
      delete (window as typeof window & { __kiwikooDismissIntro?: () => void }).__kiwikooDismissIntro
    }
  }, [pathname])

  const tryPlay = useCallback(() => {
    const el = videoRef.current
    if (!el) return
    el.muted = true
    el.playsInline = true
    const p = el.play()
    if (p !== undefined) {
      p.catch(() => {
        /* Autoplay blocked — first frame still appears once decoded */
      })
    }
  }, [])

  useEffect(() => {
    if (!visible || !mounted) return
    tryPlay()
  }, [visible, mounted, tryPlay])

  const overlay = (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="kiwikoo-intro"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 0.35,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="kiwikoo-intro-overlay fixed inset-0 z-[2147483647] flex w-full min-w-0 items-center justify-center overflow-hidden"
          style={{ backgroundColor: INTRO_BG, zIndex: INTRO_Z }}
        >
          <div
            className="kiwikoo-intro-frame mx-auto w-full max-w-full shrink-0 bg-[#111111]"
            style={{
              backgroundColor: INTRO_BG,
              transform: "translateZ(0)",
            }}
          >
            <video
              ref={videoRef}
              className="kiwikoo-intro-video absolute inset-0 z-0 box-border h-full w-full object-contain object-center"
              style={{
                backgroundColor: INTRO_BG,
                WebkitBackfaceVisibility: "hidden",
                backfaceVisibility: "hidden",
              }}
              src="/assets/kiwikooanimation.mp4"
              autoPlay
              muted
              playsInline
              preload="auto"
              disablePictureInPicture
              controls={false}
              onLoadedData={tryPlay}
              onCanPlay={tryPlay}
              onEnded={() =>
                (window as typeof window & { __kiwikooDismissIntro?: () => void }).__kiwikooDismissIntro?.()
              }
              onError={() => {
                /* Do not dismiss immediately — a failed load was hiding the whole intro. */
                if (process.env.NODE_ENV === "development") {
                  console.warn("[InitialSiteLoader] intro video failed to load; overlay stays until timeout")
                }
              }}
            />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )

  if (!mounted) return null
  return createPortal(overlay, document.body)
}
