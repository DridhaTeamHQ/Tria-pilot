'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, useSpring, useMotionValue } from 'framer-motion'

export default function BlobCursor() {
    const [isHovering, setIsHovering] = useState(false)
    const [cursorText, setCursorText] = useState('')
    const [isVisible, setIsVisible] = useState(false)
    
    const cursorX = useMotionValue(-100)
    const cursorY = useMotionValue(-100)
    
    const springConfig = { damping: 30, stiffness: 500, mass: 0.3 }
    const cursorXSpring = useSpring(cursorX, springConfig)
    const cursorYSpring = useSpring(cursorY, springConfig)

    const moveCursor = useCallback((e: MouseEvent) => {
        cursorX.set(e.clientX)
        cursorY.set(e.clientY)
        if (!isVisible) setIsVisible(true)
    }, [cursorX, cursorY, isVisible])

    const handleMouseOver = useCallback((e: MouseEvent) => {
        const target = e.target as HTMLElement
        const interactiveElement = target.closest('[data-cursor]')
        
        if (interactiveElement) {
            setIsHovering(true)
            const cursorType = interactiveElement.getAttribute('data-cursor')
            setCursorText(cursorType || '')
        }
    }, [])

    const handleMouseOut = useCallback((e: MouseEvent) => {
        const target = e.target as HTMLElement
        const interactiveElement = target.closest('[data-cursor]')
        
        if (interactiveElement) {
            setIsHovering(false)
            setCursorText('')
        }
    }, [])

    useEffect(() => {
        // Only show on desktop
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            return
        }

        window.addEventListener('mousemove', moveCursor, { passive: true })
        document.addEventListener('mouseover', handleMouseOver, { passive: true })
        document.addEventListener('mouseout', handleMouseOut, { passive: true })

        return () => {
            window.removeEventListener('mousemove', moveCursor)
            document.removeEventListener('mouseover', handleMouseOver)
            document.removeEventListener('mouseout', handleMouseOut)
        }
    }, [moveCursor, handleMouseOver, handleMouseOut])

    // Don't render on mobile/tablet
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
        return null
    }

    return (
        <motion.div
            className={`fixed top-0 left-0 pointer-events-none z-[9999] mix-blend-difference hidden md:flex items-center justify-center ${
                isVisible ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
                x: cursorXSpring,
                y: cursorYSpring,
                width: isHovering ? 80 : 24,
                height: isHovering ? 80 : 24,
                marginLeft: isHovering ? -40 : -12,
                marginTop: isHovering ? -40 : -12,
                borderRadius: isHovering ? 16 : 100,
            }}
            transition={{
                width: { type: "spring", stiffness: 500, damping: 30 },
                height: { type: "spring", stiffness: 500, damping: 30 },
            }}
        >
            <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                {cursorText && (
                    <span className="text-black text-xs font-medium whitespace-nowrap">
                        {cursorText}
                    </span>
                )}
            </div>
        </motion.div>
    )
}
