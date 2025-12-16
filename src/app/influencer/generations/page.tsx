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
    Trash2
} from 'lucide-react'
import { useDeleteGeneration, useGenerations } from '@/lib/react-query/hooks'
import { toast } from 'sonner'

export default function GenerationsPage() {
    const { data: generations, isLoading } = useGenerations()
    const deleteMutation = useDeleteGeneration()
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
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
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        Completed
                    </span>
                )
            case 'PROCESSING':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                        <Clock className="w-3 h-3" />
                        Processing
                    </span>
                )
            case 'FAILED':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                        <XCircle className="w-3 h-3" />
                        Failed
                    </span>
                )
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
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

    if (isLoading) {
        return (
            <div className="min-h-screen bg-cream pt-24 flex items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                    <Loader2 className="w-8 h-8 text-charcoal/30" />
                </motion.div>
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
                setSelectedImage(null)
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Failed to delete'
            toast.error(msg)
        } finally {
            setDeleteConfirm(null)
        }
    }

    return (
        <div className="min-h-screen bg-cream pt-24 pb-12">
            <div className="container mx-auto px-6">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/influencer/dashboard"
                        className="inline-flex items-center gap-2 text-sm text-charcoal/60 hover:text-charcoal mb-4 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Dashboard
                    </Link>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-serif text-charcoal mb-1">
                                Your <span className="italic">Generations</span>
                            </h1>
                            <p className="text-charcoal/60 text-sm sm:text-base">
                                {completedGenerations.length} try-on images generated
                            </p>
                        </div>
                        <Link
                            href="/influencer/try-on"
                            className="self-start sm:self-auto inline-flex items-center gap-2 px-5 py-2.5 bg-charcoal text-cream rounded-full font-medium hover:bg-charcoal/90 transition-colors text-sm"
                        >
                            <Camera className="w-4 h-4" />
                            New Try-On
                        </Link>
                    </div>
                </div>

                {/* Gallery Grid */}
                {completedGenerations.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl border border-dashed border-subtle p-16 text-center"
                    >
                        <Sparkles className="w-16 h-16 text-charcoal/20 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-charcoal mb-2">No generations yet</h3>
                        <p className="text-charcoal/60 mb-6">Start creating stunning virtual try-ons with AI</p>
                        <Link
                            href="/influencer/try-on"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-charcoal text-cream rounded-full font-medium hover:bg-charcoal/90 transition-colors"
                        >
                            <Camera className="w-5 h-5" />
                            Start Generating
                        </Link>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                        {generations?.map((job: any, index: number) => (
                            <motion.div
                                key={job.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="group bg-white rounded-2xl overflow-hidden border border-subtle hover:border-charcoal/20 transition-all hover:shadow-lg"
                            >
                                {/* Image */}
                                {job.outputImagePath ? (
                                    <div
                                        className="aspect-[3/4] overflow-hidden relative cursor-pointer"
                                        onClick={() => setSelectedImage(job.outputImagePath)}
                                    >
                                        <img
                                            src={job.outputImagePath}
                                            alt={`Generation ${job.id.slice(0, 8)}`}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        {/* Overlay on hover */}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                            <span className="opacity-0 group-hover:opacity-100 px-4 py-2 bg-white/90 rounded-full text-sm font-medium text-charcoal transition-opacity">
                                                View Full Size
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="aspect-[3/4] bg-cream flex items-center justify-center">
                                        <Sparkles className="w-12 h-12 text-charcoal/20" />
                                    </div>
                                )}

                                {/* Info */}
                                <div className="p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-medium text-charcoal">
                                            #{job.id.slice(0, 8)}
                                        </p>
                                        {getStatusBadge(job.status)}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-charcoal/50 mb-3">
                                        <Calendar className="w-3 h-3" />
                                        {formatDate(job.createdAt)}
                                    </div>

                                    {/* Download Button */}
                                    {job.outputImagePath && (
                                        <div className="grid grid-cols-[1fr_auto] gap-2">
                                            <button
                                                onClick={() => handleDownload(job.outputImagePath, job.id)}
                                                disabled={downloading === job.id}
                                                className="py-2.5 bg-charcoal/5 hover:bg-charcoal hover:text-cream text-charcoal text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                            >
                                                {downloading === job.id ? (
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
                                            </button>
                                            <button
                                                onClick={() => requestDelete(job)}
                                                disabled={deletingId === job.id}
                                                className="w-11 py-2.5 bg-red-50 hover:bg-red-600 text-red-700 hover:text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-50"
                                                aria-label="Delete generation"
                                                title="Delete"
                                            >
                                                {deletingId === job.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Lightbox Modal */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                        onClick={() => setSelectedImage(null)}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        {/* Download button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                const job = generations?.find((g: any) => g.outputImagePath === selectedImage)
                                if (job) {
                                    handleDownload(selectedImage, job.id)
                                }
                            }}
                            className="absolute top-4 left-4 px-4 py-2 bg-white text-charcoal rounded-full text-sm font-medium flex items-center gap-2 hover:bg-white/90 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Download
                        </button>

                        {/* Delete button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                const job = generations?.find((g: any) => g.outputImagePath === selectedImage)
                                if (job) requestDelete(job)
                            }}
                            className="absolute top-4 left-32 px-4 py-2 bg-red-600 text-white rounded-full text-sm font-medium flex items-center gap-2 hover:bg-red-700 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </button>

                        {/* Image */}
                        <motion.img
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            src={selectedImage}
                            alt="Full size generation"
                            className="max-w-full max-h-[90vh] object-contain rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete confirm modal */}
            <AnimatePresence>
                {deleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4"
                        onClick={() => setDeleteConfirm(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="w-full max-w-md bg-white rounded-2xl border border-subtle overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6">
                                <h3 className="text-lg font-semibold text-charcoal mb-2">Delete this image?</h3>
                                <p className="text-sm text-charcoal/60 mb-4">
                                    This will permanently delete the generated image from your account.
                                </p>
                                {deleteConfirm.imageUrl ? (
                                    <div className="rounded-xl overflow-hidden border border-subtle mb-5">
                                        <img
                                            src={deleteConfirm.imageUrl}
                                            alt="To delete"
                                            className="w-full h-48 object-cover"
                                        />
                                    </div>
                                ) : null}
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setDeleteConfirm(null)}
                                        className="py-2.5 rounded-xl border border-subtle text-charcoal font-medium hover:bg-cream transition-colors"
                                        disabled={deleteMutation.isPending}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        className="py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-60"
                                        disabled={deleteMutation.isPending}
                                    >
                                        {deleteMutation.isPending ? (
                                            <span className="inline-flex items-center justify-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Deleting...
                                            </span>
                                        ) : (
                                            'Delete'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
