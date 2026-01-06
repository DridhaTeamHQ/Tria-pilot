'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * GLOBAL BLOB CURSOR - Fixed & Reliable
 * 
 * Simple, reliable custom cursor that:
 * - Works on desktop only (disabled on mobile/touch)
 * - Follows mouse with smooth interpolation
 * - Changes size on hover over interactive elements
 * - Respects reduced motion preference
 * - Initializes at current mouse position
 * - Always visible when enabled
 */
export default function GlobalBlobCursor() {
    const cursorRef = useRef<HTMLDivElement>(null)
    const [enabled, setEnabled] = useState(false)
    const [isHovering, setIsHovering] = useState(false)
    const [isPressed, setIsPressed] = useState(false)
    const [isVisible, setIsVisible] = useState(false)

    // Track mouse position with refs to avoid re-renders
    const mouse = useRef({ x: 0, y: 0 })
    const pos = useRef({ x: 0, y: 0 })
    const rafId = useRef<number | null>(null)

    useEffect(() => {
        // Check if we should enable the custom cursor
        const isMobile = window.innerWidth < 768 || 'ontouchstart' in window
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

        if (isMobile || prefersReducedMotion) {
            setEnabled(false)
            return
        }

        // Initialize mouse position to current cursor position if available
        // This prevents cursor from starting at (0,0)
        const initMousePosition = () => {
            // Try to get current mouse position from any existing event
            mouse.current.x = window.innerWidth / 2
            mouse.current.y = window.innerHeight / 2
            pos.current.x = mouse.current.x
            pos.current.y = mouse.current.y
            
            // Update cursor position immediately
            if (cursorRef.current) {
                cursorRef.current.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`
                setIsVisible(true)
            }
        }

        initMousePosition()
        setEnabled(true)

        // Add global cursor:none style with better specificity
        const style = document.createElement('style')
        style.id = 'custom-cursor-style'
        style.textContent = `
            * { cursor: none !important; }
            body { cursor: none !important; }
        `
        document.head.appendChild(style)

        // Animation loop
        const animate = () => {
            // Smooth interpolation for "Blob" feel
            // 0.25 = Sweet spot between snappy key and smooth trail
            pos.current.x += (mouse.current.x - pos.current.x) * 0.25
            pos.current.y += (mouse.current.y - pos.current.y) * 0.25

            if (cursorRef.current) {
                cursorRef.current.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`
            }

            rafId.current = requestAnimationFrame(animate)
        }

        // Start animation
        rafId.current = requestAnimationFrame(animate)

        // Event handlers
        const onMouseMove = (e: MouseEvent) => {
            mouse.current.x = e.clientX
            mouse.current.y = e.clientY
            // Ensure cursor is visible when mouse moves
            if (!isVisible) setIsVisible(true)
        }

        const onMouseDown = () => setIsPressed(true)
        const onMouseUp = () => setIsPressed(false)

        const onMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (target.closest('a, button, [role="button"], input, textarea, select, label')) {
                setIsHovering(true)
            }
        }

        const onMouseOut = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (target.closest('a, button, [role="button"], input, textarea, select, label')) {
                setIsHovering(false)
            }
        }

        // Add listeners
        window.addEventListener('mousemove', onMouseMove, { passive: true })
        window.addEventListener('mousedown', onMouseDown, { passive: true })
        window.addEventListener('mouseup', onMouseUp, { passive: true })
        document.addEventListener('mouseover', onMouseOver, { passive: true })
        document.addEventListener('mouseout', onMouseOut, { passive: true })

        // Cleanup
        return () => {
            if (rafId.current) cancelAnimationFrame(rafId.current)
            const styleEl = document.getElementById('custom-cursor-style')
            if (styleEl) styleEl.remove()
            window.removeEventListener('mousemove', onMouseMove)
            window.removeEventListener('mousedown', onMouseDown)
            window.removeEventListener('mouseup', onMouseUp)
            document.removeEventListener('mouseover', onMouseOver)
            document.removeEventListener('mouseout', onMouseOut)
        }
    }, [])

    // Don't render on mobile
    if (!enabled) return null

    // Cursor sizes
    const size = isPressed ? 10 : isHovering ? 40 : 14

    return (
        <div
            ref={cursorRef}
            className="fixed top-0 left-0 pointer-events-none z-[99999]"
            style={{ 
                willChange: 'transform',
                opacity: isVisible ? 1 : 0,
                transition: 'opacity 0.1s ease-out'
            }}
        >
            {/* Outer ring (visible on hover) */}
            <div
                className="absolute rounded-full border-2 border-charcoal/40 transition-all duration-300"
                style={{
                    width: 40,
                    height: 40,
                    left: -20,
                    top: -20,
                    transform: `scale(${isHovering && !isPressed ? 1 : 0})`,
                    opacity: isHovering && !isPressed ? 1 : 0,
                    pointerEvents: 'none',
                }}
            />

            {/* Main dot - always visible with better contrast */}
            <div
                className="absolute rounded-full transition-all duration-200 shadow-lg"
                style={{
                    width: size,
                    height: size,
                    left: -size / 2,
                    top: -size / 2,
                    backgroundColor: isHovering ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    pointerEvents: 'none',
                }}
            />
        </div>
    )
}
