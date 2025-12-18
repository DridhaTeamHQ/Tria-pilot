'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { 
  IDENTITY_IMAGE_REQUIREMENTS, 
  type IdentityImageType,
  getUploadProgress,
  isIdentitySetupComplete 
} from '@/lib/identity/types'

const NICHE_OPTIONS = ['Fashion', 'Lifestyle', 'Tech', 'Beauty', 'Fitness', 'Travel', 'Food', 'Gaming']
const AUDIENCE_OPTIONS = ['Men', 'Women', 'Unisex', 'Kids']
const CATEGORY_OPTIONS = ['Casual', 'Formal', 'Streetwear', 'Vintage', 'Sustainable', 'Luxury', 'Athleisure']

const TOTAL_STEPS = 8 // Added identity images step

export default function InfluencerOnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  
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

  useEffect(() => {
    // Check if already completed
    fetch('/api/onboarding/influencer')
      .then((res) => res.json())
      .then((data) => {
        if (data.onboardingCompleted) {
          router.push('/influencer/dashboard')
        } else if (data.profile) {
          // Load existing data
          const existingSocials = (data.profile.socials as any) || {}
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
          })
        }
      })
    
    // Load existing identity images
    fetch('/api/identity-images')
      .then((res) => res.json())
      .then((data) => {
        if (data.images) {
          const existing: Record<IdentityImageType, { url?: string }> = {} as any
          for (const img of data.images) {
            existing[img.imageType as IdentityImageType] = { url: img.imageUrl }
          }
          setIdentityImages(prev => ({ ...prev, ...existing }))
        }
      })
      .catch(() => {}) // Ignore errors for new users
  }, [router])

  const handleIdentityImageSelect = async (type: IdentityImageType, file: File) => {
    // Show preview immediately
    const previewUrl = URL.createObjectURL(file)
    setIdentityImages(prev => ({
      ...prev,
      [type]: { file, url: previewUrl, uploading: true }
    }))

    // Upload to server
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('imageType', type)

      const response = await fetch('/api/identity-images', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload')
      }

      const data = await response.json()
      
      setIdentityImages(prev => ({
        ...prev,
        [type]: { url: data.image.imageUrl, uploading: false }
      }))
      
      toast.success(`${IDENTITY_IMAGE_REQUIREMENTS.find(r => r.type === type)?.label} uploaded!`)
    } catch (error) {
      console.error('Upload failed:', error)
      setIdentityImages(prev => ({
        ...prev,
        [type]: { uploading: false }
      }))
      toast.error('Failed to upload image. Please try again.')
    }
  }

  const handleNext = async () => {
    if (step < TOTAL_STEPS) {
      // Save progress
      await saveProgress()
      setStep(step + 1)
    } else {
      // Final submission
      await handleSubmit()
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const saveProgress = async () => {
    try {
      await fetch('/api/onboarding/influencer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
    } catch (error) {
      console.error('Failed to save progress:', error)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/onboarding/influencer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete onboarding')
      }

      if (data.onboardingCompleted) {
        // Optional: upload profile photos selected in step 8
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

            const files = photoFiles.slice(0, 3) // onboarding: limit initial upload
            for (let i = 0; i < files.length; i++) {
              const base64 = await toBase64(files[i])
              const uploadRes = await fetch('/api/profile-images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  imageBase64: base64,
                  label: i === 0 ? 'primary' : `onboarding_${i + 1}`,
                  makePrimary: i === 0,
                }),
              })
              if (!uploadRes.ok) {
                const errData = await uploadRes.json().catch(() => null)
                throw new Error(errData?.error || `Failed to upload photo ${i + 1}`)
              }
            }
          } catch (e) {
            console.warn('Profile photo upload failed (non-blocking):', e)
            toast.error('Onboarding completed, but photo upload failed. You can add photos in Profile.')
          } finally {
            setUploadingPhotos(false)
          }
        }

        toast.success('Onboarding completed!')
        router.push('/influencer/dashboard')
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

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <Label htmlFor="gender">Gender</Label>
            <div className="flex gap-4">
              {['Male', 'Female', 'Other'].map((option) => (
                <Button
                  key={option}
                  type="button"
                  variant={formData.gender === option ? 'default' : 'outline'}
                  onClick={() => setFormData({ ...formData, gender: option })}
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <Label>Select Your Niches (select all that apply)</Label>
            <div className="grid grid-cols-2 gap-2">
              {NICHE_OPTIONS.map((niche) => (
                <Button
                  key={niche}
                  type="button"
                  variant={formData.niches.includes(niche) ? 'default' : 'outline'}
                  onClick={() => toggleSelection('niches', niche)}
                >
                  {niche}
                </Button>
              ))}
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <Label>Target Audience (select all that apply)</Label>
            <div className="grid grid-cols-2 gap-2">
              {AUDIENCE_OPTIONS.map((audience) => (
                <Button
                  key={audience}
                  type="button"
                  variant={formData.audienceType.includes(audience) ? 'default' : 'outline'}
                  onClick={() => toggleSelection('audienceType', audience)}
                >
                  {audience}
                </Button>
              ))}
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <Label>Preferred Clothing Categories (select all that apply)</Label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORY_OPTIONS.map((category) => (
                <Button
                  key={category}
                  type="button"
                  variant={formData.preferredCategories.includes(category) ? 'default' : 'outline'}
                  onClick={() => toggleSelection('preferredCategories', category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-4">
            <Label>Social Media Profiles</Label>
            <div className="space-y-3">
              <div>
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  placeholder="@username"
                  value={formData.socials.instagram}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socials: { ...formData.socials, instagram: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="tiktok">TikTok</Label>
                <Input
                  id="tiktok"
                  placeholder="@username"
                  value={formData.socials.tiktok}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socials: { ...formData.socials, tiktok: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="youtube">YouTube</Label>
                <Input
                  id="youtube"
                  placeholder="Channel name or URL"
                  value={formData.socials.youtube}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socials: { ...formData.socials, youtube: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="twitter">Twitter/X</Label>
                <Input
                  id="twitter"
                  placeholder="@username"
                  value={formData.socials.twitter}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socials: { ...formData.socials, twitter: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          </div>
        )

      case 6:
        return (
          <div className="space-y-4">
            <Label htmlFor="bio">Bio/Description</Label>
            <textarea
              id="bio"
              className="w-full min-h-[150px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Tell us about yourself, your style, and what makes you unique..."
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            />
          </div>
        )

      // NEW STEP 7: Identity Images for AI Try-On
      case 7:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-lg font-semibold">AI Try-On Reference Photos</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Upload photos of yourself from different angles. These help our AI create accurate virtual try-ons that look exactly like you.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-800 rounded overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${identityProgress}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{identityProgress}%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {IDENTITY_IMAGE_REQUIREMENTS.map((req) => (
                <div key={req.type} className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <span>{req.icon}</span>
                    {req.label}
                    {req.required && <span className="text-red-500">*</span>}
                  </Label>
                  
                  <div className="relative aspect-[3/4] border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg overflow-hidden hover:border-primary transition-colors">
                    {identityImages[req.type]?.url ? (
                      <>
                        <img 
                          src={identityImages[req.type].url} 
                          alt={req.label}
                          className="w-full h-full object-cover"
                        />
                        {identityImages[req.type]?.uploading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setIdentityImages(prev => ({ ...prev, [req.type]: {} }))}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer p-2 text-center">
                        <span className="text-2xl mb-1">📷</span>
                        <span className="text-xs text-muted-foreground">{req.description}</span>
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
                  
                  <p className="text-xs text-muted-foreground">{req.tips[0]}</p>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>💡 Tip:</strong> The more photos you upload, the better our AI can match your exact face in virtual try-ons. 
                Upload all 7 for best results!
              </p>
            </div>
          </div>
        )

      case 8:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="photos">Add Profile Photos (optional)</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Upload up to 3 photos now. You can manage up to 10 photos later in your Profile.
              </p>
            </div>
            <Input
              id="photos"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || [])
                setPhotoFiles(files.slice(0, 3))
              }}
            />
            {photoFiles.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Selected: {photoFiles.map((f) => f.name).join(', ')}
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Gender'
      case 2: return 'Your Niches'
      case 3: return 'Target Audience'
      case 4: return 'Clothing Categories'
      case 5: return 'Social Media'
      case 6: return 'Bio'
      case 7: return 'AI Try-On Setup'
      case 8: return 'Profile Photos'
      default: return 'Profile Setup'
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Complete Your Profile</CardTitle>
          <CardDescription>
            Step {step} of {TOTAL_STEPS} - {getStepTitle()}
          </CardDescription>
          <div className="mt-4">
            <div className="flex gap-2">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
                <div
                  key={s}
                  className={`h-2 flex-1 rounded ${
                    s <= step ? 'bg-primary' : 'bg-zinc-200 dark:bg-zinc-800'
                  }`}
                />
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleNext()
            }}
            className="space-y-6"
          >
            {renderStep()}
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={handleBack} disabled={step === 1}>
                Back
              </Button>
              <Button type="submit" disabled={loading || uploadingPhotos}>
                {step === TOTAL_STEPS
                  ? (loading || uploadingPhotos ? 'Completing...' : 'Complete')
                  : 'Next'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
