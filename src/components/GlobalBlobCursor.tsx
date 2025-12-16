'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

export default function GlobalBlobCursor() {
    const [position, setPosition] = useState({ x: -100, y: -100 })
    const [isVisible, setIsVisible] = useState(false)
    const [isMobile, setIsMobile] = useState(true)
    const [isHovering, setIsHovering] = useState(false)
    const [isPressed, setIsPressed] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    
    const rafRef = useRef<number | null>(null)
    const targetRef = useRef({ x: -100, y: -100 })
    const currentRef = useRef({ x: -100, y: -100 })

    const animate = useCallback(() => {
        const dx = targetRef.current.x - currentRef.current.x
        const dy = targetRef.current.y - currentRef.current.y
        
        currentRef.current.x += dx * 0.15
        currentRef.current.y += dy * 0.15
        
        setPosition({ x: currentRef.current.x, y: currentRef.current.y })
        rafRef.current = requestAnimationFrame(animate)
    }, [])

    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768 || 'ontouchstart' in window
            setIsMobile(mobile)
            return mobile
        }
        
        if (checkMobile()) return

        const style = document.createElement('style')
        style.id = 'blob-cursor-style'
        style.textContent = `* { cursor: none !important; }`
        document.head.appendChild(style)

        const handleMouseMove = (e: MouseEvent) => {
            targetRef.current = { x: e.clientX, y: e.clientY }
            if (!isVisible) setIsVisible(true)
            
            // Check if mouse is over a modal/lightbox
            const target = e.target as HTMLElement
            const inModal = target.closest('[data-lightbox="true"]') || 
                           target.closest('[role="dialog"]') ||
                           target.closest('.fixed.z-\\[100\\]') ||
                           target.closest('.fixed.z-\\[110\\]')
            setIsModalOpen(!!inModal)
        }

        const handleMouseDown = () => setIsPressed(true)
        const handleMouseUp = () => setIsPressed(false)

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            const interactive = target.closest('a, button, [role="button"], input, textarea, select, [data-cursor]')
            if (interactive) setIsHovering(true)
        }

        const handleMouseOut = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            const interactive = target.closest('a, button, [role="button"], input, textarea, select, [data-cursor]')
            if (interactive) setIsHovering(false)
        }

        const handleMouseLeave = () => setIsVisible(false)
        const handleMouseEnter = () => setIsVisible(true)

        rafRef.current = requestAnimationFrame(animate)

        window.addEventListener('mousemove', handleMouseMove, { passive: true })
        window.addEventListener('mousedown', handleMouseDown, { passive: true })
        window.addEventListener('mouseup', handleMouseUp, { passive: true })
        document.addEventListener('mouseover', handleMouseOver, { passive: true })
        document.addEventListener('mouseout', handleMouseOut, { passive: true })
        document.addEventListener('mouseleave', handleMouseLeave)
        document.addEventListener('mouseenter', handleMouseEnter)

        return () => {
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

    if (isMobile) return null

    const size = isPressed ? 12 : isHovering ? 48 : 16
    
    // Use white color when in modal/dark background
    const dotColor = isModalOpen ? '#FFFFFF' : '#1C1C1C'
    const ringColor = isModalOpen ? 'rgba(255, 255, 255, 0.3)' : 'rgba(28, 28, 28, 0.2)'

    return (
        <div
            className="fixed pointer-events-none z-[9999]"
            style={{
                left: position.x,
                top: position.y,
                opacity: isVisible ? 1 : 0,
                transition: 'opacity 0.2s ease',
            }}
        >
            {/* Outer ring - only on hover */}
            <div
                style={{
                    position: 'absolute',
                    width: 48,
                    height: 48,
                    left: -24,
                    top: -24,
                    borderRadius: '50%',
                    border: `1.5px solid ${ringColor}`,
                    transform: `scale(${isHovering && !isPressed ? 1 : 0})`,
                    opacity: isHovering && !isPressed ? 1 : 0,
                    transition: 'transform 0.3s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.3s ease, border-color 0.3s ease',
                }}
            />
            
            {/* Main dot */}
            <div
                style={{
                    position: 'absolute',
                    width: size,
                    height: size,
                    left: -size / 2,
                    top: -size / 2,
                    borderRadius: '50%',
                    backgroundColor: dotColor,
                    transition: 'width 0.25s cubic-bezier(0.23, 1, 0.32, 1), height 0.25s cubic-bezier(0.23, 1, 0.32, 1), left 0.25s cubic-bezier(0.23, 1, 0.32, 1), top 0.25s cubic-bezier(0.23, 1, 0.32, 1), background-color 0.3s ease',
                }}
            />
        </div>
    )
}
