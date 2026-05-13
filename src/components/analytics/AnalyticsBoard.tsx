'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  BarChart3,
  Bell,
  Box,
  Crown,
  DollarSign,
  LayoutDashboard,
  LineChart,
  MousePointerClick,
  Package,
  RefreshCw,
  Settings,
  ShoppingBag,
  Sparkles,
  Target,
  TrendingUp,
  UserCircle,
  Users,
} from 'lucide-react'
import { BrutalLoader } from '@/components/ui/BrutalLoader'

type Role = 'admin' | 'brand' | 'influencer'

type AnalyticsData = {
  role: Role
  viewer: { id: string; name: string }
  period: { days: number }
  kpis: Record<string, number | undefined>
  series: Array<{ day: string; clicks: number; orders: number; revenue: number }>
  topProducts: Array<{ id: string; name: string; category: string; clicks: number; orders: number; revenue: number }>
  topInfluencers: Array<{ id: string; name: string; clicks: number; orders: number; revenue: number; commission: number }>
  topBrands: Array<{ id: string; name: string; products: number; orders: number; revenue: number }>
  devices: Array<{ label: string; value: number }>
  countries: Array<{ label: string; value: number }>
  campaigns: Array<{ id: string; title: string; status: string; spend: number; impressions: number; clicks: number; conversions: number }>
}

const roleCopy = {
  influencer: {
    title: 'Creator Analytics',
    eyebrow: 'Creator Pro',
    subtitle: 'Your product-link performance, earnings, clicks, and top-performing product signals.',
    accent: '#FFE100',
    hero: '#DFE1FF',
    activeHref: '/influencer/analytics',
    dashboardHref: '/influencer/dashboard',
    audienceHref: '/influencer/collaborations',
    settingsHref: '/settings',
  },
  brand: {
    title: 'Brand Analytics',
    eyebrow: 'Brand Pro',
    subtitle: 'Your product performance, campaign efficiency, and top influencers promoting your catalog.',
    accent: '#FFE100',
    hero: '#E4F8D6',
    activeHref: '/brand/analytics',
    dashboardHref: '/brand/dashboard',
    audienceHref: '/brand/influencers',
    settingsHref: '/brand/profile',
  },
  admin: {
    title: 'Platform Analytics',
    eyebrow: 'Admin',
    subtitle: 'Everything across brands, influencers, tracked links, revenue, campaigns, and traffic quality.',
    accent: '#FFE100',
    hero: '#E8DFFF',
    activeHref: '/admin/analytics',
    dashboardHref: '/admin',
    audienceHref: '/admin/influencer-rankings',
    settingsHref: '/admin',
  },
} satisfies Record<Role, {
  title: string
  eyebrow: string
  subtitle: string
  accent: string
  hero: string
  activeHref: string
  dashboardHref: string
  audienceHref: string
  settingsHref: string
}>

const periods = [7, 30, 90, 365]

function formatNumber(value: unknown) {
  const n = Number(value) || 0
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString('en-IN')
}

function money(value: unknown) {
  const n = Number(value) || 0
  if (n >= 10_000_000) return `Rs. ${(n / 10_000_000).toFixed(2)}Cr`
  if (n >= 100_000) return `Rs. ${(n / 100_000).toFixed(2)}L`
  return `Rs. ${Math.round(n).toLocaleString('en-IN')}`
}

function metricValue(value: unknown, format: 'money' | 'number' | 'percent' | 'x' = 'number') {
  if (format === 'money') return money(value)
  if (format === 'percent') return `${(Number(value) || 0).toFixed(2)}%`
  if (format === 'x') return `${(Number(value) || 0).toFixed(2)}x`
  return formatNumber(value)
}

function pct(value: number, max: number) {
  if (!max) return 0
  return Math.max(4, Math.min(100, (value / max) * 100))
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-[18px] border-2 border-dashed border-black/25 bg-[#FFF9EA] p-6 text-center">
      <BarChart3 className="mb-3 h-8 w-8 text-black/25" />
      <p className="max-w-xs text-sm font-bold text-black/45">{label}</p>
    </div>
  )
}

function SideNav({ role, viewerName }: { role: Role; viewerName: string }) {
  const copy = roleCopy[role]
  const nav = [
    { label: 'Dashboard', href: copy.dashboardHref, icon: LayoutDashboard },
    { label: 'Analytics', href: copy.activeHref, icon: BarChart3, active: true },
    { label: role === 'brand' ? 'Creators' : 'Audience', href: copy.audienceHref, icon: Users },
    { label: 'Settings', href: copy.settingsHref, icon: Settings },
  ]

  return (
    <aside className="hidden min-h-screen w-80 shrink-0 border-r-[3px] border-black bg-[#F3EEDA] px-5 py-9 lg:flex lg:flex-col">
      <div>
        <h2 className="truncate text-3xl font-black leading-none text-black">{viewerName}</h2>
        <p className="mt-2 text-lg font-semibold text-black/80">{copy.eyebrow}</p>
      </div>

      <nav className="mt-16 space-y-7">
        {nav.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-16 items-center gap-4 rounded-[10px] border-2 px-5 text-base font-black tracking-[0.08em] transition-all ${
                item.active
                  ? 'border-black bg-[#FFE100] text-[#5A4B00] shadow-[5px_5px_0_0_rgba(0,0,0,1)]'
                  : 'border-transparent text-black/75 hover:border-black hover:bg-white'
              }`}
            >
              <Icon className="h-6 w-6" strokeWidth={2.5} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <Link
        href={role === 'brand' ? '/settings/billing' : '/settings/billing'}
        className="mt-auto flex h-14 items-center justify-center rounded-[10px] border-2 border-black bg-[#FFE100] text-base font-black tracking-[0.08em] text-[#6A5700] shadow-[5px_5px_0_0_rgba(0,0,0,1)] transition-transform hover:-translate-y-1"
      >
        Upgrade Plan
      </Link>
    </aside>
  )
}

function TopBar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-20 border-b-[3px] border-black bg-[#FFF8E8]/95 px-5 py-5 backdrop-blur lg:px-20">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-4xl font-black leading-none tracking-tight text-black sm:text-5xl">{title}</h1>
        <div className="flex items-center gap-3">
          <button type="button" className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-black bg-[#FFF8E8] transition-transform hover:-translate-y-0.5" aria-label="Notifications">
            <Bell className="h-5 w-5 text-[#6A5700]" strokeWidth={2.5} />
          </button>
          <button type="button" className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-black bg-[#FFF8E8] transition-transform hover:-translate-y-0.5" aria-label="Profile">
            <UserCircle className="h-6 w-6 text-[#6A5700]" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </header>
  )
}

function MobileNav({ role }: { role: Role }) {
  const copy = roleCopy[role]
  return (
    <div className="sticky top-[89px] z-10 flex gap-2 overflow-x-auto border-b-2 border-black bg-[#F3EEDA] px-4 py-3 lg:hidden">
      {[
        { label: 'Dashboard', href: copy.dashboardHref },
        { label: 'Analytics', href: copy.activeHref, active: true },
        { label: role === 'brand' ? 'Creators' : 'Audience', href: copy.audienceHref },
        { label: 'Settings', href: copy.settingsHref },
      ].map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`whitespace-nowrap rounded-[10px] border-2 border-black px-4 py-2 text-sm font-black ${
            item.active ? 'bg-[#FFE100] text-[#6A5700]' : 'bg-[#FFF8E8] text-black'
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  )
}

function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  color,
}: {
  label: string
  value: string
  helper: string
  icon: typeof TrendingUp
  color: string
}) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ type: 'spring', stiffness: 360, damping: 24 }}
      className="group min-h-[260px] rounded-[18px] border-2 border-black bg-[#FFF8E8] p-8 shadow-[6px_6px_0_0_rgba(0,0,0,1)]"
    >
      <div className="mb-10 flex items-start justify-between">
        <div className="flex h-14 w-14 items-center justify-center rounded-[8px] border-2 border-black" style={{ backgroundColor: color }}>
          <Icon className="h-7 w-7 text-black" strokeWidth={2.5} />
        </div>
        <Sparkles className="h-5 w-5 text-[#C9BE8E]" />
      </div>
      <p className="text-4xl font-black leading-none text-black">{value}</p>
      <p className="mt-3 text-sm font-black uppercase tracking-[0.18em] text-[#4C3F16]">{label}</p>
      <p className="mt-5 max-w-[15rem] text-lg font-medium leading-snug text-black/80">{helper}</p>
    </motion.div>
  )
}

function Panel({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon: typeof TrendingUp }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[18px] border-2 border-black bg-[#FFF8E8] p-6 shadow-[6px_6px_0_0_rgba(0,0,0,1)]"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[8px] border-2 border-black bg-[#FFE100]">
          <Icon className="h-5 w-5 text-black" />
        </div>
        <h2 className="text-xl font-black text-black">{title}</h2>
      </div>
      {children}
    </motion.section>
  )
}

function RankingList({
  rows,
  valueKey,
  valueFormat = 'money',
  empty,
}: {
  rows: Array<Record<string, any>>
  valueKey: string
  valueFormat?: 'money' | 'number'
  empty: string
}) {
  const max = Math.max(...rows.map((row) => Number(row[valueKey]) || 0), 0)
  if (!rows.length) return <EmptyState label={empty} />

  return (
    <div className="space-y-4">
      {rows.map((row, index) => (
        <div key={row.id || row.name || index}>
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <div className="min-w-0">
              <p className="truncate text-base font-black text-black">{row.name || row.title || row.label}</p>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-black/45">
                {formatNumber(row.clicks || row.products || row.impressions || 0)} signals
              </p>
            </div>
            <span className="shrink-0 font-mono text-sm font-black text-black">
              {valueFormat === 'money' ? money(row[valueKey]) : formatNumber(row[valueKey])}
            </span>
          </div>
          <div className="h-4 overflow-hidden rounded-full border border-black bg-white">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct(Number(row[valueKey]) || 0, max)}%` }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full bg-black"
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function Trend({ rows }: { rows: AnalyticsData['series'] }) {
  const max = Math.max(...rows.map((row) => row.revenue || row.clicks || row.orders), 0)
  if (!rows.length) return <EmptyState label="No tracked activity yet for this period." />

  return (
    <div className="flex h-64 items-end gap-2 overflow-hidden rounded-[14px] border-2 border-black bg-[#F3EEDA] p-4">
      {rows.slice(-30).map((row) => (
        <div key={row.day} className="flex min-w-4 flex-1 flex-col items-center justify-end gap-2">
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${pct(row.revenue || row.clicks || row.orders, max)}%` }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="w-full rounded-t-[8px] border-2 border-black bg-[#FFE100]"
            title={`${row.day}: ${money(row.revenue)} revenue, ${formatNumber(row.clicks)} clicks`}
          />
          <span className="hidden text-[10px] font-black text-black/45 sm:block">{row.day.slice(5)}</span>
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsBoard({ expectedRole }: { expectedRole: Role }) {
  const [days, setDays] = useState(30)
  const { data, isLoading, isFetching, error, refetch } = useQuery<AnalyticsData>({
    queryKey: ['analytics-overview', days],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/overview?days=${days}`, { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to load analytics')
      return json
    },
    staleTime: 30_000,
  })

  const role = data?.role || expectedRole
  const copy = roleCopy[role]

  const stats = useMemo(() => {
    const kpis = data?.kpis || {}
    if (role === 'influencer') {
      return [
        { label: 'Earnings', value: metricValue(kpis.commission, 'money'), helper: 'Estimated creator commission from real purchase events.', icon: DollarSign, color: '#8BFF00' },
        { label: 'Clicks', value: metricValue(kpis.clicks), helper: 'All tracked product-link clicks scoped to your creator ID.', icon: MousePointerClick, color: '#FFE100' },
        { label: 'Orders', value: metricValue(kpis.orders), helper: 'Purchases attributed to your tracked links.', icon: ShoppingBag, color: '#FFA195' },
        { label: 'CVR', value: metricValue(kpis.cvr, 'percent'), helper: 'Orders divided by tracked clicks.', icon: TrendingUp, color: '#B799FF' },
      ]
    }
    if (role === 'brand') {
      return [
        { label: 'Revenue', value: metricValue(kpis.revenue, 'money'), helper: 'Sales attributed to products owned by this brand.', icon: DollarSign, color: '#8BFF00' },
        { label: 'Influencers', value: metricValue(kpis.influencers), helper: 'Creators currently promoting your products.', icon: Users, color: '#FFE100' },
        { label: 'ROAS', value: metricValue(kpis.roas, 'x'), helper: 'Tracked revenue divided by campaign spend.', icon: Target, color: '#B799FF' },
        { label: 'Products', value: metricValue(kpis.products), helper: 'Catalog items included in this brand view.', icon: Package, color: '#7DD3FC' },
      ]
    }
    return [
      { label: 'GMV', value: metricValue(kpis.revenue, 'money'), helper: 'Total real attributed revenue across the platform.', icon: DollarSign, color: '#8BFF00' },
      { label: 'Orders', value: metricValue(kpis.orders), helper: 'Platform purchase events excluding simulations.', icon: ShoppingBag, color: '#FFE100' },
      { label: 'Creators', value: metricValue(kpis.influencers), helper: 'Influencer accounts visible to admin.', icon: Users, color: '#FFA195' },
      { label: 'Brands', value: metricValue(kpis.brands), helper: 'Brand accounts visible to admin.', icon: Crown, color: '#B799FF' },
    ]
  }, [data?.kpis, role])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFF8E8]">
        <BrutalLoader size="lg" tone={role === 'brand' ? 'brand' : 'influencer'} label="Loading analytics" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#FFF8E8] px-4 py-28">
        <div className="mx-auto max-w-xl rounded-[18px] border-2 border-black bg-[#FFF8E8] p-8 text-center shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
          <Activity className="mx-auto mb-4 h-10 w-10 text-red-500" />
          <h1 className="text-2xl font-black text-black">Analytics did not load</h1>
          <p className="mt-2 text-sm font-semibold text-black/55">{error instanceof Error ? error.message : 'Please try again.'}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-6 inline-flex items-center gap-2 rounded-[10px] border-2 border-black bg-[#FFE100] px-5 py-3 text-sm font-black text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  const isMismatchedRole = data.role !== expectedRole

  return (
    <div className="min-h-screen bg-[#FFF8E8] text-black">
      <div className="flex">
        <SideNav role={role} viewerName={data.viewer.name} />
        <main className="min-w-0 flex-1">
          <TopBar title={copy.title} />
          <MobileNav role={role} />

          <div className="mx-auto max-w-[1400px] px-5 py-10 lg:px-20">
            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-24 rounded-[20px] border-2 border-black p-6 shadow-[7px_7px_0_0_rgba(0,0,0,1)] sm:p-10"
              style={{ backgroundColor: copy.hero }}
            >
              <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <div className="mb-7 inline-flex items-center gap-3 rounded-full border-2 border-black bg-[#FFF8E8] px-4 py-2 text-xs font-black uppercase tracking-[0.2em]">
                    <span className="h-3 w-3 rounded-full bg-[#1F66FF]" />
                    {data.viewer.name}
                  </div>
                  <h2 className="max-w-xl text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl">{copy.title.replace(' ', '\n')}</h2>
                  <p className="mt-7 max-w-xl text-2xl font-medium leading-snug text-black/80">{copy.subtitle}</p>
                  {isMismatchedRole && (
                    <p className="mt-4 text-sm font-black text-red-600">Your account role is {data.role}; this page is scoped to your real login permissions.</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-5">
                  <div className="flex overflow-hidden rounded-[10px] border-2 border-black bg-[#FFF8E8] shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
                    {periods.map((period) => (
                      <button
                        key={period}
                        type="button"
                        onClick={() => setDays(period)}
                        className={`h-12 border-r-2 border-black px-6 text-base font-black last:border-r-0 ${
                          days === period ? 'bg-black text-[#FFF8E8]' : 'bg-[#FFF8E8] text-black'
                        }`}
                      >
                        {period}d
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="inline-flex h-12 items-center gap-3 rounded-[10px] border-2 border-black bg-[#FFF8E8] px-7 text-base font-black shadow-[5px_5px_0_0_rgba(0,0,0,1)] transition-transform hover:-translate-y-1"
                  >
                    <RefreshCw className={`h-5 w-5 ${isFetching ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>
            </motion.section>

            <div className="mb-16 grid gap-8 md:grid-cols-2 2xl:grid-cols-4">
              {stats.map((stat) => (
                <StatCard key={stat.label} {...stat} />
              ))}
            </div>

            <div className="grid gap-8 xl:grid-cols-[1.35fr_0.65fr]">
              <Panel title="Revenue And Activity Trend" icon={LineChart}>
                <Trend rows={data.series} />
              </Panel>
              <Panel title="Traffic Quality" icon={MousePointerClick}>
                <RankingList rows={data.devices} valueKey="value" valueFormat="number" empty="Device data appears after tracked-link clicks." />
              </Panel>
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-2">
              <Panel title={role === 'brand' ? 'Top Influencers Promoting You' : 'Top Influencers'} icon={Users}>
                <RankingList rows={data.topInfluencers} valueKey="revenue" empty="No influencer sales yet for this period." />
              </Panel>
              <Panel title="Top Products" icon={Box}>
                <RankingList rows={data.topProducts} valueKey="revenue" empty="No product performance yet for this period." />
              </Panel>
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-2">
              {role === 'admin' ? (
                <Panel title="Top Brands" icon={Crown}>
                  <RankingList rows={data.topBrands} valueKey="revenue" empty="No brand revenue yet for this period." />
                </Panel>
              ) : (
                <Panel title="Campaign Pulse" icon={Target}>
                  <RankingList rows={data.campaigns} valueKey="impressions" valueFormat="number" empty="No campaign analytics yet." />
                </Panel>
              )}
              <Panel title="Country Split" icon={BarChart3}>
                <RankingList rows={data.countries} valueKey="value" valueFormat="number" empty="Country data appears after tracked-link clicks." />
              </Panel>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
