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

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      position="top-center"
      theme={theme as ToasterProps["theme"]}
      className="toaster group !z-[100000]"
      offset={16}
      mobileOffset={16}
      toastOptions={{
        classNames: {
          toast: "border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl backdrop-blur-sm",
          title: "font-bold",
          description: "text-sm",
          success: "bg-[#B4F056] text-black border-black",
          error: "bg-red-100 text-red-800 border-red-400",
          warning: "bg-[#FFD93D] text-black border-black",
          info: "bg-white text-black border-black",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
