'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  User,
  Building2,
  Globe,
  Mail,
  Phone,
  Save,
  Loader2,
  Instagram,
  Twitter,
  Linkedin,
} from 'lucide-react'

interface BrandProfile {
  companyName: string
  brandType: string
  vertical: string
  website: string
  description: string
  contactEmail: string
  contactPhone: string
  socialLinks: {
    instagram: string
    twitter: string
    linkedin: string
  }
}

const BRAND_TYPES = ['Direct-to-Consumer', 'Enterprise', 'Startup', 'Agency', 'Retailer', 'Other']
const VERTICALS = ['Fashion', 'Beauty', 'Lifestyle', 'Tech', 'Food & Beverage', 'Health & Fitness', 'Home & Living', 'Other']

export default function BrandProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<BrandProfile>({
    companyName: '',
    brandType: '',
    vertical: '',
    website: '',
    description: '',
    contactEmail: '',
    contactPhone: '',
    socialLinks: {
      instagram: '',
      twitter: '',
      linkedin: '',
    },
  })

  useEffect(() => {
    void fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      const brandData = data.profile?.brand_data || {}
      setProfile({
        companyName: brandData.companyName || '',
        brandType: brandData.brandType || '',
        vertical: brandData.vertical || '',
        website: brandData.website || '',
        description: brandData.description || '',
        contactEmail: brandData.contactEmail || data.profile?.email || '',
        contactPhone: brandData.contactPhone || '',
        socialLinks: {
          instagram: brandData.socialLinks?.instagram || '',
          twitter: brandData.socialLinks?.twitter || '',
          linkedin: brandData.socialLinks?.linkedin || '',
        },
      })
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/onboarding/brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: profile.companyName,
          brandType: profile.brandType,
          vertical: profile.vertical,
          website: profile.website,
          description: profile.description,
          contactEmail: profile.contactEmail,
          contactPhone: profile.contactPhone,
          socialLinks: profile.socialLinks,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success('Profile updated successfully!')
    } catch (error) {
      console.error('Failed to save profile:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: keyof Omit<BrandProfile, 'socialLinks'>, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }))
  }

  const updateSocialLink = (platform: keyof BrandProfile['socialLinks'], value: string) => {
    setProfile((prev) => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [platform]: value },
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-10 animate-fade-in">
      <div className="mb-8 md:mb-10">
        <h1 className="text-3xl md:text-5xl font-black text-black mb-2 leading-tight flex items-center gap-2.5 md:gap-3">
          <User className="w-9 h-9 md:w-10 md:h-10" />
          Brand Profile
        </h1>
        <p className="text-base md:text-xl text-black/65 font-medium">
          Manage your brand information and settings
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="bg-white border-[3px] border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] p-5 md:p-7 lg:p-8">
          <h2 className="text-3xl font-black mb-6 flex items-center gap-3">
            <Building2 className="w-7 h-7" />
            Company Information
          </h2>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-black uppercase tracking-wider mb-2.5">Company Name *</label>
              <input
                type="text"
                value={profile.companyName}
                onChange={(e) => updateField('companyName', e.target.value)}
                className="w-full px-5 py-3.5 border-2 border-black text-lg font-semibold focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-black uppercase tracking-wider mb-2.5">Brand Type</label>
                <select
                  value={profile.brandType}
                  onChange={(e) => updateField('brandType', e.target.value)}
                  className="w-full px-5 py-3.5 border-2 border-black text-lg font-semibold bg-white"
                >
                  <option value="">Select type</option>
                  {BRAND_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-black uppercase tracking-wider mb-2.5">Industry Vertical</label>
                <select
                  value={profile.vertical}
                  onChange={(e) => updateField('vertical', e.target.value)}
                  className="w-full px-5 py-3.5 border-2 border-black text-lg font-semibold bg-white"
                >
                  <option value="">Select vertical</option>
                  {VERTICALS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-black uppercase tracking-wider mb-2.5">Website</label>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/45" />
                <input
                  type="url"
                  value={profile.website}
                  onChange={(e) => updateField('website', e.target.value)}
                  className="w-full pl-12 pr-5 py-3.5 border-2 border-black text-lg font-medium focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none"
                  placeholder="https://yourbrand.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-black uppercase tracking-wider mb-2.5">Brand Description</label>
              <textarea
                value={profile.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={5}
                className="w-full px-5 py-3.5 border-2 border-black text-lg font-medium focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none resize-y"
                placeholder="Tell us about your brand..."
              />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <section className="bg-white border-[3px] border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] p-5 md:p-7">
            <h2 className="text-2xl md:text-3xl font-black mb-5 flex items-center gap-3">
              <Mail className="w-6 h-6" />
              Contact Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-black uppercase tracking-wider mb-2.5">Contact Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/45" />
                  <input
                    type="email"
                    value={profile.contactEmail}
                    onChange={(e) => updateField('contactEmail', e.target.value)}
                    className="w-full pl-12 pr-5 py-3.5 border-2 border-black text-base md:text-lg font-medium focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-black uppercase tracking-wider mb-2.5">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/45" />
                  <input
                    type="tel"
                    value={profile.contactPhone}
                    onChange={(e) => updateField('contactPhone', e.target.value)}
                    className="w-full pl-12 pr-5 py-3.5 border-2 border-black text-base md:text-lg font-medium focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white border-[3px] border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] p-5 md:p-7">
            <h2 className="text-2xl md:text-3xl font-black mb-5 flex items-center gap-3">
              <Instagram className="w-6 h-6" />
              Social Media
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-black uppercase tracking-wider mb-2.5">Instagram</label>
                <div className="relative">
                  <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/45" />
                  <input
                    type="text"
                    value={profile.socialLinks.instagram}
                    onChange={(e) => updateSocialLink('instagram', e.target.value)}
                    className="w-full pl-12 pr-5 py-3.5 border-2 border-black text-base md:text-lg font-medium focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none"
                    placeholder="@yourbrand"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-black uppercase tracking-wider mb-2.5">Twitter / X</label>
                <div className="relative">
                  <Twitter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/45" />
                  <input
                    type="text"
                    value={profile.socialLinks.twitter}
                    onChange={(e) => updateSocialLink('twitter', e.target.value)}
                    className="w-full pl-12 pr-5 py-3.5 border-2 border-black text-base md:text-lg font-medium focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none"
                    placeholder="@yourbrand"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-black uppercase tracking-wider mb-2.5">LinkedIn</label>
                <div className="relative">
                  <Linkedin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/45" />
                  <input
                    type="text"
                    value={profile.socialLinks.linkedin}
                    onChange={(e) => updateSocialLink('linkedin', e.target.value)}
                    className="w-full pl-12 pr-5 py-3.5 border-2 border-black text-base md:text-lg font-medium focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none"
                    placeholder="company/yourbrand"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-4 md:py-5 bg-[#B4F056] border-[3px] border-black font-black uppercase text-xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-[1px] disabled:opacity-50 transition-all flex items-center justify-center gap-3"
        >
          {saving ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <Save className="w-6 h-6" />
              Save Changes
            </>
          )}
        </button>
      </form>
    </div>
  )
}
