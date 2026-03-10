'use client'

import { LogOut } from 'lucide-react'

type LogoutButtonProps = {
  onClick: () => void
  disabled?: boolean
  className?: string
  title?: string
  dataCursor?: string
  fullWidth?: boolean
}

export default function LogoutButton({
  onClick,
  disabled = false,
  className = '',
  title = 'Logout',
  dataCursor,
  fullWidth = false,
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
          'bg-[#FF6B57] px-4 py-3 text-sm font-black uppercase tracking-wide text-white',
          'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all',
          'hover:bg-[#FF5A45] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
          'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
          'disabled:cursor-not-allowed disabled:opacity-60',
          className,
        ].join(' ')}
      >
        <LogOut className="h-5 w-5 shrink-0" />
        <span>Logout</span>
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
        'group relative flex h-[45px] w-[45px] items-center justify-start overflow-hidden rounded-full border-2 border-black',
        'bg-[#FF6B57] text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all duration-300',
        'hover:w-[125px] hover:rounded-[999px] hover:bg-[#FF5A45]',
        'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      ].join(' ')}
    >
      <span className="flex w-full shrink-0 items-center justify-center transition-all duration-300 group-hover:w-[30%] group-hover:pl-5">
        <LogOut className="h-[17px] w-[17px]" />
      </span>
      <span className="absolute right-0 w-0 overflow-hidden whitespace-nowrap pr-0 text-base font-bold opacity-0 transition-all duration-300 group-hover:w-[70%] group-hover:pr-3 group-hover:opacity-100">
        Logout
      </span>
    </button>
  )
}
