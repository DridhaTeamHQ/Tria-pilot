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
    Linkedin
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
        fetchProfile()
    }, [])

    const fetchProfile = async () => {
        try {
            const res = await fetch('/api/auth/me')
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
                    step: 'full',
                    ...profile,
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

    const updateField = (field: string, value: string) => {
        setProfile(prev => ({ ...prev, [field]: value }))
    }

    const updateSocialLink = (platform: string, value: string) => {
        setProfile(prev => ({
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
        <div className="container mx-auto px-6 py-8 max-w-3xl">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-black text-black mb-1">
                    <User className="inline-block w-8 h-8 mr-2 -mt-1" />
                    Brand Profile
                </h1>
                <p className="text-black/60 font-medium">
                    Manage your brand information and settings
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Company Info */}
                <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
                    <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        Company Information
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-black uppercase tracking-wider mb-2">
                                Company Name *
                            </label>
                            <input
                                type="text"
                                value={profile.companyName}
                                onChange={(e) => updateField('companyName', e.target.value)}
                                className="w-full px-4 py-3 border-2 border-black font-bold focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider mb-2">
                                    Brand Type
                                </label>
                                <select
                                    value={profile.brandType}
                                    onChange={(e) => updateField('brandType', e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-black font-bold bg-white"
                                >
                                    <option value="">Select type</option>
                                    {BRAND_TYPES.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider mb-2">
                                    Industry Vertical
                                </label>
                                <select
                                    value={profile.vertical}
                                    onChange={(e) => updateField('vertical', e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-black font-bold bg-white"
                                >
                                    <option value="">Select vertical</option>
                                    {VERTICALS.map(v => (
                                        <option key={v} value={v}>{v}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black uppercase tracking-wider mb-2">
                                Website
                            </label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black/40" />
                                <input
                                    type="url"
                                    value={profile.website}
                                    onChange={(e) => updateField('website', e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border-2 border-black font-medium focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none"
                                    placeholder="https://yourbrand.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black uppercase tracking-wider mb-2">
                                Brand Description
                            </label>
                            <textarea
                                value={profile.description}
                                onChange={(e) => updateField('description', e.target.value)}
                                rows={4}
                                className="w-full px-4 py-3 border-2 border-black font-medium focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none resize-none"
                                placeholder="Tell us about your brand..."
                            />
                        </div>
                    </div>
                </div>

                {/* Contact Info */}
                <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
                    <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                        <Mail className="w-5 h-5" />
                        Contact Information
                    </h2>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black uppercase tracking-wider mb-2">
                                Contact Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black/40" />
                                <input
                                    type="email"
                                    value={profile.contactEmail}
                                    onChange={(e) => updateField('contactEmail', e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border-2 border-black font-medium focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-black uppercase tracking-wider mb-2">
                                Phone Number
                            </label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black/40" />
                                <input
                                    type="tel"
                                    value={profile.contactPhone}
                                    onChange={(e) => updateField('contactPhone', e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border-2 border-black font-medium focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none"
                                    placeholder="+91 98765 43210"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Social Links */}
                <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
                    <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                        <Instagram className="w-5 h-5" />
                        Social Media
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-black uppercase tracking-wider mb-2">
                                Instagram
                            </label>
                            <div className="relative">
                                <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black/40" />
                                <input
                                    type="text"
                                    value={profile.socialLinks.instagram}
                                    onChange={(e) => updateSocialLink('instagram', e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border-2 border-black font-medium focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none"
                                    placeholder="@yourbrand"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black uppercase tracking-wider mb-2">
                                Twitter / X
                            </label>
                            <div className="relative">
                                <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black/40" />
                                <input
                                    type="text"
                                    value={profile.socialLinks.twitter}
                                    onChange={(e) => updateSocialLink('twitter', e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border-2 border-black font-medium focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none"
                                    placeholder="@yourbrand"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black uppercase tracking-wider mb-2">
                                LinkedIn
                            </label>
                            <div className="relative">
                                <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black/40" />
                                <input
                                    type="text"
                                    value={profile.socialLinks.linkedin}
                                    onChange={(e) => updateSocialLink('linkedin', e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border-2 border-black font-medium focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none"
                                    placeholder="company/yourbrand"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-4 bg-[#B4F056] border-[3px] border-black font-black uppercase text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
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
