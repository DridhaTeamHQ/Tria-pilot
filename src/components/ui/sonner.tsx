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
        duration={4200}
        className="toaster group !z-[100000]"
        offset={20}
        mobileOffset={20}
        toastOptions={{
          duration: 4200,
          ...props.toastOptions,
          classNames: {
            toast: "border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl backdrop-blur-sm font-sans px-4 py-3",
            title: "font-bold text-sm",
            description: "text-xs text-black/70",
            success: "bg-[#B4F056] text-black border-black",
            error: "bg-red-100 text-red-800 border-red-400",
            warning: "bg-[#FFD93D] text-black border-black",
            info: "bg-white text-black border-black",
            actionButton: "bg-black text-white border-2 border-black rounded-md",
            cancelButton: "bg-white text-black border-2 border-black rounded-md",
            closeButton: "border-2 border-black bg-white text-black",
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
            padding-top: 1.25rem !important;
            z-index: 2147483647 !important;
          }
          [data-sonner-toaster] [data-sonner-toast] {
            top: 0 !important;
            bottom: auto !important;
            --y: translateY(0) !important;
          }
          @media (max-width: 640px) {
            [data-sonner-toaster] {
              left: 0.5rem !important;
              right: 0.5rem !important;
              transform: none !important;
              width: auto !important;
              max-width: none !important;
              padding-top: calc(env(safe-area-inset-top, 0px) + 0.5rem) !important;
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
