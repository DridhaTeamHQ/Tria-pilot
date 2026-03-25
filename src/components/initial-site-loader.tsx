"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useRef, useState } from "react"

const INTRO_STORAGE_KEY = "kiwikoo-intro-seen"
const INTRO_FALLBACK_MS = 7000

export default function InitialSiteLoader() {
  const [visible, setVisible] = useState(false)
  const hasDismissedRef = useRef(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    const hasSeenIntro = window.sessionStorage.getItem(INTRO_STORAGE_KEY) === "true"

    if (hasSeenIntro) {
      return
    }

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
  }, [])

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-[#111111]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(202,255,51,0.12),transparent_42%),radial-gradient(circle_at_top,rgba(255,138,115,0.16),transparent_28%)]" />

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex w-full max-w-[860px] items-center justify-center px-4 sm:px-6"
          >
            <video
              className="w-full max-h-[78vh] object-contain"
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
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
