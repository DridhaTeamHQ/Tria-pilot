'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  BarChart3,
  Box,
  Crown,
  DollarSign,
  LineChart,
  MousePointerClick,
  Package,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Target,
  TrendingUp,
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
    subtitle: 'Your product-link performance, earnings, clicks, and top-performing product signals.',
    accent: '#FF8C69',
    soft: '#FFF1EC',
  },
  brand: {
    title: 'Brand Analytics',
    subtitle: 'Your product performance, campaign efficiency, and top influencers promoting your catalog.',
    accent: '#B4F056',
    soft: '#F2FFE4',
  },
  admin: {
    title: 'Platform Analytics',
    subtitle: 'Everything across brands, influencers, tracked links, revenue, campaigns, and traffic quality.',
    accent: '#A78BFA',
    soft: '#F3EEFF',
  },
} satisfies Record<Role, { title: string; subtitle: string; accent: string; soft: string }>

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
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-black/15 bg-white/60 p-6 text-center">
      <BarChart3 className="mb-3 h-8 w-8 text-black/25" />
      <p className="text-sm font-bold text-black/45">{label}</p>
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
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      className="group rounded-2xl border-2 border-black/10 bg-white p-5 shadow-[0_12px_30px_rgba(17,17,17,0.06)] transition-shadow hover:shadow-[0_18px_45px_rgba(17,17,17,0.10)]"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="rounded-2xl border-2 border-black/10 p-3" style={{ backgroundColor: color }}>
          <Icon className="h-5 w-5 text-black" strokeWidth={2.5} />
        </div>
        <Sparkles className="h-4 w-4 text-black/20 transition-transform group-hover:rotate-12" />
      </div>
      <p className="text-2xl font-black tracking-tight text-black sm:text-3xl">{value}</p>
      <p className="mt-1 text-sm font-black uppercase tracking-[0.16em] text-black/50">{label}</p>
      <p className="mt-3 text-sm font-semibold leading-relaxed text-black/55">{helper}</p>
    </motion.div>
  )
}

function Panel({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon: typeof TrendingUp }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border-2 border-black/10 bg-white p-5 shadow-[0_12px_34px_rgba(17,17,17,0.06)]"
    >
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-xl bg-black p-2 text-white">
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="text-lg font-black text-black">{title}</h2>
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
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={row.id || row.name || index} className="group">
          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-black text-black">{row.name || row.title || row.label}</p>
              <p className="text-xs font-semibold text-black/45">
                {formatNumber(row.clicks || row.products || row.impressions || 0)} signal
                {(row.orders || row.conversions) ? `s - ${formatNumber(row.orders || row.conversions)} results` : 's'}
              </p>
            </div>
            <span className="shrink-0 font-mono text-sm font-black text-black">
              {valueFormat === 'money' ? money(row[valueKey]) : formatNumber(row[valueKey])}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-black/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct(Number(row[valueKey]) || 0, max)}%` }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full bg-black"
              style={{ opacity: 0.35 + index * -0.025 }}
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
    <div className="flex h-56 items-end gap-2 overflow-hidden rounded-2xl bg-[#F9F8F4] p-4">
      {rows.slice(-30).map((row) => (
        <div key={row.day} className="flex min-w-4 flex-1 flex-col items-center justify-end gap-2">
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${pct(row.revenue || row.clicks || row.orders, max)}%` }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="w-full rounded-t-xl border border-black/10 bg-[#FF8C69]"
            title={`${row.day}: ${money(row.revenue)} revenue, ${formatNumber(row.clicks)} clicks`}
          />
          <span className="hidden text-[10px] font-bold text-black/35 sm:block">{row.day.slice(5)}</span>
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
        { label: 'Earnings', value: metricValue(kpis.commission, 'money'), helper: 'Estimated creator commission from real purchase events.', icon: DollarSign, color: '#B4F056' },
        { label: 'Clicks', value: metricValue(kpis.clicks), helper: 'All tracked product-link clicks scoped to your creator ID.', icon: MousePointerClick, color: '#FFD93D' },
        { label: 'Orders', value: metricValue(kpis.orders), helper: 'Purchases attributed to your tracked links.', icon: ShoppingBag, color: '#FF8C69' },
        { label: 'CVR', value: metricValue(kpis.cvr, 'percent'), helper: 'Orders divided by tracked clicks.', icon: TrendingUp, color: '#A78BFA' },
      ]
    }
    if (role === 'brand') {
      return [
        { label: 'Revenue', value: metricValue(kpis.revenue, 'money'), helper: 'Sales attributed to products owned by this brand.', icon: DollarSign, color: '#B4F056' },
        { label: 'Influencers', value: metricValue(kpis.influencers), helper: 'Creators currently promoting your products.', icon: Users, color: '#FFD93D' },
        { label: 'ROAS', value: metricValue(kpis.roas, 'x'), helper: 'Tracked revenue divided by campaign spend.', icon: Target, color: '#A78BFA' },
        { label: 'Products', value: metricValue(kpis.products), helper: 'Catalog items included in this brand view.', icon: Package, color: '#7DD3FC' },
      ]
    }
    return [
      { label: 'GMV', value: metricValue(kpis.revenue, 'money'), helper: 'Total real attributed revenue across the platform.', icon: DollarSign, color: '#B4F056' },
      { label: 'Orders', value: metricValue(kpis.orders), helper: 'Platform purchase events excluding simulations.', icon: ShoppingBag, color: '#FFD93D' },
      { label: 'Creators', value: metricValue(kpis.influencers), helper: 'Influencer accounts visible to admin.', icon: Users, color: '#FF8C69' },
      { label: 'Brands', value: metricValue(kpis.brands), helper: 'Brand accounts visible to admin.', icon: Crown, color: '#A78BFA' },
    ]
  }, [data?.kpis, role])

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#F9F8F4]">
        <BrutalLoader size="lg" tone={role === 'brand' ? 'brand' : 'influencer'} label="Loading analytics" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-[70vh] bg-[#F9F8F4] px-4 py-28">
        <div className="mx-auto max-w-xl rounded-3xl border-2 border-black bg-white p-8 text-center shadow-[0_18px_45px_rgba(17,17,17,0.08)]">
          <Activity className="mx-auto mb-4 h-10 w-10 text-red-500" />
          <h1 className="text-2xl font-black text-black">Analytics did not load</h1>
          <p className="mt-2 text-sm font-semibold text-black/55">{error instanceof Error ? error.message : 'Please try again.'}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-6 inline-flex items-center gap-2 rounded-xl border-2 border-black bg-black px-5 py-3 text-sm font-black text-white transition-transform hover:-translate-y-0.5"
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
    <div className="min-h-screen bg-[#F9F8F4] px-4 pb-16 pt-24 sm:px-6 sm:pt-28">
      <div className="mx-auto max-w-7xl">
        <motion.header
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-[28px] border-2 border-black/10 bg-white p-6 shadow-[0_18px_50px_rgba(17,17,17,0.07)] sm:p-8"
          style={{ background: `linear-gradient(135deg, #fff 0%, ${copy.soft} 100%)` }}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-black/55">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: copy.accent }} />
                {data.viewer.name}
              </div>
              <h1 className="text-4xl font-black tracking-tight text-black sm:text-5xl">{copy.title}</h1>
              <p className="mt-3 max-w-2xl text-base font-semibold leading-relaxed text-black/60">{copy.subtitle}</p>
              {isMismatchedRole && (
                <p className="mt-3 text-sm font-bold text-red-600">Your account role is {data.role}; this page is scoped to your real login permissions.</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {periods.map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setDays(period)}
                  className={`rounded-xl border-2 border-black px-4 py-2 text-sm font-black transition-all ${days === period ? 'bg-black text-white' : 'bg-white text-black hover:-translate-y-0.5'}`}
                >
                  {period}d
                </button>
              ))}
              <button
                type="button"
                onClick={() => refetch()}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-black bg-white px-4 py-2 text-sm font-black text-black transition-all hover:-translate-y-0.5"
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </motion.header>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
          <Panel title="Revenue And Activity Trend" icon={LineChart}>
            <Trend rows={data.series} />
          </Panel>
          <Panel title="Traffic Quality" icon={MousePointerClick}>
            <RankingList rows={data.devices} valueKey="value" valueFormat="number" empty="Device data appears after tracked-link clicks." />
          </Panel>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Panel title={role === 'brand' ? 'Top Influencers Promoting You' : 'Top Influencers'} icon={Users}>
            <RankingList rows={data.topInfluencers} valueKey="revenue" empty="No influencer sales yet for this period." />
          </Panel>
          <Panel title="Top Products" icon={Box}>
            <RankingList rows={data.topProducts} valueKey="revenue" empty="No product performance yet for this period." />
          </Panel>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
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
    </div>
  )
}
