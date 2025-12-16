'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
    ArrowLeft,
    Download,
    X,
    Sparkles,
    Camera,
    Calendar,
    Loader2,
    CheckCircle2,
    Clock,
    XCircle,
    Trash2,
    ZoomIn,
    ImageIcon
} from 'lucide-react'
import { useDeleteGeneration, useGenerations } from '@/lib/react-query/hooks'
import { toast } from 'sonner'

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.06,
            delayChildren: 0.1
        }
    }
}

const cardVariants = {
    hidden: { 
        opacity: 0, 
        y: 30,
        scale: 0.95
    },
    visible: { 
        opacity: 1, 
        y: 0,
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 24
        }
    }
}

const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
        opacity: 1, 
        y: 0,
        transition: {
            type: "spring",
            stiffness: 400,
            damping: 30
        }
    }
}

const scaleIn = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
        opacity: 1, 
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 400,
            damping: 25
        }
    },
    exit: { 
        opacity: 0, 
        scale: 0.9,
        transition: { duration: 0.2 }
    }
}

export default function GenerationsPage() {
    const { data: generations, isLoading } = useGenerations()
    const deleteMutation = useDeleteGeneration()
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    const [selectedJob, setSelectedJob] = useState<any>(null)
    const [downloading, setDownloading] = useState<string | null>(null)
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; imageUrl?: string | null } | null>(null)

    const handleDownload = async (imageUrl: string, jobId: string) => {
        try {
            setDownloading(jobId)
            const response = await fetch(imageUrl)
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `tria-tryon-${jobId.slice(0, 8)}.png`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
            toast.success('Image downloaded!')
        } catch (error) {
            console.error('Download failed:', error)
            toast.error('Failed to download image')
        } finally {
            setDownloading(null)
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return (
                    <motion.span 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-medium rounded-full border border-emerald-100"
                    >
                        <CheckCircle2 className="w-3 h-3" />
                        Completed
                    </motion.span>
                )
            case 'PROCESSING':
                return (
                    <motion.span 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-600 text-xs font-medium rounded-full border border-amber-100"
                    >
                        <Clock className="w-3 h-3 animate-pulse" />
                        Processing
                    </motion.span>
                )
            case 'FAILED':
                return (
                    <motion.span 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-600 text-xs font-medium rounded-full border border-red-100"
                    >
                        <XCircle className="w-3 h-3" />
                        Failed
                    </motion.span>
                )
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 text-gray-600 text-xs font-medium rounded-full border border-gray-100">
                        {status}
                    </span>
                )
        }
    }

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        } catch {
            return 'Unknown date'
        }
    }

    const openLightbox = (job: any) => {
        setSelectedImage(job.outputImagePath)
        setSelectedJob(job)
    }

    const closeLightbox = () => {
        setSelectedImage(null)
        setSelectedJob(null)
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-cream to-white pt-24 flex flex-col items-center justify-center gap-4">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    className="relative"
                >
                    <div className="w-12 h-12 rounded-full border-2 border-charcoal/10 border-t-charcoal/60" />
                </motion.div>
                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-charcoal/50 text-sm"
                >
                    Loading your generations...
                </motion.p>
            </div>
        )
    }

    const completedGenerations = generations?.filter((g: any) => g.outputImagePath) || []
    const deletingId = deleteMutation.isPending ? (deleteMutation.variables as any) : null

    const requestDelete = (job: any) => {
        setDeleteConfirm({ id: job.id, imageUrl: job.outputImagePath })
    }

    const confirmDelete = async () => {
        if (!deleteConfirm?.id) return
        try {
            await deleteMutation.mutateAsync(deleteConfirm.id)
            toast.success('Deleted generation')
            if (selectedImage && deleteConfirm.imageUrl && selectedImage === deleteConfirm.imageUrl) {
                closeLightbox()
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Failed to delete'
            toast.error(msg)
        } finally {
            setDeleteConfirm(null)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-cream via-cream to-white pt-24 pb-16">
            <div className="container mx-auto px-4 sm:px-6">
                {/* Header */}
                <motion.div 
                    initial="hidden"
                    animate="visible"
                    variants={fadeInUp}
                    className="mb-10"
                >
                    <Link
                        href="/influencer/dashboard"
                        className="group inline-flex items-center gap-2 text-sm text-charcoal/50 hover:text-charcoal mb-6 transition-all duration-300"
                    >
                        <motion.span
                            whileHover={{ x: -3 }}
                            transition={{ type: "spring", stiffness: 400 }}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </motion.span>
                        <span className="relative">
                            Back to Dashboard
                            <span className="absolute bottom-0 left-0 w-0 h-px bg-charcoal group-hover:w-full transition-all duration-300" />
                        </span>
                    </Link>
                    
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
                        <div>
                            <motion.h1 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                className="text-4xl sm:text-5xl font-serif text-charcoal mb-2"
                            >
                                Your <span className="italic text-charcoal/70">Generations</span>
                            </motion.h1>
                            <motion.p 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-charcoal/50 flex items-center gap-2"
                            >
                                <ImageIcon className="w-4 h-4" />
                                {completedGenerations.length} try-on images generated
                            </motion.p>
                        </div>
                        
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Link
                                href="/influencer/try-on"
                                className="group inline-flex items-center gap-2.5 px-6 py-3 bg-charcoal text-cream rounded-full font-medium shadow-lg shadow-charcoal/20 hover:shadow-xl hover:shadow-charcoal/30 transition-all duration-300"
                            >
                                <Camera className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" />
                                New Try-On
                            </Link>
                        </motion.div>
                    </div>
                </motion.div>

                {/* Gallery Grid */}
                {completedGenerations.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="relative bg-white/80 backdrop-blur-sm rounded-3xl border border-charcoal/5 p-12 sm:p-20 text-center overflow-hidden"
                    >
                        {/* Background decoration */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="absolute -top-20 -right-20 w-60 h-60 bg-peach/20 rounded-full blur-3xl" />
                            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-charcoal/5 rounded-full blur-3xl" />
                        </div>
                        
                        <motion.div
                            animate={{ 
                                y: [0, -8, 0],
                                rotate: [0, 5, 0]
                            }}
                            transition={{ 
                                duration: 4, 
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="relative"
                        >
                            <Sparkles className="w-20 h-20 text-charcoal/15 mx-auto mb-6" />
                        </motion.div>
                        <h3 className="relative text-2xl font-serif text-charcoal mb-3">No generations yet</h3>
                        <p className="relative text-charcoal/50 mb-8 max-w-sm mx-auto">
                            Start creating stunning virtual try-ons powered by AI magic
                        </p>
                        <motion.div
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                        >
                            <Link
                                href="/influencer/try-on"
                                className="relative inline-flex items-center gap-2.5 px-8 py-4 bg-charcoal text-cream rounded-full font-medium shadow-xl shadow-charcoal/20 hover:shadow-2xl hover:shadow-charcoal/30 transition-all duration-300"
                            >
                                <Sparkles className="w-5 h-5" />
                                Start Generating
                            </Link>
                        </motion.div>
                    </motion.div>
                ) : (
                    <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
                    >
                        {generations?.map((job: any) => (
                            <motion.div
                                key={job.id}
                                variants={cardVariants}
                                whileHover={{ y: -6 }}
                                className="group bg-white rounded-2xl overflow-hidden border border-charcoal/5 shadow-sm hover:shadow-xl hover:border-charcoal/10 transition-all duration-500"
                            >
                                {/* Image */}
                                {job.outputImagePath ? (
                                    <div
                                        className="aspect-[3/4] overflow-hidden relative cursor-pointer"
                                        onClick={() => openLightbox(job)}
                                    >
                                        <motion.img
                                            src={job.outputImagePath}
                                            alt={`Generation ${job.id.slice(0, 8)}`}
                                            className="w-full h-full object-cover"
                                            whileHover={{ scale: 1.08 }}
                                            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                                        />
                                        {/* Gradient overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        
                                        {/* View button */}
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10 }}
                                            whileHover={{ opacity: 1, y: 0 }}
                                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
                                        >
                                            <motion.span 
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                className="px-5 py-2.5 bg-white/95 backdrop-blur-sm rounded-full text-sm font-medium text-charcoal flex items-center gap-2 shadow-lg"
                                            >
                                                <ZoomIn className="w-4 h-4" />
                                                View Full Size
                                            </motion.span>
                                        </motion.div>
                                    </div>
                                ) : (
                                    <div className="aspect-[3/4] bg-gradient-to-br from-cream to-charcoal/5 flex items-center justify-center">
                                        <Sparkles className="w-12 h-12 text-charcoal/15" />
                                    </div>
                                )}

                                {/* Info */}
                                <div className="p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-semibold text-charcoal font-mono">
                                            #{job.id.slice(0, 8)}
                                        </p>
                                        {getStatusBadge(job.status)}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-charcoal/40 mb-4">
                                        <Calendar className="w-3 h-3" />
                                        {formatDate(job.createdAt)}
                                    </div>

                                    {/* Action Buttons */}
                                    {job.outputImagePath && (
                                        <div className="flex gap-2">
                                            <motion.button
                                                onClick={() => handleDownload(job.outputImagePath, job.id)}
                                                disabled={downloading === job.id}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                className="flex-1 py-2.5 bg-charcoal/5 hover:bg-charcoal hover:text-cream text-charcoal text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50"
                                            >
                                                {downloading === job.id ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        <span className="hidden sm:inline">Saving...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Download className="w-4 h-4" />
                                                        <span className="hidden sm:inline">Download</span>
                                                    </>
                                                )}
                                            </motion.button>
                                            <motion.button
                                                onClick={() => requestDelete(job)}
                                                disabled={deletingId === job.id}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                className="w-11 py-2.5 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white rounded-xl flex items-center justify-center transition-all duration-300 disabled:opacity-50"
                                                aria-label="Delete generation"
                                                title="Delete"
                                            >
                                                {deletingId === job.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                            </motion.button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>

            {/* Lightbox Modal - Redesigned */}
            <AnimatePresence>
                {selectedImage && selectedJob && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col"
                        onClick={closeLightbox}
                    >
                        {/* Top toolbar - properly aligned */}
                        <motion.div 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 25 }}
                            className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Left side - Action buttons */}
                            <div className="flex items-center gap-3">
                                <motion.button
                                    onClick={() => handleDownload(selectedImage, selectedJob.id)}
                                    disabled={downloading === selectedJob.id}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-white text-charcoal rounded-full text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                                >
                                    {downloading === selectedJob.id ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Downloading...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-4 h-4" />
                                            Download
                                        </>
                                    )}
                                </motion.button>
                                
                                <motion.button
                                    onClick={() => requestDelete(selectedJob)}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-full text-sm font-medium shadow-lg hover:bg-red-600 hover:shadow-xl transition-all duration-300"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </motion.button>
                            </div>

                            {/* Center - Image info */}
                            <div className="hidden sm:flex flex-col items-center">
                                <span className="text-white/60 text-xs">Generation</span>
                                <span className="text-white font-mono text-sm">#{selectedJob.id.slice(0, 8)}</span>
                            </div>

                            {/* Right side - Close button */}
                            <motion.button
                                onClick={closeLightbox}
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                                className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </motion.button>
                        </motion.div>

                        {/* Image container - centered */}
                        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-hidden">
                            <motion.img
                                initial={{ scale: 0.85, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 10 }}
                                transition={{ 
                                    type: "spring", 
                                    stiffness: 300, 
                                    damping: 25,
                                    delay: 0.05
                                }}
                                src={selectedImage}
                                alt="Full size generation"
                                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                                draggable={false}
                            />
                        </div>

                        {/* Bottom info bar */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            transition={{ delay: 0.15 }}
                            className="flex items-center justify-center gap-4 px-4 py-3 border-t border-white/10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <span className="text-white/40 text-xs flex items-center gap-1.5">
                                <Calendar className="w-3 h-3" />
                                {formatDate(selectedJob.createdAt)}
                            </span>
                            <span className="text-white/20">•</span>
                            <span className="text-white/40 text-xs">
                                Click outside or press ESC to close
                            </span>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete confirm modal - Redesigned */}
            <AnimatePresence>
                {deleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => setDeleteConfirm(null)}
                    >
                        <motion.div
                            variants={scaleIn}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Image preview */}
                            {deleteConfirm.imageUrl && (
                                <div className="relative h-48 overflow-hidden">
                                    <img
                                        src={deleteConfirm.imageUrl}
                                        alt="To delete"
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
                                </div>
                            )}
                            
                            <div className="p-6 -mt-8 relative">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 400, delay: 0.1 }}
                                    className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"
                                >
                                    <Trash2 className="w-7 h-7 text-red-500" />
                                </motion.div>
                                
                                <h3 className="text-xl font-serif text-charcoal text-center mb-2">
                                    Delete this image?
                                </h3>
                                <p className="text-sm text-charcoal/50 text-center mb-6">
                                    This action cannot be undone. The image will be permanently removed from your account.
                                </p>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <motion.button
                                        onClick={() => setDeleteConfirm(null)}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="py-3 rounded-xl border border-charcoal/10 text-charcoal font-medium hover:bg-charcoal/5 transition-all duration-300"
                                        disabled={deleteMutation.isPending}
                                    >
                                        Cancel
                                    </motion.button>
                                    <motion.button
                                        onClick={confirmDelete}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all duration-300 disabled:opacity-60 shadow-lg shadow-red-500/20"
                                        disabled={deleteMutation.isPending}
                                    >
                                        {deleteMutation.isPending ? (
                                            <span className="inline-flex items-center justify-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Deleting...
                                            </span>
                                        ) : (
                                            'Delete Forever'
                                        )}
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
