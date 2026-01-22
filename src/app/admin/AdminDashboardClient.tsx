'use client'

import { useMemo, useState } from 'react'
import { Check, X, Clock, User, Mail, Calendar, RefreshCw, Search, TrendingUp, Users, Filter } from 'lucide-react'
import { toast } from 'sonner'
import BadgeDisplay, { type BadgeTier } from '@/components/influencer/BadgeDisplay'

interface OnboardingData {
  gender?: string | null
  niches?: string[] | null
  audienceType?: string[] | null
  preferredCategories?: string[] | null
  socials?: Record<string, string> | null
  bio?: string | null
  followers?: number | null
  engagementRate?: number | null
  audienceRate?: number | null
  retentionRate?: number | null
  badgeScore?: number | null
  badgeTier?: string | null
  onboardingCompleted?: boolean
}

interface InfluencerApplication {
  user_id: string
  email: string
  full_name: string | null
  status: 'draft' | 'pending' | 'approved' | 'rejected' // CRITICAL: Include 'draft' status
  created_at: string
  updated_at: string
  reviewed_at: string | null
  review_note: string | null
  onboarding?: OnboardingData | null
  user?: {
    id: string
    email: string
    name: string | null
    createdAt: Date | string
  } | null
}

interface AdminDashboardClientProps {
  initialApplications: InfluencerApplication[]
}

export default function AdminDashboardClient({ initialApplications }: AdminDashboardClientProps) {
  const [applications, setApplications] = useState<InfluencerApplication[]>(initialApplications)
  const [loading, setLoading] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'draft'>('pending')
  const [sortBy, setSortBy] = useState<'created_at' | 'badgeScore' | 'followers' | 'engagementRate'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showFilters, setShowFilters] = useState(false)
  const [filterNiche, setFilterNiche] = useState<string>('')
  const [filterGender, setFilterGender] = useState<string>('')
  const [filterPlatform, setFilterPlatform] = useState<string>('')

  const visibleApplications = useMemo(() => {
    const q = query.trim().toLowerCase()
    
    // DEFENSIVE: Filter out invalid states first
    const validApps = applications.filter((app) => {
      // Skip if onboarding data exists but onboardingCompleted is false
      if (app.onboarding && !app.onboarding.onboardingCompleted) {
        return false
      }
      return true
    })
    
    let filtered = validApps.filter((app) => {
      // Status filter
      const matchesFilter = activeFilter === 'all' ? true : app.status === activeFilter
      if (!matchesFilter) return false
      
      // Search query
      if (q) {
        const hay = `${app.email} ${app.full_name || ''} ${app.onboarding?.bio || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      
      // Niche filter
      if (filterNiche && app.onboarding?.niches) {
        const niches = Array.isArray(app.onboarding.niches) ? app.onboarding.niches : []
        if (!niches.includes(filterNiche)) return false
      }
      
      // Gender filter
      if (filterGender && app.onboarding?.gender !== filterGender) return false
      
      // Platform filter (check socials)
      if (filterPlatform && app.onboarding?.socials) {
        const socials = app.onboarding.socials as Record<string, string>
        if (!socials[filterPlatform.toLowerCase()]) return false
      }
      
      return true
    })
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any = 0
      let bVal: any = 0
      
      if (sortBy === 'created_at') {
        aVal = new Date(a.created_at).getTime()
        bVal = new Date(b.created_at).getTime()
      } else if (sortBy === 'badgeScore') {
        aVal = a.onboarding?.badgeScore ?? 0
        bVal = b.onboarding?.badgeScore ?? 0
      } else if (sortBy === 'followers') {
        aVal = a.onboarding?.followers ?? 0
        bVal = b.onboarding?.followers ?? 0
      } else if (sortBy === 'engagementRate') {
        aVal = a.onboarding?.engagementRate ?? 0
        bVal = b.onboarding?.engagementRate ?? 0
      }
      
      const aNum = typeof aVal === 'object' && aVal !== null ? Number(aVal) : Number(aVal) || 0
      const bNum = typeof bVal === 'object' && bVal !== null ? Number(bVal) : Number(bVal) || 0
      
      return sortOrder === 'asc' ? aNum - bNum : bNum - aNum
    })
    
    return filtered
  }, [applications, activeFilter, query, sortBy, sortOrder, filterNiche, filterGender, filterPlatform])

  const refresh = async () => {
    try {
      const params = new URLSearchParams()
      if (activeFilter !== 'all') params.set('status', activeFilter)
      params.set('sortBy', sortBy)
      params.set('order', sortOrder)
      
      const res = await fetch(`/api/admin/influencers?${params.toString()}`, { method: 'GET' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to refresh')
      setApplications(Array.isArray(data) ? data : data?.applications || [])
      toast.success('Refreshed')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to refresh')
    }
  }

  const handleStatusUpdate = async (userId: string, newStatus: 'approved' | 'rejected', reviewNote?: string) => {
    setLoading(userId)
    try {
      const response = await fetch('/api/admin/influencers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          status: newStatus,
          review_note: reviewNote || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update status')
      }

      const updated = await response.json()
      
      // Update local state
      setApplications((prev) =>
        prev.map((app) =>
          app.user_id === userId
            ? {
                ...app,
                status: updated.status,
                reviewed_at: updated.reviewed_at,
                review_note: updated.review_note,
              }
            : app
        )
      )

      toast.success(`Influencer ${newStatus === 'approved' ? 'approved' : 'rejected'} successfully`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status')
    } finally {
      setLoading(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
    }
    return styles[status as keyof typeof styles] || styles.pending
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <Check className="w-4 h-4" />
      case 'rejected':
        return <X className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  // CRITICAL: Stats must be computed from real data, ensuring:
  // - Only influencers with onboardingCompleted === true are counted
  // - Only valid approvalStatus values are counted
  // - Same dataset powers counters, table list, and filters
  const validApplications = applications.filter((app) => {
    // DEFENSIVE: Assert valid state - skip invalid entries
    if (app.onboarding && !app.onboarding.onboardingCompleted) {
      console.warn(`INVALID STATE: Application ${app.user_id} has approvalStatus but onboardingCompleted = false`)
      return false
    }
    return true
  })

  // CRITICAL: Count using exact status values from profiles table
  // Status values: 'draft' | 'pending' | 'approved' | 'rejected'
  const pendingCount = validApplications.filter((app) => app.status === 'pending').length
  const approvedCount = validApplications.filter((app) => app.status === 'approved').length
  const rejectedCount = validApplications.filter((app) => app.status === 'rejected').length
  const draftCount = validApplications.filter((app) => app.status === 'draft').length

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 border border-charcoal/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-charcoal/60 mb-1">Pending</p>
              <p className="text-3xl font-bold text-charcoal">{pendingCount}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-charcoal/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-charcoal/60 mb-1">Approved</p>
              <p className="text-3xl font-bold text-charcoal">{approvedCount}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-charcoal/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-charcoal/60 mb-1">Rejected</p>
              <p className="text-3xl font-bold text-charcoal">{rejectedCount}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <X className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-xl border border-charcoal/10 overflow-hidden">
        <div className="p-6 border-b border-charcoal/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-charcoal">Influencer Applications</h2>
            <p className="text-sm text-charcoal/50 mt-1">Approve or reject new influencers.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative">
              <Search className="w-4 h-4 text-charcoal/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or email…"
                className="pl-9 pr-3 py-2 rounded-full border border-charcoal/10 bg-cream/40 text-sm text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-peach/40 focus:border-peach transition-all w-full sm:w-72"
              />
            </div>
            <button
              type="button"
              onClick={refresh}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-charcoal/10 text-sm font-medium text-charcoal hover:bg-charcoal/5 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
        <div className="px-6 py-4 border-b border-charcoal/10 flex flex-wrap gap-2">
          {[
            { key: 'pending', label: 'Pending' },
            { key: 'approved', label: 'Approved' },
            { key: 'rejected', label: 'Rejected' },
            { key: 'draft', label: 'Draft' },
            { key: 'all', label: 'All' },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setActiveFilter(f.key as any)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                activeFilter === f.key
                  ? 'bg-charcoal text-cream border-charcoal'
                  : 'bg-white text-charcoal border-charcoal/10 hover:bg-charcoal/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="divide-y divide-charcoal/10">
          {visibleApplications.length === 0 ? (
            <div className="p-12 text-center text-charcoal/60">
              <p className="font-medium text-charcoal">No applications found</p>
              <p className="text-sm text-charcoal/50 mt-2">
                Try changing the filter or search query.
              </p>
            </div>
          ) : (
            visibleApplications.map((app) => (
              <div key={app.user_id} className="p-6 hover:bg-cream/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-peach/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-peach" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-charcoal">
                          {app.full_name || 'No name provided'}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-charcoal/60">
                          <Mail className="w-4 h-4" />
                          {app.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-sm text-charcoal/60">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Applied: {new Date(app.created_at).toLocaleDateString()}
                      </div>
                      {app.reviewed_at && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Reviewed: {new Date(app.reviewed_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    {app.review_note && (
                      <div className="mt-2 p-2 bg-cream/50 rounded text-sm text-charcoal/70">
                        <strong>Note:</strong> {app.review_note}
                      </div>
                    )}
                    
                    {/* Onboarding Data */}
                    {app.onboarding && (
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {/* Metrics */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-charcoal/80">
                            <Users className="w-4 h-4" />
                            <span>Followers: {app.onboarding.followers ? app.onboarding.followers.toLocaleString() : 'N/A'}</span>
                          </div>
                          {app.onboarding.engagementRate !== null && app.onboarding.engagementRate !== undefined && (
                            <div className="flex items-center gap-2 text-charcoal/80">
                              <TrendingUp className="w-4 h-4" />
                              <span>Engagement: {(Number(app.onboarding.engagementRate) * 100).toFixed(2)}%</span>
                            </div>
                          )}
                          {app.onboarding.badgeScore !== null && app.onboarding.badgeScore !== undefined && (
                            <div className="flex items-center gap-2 text-charcoal/80">
                              <span>Badge Score: {Number(app.onboarding.badgeScore).toFixed(2)}</span>
                              {app.onboarding.badgeTier && (
                                <BadgeDisplay tier={app.onboarding.badgeTier as BadgeTier} />
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Details */}
                        <div className="space-y-2">
                          {app.onboarding.niches && Array.isArray(app.onboarding.niches) && app.onboarding.niches.length > 0 && (
                            <div>
                              <span className="text-charcoal/60 text-xs">Niches: </span>
                              <span className="text-charcoal/80">{app.onboarding.niches.join(', ')}</span>
                            </div>
                          )}
                          {app.onboarding.gender && (
                            <div>
                              <span className="text-charcoal/60 text-xs">Gender: </span>
                              <span className="text-charcoal/80">{app.onboarding.gender}</span>
                            </div>
                          )}
                          {app.onboarding.socials && (
                            <div>
                              <span className="text-charcoal/60 text-xs">Socials: </span>
                              <span className="text-charcoal/80">
                                {Object.entries(app.onboarding.socials as Record<string, string>)
                                  .filter(([, url]) => url)
                                  .map(([platform]) => platform)
                                  .join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Bio Preview */}
                        {app.onboarding.bio && (
                          <div className="md:col-span-2">
                            <p className="text-xs text-charcoal/60 mb-1">Bio:</p>
                            <p className="text-sm text-charcoal/80 line-clamp-2">{app.onboarding.bio}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusBadge(
                        app.status
                      )}`}
                    >
                      {getStatusIcon(app.status)}
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </span>
                    {app.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStatusUpdate(app.user_id, 'approved')}
                          disabled={loading === app.user_id}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            const note = prompt('Rejection reason (optional):')
                            if (note !== null) {
                              handleStatusUpdate(app.user_id, 'rejected', note)
                            }
                          }}
                          disabled={loading === app.user_id}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
