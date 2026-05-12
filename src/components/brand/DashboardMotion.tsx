'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { staggerContainer, staggerItem, pageVariants, slideUp, fadeIn } from '@/lib/animations'

export function DashboardStaggerContainer({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function DashboardStaggerItem({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <motion.div
      variants={staggerItem}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function DashboardPageWrapper({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function MotionTableBody({ children }: { children: React.ReactNode }) {
  return (
    <motion.tbody
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {children}
    </motion.tbody>
  )
}

export function MotionTableRow({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <motion.tr
      variants={staggerItem}
      className={className}
    >
      {children}
    </motion.tr>
  )
}

export function MotionDiv({ children, ...props }: any) {
  return <motion.div {...props}>{children}</motion.div>
}

export { motion, AnimatePresence, staggerContainer, staggerItem, slideUp, fadeIn }
