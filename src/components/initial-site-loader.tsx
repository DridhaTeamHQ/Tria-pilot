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
  const videoRef = useRef<HTMLVideoElement | null>(null)
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

  useEffect(() => {
    if (!visible || pathname !== "/") return

    const video = videoRef.current
    if (!video) return

    let cancelled = false

    const startPlayback = async () => {
      try {
        video.pause()
        video.currentTime = 0
        video.load()

        const maybePromise = video.play()
        if (maybePromise && typeof maybePromise.then === "function") {
          await maybePromise
        }

        if (!cancelled) {
          setVideoReady(true)
          setVideoError(false)
        }
      } catch {
        if (!cancelled) {
          setVideoError(true)
          setVideoReady(false)
        }
      }
    }

    const frame = window.requestAnimationFrame(() => {
      void startPlayback()
    })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
    }
  }, [pathname, visible])

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

          <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 md:p-8">
            <div className="relative flex aspect-video w-full max-w-[min(92vw,1180px)] max-h-[68vh] items-center justify-center overflow-hidden">
              {!videoError ? (
                <motion.video
                  ref={videoRef}
                  initial={{ opacity: 0, scale: 0.985 }}
                  animate={{ opacity: videoReady ? 1 : 0, scale: videoReady ? 1 : 0.985 }}
                  transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                  className="relative z-10 h-full w-full object-cover object-center"
                  src="/assets/kiwikooanimation.mp4"
                  autoPlay
                  muted
                  playsInline
                  preload="auto"
                  onLoadedMetadata={() => {
                    setVideoReady(true)
                    setVideoError(false)
                  }}
                  onLoadedData={() => {
                    setVideoReady(true)
                    setVideoError(false)
                  }}
                  onCanPlay={() => {
                    setVideoReady(true)
                    setVideoError(false)
                  }}
                  onPlay={() => {
                    setVideoReady(true)
                    setVideoError(false)
                  }}
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
