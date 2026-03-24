"use client"

import { CircleAlert, CircleCheckBig, Info, TriangleAlert } from "lucide-react"

type ToastVariant = "success" | "error" | "info" | "warning"

export const KIWIKOO_TOAST_EVENT = "kiwikoo:toast"

const variantStyles: Record<
  ToastVariant,
  {
    shell: string
    badge: string
    icon: typeof CircleCheckBig
    label: string
  }
> = {
  success: {
    shell: "bg-[#E8FFB4]",
    badge: "bg-[#B4F056]",
    icon: CircleCheckBig,
    label: "Success",
  },
  error: {
    shell: "bg-[#FFE1D9]",
    badge: "bg-[#FF8C69]",
    icon: CircleAlert,
    label: "Error",
  },
  info: {
    shell: "bg-white",
    badge: "bg-[#D8B4FE]",
    icon: Info,
    label: "Notice",
  },
  warning: {
    shell: "bg-[#FFF1C2]",
    badge: "bg-[#FFD93D]",
    icon: TriangleAlert,
    label: "Warning",
  },
}

export type KiwikooToastDetail = {
  id: string
  title: string
  description?: string
  variant: ToastVariant
  duration: number
}

export function getKiwikooToastStyle(variant: ToastVariant) {
  return variantStyles[variant]
}

function showToast(variant: ToastVariant, title: string, description?: string, duration = 4200) {
  if (typeof window === "undefined") return null

  const detail: KiwikooToastDetail = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    description,
    variant,
    duration,
  }

  window.dispatchEvent(new CustomEvent<KiwikooToastDetail>(KIWIKOO_TOAST_EVENT, { detail }))
  return detail.id
}

export function showSuccessToast(title: string, description?: string) {
  return showToast("success", title, description)
}

export function showErrorToast(title: string, description?: string) {
  return showToast("error", title, description)
}

export function showInfoToast(title: string, description?: string) {
  return showToast("info", title, description)
}

export function showWarningToast(title: string, description?: string) {
  return showToast("warning", title, description)
}
