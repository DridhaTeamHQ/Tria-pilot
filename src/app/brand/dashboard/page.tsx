import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/auth'
import OnboardingChecklist from '@/components/brand/OnboardingChecklist'
import SmartDiscoveryWidget from '@/components/brand/SmartDiscoveryWidget'
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
import { DashboardPageWrapper, DashboardStaggerContainer, DashboardStaggerItem, MotionTableBody, MotionTableRow, MotionDiv } from '@/components/brand/DashboardMotion'

export const dynamic = 'force-dynamic'

export default async function BrandDashboard({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const welcomeMode = resolvedSearchParams?.welcome === '1'
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
  const brandSummary = [brandType, vertical].filter(Boolean).join(' - ')

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
  const needsQuickStart = welcomeMode || stats.products === 0 || stats.campaigns === 0

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
      title: 'Discover Creators',
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
    <DashboardPageWrapper className="relative min-h-[calc(100vh-80px)] bg-[#FAFAF8] pb-10 sm:pb-12">
      {/* Background Aesthetic Bubbles (Matching Ads Page) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-[#FFD93D]/25 blur-3xl" />
        <div className="absolute top-44 -right-20 h-80 w-80 rounded-full bg-[#FF8C69]/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#B4F056]/15 blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 pt-8 pb-6 sm:pb-8">
        {/* Welcome Header */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative mb-8 p-8 sm:p-10 border-[3px] border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD93D] -translate-y-16 translate-x-16 rotate-45 border-l-4 border-black -z-0" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#B4F056] translate-y-12 -translate-x-12 rotate-12 border-t-4 border-black -z-0 opacity-40" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-full">Dashboard</span>
              <span className="h-[2px] w-12 bg-black/20" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-black mb-3 tracking-tight">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-black to-black/60">{companyName}!</span>
            </h1>
            <p className="text-black/60 font-bold text-base sm:text-lg max-w-2xl leading-relaxed">
              {brandSummary || 'Your brand command center'}
            </p>
          </div>
        </MotionDiv>

        {/* Onboarding checklist (auto-hides when complete or dismissed) */}
        <div className="mb-6">
          <OnboardingChecklist />
        </div>

        {/* Smart discovery — AI picks creators perfect for the brand's products */}
        <div className="mb-6">
          <SmartDiscoveryWidget />
        </div>

        {needsQuickStart && (
          <div className="mb-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="bg-[#FFD93D] border-[3px] border-black p-6 sm:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/20 rounded-full blur-2xl" />
              <p className="text-xs font-black uppercase tracking-[0.24em] text-black/55 bg-black/5 px-2 py-1 w-fit">Start Here</p>
              <h2 className="mt-4 text-3xl sm:text-4xl font-black text-black leading-[1.1] tracking-tight">
                Your brand workspace is ready. Pick your first move.
              </h2>
              <p className="mt-4 text-base sm:text-lg font-bold text-black/70 max-w-2xl leading-relaxed">
                Add a product to unlock AI lookbooks, or launch a campaign to connect with our top creators immediately.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Link
                href="/brand/products"
                className="flex min-h-[140px] flex-col justify-between border-[3px] border-black bg-[#B4F056] p-5 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)]"
              >
                <div className="flex items-center gap-2 text-black">
                  <Package className="w-5 h-5" strokeWidth={2.5} />
                  <span className="text-xs font-black uppercase tracking-[0.2em]">Catalog First</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-black">Add your first product</h3>
                  <p className="mt-1 text-sm font-semibold text-black/70">Create a product page, cover image, and try-on asset base.</p>
                </div>
                <span className="inline-flex w-fit items-center gap-2 rounded-full border-[2px] border-black bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-black">
                  Go to products
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
              <Link
                href="/brand/campaigns/new"
                className="flex min-h-[140px] flex-col justify-between border-[3px] border-black bg-[#A78BFA] p-5 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)]"
              >
                <div className="flex items-center gap-2 text-black">
                  <Target className="w-5 h-5" strokeWidth={2.5} />
                  <span className="text-xs font-black uppercase tracking-[0.2em]">Launch First</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-black">Create your first campaign</h3>
                  <p className="mt-1 text-sm font-semibold text-black/70">Start with an AI-assisted brief and build the collaboration flow.</p>
                </div>
                <span className="inline-flex w-fit items-center gap-2 rounded-full border-[2px] border-black bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-black">
                  Go to campaigns
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            </div>
          </div>
        )}

        {/* Overview Cards: Total Spend, Active Campaigns, Impressions, Conversions */}
        <DashboardStaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* Total Spend */}
          <DashboardStaggerItem>
            <div className="bg-[#FF9B8F] border-[3px] border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between min-h-[140px] transition-transform hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-white border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <DollarSign className="w-5 h-5 text-black" strokeWidth={3} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest bg-black text-white px-2 py-1">Financials</span>
              </div>
              <div>
                <div className="text-3xl font-black text-black leading-none">Rs. {stats.totalSpend.toLocaleString()}</div>
                <div className="mt-2 text-xs font-black text-black/70 uppercase tracking-wider">Total Spend</div>
              </div>
            </div>
          </DashboardStaggerItem>

          {/* Active Campaigns */}
          <DashboardStaggerItem>
            <div className="bg-[#A78BFA] border-[3px] border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between min-h-[140px] transition-transform hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-white border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <Target className="w-5 h-5 text-black" strokeWidth={3} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest bg-black text-white px-2 py-1">Running</span>
              </div>
              <div>
                <div className="text-4xl font-black text-black leading-none">{stats.activeCampaigns}</div>
                <div className="mt-2 text-xs font-black text-black/70 uppercase tracking-wider">Active Campaigns</div>
              </div>
            </div>
          </DashboardStaggerItem>

          {/* Impressions */}
          <DashboardStaggerItem>
            <div className="bg-[#7DD3FC] border-[3px] border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between min-h-[140px] transition-transform hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-white border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <BarChart3 className="w-5 h-5 text-black" strokeWidth={3} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest bg-black text-white px-2 py-1">Visibility</span>
              </div>
              <div>
                <div className="text-4xl font-black text-black leading-none">{stats.totalImpressions.toLocaleString()}</div>
                <div className="mt-2 text-xs font-black text-black/70 uppercase tracking-wider">Total Impressions</div>
              </div>
            </div>
          </DashboardStaggerItem>

          {/* Conversions */}
          <DashboardStaggerItem>
            <div className="bg-[#B4F056] border-[3px] border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between min-h-[140px] transition-transform hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-white border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <MousePointer className="w-5 h-5 text-black" strokeWidth={3} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest bg-black text-white px-2 py-1">Results</span>
              </div>
              <div>
                <div className="text-4xl font-black text-black leading-none">{stats.totalConversions.toLocaleString()}</div>
                <div className="mt-2 text-xs font-black text-black/70 uppercase tracking-wider">Total Conversions</div>
              </div>
            </div>
          </DashboardStaggerItem>
        </DashboardStaggerContainer>

        {!needsQuickStart && (
          <div className="mb-8 flex flex-col flex-wrap gap-3 sm:mb-10 sm:flex-row sm:gap-4">
            <Link
              href="/brand/campaigns/new"
              className="inline-flex items-center justify-center gap-2 border-[3px] border-black bg-[#A78BFA] px-5 py-3 text-sm font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
            >
              <Plus className="w-4 h-4" />
              Create Campaign
            </Link>
            <Link
              href="/brand/products"
              className="inline-flex items-center justify-center gap-2 border-[3px] border-black bg-[#B4F056] px-5 py-3 text-sm font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </Link>
          </div>
        )}

        {/* Recent campaigns table */}
        <div className="mb-8 sm:mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-black">Recent Campaigns</h2>
            <Link
              href="/brand/campaigns"
              className="text-sm font-bold text-black/70 hover:text-black underline"
            >
              View all
            </Link>
          </div>
          <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            {recentCampaigns.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-[#F3F4F6] border-2 border-black flex items-center justify-center mx-auto mb-4 rotate-3">
                  <Target className="w-8 h-8 text-black/20" />
                </div>
                <p className="text-black/60 font-black uppercase tracking-wider text-sm mb-4">No campaigns yet</p>
                <Link href="/brand/campaigns/new" className="inline-flex items-center gap-2 px-6 py-2 bg-[#A78BFA] border-2 border-black font-black text-xs uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all">
                  Create First Campaign
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left">
                  <thead>
                    <tr className="border-b-[3px] border-black bg-black text-white">
                      <th className="p-4 text-xs font-black uppercase tracking-widest">Title</th>
                      <th className="p-4 text-xs font-black uppercase tracking-widest">Status</th>
                      <th className="p-4 text-xs font-black uppercase tracking-widest">Created</th>
                      <th className="p-4 text-xs font-black uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <MotionTableBody>
                    {recentCampaigns.map((c) => (
                      <MotionTableRow
                        key={c.id}
                        className="border-b-[2px] border-black/10 hover:bg-[#F9F8F4] transition-colors group"
                      >
                        <td className="p-4 font-black text-black group-hover:translate-x-1 transition-transform">{c.title}</td>
                        <td className="p-4">
                          <span
                            className={`inline-block px-3 py-1 text-[10px] font-black uppercase tracking-widest border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${c.status === 'active' ? 'bg-[#B4F056]' : c.status === 'completed' ? 'bg-[#FFD93D]' : 'bg-white'
                              }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="p-4 text-xs font-bold text-black/50">
                          {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="p-4 text-right">
                          <Link
                            href={`/brand/campaigns?highlight=${c.id}`}
                            className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-black text-white px-3 py-1.5 hover:bg-black/80 transition-colors"
                          >
                            View Details
                          </Link>
                        </td>
                      </MotionTableRow>
                    ))}
                  </MotionTableBody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Grid */}
        <h2 className="text-xl sm:text-2xl font-black mb-6">Quick Actions</h2>
        <DashboardStaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <DashboardStaggerItem key={action.title}>
              <Link
                href={action.href}
                className="group relative border-[3px] border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all flex flex-col justify-between min-h-[200px]"
                style={{ backgroundColor: action.color }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-white border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] group-hover:rotate-6 transition-transform">
                    <action.icon className="w-6 h-6 text-black" strokeWidth={2.5} />
                  </div>
                  <div className="w-8 h-8 bg-black flex items-center justify-center rounded-full text-white group-hover:translate-x-1 transition-transform">
                    <ArrowRight className="w-4 h-4" strokeWidth={3} />
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-end">
                  <h3 className="text-xl font-black text-black mb-1">{action.title}</h3>
                  <p className="text-xs text-black/70 font-black uppercase tracking-wider mb-3 leading-tight">{action.description}</p>

                  <div className="h-6">
                    {action.stat !== null && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-black text-white text-[10px] font-black uppercase tracking-widest">
                        <TrendingUp className="w-3 h-3" />
                        {action.stat} {action.statLabel}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            </DashboardStaggerItem>
          ))}
        </DashboardStaggerContainer>

        {/* Getting Started */}
        {stats.products === 0 && (
          <div className="mt-8 sm:mt-10 p-5 sm:p-8 bg-gradient-to-br from-[#B4F056]/30 to-[#FFD93D]/30 border-[3px] border-black">
            <h2 className="text-xl sm:text-2xl font-black text-black mb-3">Get Started</h2>
            <p className="text-black/70 font-medium mb-6">
              Start by adding your first product, then discover influencers to collaborate with!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link
                href="/brand/products"
                className="px-6 py-3 text-center bg-[#B4F056] border-[3px] border-black font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                Add First Product
              </Link>
              <Link
                href="/brand/influencers"
                className="px-6 py-3 text-center bg-white border-[3px] border-black font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                Browse Creators
              </Link>
            </div>
          </div>
        )}
      </div>
    </DashboardPageWrapper>
  )
}
