'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface OnboardingCardProps {
    children: ReactNode
    title: string
    step: number
    totalSteps: number
    stepTitle: string
}

export function OnboardingCard({ children, title, step, totalSteps, stepTitle }: OnboardingCardProps) {
    return (
        <div className="relative w-full max-w-2xl mx-auto">
            {/* Kiwikoo Logo - Top Left */}
            <div className="absolute -top-16 left-0 z-30">
                <span className="text-2xl font-black text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                    Kiwikoo
                </span>
            </div>

            {/* Progress Pill - Floating Top Center */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-30">
                <div className="bg-gradient-to-r from-[#FFE066] to-[#FFD93D] border-[3px] border-black rounded-full px-6 py-2.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-4">
                    <span className="font-black text-black text-sm whitespace-nowrap">
                        Step {step} of {totalSteps}
                    </span>
                    <div className="h-4 w-px bg-black/20" />
                    <div className="flex gap-1.5">
                        {Array.from({ length: totalSteps }).map((_, i) => (
                            <div
                                key={i}
                                className={`w-3 h-3 rounded-full border-2 border-black transition-colors duration-200 ${i + 1 <= step ? 'bg-[#FF8C69]' : 'bg-white'
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Card - No heavy animation on mount */}
            <div className="relative z-20 bg-[#FFFDF8] border-[4px] border-black rounded-3xl p-8 lg:p-10 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                {/* Content */}
                <div className="mt-4">
                    <h1
                        className="text-4xl lg:text-5xl font-black text-black mb-3 tracking-tight"
                        style={{ fontFamily: 'var(--font-playfair), serif' }}
                    >
                        {title}
                    </h1>

                    <p className="text-lg text-black/50 font-bold mb-8">
                        Step {step} of {totalSteps} — <span className="text-black/70">{stepTitle}</span>
                    </p>

                    {/* Step Content Area */}
                    <div className="relative z-10 bg-white/50 border-2 border-black/10 rounded-2xl p-6">
                        {children}
                    </div>
                </div>
            </div>

            {/* Decorative Orange Side Strip - CSS only, no animation */}
            <div
                className="absolute top-8 -right-5 lg:-right-8 w-24 h-[85%] bg-gradient-to-b from-[#FF8C69] to-[#E76B4A] border-[4px] border-black rounded-r-3xl z-10 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hidden lg:block overflow-hidden"
            >
                <div className="absolute inset-0" style={{
                    backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.15) 2px, transparent 2px)',
                    backgroundSize: '10px 10px'
                }} />
            </div>

            {/* Bottom accent line - CSS only */}
            <div className="absolute -bottom-4 left-8 right-8 h-3 bg-[#FFD93D] border-[3px] border-black rounded-full z-0 hidden lg:block" />
        </div>
    )
}
