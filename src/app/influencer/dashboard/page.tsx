'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Camera,
  ShoppingBag,
  Users,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Star,
  X,
  Download,
  Share2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useUser, useGenerations } from '@/lib/react-query/hooks'
import { ShareModal } from '@/components/tryon/ShareModal'
import { toast } from 'sonner'
import { createClient } from '@/lib/auth-client'

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
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

export default function InfluencerDashboard() {
  const router = useRouter()
  const { data: user } = useUser()
  const { data: generations, isLoading: generationsLoading } = useGenerations()
  const [approvalChecked, setApprovalChecked] = useState(false)

  // NOTE: hooks must be declared unconditionally (before any early returns)
  const [selectedGeneration, setSelectedGeneration] = useState<any>(null)
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null)
  const [shareImageBase64, setShareImageBase64] = useState<string | undefined>(undefined)

  // Check influencer approval status and onboarding completion
  // CRITICAL: Server-side checks are primary, but this provides client-side validation
  useEffect(() => {
    async function checkStatus() {
      if (!user?.id) return

      try {
        // First check onboarding completion
        const onboardingRes = await fetch('/api/onboarding/influencer')
        const onboardingData = await onboardingRes.json()
        
        // DEFENSIVE: Assert valid state
        if (!onboardingData.onboardingCompleted) {
          // Redirect to onboarding if not completed
          router.replace('/onboarding/influencer')
          return
        }

        // Then check approval status
        const supabase = createClient()
        const { data: application } = await supabase
          .from('influencer_applications')
          .select('status')
          .eq('user_id', user.id)
          .maybeSingle()

        // DEFENSIVE: If approvalStatus exists but onboarding is not completed, this is invalid
        if (application && !onboardingData.onboardingCompleted) {
          console.error('INVALID STATE: approvalStatus exists but onboardingCompleted = false')
          // Redirect to onboarding to fix the state
          router.replace('/onboarding/influencer')
          return
        }

        if (!application || application.status !== 'approved') {
          // Redirect to pending page if not approved
          router.replace('/influencer/pending')
          return
        }

        setApprovalChecked(true)
      } catch (error) {
        console.error('Error checking status:', error)
        // On error, allow access (fail open) - server-side checks are primary
        setApprovalChecked(true)
      }
    }

    if (user?.id && user?.role === 'INFLUENCER') {
      checkStatus()
    }
  }, [user?.id, user?.role, router])

  // Show loading while checking approval
  if (!approvalChecked && user?.role === 'INFLUENCER') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-peach border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-charcoal/60">Checking approval status...</p>
        </div>
      </div>
    )
  }

  const completedGenerations = generations?.filter((g: any) => g.outputImagePath) || []
  const generationsCount = generationsLoading ? '...' : completedGenerations.length

  // Stats data
  const stats = [
    { label: 'Try-Ons Generated', value: generationsCount, icon: Sparkles, color: 'bg-peach/20 text-peach' },
    { label: 'Portfolio Items', value: 0, icon: Camera, color: 'bg-blue-100 text-blue-600' },
    { label: 'Collaborations', value: 0, icon: Users, color: 'bg-green-100 text-green-600' },
    { label: 'Profile Views', value: 0, icon: TrendingUp, color: 'bg-purple-100 text-purple-600' },
  ]

  // Quick Actions
  const quickActions = [
    {
      title: 'Try-On Studio',
      description: 'Create stunning virtual try-ons with AI',
      icon: Camera,
      href: '/influencer/try-on',
      primary: true,
    },
    {
      title: 'Browse Marketplace',
      description: 'Discover products from top brands',
      icon: ShoppingBag,
      href: '/marketplace',
    },
    {
      title: 'View Portfolio',
      description: 'Manage your creative portfolio',
      icon: Star,
      href: '/profile',
    },
    {
      title: 'Collaborations',
      description: 'Check brand collaboration requests',
      icon: Users,
      href: '/influencer/collaborations',
    },
  ]

  const handleDownload = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `tria-generation-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('Image downloaded!')
    } catch (error) {
      toast.error('Failed to download image')
    }
  }

  const handleShare = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const reader = new FileReader()
      reader.onloadend = () => {
        setShareImageBase64(reader.result as string)
        setShareImageUrl(imageUrl)
        setShareModalOpen(true)
      }
      reader.readAsDataURL(blob)
    } catch (error) {
      toast.error('Failed to prepare image for sharing')
    }
  }

  // Get all variants for a generation (main + variants if available) 
  const getGenerationVariants = (generation: any) => {
    const variants: { url: string; label: string }[] = []
    const mainUrl = generation.outputImagePath

    if (!mainUrl) return [{ url: '', label: 'Result' }]

    // Check if the URL follows the variant pattern (_vA.png, _vB.png, _vC.png)
    // Storage pattern: .../{jobId}_vA.png, .../{jobId}_vB.png, .../{jobId}_vC.png
    if (mainUrl.includes('_vA.')) {
      // This is variant A - derive B and C
      const baseUrl = mainUrl.replace('_vA.', '_vX.')
      variants.push({ url: mainUrl, label: 'Option 1' })
      variants.push({ url: baseUrl.replace('_vX.', '_vB.'), label: 'Option 2' })
      variants.push({ url: baseUrl.replace('_vX.', '_vC.'), label: 'Option 3' })
    } else if (mainUrl.includes('_vB.')) {
      const baseUrl = mainUrl.replace('_vB.', '_vX.')
      variants.push({ url: baseUrl.replace('_vX.', '_vA.'), label: 'Option 1' })
      variants.push({ url: mainUrl, label: 'Option 2' })
      variants.push({ url: baseUrl.replace('_vX.', '_vC.'), label: 'Option 3' })
    } else if (mainUrl.includes('_vC.')) {
      const baseUrl = mainUrl.replace('_vC.', '_vX.')
      variants.push({ url: baseUrl.replace('_vX.', '_vA.'), label: 'Option 1' })
      variants.push({ url: baseUrl.replace('_vX.', '_vB.'), label: 'Option 2' })
      variants.push({ url: mainUrl, label: 'Option 3' })
    } else {
      // Not a variant pattern - just show the single image
      variants.push({ url: mainUrl, label: 'Result' })

      // Check for variants in settings.variants (legacy support)
      const settings = generation.settings as any
      if (settings?.variants && Array.isArray(settings.variants)) {
        settings.variants.forEach((v: any) => {
          const variantUrl = v.imageUrl || v.outputImagePath || v.url
          if (variantUrl && variantUrl !== mainUrl) {
            variants.push({ url: variantUrl, label: `Option ${variants.length + 1}` })
          }
        })
      }
    }

    return variants
  }

  const openVariantViewer = (generation: any) => {
    setSelectedGeneration(generation)
    setSelectedVariantIndex(0)
  }

  const closeVariantViewer = () => {
    setSelectedGeneration(null)
    setSelectedVariantIndex(0)
  }

  const navigateVariant = (direction: 'prev' | 'next') => {
    if (!selectedGeneration) return
    const variants = getGenerationVariants(selectedGeneration)
    if (direction === 'prev') {
      setSelectedVariantIndex((prev) => (prev > 0 ? prev - 1 : variants.length - 1))
    } else {
      setSelectedVariantIndex((prev) => (prev < variants.length - 1 ? prev + 1 : 0))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream via-cream to-white pt-20 sm:pt-24 pb-16">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="mb-8 sm:mb-10"
        >
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-charcoal mb-2">
            Welcome Back, <span className="italic text-charcoal/80">{user?.name || 'Creator'}</span>
          </h1>
          <p className="text-sm sm:text-base text-charcoal/50">
            Here&apos;s What&apos;s Happening With Your Account Today.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-10"
        >
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.label}
                variants={cardVariants}
                whileHover={{ y: -4, scale: 1.02 }}
                className="bg-white rounded-2xl p-5 sm:p-6 border border-charcoal/5 shadow-sm hover:shadow-lg transition-all duration-300"
              >
                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <p className="text-3xl sm:text-4xl font-serif font-bold text-charcoal mb-1">{stat.value}</p>
                <p className="text-xs sm:text-sm text-charcoal/50">{stat.label}</p>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8 sm:mb-12"
        >
          <h2 className="text-xl sm:text-2xl font-serif text-charcoal mb-4 sm:mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon
              return (
                <motion.div
                  key={action.href}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    href={action.href}
                    className={`group relative block overflow-hidden rounded-2xl p-5 sm:p-6 transition-all duration-300 h-full ${action.primary
                      ? 'bg-gradient-to-br from-peach to-orange-300 text-charcoal shadow-lg shadow-peach/20 hover:shadow-xl hover:shadow-peach/30'
                      : 'bg-white border border-charcoal/5 text-charcoal hover:border-charcoal/15 hover:shadow-lg'
                      }`}
                  >
                    <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl ${action.primary ? 'bg-white/40' : 'bg-cream'} flex items-center justify-center mb-3`}>
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <h3 className="font-semibold text-sm sm:text-base mb-1">{action.title}</h3>
                    <p className={`text-xs sm:text-sm line-clamp-2 ${action.primary ? 'text-charcoal/70' : 'text-charcoal/50'}`}>
                      {action.description}
                    </p>
                    <ArrowRight className="absolute bottom-5 right-5 w-4 h-4 sm:w-5 sm:h-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Recent Generations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-serif text-charcoal">Recent Generations</h2>
            <Link
              href="/influencer/generations"
              className="text-sm text-charcoal/50 hover:text-charcoal flex items-center gap-1 transition-colors group"
            >
              View all
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {completedGenerations.length > 0 ? (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5"
            >
              {completedGenerations.slice(0, 6).map((job: any) => (
                <motion.div
                  key={job.id}
                  variants={cardVariants}
                  whileHover={{ y: -6 }}
                  className="group bg-white rounded-2xl overflow-hidden border border-charcoal/5 shadow-sm hover:shadow-xl hover:border-charcoal/10 transition-all duration-500 cursor-pointer"
                  onClick={() => openVariantViewer(job)}
                >
                  {/* Image Container */}
                  <div className="aspect-[3/4] overflow-hidden relative">
                    <motion.img
                      src={job.outputImagePath}
                      alt={`Generation ${job.id.slice(0, 8)}`}
                      className="w-full h-full object-cover"
                      whileHover={{ scale: 1.08 }}
                      transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* View variants hint */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      whileHover={{ opacity: 1, y: 0 }}
                      className="absolute bottom-3 left-3 right-3 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
                    >
                      <span className="px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-full text-xs font-medium text-charcoal shadow-lg">
                        Click to view all variants
                      </span>
                    </motion.div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <p className="text-sm font-medium text-charcoal/70 mb-1">
                      Generation #{job.id.slice(0, 8)}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-charcoal/40">Status:</span>
                      <span className={`text-xs font-medium ${job.status?.toLowerCase() === 'completed' || job.status?.toLowerCase() === 'complete'
                        ? 'text-emerald-600'
                        : 'text-amber-600'
                        }`}>
                        {job.status?.toLowerCase() === 'completed' || job.status?.toLowerCase() === 'complete'
                          ? 'Completed'
                          : job.status}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-charcoal/10 p-12 text-center">
              <Sparkles className="w-16 h-16 text-charcoal/15 mx-auto mb-4" />
              <h3 className="text-xl font-serif text-charcoal mb-2">No generations yet</h3>
              <p className="text-charcoal/50 mb-6">Start creating stunning virtual try-ons with AI</p>
              <Link
                href="/influencer/try-on"
                className="inline-flex items-center gap-2 px-6 py-3 bg-charcoal text-cream rounded-full font-medium hover:bg-charcoal/90 transition-colors shadow-lg shadow-charcoal/20"
              >
                <Camera className="w-5 h-5" />
                Start Generating
              </Link>
            </div>
          )}
        </motion.div>
      </div>

      {/* Variant Viewer Modal */}
      <AnimatePresence>
        {selectedGeneration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex flex-col"
            onClick={closeVariantViewer}
          >
            {/* Large Floating Back Button - Below navbar */}
            <motion.button
              onClick={closeVariantViewer}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="fixed top-20 left-4 z-[120] flex items-center gap-2 px-5 py-3 bg-white text-charcoal rounded-full font-semibold shadow-2xl hover:shadow-xl transition-all border border-charcoal/10"
            >
              <ArrowLeft className="w-5 h-5" />
              ← Back
            </motion.button>
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Left side - Back button + Actions */}
              <div className="flex items-center gap-3">
                <motion.button
                  onClick={closeVariantViewer}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </motion.button>
                <motion.button
                  onClick={() => handleDownload(getGenerationVariants(selectedGeneration)[selectedVariantIndex]?.url)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white text-charcoal rounded-full text-sm font-medium shadow-lg"
                >
                  <Download className="w-4 h-4" />
                  Download
                </motion.button>
                <motion.button
                  onClick={() => handleShare(getGenerationVariants(selectedGeneration)[selectedVariantIndex]?.url)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-peach text-white rounded-full text-sm font-medium shadow-lg"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </motion.button>
              </div>

              <div className="text-center">
                <span className="text-white/60 text-xs">Generation</span>
                <p className="text-white font-mono text-sm">#{selectedGeneration.id.slice(0, 8)}</p>
              </div>

              <motion.button
                onClick={closeVariantViewer}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </motion.div>

            {/* Main Image Display */}
            <div className="flex-1 flex items-center justify-center p-4 sm:p-8 relative" onClick={(e) => e.stopPropagation()}>
              {/* Navigation Arrows */}
              {getGenerationVariants(selectedGeneration).length > 1 && (
                <>
                  <motion.button
                    onClick={() => navigateVariant('prev')}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="absolute left-4 sm:left-8 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white z-10"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </motion.button>
                  <motion.button
                    onClick={() => navigateVariant('next')}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="absolute right-4 sm:right-8 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white z-10"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </motion.button>
                </>
              )}

              <motion.img
                key={selectedVariantIndex}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                src={getGenerationVariants(selectedGeneration)[selectedVariantIndex]?.url}
                alt="Generated image"
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl"
                draggable={false}
              />
            </div>

            {/* Variant Thumbnails */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-4 sm:px-6 py-4 border-t border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-center gap-4">
                {getGenerationVariants(selectedGeneration).map((variant: any, idx: number) => (
                  <motion.button
                    key={idx}
                    onClick={() => setSelectedVariantIndex(idx)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all ${selectedVariantIndex === idx
                      ? 'border-peach ring-2 ring-peach/30'
                      : 'border-white/20 hover:border-white/40'
                      }`}
                  >
                    <img
                      src={variant.url}
                      alt={variant.label}
                      className="w-20 h-28 sm:w-24 sm:h-32 object-cover"
                    />
                    <div className={`absolute bottom-0 left-0 right-0 py-1.5 text-center text-[10px] font-medium ${selectedVariantIndex === idx
                      ? 'bg-peach text-white'
                      : 'bg-black/60 text-white/80'
                      }`}>
                      {variant.label}
                    </div>
                  </motion.button>
                ))}
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
    </div>
  )
}
