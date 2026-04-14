'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

type AuthModeToggleProps = {
  mode: 'login' | 'signup'
  loginHref: string
  signupHref: string
  accentColor: string
  className?: string
}

export function AuthModeToggle({
  mode,
  loginHref,
  signupHref,
  accentColor,
  className,
}: AuthModeToggleProps) {
  return (
    <div
      className={cn(
        'rounded-full border-[4px] border-black bg-[#F4F4F0] p-2 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]',
        className
      )}
    >
      <div className="grid grid-cols-2 gap-2">
        <AuthModeLink href={loginHref} label="Login" isActive={mode === 'login'} fillColor="#FFFFFF" />
        <AuthModeLink href={signupHref} label="Sign Up" isActive={mode === 'signup'} fillColor={accentColor} />
      </div>
    </div>
  )
}

type AuthModeLinkProps = {
  href: string
  label: string
  isActive: boolean
  fillColor: string
}

function AuthModeLink({ href, label, isActive, fillColor }: AuthModeLinkProps) {
  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex min-h-[68px] items-center justify-center rounded-full border-[3px] px-6 py-4 text-center text-lg font-black uppercase tracking-[0.2em] text-black transition-all duration-200',
        isActive
          ? 'border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
          : 'border-transparent text-black/65 hover:-translate-y-0.5 hover:border-black/80 hover:bg-white hover:text-black hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F4F0]'
      )}
      style={isActive ? { backgroundColor: fillColor } : undefined}
    >
      {label}
    </Link>
  )
}
