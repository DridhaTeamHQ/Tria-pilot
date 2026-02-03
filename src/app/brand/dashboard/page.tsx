'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Package,
  Users,
  Sparkles,
  Target,
  Inbox,
  User,
  Loader2,
  ArrowRight,
  TrendingUp
} from 'lucide-react'

interface DashboardStats {
  products: number
  campaigns: number
  conversations: number
}

interface ProfileData {
  companyName?: string
  brandType?: string
  vertical?: string
}

export default function BrandDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
    products: 0,
    campaigns: 0,
    conversations: 0,
  })

  useEffect(() => {
    fetchData()
  }, [router])

  const fetchData = async () => {
    try {
      // Fetch profile
      const profileRes = await fetch('/api/auth/me')
      const profileData = await profileRes.json()

      if (!profileRes.ok || !profileData.user) {
        router.replace('/login?from=brand')
        return
      }

      const role = (profileData.profile?.role || '').toLowerCase()
      if (role !== 'brand') {
        router.replace('/dashboard')
        return
      }

      const brandData = profileData.profile?.brand_data || {}
      setProfile({
        companyName: brandData.companyName || profileData.user?.name || 'Brand',
        brandType: brandData.brandType || '',
        vertical: brandData.vertical || '',
      })

      // Fetch stats in parallel
      const [productsRes, conversationsRes] = await Promise.all([
        fetch('/api/brand/products').catch(() => ({ ok: false, json: async () => ({}) })),
        fetch('/api/conversations').catch(() => ({ ok: false, json: async () => ({}) })),
      ])

      const [productsData, conversationsData] = await Promise.all([
        productsRes.ok ? productsRes.json() : { products: [] },
        conversationsRes.ok ? conversationsRes.json() : { conversations: [] },
      ])

      setStats({
        products: productsData.products?.length || 0,
        campaigns: 0, // Will be updated when campaigns are implemented
        conversations: conversationsData.conversations?.length || 0,
      })

      setLoading(false)
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    )
  }

  const quickActions = [
    {
      title: 'Products',
      description: 'Manage your product catalog',
      href: '/brand/products',
      icon: Package,
      color: '#B4F056',
      stat: stats.products,
      statLabel: 'products',
    },
    {
      title: 'Discover Influencers',
      description: 'Find creators for collaborations',
      href: '/brand/influencers',
      icon: Users,
      color: '#FFD93D',
      stat: null,
      statLabel: '',
    },
    {
      title: 'AI Ad Generator',
      description: 'Create AI-powered ad creatives',
      href: '/brand/ads',
      icon: Sparkles,
      color: '#FF8C69',
      stat: null,
      statLabel: '',
    },
    {
      title: 'Campaigns',
      description: 'AI campaign strategy assistant',
      href: '/brand/campaigns',
      icon: Target,
      color: '#A78BFA',
      stat: stats.campaigns,
      statLabel: 'active',
    },
    {
      title: 'Inbox',
      description: 'Messages from influencers',
      href: '/brand/inbox',
      icon: Inbox,
      color: '#34D399',
      stat: stats.conversations,
      statLabel: 'conversations',
    },
    {
      title: 'Brand Profile',
      description: 'Update your brand information',
      href: '/brand/profile',
      icon: User,
      color: '#F472B6',
      stat: null,
      statLabel: '',
    },
  ]

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Welcome Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-black text-black mb-2">
          Welcome back, {profile?.companyName}!
        </h1>
        <p className="text-black/60 font-medium text-lg">
          {profile?.brandType && `${profile.brandType}`}
          {profile?.vertical && ` • ${profile.vertical}`}
          {!profile?.brandType && !profile?.vertical && 'Your brand command center'}
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="bg-white border-[3px] border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#B4F056] border-2 border-black flex items-center justify-center">
              <Package className="w-6 h-6" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-3xl font-black">{stats.products}</div>
              <div className="text-sm font-bold text-black/60 uppercase">Products</div>
            </div>
          </div>
        </div>
        <div className="bg-white border-[3px] border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#A78BFA] border-2 border-black flex items-center justify-center">
              <Target className="w-6 h-6" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-3xl font-black">{stats.campaigns}</div>
              <div className="text-sm font-bold text-black/60 uppercase">Campaigns</div>
            </div>
          </div>
        </div>
        <div className="bg-white border-[3px] border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#34D399] border-2 border-black flex items-center justify-center">
              <Inbox className="w-6 h-6" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-3xl font-black">{stats.conversations}</div>
              <div className="text-sm font-bold text-black/60 uppercase">Conversations</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <h2 className="text-2xl font-black mb-6">Quick Actions</h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {quickActions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            className="group bg-white border-[3px] border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-14 h-14 border-2 border-black flex items-center justify-center"
                style={{ backgroundColor: action.color }}
              >
                <action.icon className="w-7 h-7 text-black" strokeWidth={2.5} />
              </div>
              <ArrowRight className="w-5 h-5 text-black/40 group-hover:text-black group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-xl font-black text-black mb-1">{action.title}</h3>
            <p className="text-sm text-black/60 font-medium mb-3">{action.description}</p>
            {action.stat !== null && (
              <div className="flex items-center gap-1 text-sm font-bold text-black/80">
                <TrendingUp className="w-4 h-4" />
                {action.stat} {action.statLabel}
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* Getting Started */}
      {stats.products === 0 && (
        <div className="mt-10 p-8 bg-gradient-to-br from-[#B4F056]/30 to-[#FFD93D]/30 border-[3px] border-black">
          <h2 className="text-2xl font-black text-black mb-3">🚀 Get Started</h2>
          <p className="text-black/70 font-medium mb-6">
            Start by adding your first product, then discover influencers to collaborate with!
          </p>
          <div className="flex gap-4">
            <Link
              href="/brand/products"
              className="px-6 py-3 bg-[#B4F056] border-[3px] border-black font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              Add First Product
            </Link>
            <Link
              href="/brand/influencers"
              className="px-6 py-3 bg-white border-[3px] border-black font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              Browse Influencers
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
