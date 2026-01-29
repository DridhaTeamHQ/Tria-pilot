'use client'

import { useState, useEffect, useCallback, useTransition, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Loader2, Upload, X, Users, TrendingUp, Activity } from 'lucide-react'
import {
  IDENTITY_IMAGE_REQUIREMENTS,
  type IdentityImageType,
  getUploadProgress
} from '@/lib/identity/types'

// Neo-Brutal Components
import { OnboardingCard } from '@/components/brutal/onboarding/OnboardingCard'
import { ChoiceChip } from '@/components/brutal/onboarding/ChoiceChip'
import { BrutalInput, BrutalTextarea, BrutalNumberInput } from '@/components/brutal/onboarding/BrutalInput'
import { DecorativeShapes } from '@/components/brutal/onboarding/DecorativeShapes'

const NICHE_OPTIONS = ['Fashion', 'Lifestyle', 'Tech', 'Beauty', 'Fitness', 'Travel', 'Food', 'Gaming']
const AUDIENCE_OPTIONS = ['Men', 'Women', 'Unisex', 'Kids']
const CATEGORY_OPTIONS = ['Casual', 'Formal', 'Streetwear', 'Vintage', 'Sustainable', 'Luxury', 'Athleisure']
const TOTAL_STEPS = 9

export default function InfluencerOnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)

  // Identity images state
  const [identityImages, setIdentityImages] = useState<Record<IdentityImageType, { file?: File; url?: string; uploading?: boolean }>>({
    face_front: {},
    face_left: {},
    face_right: {},
    face_smile: {},
    body_front: {},
    body_left: {},
    body_right: {},
  })
  const [identityProgress, setIdentityProgress] = useState(0)

  const [formData, setFormData] = useState({
    gender: '',
    niches: [] as string[],
    audienceType: [] as string[],
    preferredCategories: [] as string[],
    socials: {
      instagram: '',
      tiktok: '',
      youtube: '',
      twitter: '',
    },
    bio: '',
    audienceRate: '',
    retentionRate: '',
    followers: '',
    engagementRate: '',
  })

  // Calculate identity upload progress
  const updateIdentityProgress = useCallback(() => {
    const uploadedTypes = Object.entries(identityImages)
      .filter(([, data]) => data.url)
      .map(([type]) => type as IdentityImageType)
    setIdentityProgress(getUploadProgress(uploadedTypes))
  }, [identityImages])

  useEffect(() => {
    updateIdentityProgress()
  }, [identityImages, updateIdentityProgress])

  // DEFERRED data loading - runs AFTER initial paint
  useEffect(() => {
    // Use requestIdleCallback to defer API calls
    const loadData = () => {
      fetch('/api/onboarding/influencer')
        .then((res) => res.json())
        .then((data) => {
          if (data.onboardingCompleted) {
            router.replace('/dashboard')
          } else if (data.profile) {
            const existingSocials = (data.profile.socials as Record<string, string>) || {}
            setFormData({
              gender: data.profile.gender || '',
              niches: (data.profile.niches as string[]) || [],
              audienceType: (data.profile.audienceType as string[]) || [],
              preferredCategories: (data.profile.preferredCategories as string[]) || [],
              socials: {
                instagram: existingSocials.instagram || '',
                tiktok: existingSocials.tiktok || '',
                youtube: existingSocials.youtube || '',
                twitter: existingSocials.twitter || '',
              },
              bio: data.profile.bio || '',
              audienceRate: data.profile.audienceRate != null ? String(data.profile.audienceRate) : '',
              retentionRate: data.profile.retentionRate != null ? String(data.profile.retentionRate) : '',
              followers: data.profile.followers != null ? String(data.profile.followers) : '',
              engagementRate: data.profile.engagementRate != null ? String(Number(data.profile.engagementRate) * 100) : '',
            })
          }
          setDataLoaded(true)
        })
        .catch(() => setDataLoaded(true))

      // Load identity images in background
      fetch('/api/identity-images')
        .then((res) => res.json())
        .then((data) => {
          if (data.images) {
            const existing: Record<IdentityImageType, { url?: string }> = {} as Record<IdentityImageType, { url?: string }>
            for (const img of data.images) {
              existing[img.imageType as IdentityImageType] = { url: img.imageUrl }
            }
            setIdentityImages(prev => ({ ...prev, ...existing }))
          }
        })
        .catch(() => { })
    }

    // Defer loading to after paint
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(loadData)
    } else {
      setTimeout(loadData, 100)
    }
  }, [router])

  // Background save progress (non-blocking)
  const saveProgressInBackground = useCallback(() => {
    const payload = {
      ...formData,
      audienceRate: formData.audienceRate === '' ? undefined : Number(formData.audienceRate),
      retentionRate: formData.retentionRate === '' ? undefined : Number(formData.retentionRate),
      followers: formData.followers === '' ? undefined : Number(formData.followers),
      engagementRate: formData.engagementRate === '' ? undefined : Number(formData.engagementRate),
    }

    fetch('/api/onboarding/influencer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(err => console.warn('Background save failed:', err))
  }, [formData])

  // Check if current step has required data filled
  const canProceed = () => {
    switch (step) {
      case 1: // Gender - REQUIRED
        return formData.gender !== ''
      case 2: // Niches - REQUIRED (at least 1)
        return formData.niches.length > 0
      case 3: // Target Audience - REQUIRED (at least 1)
        return formData.audienceType.length > 0
      case 4: // Clothing Categories - REQUIRED (at least 1)
        return formData.preferredCategories.length > 0
      case 5: // Social Media - OPTIONAL
        return true
      case 6: // Audience Metrics - REQUIRED (growth + retention)
        return formData.audienceRate !== '' && formData.retentionRate !== ''
      case 7: // Bio - OPTIONAL
        return true
      case 8: // AI Studio - OPTIONAL
        return true
      case 9: // Profile Photos - OPTIONAL
        return true
      default:
        return true
    }
  }

  // Optimistic step navigation
  const handleNext = () => {
    if (!canProceed()) {
      const messages: Record<number, string> = {
        1: 'Please select your gender to continue.',
        2: 'Please select at least one niche.',
        3: 'Please select at least one target audience.',
        4: 'Please select at least one clothing category.',
        6: 'Please enter both growth and retention rates.',
      }
      toast.error(messages[step] || 'Please complete this step.')
      return
    }

    if (step < TOTAL_STEPS) {
      setStep(step + 1)
      startTransition(() => {
        saveProgressInBackground()
      })
    } else {
      handleSubmit()
    }
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const payload = {
        ...formData,
        audienceRate: formData.audienceRate === '' ? undefined : Number(formData.audienceRate),
        retentionRate: formData.retentionRate === '' ? undefined : Number(formData.retentionRate),
        followers: formData.followers === '' ? undefined : Number(formData.followers),
        engagementRate: formData.engagementRate === '' ? undefined : Number(formData.engagementRate),
      }

      const response = await fetch('/api/onboarding/influencer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete onboarding')
      }

      if (data.onboardingCompleted) {
        if (photoFiles.length > 0) {
          setUploadingPhotos(true)
          try {
            const toBase64 = (file: File) =>
              new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => resolve(String(reader.result))
                reader.onerror = () => reject(new Error('Failed to read image'))
                reader.readAsDataURL(file)
              })

            const files = photoFiles.slice(0, 3)
            for (let i = 0; i < files.length; i++) {
              const base64 = await toBase64(files[i])
              await fetch('/api/profile-images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  imageBase64: base64,
                  label: i === 0 ? 'primary' : `onboarding_${i + 1}`,
                  makePrimary: i === 0,
                }),
              })
            }
          } catch (e) {
            console.warn('Profile photo upload failed:', e)
          } finally {
            setUploadingPhotos(false)
          }
        }

        toast.success('Onboarding completed! Pending admin approval.', {
          style: { background: '#FFD93D', border: '2px solid black', color: 'black', fontWeight: 'bold' }
        })
        // Redirect to pending approval page (admin must approve before dashboard access)
        router.replace('/influencer/pending')
      } else {
        toast.error('Please fill all required fields')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to complete onboarding')
    } finally {
      setLoading(false)
    }
  }

  const toggleSelection = (field: 'niches' | 'audienceType' | 'preferredCategories', value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((item) => item !== value)
        : [...prev[field], value],
    }))
  }

  const handleIdentityImageSelect = async (type: IdentityImageType, file: File) => {
    const previewUrl = URL.createObjectURL(file)
    setIdentityImages(prev => ({ ...prev, [type]: { file, url: previewUrl, uploading: true } }))

    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)
      formDataUpload.append('imageType', type)

      const response = await fetch('/api/identity-images', {
        method: 'POST',
        body: formDataUpload,
      })

      if (!response.ok) throw new Error('Failed to upload')

      const data = await response.json()
      setIdentityImages(prev => ({ ...prev, [type]: { url: data.image.imageUrl, uploading: false } }))
      toast.success(`${IDENTITY_IMAGE_REQUIREMENTS.find(r => r.type === type)?.label} uploaded!`)
    } catch (error) {
      console.error('Upload failed:', error)
      setIdentityImages(prev => ({ ...prev, [type]: { uploading: false } }))
      toast.error('Failed to upload image. Please try again.')
    }
  }

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Gender'
      case 2: return 'Your Niches'
      case 3: return 'Target Audience'
      case 4: return 'Clothing Categories'
      case 5: return 'Social Media'
      case 6: return 'Audience Metrics'
      case 7: return 'Bio'
      case 8: return 'AI Studio Setup'
      case 9: return 'Profile Photos'
      default: return 'Profile Setup'
    }
  }

  const getSocialVerifyUrl = (platform: string, username: string) => {
    if (!username) return undefined
    const cleanUsername = username.replace(/^@/, '')
    switch (platform) {
      case 'instagram': return `https://instagram.com/${cleanUsername}`
      case 'tiktok': return `https://tiktok.com/@${cleanUsername}`
      case 'youtube': return `https://youtube.com/@${cleanUsername}`
      case 'twitter': return `https://twitter.com/${cleanUsername}`
      default: return undefined
    }
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="flex flex-col gap-3">
            {['Male', 'Female', 'Other'].map((option) => (
              <ChoiceChip
                key={option}
                label={option}
                selected={formData.gender === option}
                onClick={() => setFormData({ ...formData, gender: option })}
                icon={option === 'Male' ? '👨' : option === 'Female' ? '👩' : '🧑'}
              />
            ))}
          </div>
        )

      case 2:
        return (
          <div className="grid grid-cols-2 gap-3">
            {NICHE_OPTIONS.map((niche) => (
              <ChoiceChip
                key={niche}
                label={niche}
                selected={formData.niches.includes(niche)}
                onClick={() => toggleSelection('niches', niche)}
              />
            ))}
          </div>
        )

      case 3:
        return (
          <div className="grid grid-cols-2 gap-3">
            {AUDIENCE_OPTIONS.map((audience) => (
              <ChoiceChip
                key={audience}
                label={audience}
                selected={formData.audienceType.includes(audience)}
                onClick={() => toggleSelection('audienceType', audience)}
              />
            ))}
          </div>
        )

      case 4:
        return (
          <div className="grid grid-cols-2 gap-3">
            {CATEGORY_OPTIONS.map((category) => (
              <ChoiceChip
                key={category}
                label={category}
                selected={formData.preferredCategories.includes(category)}
                onClick={() => toggleSelection('preferredCategories', category)}
              />
            ))}
          </div>
        )

      case 5:
        return (
          <div className="space-y-5">
            <BrutalInput
              label="Instagram"
              icon={<span className="text-pink-500">📸</span>}
              placeholder="@your_username"
              value={formData.socials.instagram}
              onChange={(e) => setFormData({ ...formData, socials: { ...formData.socials, instagram: e.target.value } })}
              showVerify={Boolean(formData.socials.instagram)}
              verifyUrl={getSocialVerifyUrl('instagram', formData.socials.instagram)}
            />
            <BrutalInput
              label="TikTok"
              icon={<span>🎵</span>}
              placeholder="@your_username"
              value={formData.socials.tiktok}
              onChange={(e) => setFormData({ ...formData, socials: { ...formData.socials, tiktok: e.target.value } })}
              showVerify={Boolean(formData.socials.tiktok)}
              verifyUrl={getSocialVerifyUrl('tiktok', formData.socials.tiktok)}
            />
            <BrutalInput
              label="YouTube"
              icon={<span className="text-red-500">▶️</span>}
              placeholder="Channel name"
              value={formData.socials.youtube}
              onChange={(e) => setFormData({ ...formData, socials: { ...formData.socials, youtube: e.target.value } })}
              showVerify={Boolean(formData.socials.youtube)}
              verifyUrl={getSocialVerifyUrl('youtube', formData.socials.youtube)}
            />
          </div>
        )

      case 6:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <BrutalNumberInput
              label="Total Followers"
              icon={<Users className="w-4 h-4 text-[#FF8C69]" />}
              placeholder="e.g. 50K or 1.5M"
              value={formData.followers}
              onChange={(e) => setFormData({ ...formData, followers: e.target.value })}
              max={500000000}
              allowKMNotation={true}
            />
            <BrutalNumberInput
              label="Engagement Rate"
              icon={<Activity className="w-4 h-4 text-[#B4F056]" />}
              placeholder="e.g. 5.5"
              unit="%"
              value={formData.engagementRate}
              onChange={(e) => setFormData({ ...formData, engagementRate: e.target.value })}
              max={100}
            />
            <BrutalNumberInput
              label="Growth Rate"
              icon={<TrendingUp className="w-4 h-4 text-[#FFD93D]" />}
              placeholder="e.g. 12.5"
              unit="%"
              value={formData.audienceRate}
              onChange={(e) => setFormData({ ...formData, audienceRate: e.target.value })}
              max={1000}
            />
            <BrutalNumberInput
              label="Retention Rate"
              icon={<TrendingUp className="w-4 h-4 text-[#FF8C69]" />}
              placeholder="e.g. 45"
              unit="%"
              value={formData.retentionRate}
              onChange={(e) => setFormData({ ...formData, retentionRate: e.target.value })}
              max={100}
            />
          </div>
        )

      case 7:
        return (
          <BrutalTextarea
            label="Tell us about your style"
            placeholder="I love vintage fashion and sustainable brands..."
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          />
        )

      case 8:
        return (
          <div className="space-y-5">
            <div className="bg-[#B4F056] border-[3px] border-black rounded-xl p-4 flex items-center gap-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-2xl">📸</span>
              <div>
                <p className="font-black text-sm">Upload clear photos for best AI results!</p>
                <p className="text-xs text-black/60 font-medium">Progress: {identityProgress}% complete</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {IDENTITY_IMAGE_REQUIREMENTS.map((req) => (
                <div key={req.type} className="space-y-1.5">
                  <span className="text-xs font-bold text-black/70 ml-1">{req.label}</span>
                  <div className="relative aspect-[3/4] border-[3px] border-dashed border-black/30 rounded-xl bg-white hover:border-black hover:bg-gray-50 transition-all cursor-pointer overflow-hidden group">
                    {identityImages[req.type]?.url ? (
                      <>
                        <img src={identityImages[req.type].url} className="w-full h-full object-cover" alt={req.label} />
                        {identityImages[req.type]?.uploading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                          </div>
                        )}
                        <button
                          onClick={() => setIdentityImages(prev => ({ ...prev, [req.type]: {} }))}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer p-2 text-center">
                        <Upload className="w-7 h-7 mb-1 text-black/30" />
                        <span className="text-[10px] font-bold text-black/40">{req.description}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleIdentityImageSelect(req.type, file)
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 9:
        return (
          <div className="space-y-4">
            <div className="border-[3px] border-dashed border-black/30 rounded-xl p-8 bg-white text-center cursor-pointer hover:border-black hover:bg-gray-50 transition-all">
              <input
                type="file"
                multiple
                className="hidden"
                id="profile-photos"
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  setPhotoFiles(files.slice(0, 3))
                }}
              />
              <label htmlFor="profile-photos" className="cursor-pointer">
                <div className="w-16 h-16 bg-[#FF8C69] rounded-full flex items-center justify-center mx-auto mb-4 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <Upload className="w-7 h-7 text-black" />
                </div>
                <h3 className="text-xl font-black mb-1">Upload Profile Photos</h3>
                <p className="text-sm text-black/50 font-medium">Select up to 3 of your best shots</p>
              </label>
            </div>
            {photoFiles.length > 0 && (
              <div className="flex gap-2 justify-center flex-wrap">
                {photoFiles.map((f, i) => (
                  <div key={i} className="text-xs font-bold bg-[#FFD93D] px-3 py-1.5 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    {f.name.length > 15 ? f.name.slice(0, 15) + '...' : f.name}
                  </div>
                ))}
              </div>
            )}
            {uploadingPhotos && (
              <div className="text-center text-sm font-bold text-black/60">
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                Uploading photos...
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center bg-[#1a1a1a] p-4 lg:p-8 overflow-hidden">
      {/* Background - CSS only, no JS animation */}
      <div
        className="absolute inset-0 z-0 opacity-50 blur-sm"
        style={{
          backgroundImage: "url('/assets/login-influencer-background.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#2a1a0a]/60 via-transparent to-black/70 z-[1]" />

      <DecorativeShapes />

      <div className="w-full max-w-2xl relative z-20 py-12">
        <OnboardingCard
          title="Complete Your Profile"
          step={step}
          totalSteps={TOTAL_STEPS}
          stepTitle={getStepTitle()}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t-2 border-black/10">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className={`
                px-6 py-3 rounded-xl font-black flex items-center gap-2 transition-all border-[3px]
                ${step === 1
                  ? 'opacity-0 pointer-events-none border-transparent'
                  : 'border-black/20 hover:border-black hover:bg-white text-black/60 hover:text-black active:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]'
                }
              `}
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={3} />
              Back
            </button>

            <button
              onClick={handleNext}
              disabled={loading || isPending || !canProceed()}
              className={`
                px-8 py-3.5 border-[3px] border-black rounded-xl font-black text-black 
                transition-all flex items-center gap-2
                ${canProceed()
                  ? 'bg-[#FF8C69] shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0'
                  : 'bg-gray-300 shadow-none cursor-not-allowed opacity-50'
                }
                disabled:opacity-50
              `}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : step === TOTAL_STEPS ? (
                <>🎉 Finish Setup</>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-5 h-5" strokeWidth={3} />
                </>
              )}
            </button>
          </div>
        </OnboardingCard>
      </div>
    </div>
  )
}
