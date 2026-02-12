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
  TrendingUp,
  DollarSign,
  MousePointer,
  BarChart3,
  Plus,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function BrandDashboard() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login?from=brand')
  }

  const [
    profileReq,
    productsCountReq,
    conversationsCountReq,
    campaignsListReq,
  ] = await Promise.all([
    supabase.from('profiles').select('role, brand_data, name').eq('id', user.id).single(),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('brand_id', user.id),
    supabase.from('conversations').select('*', { count: 'exact', head: true }).or(`brand_id.eq.${user.id},influencer_id.eq.${user.id}`),
    supabase.from('campaigns').select('id, title, status, spend, impressions, conversions, created_at').eq('brand_id', user.id).order('created_at', { ascending: false }).limit(50),
  ])

  const profile = profileReq.data
  if (!profile || (profile.role || '').toLowerCase() !== 'brand') {
    redirect('/dashboard')
  }

  const brandData = (profile.brand_data as Record<string, unknown>) || {}
  const companyName = (brandData.companyName as string) || profile.name || 'Brand'
  const brandType = (brandData.brandType as string) || ''
  const vertical = (brandData.vertical as string) || ''

  const campaigns = (campaignsListReq.data || []) as Array<{
    id: string
    title: string
    status: string
    spend?: number
    impressions?: number
    conversions?: number
    created_at: string
  }>
  const totalSpend = campaigns.reduce((s, c) => s + (Number(c.spend) || 0), 0)
  const activeCampaigns = campaigns.filter((c) => c.status === 'active').length
  const totalImpressions = campaigns.reduce((s, c) => s + (Number(c.impressions) || 0), 0)
  const totalConversions = campaigns.reduce((s, c) => s + (Number(c.conversions) || 0), 0)
  const recentCampaigns = campaigns.slice(0, 5)

  const stats = {
    products: productsCountReq.count || 0,
    conversations: conversationsCountReq.count || 0,
    campaigns: campaigns.length,
    totalSpend,
    activeCampaigns,
    totalImpressions,
    totalConversions,
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

      {/* Overview Cards: Total Spend, Active Campaigns, Impressions, Conversions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-white border-[3px] border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#FFD93D] border-2 border-black flex items-center justify-center">
              <DollarSign className="w-6 h-6" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-2xl font-black">₹{stats.totalSpend.toLocaleString()}</div>
              <div className="text-xs font-bold text-black/60 uppercase">Total Spend</div>
            </div>
          </div>
        </div>
        <div className="bg-white border-[3px] border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#A78BFA] border-2 border-black flex items-center justify-center">
              <Target className="w-6 h-6" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-2xl font-black">{stats.activeCampaigns}</div>
              <div className="text-xs font-bold text-black/60 uppercase">Active Campaigns</div>
            </div>
          </div>
        </div>
        <div className="bg-white border-[3px] border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#34D399] border-2 border-black flex items-center justify-center">
              <BarChart3 className="w-6 h-6" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-2xl font-black">{stats.totalImpressions.toLocaleString()}</div>
              <div className="text-xs font-bold text-black/60 uppercase">Impressions</div>
            </div>
          </div>
        </div>
        <div className="bg-white border-[3px] border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#B4F056] border-2 border-black flex items-center justify-center">
              <MousePointer className="w-6 h-6" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-2xl font-black">{stats.totalConversions.toLocaleString()}</div>
              <div className="text-xs font-bold text-black/60 uppercase">Conversions</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick action buttons */}
      <div className="flex flex-wrap gap-4 mb-10">
        <Link
          href="/brand/campaigns/new"
          className="inline-flex items-center gap-2 px-5 py-3 bg-[#A78BFA] border-[3px] border-black font-black text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Campaign
        </Link>
        <Link
          href="/brand/products"
          className="inline-flex items-center gap-2 px-5 py-3 bg-[#B4F056] border-[3px] border-black font-black text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </Link>
      </div>

      {/* Recent campaigns table */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black">Recent Campaigns</h2>
          <Link
            href="/brand/campaigns"
            className="text-sm font-bold text-black/70 hover:text-black underline"
          >
            View all
          </Link>
        </div>
        <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
          {recentCampaigns.length === 0 ? (
            <div className="p-8 text-center text-black/60 font-medium">
              No campaigns yet. Create your first campaign to get started.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-[2px] border-black bg-[#FFFDF5]">
                  <th className="p-3 text-xs font-black uppercase">Title</th>
                  <th className="p-3 text-xs font-black uppercase">Status</th>
                  <th className="p-3 text-xs font-black uppercase">Created</th>
                  <th className="p-3 text-xs font-black uppercase" />
                </tr>
              </thead>
              <tbody>
                {recentCampaigns.map((c) => (
                  <tr key={c.id} className="border-b border-black/20 hover:bg-black/5">
                    <td className="p-3 font-bold">{c.title}</td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-bold border-[2px] border-black ${
                          c.status === 'active' ? 'bg-[#B4F056]' : c.status === 'completed' ? 'bg-[#FFD93D]' : 'bg-white'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-black/70">
                      {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="p-3">
                      <Link
                        href={`/brand/campaigns?highlight=${c.id}`}
                        className="text-xs font-bold underline hover:no-underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
