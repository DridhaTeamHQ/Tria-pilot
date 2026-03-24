"use client"

import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  getKiwikooToastStyle,
  KIWIKOO_TOAST_EVENT,
  type KiwikooToastDetail,
} from "@/lib/kiwikoo-toast"

type ActiveToast = KiwikooToastDetail

export default function KiwikooToastViewport() {
  const [toasts, setToasts] = useState<ActiveToast[]>([])
  const timersRef = useRef<Map<string, number>>(new Map())

  const dismiss = (id: string) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      window.clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }

  useEffect(() => {
    const onToast = (event: Event) => {
      const customEvent = event as CustomEvent<KiwikooToastDetail>
      const detail = customEvent.detail
      if (!detail?.id) return

      setToasts((current) => [...current.filter((toast) => toast.id !== detail.id), detail].slice(-4))

      const existingTimer = timersRef.current.get(detail.id)
      if (existingTimer) window.clearTimeout(existingTimer)

      const timer = window.setTimeout(() => dismiss(detail.id), detail.duration)
      timersRef.current.set(detail.id, timer)
    }

    window.addEventListener(KIWIKOO_TOAST_EVENT, onToast as EventListener)
    return () => {
      window.removeEventListener(KIWIKOO_TOAST_EVENT, onToast as EventListener)
      timersRef.current.forEach((timer) => window.clearTimeout(timer))
      timersRef.current.clear()
    }
  }, [])

  const renderedToasts = useMemo(() => toasts, [toasts])

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[2147483647] flex justify-center px-4 pt-4 sm:px-6 sm:pt-6">
      <div className="flex w-full max-w-[460px] flex-col gap-3">
        <AnimatePresence initial={false}>
          {renderedToasts.map((toast) => {
            const style = getKiwikooToastStyle(toast.variant)
            const Icon = style.icon

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.96 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className={`pointer-events-auto rounded-[22px] border-[3px] border-black ${style.shell} shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`}
              >
                <div className="flex items-start gap-3 p-4">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-[3px] border-black ${style.badge} shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]`}
                  >
                    <Icon className="h-5 w-5 text-black" strokeWidth={2.8} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black/65">{style.label}</p>
                    <p className="mt-1 text-base font-black leading-tight text-black">{toast.title}</p>
                    {toast.description ? (
                      <p className="mt-1.5 text-sm font-bold leading-relaxed text-black/75">{toast.description}</p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => dismiss(toast.id)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-[2px] border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                    aria-label="Dismiss notification"
                  >
                    <X className="h-4 w-4 text-black" strokeWidth={2.8} />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
