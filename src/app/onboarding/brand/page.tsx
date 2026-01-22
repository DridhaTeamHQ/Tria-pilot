'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

const BRAND_TYPE_OPTIONS = [
  'Fast Fashion',
  'Luxury',
  'Sustainable',
  'Streetwear',
  'Vintage',
  'Athleisure',
  'Minimalist',
  'Bohemian',
]
const AUDIENCE_OPTIONS = ['Men', 'Women', 'Unisex', 'Kids']
const PRODUCT_TYPE_OPTIONS = ['Clothing', 'Accessories', 'Footwear', 'Beauty', 'Lifestyle', 'Jewelry']
const VERTICAL_OPTIONS = ['Fashion', 'Tech', 'Lifestyle', 'Sports', 'Entertainment', 'Other']
const BUDGET_RANGES = ['$0-1k', '$1k-5k', '$5k-10k', '$10k-25k', '$25k+']

export default function BrandOnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    companyName: '',
    brandType: '',
    targetAudience: [] as string[],
    productTypes: [] as string[],
    website: '',
    vertical: '',
    budgetRange: '',
  })

  useEffect(() => {
    // Check if already completed
    fetch('/api/onboarding/brand')
      .then((res) => res.json())
      .then((data) => {
        if (data.onboardingCompleted) {
          // Redirect to dashboard which will handle routing
        router.replace('/dashboard')
        } else if (data.profile) {
          // Load existing data
          setFormData({
            companyName: data.profile.companyName || '',
            brandType: data.profile.brandType || '',
            targetAudience: (data.profile.targetAudience as string[]) || [],
            productTypes: (data.profile.productTypes as string[]) || [],
            website: data.profile.website ?? '',
            vertical: data.profile.vertical || '',
            budgetRange: data.profile.budgetRange || '',
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
      await fetch('/api/onboarding/brand', {
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
      const response = await fetch('/api/onboarding/brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete onboarding')
      }

      if (data.onboardingCompleted) {
        toast.success('Onboarding completed!')
        // Redirect to dashboard which will handle routing
        router.replace('/dashboard')
      } else {
        toast.error('Please fill all required fields')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to complete onboarding')
    } finally {
      setLoading(false)
    }
  }

  const toggleSelection = (field: 'targetAudience' | 'productTypes', value: string) => {
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
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              placeholder="Your brand name"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              required
            />
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <Label>Brand Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {BRAND_TYPE_OPTIONS.map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={formData.brandType === type ? 'default' : 'outline'}
                  onClick={() => setFormData({ ...formData, brandType: type })}
                >
                  {type}
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
                  variant={formData.targetAudience.includes(audience) ? 'default' : 'outline'}
                  onClick={() => toggleSelection('targetAudience', audience)}
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
            <Label>Product Types (select all that apply)</Label>
            <div className="grid grid-cols-2 gap-2">
              {PRODUCT_TYPE_OPTIONS.map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={formData.productTypes.includes(type) ? 'default' : 'outline'}
                  onClick={() => toggleSelection('productTypes', type)}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-4">
            <Label htmlFor="website">Website URL</Label>
            <Input
              id="website"
              type="url"
              placeholder="https://yourbrand.com"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            />
          </div>
        )

      case 6:
        return (
          <div className="space-y-4">
            <Label>Industry Vertical</Label>
            <div className="grid grid-cols-2 gap-2">
              {VERTICAL_OPTIONS.map((vertical) => (
                <Button
                  key={vertical}
                  type="button"
                  variant={formData.vertical === vertical ? 'default' : 'outline'}
                  onClick={() => setFormData({ ...formData, vertical })}
                >
                  {vertical}
                </Button>
              ))}
            </div>
          </div>
        )

      case 7:
        return (
          <div className="space-y-4">
            <Label>Budget Range for Collaborations</Label>
            <div className="grid grid-cols-2 gap-2">
              {BUDGET_RANGES.map((range) => (
                <Button
                  key={range}
                  type="button"
                  variant={formData.budgetRange === range ? 'default' : 'outline'}
                  onClick={() => setFormData({ ...formData, budgetRange: range })}
                >
                  {range}
                </Button>
              ))}
            </div>
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
          <CardTitle>Complete Your Brand Profile</CardTitle>
          <CardDescription>
            Step {step} of 7 - Let&apos;s set up your brand profile
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
              <Button type="submit" disabled={loading}>
                {step === 7 ? (loading ? 'Completing...' : 'Complete') : 'Next'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

