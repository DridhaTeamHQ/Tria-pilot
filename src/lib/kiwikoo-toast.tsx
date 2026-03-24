"use client"

import { CircleAlert, CircleCheckBig, Info, TriangleAlert, X } from "lucide-react"
import { toast } from "sonner"

type ToastVariant = "success" | "error" | "info" | "warning"

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

function showToast(variant: ToastVariant, title: string, description?: string) {
  const style = variantStyles[variant]

  return toast.custom(
    (id) => {
      const Icon = style.icon

      return (
        <div
          className={`pointer-events-auto w-[min(460px,calc(100vw-2rem))] rounded-[22px] border-[3px] border-black ${style.shell} shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`}
        >
          <div className="flex items-start gap-3 p-4">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-[3px] border-black ${style.badge} shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]`}
            >
              <Icon className="h-5 w-5 text-black" strokeWidth={2.8} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black/65">{style.label}</p>
              <p className="mt-1 text-base font-black leading-tight text-black">{title}</p>
              {description ? (
                <p className="mt-1.5 text-sm font-bold leading-relaxed text-black/75">{description}</p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => toast.dismiss(id)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-[2px] border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4 text-black" strokeWidth={2.8} />
            </button>
          </div>
        </div>
      )
    },
    {
      duration: 4200,
    }
  )
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
