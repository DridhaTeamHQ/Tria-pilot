"use client"

import { usePathname } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"

const INTRO_TIMER_MS = 5000
const INTRO_Z = 2147483647
const INTRO_BG = "#111111"

export default function InitialSiteLoader() {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const dismissedRef = useRef(false)

  const shouldShow = useMemo(() => {
    if (!pathname) return false
    const base = pathname.split("?")[0] ?? ""
    return base === "/" || base === ""
  }, [pathname])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (!shouldShow) {
      setVisible(false)
      return
    }

    dismissedRef.current = false
    setVisible(true)

    const originalBodyOverflow = document.body.style.overflow
    const originalHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"

    const dismiss = () => {
      if (dismissedRef.current) return
      dismissedRef.current = true
      setVisible(false)
      document.body.style.overflow = originalBodyOverflow
      document.documentElement.style.overflow = originalHtmlOverflow
    }

    const timer = window.setTimeout(dismiss, INTRO_TIMER_MS)
    ;(window as typeof window & { __kiwikooDismissIntro?: () => void }).__kiwikooDismissIntro = dismiss

    return () => {
      window.clearTimeout(timer)
      delete (window as typeof window & { __kiwikooDismissIntro?: () => void }).__kiwikooDismissIntro
      document.body.style.overflow = originalBodyOverflow
      document.documentElement.style.overflow = originalHtmlOverflow
    }
  }, [mounted, shouldShow])

  if (!mounted || !visible) return null

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center overflow-hidden"
      style={{ zIndex: INTRO_Z, backgroundColor: INTRO_BG }}
      aria-hidden="true"
    >
      <video
        className="h-full w-full object-cover"
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
    </div>,
    document.body
  )
}

