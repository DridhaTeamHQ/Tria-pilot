"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useRef, useState } from "react"

const INTRO_FALLBACK_MS = 7000

export default function InitialSiteLoader() {
  const [visible, setVisible] = useState(false)
  const hasDismissedRef = useRef(false)

  useEffect(() => {
    if (typeof window === "undefined") return

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
          className="fixed inset-0 z-[2147483646] overflow-hidden bg-[#111111]"
        >
          <video
            className="absolute inset-0 h-full w-full object-cover object-center"
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

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.06),transparent_38%),linear-gradient(to_bottom,rgba(0,0,0,0.08),rgba(0,0,0,0.1))]" />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute inset-0 ring-1 ring-white/8"
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
