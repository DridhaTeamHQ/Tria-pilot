"use client"

import { toast } from "sonner"

const DEFAULT_KIWIKOO_TOAST_MS = 3000

function showToast(
  variant: "success" | "error" | "info" | "warning",
  title: string,
  description?: string,
  duration = DEFAULT_KIWIKOO_TOAST_MS
) {
  return toast[variant](title, {
    description,
    duration,
    position: "top-right",
  })
}

export function showSuccessToast(title: string, description?: string, duration?: number) {
  return showToast("success", title, description, duration)
}

export function showErrorToast(title: string, description?: string, duration?: number) {
  return showToast("error", title, description, duration)
}

export function showInfoToast(title: string, description?: string, duration?: number) {
  return showToast("info", title, description, duration)
}

export function showWarningToast(title: string, description?: string, duration?: number) {
  return showToast("warning", title, description, duration)
}
