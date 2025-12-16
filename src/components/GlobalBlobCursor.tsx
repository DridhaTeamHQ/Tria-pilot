'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

export default function GlobalBlobCursor() {
    const [position, setPosition] = useState({ x: -100, y: -100 })
    const [isHovering, setIsHovering] = useState(false)
    const [cursorText, setCursorText] = useState('')
    const [isVisible, setIsVisible] = useState(false)
    const [isClicking, setIsClicking] = useState(false)
    const rafRef = useRef<number | null>(null)
    const targetRef = useRef({ x: -100, y: -100 })

    // Smooth animation using RAF
    const animate = useCallback(() => {
        setPosition(prev => ({
            x: prev.x + (targetRef.current.x - prev.x) * 0.15,
            y: prev.y + (targetRef.current.y - prev.y) * 0.15
        }))
        rafRef.current = requestAnimationFrame(animate)
    }, [])

    useEffect(() => {
        // Only show on desktop
        if (typeof window === 'undefined' || window.innerWidth < 768) {
            return
        }

        const handleMouseMove = (e: MouseEvent) => {
            targetRef.current = { x: e.clientX, y: e.clientY }
            if (!isVisible) setIsVisible(true)
        }

        const handleMouseDown = () => setIsClicking(true)
        const handleMouseUp = () => setIsClicking(false)

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            
            // Check for data-cursor attribute
            const cursorElement = target.closest('[data-cursor]')
            if (cursorElement) {
                setIsHovering(true)
                setCursorText(cursorElement.getAttribute('data-cursor') || '')
                return
            }
            
            // Check for interactive elements
            const interactiveElement = target.closest('a, button, [role="button"], input, textarea, select')
            if (interactiveElement) {
                setIsHovering(true)
                setCursorText('')
            }
        }

        const handleMouseOut = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            const cursorElement = target.closest('[data-cursor]')
            const interactiveElement = target.closest('a, button, [role="button"], input, textarea, select')
            
            if (cursorElement || interactiveElement) {
                setIsHovering(false)
                setCursorText('')
            }
        }

        // Start animation loop
        rafRef.current = requestAnimationFrame(animate)

        window.addEventListener('mousemove', handleMouseMove, { passive: true })
        window.addEventListener('mousedown', handleMouseDown, { passive: true })
        window.addEventListener('mouseup', handleMouseUp, { passive: true })
        document.addEventListener('mouseover', handleMouseOver, { passive: true })
        document.addEventListener('mouseout', handleMouseOut, { passive: true })

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mousedown', handleMouseDown)
            window.removeEventListener('mouseup', handleMouseUp)
            document.removeEventListener('mouseover', handleMouseOver)
            document.removeEventListener('mouseout', handleMouseOut)
        }
    }, [animate, isVisible])

    // Don't render on mobile or SSR
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
        return null
    }

    const size = isClicking ? 16 : isHovering ? (cursorText ? 80 : 48) : 20
    const offset = size / 2

    return (
        <div
            className={`fixed top-0 left-0 pointer-events-none z-[9999] mix-blend-difference hidden md:flex items-center justify-center transition-opacity duration-200 ${
                isVisible ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
                transform: `translate3d(${position.x - offset}px, ${position.y - offset}px, 0)`,
                width: size,
                height: size,
                transition: 'width 0.2s ease-out, height 0.2s ease-out',
            }}
        >
            <div 
                className="w-full h-full bg-white rounded-full flex items-center justify-center"
                style={{
                    borderRadius: isHovering && cursorText ? 12 : '50%',
                    transition: 'border-radius 0.2s ease-out',
                }}
            >
                {cursorText && (
                    <span className="text-black text-[10px] font-semibold whitespace-nowrap">
                        {cursorText}
                    </span>
                )}
            </div>
        </div>
    )
}

