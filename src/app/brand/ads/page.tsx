'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Sparkles,
  Upload,
  X,
  Check,
  Loader2,
  Instagram,
  Facebook,
  Globe,
  Users,
  ChevronRight,
  Maximize2,
  Zap,
  Layout,
  Type,
  ImageIcon,
  ShoppingBag,
  Camera,
  Wand2,
  Lock,
  Shuffle,
  User,
  UserCircle
} from 'lucide-react'
import {
  getAllPresets,
  type PresetId,
  type AdGradePreset
} from '@/lib/creative_orchestrator'
import { AI_INFLUENCERS, type AIInfluencer } from '@/lib/constants/ai-influencers'
import { cn } from '@/lib/utils'
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
import {
  CTA_OPTIONS,
  TONE_OPTIONS,
  PLATFORM_OPTIONS,
  type Platform,
  type CtaType,
  type CaptionTone,
} from '@/lib/ads/ad-styles'

// AI INFLUENCERS Imported from @/lib/constants/ai-influencers

const GENDER_OPTIONS = [
  { value: 'all', label: 'All', icon: Users },
  { value: 'female', label: 'Female', icon: User },
  { value: 'male', label: 'Male', icon: UserCircle },
  { value: 'other', label: 'Creative/Other', icon: Wand2 },
]

const PRESET_EMOJIS: Record<string, string> = {
  'UGC_CANDID_AD_V1': '📱',
  'PRODUCT_LIFESTYLE_AD_V1': '🛍️',
  'STUDIO_POSTER_AD_V1': '🎨',
  'PREMIUM_EDITORIAL_AD_V1': '✨',
}

// ═══════════════════════════════════════════════════════════════
// UI COMPONENTS (Neo-Brutalist)
// ═══════════════════════════════════════════════════════════════

const BrutalCard = ({ children, className, title, icon: Icon }: { children: React.ReactNode, className?: string, title?: string, icon?: any }) => (
  <div className={cn("bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6", className)}>
    {title && (
      <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-dashed border-black/20">
        {Icon && <Icon className="w-5 h-5" />}
        <h3 className="text-lg font-black uppercase tracking-tight">{title}</h3>
      </div>
    )}
    {children}
  </div>
)

const BrutalButton = ({ onClick, children, variant = 'primary', disabled = false, className }: any) => {
  const baseStyles = "relative px-6 py-3 font-bold border-[3px] border-black transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
  const variants = {
    primary: "bg-[#B4F056] hover:bg-[#a2d84d] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
    secondary: "bg-white hover:bg-gray-50 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
    action: "bg-[#FFD93D] hover:bg-[#e6c337] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transform hover:-translate-y-1"
  }

  return (
    <button onClick={onClick} disabled={disabled} className={cn(baseStyles, variants[variant as keyof typeof variants], className)}>
      {children}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function AdsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Form State
  const [selectedPreset, setSelectedPreset] = useState<PresetId | null>(null)
  const [productImage, setProductImage] = useState<string>('')
  const [influencerImage, setInfluencerImage] = useState<string>('')
  const [headline, setHeadline] = useState('')
  const [ctaType, setCtaType] = useState('shop_now')
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)

  // Other form states (re-added for completeness)
  const [captionTone, setCaptionTone] = useState<CaptionTone | ''>('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['instagram'])
  const [influencerMode, setInfluencerMode] = useState<'upload' | 'ai'>('upload')
  const [selectedAIInfluencer, setSelectedAIInfluencer] = useState<string | null>(null)
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female' | 'other'>('all')
  const [lockFaceIdentity, setLockFaceIdentity] = useState(false)


  const AD_PRESETS = getAllPresets()

  // Filtered AI influencers
  const filteredInfluencers = AI_INFLUENCERS.filter(
    inf => genderFilter === 'all' || inf.gender === genderFilter
  )

  // Derived Word Count
  const wordCount = headline.trim() ? headline.trim().split(/\s+/).length : 0

  const handleGenerate = async () => {
    if (!selectedPreset || !productImage) {
      toast.error("Please select a preset and upload a product image.")
      return
    }

    setLoading(true)
    setGeneratedImage(null)

    try {
      // Use REAL API call now
      const input = {
        preset: selectedPreset,
        productImage: productImage || undefined,
        influencerImage: influencerImage || undefined,
        aiInfluencerId: selectedAIInfluencer || undefined,
        lockFaceIdentity,
        headline: headline || undefined,
        ctaType,
        captionTone: captionTone || undefined,
        platforms: selectedPlatforms,
      }

      const res = await fetch('/api/ads/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Generation failed")
        return
      }

      setSuccess(true)
      // For now, if the API returns a URL, use it. 
      // Assuming API returns { creativeId: ... } or similar.
      // Wait, let's check what route returns. It returns { creativeId, ... } usually.
      // The user wants to see the result.
      // If the route saves to DB, we might need to poll or redirect.
      // For this UI demo, we will show "Success" and maybe redirect.

      toast.success("Ad Generated Successfully! Redirecting...")
      router.push('/brand/ads/creatives')

    } catch (error) {
      toast.error("Generation failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'product' | 'influencer') => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (type === 'product') setProductImage(e.target?.result as string)
        else setInfluencerImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Select AI influencer
  const handleSelectAIInfluencer = (id: string) => {
    setSelectedAIInfluencer(id)
    setInfluencerImage('')
    setInfluencerMode('ai')
    setLockFaceIdentity(false)
  }

  // Platform toggle
  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F4F0] pt-24 pb-12 px-4 md:px-8 font-sans">
      <div className="max-w-[1600px] mx-auto">

        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-2">
              Ad <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#B4F056] to-[#8BC34A] stroke-black" style={{ WebkitTextStroke: '2px black' }}>Studio</span>
            </h1>
            <p className="text-xl font-bold border-2 border-black bg-white inline-block px-4 py-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              CRAFT HIGH-CONVERTING CREATIVES • NANOBANANA PRO
            </p>
          </div>

          <div className="flex gap-2">
            <BrutalButton variant="secondary" onClick={() => router.push('/brand/dashboard')}>
              Back to Dashboard
            </BrutalButton>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT PANEL: INPUTS (Scrollable) */}
          <div className="lg:col-span-4 space-y-6">

            {/* 1. Preset Selection */}
            <BrutalCard title="1. Select Vibe" icon={Sparkles}>
              <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {AD_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setSelectedPreset(preset.id as PresetId)}
                    className={cn(
                      "flex flex-col items-center p-3 border-[3px] transition-all text-center group relative overflow-hidden",
                      selectedPreset === preset.id
                        ? "border-black bg-[#FFD93D] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        : "border-black/10 hover:border-black bg-white hover:bg-gray-50"
                    )}
                  >
                    <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">{PRESET_EMOJIS[preset.id] || '✨'}</span>
                    <span className="text-xs font-bold uppercase leading-tight">{preset.name}</span>
                    {selectedPreset === preset.id && (
                      <div className="absolute top-1 right-1 w-2 h-2 bg-black rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </BrutalCard>

            {/* 2. Upload Assets */}
            <BrutalCard title="2. Upload Assets" icon={Upload}>
              <div className="space-y-4">
                {/* Product Image */}
                <div className="relative group">
                  <div className={cn(
                    "h-48 border-[3px] border-black border-dashed flex items-center justify-center bg-gray-50 transition-all",
                    productImage ? "border-solid bg-white p-2" : "hover:bg-[#E0E7FF]"
                  )}>
                    {productImage ? (
                      <img src={productImage} className="w-full h-full object-contain" alt="Product" />
                    ) : (
                      <div className="text-center">
                        <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <span className="font-bold text-sm text-gray-400 uppercase">Product Image</span>
                      </div>
                    )}
                    <input type="file" onChange={(e) => handleImageUpload(e, 'product')} className="absolute inset-0 opacity-0 cursor-pointer" />

                    {productImage && (
                      <button onClick={() => setProductImage('')} className="absolute top-2 right-2 p-1 bg-white border-2 border-black hover:bg-red-100"><X className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>

                {/* Influencer Image (Optional) */}
                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {/* AI INFLUENCER STUDIO */}
                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-black text-black uppercase">Model / Influencer</Label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setInfluencerMode('upload')}
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-bold border-2 border-black transition-all",
                          influencerMode === 'upload'
                            ? "bg-black text-white"
                            : "bg-white text-black hover:bg-gray-100"
                        )}
                      >
                        Upload Photo
                      </button>
                      <button
                        onClick={() => setInfluencerMode('ai')}
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-bold border-2 border-black transition-all flex items-center gap-2",
                          influencerMode === 'ai'
                            ? "bg-[#B4F056] text-black"
                            : "bg-white text-black hover:bg-gray-100"
                        )}
                      >
                        <Wand2 className="h-4 w-4" />
                        AI Influencer
                      </button>
                    </div>
                  </div>

                  {influencerMode === 'upload' ? (
                    /* Upload Mode */
                    <div className="max-w-md">
                      {influencerImage ? (
                        <div className="relative aspect-square rounded-xl overflow-hidden border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
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
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-lg p-1.5 hover:bg-red-600 border-2 border-black transition-colors"
                          >
                            <X className="h-4 w-4" strokeWidth={3} />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center aspect-square rounded-xl border-[3px] border-dashed border-black cursor-pointer hover:bg-white hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all bg-[#F9F4EF]">
                          <div className="w-12 h-12 bg-white rounded-full border-2 border-black flex items-center justify-center mb-3">
                            <Upload className="h-6 w-6 text-black" strokeWidth={2.5} />
                          </div>
                          <span className="text-sm font-bold text-black">Upload model photo</span>
                          <span className="text-xs text-black/50 mt-1">Real influencer image</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload(e, 'influencer')}
                          />
                        </label>
                      )}

                      {/* Lock Face Toggle */}
                      {influencerImage && (
                        <div className="flex items-center gap-2 mt-4">
                          <button
                            onClick={() => setLockFaceIdentity(!lockFaceIdentity)}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border-2",
                              lockFaceIdentity
                                ? "bg-[#B4F056] text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                : "bg-white text-black/60 border-black/20 hover:border-black hover:text-black"
                            )}
                          >
                            <Lock className="h-3.5 w-3.5" strokeWidth={3} />
                            Lock face identity
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* AI Influencer Mode */
                    <div className="space-y-4">
                      {/* Gender Filter */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-black/60 mr-2">Gender:</span>
                        {GENDER_OPTIONS.map(option => (
                          <button
                            key={option.value}
                            onClick={() => setGenderFilter(option.value as any)}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border-2 border-black transition-all",
                              genderFilter === option.value
                                ? "bg-black text-white"
                                : "bg-white text-black hover:bg-gray-100"
                            )}
                          >
                            <option.icon className="h-4 w-4" />
                            {option.label}
                          </button>
                        ))}
                      </div>

                      {/* AI Influencer Grid */}
                      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {filteredInfluencers.map(influencer => (
                          <button
                            key={influencer.id}
                            onClick={() => handleSelectAIInfluencer(influencer.id)}
                            className={cn(
                              "relative aspect-square rounded-xl border-[3px] border-black transition-all flex flex-col items-center justify-center gap-2 p-2",
                              selectedAIInfluencer === influencer.id
                                ? "bg-[#B4F056] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1"
                                : "bg-white hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1"
                            )}
                          >
                            <span className="text-4xl">{influencer.thumbnail}</span>
                            <span className="text-xs font-bold text-black truncate w-full text-center">{influencer.name}</span>
                            <span className="text-[10px] text-black/50 font-medium">{influencer.style}</span>
                            {selectedAIInfluencer === influencer.id && (
                              <div className="absolute top-1 right-1 bg-black text-white rounded-full p-0.5">
                                <Check className="h-3 w-3" strokeWidth={4} />
                              </div>
                            )}
                          </button>
                        ))}

                        {/* Generate Random */}
                        <button
                          onClick={() => {
                            const random = filteredInfluencers[Math.floor(Math.random() * filteredInfluencers.length)]
                            if (random) handleSelectAIInfluencer(random.id)
                          }}
                          className="aspect-square rounded-xl border-[3px] border-dashed border-black bg-[#F9F4EF] hover:bg-white transition-all flex flex-col items-center justify-center gap-2 p-2"
                        >
                          <Shuffle className="h-6 w-6 text-black" />
                          <span className="text-xs font-bold text-black">Random</span>
                        </button>
                      </div>

                      {selectedAIInfluencer && (
                        <p className="text-sm text-black/60">
                          Selected: <span className="font-bold text-black">{AI_INFLUENCERS.find(i => i.id === selectedAIInfluencer)?.name}</span>
                          {' '}— AI influencer allows pose and lighting flexibility
                        </p>
                      )}
                    </div>
                  )}
                </section>

              </div>
            </BrutalCard>

            {/* 3. Text & Details */}
            <BrutalCard title="3. Fine Tune" icon={Type}>
              <div className="space-y-3">
                <div>

                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold uppercase block">Headline</label>
                    <span className={cn(
                      "text-[10px] font-bold",
                      wordCount > 6 ? "text-red-500" : "text-black/50"
                    )}>
                      {wordCount}/6 words
                    </span>
                  </div>

                  <input
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g. Summer Sale"
                    className="w-full p-2 border-[3px] border-black font-bold focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none transition-shadow"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase mb-1 block">CTA Style</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['shop_now', 'learn_more'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setCtaType(type)}
                        className={cn(
                          "px-2 py-2 border-2 border-black text-xs font-bold uppercase transition-all",
                          ctaType === type ? "bg-black text-white" : "bg-white hover:bg-gray-100"
                        )}
                      >
                        {type.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Caption Tone - Mini */}
                <div>
                  <Label className="text-xs font-bold uppercase mb-1 block">Tone</Label>
                  <div className="flex flex-wrap gap-2">
                    {TONE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setCaptionTone(captionTone === opt.value ? '' : opt.value)}
                        className={cn(
                          "px-2 py-1 rounded border-2 border-black transition-all text-[10px] font-bold uppercase",
                          captionTone === opt.value
                            ? "bg-black text-white"
                            : "bg-white text-black hover:bg-gray-100"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Platforms - Mini */}
                <div>
                  <Label className="text-xs font-bold uppercase mb-1 block">Platforms</Label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORM_OPTIONS.map(platform => (
                      <button
                        key={platform.value}
                        onClick={() => togglePlatform(platform.value)}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded border-2 border-black transition-all text-[10px] font-bold uppercase",
                          selectedPlatforms.includes(platform.value)
                            ? "bg-[#B4F056] text-black"
                            : "bg-white text-black hover:bg-gray-100"
                        )}
                      >
                        {platform.label}
                      </button>
                    ))}
                  </div>
                </div>


              </div>
            </BrutalCard>

            <BrutalButton
              variant="action"
              className="w-full py-6 text-xl"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : <Zap className="fill-black" />}
              {loading ? 'GENERATING MAGIC...' : 'GENERATE AD'}
            </BrutalButton>

          </div>

          {/* RIGHT PANEL: PREVIEW / RESULTS (Sticky) */}
          <div className="lg:col-span-8">
            <div className="sticky top-24 h-[calc(100vh-8rem)]">
              <BrutalCard className="h-full flex flex-col p-0 overflow-hidden relative bg-[#E5E5E5]" title="">
                {/* Workspace Header */}
                <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 pointer-events-none">
                  <div className="bg-white border-2 border-black px-3 py-1 font-mono text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    CANVAS: 1080x1350
                  </div>
                  {generatedImage && (
                    <div className="bg-[#B4F056] border-2 border-black px-3 py-1 font-bold text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2">
                      <Check className="w-4 h-4" /> READY
                    </div>
                  )}
                </div>

                {/* Canvas Area */}
                <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden bg-[#F0F0F0]">

                  {/* Grid Pattern Background */}
                  <div className="absolute inset-0 opacity-[0.03]"
                    style={{
                      backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
                      backgroundSize: '20px 20px'
                    }}
                  />

                  {loading ? (
                    <div className="flex flex-col items-center justify-center w-full h-full z-10">
                      {/* Loading Animation */}
                      <div className="relative w-64 h-64 bg-white border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center overflow-hidden mb-8">
                        <div className="absolute inset-0 bg-[#B4F056]/20 animate-pulse" />

                        {/* Rolling text or icon */}
                        <Loader2 className="w-16 h-16 text-black animate-spin relative z-10" strokeWidth={3} />
                        {/* Scanning Line */}
                        <motion.div
                          className="absolute left-0 w-full h-[4px] bg-[#B4F056] shadow-[0_0_10px_#B4F056] z-20"
                          animate={{ top: ['0%', '100%', '0%'] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        />
                      </div>

                      <div className="text-center space-y-2 relative z-20">
                        <h3 className="text-2xl font-black uppercase tracking-tighter animate-pulse">
                          Constructing Creative
                        </h3>
                        <div className="flex items-center justify-center gap-2 text-sm font-bold font-mono bg-black text-white px-3 py-1">
                          <span className="w-2 h-2 bg-[#B4F056] rounded-full animate-ping" />
                          PROCESSING ASSETS
                        </div>
                        <p className="text-xs font-bold text-black/40 pt-2">POWERED BY NANOBANANA PRO</p>
                      </div>
                    </div>
                  ) : generatedImage ? (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="relative max-h-full aspect-[4/5] shadow-2xl border-[4px] border-black bg-white z-10"
                    >
                      <img src={generatedImage} className="w-full h-full object-cover" alt="Generated Ad" />

                      {/* Mock Overlay Elements based on inputs */}
                      <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none">
                        {headline && (
                          <h2 className="text-4xl font-black text-white drop-shadow-[0_4px_0_rgba(0,0,0,1)] uppercase tracking-tighter mb-4 px-4 break-words">
                            {headline}
                          </h2>
                        )}
                        <button className="bg-white text-black font-bold py-3 px-8 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] uppercase">
                          {ctaType.replace('_', ' ')}
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="text-center opacity-30 z-10">
                      <div className="w-32 h-32 border-4 border-black border-dashed rounded-full flex items-center justify-center mx-auto mb-4 bg-white/50">
                        <Layout className="w-12 h-12" />
                      </div>
                      <h3 className="text-3xl font-black uppercase">Canvas Empty</h3>
                      <p className="font-bold">Select inputs on the left to start</p>
                    </div>
                  )}
                </div>
              </BrutalCard>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
