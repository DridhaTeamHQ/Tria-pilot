'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Instagram, Youtube, Twitter, MessageCircle, Image as ImageIcon, FileText, Send, Copy, Check, Link as LinkIcon } from 'lucide-react'
import { toast } from 'sonner'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  imageBase64?: string
  productId?: string // Optional product ID for link tracking
}

type Platform = 'instagram' | 'tiktok' | 'youtube' | 'twitter'
type ShareType = 'story' | 'post' | 'chat'

const PLATFORMS: Array<{ id: Platform; name: string; icon: any; color: string }> = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'from-purple-500 via-pink-500 to-orange-500' },
  { id: 'tiktok', name: 'TikTok', icon: null, color: 'from-black to-gray-900' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'from-red-600 to-red-700' },
  { id: 'twitter', name: 'Twitter/X', icon: Twitter, color: 'from-black to-gray-800' },
]

const SHARE_TYPES: Array<{ id: ShareType; name: string; icon: any; description: string }> = [
  { id: 'story', name: 'Story', icon: ImageIcon, description: 'Share as Instagram Story' },
  { id: 'post', name: 'Post', icon: FileText, description: 'Share as Feed Post' },
  { id: 'chat', name: 'Chat/DM', icon: MessageCircle, description: 'Send via Direct Message' },
]

export function ShareModal({ isOpen, onClose, imageUrl, imageBase64, productId }: ShareModalProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  const [selectedShareType, setSelectedShareType] = useState<ShareType | null>(null)
  const [sharing, setSharing] = useState(false)
  const [maskedLink, setMaskedLink] = useState<string | null>(null)
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  // Helper function to shorten URL for display
  const shortenUrl = (url: string | null): string => {
    if (!url) return ''
    try {
      const urlObj = new URL(url)
      const domain = urlObj.hostname.replace('www.', '')
      const path = urlObj.pathname
      const full = `${domain}${path}`
      if (full.length <= 35) return full
      return `${full.substring(0, 32)}...`
    } catch {
      return url.length > 35 ? `${url.substring(0, 32)}...` : url
    }
  }

  // Fetch or create masked link when productId is provided
  useEffect(() => {
    if (isOpen && productId && !maskedLink) {
      setLinkLoading(true)
      fetch(`/api/links/product/${productId}`, {
        credentials: 'include',
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.maskedUrl) {
            setMaskedLink(data.maskedUrl)
            setOriginalUrl(data.originalUrl || null)
            // Auto-copy masked link to clipboard
            navigator.clipboard.writeText(data.maskedUrl).then(() => {
              setLinkCopied(true)
              toast.success('Product link copied! Share it with your image')
              setTimeout(() => setLinkCopied(false), 3000)
            })
          }
        })
        .catch((error) => {
          console.error('Failed to fetch masked link:', error)
        })
        .finally(() => {
          setLinkLoading(false)
        })
    }
  }, [isOpen, productId, maskedLink])

  const handleCopyLink = async () => {
    if (!maskedLink) return
    try {
      await navigator.clipboard.writeText(maskedLink)
      setLinkCopied(true)
      toast.success('Link copied to clipboard!')
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  const handleShare = async () => {
    if (!selectedPlatform || !selectedShareType) {
      toast.error('Please select a platform and share type')
      return
    }

    setSharing(true)

    try {
      // Convert image to blob for sharing
      let imageBlob: Blob | null = null

      if (imageBase64) {
        const base64Data = imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
        const response = await fetch(base64Data)
        imageBlob = await response.blob()
      } else if (imageUrl) {
        const response = await fetch(imageUrl)
        imageBlob = await response.blob()
      }

      if (!imageBlob) {
        throw new Error('Failed to load image')
      }

      // Detect device type
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
      const isAndroid = /Android/i.test(navigator.userAgent)
      
      // For Instagram Stories specifically, use platform-specific methods
      if (selectedPlatform === 'instagram' && selectedShareType === 'story') {
        if (isMobile) {
          // Strategy: Use Web Share API first (most reliable), then try deep links
          
          // Method 1: Web Share API (works best - opens native share sheet)
          if (navigator.share && navigator.canShare) {
            const file = new File([imageBlob], 'tria-tryon.jpg', { type: 'image/jpeg' })
            
            if (navigator.canShare({ files: [file] })) {
              try {
                await navigator.share({
                  files: [file],
                  title: 'Check out my virtual try-on!',
                  text: 'Created with TRIA Virtual Try-On Studio',
                })
                toast.success('Share menu opened!')
                toast.info('Select Instagram Stories from the options')
                onClose()
                setSelectedPlatform(null)
                setSelectedShareType(null)
                setSharing(false)
                return
              } catch (shareError: any) {
                // User cancelled - don't show error, just return
                if (shareError.name === 'AbortError') {
                  setSharing(false)
                  return
                }
                console.warn('Web Share API failed:', shareError)
                // Continue to deep link methods
              }
            }
          }
          
          // Method 2: Try Instagram Stories deep links
          // Download image first (user will need it if deep link doesn't work)
          const downloadLink = document.createElement('a')
          const blobUrl = URL.createObjectURL(imageBlob)
          downloadLink.href = blobUrl
          downloadLink.download = `tria-tryon-${Date.now()}.jpg`
          document.body.appendChild(downloadLink)
          downloadLink.click()
          document.body.removeChild(downloadLink)
          URL.revokeObjectURL(blobUrl)
          
          if (isIOS) {
            // iOS: Try Instagram Stories URL scheme
            // Note: Instagram Stories on iOS uses pasteboard, which web browsers can't access
            // So we can only try to open the app, user will need to paste the image
            
            // Try multiple URL schemes
            const schemes = [
              'instagram-stories://share',
              'instagram://stories/create',
              'instagram://camera',
            ]
            
            let schemeIndex = 0
            const tryNextScheme = () => {
              if (schemeIndex < schemes.length) {
                const scheme = schemes[schemeIndex]
                schemeIndex++
                
                // Create hidden link to trigger deep link
                const link = document.createElement('a')
                link.href = scheme
                link.style.display = 'none'
                document.body.appendChild(link)
                link.click()
                
                // Remove link after a moment
                setTimeout(() => {
                  if (document.body.contains(link)) {
                    document.body.removeChild(link)
                  }
                }, 100)
                
                // Try next scheme after delay
                if (schemeIndex < schemes.length) {
                  setTimeout(tryNextScheme, 300)
                }
              }
            }
            
            tryNextScheme()
            
            toast.success('Opening Instagram Stories...')
            toast.info('If Instagram opens, paste the downloaded image. Otherwise, create a story manually.')
            
            setTimeout(() => {
              onClose()
              setSelectedPlatform(null)
              setSelectedShareType(null)
            }, 2000)
            setSharing(false)
            return
          } else if (isAndroid) {
            // Android: Use Intent URL
            try {
              // Android Intent for sharing to Instagram Stories
              // This should open Instagram with the share intent
              const intentUrl = `intent://share#Intent;action=android.intent.action.SEND;type=image/jpeg;package=com.instagram.android;component=com.instagram.android/.activity.ShareActivity;S.android.intent.extra.TEXT=Created with TRIA Virtual Try-On Studio;end`
              
              // Try intent first
              window.location.href = intentUrl
              
              // Fallback to regular deep link
              setTimeout(() => {
                window.location.href = 'instagram://stories/create'
              }, 500)
              
              toast.success('Opening Instagram Stories...')
              toast.info('Select "Your Story" when Instagram opens')
              
              setTimeout(() => {
                onClose()
                setSelectedPlatform(null)
                setSelectedShareType(null)
              }, 2000)
              setSharing(false)
              return
            } catch (e) {
              console.warn('Android intent failed:', e)
            }
          }
          
          // Final fallback: Just download and show instructions
          toast.success('Image downloaded!')
          toast.info('Open Instagram app → Tap + → Select Story → Choose the downloaded image')
          
          setTimeout(() => {
            onClose()
            setSelectedPlatform(null)
            setSelectedShareType(null)
          }, 3000)
          setSharing(false)
          return
        } else {
          // Desktop: Can't create Stories (mobile-only feature)
          const downloadLink = document.createElement('a')
          const blobUrl = URL.createObjectURL(imageBlob)
          downloadLink.href = blobUrl
          downloadLink.download = `tria-tryon-${Date.now()}.jpg`
          document.body.appendChild(downloadLink)
          downloadLink.click()
          document.body.removeChild(downloadLink)
          URL.revokeObjectURL(blobUrl)
          
          toast.success('Image downloaded!')
          toast.info('Instagram Stories can only be created on mobile. Please use the Instagram app on your phone.')
          
          setTimeout(() => {
            onClose()
            setSelectedPlatform(null)
            setSelectedShareType(null)
          }, 3000)
          setSharing(false)
          return
        }
      }
      
      // Use Web Share API for other platforms (mobile)
      if (isMobile && navigator.share && navigator.canShare) {
        const file = new File([imageBlob], 'tria-tryon.jpg', { type: 'image/jpeg' })
        
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'Check out my virtual try-on!',
              text: 'Created with TRIA Virtual Try-On Studio',
            })
            toast.success('Opening share options...')
            onClose()
            setSelectedPlatform(null)
            setSelectedShareType(null)
            setSharing(false)
            return
          } catch (shareError: any) {
            // User cancelled - don't show error, just return
            if (shareError.name === 'AbortError') {
              setSharing(false)
              return
            }
            console.warn('Web Share API failed:', shareError)
          }
        }
      }

      // Download image automatically for all platforms
      const downloadLink = document.createElement('a')
      const blobUrl = URL.createObjectURL(imageBlob)
      downloadLink.href = blobUrl
      downloadLink.download = `tria-tryon-${Date.now()}.jpg`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
      URL.revokeObjectURL(blobUrl)

      // Platform-specific sharing URLs and methods (for non-Story Instagram and other platforms)
      if (selectedPlatform === 'instagram') {
        if (selectedShareType === 'post') {
          window.open('https://www.instagram.com/create/select/', '_blank')
        } else if (selectedShareType === 'chat') {
          window.open('https://www.instagram.com/direct/inbox/', '_blank')
        }
        // Story is already handled above with early return
      } else if (selectedPlatform === 'tiktok') {
        // TikTok upload page
        window.open('https://www.tiktok.com/upload', '_blank')
      } else if (selectedPlatform === 'youtube') {
        // YouTube Studio for uploads
        window.open('https://studio.youtube.com/', '_blank')
      } else if (selectedPlatform === 'twitter') {
        // Twitter compose (can't directly attach image via URL, but opens compose)
        window.open('https://twitter.com/compose/tweet', '_blank')
      }

      const platformName = PLATFORMS.find(p => p.id === selectedPlatform)?.name || 'platform'
      const shareTypeName = SHARE_TYPES.find(t => t.id === selectedShareType)?.name || 'share'
      
      toast.success(`Image downloaded! Opening ${platformName} ${shareTypeName}...`)
      toast.info('Upload the downloaded image to share it')
      
      setTimeout(() => {
        onClose()
        setSelectedPlatform(null)
        setSelectedShareType(null)
      }, 2000)
    } catch (error) {
      console.error('Share error:', error)
      toast.error('Failed to share. Please try downloading and sharing manually.')
    } finally {
      setSharing(false)
    }
  }

  const handleClose = () => {
    setSelectedPlatform(null)
    setSelectedShareType(null)
    setMaskedLink(null)
    setLinkCopied(false)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-charcoal/10 p-6 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-2xl font-serif text-charcoal">Share to Social Media</h2>
                  <p className="text-sm text-charcoal/60 mt-1">Choose a platform and share type</p>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-charcoal/5 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-charcoal/60" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Product Link Section - Show if productId is provided */}
                {productId && (
                  <div className="bg-cream/50 rounded-xl p-4 border border-charcoal/10">
                    <div className="flex items-center gap-2 mb-2">
                      <LinkIcon className="w-4 h-4 text-charcoal/60" />
                      <span className="text-sm font-medium text-charcoal">Product Link</span>
                    </div>
                    {linkLoading ? (
                      <div className="flex items-center gap-2 text-sm text-charcoal/50">
                        <div className="w-4 h-4 border-2 border-charcoal/20 border-t-charcoal/60 rounded-full animate-spin" />
                        Generating link...
                      </div>
                    ) : maskedLink ? (
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-white px-2 py-1.5 rounded border border-charcoal/10 text-charcoal/70 font-mono truncate">
                          {originalUrl ? shortenUrl(originalUrl) : maskedLink}
                        </code>
                        <button
                          onClick={handleCopyLink}
                          className="p-1.5 hover:bg-charcoal/5 rounded transition-colors"
                          title="Copy tracked link"
                        >
                          {linkCopied ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-charcoal/50" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-charcoal/50">Failed to generate link</p>
                    )}
                    <p className="text-xs text-charcoal/40 mt-2">
                      This link is automatically copied. Share it with your image!
                    </p>
                  </div>
                )}

                {/* Platform Selection */}
                {!selectedPlatform ? (
                  <>
                    <div>
                      <h3 className="text-lg font-semibold text-charcoal mb-4">Select Platform</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {PLATFORMS.map((platform) => {
                          const Icon = platform.icon
                          return (
                            <button
                              key={platform.id}
                              onClick={() => setSelectedPlatform(platform.id)}
                              className="group relative p-6 rounded-2xl border-2 border-charcoal/10 hover:border-charcoal/30 transition-all overflow-hidden"
                            >
                              <div className={`absolute inset-0 bg-gradient-to-br ${platform.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                              <div className="relative z-10 flex flex-col items-center gap-3">
                                {Icon ? (
                                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${platform.color} flex items-center justify-center`}>
                                    <Icon className="w-6 h-6 text-white" />
                                  </div>
                                ) : (
                                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${platform.color} flex items-center justify-center`}>
                                    <span className="text-white font-bold text-sm">TT</span>
                                  </div>
                                )}
                                <span className="font-medium text-charcoal">{platform.name}</span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Back Button */}
                    <button
                      onClick={() => setSelectedPlatform(null)}
                      className="flex items-center gap-2 text-sm text-charcoal/60 hover:text-charcoal transition-colors mb-4"
                    >
                      <X className="w-4 h-4" />
                      Back to Platforms
                    </button>

                    {/* Share Type Selection */}
                    {!selectedShareType ? (
                      <div>
                        <h3 className="text-lg font-semibold text-charcoal mb-4">
                          How do you want to share on {PLATFORMS.find(p => p.id === selectedPlatform)?.name}?
                        </h3>
                        <div className="grid gap-3">
                          {SHARE_TYPES.map((type) => {
                            const Icon = type.icon
                            return (
                              <button
                                key={type.id}
                                onClick={() => setSelectedShareType(type.id)}
                                className="group p-4 rounded-xl border-2 border-charcoal/10 hover:border-peach/50 transition-all text-left"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-xl bg-peach/10 group-hover:bg-peach/20 flex items-center justify-center transition-colors">
                                    <Icon className="w-6 h-6 text-peach" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-semibold text-charcoal">{type.name}</div>
                                    <div className="text-sm text-charcoal/60">{type.description}</div>
                                  </div>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Confirmation */}
                        <div className="text-center space-y-4">
                          <div className="w-20 h-20 mx-auto rounded-full bg-peach/10 flex items-center justify-center">
                            <Send className="w-10 h-10 text-peach" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-charcoal">
                              Share as {SHARE_TYPES.find(t => t.id === selectedShareType)?.name}
                            </h3>
                            <p className="text-sm text-charcoal/60 mt-1">
                              on {PLATFORMS.find(p => p.id === selectedPlatform)?.name}
                            </p>
                          </div>
                          <div className="bg-cream/50 rounded-xl p-4 text-sm text-charcoal/70">
                            <p>
                              Your image will be downloaded, and {PLATFORMS.find(p => p.id === selectedPlatform)?.name} will open in a new tab.
                              Please upload the downloaded image to share it.
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4">
                          <button
                            onClick={() => setSelectedShareType(null)}
                            className="flex-1 px-6 py-3 rounded-full border border-charcoal/10 text-charcoal hover:bg-charcoal/5 transition-colors font-medium"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleShare}
                            disabled={sharing}
                            className="flex-1 px-6 py-3 rounded-full bg-charcoal text-cream hover:bg-peach transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {sharing ? (
                              <>
                                <div className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" />
                                Sharing...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                Share Now
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

