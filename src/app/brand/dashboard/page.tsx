import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/auth'
import {
  Package,
  Users,
  Sparkles,
  Target,
  Inbox,
  User,
  ArrowRight,
  TrendingUp
} from 'lucide-react'

// Server Component - No 'use client'
export const dynamic = 'force-dynamic' // Ensure real-time data

export default async function BrandDashboard() {
  const supabase = await createClient()

  // 1. Auth Check (Parallelizable with data if needed, but safer to block)
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login?from=brand')
  }

  // 2. Fetch Profile & Stats in Parallel
  // We use Promise.all to avoid waterfalls
  const [
    profileReq,
    productsCountReq,
    conversationsCountReq,
    campaignsCountReq
  ] = await Promise.all([
    // A. Profile
    supabase
      .from('profiles')
      .select('role, brand_data, name')
      .eq('id', user.id)
      .single(),

    // B. Products Count
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', user.id),

    // C. Conversations Count (Secure RLS check: my ID matches brand OR influencer)
    supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .or(`brand_id.eq.${user.id},influencer_id.eq.${user.id}`),

    // D. Campaigns Count
    supabase
      .from('Campaign')
      .select('*', { count: 'exact', head: true })
      .eq('brandId', user.id)
  ])

  const profile = profileReq.data

  // 3. Role Guardrail
  // If not a brand, kick them out.
  if (!profile || (profile.role || '').toLowerCase() !== 'brand') {
    redirect('/dashboard')
  }

  // 4. Transform Data
  const brandData = (profile.brand_data as any) || {}
  const companyName = brandData.companyName || profile.name || 'Brand'
  const brandType = brandData.brandType || ''
  const vertical = brandData.vertical || ''

  const stats = {
    products: productsCountReq.count || 0,
    conversations: conversationsCountReq.count || 0,
    campaigns: campaignsCountReq.count || 0
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

  // Render UI directly (Server Side Rendered)
  return (
    <div className="container mx-auto px-6 py-8">
      {/* Welcome Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-black text-black mb-2">
          Welcome back, {companyName}!
        </h1>
        <p className="text-black/60 font-medium text-lg">
          {brandType && `${brandType}`}
          {vertical && ` • ${vertical}`}
          {!brandType && !vertical && 'Your brand command center'}
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
