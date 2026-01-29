'use client'

import { motion } from 'framer-motion'
import { Sparkles, Star } from 'lucide-react'

export function BrutalLoader({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg', className?: string }) {
    const sizeClasses = {
        sm: 'w-6 h-6',
        md: 'w-12 h-12',
        lg: 'w-24 h-24'
    }

    const iconSize = {
        sm: 16,
        md: 24,
        lg: 48
    }

    return (
        <div className={`relative flex items-center justify-center ${className}`}>
            {/* Spinning Outer Shape */}
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className={`${sizeClasses[size]} bg-[#FFD93D] border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center`}
            >
                {/* Counter-Spinning Inner Icon */}
                <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                    <Star className={`text-black fill-black`} size={iconSize[size]} />
                </motion.div>
            </motion.div>

            {/* Label (Optional, mainly for larger loaders) */}
            {size === 'lg' && (
                <p className="absolute -bottom-12 text-sm font-black uppercase tracking-widest bg-white border-[2px] border-black px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap">
                    Loading...
                </p>
            )}
        </div>
    )
}
