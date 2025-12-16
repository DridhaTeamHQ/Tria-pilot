'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useSpring, useMotionValue } from 'framer-motion'

export default function BlobCursor() {
    const cursorRef = useRef<HTMLDivElement>(null)
    const [isHovering, setIsHovering] = useState(false)
    const [isClicking, setIsClicking] = useState(false)
    const [cursorText, setCursorText] = useState('')
    
    const cursorX = useMotionValue(-100)
    const cursorY = useMotionValue(-100)
    
    const springConfig = { damping: 25, stiffness: 400, mass: 0.5 }
    const cursorXSpring = useSpring(cursorX, springConfig)
    const cursorYSpring = useSpring(cursorY, springConfig)

    useEffect(() => {
        const moveCursor = (e: MouseEvent) => {
            cursorX.set(e.clientX)
            cursorY.set(e.clientY)
        }

        const handleMouseDown = () => setIsClicking(true)
        const handleMouseUp = () => setIsClicking(false)

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            const interactiveElement = target.closest('[data-cursor]')
            
            if (interactiveElement) {
                setIsHovering(true)
                const cursorType = interactiveElement.getAttribute('data-cursor')
                setCursorText(cursorType || '')
            }
        }

        const handleMouseOut = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            const interactiveElement = target.closest('[data-cursor]')
            
            if (interactiveElement) {
                setIsHovering(false)
                setCursorText('')
            }
        }

        window.addEventListener('mousemove', moveCursor)
        window.addEventListener('mousedown', handleMouseDown)
        window.addEventListener('mouseup', handleMouseUp)
        document.addEventListener('mouseover', handleMouseOver)
        document.addEventListener('mouseout', handleMouseOut)

        return () => {
            window.removeEventListener('mousemove', moveCursor)
            window.removeEventListener('mousedown', handleMouseDown)
            window.removeEventListener('mouseup', handleMouseUp)
            document.removeEventListener('mouseover', handleMouseOver)
            document.removeEventListener('mouseout', handleMouseOut)
        }
    }, [cursorX, cursorY])

    return (
        <>
            {/* Main blob cursor */}
            <motion.div
                ref={cursorRef}
                className="fixed top-0 left-0 pointer-events-none z-[9999] mix-blend-difference hidden md:flex items-center justify-center"
                style={{
                    x: cursorXSpring,
                    y: cursorYSpring,
                }}
                animate={{
                    width: isHovering ? 100 : isClicking ? 20 : 32,
                    height: isHovering ? 100 : isClicking ? 20 : 32,
                    marginLeft: isHovering ? -50 : isClicking ? -10 : -16,
                    marginTop: isHovering ? -50 : isClicking ? -10 : -16,
                    borderRadius: isHovering ? 20 : 100,
                }}
                transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 28,
                    mass: 0.5
                }}
            >
                <motion.div 
                    className="w-full h-full bg-white rounded-full flex items-center justify-center"
                    animate={{
                        scale: isClicking ? 0.8 : 1,
                    }}
                >
                    {cursorText && (
                        <motion.span
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            className="text-black text-xs font-medium whitespace-nowrap"
                        >
                            {cursorText}
                        </motion.span>
                    )}
                </motion.div>
            </motion.div>
            
            {/* Trail effect */}
            <motion.div
                className="fixed top-0 left-0 w-3 h-3 pointer-events-none z-[9998] hidden md:block"
                style={{
                    x: cursorXSpring,
                    y: cursorYSpring,
                    marginLeft: -6,
                    marginTop: -6,
                }}
            >
                <div className="w-full h-full bg-peach/60 rounded-full blur-sm" />
            </motion.div>
        </>
    )
}

