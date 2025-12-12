'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

const NICHE_OPTIONS = ['Fashion', 'Lifestyle', 'Tech', 'Beauty', 'Fitness', 'Travel', 'Food', 'Gaming']
const AUDIENCE_OPTIONS = ['Men', 'Women', 'Unisex', 'Kids']
const CATEGORY_OPTIONS = ['Casual', 'Formal', 'Streetwear', 'Vintage', 'Sustainable', 'Luxury', 'Athleisure']

export default function InfluencerOnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
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
  }, [router])

  const handleNext = async () => {
    if (step < 7) {
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
        // Optional: upload profile photos selected in step 7
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

      case 7:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="photos">Add Your Photos (optional)</Label>
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Complete Your Profile</CardTitle>
          <CardDescription>
            Step {step} of 7 - Let's set up your influencer profile
          </CardDescription>
          <div className="mt-4">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((s) => (
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
                {step === 7
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

