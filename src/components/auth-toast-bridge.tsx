"use client"

import { useEffect } from "react"
import { toast } from "sonner"

const AUTH_TOAST_KEY = "kiwikoo-auth-toast"

export function setAuthToast(message: "logged_in" | "logged_out" | "admin_logged_in") {
  if (typeof window === "undefined") return
  window.sessionStorage.setItem(AUTH_TOAST_KEY, message)
}

export default function AuthToastBridge() {
  useEffect(() => {
    if (typeof window === "undefined") return

    const pendingToast = window.sessionStorage.getItem(AUTH_TOAST_KEY)
    if (!pendingToast) return

    window.sessionStorage.removeItem(AUTH_TOAST_KEY)

    if (pendingToast === "logged_out") {
      toast.success("Logged out successfully")
      return
    }

    if (pendingToast === "admin_logged_in") {
      toast.success("Admin signed in successfully")
      return
    }

    if (pendingToast === "logged_in") {
      toast.success("Signed in successfully")
    }
  }, [])

  return null
}
