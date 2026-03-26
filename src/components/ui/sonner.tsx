"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/** Below intro overlay (2147483647), above any in-app chrome (z-50, modals ~100). */
const TOASTER_Z = 2147483646

/** Default time on screen (ms); users can still dismiss with the close button. */
const DEFAULT_TOAST_DURATION_MS = 2000

const Toaster = (props: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const content = (
    <>
      <Sonner
        {...props}
        position="top-right"
        dir="ltr"
        theme={theme as ToasterProps["theme"]}
        richColors
        closeButton
        expand={false}
        visibleToasts={4}
        duration={DEFAULT_TOAST_DURATION_MS}
        className="toaster group"
        offset={{ top: 20, right: 12 }}
        mobileOffset={{ top: 16, right: 10 }}
        gap={10}
        toastOptions={{
          duration: DEFAULT_TOAST_DURATION_MS,
          ...props.toastOptions,
          classNames: {
            toast:
              "!opacity-100 !visible rounded-[18px] border-[3px] border-black bg-white px-4 py-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] w-[min(320px,calc(100vw-1.5rem))] pointer-events-auto",
            title: "text-[12px] font-black uppercase tracking-[0.14em] text-black",
            description: "mt-1 text-[13px] font-semibold leading-relaxed text-black/75",
            success: "!bg-[#E8FFB4] !text-black border-black",
            error: "!bg-[#FFE1D9] !text-black border-black",
            warning: "!bg-[#FFF1C2] !text-black border-black",
            info: "!bg-white !text-black border-black",
            icon: "mt-0.5",
            content: "gap-0",
            actionButton:
              "rounded-xl border-[2px] border-black bg-black px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
            cancelButton:
              "rounded-xl border-[2px] border-black bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
            closeButton:
              "border-[2px] border-black bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
            ...props.toastOptions?.classNames,
          },
        }}
        icons={{
          success: <CircleCheckIcon className="size-4" />,
          info: <InfoIcon className="size-4" />,
          warning: <TriangleAlertIcon className="size-4" />,
          error: <OctagonXIcon className="size-4" />,
          loading: <Loader2Icon className="size-4 animate-spin" />,
          ...props.icons,
        }}
        style={
          {
            "--normal-bg": "var(--popover)",
            "--normal-text": "var(--popover-foreground)",
            "--normal-border": "var(--border)",
            "--border-radius": "var(--radius)",
          } as React.CSSProperties
        }
      />
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Sonner defaults to bottom-right if internal attrs differ; force top-right on all toasters */
          [data-sonner-toaster] {
            z-index: ${TOASTER_Z} !important;
            position: fixed !important;
            inset: auto !important;
            top: max(20px, env(safe-area-inset-top, 0px)) !important;
            right: max(12px, env(safe-area-inset-right, 0px)) !important;
            bottom: auto !important;
            left: auto !important;
            width: auto !important;
            max-width: min(320px, calc(100vw - 1.5rem)) !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-end !important;
            justify-content: flex-start !important;
            pointer-events: none !important;
          }
          @media (max-width: 640px) {
            [data-sonner-toaster] {
              top: max(16px, env(safe-area-inset-top, 0px)) !important;
              right: max(10px, env(safe-area-inset-right, 0px)) !important;
            }
          }
          [data-sonner-toaster] [data-sonner-toast] {
            pointer-events: auto !important;
          }
          [data-sonner-toaster] [data-sonner-toast] {
            font-family: Inter, "Segoe UI", Arial, sans-serif !important;
          }
          [data-sonner-toaster] [data-sonner-toast] * {
            font-family: Inter, "Segoe UI", Arial, sans-serif !important;
          }
        `,
      }} />
    </>
  )

  if (!mounted || typeof document === "undefined") return null
  return createPortal(content, document.body)
}

export { Toaster }
