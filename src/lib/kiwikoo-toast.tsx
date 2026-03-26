"use client"

import { CircleAlert, CircleCheckBig, Info, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

type ToastVariant = "success" | "error" | "info" | "warning"

const DEFAULT_KIWIKOO_TOAST_MS = 8000

function showToast(variant: ToastVariant, title: string, description?: string, duration = DEFAULT_KIWIKOO_TOAST_MS) {
  const shared = {
    description,
    duration,
  }

  if (variant === "success") {
    return toast.success(title, {
      ...shared,
      icon: <CircleCheckBig className="size-4 text-black" strokeWidth={2.8} />,
    })
  }

  if (variant === "error") {
    return toast.error(title, {
      ...shared,
      icon: <CircleAlert className="size-4 text-black" strokeWidth={2.8} />,
    })
  }

  if (variant === "warning") {
    return toast.warning(title, {
      ...shared,
      icon: <TriangleAlert className="size-4 text-black" strokeWidth={2.8} />,
    })
  }

  return toast.info(title, {
    ...shared,
    icon: <Info className="size-4 text-black" strokeWidth={2.8} />,
  })
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
