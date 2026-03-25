"use client"

import { AnimatePresence, motion } from "framer-motion"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"

const INTRO_DURATION_MS = 5000

export default function InitialSiteLoader() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const dismissRequestedRef = useRef(false)
  const dismissTimerRef = useRef<number | null>(null)
  const fallbackTimerRef = useRef<number | null>(null)
  const startedAtRef = useRef(0)
  const originalOverflowRef = useRef<string | null>(null)
  const originalHtmlOverflowRef = useRef<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    function clearTimers() {
      if (dismissTimerRef.current) {
        window.clearTimeout(dismissTimerRef.current)
        dismissTimerRef.current = null
      }
      if (fallbackTimerRef.current) {
        window.clearTimeout(fallbackTimerRef.current)
        fallbackTimerRef.current = null
      }
    }

    function restoreBody() {
      if (originalOverflowRef.current !== null) {
        document.body.style.overflow = originalOverflowRef.current
        originalOverflowRef.current = null
      }
      if (originalHtmlOverflowRef.current !== null) {
        document.documentElement.style.overflow = originalHtmlOverflowRef.current
        originalHtmlOverflowRef.current = null
      }
    }

    function finishDismiss() {
      clearTimers()
      restoreBody()
      setVisible(false)
      dismissRequestedRef.current = false
    }

    function requestDismiss() {
      if (dismissRequestedRef.current) return
      dismissRequestedRef.current = true

      const elapsed = Date.now() - startedAtRef.current
      const remaining = Math.max(0, INTRO_DURATION_MS - elapsed)

      dismissTimerRef.current = window.setTimeout(() => {
        finishDismiss()
      }, remaining)
    }

    if (pathname !== "/") {
      finishDismiss()
      delete (window as typeof window & { __kiwikooDismissIntro?: () => void }).__kiwikooDismissIntro
      return
    }

    clearTimers()
    dismissRequestedRef.current = false
    startedAtRef.current = Date.now()
    setVideoReady(false)
    setVideoError(false)
    originalOverflowRef.current = document.body.style.overflow
    originalHtmlOverflowRef.current = document.documentElement.style.overflow
    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"
    setVisible(true)

    fallbackTimerRef.current = window.setTimeout(() => {
      requestDismiss()
    }, INTRO_DURATION_MS)

    ;(window as typeof window & { __kiwikooDismissIntro?: () => void }).__kiwikooDismissIntro = requestDismiss

    return () => {
      clearTimers()
      restoreBody()
      delete (window as typeof window & { __kiwikooDismissIntro?: () => void }).__kiwikooDismissIntro
    }
  }, [pathname])

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[2147483646] h-dvh overflow-hidden overscroll-none bg-[#f6a313] touch-none"
        >
          <div className="absolute inset-0 bg-[#f6a313]" />

          <div className="absolute inset-0 flex items-center justify-center p-6 sm:p-8 md:p-10">
            <div className="relative flex aspect-video w-full max-w-[min(84vw,960px)] max-h-[52vh] items-center justify-center overflow-hidden">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: videoReady ? 0 : 1, scale: videoReady ? 0.985 : 1 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 flex flex-col items-center justify-center"
              >
                <motion.h1
                  animate={{
                    scale: [0.985, 1.02, 0.99],
                    opacity: [0.92, 1, 0.94],
                  }}
                  transition={{
                    duration: 1.9,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="text-center font-black uppercase tracking-[0.04em] text-black"
                  style={{
                    fontFamily: 'var(--font-bungee), "Arial Black", Impact, sans-serif',
                    fontSize: "clamp(1.9rem, 5.2vw, 4.5rem)",
                    lineHeight: 0.92,
                  }}
                >
                  KIWIKOO
                </motion.h1>
              </motion.div>

              {!videoError ? (
                <motion.video
                  initial={{ opacity: 0, scale: 0.985 }}
                  animate={{ opacity: videoReady ? 1 : 0, scale: videoReady ? 1 : 0.985 }}
                  transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                  className="relative z-10 h-full w-full object-cover object-center"
                  src="/assets/kiwikooanimation.mp4"
                  autoPlay
                  muted
                  playsInline
                  preload="auto"
                  onLoadedData={() => setVideoReady(true)}
                  onCanPlay={() => setVideoReady(true)}
                  onEnded={() =>
                    (window as typeof window & { __kiwikooDismissIntro?: () => void }).__kiwikooDismissIntro?.()
                  }
                  onError={() => {
                    setVideoError(true)
                    setVideoReady(false)
                  }}
                />
              ) : null}
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0 ring-1 ring-black/10" />
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
