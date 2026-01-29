'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  User,
  Mail,
  Calendar,
  Loader2,
  Camera,
  Edit3,
  Shield,
  Star,
  Award,
  Settings,
  TrendingUp,
  Trophy,
  Zap,
  Check,
  X,
  Instagram,
  Youtube,
  Twitter,
  ExternalLink,
  MapPin,
  Briefcase,
  Users
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import BadgeDisplay, { type BadgeTier } from '@/components/influencer/BadgeDisplay'
import { useQueryClient, useQuery } from '@tanstack/react-query'

// Neo-Brutalist Card Component
function BrutalCard({ children, className = '', title }: { children: React.ReactNode, className?: string, title?: string }) {
  return (
    <div className={`bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 relative ${className}`}>
      {title && (
        <div className="absolute -top-4 left-6 bg-white px-4 border-[3px] border-black text-sm font-bold uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          {title}
        </div>
      )}
      {children}
    </div>
  )
}

// Neo-Brutalist Tag
function BrutalTag({ label, color = 'bg-white' }: { label: string, color?: string }) {
  return (
    <span className={`px-4 py-2 text-sm font-bold border-[2px] border-black text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-default uppercase tracking-wide ${color}`}>
      {label}
    </span>
  )
}

// Fetcher function
const fetchProfileData = async () => {
  const res = await fetch('/api/profile')
  if (!res.ok) throw new Error('Failed to fetch profile')
  return res.json()
}

export default function ProfilePage() {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const queryClient = useQueryClient()

  // REAL-TIME DATA FETCHING
  // uses react-query to cache and auto-update data
  const { data, isLoading, error } = useQuery({
    queryKey: ['full-profile'],
    queryFn: fetchProfileData,
    refetchOnWindowFocus: true // Auto-refresh when user comes back to tab
  })

  // Sync name state when data loads
  useEffect(() => {
    if (data?.user?.name) {
      setName(data.user.name)
    }
  }, [data?.user?.name])

  const user = data?.user
  const profile = user?.influencerProfile

  const handleSaveName = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      })
      if (res.ok) {
        // Invalidate query to trigger real-time update
        await queryClient.invalidateQueries({ queryKey: ['full-profile'] })
        setEditing(false)
        toast.success('Name updated')
      } else {
        throw new Error('Failed')
      }
    } catch {
      toast.error('Failed to update name')
    } finally {
      setSaving(false)
    }
  }

  const getLevelInfo = (score: number = 0) => {
    // Simple level calc based on score (0-100) or just default
    if (score >= 90) return { label: 'Master', bg: 'bg-purple-400' }
    if (score >= 70) return { label: 'Expert', bg: 'bg-blue-400' }
    if (score >= 50) return { label: 'Pro', bg: 'bg-green-400' }
    return { label: 'Starter', bg: 'bg-yellow-400' }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] pt-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] pt-24 flex items-center justify-center">
        <p className="text-xl font-bold">Profile not found. Please log in.</p>
      </div>
    )
  }

  const level = getLevelInfo(Number(profile?.badgeScore || 0))

  return (
    <div className="min-h-screen bg-[#FDFBF7] pt-28 pb-20">
      <div className="container mx-auto px-6 max-w-7xl">

        {/* Header */}
        <div className="mb-16">
          <h1 className="text-6xl md:text-7xl font-black text-black uppercase mb-4 tracking-tight leading-none">
            Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-black to-gray-500">Profile</span>
          </h1>
          <p className="text-xl font-bold text-black/60 max-w-2xl border-l-[4px] border-[#FFD93D] pl-6 py-2">
            Manage your digital persona, track your growth, and showcase your influence.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-10">

          {/* Left Column: Main Profile Info */}
          <div className="lg:col-span-8 space-y-10">

            {/* Identity Card */}
            <BrutalCard className="pt-20 mt-12">
              {/* Avatar */}
              <div className="absolute -top-12 left-8">
                <div className="w-32 h-32 bg-[#FFD93D] border-[4px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-5xl font-black text-black">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  {editing ? (
                    <div className="flex items-center gap-3 mb-2">
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="text-3xl font-black bg-white border-[3px] border-black px-4 py-2 w-full max-w-sm focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                        autoFocus
                      />
                      <button onClick={handleSaveName} disabled={saving} className="bg-black text-white p-3 border-[3px] border-black hover:bg-white hover:text-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
                        <Check className="w-5 h-5" />
                      </button>
                      <button onClick={() => setEditing(false)} className="bg-white text-black p-3 border-[3px] border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 group">
                      <h2 className="text-4xl font-black uppercase tracking-tight">{user.name || 'Set Name'}</h2>
                      <button onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-black/5 rounded">
                        <Edit3 className="w-5 h-5" />
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 mt-4">
                    <span className="px-3 py-1 bg-black text-white text-xs font-bold uppercase tracking-widest border-[2px] border-black">
                      {user.role}
                    </span>
                    <span className={`px-3 py-1 ${level.bg} text-black text-xs font-bold uppercase tracking-widest border-[2px] border-black`}>
                      {level.label}
                    </span>
                    <span className="px-3 py-1 bg-white text-black text-xs font-bold uppercase tracking-widest border-[2px] border-black flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      Joined {formatDate(user.createdAt)}
                    </span>
                  </div>
                </div>

                <Link href="/settings" className="px-6 py-3 bg-white border-[3px] border-black font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center gap-2 text-sm">
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
              </div>

              <div className="mt-8 pt-8 border-t-[3px] border-black space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 border-[2px] border-black bg-white flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-black/50 tracking-widest">Email Address</p>
                    <p className="text-lg font-bold">{user.email}</p>
                  </div>
                </div>
              </div>
            </BrutalCard>

            {/* About & Bio */}
            <BrutalCard title="About Me">
              <p className="text-lg font-medium leading-relaxed text-black/80">
                {profile?.bio || 'No bio added yet. Tell brands about yourself!'}
              </p>

              {/* Niches */}
              <div className="mt-8">
                <h3 className="text-xs font-bold uppercase text-black/50 tracking-widest mb-4">Niches & Focus</h3>
                <div className="flex flex-wrap gap-3">
                  {profile?.niches && Array.isArray(profile.niches) && profile.niches.map((niche: string) => (
                    <BrutalTag key={niche} label={niche} color="bg-[#FF90E8]" />
                  ))}
                  {profile?.preferredCategories && Array.isArray(profile.preferredCategories) && profile.preferredCategories.map((cat: string) => (
                    <BrutalTag key={cat} label={cat} color="bg-[#90E8FF]" />
                  ))}
                  {(!profile?.niches?.length && !profile?.preferredCategories?.length) && (
                    <span className="text-black/50 italic font-medium">No niches selected. Update in settings.</span>
                  )}
                </div>
              </div>
            </BrutalCard>

            {/* Socials - Display Only for readability */}
            {profile?.socials && Object.keys(profile.socials).length > 0 && (
              <BrutalCard title="Social Presence">
                <div className="grid sm:grid-cols-2 gap-4">
                  {Object.entries(profile.socials).map(([platform, handle]) => {
                    if (!handle) return null
                    const p = platform.toLowerCase()
                    let Icon = ExternalLink
                    let bg = 'bg-white'

                    if (p === 'instagram') { Icon = Instagram; bg = 'bg-pink-100' }
                    if (p === 'youtube') { Icon = Youtube; bg = 'bg-red-100' }
                    if (p === 'twitter') { Icon = Twitter; bg = 'bg-blue-100' }
                    return (
                      <div key={platform} className={`flex items-center gap-4 p-4 border-[2px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${bg}`}>
                        <Icon className="w-6 h-6" />
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest">{platform}</p>
                          <p className="font-bold">{(handle as string).replace('@', '')}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </BrutalCard>
            )}

          </div>

          {/* Right Column: Stats & Metrics */}
          <div className="lg:col-span-4 space-y-8">

            {/* Level Card */}
            <BrutalCard className="text-center">
              <h3 className="text-sm font-bold uppercase tracking-widest mb-2">Current Level</h3>
              <div className="text-6xl font-black mb-2">{Math.round(Number(profile?.badgeScore || 0))}</div>
              <div className={`inline-block px-4 py-1 border-[2px] border-black text-xs font-bold uppercase tracking-widest ${level.bg} mb-6`}>
                {level.label}
              </div>

              <div className="w-full h-4 border-[2px] border-black bg-white rounded-full overflow-hidden relative">
                <div
                  className="absolute top-0 left-0 h-full bg-black"
                  style={{ width: `${Number(profile?.badgeScore || 0)}%` }}
                />
              </div>
              <p className="text-xs font-bold mt-2 text-right">{profile?.badgeScore || 0}/100 XP</p>
            </BrutalCard>

            {/* Metrics Grid */}
            <BrutalCard title="Audience Metrics">
              <div className="space-y-6 mt-2">
                <div className="flex items-center justify-between pb-4 border-b-[2px] border-black/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#FFD93D] border-[2px] border-black flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-black/50">Followers</p>
                      <p className="text-2xl font-black">{profile?.followers?.toLocaleString() || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pb-4 border-b-[2px] border-black/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#90E8FF] border-[2px] border-black flex items-center justify-center">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-black/50">Engagement</p>
                      <p className="text-2xl font-black">{Number(profile?.engagementRate || 0)}%</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#FF90E8] border-[2px] border-black flex items-center justify-center">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-black/50">Audience Growth</p>
                      <p className="text-2xl font-black">{Number(profile?.audienceRate || 0)}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </BrutalCard>

            {/* Audience Type */}
            {profile?.audienceType && Array.isArray(profile.audienceType) && profile.audienceType.length > 0 && (
              <BrutalCard title="Audience Type">
                <div className="flex flex-wrap gap-2">
                  {profile.audienceType.map((type: string) => (
                    <span key={type} className="px-3 py-1 bg-gray-200 border-[2px] border-black font-bold text-xs uppercase">
                      {type}
                    </span>
                  ))}
                </div>
              </BrutalCard>
            )}

          </div>

        </div>
      </div>
    </div>
  )
}
