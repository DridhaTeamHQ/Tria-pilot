"use client"

import { AnimatePresence, motion } from "framer-motion"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

const INTRO_FALLBACK_MS = 7000

/** Matches letterboxing and page chrome so the frame stays visually stable (no tint overlays). */
const INTRO_BG = "#111111"

export default function InitialSiteLoader() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const hasDismissedRef = useRef(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    if (pathname !== "/") {
      delete (window as typeof window & { __kiwikooDismissIntro?: () => void }).__kiwikooDismissIntro
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
      window.clearTimeout(fallbackTimer)
      restoreBody()
    }

    const fallbackTimer = window.setTimeout(() => {
      dismiss()
    }, INTRO_FALLBACK_MS)

    ;(window as typeof window & { __kiwikooDismissIntro?: () => void }).__kiwikooDismissIntro = dismiss

    return () => {
      window.clearTimeout(fallbackTimer)
      restoreBody()
      delete (window as typeof window & { __kiwikooDismissIntro?: () => void }).__kiwikooDismissIntro
    }
  }, [pathname])

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
          className="kiwikoo-intro-overlay fixed inset-0 z-[2147483647] flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: INTRO_BG }}
        >
          {/*
            16:9 frame, max size that fits in the viewport (letterbox/pillarbox uses same solid bg).
            object-contain avoids crop; no gradient overlays so colors stay stable during playback.
          */}
          <div
            className="relative aspect-video shrink-0"
            style={{
              width: "min(100vw, calc(100dvh * 16 / 9))",
              backgroundColor: INTRO_BG,
              transform: "translateZ(0)",
            }}
          >
            <video
              className="kiwikoo-intro-video absolute inset-0 z-0 h-full w-full object-contain object-center"
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
              onEnded={() =>
                (window as typeof window & { __kiwikooDismissIntro?: () => void }).__kiwikooDismissIntro?.()
              }
              onError={() =>
                (window as typeof window & { __kiwikooDismissIntro?: () => void }).__kiwikooDismissIntro?.()
              }
            />
          </div>
          <style jsx global>{`
            .kiwikoo-intro-video {
              /* Crisp compositing; avoid extra filters that soften the picture */
              filter: none;
            }
            .kiwikoo-intro-video::-webkit-media-controls {
              display: none !important;
            }
          `}</style>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )

  if (!mounted) return null
  return createPortal(overlay, document.body)
}
