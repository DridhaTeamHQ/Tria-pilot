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
  const originalHtmlOverflowRef = useRef<string | null>(null)
  const originalBodyPositionRef = useRef<string | null>(null)
  const originalBodyTopRef = useRef<string | null>(null)
  const originalBodyWidthRef = useRef<string | null>(null)
  const originalBodyTouchActionRef = useRef<string | null>(null)
  const originalHtmlOverscrollRef = useRef<string | null>(null)
  const lockedScrollYRef = useRef(0)

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
      if (originalBodyPositionRef.current !== null) {
        document.body.style.position = originalBodyPositionRef.current
        originalBodyPositionRef.current = null
      }
      if (originalBodyTopRef.current !== null) {
        document.body.style.top = originalBodyTopRef.current
        originalBodyTopRef.current = null
      }
      if (originalBodyWidthRef.current !== null) {
        document.body.style.width = originalBodyWidthRef.current
        originalBodyWidthRef.current = null
      }
      if (originalBodyTouchActionRef.current !== null) {
        document.body.style.touchAction = originalBodyTouchActionRef.current
        originalBodyTouchActionRef.current = null
      }
      if (originalHtmlOverscrollRef.current !== null) {
        document.documentElement.style.overscrollBehavior = originalHtmlOverscrollRef.current
        originalHtmlOverscrollRef.current = null
      }
      if (lockedScrollYRef.current) {
        window.scrollTo(0, lockedScrollYRef.current)
        lockedScrollYRef.current = 0
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
    setInstanceKey((value) => value + 1)
    lockedScrollYRef.current = window.scrollY
    originalOverflowRef.current = document.body.style.overflow
    originalHtmlOverflowRef.current = document.documentElement.style.overflow
    originalBodyPositionRef.current = document.body.style.position
    originalBodyTopRef.current = document.body.style.top
    originalBodyWidthRef.current = document.body.style.width
    originalBodyTouchActionRef.current = document.body.style.touchAction
    originalHtmlOverscrollRef.current = document.documentElement.style.overscrollBehavior

    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"
    document.body.style.position = "fixed"
    document.body.style.top = `-${lockedScrollYRef.current}px`
    document.body.style.width = "100%"
    document.body.style.touchAction = "none"
    document.documentElement.style.overscrollBehavior = "none"

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

    const frame = window.requestAnimationFrame(() => {
      video.currentTime = 0
      const maybePromise = video.play()
      if (maybePromise && typeof maybePromise.catch === "function") {
        maybePromise.catch(() => {})
      }
    })

    return () => {
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

          <video
            ref={videoRef}
            key={`${pathname}-${instanceKey}`}
            className="absolute inset-0 z-10 block h-full w-full object-cover object-center"
            autoPlay
            muted
            playsInline
            preload="auto"
            poster=""
            onLoadedData={() => {
              const video = videoRef.current
              if (!video) return
              const maybePromise = video.play()
              if (maybePromise && typeof maybePromise.catch === "function") {
                maybePromise.catch(() => {})
              }
            }}
            onEnded={() =>
              (window as typeof window & { __kiwikooDismissIntro?: () => void }).__kiwikooDismissIntro?.()
            }
          >
            <source src="/assets/kiwikooanimation.mp4?v=3" type="video/mp4" />
          </video>

          <div className="pointer-events-none absolute inset-0 ring-1 ring-black/10" />
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
