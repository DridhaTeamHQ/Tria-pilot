"use client"

import { AnimatePresence, motion } from "framer-motion"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"

const INTRO_MIN_VISIBLE_MS = 2400
const INTRO_FALLBACK_MS = 7000

export default function InitialSiteLoader() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const dismissRequestedRef = useRef(false)
  const dismissTimerRef = useRef<number | null>(null)
  const fallbackTimerRef = useRef<number | null>(null)
  const startedAtRef = useRef(0)
  const originalOverflowRef = useRef<string | null>(null)

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
      const remaining = Math.max(0, INTRO_MIN_VISIBLE_MS - elapsed)

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
    originalOverflowRef.current = document.body.style.overflow
    document.body.style.overflow = "hidden"
    setVisible(true)

    fallbackTimerRef.current = window.setTimeout(() => {
      requestDismiss()
    }, INTRO_FALLBACK_MS)

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
          className="fixed inset-0 z-[2147483646] overflow-hidden bg-[#ff8a73]"
        >
          <div className="absolute inset-0 bg-[#ff8a73]" />

          <motion.div
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,228,221,0.3),transparent_44%),linear-gradient(180deg,rgba(255,171,147,0.28),transparent_40%,rgba(215,103,84,0.16))]"
            animate={{ opacity: [0.82, 1, 0.88] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="absolute inset-0 flex items-center justify-center p-6 sm:p-8 md:p-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="relative aspect-video w-full max-w-[min(92vw,1100px)] overflow-hidden rounded-[24px] border-[4px] border-black bg-[#ff8a73] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
            >
              <motion.video
                initial={{ opacity: 0.82, scale: 1.01 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                className="h-full w-full object-contain object-center"
                src="/assets/kiwikooanimation.mp4"
                autoPlay
                muted
                playsInline
                preload="auto"
                onEnded={() =>
                  (window as typeof window & { __kiwikooDismissIntro?: () => void }).__kiwikooDismissIntro?.()
                }
                onError={() =>
                  (window as typeof window & { __kiwikooDismissIntro?: () => void }).__kiwikooDismissIntro?.()
                }
              />
            </motion.div>
          </div>

          <div className="pointer-events-none absolute inset-0 ring-1 ring-black/10" />
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
