"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"

const INTRO_STORAGE_KEY = "kiwikoo-intro-seen"
const INTRO_FALLBACK_MS = 7000

export default function InitialSiteLoader() {
  const [visible, setVisible] = useState(false)
  const hasDismissedRef = useRef(false)
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === "undefined") return
    if (pathname !== "/") return

    const hasSeenIntro = window.sessionStorage.getItem(INTRO_STORAGE_KEY) === "true"
    if (hasSeenIntro) return

    setVisible(true)

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const fallbackTimer = window.setTimeout(() => {
      dismiss()
    }, INTRO_FALLBACK_MS)

    function restoreBody() {
      document.body.style.overflow = originalOverflow
    }

    function dismiss() {
      if (hasDismissedRef.current) return
      hasDismissedRef.current = true
      window.sessionStorage.setItem(INTRO_STORAGE_KEY, "true")
      setVisible(false)
      window.clearTimeout(fallbackTimer)
      restoreBody()
    }

    ;(window as typeof window & { __kiwikooDismissIntro?: () => void }).__kiwikooDismissIntro = dismiss

    return () => {
      window.clearTimeout(fallbackTimer)
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
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[2147483646] overflow-hidden bg-[#F3A20A]"
        >
          <div className="absolute inset-0 bg-[#F3A20A]" />
          <motion.div
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,221,139,0.22),transparent_42%),linear-gradient(180deg,rgba(255,197,84,0.28),transparent_40%,rgba(221,137,0,0.12))]"
            animate={{ opacity: [0.8, 1, 0.85] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 md:p-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="relative aspect-video w-full max-w-[min(94vw,1280px)] overflow-hidden rounded-[24px] border-[4px] border-black bg-[#F3A20A] shadow-[14px_14px_0px_0px_rgba(0,0,0,1)] sm:rounded-[28px]"
            >
              <motion.video
                initial={{ opacity: 0.75, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="h-full w-full object-cover object-center"
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
