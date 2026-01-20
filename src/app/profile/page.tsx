'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  User,
  Mail,
  Calendar,
  Loader2,
  Image as ImageIcon,
  TrendingUp,
  Trophy,
  Zap,
  Target,
  Check,
  X,
  Camera,
  Edit3,
  Shield,
  Star,
  Award,
  Settings,
  Trash2,
  Crown,
  Instagram,
  Youtube,
  Twitter,
  Search,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { useUser, useProfileStats } from '@/lib/react-query/hooks'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import BadgeDisplay, { type BadgeTier } from '@/components/influencer/BadgeDisplay'

type ProfileImage = {
  id: string
  imageUrl: string
  label: string | null
  isPrimary: boolean
  createdAt: string
}

export default function ProfilePage() {
  const { data: userData, isLoading: userLoading } = useUser()
  const { data: stats, isLoading: statsLoading } = useProfileStats()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [profileImages, setProfileImages] = useState<ProfileImage[]>([])
  const [profileImagesLoading, setProfileImagesLoading] = useState(false)
  const [profileImagesUploading, setProfileImagesUploading] = useState(false)
  const [editingSocials, setEditingSocials] = useState(false)
  const [socials, setSocials] = useState<Record<string, string>>({})
  const [socialsLoading, setSocialsLoading] = useState(false)
  const [socialsSaving, setSocialsSaving] = useState(false)
  const [metrics, setMetrics] = useState({ audienceRate: '', retentionRate: '' })
  const [badgeTier, setBadgeTier] = useState<BadgeTier>(null)
  const [badgeScore, setBadgeScore] = useState<number | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [metricsSaving, setMetricsSaving] = useState(false)

  useEffect(() => {
    if (userData?.name) {
      setName(userData.name)
    }
  }, [userData?.name])

  const fetchProfileImages = async () => {
    setProfileImagesLoading(true)
    try {
      const res = await fetch('/api/profile-images', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch profile images')
      setProfileImages((data.images || []) as ProfileImage[])
    } catch (e) {
      console.warn(e)
      // Silent: profile page still usable even if images fail
    } finally {
      setProfileImagesLoading(false)
    }
  }

  useEffect(() => {
    if (userData?.id) {
      fetchProfileImages()
      if (userData?.role === 'INFLUENCER') {
        fetchSocials()
        fetchMetrics()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.id, userData?.role])

  const fetchSocials = async () => {
    setSocialsLoading(true)
    try {
      const res = await fetch('/api/profile/socials')
      const data = await res.json()
      if (res.ok) {
        setSocials((data.socials || {}) as Record<string, string>)
      }
    } catch (e) {
      console.warn('Failed to fetch socials:', e)
    } finally {
      setSocialsLoading(false)
    }
  }

  const fetchMetrics = async () => {
    setMetricsLoading(true)
    try {
      const res = await fetch('/api/profile/metrics')
      const data = await res.json()
      if (res.ok && data?.profile) {
        setMetrics({
          audienceRate:
            data.profile.audienceRate !== null && data.profile.audienceRate !== undefined
              ? String(data.profile.audienceRate)
              : '',
          retentionRate:
            data.profile.retentionRate !== null && data.profile.retentionRate !== undefined
              ? String(data.profile.retentionRate)
              : '',
        })
        setBadgeTier(data.profile.badgeTier ?? null)
        setBadgeScore(
          data.profile.badgeScore !== null && data.profile.badgeScore !== undefined
            ? Number(data.profile.badgeScore)
            : null
        )
      }
    } catch (e) {
      console.warn('Failed to fetch metrics:', e)
    } finally {
      setMetricsLoading(false)
    }
  }

  const handleSaveSocials = async () => {
    setSocialsSaving(true)
    try {
      const response = await fetch('/api/profile/socials', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(socials),
      })
      if (response.ok) {
        setEditingSocials(false)
        toast.success('Social media links updated successfully')
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update social media')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update social media')
    } finally {
      setSocialsSaving(false)
    }
  }

  const handleSaveMetrics = async () => {
    setMetricsSaving(true)
    try {
      const response = await fetch('/api/profile/metrics', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audienceRate: metrics.audienceRate === '' ? 0 : Number(metrics.audienceRate),
          retentionRate: metrics.retentionRate === '' ? 0 : Number(metrics.retentionRate),
        }),
      })
      const data = await response.json()
      if (response.ok) {
        toast.success('Audience metrics updated')
        setBadgeTier(data?.profile?.badgeTier ?? badgeTier)
        setBadgeScore(
          data?.profile?.badgeScore !== null && data?.profile?.badgeScore !== undefined
            ? Number(data.profile.badgeScore)
            : badgeScore
        )
      } else {
        throw new Error(data.error || 'Failed to update metrics')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update metrics')
    } finally {
      setMetricsSaving(false)
    }
  }

  const loading = userLoading || statsLoading
  const profile = userData

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name cannot be empty')
      return
    }
    setSaving(true)
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['user'] })
        setEditing(false)
        toast.success('Profile updated successfully')
      } else {
        toast.error('Failed to update profile')
      }
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const getLevelInfo = (level: number) => {
    if (level >= 10) return { label: 'Master', color: 'bg-purple-500', textColor: 'text-purple-600', bgColor: 'bg-purple-50', icon: Award }
    if (level >= 7) return { label: 'Expert', color: 'bg-blue-500', textColor: 'text-blue-600', bgColor: 'bg-blue-50', icon: Star }
    if (level >= 5) return { label: 'Pro', color: 'bg-emerald-500', textColor: 'text-emerald-600', bgColor: 'bg-emerald-50', icon: Trophy }
    if (level >= 3) return { label: 'Rising', color: 'bg-amber-500', textColor: 'text-amber-600', bgColor: 'bg-amber-50', icon: TrendingUp }
    return { label: 'Starter', color: 'bg-gray-400', textColor: 'text-gray-600', bgColor: 'bg-gray-50', icon: Zap }
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Recently joined'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Recently joined'
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return 'Recently joined'
    }
  }

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Failed to read image'))
      reader.readAsDataURL(file)
    })

  const handleUploadProfileImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const fileArr = Array.from(files)
    setProfileImagesUploading(true)
    try {
      for (let i = 0; i < fileArr.length; i++) {
        const base64 = await fileToBase64(fileArr[i])
        const res = await fetch('/api/profile-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64,
            label: fileArr[i].name.slice(0, 60),
            makePrimary: profileImages.length === 0 && i === 0,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Upload failed')
      }
      toast.success('Photo(s) uploaded')
      await fetchProfileImages()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to upload photo(s)')
    } finally {
      setProfileImagesUploading(false)
    }
  }

  const handleDeleteProfileImage = async (id: string) => {
    try {
      const res = await fetch(`/api/profile-images/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      toast.success('Photo deleted')
      await fetchProfileImages()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete photo')
    }
  }

  const handleSetPrimaryProfileImage = async (id: string) => {
    try {
      const res = await fetch(`/api/profile-images/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ makePrimary: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      toast.success('Primary photo updated')
      await fetchProfileImages()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to set primary photo')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream pt-24 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-8 h-8 text-charcoal/30" />
        </motion.div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-cream pt-24">
        <div className="container mx-auto px-6 py-8">
          <div className="bg-white rounded-2xl border border-subtle p-16 text-center">
            <User className="w-16 h-16 text-charcoal/20 mx-auto mb-4" />
            <p className="text-charcoal/60 mb-4">Profile not found</p>
            <Link href="/login" className="text-peach hover:underline">
              Please log in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const xpPercentage = stats ? Math.min((stats.xp / stats.nextLevelXp) * 100, 100) : 0
  const levelInfo = stats ? getLevelInfo(stats.level) : getLevelInfo(1)
  const LevelIcon = levelInfo.icon

  return (
    <div className="min-h-screen bg-cream pt-24 pb-12">
      <div className="container mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-4xl md:text-5xl font-serif text-charcoal">
            Your <span className="italic">Profile</span>
          </h1>
          <p className="text-charcoal/60 mt-2">Manage your account and view your progress</p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Profile Header Card */}
            <div className="bg-white rounded-3xl border border-subtle overflow-hidden">
              {/* Cover gradient */}
              <div className="h-32 bg-gradient-to-r from-peach via-rose/60 to-orange-300 relative">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
              </div>

              {/* Avatar and basic info */}
              <div className="px-8 pb-8 -mt-16 relative">
                <div className="flex flex-col sm:flex-row sm:items-end gap-6">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-peach to-orange-400 flex items-center justify-center text-5xl font-bold text-white shadow-xl border-4 border-white">
                      {profile.name?.charAt(0).toUpperCase() || profile.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <button className="absolute bottom-2 right-2 w-8 h-8 bg-charcoal text-white rounded-lg flex items-center justify-center shadow-lg hover:bg-charcoal/80 transition-colors">
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Name and role */}
                  <div className="flex-1 pt-4 sm:pt-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-2xl md:text-3xl font-serif text-charcoal">
                          {profile.name || 'Set your name'}
                        </h2>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium bg-charcoal/5 rounded-full text-charcoal/70">
                            <Shield className="w-3.5 h-3.5" />
                            {profile.role === 'INFLUENCER' ? 'Influencer' : 'Brand'}
                          </span>
                          {stats && (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-full ${levelInfo.bgColor} ${levelInfo.textColor}`}>
                              <LevelIcon className="w-3.5 h-3.5" />
                              {levelInfo.label}
                            </span>
                          )}
                        </div>
                      </div>
                      <Link
                        href="/settings"
                        className="p-2 text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5 rounded-xl transition-all"
                      >
                        <Settings className="w-5 h-5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Details Card */}
            <div className="bg-white rounded-3xl border border-subtle p-8">
              <h3 className="text-lg font-semibold text-charcoal mb-6">Account Details</h3>

              <div className="space-y-6">
                {/* Name Field */}
                <div className="flex items-start justify-between gap-4 p-4 bg-cream/50 rounded-2xl">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                      <User className="w-5 h-5 text-charcoal/60" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal/60 mb-1">Display Name</label>
                      {editing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-subtle bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-peach/50 transition-all min-w-[200px]"
                            autoFocus
                          />
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => { setEditing(false); setName(profile.name || '') }}
                            className="p-2 bg-charcoal/10 text-charcoal rounded-lg hover:bg-charcoal/20 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <p className="text-charcoal font-medium">{profile.name || 'Not set'}</p>
                      )}
                    </div>
                  </div>
                  {!editing && (
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-charcoal/70 bg-white border border-charcoal/10 rounded-xl hover:bg-charcoal hover:text-cream transition-all"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                </div>

                {/* Email Field */}
                <div className="flex items-start gap-4 p-4 bg-cream/50 rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <Mail className="w-5 h-5 text-charcoal/60" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal/60 mb-1">Email Address</label>
                    <p className="text-charcoal font-medium">{profile.email}</p>
                  </div>
                </div>

                {/* Member Since */}
                <div className="flex items-start gap-4 p-4 bg-cream/50 rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <Calendar className="w-5 h-5 text-charcoal/60" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal/60 mb-1">Member Since</label>
                    <p className="text-charcoal font-medium">{formatDate(profile.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Media - Only for Influencers */}
            {profile?.role === 'INFLUENCER' && (
              <div className="bg-white rounded-3xl border border-subtle p-8">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-charcoal">Social Media</h3>
                    <p className="text-sm text-charcoal/60 mt-1">
                      Connect your social media accounts to showcase your presence
                    </p>
                  </div>
                  {!editingSocials && (
                    <button
                      onClick={() => setEditingSocials(true)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-charcoal/70 bg-white border border-charcoal/10 rounded-xl hover:bg-charcoal hover:text-cream transition-all"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                </div>

                {socialsLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-charcoal/40" />
                  </div>
                ) : editingSocials ? (
                  <div className="space-y-4">
                    <div className="grid gap-4">
                      {/* Instagram */}
                      <div className="flex items-center gap-4 p-4 bg-cream/50 rounded-2xl">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                          <Instagram className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-charcoal/60 mb-1">
                            Instagram
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-charcoal/40">@</span>
                            <input
                              type="text"
                              placeholder="username"
                              value={socials.instagram || ''}
                              onChange={(e) =>
                                setSocials({ ...socials, instagram: e.target.value })
                              }
                              className="flex-1 px-3 py-2 rounded-lg border border-subtle bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-peach/50 transition-all"
                            />
                            {socials.instagram && (
                              <a
                                href={`https://instagram.com/${socials.instagram.replace('@', '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-charcoal/60 hover:text-charcoal transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* TikTok */}
                      <div className="flex items-center gap-4 p-4 bg-cream/50 rounded-2xl">
                        <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-xs">TT</span>
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-charcoal/60 mb-1">
                            TikTok
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-charcoal/40">@</span>
                            <input
                              type="text"
                              placeholder="username"
                              value={socials.tiktok || ''}
                              onChange={(e) =>
                                setSocials({ ...socials, tiktok: e.target.value })
                              }
                              className="flex-1 px-3 py-2 rounded-lg border border-subtle bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-peach/50 transition-all"
                            />
                            {socials.tiktok && (
                              <a
                                href={`https://tiktok.com/@${socials.tiktok.replace('@', '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-charcoal/60 hover:text-charcoal transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* YouTube */}
                      <div className="flex items-center gap-4 p-4 bg-cream/50 rounded-2xl">
                        <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center flex-shrink-0">
                          <Youtube className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-charcoal/60 mb-1">
                            YouTube
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Channel name or @username"
                              value={socials.youtube || ''}
                              onChange={(e) =>
                                setSocials({ ...socials, youtube: e.target.value })
                              }
                              className="flex-1 px-3 py-2 rounded-lg border border-subtle bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-peach/50 transition-all"
                            />
                            {socials.youtube && (
                              <a
                                href={`https://youtube.com/${socials.youtube.startsWith('@') ? socials.youtube.replace('@', '') : `c/${socials.youtube}`}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-charcoal/60 hover:text-charcoal transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Twitter/X */}
                      <div className="flex items-center gap-4 p-4 bg-cream/50 rounded-2xl">
                        <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center flex-shrink-0">
                          <Twitter className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-charcoal/60 mb-1">
                            Twitter/X
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-charcoal/40">@</span>
                            <input
                              type="text"
                              placeholder="username"
                              value={socials.twitter || ''}
                              onChange={(e) =>
                                setSocials({ ...socials, twitter: e.target.value })
                              }
                              className="flex-1 px-3 py-2 rounded-lg border border-subtle bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-peach/50 transition-all"
                            />
                            {socials.twitter && (
                              <a
                                href={`https://twitter.com/${socials.twitter.replace('@', '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-charcoal/60 hover:text-charcoal transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <button
                        onClick={() => {
                          setEditingSocials(false)
                          fetchSocials() // Reset to original values
                        }}
                        className="px-4 py-2 text-sm font-medium text-charcoal/70 bg-white border border-charcoal/10 rounded-xl hover:bg-charcoal/5 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveSocials}
                        disabled={socialsSaving}
                        className="px-4 py-2 text-sm font-medium text-white bg-charcoal rounded-xl hover:bg-charcoal/90 transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {socialsSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            Save
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.keys(socials).length === 0 ? (
                      <div className="text-center py-8 text-charcoal/60">
                        <p className="text-sm">No social media accounts added yet.</p>
                        <p className="text-xs mt-1">Click Edit to add your accounts</p>
                      </div>
                    ) : (
                      <>
                        {socials.instagram && (
                          <a
                            href={`https://instagram.com/${socials.instagram.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-4 bg-cream/50 rounded-2xl hover:bg-cream transition-colors group"
                          >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                              <Instagram className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-charcoal">Instagram</p>
                              <p className="text-xs text-charcoal/60 truncate">
                                @{socials.instagram.replace('@', '')}
                              </p>
                            </div>
                            <ExternalLink className="w-4 h-4 text-charcoal/40 group-hover:text-charcoal transition-colors" />
                          </a>
                        )}
                        {socials.tiktok && (
                          <a
                            href={`https://tiktok.com/@${socials.tiktok.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-4 bg-cream/50 rounded-2xl hover:bg-cream transition-colors group"
                          >
                            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-bold text-xs">TT</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-charcoal">TikTok</p>
                              <p className="text-xs text-charcoal/60 truncate">
                                @{socials.tiktok.replace('@', '')}
                              </p>
                            </div>
                            <ExternalLink className="w-4 h-4 text-charcoal/40 group-hover:text-charcoal transition-colors" />
                          </a>
                        )}
                        {socials.youtube && (
                          <a
                            href={`https://youtube.com/${socials.youtube.startsWith('@') ? socials.youtube.replace('@', '') : `c/${socials.youtube}`}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-4 bg-cream/50 rounded-2xl hover:bg-cream transition-colors group"
                          >
                            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center flex-shrink-0">
                              <Youtube className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-charcoal">YouTube</p>
                              <p className="text-xs text-charcoal/60 truncate">{socials.youtube}</p>
                            </div>
                            <ExternalLink className="w-4 h-4 text-charcoal/40 group-hover:text-charcoal transition-colors" />
                          </a>
                        )}
                        {socials.twitter && (
                          <a
                            href={`https://twitter.com/${socials.twitter.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-4 bg-cream/50 rounded-2xl hover:bg-cream transition-colors group"
                          >
                            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center flex-shrink-0">
                              <Twitter className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-charcoal">Twitter/X</p>
                              <p className="text-xs text-charcoal/60 truncate">
                                @{socials.twitter.replace('@', '')}
                              </p>
                            </div>
                            <ExternalLink className="w-4 h-4 text-charcoal/40 group-hover:text-charcoal transition-colors" />
                          </a>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Audience Metrics - Only for Influencers */}
            {profile?.role === 'INFLUENCER' && (
              <div className="bg-white rounded-3xl border border-subtle p-8">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-charcoal">Audience Metrics</h3>
                      <BadgeDisplay tier={badgeTier} />
                    </div>
                    <p className="text-sm text-charcoal/60 mt-1">
                      Help brands evaluate your growth and retention. Update these monthly.
                    </p>
                  </div>
                  <button
                    onClick={handleSaveMetrics}
                    disabled={metricsSaving}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-charcoal rounded-xl hover:bg-charcoal/90 transition-all disabled:opacity-50"
                  >
                    {metricsSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Save
                      </>
                    )}
                  </button>
                </div>

                {metricsLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-charcoal/40" />
                  </div>
                ) : (
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-charcoal/60">
                        Audience Growth Rate (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={metrics.audienceRate}
                        onChange={(e) => setMetrics({ ...metrics, audienceRate: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-subtle bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-peach/50 transition-all"
                      />
                      <p className="text-xs text-charcoal/50">Monthly follower growth percentage.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-charcoal/60">
                        Content Retention Rate (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={metrics.retentionRate}
                        onChange={(e) => setMetrics({ ...metrics, retentionRate: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-subtle bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-peach/50 transition-all"
                      />
                      <p className="text-xs text-charcoal/50">Percent of viewers who return or stay engaged.</p>
                    </div>
                    <div className="md:col-span-2">
                      <div className="flex items-center justify-between rounded-2xl bg-cream/60 border border-charcoal/5 p-4">
                        <div>
                          <p className="text-sm text-charcoal/60">Badge Score</p>
                          <p className="text-xl font-semibold text-charcoal">
                            {badgeScore !== null ? badgeScore.toFixed(2) : '—'}
                          </p>
                        </div>
                        <BadgeDisplay tier={badgeTier} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Profile Images */}
            <div className="bg-white rounded-3xl border border-subtle p-8">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-charcoal">Your Photos</h3>
                  <p className="text-sm text-charcoal/60 mt-1">
                    Use these photos in Try-On. You can store up to 10.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-charcoal/70 bg-white border border-charcoal/10 rounded-xl hover:bg-charcoal hover:text-cream transition-all cursor-pointer">
                  <ImageIcon className="w-4 h-4" />
                  {profileImagesUploading ? 'Uploading...' : 'Add Photos'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={profileImagesUploading}
                    onChange={(e) => handleUploadProfileImages(e.target.files)}
                  />
                </label>
              </div>

              {profileImagesLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-charcoal/40" />
                </div>
              ) : profileImages.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-charcoal/15 p-10 text-center">
                  <p className="text-charcoal/60">No photos yet. Add at least one to improve face consistency.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {profileImages.map((img) => (
                    <div key={img.id} className="group relative rounded-2xl overflow-hidden border border-subtle">
                      <img
                        src={img.imageUrl}
                        alt={img.label || 'profile image'}
                        className="w-full h-44 object-cover bg-cream"
                      />
                      <div className="absolute top-2 left-2 flex items-center gap-2">
                        {img.isPrimary && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-white/90 rounded-full text-charcoal">
                            <Crown className="w-3.5 h-3.5 text-amber-500" />
                            Primary
                          </span>
                        )}
                      </div>

                      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-100">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => handleSetPrimaryProfileImage(img.id)}
                            className="text-xs font-medium text-white/95 hover:text-white underline-offset-2 hover:underline"
                          >
                            Set primary
                          </button>
                          <button
                            onClick={() => handleDeleteProfileImage(img.id)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-white/95 hover:text-white"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                        {img.label && <p className="text-[11px] text-white/80 mt-1 truncate">{img.label}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Stats Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Level Card */}
            {stats && (
              <div className="bg-white rounded-3xl border border-subtle p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-charcoal">Your Level</h3>
                  <div className={`w-10 h-10 rounded-xl ${levelInfo.color} flex items-center justify-center`}>
                    <LevelIcon className="w-5 h-5 text-white" />
                  </div>
                </div>

                {/* Level display */}
                <div className="text-center mb-6">
                  <div className="text-5xl font-bold text-charcoal mb-1">{stats.level}</div>
                  <div className={`text-sm font-medium ${levelInfo.textColor}`}>{levelInfo.label}</div>
                </div>

                {/* XP Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-charcoal/60">Progress</span>
                    <span className="font-medium text-charcoal">{stats.xp} / {stats.nextLevelXp} XP</span>
                  </div>
                  <div className="w-full bg-cream rounded-full h-3 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${xpPercentage}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                      className={`h-full rounded-full ${levelInfo.color}`}
                    />
                  </div>
                  <p className="text-xs text-charcoal/50 text-center">
                    {stats.nextLevelXp - stats.xp} XP until next level
                  </p>
                </div>
              </div>
            )}

            {/* Stats Grid */}
            {stats && (
              <div className="bg-white rounded-3xl border border-subtle p-6">
                <h3 className="text-lg font-semibold text-charcoal mb-6">Activity Stats</h3>

                <div className="grid grid-cols-2 gap-4">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100"
                  >
                    <Zap className="w-5 h-5 text-amber-500 mb-2" />
                    <p className="text-2xl font-bold text-charcoal">{stats.generations}</p>
                    <p className="text-xs text-charcoal/60">Try-Ons</p>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-100"
                  >
                    <Target className="w-5 h-5 text-blue-500 mb-2" />
                    <p className="text-2xl font-bold text-charcoal">{stats.collaborations}</p>
                    <p className="text-xs text-charcoal/60">Collabs</p>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border border-emerald-100"
                  >
                    <ImageIcon className="w-5 h-5 text-emerald-500 mb-2" />
                    <p className="text-2xl font-bold text-charcoal">{stats.portfolioItems}</p>
                    <p className="text-xs text-charcoal/60">Portfolio</p>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-100"
                  >
                    <Star className="w-5 h-5 text-purple-500 mb-2" />
                    <p className="text-2xl font-bold text-charcoal">{stats.xp}</p>
                    <p className="text-xs text-charcoal/60">Total XP</p>
                  </motion.div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-3xl border border-subtle p-6">
              <h3 className="text-lg font-semibold text-charcoal mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  href="/influencer/try-on"
                  className="flex items-center gap-3 p-3 bg-cream rounded-xl hover:bg-peach/10 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-peach/20 flex items-center justify-center group-hover:bg-peach/30 transition-colors">
                    <Camera className="w-5 h-5 text-peach" />
                  </div>
                  <div>
                    <p className="font-medium text-charcoal">Try-On Studio</p>
                    <p className="text-xs text-charcoal/60">Create virtual try-ons</p>
                  </div>
                </Link>
                <Link
                  href="/marketplace"
                  className="flex items-center gap-3 p-3 bg-cream rounded-xl hover:bg-blue-50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-charcoal">Marketplace</p>
                    <p className="text-xs text-charcoal/60">Browse products</p>
                  </div>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
