'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

export default function GlobalBlobCursor() {
    const [position, setPosition] = useState({ x: -100, y: -100 })
    const [isVisible, setIsVisible] = useState(false)
    const [isMobile, setIsMobile] = useState(true)
    const [isHovering, setIsHovering] = useState(false)
    const [isClicking, setIsClicking] = useState(false)
    const [rotation, setRotation] = useState(0)
    const [scale, setScale] = useState({ x: 1, y: 1 })
    const [trail, setTrail] = useState<{ x: number; y: number }[]>([])
    
    const rafRef = useRef<number | null>(null)
    const targetRef = useRef({ x: -100, y: -100 })
    const lastPosRef = useRef({ x: -100, y: -100 })
    const velocityRef = useRef({ x: 0, y: 0 })

    const animate = useCallback(() => {
        const dx = targetRef.current.x - lastPosRef.current.x
        const dy = targetRef.current.y - lastPosRef.current.y
        
        // Smooth velocity
        velocityRef.current = {
            x: velocityRef.current.x * 0.8 + dx * 0.2,
            y: velocityRef.current.y * 0.8 + dy * 0.2
        }
        
        const speed = Math.sqrt(dx * dx + dy * dy)
        
        // Rotation based on movement direction
        if (speed > 1) {
            const targetRotation = Math.atan2(dy, dx) * (180 / Math.PI)
            setRotation(prev => prev + (targetRotation - prev) * 0.1)
        }
        
        // Scale/stretch based on speed
        const stretchFactor = Math.min(speed / 30, 0.5)
        setScale({
            x: 1 + stretchFactor,
            y: 1 - stretchFactor * 0.3
        })
        
        // Update trail
        setTrail(prev => {
            const newTrail = [{ x: lastPosRef.current.x, y: lastPosRef.current.y }, ...prev.slice(0, 5)]
            return newTrail
        })
        
        // Smooth follow with easing
        const easing = isClicking ? 0.25 : 0.12
        const newX = lastPosRef.current.x + dx * easing
        const newY = lastPosRef.current.y + dy * easing
        
        lastPosRef.current = { x: newX, y: newY }
        setPosition({ x: newX, y: newY })
        
        rafRef.current = requestAnimationFrame(animate)
    }, [isClicking])

    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768 || 'ontouchstart' in window
            setIsMobile(mobile)
            return mobile
        }
        
        if (checkMobile()) return

        // Hide native cursor
        const style = document.createElement('style')
        style.id = 'blob-cursor-style'
        style.textContent = `* { cursor: none !important; }`
        document.head.appendChild(style)

        const handleMouseMove = (e: MouseEvent) => {
            targetRef.current = { x: e.clientX, y: e.clientY }
            if (!isVisible) setIsVisible(true)
        }

        const handleMouseDown = () => setIsClicking(true)
        const handleMouseUp = () => setIsClicking(false)

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            const interactive = target.closest('a, button, [role="button"], input, textarea, select, [data-cursor], img')
            if (interactive) setIsHovering(true)
        }

        const handleMouseOut = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            const interactive = target.closest('a, button, [role="button"], input, textarea, select, [data-cursor], img')
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

    // Dynamic sizing
    const baseSize = isClicking ? 20 : isHovering ? 56 : 32
    const size = baseSize

    return (
        <>
            {/* Trail effect */}
            {trail.map((point, i) => (
                <div
                    key={i}
                    className="fixed pointer-events-none z-[9998]"
                    style={{
                        left: point.x,
                        top: point.y,
                        width: 8 - i * 1.2,
                        height: 8 - i * 1.2,
                        marginLeft: -(8 - i * 1.2) / 2,
                        marginTop: -(8 - i * 1.2) / 2,
                        borderRadius: '50%',
                        backgroundColor: `rgba(255, 140, 105, ${0.4 - i * 0.06})`,
                        transform: 'translate3d(0, 0, 0)',
                        transition: 'opacity 0.1s ease',
                        opacity: isVisible ? 1 : 0,
                    }}
                />
            ))}
            
            {/* Main blob */}
            <div
                className={`fixed pointer-events-none z-[9999] transition-opacity duration-150 ${
                    isVisible ? 'opacity-100' : 'opacity-0'
                }`}
                style={{
                    left: position.x,
                    top: position.y,
                    width: size,
                    height: size,
                    marginLeft: -size / 2,
                    marginTop: -size / 2,
                    transform: `rotate(${rotation}deg) scaleX(${scale.x}) scaleY(${scale.y})`,
                    transition: 'width 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), height 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), margin 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
            >
                {/* Outer glow */}
                <div 
                    className="absolute inset-0 rounded-full"
                    style={{
                        background: 'radial-gradient(circle, rgba(255,140,105,0.3) 0%, transparent 70%)',
                        transform: `scale(${isHovering ? 2 : 1.5})`,
                        transition: 'transform 0.3s ease',
                    }}
                />
                
                {/* Main blob body */}
                <div 
                    className="absolute inset-0 rounded-full overflow-hidden"
                    style={{
                        background: isClicking 
                            ? 'linear-gradient(135deg, #FF6B6B 0%, #FF8C69 100%)'
                            : isHovering 
                                ? 'linear-gradient(135deg, #FF8C69 0%, #FFB088 100%)'
                                : 'linear-gradient(135deg, #1C1C1C 0%, #2D2D2D 100%)',
                        boxShadow: isHovering 
                            ? '0 0 30px rgba(255, 140, 105, 0.5), 0 0 60px rgba(255, 140, 105, 0.2)'
                            : '0 4px 20px rgba(0, 0, 0, 0.3)',
                        transition: 'background 0.3s ease, box-shadow 0.3s ease',
                    }}
                >
                    {/* Inner shine */}
                    <div 
                        className="absolute rounded-full bg-white/20"
                        style={{
                            width: '40%',
                            height: '40%',
                            top: '15%',
                            left: '15%',
                            filter: 'blur(2px)',
                        }}
                    />
                    
                    {/* Ripple effect on hover */}
                    {isHovering && (
                        <div 
                            className="absolute inset-0 rounded-full animate-ping"
                            style={{
                                background: 'rgba(255, 255, 255, 0.2)',
                                animationDuration: '1s',
                            }}
                        />
                    )}
                </div>
                
                {/* Center dot */}
                <div 
                    className="absolute rounded-full bg-white"
                    style={{
                        width: isClicking ? 4 : isHovering ? 8 : 6,
                        height: isClicking ? 4 : isHovering ? 8 : 6,
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        transition: 'all 0.2s ease',
                        opacity: isClicking ? 1 : 0.9,
                    }}
                />
            </div>
            
            {/* Click burst effect */}
            {isClicking && (
                <div
                    className="fixed pointer-events-none z-[9997]"
                    style={{
                        left: position.x,
                        top: position.y,
                        width: 60,
                        height: 60,
                        marginLeft: -30,
                        marginTop: -30,
                    }}
                >
                    <div 
                        className="w-full h-full rounded-full animate-ping"
                        style={{
                            background: 'radial-gradient(circle, rgba(255,140,105,0.4) 0%, transparent 70%)',
                            animationDuration: '0.4s',
                        }}
                    />
                </div>
            )}
        </>
    )
}
