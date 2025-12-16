'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

export default function GlobalBlobCursor() {
    const [position, setPosition] = useState({ x: -100, y: -100 })
    const [isHovering, setIsHovering] = useState(false)
    const [cursorText, setCursorText] = useState('')
    const [isVisible, setIsVisible] = useState(false)
    const [isClicking, setIsClicking] = useState(false)
    const [isMobile, setIsMobile] = useState(true) // Default to mobile to avoid flash
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
        // Check if mobile on mount
        const checkMobile = () => {
            const mobile = window.innerWidth < 768 || 'ontouchstart' in window
            setIsMobile(mobile)
            return mobile
        }
        
        if (checkMobile()) {
            return
        }

        // Hide native cursor via style injection
        const style = document.createElement('style')
        style.id = 'blob-cursor-style'
        style.textContent = `
            * { cursor: none !important; }
            body { cursor: none !important; }
        `
        document.head.appendChild(style)

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
            const interactiveElement = target.closest('a, button, [role="button"], input, textarea, select, label')
            if (interactiveElement) {
                setIsHovering(true)
                setCursorText('')
            }
        }

        const handleMouseOut = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            const cursorElement = target.closest('[data-cursor]')
            const interactiveElement = target.closest('a, button, [role="button"], input, textarea, select, label')
            
            if (cursorElement || interactiveElement) {
                setIsHovering(false)
                setCursorText('')
            }
        }

        const handleMouseLeave = () => {
            setIsVisible(false)
        }

        const handleMouseEnter = () => {
            setIsVisible(true)
        }

        // Start animation loop
        rafRef.current = requestAnimationFrame(animate)

        window.addEventListener('mousemove', handleMouseMove, { passive: true })
        window.addEventListener('mousedown', handleMouseDown, { passive: true })
        window.addEventListener('mouseup', handleMouseUp, { passive: true })
        document.addEventListener('mouseover', handleMouseOver, { passive: true })
        document.addEventListener('mouseout', handleMouseOut, { passive: true })
        document.addEventListener('mouseleave', handleMouseLeave)
        document.addEventListener('mouseenter', handleMouseEnter)

        return () => {
            // Remove injected style
            const styleEl = document.getElementById('blob-cursor-style')
            if (styleEl) styleEl.remove()
            
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mousedown', handleMouseDown)
            window.removeEventListener('mouseup', handleMouseUp)
            document.removeEventListener('mouseover', handleMouseOver)
            document.removeEventListener('mouseout', handleMouseOut)
            document.removeEventListener('mouseleave', handleMouseLeave)
            document.removeEventListener('mouseenter', handleMouseEnter)
        }
    }, [animate, isVisible])

    // Don't render on mobile
    if (isMobile) {
        return null
    }

    const size = isClicking ? 16 : isHovering ? (cursorText ? 80 : 40) : 20
    const offset = size / 2

    return (
        <div
            className={`fixed top-0 left-0 pointer-events-none z-[9999] flex items-center justify-center ${
                isVisible ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
                transform: `translate3d(${position.x - offset}px, ${position.y - offset}px, 0)`,
                width: size,
                height: size,
                transition: 'width 0.15s ease-out, height 0.15s ease-out, opacity 0.2s ease-out',
            }}
        >
            <div 
                className="w-full h-full bg-charcoal rounded-full flex items-center justify-center shadow-lg"
                style={{
                    borderRadius: isHovering && cursorText ? 12 : '50%',
                    transition: 'border-radius 0.15s ease-out',
                }}
            >
                {cursorText && (
                    <span className="text-cream text-[10px] font-semibold whitespace-nowrap px-1">
                        {cursorText}
                    </span>
                )}
            </div>
        </div>
    )
}
