'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  Lock,
  Instagram,
  Facebook,
  Globe,
  Users,
  Smartphone,
  Zap,
  MessageCircle,
  Shirt,
  Heart,
  MapPin,
  Star,
  Wand2,
  Film,
  Type,
  Palette,
  Box,
  CloudLightning,
  PartyPopper,
  Crown,
  Cat,
  User,
  Ban,
  Download,
  RefreshCw,
  Share2,
  ChevronDown,
  ChevronUp,
  BookOpen,
} from 'lucide-react'
import {
  AD_PRESETS,
  AD_PRESET_CATEGORIES,
  CTA_OPTIONS,
  TONE_OPTIONS,
  PLATFORM_OPTIONS,
  CHARACTER_OPTIONS,
  ANIMAL_OPTIONS,
  CHARACTER_STYLE_OPTIONS,
  FONT_STYLE_OPTIONS,
  TEXT_PLACEMENT_OPTIONS,
  getPresetsByCategory,
  validateAdInput,
  type AdPresetId,
  type AdPresetCategory,
  type Platform,
  type CtaType,
  type CaptionTone,
  type CharacterType,
  type FontStyle,
  type TextPlacement,
} from '@/lib/ads/ad-styles'
import { cn } from '@/lib/utils'
import {
  staggerContainer,
  staggerItem,
  cardHover,
  pageVariants,
  imageRevealVariants,
} from '@/lib/animations'
import BrutalCard from '@/components/brutal/BrutalCard'
import { BrutalLoader } from '@/components/ui/BrutalLoader'

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface Campaign {
  id: string
  title: string
  status: 'draft' | 'active' | 'completed'
  mode?: 'SELF' | 'ASSISTED'
}

interface GenerationResult {
  id: string
  imageUrl: string
  imageBase64?: string
  copy: any[]
  rating: any
  qualityScore: number
  preset: string
  promptUsed: string
}

// ═══════════════════════════════════════════════════════════════
// ICON MAPPING
// ═══════════════════════════════════════════════════════════════

const ICON_MAP: Record<string, React.ReactNode> = {
  Camera: <Camera className="h-5 w-5" />,
  ShoppingBag: <ShoppingBag className="h-5 w-5" />,
  Image: <ImageIcon className="h-5 w-5" />,
  Sparkles: <Sparkles className="h-5 w-5" />,
  Smartphone: <Smartphone className="h-5 w-5" />,
  Zap: <Zap className="h-5 w-5" />,
  MessageCircle: <MessageCircle className="h-5 w-5" />,
  Shirt: <Shirt className="h-5 w-5" />,
  Heart: <Heart className="h-5 w-5" />,
  MapPin: <MapPin className="h-5 w-5" />,
  Star: <Star className="h-5 w-5" />,
  Wand2: <Wand2 className="h-5 w-5" />,
  Film: <Film className="h-5 w-5" />,
  Type: <Type className="h-5 w-5" />,
  Palette: <Palette className="h-5 w-5" />,
  Box: <Box className="h-5 w-5" />,
  CloudLightning: <CloudLightning className="h-5 w-5" />,
  PartyPopper: <PartyPopper className="h-5 w-5" />,
  Crown: <Crown className="h-5 w-5" />,
  BookOpen: <BookOpen className="h-5 w-5" />,
  User: <User className="h-5 w-5" />,
  Cat: <Cat className="h-5 w-5" />,
  Ban: <Ban className="h-5 w-5" />,
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
  // ── Form state ──
  const [selectedCampaign, setSelectedCampaign] = useState<string>('standalone')
  const [selectedPreset, setSelectedPreset] = useState<AdPresetId | null>(null)
  const [activeCategory, setActiveCategory] = useState<AdPresetCategory>('ugc')
  const [productImage, setProductImage] = useState<string>('')
  const [influencerImage, setInfluencerImage] = useState<string>('')
  const [lockFaceIdentity, setLockFaceIdentity] = useState(false)

  // Character
  const [characterType, setCharacterType] = useState<CharacterType>('none')
  const [animalType, setAnimalType] = useState<string>('')
  const [characterStyle, setCharacterStyle] = useState<string>('')
  const [characterAge, setCharacterAge] = useState<string>('')

  // Text overlay
  const [textOverlayOpen, setTextOverlayOpen] = useState(false)
  const [textHeadline, setTextHeadline] = useState('')
  const [textSubline, setTextSubline] = useState('')
  const [textTagline, setTextTagline] = useState('')
  const [textPlacement, setTextPlacement] = useState<TextPlacement>('bottom-right')
  const [textFontStyle, setTextFontStyle] = useState<FontStyle>('sans-serif')

  // Legacy controls
  const [ctaType, setCtaType] = useState<CtaType>('shop_now')
  const [captionTone, setCaptionTone] = useState<CaptionTone | ''>('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['instagram'])

  // UI state
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(false)
  const [campaignsLoading, setCampaignsLoading] = useState(true)
  const [result, setResult] = useState<GenerationResult | null>(null)

  // ── Fetch campaigns ──
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

  const selectedCampaignData = campaigns.find((c) => c.id === selectedCampaign)
  const isCampaignCompleted = selectedCampaignData?.status === 'completed'

  const hasTextOverlay = !!(textHeadline || textSubline || textTagline)

  const canSubmit =
    selectedPreset &&
    selectedPlatforms.length > 0 &&
    !isCampaignCompleted &&
    !loading

  // ── Handlers ──
  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, type: 'product' | 'influencer') => {
      const file = e.target.files?.[0]
      if (!file) return
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
    },
    []
  )

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    )
  }

  const handleGenerate = async () => {
    if (!selectedPreset) {
      toast.error('Please select an ad style')
      return
    }

    const input: any = {
      preset: selectedPreset,
      campaignId:
        selectedCampaign && selectedCampaign !== 'standalone' ? selectedCampaign : undefined,
      productImage: productImage || undefined,
      influencerImage: influencerImage || undefined,
      lockFaceIdentity,
      characterType,
      animalType: characterType === 'animal' ? animalType : undefined,
      characterStyle: characterStyle || undefined,
      characterAge: characterAge || undefined,
      textOverlay: hasTextOverlay
        ? {
            headline: textHeadline || undefined,
            subline: textSubline || undefined,
            tagline: textTagline || undefined,
            placement: textPlacement,
            fontStyle: textFontStyle,
          }
        : undefined,
      ctaType,
      captionTone: captionTone || undefined,
      platforms: selectedPlatforms,
    }

    const validation = validateAdInput(input)
    if (!validation.valid) {
      toast.error(validation.error)
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/ads/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 429) {
          toast.error(
            `Rate limit exceeded. ${data.resetTime ? `Try again in ${Math.ceil((data.resetTime - Date.now()) / 60000)} minutes.` : 'Try again later.'}`
          )
        } else {
          toast.error(data.error || 'Generation failed')
        }
        return
      }

      setResult(data as GenerationResult)
      toast.success('Ad generated successfully!')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!result?.imageUrl) return
    const link = document.createElement('a')
    link.href = result.imageBase64 || result.imageUrl
    link.download = `ad-${result.id}.png`
    link.click()
  }

  // ── Filtered presets ──
  const filteredPresets = getPresetsByCategory(activeCategory)

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="min-h-screen bg-[#FFFDF5] pt-24 pb-16"
    >
      <div className="container mx-auto px-4 max-w-5xl">
        {/* ── HEADER ── */}
        <div className="mb-10">
          <p className="text-sm font-bold uppercase tracking-widest text-black/50 mb-2">
            Ads / Create
          </p>
          <h1
            className="text-4xl md:text-5xl font-black text-black leading-tight"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            Create Ad
          </h1>
          <p className="text-black/60 mt-2 text-lg">
            AI-powered ad creatives — select a style, upload your product, and generate.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* ── LEFT COLUMN: CONTROLS ── */}
          <div className="space-y-8">
            {/* Campaign Selector */}
            <BrutalCard className="p-6" hoverEffect>
              <Label className="text-sm font-bold uppercase tracking-wide text-black/70 mb-3 block">
                Campaign (Optional)
              </Label>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger className="w-full h-12 bg-white border-[2px] border-black text-black font-medium shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-shadow">
                  <SelectValue placeholder="Select campaign or standalone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standalone">Standalone Ad</SelectItem>
                  {campaigns.map((campaign) => (
                    <SelectItem
                      key={campaign.id}
                      value={campaign.id}
                      disabled={campaign.status === 'completed'}
                    >
                      <div className="flex items-center gap-2">
                        <span>{campaign.title}</span>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {campaign.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isCampaignCompleted && (
                <p className="text-sm text-red-600 font-medium mt-2">
                  Campaign is completed. Select an active one.
                </p>
              )}
            </BrutalCard>

            {/* ── PRESET PICKER ── */}
            <BrutalCard className="p-6" hoverEffect={false}>
              <Label className="text-sm font-bold uppercase tracking-wide text-black/70 mb-4 block">
                Ad Style
              </Label>

              {/* Category Tabs */}
              <div className="flex flex-wrap gap-2 mb-5">
                {AD_PRESET_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-2 text-sm font-bold border-[2px] border-black transition-all',
                      activeCategory === cat.id
                        ? 'bg-[#FFD93D] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5'
                        : 'bg-white text-black/70 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FFD93D]/30 hover:-translate-y-0.5'
                    )}
                  >
                    {ICON_MAP[cat.icon]}
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Preset Grid */}
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                key={activeCategory}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                {filteredPresets.map((preset) => (
                  <motion.div key={preset.id} variants={staggerItem}>
                    <motion.button
                      variants={cardHover}
                      initial="initial"
                      whileHover="hover"
                      whileTap="tap"
                      onClick={() => setSelectedPreset(preset.id)}
                      className={cn(
                        'w-full text-left p-4 border-[2px] border-black transition-all relative',
                        selectedPreset === preset.id
                          ? 'bg-[#FFD93D] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                          : 'bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'p-2 border-[2px] border-black',
                            selectedPreset === preset.id ? 'bg-black text-[#FFD93D]' : 'bg-[#FFFDF5] text-black'
                          )}
                        >
                          {ICON_MAP[preset.icon]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm text-black">{preset.name}</h3>
                          <p className="text-xs text-black/60 mt-0.5 line-clamp-2">
                            {preset.description}
                          </p>
                        </div>
                        {selectedPreset === preset.id && (
                          <div className="absolute top-2 right-2 bg-black text-[#FFD93D] rounded-full p-0.5">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    </motion.button>
                  </motion.div>
                ))}
              </motion.div>
            </BrutalCard>

            {/* ── CHARACTER BUILDER ── */}
            <BrutalCard className="p-6" hoverEffect>
              <Label className="text-sm font-bold uppercase tracking-wide text-black/70 mb-4 block">
                AI Character
              </Label>

              {/* Character type chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                {CHARACTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setCharacterType(opt.value as CharacterType)
                      if (opt.value !== 'animal') setAnimalType('')
                    }}
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-2 text-sm font-bold border-[2px] border-black transition-all',
                      characterType === opt.value
                        ? 'bg-[#FF8C69] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5'
                        : 'bg-white text-black/70 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FF8C69]/20'
                    )}
                  >
                    {ICON_MAP[opt.icon]}
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Conditional fields */}
              <AnimatePresence mode="wait">
                {characterType === 'animal' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-3 overflow-hidden"
                  >
                    <Label className="text-xs font-bold text-black/50 uppercase">
                      Animal Type
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {ANIMAL_OPTIONS.map((animal) => (
                        <button
                          key={animal}
                          onClick={() => setAnimalType(animal)}
                          className={cn(
                            'px-3 py-1.5 text-xs font-bold border-[2px] border-black transition-all',
                            animalType === animal
                              ? 'bg-[#FFD93D] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                              : 'bg-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                          )}
                        >
                          {animal}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {(characterType === 'human_female' || characterType === 'human_male') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    {/* Style */}
                    <div>
                      <Label className="text-xs font-bold text-black/50 uppercase mb-2 block">
                        Style
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {CHARACTER_STYLE_OPTIONS.map((style) => (
                          <button
                            key={style}
                            onClick={() =>
                              setCharacterStyle(characterStyle === style ? '' : style)
                            }
                            className={cn(
                              'px-3 py-1.5 text-xs font-bold border-[2px] border-black transition-all',
                              characterStyle === style
                                ? 'bg-[#FFD93D] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                : 'bg-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                            )}
                          >
                            {style}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Age */}
                    <div>
                      <Label className="text-xs font-bold text-black/50 uppercase mb-2 block">
                        Age Range
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {['18-24', '25-34', '35-44', '45+'].map((age) => (
                          <button
                            key={age}
                            onClick={() => setCharacterAge(characterAge === age ? '' : age)}
                            className={cn(
                              'px-3 py-1.5 text-xs font-bold border-[2px] border-black transition-all',
                              characterAge === age
                                ? 'bg-[#FFD93D] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                : 'bg-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                            )}
                          >
                            {age}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </BrutalCard>

            {/* ── IMAGE UPLOADS ── */}
            <BrutalCard className="p-6" hoverEffect>
              <Label className="text-sm font-bold uppercase tracking-wide text-black/70 mb-4 block">
                Images
              </Label>
              <div className="grid grid-cols-2 gap-4">
                {/* Product Image */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-black/50 uppercase">
                    Product
                  </Label>
                  {productImage ? (
                    <div className="relative aspect-square border-[2px] border-black overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <img
                        src={productImage}
                        alt="Product"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => setProductImage('')}
                        className="absolute top-1 right-1 bg-red-500 text-white border-[2px] border-black p-1 hover:bg-red-600 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center aspect-square border-[2px] border-dashed border-black/40 cursor-pointer hover:border-black hover:bg-[#FFD93D]/10 transition-all">
                      <Upload className="h-6 w-6 text-black/40 mb-1" />
                      <span className="text-xs font-bold text-black/40">
                        Upload
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, 'product')}
                      />
                    </label>
                  )}
                </div>

                {/* Model Reference */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-black/50 uppercase">
                    Model Ref
                  </Label>
                  {influencerImage ? (
                    <div className="relative aspect-square border-[2px] border-black overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
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
                        className="absolute top-1 right-1 bg-red-500 text-white border-[2px] border-black p-1 hover:bg-red-600 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center aspect-square border-[2px] border-dashed border-black/40 cursor-pointer hover:border-black hover:bg-[#FF8C69]/10 transition-all">
                      <Upload className="h-6 w-6 text-black/40 mb-1" />
                      <span className="text-xs font-bold text-black/40">
                        Upload
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, 'influencer')}
                      />
                    </label>
                  )}

                  {/* Lock Face Toggle */}
                  <button
                    onClick={() => influencerImage && setLockFaceIdentity(!lockFaceIdentity)}
                    disabled={!influencerImage}
                    className={cn(
                      'flex items-center gap-1.5 w-full px-3 py-1.5 text-xs font-bold border-[2px] border-black transition-all',
                      lockFaceIdentity
                        ? 'bg-[#FFD93D] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                        : 'bg-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]',
                      !influencerImage && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    <Lock className="h-3 w-3" />
                    Lock Face Identity
                  </button>
                </div>
              </div>
            </BrutalCard>

            {/* ── TEXT OVERLAY ── */}
            <BrutalCard className="p-6" hoverEffect>
              <button
                onClick={() => setTextOverlayOpen(!textOverlayOpen)}
                className="w-full flex items-center justify-between"
              >
                <Label className="text-sm font-bold uppercase tracking-wide text-black/70 cursor-pointer">
                  Text in Image {hasTextOverlay && '(Active)'}
                </Label>
                {textOverlayOpen ? (
                  <ChevronUp className="h-4 w-4 text-black/50" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-black/50" />
                )}
              </button>

              <AnimatePresence>
                {textOverlayOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-4 mt-4 overflow-hidden"
                  >
                    {/* Headline */}
                    <div>
                      <Label className="text-xs font-bold text-black/50 uppercase mb-1 block">
                        Headline
                      </Label>
                      <Input
                        placeholder="e.g. JUST DO IT"
                        value={textHeadline}
                        onChange={(e) => setTextHeadline(e.target.value)}
                        className="h-10 bg-white border-[2px] border-black text-black font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] placeholder:text-black/30"
                      />
                    </div>

                    {/* Subline */}
                    <div>
                      <Label className="text-xs font-bold text-black/50 uppercase mb-1 block">
                        Subline
                      </Label>
                      <Input
                        placeholder="e.g. New Season Collection"
                        value={textSubline}
                        onChange={(e) => setTextSubline(e.target.value)}
                        className="h-10 bg-white border-[2px] border-black text-black font-medium shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] placeholder:text-black/30"
                      />
                    </div>

                    {/* Tagline */}
                    <div>
                      <Label className="text-xs font-bold text-black/50 uppercase mb-1 block">
                        Tagline / CTA
                      </Label>
                      <Input
                        placeholder="e.g. Shop Now"
                        value={textTagline}
                        onChange={(e) => setTextTagline(e.target.value)}
                        className="h-10 bg-white border-[2px] border-black text-black font-medium shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] placeholder:text-black/30"
                      />
                    </div>

                    {/* Placement */}
                    <div>
                      <Label className="text-xs font-bold text-black/50 uppercase mb-2 block">
                        Placement
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {TEXT_PLACEMENT_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setTextPlacement(opt.value as TextPlacement)}
                            className={cn(
                              'px-3 py-1.5 text-xs font-bold border-[2px] border-black transition-all',
                              textPlacement === opt.value
                                ? 'bg-[#FFD93D] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                : 'bg-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Font Style */}
                    <div>
                      <Label className="text-xs font-bold text-black/50 uppercase mb-2 block">
                        Font Style
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {FONT_STYLE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setTextFontStyle(opt.value as FontStyle)}
                            className={cn(
                              'px-3 py-1.5 text-xs font-bold border-[2px] border-black transition-all',
                              textFontStyle === opt.value
                                ? 'bg-[#FFD93D] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                : 'bg-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </BrutalCard>

            {/* ── PLATFORM + CTA ── */}
            <BrutalCard className="p-6" hoverEffect>
              <div className="space-y-5">
                {/* CTA */}
                <div>
                  <Label className="text-xs font-bold text-black/50 uppercase mb-2 block">
                    Call to Action
                  </Label>
                  <Select value={ctaType} onValueChange={(v) => setCtaType(v as CtaType)}>
                    <SelectTrigger className="w-full h-10 bg-white border-[2px] border-black text-black font-medium shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CTA_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Caption Tone */}
                <div>
                  <Label className="text-xs font-bold text-black/50 uppercase mb-2 block">
                    Caption Tone
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {TONE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() =>
                          setCaptionTone(captionTone === opt.value ? '' : opt.value)
                        }
                        className={cn(
                          'px-4 py-2 text-xs font-bold border-[2px] border-black transition-all',
                          captionTone === opt.value
                            ? 'bg-[#FF8C69] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                            : 'bg-white text-black/70 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Platforms */}
                <div>
                  <Label className="text-xs font-bold text-black/50 uppercase mb-2 block">
                    Platforms
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORM_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => togglePlatform(opt.value)}
                        className={cn(
                          'flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-[2px] border-black transition-all',
                          selectedPlatforms.includes(opt.value)
                            ? 'bg-[#FFD93D] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                            : 'bg-white text-black/70 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                        )}
                      >
                        {PLATFORM_ICONS[opt.icon]}
                        {opt.label}
                        {selectedPlatforms.includes(opt.value) && (
                          <Check className="h-3 w-3" />
                        )}
                      </button>
                    ))}
                  </div>
                  {selectedPlatforms.length === 0 && (
                    <p className="text-xs text-red-600 font-bold mt-1">
                      Select at least one platform
                    </p>
                  )}
                </div>
              </div>
            </BrutalCard>

            {/* ── GENERATE BUTTON ── */}
            <motion.button
              whileHover={{ scale: 1.01, y: -2 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleGenerate}
              disabled={!canSubmit}
              className={cn(
                'w-full h-16 text-lg font-black uppercase tracking-wide border-[3px] border-black transition-all',
                canSubmit
                  ? 'bg-[#FFD93D] text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : 'bg-gray-200 text-gray-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] cursor-not-allowed'
              )}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <BrutalLoader size="sm" />
                  Generating (15-30s)...
                </span>
              ) : (
                'Generate Ad'
              )}
            </motion.button>
          </div>

          {/* ── RIGHT COLUMN: RESULT PANEL ── */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <BrutalCard className="p-8 flex flex-col items-center justify-center min-h-[400px]">
                    <BrutalLoader size="lg" />
                    <p className="mt-16 text-sm font-bold text-black/50 uppercase tracking-widest">
                      Creating your ad...
                    </p>
                    <p className="text-xs text-black/30 mt-1">
                      GPT-4o is crafting the prompt
                    </p>
                  </BrutalCard>
                </motion.div>
              ) : result ? (
                <motion.div
                  key="result"
                  variants={imageRevealVariants}
                  initial="initial"
                  animate="animate"
                >
                  <BrutalCard className="overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    {/* Generated Image */}
                    <div className="relative aspect-square border-b-[3px] border-black">
                      <img
                        src={result.imageBase64 || result.imageUrl}
                        alt="Generated Ad"
                        className="w-full h-full object-cover"
                      />
                      {/* Quality Badge */}
                      <div className="absolute top-3 left-3 bg-[#FFD93D] border-[2px] border-black px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <span className="text-xs font-black">
                          {result.qualityScore}/100
                        </span>
                      </div>
                      <div className="absolute top-3 right-3 bg-white border-[2px] border-black px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <span className="text-xs font-bold uppercase">
                          {result.promptUsed}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-4 flex gap-2">
                      <button
                        onClick={handleDownload}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-black text-white border-[2px] border-black font-bold text-sm hover:bg-black/80 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </button>
                      <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 py-3 px-4 bg-[#FF8C69] text-black border-[2px] border-black font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Copy variants */}
                    {result.copy && result.copy.length > 0 && (
                      <div className="p-4 pt-0 space-y-2">
                        <p className="text-xs font-bold text-black/50 uppercase">
                          Ad Copy
                        </p>
                        {result.copy.slice(0, 2).map((copy: any, i: number) => (
                          <div
                            key={i}
                            className="p-3 bg-[#FFFDF5] border-[2px] border-black/20 text-xs text-black/70"
                          >
                            {typeof copy === 'string' ? copy : copy?.text || JSON.stringify(copy)}
                          </div>
                        ))}
                      </div>
                    )}
                  </BrutalCard>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <BrutalCard className="p-8 flex flex-col items-center justify-center min-h-[400px] bg-[#FFFDF5]">
                    <div className="w-16 h-16 bg-[#FFD93D] border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center mb-4">
                      <ImageIcon className="h-8 w-8 text-black" />
                    </div>
                    <p className="text-sm font-bold text-black/50 text-center">
                      Your generated ad will appear here
                    </p>
                    <p className="text-xs text-black/30 mt-1 text-center">
                      Select a style and click Generate
                    </p>
                  </BrutalCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
