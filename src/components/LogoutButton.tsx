'use client'

import { LogOut } from 'lucide-react'

type LogoutButtonProps = {
  onClick: () => void
  disabled?: boolean
  className?: string
  title?: string
  dataCursor?: string
  fullWidth?: boolean
  expandOnHover?: boolean
}

export default function LogoutButton({
  onClick,
  disabled = false,
  className = '',
  title = 'Logout',
  dataCursor,
  fullWidth = false,
  expandOnHover = true,
}: LogoutButtonProps) {
  if (fullWidth) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title}
        data-cursor={dataCursor}
        className={[
          'flex w-full items-center justify-center gap-3 rounded-xl border-2 border-black',
          disabled ? 'bg-[#FF9B8F]/50 text-white/70 cursor-not-allowed' : 'bg-[#FF9B8F] text-white hover:bg-[#FF8A7D]',
          'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all',
          !disabled && 'hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
          !disabled && 'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
          className,
        ].filter(Boolean).join(' ')}
      >
        <LogOut className="h-5 w-5 shrink-0" />
        <span>Logout</span>
      </button>
    )
  }

  if (!expandOnHover) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title}
        data-cursor={dataCursor}
        className={[
          'inline-flex h-[45px] items-center justify-center gap-2 rounded-full border-2 border-black',
          disabled ? 'bg-[#FF9B8F]/50 text-white/70 cursor-not-allowed' : 'bg-[#FF9B8F] text-white hover:bg-[#FF8A7D]',
          'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all duration-200',
          !disabled && 'hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
          !disabled && 'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
          className,
        ].filter(Boolean).join(' ')}
      >
        <LogOut className="h-[17px] w-[17px] shrink-0" />
        <span className="whitespace-nowrap text-sm font-bold">Logout</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      data-cursor={dataCursor}
      className={[
        'group relative flex h-[45px] items-center justify-start overflow-hidden border-2 border-black',
        disabled 
          ? 'w-[125px] rounded-[999px] bg-[#FF9B8F]/50 text-white/70 cursor-not-allowed' 
          : 'w-[45px] rounded-full bg-[#FF9B8F] text-white hover:w-[125px] hover:rounded-[999px] hover:bg-[#FF8A7D]',
        'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all duration-300',
        !disabled && 'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
        className,
      ].filter(Boolean).join(' ')}
    >
      <span 
        className={[
          'flex shrink-0 items-center justify-center transition-all duration-300',
          disabled ? 'w-[30%] pl-5' : 'w-full group-hover:w-[30%] group-hover:pl-5'
        ].join(' ')}
      >
        <LogOut className="h-[17px] w-[17px]" />
      </span>
      <span 
        className={[
          'absolute right-0 overflow-hidden whitespace-nowrap text-base font-bold transition-all duration-300',
          disabled ? 'w-[70%] pr-3 opacity-100' : 'w-0 pr-0 opacity-0 group-hover:w-[70%] group-hover:pr-3 group-hover:opacity-100'
        ].join(' ')}
      >
        Logout
      </span>
    </button>
  )
}
