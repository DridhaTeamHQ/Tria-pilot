'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

interface PortalModalProps {
    children: React.ReactNode
    isOpen: boolean
    onClose: () => void
}

export const PortalModal = ({ children, isOpen, onClose }: PortalModalProps) => {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    if (!mounted) return null

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="relative z-[99999]">
                    {children}
                </div>
            )}
        </AnimatePresence>,
        document.body
    )
}
