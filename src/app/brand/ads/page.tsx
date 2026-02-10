'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Camera,
  ShoppingBag,
  Image as ImageIcon,
  Sparkles,
  Upload,
  X,
  Check,
  Loader2,
  Lock,
  Instagram,
  Facebook,
  Globe,
  Users,
} from 'lucide-react'
import {
  AD_PRESETS,
  CTA_OPTIONS,
  TONE_OPTIONS,
  PLATFORM_OPTIONS,
  type AdPresetId,
  type Platform,
  type CtaType,
  type CaptionTone,
  validateAdInput,
} from '@/lib/ads/ad-styles'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface Campaign {
  id: string
  title: string
  status: 'draft' | 'active' | 'completed'
  mode?: 'SELF' | 'ASSISTED'
}

// ═══════════════════════════════════════════════════════════════
// ICON MAP
// ═══════════════════════════════════════════════════════════════

const PRESET_ICONS: Record<string, React.ReactNode> = {
  Camera: <Camera className="h-6 w-6" />,
  ShoppingBag: <ShoppingBag className="h-6 w-6" />,
  Image: <ImageIcon className="h-6 w-6" />,
  Sparkles: <Sparkles className="h-6 w-6" />,
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  Instagram: <Instagram className="h-4 w-4" />,
  Facebook: <Facebook className="h-4 w-4" />,
  Globe: <Globe className="h-4 w-4" />,
  Users: <Users className="h-4 w-4" />,
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function AdsPage() {
  const router = useRouter()

  // Form state
  const [selectedCampaign, setSelectedCampaign] = useState<string>('standalone')
  const [selectedPreset, setSelectedPreset] = useState<AdPresetId | null>(null)
  const [productImage, setProductImage] = useState<string>('')
  const [influencerImage, setInfluencerImage] = useState<string>('')
  const [lockFaceIdentity, setLockFaceIdentity] = useState(false)
  const [headline, setHeadline] = useState('')
  const [ctaType, setCtaType] = useState<CtaType>('shop_now')
  const [captionTone, setCaptionTone] = useState<CaptionTone | ''>('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['instagram'])

  // UI state
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(false)
  const [campaignsLoading, setCampaignsLoading] = useState(true)

  // Fetch campaigns on mount
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const res = await fetch('/api/campaigns')
        if (res.ok) {
          const data = await res.json()
          setCampaigns(data)
        }
      } catch (error) {
        console.error('Failed to fetch campaigns:', error)
      } finally {
        setCampaignsLoading(false)
      }
    }
    fetchCampaigns()
  }, [])

  // Get selected campaign details
  const selectedCampaignData = campaigns.find(c => c.id === selectedCampaign)
  const isCampaignCompleted = selectedCampaignData?.status === 'completed'

  // Headline word count
  const headlineWords = headline.trim() ? headline.trim().split(/\s+/).length : 0
  const headlineExceeded = headlineWords > 6

  // Form validation
  const canSubmit =
    selectedPreset &&
    selectedPlatforms.length > 0 &&
    !isCampaignCompleted &&
    !headlineExceeded &&
    !loading

  // Image upload handler
  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'product' | 'influencer'
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image exceeds 10MB limit')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      if (type === 'product') {
        setProductImage(base64)
      } else {
        setInfluencerImage(base64)
        if (!base64) setLockFaceIdentity(false)
      }
    }
    reader.readAsDataURL(file)
  }

  // Platform toggle
  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }

  // Generate handler
  const handleGenerate = async () => {
    if (!selectedPreset) {
      toast.error('Please select an ad style')
      return
    }

    const input = {
      preset: selectedPreset,
      campaignId: selectedCampaign && selectedCampaign !== 'standalone' ? selectedCampaign : undefined,
      productImage: productImage || undefined,
      influencerImage: influencerImage || undefined,
      lockFaceIdentity,
      headline: headline || undefined,
      ctaType,
      captionTone: captionTone || undefined,
      platforms: selectedPlatforms,
    }

    const validation = validateAdInput(input as any)
    if (!validation.valid) {
      toast.error(validation.error)
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/ads/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 429) {
          toast.error(`Rate limit exceeded. ${data.resetTime ? `Try again in ${Math.ceil((data.resetTime - Date.now()) / 60000)} minutes.` : 'Try again later.'}`)
        } else {
          toast.error(data.error || 'Generation failed')
        }
        return
      }

      toast.success('Ad generated successfully!')
      router.push('/brand/ads/creatives')
    } catch (error) {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 pt-24 pb-12">
      {/* Decorative Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 max-w-4xl relative z-10">
        {/* Header */}
        <div className="mb-10">
          <p className="text-sm text-purple-400 mb-2">Ads → Create New Ad</p>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent mb-3">
            Create New Ad
          </h1>
          <p className="text-zinc-400">
            Create high-quality AI-powered ad creatives for your campaigns
          </p>
          <p className="text-sm text-zinc-500 mt-1">
            Optimized for Instagram, Facebook, Google & Influencer campaigns
          </p>
        </div>

        <div className="space-y-8">
          {/* Campaign Selector */}
          <section className="space-y-3">
            <Label className="text-base font-medium text-white">Campaign (Optional)</Label>
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger className="w-full h-12 bg-zinc-800/50 border-zinc-700 hover:border-purple-500/50 transition-colors">
                <SelectValue placeholder="Select a campaign or create standalone ad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standalone">Standalone Ad</SelectItem>
                {campaigns.map(campaign => (
                  <SelectItem
                    key={campaign.id}
                    value={campaign.id}
                    disabled={campaign.status === 'completed'}
                  >
                    <div className="flex items-center gap-2">
                      <span>{campaign.title}</span>
                      <Badge
                        variant={
                          campaign.status === 'active' ? 'default' :
                            campaign.status === 'draft' ? 'secondary' : 'outline'
                        }
                        className="text-xs capitalize"
                      >
                        {campaign.status}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isCampaignCompleted && (
              <p className="text-sm text-red-500">
                This campaign is completed. Select an active campaign to generate ads.
              </p>
            )}
          </section>

          {/* Ad Style Selector */}
          <section className="space-y-4">
            <Label className="text-base font-medium text-white">Ad Style</Label>
            <div className="grid grid-cols-2 gap-4">
              {AD_PRESETS.map(preset => (
                <Card
                  key={preset.id}
                  className={cn(
                    "cursor-pointer transition-all duration-300 relative overflow-hidden group border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm",
                    selectedPreset === preset.id
                      ? "ring-2 ring-purple-500 border-purple-500/50 shadow-lg shadow-purple-500/10"
                      : "hover:border-zinc-700 hover:bg-zinc-800/50"
                  )}
                  onClick={() => setSelectedPreset(preset.id as AdPresetId)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "p-3 rounded-xl transition-colors",
                        selectedPreset === preset.id
                          ? "bg-purple-500 text-white"
                          : "bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700"
                      )}>
                        {PRESET_ICONS[preset.icon]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white mb-1">
                          {preset.name}
                        </h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {preset.description}
                        </p>
                      </div>
                      {selectedPreset === preset.id && (
                        <div className="absolute top-3 right-3 bg-purple-500 text-white rounded-full p-1">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Image Inputs */}
          <section className="space-y-6">
            <Label className="text-base font-medium text-white">Images (Optional)</Label>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Product Image */}
              <div className="space-y-3">
                <Label className="text-sm text-zinc-600 dark:text-zinc-400">Product Image</Label>
                {productImage ? (
                  <div className="relative aspect-square rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
                    <img
                      src={productImage}
                      alt="Product"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => setProductImage('')}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-600 cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors bg-zinc-50 dark:bg-zinc-900/50">
                    <Upload className="h-8 w-8 text-zinc-400 mb-2" />
                    <span className="text-sm text-zinc-500">Upload product</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, 'product')}
                    />
                  </label>
                )}
                <p className="text-xs text-zinc-500">Used to ensure product accuracy</p>
              </div>

              {/* Influencer Image */}
              <div className="space-y-3">
                <Label className="text-sm text-zinc-600 dark:text-zinc-400">Model Reference</Label>
                {influencerImage ? (
                  <div className="relative aspect-square rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
                    <img
                      src={influencerImage}
                      alt="Model"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => {
                        setInfluencerImage('')
                        setLockFaceIdentity(false)
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-600 cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors bg-zinc-50 dark:bg-zinc-900/50">
                    <Upload className="h-8 w-8 text-zinc-400 mb-2" />
                    <span className="text-sm text-zinc-500">Upload model</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, 'influencer')}
                    />
                  </label>
                )}

                {/* Lock Face Toggle */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => influencerImage && setLockFaceIdentity(!lockFaceIdentity)}
                    disabled={!influencerImage}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
                      lockFaceIdentity
                        ? "bg-primary text-primary-foreground"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
                      !influencerImage && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Lock className="h-3 w-3" />
                    Lock face identity
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Text Controls */}
          <section className="space-y-6">
            <Label className="text-base font-medium text-white">Text Controls</Label>

            {/* Headline */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-zinc-600 dark:text-zinc-400">Headline</Label>
                <span className={cn(
                  "text-xs",
                  headlineExceeded ? "text-red-500" : "text-zinc-500"
                )}>
                  {headlineWords}/6 words
                </span>
              </div>
              <Input
                placeholder="e.g. New Season Drop"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className={cn(
                  "h-12 bg-zinc-800/50 border-zinc-700 hover:border-purple-500/50 transition-colors text-white placeholder:text-zinc-500",
                  headlineExceeded && "border-red-500 focus:ring-red-500"
                )}
              />
              {headlineExceeded && (
                <p className="text-xs text-red-500">Headline cannot exceed 6 words</p>
              )}
            </div>

            {/* CTA */}
            <div className="space-y-2">
              <Label className="text-sm text-zinc-600 dark:text-zinc-400">Call to Action</Label>
              <Select value={ctaType} onValueChange={(v) => setCtaType(v as CtaType)}>
                <SelectTrigger className="w-full h-12 bg-zinc-800/50 border-zinc-700 hover:border-purple-500/50 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CTA_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Caption Tone */}
            <div className="space-y-3">
              <Label className="text-sm text-zinc-600 dark:text-zinc-400">Caption Tone (Optional)</Label>
              <div className="flex flex-wrap gap-2">
                {TONE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setCaptionTone(captionTone === opt.value ? '' : opt.value)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                      captionTone === opt.value
                        ? "bg-purple-500 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Platform Selection */}
          <section className="space-y-4">
            <Label className="text-base font-medium text-white">Platforms</Label>
            <div className="flex flex-wrap gap-3">
              {PLATFORM_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => togglePlatform(opt.value)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                    selectedPlatforms.includes(opt.value)
                      ? "bg-purple-500 text-white shadow-lg shadow-purple-500/20"
                      : "bg-zinc-800 border border-zinc-700 text-zinc-400 hover:border-zinc-600"
                  )}
                >
                  {PLATFORM_ICONS[opt.icon]}
                  {opt.label}
                  {selectedPlatforms.includes(opt.value) && (
                    <Check className="h-3 w-3 ml-1" />
                  )}
                </button>
              ))}
            </div>
            {selectedPlatforms.length === 0 && (
              <p className="text-sm text-red-500">Select at least one platform</p>
            )}
          </section>

          {/* Generate Button */}
          <section className="pt-4">
            <Button
              onClick={handleGenerate}
              disabled={!canSubmit}
              size="lg"
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-lg shadow-purple-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Generating (15-30 sec)
                </>
              ) : (
                'Generate Ad'
              )}
            </Button>
            {isCampaignCompleted && (
              <p className="text-sm text-center text-zinc-500 mt-2">
                Cannot generate ads for completed campaigns
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
