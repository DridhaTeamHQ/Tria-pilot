'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

type CursorMood = 'neutral' | 'happy' | 'curious' | 'click' | 'excited' | 'sleepy'

export default function GlobalBlobCursor() {
    const [position, setPosition] = useState({ x: -100, y: -100 })
    const [mood, setMood] = useState<CursorMood>('neutral')
    const [isVisible, setIsVisible] = useState(false)
    const [isMobile, setIsMobile] = useState(true)
    const [velocity, setVelocity] = useState({ x: 0, y: 0 })
    const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 })
    const [blink, setBlink] = useState(false)
    const [stretch, setStretch] = useState({ x: 1, y: 1 })
    
    const rafRef = useRef<number | null>(null)
    const targetRef = useRef({ x: -100, y: -100 })
    const lastPosRef = useRef({ x: -100, y: -100 })
    const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
    const blinkTimerRef = useRef<NodeJS.Timeout | null>(null)

    // Random blink effect
    useEffect(() => {
        const doBlink = () => {
            setBlink(true)
            setTimeout(() => setBlink(false), 150)
            
            // Random next blink between 2-5 seconds
            blinkTimerRef.current = setTimeout(doBlink, 2000 + Math.random() * 3000)
        }
        
        blinkTimerRef.current = setTimeout(doBlink, 2000)
        
        return () => {
            if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current)
        }
    }, [])

    const animate = useCallback(() => {
        const dx = targetRef.current.x - lastPosRef.current.x
        const dy = targetRef.current.y - lastPosRef.current.y
        
        // Calculate velocity for stretching effect
        const speed = Math.sqrt(dx * dx + dy * dy)
        const maxStretch = 1.3
        const stretchAmount = Math.min(speed / 50, maxStretch - 1)
        
        // Calculate stretch direction
        if (speed > 2) {
            const angle = Math.atan2(dy, dx)
            setStretch({
                x: 1 + stretchAmount * Math.abs(Math.cos(angle)),
                y: 1 + stretchAmount * Math.abs(Math.sin(angle)) * 0.5
            })
        } else {
            setStretch(prev => ({
                x: prev.x + (1 - prev.x) * 0.1,
                y: prev.y + (1 - prev.y) * 0.1
            }))
        }
        
        // Eye tracking - eyes look in direction of movement
        const eyeTrackX = Math.max(-3, Math.min(3, dx * 0.3))
        const eyeTrackY = Math.max(-2, Math.min(2, dy * 0.3))
        setEyeOffset(prev => ({
            x: prev.x + (eyeTrackX - prev.x) * 0.2,
            y: prev.y + (eyeTrackY - prev.y) * 0.2
        }))
        
        setVelocity({ x: dx, y: dy })
        
        // Smooth follow
        const newX = lastPosRef.current.x + dx * 0.15
        const newY = lastPosRef.current.y + dy * 0.15
        
        lastPosRef.current = { x: newX, y: newY }
        setPosition({ x: newX, y: newY })
        
        rafRef.current = requestAnimationFrame(animate)
    }, [])

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

        const resetIdleTimer = () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
            if (mood === 'sleepy') setMood('neutral')
            
            idleTimerRef.current = setTimeout(() => {
                setMood('sleepy')
            }, 3000)
        }

        const handleMouseMove = (e: MouseEvent) => {
            targetRef.current = { x: e.clientX, y: e.clientY }
            if (!isVisible) setIsVisible(true)
            resetIdleTimer()
        }

        const handleMouseDown = () => {
            setMood('click')
        }
        
        const handleMouseUp = () => {
            setMood('happy')
            setTimeout(() => setMood('neutral'), 500)
        }

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            resetIdleTimer()
            
            // Check for images
            if (target.tagName === 'IMG' || target.closest('img')) {
                setMood('curious')
                return
            }
            
            // Check for data-cursor (custom interactions)
            const cursorElement = target.closest('[data-cursor]')
            if (cursorElement) {
                setMood('excited')
                return
            }
            
            // Check for interactive elements
            const interactiveElement = target.closest('a, button, [role="button"]')
            if (interactiveElement) {
                setMood('happy')
                return
            }
            
            // Check for inputs
            const inputElement = target.closest('input, textarea, select')
            if (inputElement) {
                setMood('curious')
                return
            }
        }

        const handleMouseOut = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            const isInteractive = target.closest('a, button, [role="button"], input, textarea, select, img, [data-cursor]')
            
            if (isInteractive && mood !== 'click') {
                setMood('neutral')
            }
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
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
            if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current)
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mousedown', handleMouseDown)
            window.removeEventListener('mouseup', handleMouseUp)
            document.removeEventListener('mouseover', handleMouseOver)
            document.removeEventListener('mouseout', handleMouseOut)
            document.removeEventListener('mouseleave', handleMouseLeave)
            document.removeEventListener('mouseenter', handleMouseEnter)
        }
    }, [animate, isVisible, mood])

    if (isMobile) return null

    // Size based on mood
    const getSize = () => {
        switch (mood) {
            case 'click': return 28
            case 'excited': return 48
            case 'happy': return 40
            case 'curious': return 44
            case 'sleepy': return 32
            default: return 36
        }
    }

    // Colors based on mood
    const getColors = () => {
        switch (mood) {
            case 'click': return { bg: '#FF6B6B', eye: '#FFF' }
            case 'excited': return { bg: '#FFD93D', eye: '#1C1C1C' }
            case 'happy': return { bg: '#6BCB77', eye: '#1C1C1C' }
            case 'curious': return { bg: '#4D96FF', eye: '#FFF' }
            case 'sleepy': return { bg: '#C4B5FD', eye: '#6B5B95' }
            default: return { bg: '#1C1C1C', eye: '#FFF' }
        }
    }

    const size = getSize()
    const colors = getColors()
    const offset = size / 2

    // Eye styles based on mood
    const getEyeStyle = () => {
        if (blink || mood === 'click') {
            return { height: 2, borderRadius: '50%' }
        }
        
        switch (mood) {
            case 'sleepy':
                return { height: 3, borderRadius: '50%' }
            case 'excited':
                return { height: 8, width: 8, borderRadius: '50%' }
            case 'happy':
                return { height: 6, borderRadius: '0 0 6px 6px' } // Happy curved eyes
            case 'curious':
                return { height: 10, width: 6, borderRadius: '50%' } // Wide eyes
            default:
                return { height: 6, width: 6, borderRadius: '50%' }
        }
    }

    const eyeStyle = getEyeStyle()

    // Mouth based on mood
    const getMouth = () => {
        switch (mood) {
            case 'click':
                return <div className="w-3 h-3 rounded-full bg-white/80" /> // O mouth
            case 'excited':
                return <div className="w-4 h-2 rounded-full bg-current border-t-2 border-current" style={{ borderColor: colors.eye }} /> // Big smile
            case 'happy':
                return (
                    <div 
                        className="w-3 h-1.5 rounded-b-full"
                        style={{ backgroundColor: colors.eye }}
                    />
                )
            case 'curious':
                return <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.eye }} /> // o mouth
            case 'sleepy':
                return <div className="w-3 h-0.5 rounded-full" style={{ backgroundColor: colors.eye }} /> // flat line
            default:
                return <div className="w-2 h-1 rounded-full" style={{ backgroundColor: colors.eye }} />
        }
    }

    return (
        <div
            className={`fixed top-0 left-0 pointer-events-none z-[9999] flex items-center justify-center transition-opacity duration-200 ${
                isVisible ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
                transform: `translate3d(${position.x - offset}px, ${position.y - offset}px, 0) scaleX(${stretch.x}) scaleY(${stretch.y})`,
                width: size,
                height: size,
                transition: 'width 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), height 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
        >
            {/* Main blob body */}
            <div 
                className="w-full h-full rounded-full flex flex-col items-center justify-center shadow-lg relative overflow-hidden"
                style={{
                    backgroundColor: colors.bg,
                    transition: 'background-color 0.3s ease, border-radius 0.2s ease',
                    borderRadius: mood === 'click' ? '40%' : '50%',
                }}
            >
                {/* Shine effect */}
                <div 
                    className="absolute top-1 left-1/4 w-2 h-2 rounded-full bg-white/40"
                    style={{ filter: 'blur(1px)' }}
                />
                
                {/* Eyes container */}
                <div 
                    className="flex gap-1.5 mb-0.5"
                    style={{
                        transform: `translate(${eyeOffset.x}px, ${eyeOffset.y}px)`,
                        transition: 'transform 0.1s ease-out'
                    }}
                >
                    {/* Left eye */}
                    <div
                        style={{
                            backgroundColor: colors.eye,
                            width: eyeStyle.width || 6,
                            height: eyeStyle.height,
                            borderRadius: eyeStyle.borderRadius,
                            transition: 'all 0.15s ease',
                        }}
                    />
                    {/* Right eye */}
                    <div
                        style={{
                            backgroundColor: colors.eye,
                            width: eyeStyle.width || 6,
                            height: eyeStyle.height,
                            borderRadius: eyeStyle.borderRadius,
                            transition: 'all 0.15s ease',
                        }}
                    />
                </div>
                
                {/* Mouth */}
                <div className="flex items-center justify-center">
                    {getMouth()}
                </div>
                
                {/* Blush for happy/excited */}
                {(mood === 'happy' || mood === 'excited') && (
                    <>
                        <div 
                            className="absolute w-2 h-1 rounded-full bg-pink-300/60"
                            style={{ left: '15%', top: '55%' }}
                        />
                        <div 
                            className="absolute w-2 h-1 rounded-full bg-pink-300/60"
                            style={{ right: '15%', top: '55%' }}
                        />
                    </>
                )}
                
                {/* Z's for sleepy */}
                {mood === 'sleepy' && (
                    <div 
                        className="absolute -top-1 -right-1 text-[8px] font-bold opacity-60"
                        style={{ color: colors.eye }}
                    >
                        z
                    </div>
                )}
                
                {/* Sparkles for excited */}
                {mood === 'excited' && (
                    <>
                        <div className="absolute -top-1 -left-1 text-[8px]">✨</div>
                        <div className="absolute -bottom-1 -right-1 text-[8px]">✨</div>
                    </>
                )}
            </div>
            
            {/* Shadow */}
            <div 
                className="absolute -bottom-1 w-3/4 h-1 rounded-full bg-black/10 blur-sm"
                style={{
                    transform: `scaleX(${mood === 'click' ? 1.2 : 1})`,
                    transition: 'transform 0.15s ease'
                }}
            />
        </div>
    )
}

