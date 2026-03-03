'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
    ArrowLeft,
    Download,
    X,
    Sparkles,
    AlertCircle,
    Camera,
    Calendar,
    Loader2,
    CheckCircle2,
    Clock,
    XCircle,
    Trash2,
    ZoomIn,
    ImageIcon,
    Share2
} from 'lucide-react'
import { useDeleteGeneration, useGenerations } from '@/lib/react-query/hooks'
import { toast } from 'sonner'
import { ShareModal } from '@/components/tryon/ShareModal'
import { PortalModal } from '@/components/ui/PortalModal'

// Helper to get image URL - use direct Supabase URLs (they're public)
// Helper to ensure valid URL
function getImageUrl(url: string | null | undefined): string {
    if (!url) return ''
    // If it's already a full URL, use it
    if (url.startsWith('http')) return url
    // If it's a relative path, assume it's in the try-ons bucket
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/try-ons/${url}`
}

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
    const [shareModalOpen, setShareModalOpen] = useState(false)
    const [shareImageUrl, setShareImageUrl] = useState<string | null>(null)
    const [shareImageBase64, setShareImageBase64] = useState<string | undefined>(undefined)
    const [imageError, setImageError] = useState(false)

    // Reset error state when selected image changes
    useEffect(() => {
        setImageError(false)
    }, [selectedImage])

    const handleDownload = async (imageUrl: string, jobId: string) => {
        try {
            setDownloading(jobId)
            const response = await fetch(imageUrl)
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `kiwikoo-tryon-${jobId.slice(0, 8)}.png`
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

    const handleShare = async (imageUrl: string) => {
        try {
            // Fetch image and convert to base64 for sharing
            const response = await fetch(imageUrl)
            const blob = await response.blob()
            const reader = new FileReader()
            reader.onloadend = () => {
                const base64 = reader.result as string
                setShareImageBase64(base64)
                setShareImageUrl(imageUrl)
                setShareModalOpen(true)
            }
            reader.readAsDataURL(blob)
        } catch (error) {
            console.error('Failed to prepare image for sharing:', error)
            toast.error('Failed to prepare image for sharing')
        }
    }

    const getStatusBadge = (status: string) => {
        // Handle both uppercase and lowercase status values
        const normalizedStatus = status.toUpperCase()
        switch (normalizedStatus) {
            case 'COMPLETED':
            case 'COMPLETE':
                return (
                    <motion.span
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#98FB98] text-black text-xs font-bold rounded-lg border-[2px] border-black"
                    >
                        <CheckCircle2 className="w-3 h-3" />
                        Completed
                    </motion.span>
                )
            case 'PROCESSING':
            case 'PENDING':
                return (
                    <motion.span
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FFD93D] text-black text-xs font-bold rounded-lg border-[2px] border-black"
                    >
                        <Clock className="w-3 h-3 animate-pulse" />
                        Processing
                    </motion.span>
                )
            case 'FAILED':
            case 'ERROR':
                return (
                    <motion.span
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FF6B6B] text-black text-xs font-bold rounded-lg border-[2px] border-black"
                    >
                        <XCircle className="w-3 h-3" />
                        Failed
                    </motion.span>
                )
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-black text-xs font-bold rounded-lg border-[2px] border-black">
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
            <div className="min-h-screen bg-[#FDF6EC] pt-24 flex flex-col items-center justify-center gap-4">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    className="relative"
                >
                    <div className="w-12 h-12 rounded-full border-[4px] border-black border-t-transparent" />
                </motion.div>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-black font-bold text-sm"
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
        <div className="min-h-screen bg-[#FDF6EC] pt-24 pb-16">
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
                        className="group inline-flex items-center gap-2 text-sm text-black hover:underline mb-6 transition-all duration-300 font-bold"
                    >
                        <motion.span
                            whileHover={{ x: -3 }}
                            transition={{ type: "spring", stiffness: 400 }}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </motion.span>
                        <span className="relative">
                            Back to Dashboard
                        </span>
                    </Link>

                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
                        <div>
                            <motion.h1
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                className="text-4xl sm:text-5xl font-bold text-black mb-2 tracking-tight"
                            >
                                Your <span className="text-black/70">Generations</span>
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-black font-medium flex items-center gap-2"
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
                                className="group inline-flex items-center gap-2.5 px-6 py-3 bg-black text-white rounded-xl font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-[#B4F056] hover:text-black border-[3px] border-black transition-all duration-300"
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
                        className="relative bg-white rounded-xl border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-12 sm:p-20 text-center overflow-hidden"
                    >
                        <div className="w-20 h-20 bg-[#FFD93D] rounded-lg border-[3px] border-black flex items-center justify-center mx-auto mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <Sparkles className="w-10 h-10 text-black" />
                        </div>

                        <h3 className="relative text-2xl font-bold text-black mb-3 uppercase">No generations yet</h3>
                        <p className="relative text-black font-medium mb-8 max-w-sm mx-auto">
                            Start creating stunning virtual try-ons powered by AI magic
                        </p>
                        <motion.div
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                        >
                            <Link
                                href="/influencer/try-on"
                                className="relative inline-flex items-center gap-2.5 px-8 py-4 bg-black text-white rounded-xl font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-[#B4F056] hover:text-black border-[3px] border-black transition-all duration-300"
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
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
                    >
                        {generations?.map((job: any) => (
                            <motion.div
                                key={job.id}
                                variants={cardVariants}
                                whileHover={{ y: -6 }}
                                className="group bg-white rounded-xl overflow-hidden border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 flex flex-col"
                            >
                                {/* Image Area */}
                                {(job.status?.toLowerCase() === 'completed' || job.status?.toLowerCase() === 'complete') && job.outputImagePath ? (
                                    <div
                                        className="aspect-[3/4] overflow-hidden relative cursor-pointer bg-gray-100 border-b-[3px] border-black"
                                        onClick={() => openLightbox(job)}
                                    >
                                        <motion.img
                                            src={getImageUrl(job.outputImagePath)}
                                            alt={`Generation ${job.id.slice(0, 8)}`}
                                            className="w-full h-full object-cover"
                                            whileHover={{ scale: 1.05 }}
                                            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement
                                                target.style.display = 'none'
                                            }}
                                        />

                                        {/* View Label */}
                                        {/* View Label */}
                                        <div className="absolute inset-x-0 bottom-4 flex justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                                            <span className="bg-black text-white font-bold text-sm px-4 py-2 rounded-lg border-[2px] border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">View Result</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="aspect-[3/4] bg-white flex items-center justify-center flex-col gap-3 border-b-[3px] border-black">
                                        <Loader2 className="w-8 h-8 text-black animate-spin" />
                                        <span className="text-xs font-bold text-black uppercase tracking-widest">Processing</span>
                                    </div>
                                )}

                                {/* Card Body */}
                                <div className="p-4 flex-1 flex flex-col">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <p className="text-sm font-bold text-black font-mono mb-1">
                                                #{job.id.slice(0, 8)}
                                            </p>
                                            <div className="flex items-center gap-1.5 text-xs text-black/60 font-medium">
                                                <Calendar className="w-3 h-3" />
                                                {formatDate(job.createdAt)}
                                            </div>
                                        </div>
                                        {getStatusBadge(job.status)}
                                    </div>

                                    <div className="mt-auto pt-4 border-t-[2px] border-black grid grid-cols-3 gap-2">
                                        {/* Download */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                if (job.outputImagePath) handleDownload(job.outputImagePath, job.id)
                                            }}
                                            disabled={!job.outputImagePath || downloading === job.id}
                                            className="flex items-center justify-center gap-2 py-2 text-xs font-bold text-black hover:bg-gray-100 rounded-lg border-[2px] border-transparent hover:border-black transition-all disabled:opacity-30"
                                            title="Download"
                                        >
                                            <Download className="w-4 h-4" />
                                            <span className="hidden xl:inline">Download</span>
                                        </button>

                                        {/* Share */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                if (job.outputImagePath) handleShare(job.outputImagePath)
                                            }}
                                            disabled={!job.outputImagePath}
                                            className="flex items-center justify-center gap-2 py-2 text-xs font-bold text-black hover:bg-[#FF8C69] rounded-lg border-[2px] border-transparent hover:border-black transition-all disabled:opacity-30"
                                            title="Share"
                                        >
                                            <Share2 className="w-4 h-4" />
                                            <span className="hidden xl:inline">Share</span>
                                        </button>

                                        {/* Delete */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                requestDelete(job)
                                            }}
                                            disabled={deleteMutation.isPending}
                                            className="flex items-center justify-center gap-2 py-2 text-xs font-bold text-[#FF6B6B] hover:text-white hover:bg-[#FF6B6B] rounded-lg border-[2px] border-transparent hover:border-black transition-all disabled:opacity-30"
                                            title="Delete"
                                        >
                                            {deleteMutation.isPending && deletingId === job.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>

            {/* Lightbox Modal - Redesigned & moved to Portal */}
            <PortalModal isOpen={!!(selectedImage && selectedJob)} onClose={closeLightbox}>
                {selectedImage && selectedJob && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 bg-black/90 backdrop-blur-md flex flex-col"
                        onClick={closeLightbox}
                        data-lightbox="true"
                    >
                        {/* Top toolbar - properly aligned */}
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 25 }}
                            className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/10 relative z-[200]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Left side - Action buttons */}
                            <div className="flex items-center gap-3">
                                {/* Added Back Button */}
                                <motion.button
                                    onClick={closeLightbox}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-sm font-bold border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    <span className="hidden sm:inline">Back</span>
                                </motion.button>
                                <motion.button
                                    onClick={() => selectedImage && handleDownload(selectedImage, selectedJob.id)}
                                    disabled={downloading === selectedJob.id}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-white text-black rounded-lg text-sm font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-[2px] border-black hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 disabled:opacity-50"
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
                                    onClick={() => selectedImage && handleShare(selectedImage)}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-[#FF8C69] text-black rounded-lg text-sm font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-[2px] border-black hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all duration-300"
                                >
                                    <Share2 className="w-4 h-4" />
                                    Share
                                </motion.button>

                                <motion.button
                                    onClick={() => requestDelete(selectedJob)}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6B6B] text-black rounded-lg text-sm font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-[2px] border-black hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all duration-300"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </motion.button>
                            </div>

                            {/* Center - Image info */}
                            <div className="hidden sm:flex flex-col items-center">
                                <span className="text-white/60 text-xs font-mono">Generation</span>
                                <span className="text-white font-mono text-sm">#{selectedJob.id.slice(0, 8)}</span>
                            </div>

                            {/* Right side - Close button */}
                            <motion.button
                                onClick={closeLightbox}
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                                className="p-2.5 bg-white text-black rounded-lg border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </motion.button>
                        </motion.div>

                        {/* Image container - Centered & Full Size */}
                        <div className="flex-1 flex items-center justify-center p-4 relative z-[100] w-full min-h-0 overflow-hidden">
                            {!imageError ? (
                                <img
                                    src={getImageUrl(selectedImage)}
                                    alt="Generation Result"
                                    className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                                    onClick={(e) => e.stopPropagation()}
                                    draggable={false}
                                    onError={() => setImageError(true)}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-4 text-white/60 bg-white/5 p-12 rounded-xl border border-white/10 backdrop-blur-sm">
                                    <AlertCircle className="w-12 h-12" />
                                    <div className="text-center">
                                        <p className="font-medium">Image unavailable</p>
                                        <p className="text-xs opacity-70 mt-1">Check your connection</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Bottom info bar */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            transition={{ delay: 0.15 }}
                            className="flex items-center justify-center gap-4 px-4 py-3 border-t border-white/10 relative z-[200]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <span className="text-white/40 text-xs flex items-center gap-1.5 font-mono">
                                <Calendar className="w-3 h-3" />
                                {formatDate(selectedJob.createdAt)}
                            </span>
                            <span className="text-white/20">•</span>
                            <span className="text-white/40 text-xs font-mono">
                                Click outside or press ESC to close
                            </span>
                        </motion.div>
                    </motion.div>
                )}
            </PortalModal>

            {/* Delete confirm modal - Redesigned */}
            <AnimatePresence>
                {deleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => setDeleteConfirm(null)}
                    >
                        <motion.div
                            variants={scaleIn}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="w-full max-w-md bg-white rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-[3px] border-black overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Image preview */}
                            {deleteConfirm.imageUrl && (
                                <div className="relative h-48 overflow-hidden bg-white border-b-[3px] border-black">
                                    <img
                                        src={getImageUrl(deleteConfirm.imageUrl)}
                                        alt="To delete"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement
                                            target.style.display = 'none'
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                                </div>
                            )}

                            <div className="p-6 -mt-8 relative">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 400, delay: 0.1 }}
                                    className="w-14 h-14 rounded-full bg-[#FF6B6B] border-[3px] border-black flex items-center justify-center mx-auto mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                >
                                    <Trash2 className="w-7 h-7 text-black" />
                                </motion.div>

                                <h3 className="text-xl font-bold text-black text-center mb-2 uppercase">
                                    Delete this image?
                                </h3>
                                <p className="text-sm text-black font-medium text-center mb-6">
                                    This action cannot be undone. The image will be permanently removed from your account.
                                </p>

                                <div className="grid grid-cols-2 gap-3">
                                    <motion.button
                                        onClick={() => setDeleteConfirm(null)}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="py-3 rounded-lg border-[2px] border-black text-black font-bold hover:bg-gray-100 transition-all duration-300"
                                        disabled={deleteMutation.isPending}
                                    >
                                        Cancel
                                    </motion.button>
                                    <motion.button
                                        onClick={confirmDelete}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="py-3 rounded-lg bg-[#FF6B6B] border-[2px] border-black text-black font-bold hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 disabled:opacity-60"
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

            {/* Share Modal */}
            <ShareModal
                isOpen={shareModalOpen}
                onClose={() => {
                    setShareModalOpen(false)
                    setShareImageUrl(null)
                    setShareImageBase64(undefined)
                }}
                imageUrl={shareImageUrl || ''}
                imageBase64={shareImageBase64}
            />
        </div >
    )
}
