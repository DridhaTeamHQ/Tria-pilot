"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = (props: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <>
      <Sonner
        {...props}
        position="top-center"
        theme={theme as ToasterProps["theme"]}
        richColors
        closeButton
        expand={false}
        visibleToasts={4}
        duration={5000}
        className="toaster group"
        offset={24}
        mobileOffset={24}
        toastOptions={{
          duration: 5000,
          ...props.toastOptions,
          classNames: {
            toast:
              "!opacity-100 !visible rounded-[20px] border-[3px] border-black bg-white px-4 py-3 font-sans shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] min-w-[320px] sm:min-w-[360px]",
            title: "font-black uppercase tracking-[0.16em] text-[11px] text-black",
            description: "mt-1 text-sm font-bold leading-relaxed text-black/75",
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
          [data-sonner-toaster] {
            position: fixed !important;
            top: 0 !important;
            bottom: auto !important;
            left: 50% !important;
            right: auto !important;
            transform: translateX(-50%) !important;
            padding-top: max(1.5rem, env(safe-area-inset-top)) !important;
            z-index: 2147483647 !important;
            pointer-events: none !important;
            width: var(--width, 420px) !important;
            max-width: calc(100vw - 1.5rem) !important;
          }
          [data-sonner-toaster] [data-sonner-toast] {
            pointer-events: auto !important;
            top: 0 !important;
            bottom: auto !important;
            --y: translateY(0) !important;
            opacity: 1 !important;
            visibility: visible !important;
          }
          @media (max-width: 640px) {
            [data-sonner-toaster] {
              left: 0.75rem !important;
              right: 0.75rem !important;
              transform: none !important;
              width: auto !important;
              max-width: none !important;
              padding-top: max(1rem, env(safe-area-inset-top)) !important;
            }
            [data-sonner-toaster] [data-sonner-toast] {
              width: 100% !important;
            }
          }
        `,
      }} />
    </>
  )
}

export { Toaster }
