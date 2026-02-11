'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '@/components/ui/input'
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
  ChevronDown,
  ChevronUp,
  BookOpen,
  Instagram,
  Facebook,
  Globe,
  Users,
} from 'lucide-react'
import {
  AD_PRESET_CATEGORIES,
  CHARACTER_OPTIONS,
  ANIMAL_OPTIONS,
  CHARACTER_STYLE_OPTIONS,
  FONT_STYLE_OPTIONS,
  TEXT_PLACEMENT_OPTIONS,
  PLATFORM_OPTIONS,
  ASPECT_RATIO_OPTIONS,
  getPresetsByCategory,
  validateAdInput,
  type AdPresetId,
  type AdPresetCategory,
  type Platform,
  type CtaType,
  type CharacterType,
  type FontStyle,
  type TextPlacement,
  type AspectRatio,
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

const ICON_MAP: Record<string, React.ReactNode> = {
  Camera: <Camera className="h-4 w-4" />,
  ShoppingBag: <ShoppingBag className="h-4 w-4" />,
  Image: <ImageIcon className="h-4 w-4" />,
  Sparkles: <Sparkles className="h-4 w-4" />,
  Smartphone: <Smartphone className="h-4 w-4" />,
  Zap: <Zap className="h-4 w-4" />,
  MessageCircle: <MessageCircle className="h-4 w-4" />,
  Shirt: <Shirt className="h-4 w-4" />,
  Heart: <Heart className="h-4 w-4" />,
  MapPin: <MapPin className="h-4 w-4" />,
  Star: <Star className="h-4 w-4" />,
  Wand2: <Wand2 className="h-4 w-4" />,
  Film: <Film className="h-4 w-4" />,
  Type: <Type className="h-4 w-4" />,
  Palette: <Palette className="h-4 w-4" />,
  Box: <Box className="h-4 w-4" />,
  CloudLightning: <CloudLightning className="h-4 w-4" />,
  PartyPopper: <PartyPopper className="h-4 w-4" />,
  Crown: <Crown className="h-4 w-4" />,
  BookOpen: <BookOpen className="h-4 w-4" />,
  User: <User className="h-4 w-4" />,
  Cat: <Cat className="h-4 w-4" />,
  Ban: <Ban className="h-4 w-4" />,
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

export default function AdsPage() {
  // Form
  const [selectedPreset, setSelectedPreset] = useState<AdPresetId | null>(null)
  const [activeCategory, setActiveCategory] = useState<AdPresetCategory>('ugc')
  const [productImage, setProductImage] = useState('')
  const [influencerImage, setInfluencerImage] = useState('')
  const [lockFaceIdentity, setLockFaceIdentity] = useState(false)
  const [characterType, setCharacterType] = useState<CharacterType>('none')
  const [animalType, setAnimalType] = useState('')
  const [characterStyle, setCharacterStyle] = useState('')
  const [characterAge, setCharacterAge] = useState('')
  const [textHeadline, setTextHeadline] = useState('')
  const [textSubline, setTextSubline] = useState('')
  const [textTagline, setTextTagline] = useState('')
  const [textPlacement, setTextPlacement] = useState<TextPlacement>('center')
  const [textFontStyle, setTextFontStyle] = useState<FontStyle>('bold-display')
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['instagram'])
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1')
  const [textOpen, setTextOpen] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)

  // UI
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0)

  const hasText = !!(textHeadline || textSubline || textTagline)
  const canSubmit = selectedPreset && selectedPlatforms.length > 0 && !loading && retryAfterSeconds <= 0

  // Countdown for rate limit / in-flight wait
  useEffect(() => {
    if (retryAfterSeconds <= 0) return
    const t = setInterval(() => setRetryAfterSeconds((prev) => Math.max(0, prev - 1)), 1000)
    return () => clearInterval(t)
  }, [retryAfterSeconds])

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, type: 'product' | 'influencer') => {
      const file = e.target.files?.[0]
      if (!file) return
      if (file.size > 10 * 1024 * 1024) { toast.error('Max 10MB'); return }
      const reader = new FileReader()
      reader.onload = (ev) => {
        const b64 = ev.target?.result as string
        if (type === 'product') setProductImage(b64)
        else { setInfluencerImage(b64); if (!b64) setLockFaceIdentity(false) }
      }
      reader.readAsDataURL(file)
    }, []
  )

  const togglePlatform = (p: Platform) =>
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    )

  const handleGenerate = async () => {
    if (!selectedPreset) { toast.error('Select an ad style'); return }

    const isHuman = characterType === 'human_female' || characterType === 'human_male'
    const input: any = {
      preset: selectedPreset,
      productImage: productImage || undefined,
      influencerImage: influencerImage || undefined,
      lockFaceIdentity,
      characterType,
      animalType: characterType === 'animal' ? (animalType || 'Fox') : undefined,
      characterStyle: isHuman ? (characterStyle || undefined) : undefined,
      characterAge: isHuman ? (characterAge || undefined) : undefined,
      aspectRatio,
      textOverlay: hasText ? {
        headline: textHeadline || undefined,
        subline: textSubline || undefined,
        tagline: textTagline || undefined,
        placement: textPlacement,
        fontStyle: textFontStyle,
      } : undefined,
      ctaType: 'shop_now' as CtaType,
      platforms: selectedPlatforms,
    }

    const v = validateAdInput(input)
    if (!v.valid) { toast.error(v.error); return }

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
          const retry = Math.max(1, Number(data.retryAfterSeconds ?? 60))
          setRetryAfterSeconds(retry)
          toast.error(data.error || `Rate limit. Try again in ${retry}s.`)
        } else {
          toast.error(data.error || 'Generation failed')
        }
        return
      }
      setResult(data as GenerationResult)
      toast.success('Ad generated!')
    } catch { toast.error('Something went wrong.') }
    finally { setLoading(false) }
  }

  const handleDownload = () => {
    if (!result?.imageUrl) return
    const a = document.createElement('a')
    a.href = result.imageBase64 || result.imageUrl
    a.download = `ad-${result.id}.png`
    a.click()
  }

  const filteredPresets = getPresetsByCategory(activeCategory)

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate"
      className="min-h-screen bg-[#FFFDF5] pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-6xl">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-black" style={{ fontFamily: 'Playfair Display, serif' }}>
            Create Ad
          </h1>
          <p className="text-black/50 mt-1">Select a style, upload your product, generate.</p>
        </div>

        <div className="grid lg:grid-cols-[1fr_420px] gap-6">
          {/* ═══ LEFT: CONTROLS ═══ */}
          <div className="space-y-5">

            {/* 1. STYLE PICKER */}
            <BrutalCard className="p-5">
              {/* Category tabs */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {AD_PRESET_CATEGORIES.map((cat) => (
                  <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      'flex items-center gap-1 px-3 py-1.5 text-xs font-bold border-[2px] border-black transition-all',
                      activeCategory === cat.id
                        ? 'bg-[#FFD93D] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-px'
                        : 'bg-white text-black/60 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FFD93D]/20'
                    )}>
                    {ICON_MAP[cat.icon]} {cat.label}
                  </button>
                ))}
              </div>

              {/* Preset grid */}
              <motion.div variants={staggerContainer} initial="initial" animate="animate"
                key={activeCategory} className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {filteredPresets.map((preset) => (
                  <motion.button key={preset.id} variants={staggerItem}
                    onClick={() => setSelectedPreset(preset.id)}
                    className={cn(
                      'text-left p-3 border-[2px] border-black transition-all relative',
                      selectedPreset === preset.id
                        ? 'bg-[#FFD93D] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                        : 'bg-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    )}>
                    <div className="flex items-center gap-2">
                      <span className={cn('p-1.5 border-[2px] border-black',
                        selectedPreset === preset.id ? 'bg-black text-[#FFD93D]' : 'bg-[#FFFDF5]')}>
                        {ICON_MAP[preset.icon]}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-black leading-tight">{preset.name}</p>
                        <p className="text-[10px] text-black/50 line-clamp-1">{preset.description}</p>
                      </div>
                    </div>
                    {selectedPreset === preset.id && (
                      <div className="absolute top-1.5 right-1.5 bg-black text-[#FFD93D] rounded-full p-0.5">
                        <Check className="h-2.5 w-2.5" />
                      </div>
                    )}
                  </motion.button>
                ))}
              </motion.div>
            </BrutalCard>

            {/* 2. IMAGES + CHARACTER (compact row) */}
            <div className="grid grid-cols-2 gap-4">
              {/* Product */}
              <BrutalCard className="p-4">
                <p className="text-[10px] font-black uppercase text-black/40 mb-2">Product Image</p>
                {productImage ? (
                  <div className="relative aspect-[4/3] border-[2px] border-black overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <img src={productImage} alt="Product" className="w-full h-full object-cover" />
                    <button onClick={() => setProductImage('')}
                      className="absolute top-1 right-1 bg-red-500 text-white border-[2px] border-black p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center aspect-[4/3] border-[2px] border-dashed border-black/30 cursor-pointer hover:border-black hover:bg-[#FFD93D]/10 transition-all">
                    <Upload className="h-5 w-5 text-black/30 mb-1" />
                    <span className="text-[10px] font-bold text-black/30">Upload</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'product')} />
                  </label>
                )}
              </BrutalCard>

              {/* Model / Character */}
              <BrutalCard className="p-4">
                <p className="text-[10px] font-black uppercase text-black/40 mb-2">Model / Character</p>

                {/* Character type row */}
                <div className="flex gap-1 mb-2">
                  {CHARACTER_OPTIONS.map((opt) => (
                    <button key={opt.value}
                      onClick={() => { setCharacterType(opt.value as CharacterType); if (opt.value !== 'animal') setAnimalType('') }}
                      className={cn('flex-1 py-1.5 text-[10px] font-bold border-[2px] border-black text-center transition-all',
                        characterType === opt.value
                          ? 'bg-[#FF8C69] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                          : 'bg-white text-black/50 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                      )}>
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Animal sub-options */}
                {characterType === 'animal' && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {ANIMAL_OPTIONS.slice(0, 6).map((a) => (
                      <button key={a} onClick={() => setAnimalType(a)}
                        className={cn('px-2 py-1 text-[10px] font-bold border-[1.5px] border-black',
                          animalType === a ? 'bg-[#FFD93D]' : 'bg-white')}>
                        {a}
                      </button>
                    ))}
                  </div>
                )}

                {/* Human style chips */}
                {(characterType === 'human_female' || characterType === 'human_male') && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {CHARACTER_STYLE_OPTIONS.slice(0, 4).map((s) => (
                      <button key={s} onClick={() => setCharacterStyle(characterStyle === s ? '' : s)}
                        className={cn('px-2 py-1 text-[10px] font-bold border-[1.5px] border-black',
                          characterStyle === s ? 'bg-[#FFD93D]' : 'bg-white')}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Model ref image */}
                {influencerImage ? (
                  <div className="relative aspect-[4/3] border-[2px] border-black overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <img src={influencerImage} alt="Model" className="w-full h-full object-cover" />
                    <button onClick={() => { setInfluencerImage(''); setLockFaceIdentity(false) }}
                      className="absolute top-1 right-1 bg-red-500 text-white border-[2px] border-black p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center aspect-[4/3] border-[2px] border-dashed border-black/30 cursor-pointer hover:border-black hover:bg-[#FF8C69]/10 transition-all">
                    <Upload className="h-5 w-5 text-black/30 mb-1" />
                    <span className="text-[10px] font-bold text-black/30">Reference face</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'influencer')} />
                  </label>
                )}

                {influencerImage && (
                  <button onClick={() => setLockFaceIdentity(!lockFaceIdentity)}
                    className={cn('flex items-center gap-1 w-full mt-2 px-2 py-1.5 text-[10px] font-bold border-[2px] border-black transition-all',
                      lockFaceIdentity ? 'bg-[#FFD93D] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]')}>
                    <Lock className="h-3 w-3" /> Lock Face
                  </button>
                )}
              </BrutalCard>
            </div>

            {/* 3. TEXT IN IMAGE (collapsible) */}
            <BrutalCard className="p-4">
              <button onClick={() => setTextOpen(!textOpen)} className="w-full flex items-center justify-between">
                <span className="text-xs font-black uppercase text-black/60">
                  Typography {hasText && <span className="text-[#FF8C69]">/ Active</span>}
                </span>
                {textOpen ? <ChevronUp className="h-4 w-4 text-black/40" /> : <ChevronDown className="h-4 w-4 text-black/40" />}
              </button>
              <AnimatePresence>
                {textOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="mt-3 space-y-3 overflow-hidden">
                    <Input placeholder='e.g. JUST DO IT' value={textHeadline} onChange={(e) => setTextHeadline(e.target.value)}
                      className="h-9 text-sm bg-white border-[2px] border-black font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] placeholder:text-black/25" />
                    <Input placeholder='Subline (optional)' value={textSubline} onChange={(e) => setTextSubline(e.target.value)}
                      className="h-9 text-sm bg-white border-[2px] border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] placeholder:text-black/25" />
                    <Input placeholder='Tagline / CTA' value={textTagline} onChange={(e) => setTextTagline(e.target.value)}
                      className="h-9 text-sm bg-white border-[2px] border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] placeholder:text-black/25" />

                    {/* Placement + font in one row */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] font-black text-black/40 uppercase mb-1">Position</p>
                        <div className="flex flex-wrap gap-1">
                          {TEXT_PLACEMENT_OPTIONS.map((o) => (
                            <button key={o.value} onClick={() => setTextPlacement(o.value as TextPlacement)}
                              className={cn('px-2 py-1 text-[10px] font-bold border-[1.5px] border-black',
                                textPlacement === o.value ? 'bg-[#FFD93D]' : 'bg-white')}>
                              {o.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-black/40 uppercase mb-1">Font</p>
                        <div className="flex flex-wrap gap-1">
                          {FONT_STYLE_OPTIONS.map((o) => (
                            <button key={o.value} onClick={() => setTextFontStyle(o.value as FontStyle)}
                              className={cn('px-2 py-1 text-[10px] font-bold border-[1.5px] border-black',
                                textFontStyle === o.value ? 'bg-[#FFD93D]' : 'bg-white')}>
                              {o.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </BrutalCard>

            {/* 4. ASPECT RATIO + PLATFORMS */}
            <div className="grid grid-cols-2 gap-4">
              {/* Aspect Ratio */}
              <BrutalCard className="p-4">
                <p className="text-[10px] font-black uppercase text-black/40 mb-2">Aspect Ratio</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {ASPECT_RATIO_OPTIONS.map((opt) => (
                    <button key={opt.value} onClick={() => setAspectRatio(opt.value)}
                      className={cn('py-2 text-[10px] font-bold border-[2px] border-black text-center transition-all',
                        aspectRatio === opt.value
                          ? 'bg-[#C3B1E1] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                          : 'bg-white text-black/50 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-[#C3B1E1]/20'
                      )}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </BrutalCard>

              {/* Platform */}
              <BrutalCard className="p-4">
                <p className="text-[10px] font-black uppercase text-black/40 mb-2">Platform</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {PLATFORM_OPTIONS.map((opt) => (
                    <button key={opt.value} onClick={() => togglePlatform(opt.value)}
                      className={cn('py-2 text-[10px] font-bold border-[2px] border-black text-center transition-all',
                        selectedPlatforms.includes(opt.value)
                          ? 'bg-[#FFD93D] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                          : 'bg-white text-black/50 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FFD93D]/20'
                      )}>
                      {opt.label} {selectedPlatforms.includes(opt.value) && <Check className="h-3 w-3 inline" />}
                    </button>
                  ))}
                </div>
              </BrutalCard>
            </div>

            {/* 5. GENERATE */}
            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }}
              onClick={handleGenerate} disabled={!canSubmit || retryAfterSeconds > 0}
              className={cn(
                'w-full h-14 text-base font-black uppercase tracking-wide border-[3px] border-black transition-all',
                canSubmit
                  ? 'bg-[#FFD93D] text-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)]'
                  : 'bg-gray-200 text-gray-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] cursor-not-allowed'
              )}>
              {retryAfterSeconds > 0
                ? `Wait ${retryAfterSeconds}s`
                : loading
                  ? (
                      <span className="flex items-center justify-center gap-3">
                        <BrutalLoader size="sm" /> Generating...
                      </span>
                    )
                  : 'Generate Ad'}
            </motion.button>
          </div>

          {/* ═══ RIGHT: RESULT ═══ */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <BrutalCard className="flex flex-col items-center justify-center min-h-[480px] p-8">
                    <BrutalLoader size="lg" />
                    <p className="mt-16 text-xs font-black text-black/40 uppercase tracking-widest">Creating ad...</p>
                    <p className="text-[10px] text-black/25 mt-1">GPT-4o + Nano Banana Pro</p>
                  </BrutalCard>
                </motion.div>
              ) : result ? (
                <motion.div key="result" variants={imageRevealVariants} initial="initial" animate="animate">
                  <BrutalCard className="overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                    <div className="relative border-b-[3px] border-black">
                      <img src={result.imageBase64 || result.imageUrl} alt="Generated Ad" className="w-full object-cover" />
                      <div className="absolute top-2 left-2 bg-[#FFD93D] border-[2px] border-black px-2 py-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <span className="text-[10px] font-black">{result.qualityScore}/100</span>
                      </div>
                    </div>
                    <div className="p-3 flex gap-2">
                      <button onClick={handleDownload}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-black text-white border-[2px] border-black font-bold text-xs hover:bg-black/80">
                        <Download className="h-3.5 w-3.5" /> Download
                      </button>
                      <button onClick={handleGenerate} disabled={loading}
                        className="flex items-center justify-center py-2.5 px-3 bg-[#FF8C69] text-black border-[2px] border-black font-bold text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {result.copy?.length > 0 && (
                      <div className="px-3 pb-3 space-y-1.5">
                        <p className="text-[10px] font-black text-black/40 uppercase">Ad Copy</p>
                        {result.copy.slice(0, 2).map((c: any, i: number) => (
                          <div key={i} className="p-2 bg-[#FFFDF5] border-[1.5px] border-black/15 text-[11px] text-black/60">
                            {typeof c === 'string' ? c : c?.text || JSON.stringify(c)}
                          </div>
                        ))}
                      </div>
                    )}
                  </BrutalCard>
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <BrutalCard className="flex flex-col items-center justify-center min-h-[480px] p-8 bg-[#FFFDF5]">
                    <div className="w-14 h-14 bg-[#FFD93D] border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center mb-3">
                      <ImageIcon className="h-7 w-7 text-black" />
                    </div>
                    <p className="text-xs font-bold text-black/40 text-center">Your ad will appear here</p>
                    <p className="text-[10px] text-black/25 mt-0.5 text-center">Powered by Nano Banana Pro</p>
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
