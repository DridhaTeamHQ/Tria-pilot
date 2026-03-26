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

const TOASTER_Z = 2147483646
const DEFAULT_TOAST_DURATION_MS = 3000

const Toaster = (props: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      {...props}
      dir="ltr"
      theme={theme as ToasterProps["theme"]}
      richColors
      closeButton
      expand={false}
      visibleToasts={4}
      duration={DEFAULT_TOAST_DURATION_MS}
      position="top-right"
      offset={{ top: 20, right: 16 }}
      mobileOffset={{ top: 16, right: 12 }}
      gap={10}
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
          zIndex: TOASTER_Z,
        } as React.CSSProperties
      }
      toastOptions={{
        duration: DEFAULT_TOAST_DURATION_MS,
        ...props.toastOptions,
        classNames: {
          toast:
            "rounded-[18px] border-[3px] border-black bg-white px-4 py-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] w-[min(320px,calc(100vw-1.5rem))] pointer-events-auto",
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
    />
  )
}

export { Toaster }
