"use client"

import { AnimatePresence, motion } from "framer-motion"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"

const INTRO_DURATION_MS = 5000

export default function InitialSiteLoader() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [instanceKey, setInstanceKey] = useState(0)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const dismissRequestedRef = useRef(false)
  const dismissTimerRef = useRef<number | null>(null)
  const fallbackTimerRef = useRef<number | null>(null)
  const startedAtRef = useRef(0)
  const originalOverflowRef = useRef<string | null>(null)
  const originalPaddingRightRef = useRef<string | null>(null)

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
      if (originalPaddingRightRef.current !== null) {
        document.body.style.paddingRight = originalPaddingRightRef.current
        originalPaddingRightRef.current = null
      }
    }

    function finishDismiss() {
      clearTimers()
      restoreBody()
      setVisible(false)
      dismissRequestedRef.current = false
      try {
        sessionStorage.setItem('__kiwikooHasSeenIntro', 'true')
      } catch (e) { }
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

    let hasSeenIntro = false
    try {
      hasSeenIntro = sessionStorage.getItem('__kiwikooHasSeenIntro') === 'true'
    } catch (e) { }

    if (pathname !== "/" || hasSeenIntro) {
      finishDismiss()
      delete (window as typeof window & { __kiwikooDismissIntro?: () => void }).__kiwikooDismissIntro
      return
    }

    clearTimers()
    dismissRequestedRef.current = false
    startedAtRef.current = Date.now()
    setInstanceKey((value) => value + 1)

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    if (document.body.style.overflow !== "hidden") {
      originalOverflowRef.current = document.body.style.overflow
      originalPaddingRightRef.current = document.body.style.paddingRight

      document.body.style.overflow = "hidden"
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    setVisible(true)

    fallbackTimerRef.current = window.setTimeout(() => {
      requestDismiss()
    }, INTRO_DURATION_MS)

      ; (window as typeof window & { __kiwikooDismissIntro?: () => void }).__kiwikooDismissIntro = requestDismiss

    return () => {
      clearTimers()
      restoreBody()
      delete (window as typeof window & { __kiwikooDismissIntro?: () => void }).__kiwikooDismissIntro
    }
  }, [pathname])

  useEffect(() => {
    if (!visible || pathname !== "/") return

    const video = videoRef.current
    if (!video) return

    let cancelled = false
    const frame = window.requestAnimationFrame(() => {
      video.currentTime = 0
      const maybePromise = video.play()
      if (maybePromise && typeof maybePromise.catch === "function") {
        maybePromise.catch(() => { })
      }
    })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
    }
  }, [instanceKey, pathname, visible])

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[2147483646] h-screen w-screen overflow-hidden overscroll-none bg-[#f6a313] touch-none"
        >
          <div className="absolute inset-0 bg-[#f6a313]" />

          <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 md:p-8">
            <div
              className="relative flex items-center justify-center overflow-hidden rounded-[2px]"
              style={{
                width: "min(100vw, 177.78vh)",
                height: "min(56.25vw, 100vh)",
                aspectRatio: "16 / 9",
              }}
            >
              <video
                ref={videoRef}
                key={`${pathname}-${instanceKey}`}
                className="relative z-10 block h-full w-full object-cover object-center"
                autoPlay
                muted
                playsInline
                preload="auto"
                src="/assets/kiwikooanimation.mp4"
                onEnded={() =>
                  (window as typeof window & { __kiwikooDismissIntro?: () => void }).__kiwikooDismissIntro?.()
                }
              />
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0 ring-1 ring-black/10" />
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
