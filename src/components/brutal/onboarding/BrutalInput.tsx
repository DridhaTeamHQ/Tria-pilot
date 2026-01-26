'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { motion } from 'framer-motion'
import { ExternalLink, Check, X, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface BrutalInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string
    icon?: React.ReactNode
    prefix?: string
    suffix?: string
    showVerify?: boolean
    onVerify?: () => void
    verifyUrl?: string
}

export function BrutalInput({
    label,
    className,
    icon,
    prefix,
    suffix,
    showVerify,
    onVerify,
    verifyUrl,
    ...props
}: BrutalInputProps) {
    const [verifyState, setVerifyState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

    const handleVerify = () => {
        if (verifyUrl) {
            // Open in new tab
            window.open(verifyUrl, '_blank')
            // Show success after opening (user can check manually)
            setVerifyState('success')
            setTimeout(() => setVerifyState('idle'), 3000)
        }
        onVerify?.()
    }

    return (
        <div className="space-y-1.5">
            <Label className="text-black font-bold text-sm tracking-wide ml-1 flex items-center gap-2">
                {icon}
                {label}
            </Label>
            <div className="relative flex items-center">
                {prefix && (
                    <span className="absolute left-4 text-black/40 font-bold text-sm">{prefix}</span>
                )}
                <Input
                    className={`
            border-[2px] border-black rounded-xl px-4 py-6 text-base font-medium 
            bg-white placeholder:text-black/30
            focus-visible:ring-0 focus-visible:border-black focus-visible:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
            transition-all duration-200
            ${prefix ? 'pl-8' : ''}
            ${suffix || showVerify ? 'pr-24' : ''}
            ${className}
          `}
                    {...props}
                />
                {suffix && (
                    <span className="absolute right-4 text-black/40 font-bold text-sm">{suffix}</span>
                )}
                {showVerify && props.value && (
                    <motion.button
                        type="button"
                        onClick={handleVerify}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`
              absolute right-2 px-3 py-1.5 rounded-lg font-bold text-xs border-2 border-black
              flex items-center gap-1.5 transition-all
              ${verifyState === 'success'
                                ? 'bg-[#B4F056] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                : verifyState === 'error'
                                    ? 'bg-red-400'
                                    : 'bg-[#FFD93D] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                            }
            `}
                    >
                        {verifyState === 'loading' ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                        ) : verifyState === 'success' ? (
                            <>
                                <Check className="w-3 h-3" strokeWidth={3} />
                                Verified
                            </>
                        ) : verifyState === 'error' ? (
                            <>
                                <X className="w-3 h-3" strokeWidth={3} />
                                Error
                            </>
                        ) : (
                            <>
                                <ExternalLink className="w-3 h-3" strokeWidth={2.5} />
                                Verify
                            </>
                        )}
                    </motion.button>
                )}
            </div>
        </div>
    )
}

interface BrutalNumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
    label: string
    icon?: React.ReactNode
    unit?: string
    formatDisplay?: boolean
}

export function BrutalNumberInput({
    label,
    className,
    icon,
    unit,
    formatDisplay,
    value,
    onChange,
    ...props
}: BrutalNumberInputProps) {
    const displayValue = formatDisplay && typeof value === 'string' && value
        ? Number(value).toLocaleString()
        : value

    return (
        <div className="space-y-1.5">
            <Label className="text-black font-bold text-sm tracking-wide ml-1 flex items-center gap-2">
                {icon}
                {label}
            </Label>
            <div className="relative">
                <Input
                    type="number"
                    value={value}
                    onChange={onChange}
                    className={`
            border-[2px] border-black rounded-xl px-4 py-6 text-lg font-black
            bg-white placeholder:text-black/30 placeholder:font-medium
            focus-visible:ring-0 focus-visible:border-black focus-visible:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
            transition-all duration-200
            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
            ${unit ? 'pr-14' : ''}
            ${className}
          `}
                    {...props}
                />
                {unit && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-[#FF8C69] rounded-lg border-2 border-black text-xs font-black">
                        {unit}
                    </div>
                )}
            </div>
        </div>
    )
}

interface BrutalTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label: string
}

export function BrutalTextarea({ label, className, ...props }: BrutalTextareaProps) {
    return (
        <div className="space-y-1.5">
            <Label className="text-black font-bold text-sm tracking-wide ml-1">{label}</Label>
            <textarea
                className={`
          w-full border-[2px] border-black rounded-xl px-4 py-4 text-base font-medium 
          bg-white placeholder:text-black/30 min-h-[120px] resize-none
          focus:outline-none focus:border-black focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
          transition-all duration-200
          ${className}
        `}
                {...props}
            />
        </div>
    )
}
