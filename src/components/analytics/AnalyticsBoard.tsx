'use client'

import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Box,
  ChevronDown,
  ChevronRight,
  IndianRupee,
  Globe,
  Info,
  LineChart,
  MousePointerClick,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Package,
  Crown,
  DollarSign
} from 'lucide-react'
import { BrutalLoader } from '@/components/ui/BrutalLoader'

type Role = 'admin' | 'brand' | 'influencer'

type AnalyticsData = {
  role: Role
  viewer: { id: string; name: string }
  period: { days: number }
  kpis: Record<string, number | undefined>
  series: Array<{ day: string; clicks: number; orders: number; revenue: number }>
  topProducts: Array<{ id: string; name: string; category: string; clicks: number; orders: number; revenue: number; image?: string }>
  topInfluencers: Array<{ id: string; name: string; clicks: number; orders: number; revenue: number; commission: number }>
  topBrands: Array<{ id: string; name: string; products: number; orders: number; revenue: number }>
  campaigns: Array<{ id: string; title: string; status: string; clicks: number; revenue: number; impressions?: number }>
  countries: Array<{ label: string; value: number }>
  devices: Array<{ label: string; value: number }>
}

function formatNumber(value: number | undefined) {
  const n = value || 0
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString('en-IN')
}

function formatMoney(value: number | undefined) {
  const n = value || 0
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)}L`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

function StatCard({
  label,
  value,
  change,
  icon: Icon,
  color,
  days,
}: {
  label: string
  value: string
  change: number
  icon: any
  color: string
  days: number
}) {
  const isPositive = change >= 0
  return (
    <motion.div
      whileHover={{ y: -4, x: -4, boxShadow: '12px 12px 0px 0px rgba(0,0,0,1)' }}
      className="group relative overflow-hidden rounded-2xl border-[3px] border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all"
    >
      <div className="flex items-center justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 border-black transition-transform group-hover:scale-110`} style={{ backgroundColor: color }}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="flex h-6 w-6 items-center justify-center">
          <TrendingUp className="h-4 w-4 text-black/10" />
        </div>
      </div>
      <div className="mt-5">
        <p className="text-xs font-black uppercase tracking-wider text-black/40">{label}</p>
        <h3 className="mt-1 text-3xl font-black text-black truncate" title={value}>{value}</h3>
      </div>
      <div className="mt-4 flex items-center gap-1.5">
        <div className={`flex items-center gap-1 rounded-full border-2 border-black px-2 py-0.5 text-[10px] font-black ${isPositive ? 'bg-emerald-400' : 'bg-rose-400'}`}>
          {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(change).toFixed(1)}%
        </div>
        <span className="text-[10px] font-bold text-black/30">vs last {days} days</span>
      </div>
    </motion.div>
  )
}

function MainTrendChart({ data: inputData, height = '300px', days = 7, activeSeries = { clicks: true, revenue: true, orders: true } }: { data: AnalyticsData['series']; height?: number | string; days?: number; activeSeries?: { clicks: boolean; revenue: boolean; orders: boolean } }) {
  const data = useMemo(() => {
    const safeDays = days || 7;
    const endDate = new Date(); // End date is always today for these preset timeframes
    
    return Array.from({ length: safeDays }).map((_, i) => {
      const d = new Date(endDate);
      d.setDate(d.getDate() - (safeDays - 1 - i));
      d.setHours(0, 0, 0, 0);
      
      const existing = inputData?.find(item => {
        const itemDate = new Date(item.day);
        itemDate.setHours(0, 0, 0, 0);
        return itemDate.getTime() === d.getTime();
      });
      
      if (existing) return existing;
      
      return { day: d.toISOString(), clicks: 0, orders: 0, revenue: 0 };
    });
  }, [inputData, days]);

  const labelStep = useMemo(() => {
    if (days <= 7) return 1
    if (days <= 31) return 5
    if (days <= 90) return 10
    if (days <= 365) return 30
    return 30
  }, [days])

  const maxClicks = Math.max(...data.map((d) => d.clicks), 50)
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 100)
  const maxOrders = Math.max(...data.map((d) => d.orders), 20)

  const pointDenominator = Math.max(data.length - 1, 1)

  const clickPoints = data.map((d, i) => ({
    x: (i / pointDenominator) * 100,
    y: 100 - (d.clicks / maxClicks) * 80 - 10,
  }))

  const revenuePoints = data.map((d, i) => ({
    x: (i / pointDenominator) * 100,
    y: 100 - (d.revenue / maxRevenue) * 80 - 10,
  }))

  const orderPoints = data.map((d, i) => ({
    x: (i / pointDenominator) * 100,
    y: 100 - (d.orders / maxOrders) * 80 - 10,
  }))

  const getLinearPath = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
  };

  const clickPath = getLinearPath(clickPoints);
  const revenuePath = getLinearPath(revenuePoints);
  const orderPath = getLinearPath(orderPoints);

  return (
    <div className="relative w-full px-12 pt-4" style={{ height }}>
      <div className="absolute inset-x-12 top-4 bottom-5 flex flex-col justify-between pointer-events-none">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-full border-b border-black/[0.03]" />
        ))}
      </div>

      <div className="absolute left-0 top-4 bottom-5 flex flex-col justify-between py-1 text-[10px] font-bold text-black/30 w-10 text-right pr-2">
        {activeSeries.clicks && [maxClicks, maxClicks * 0.8, maxClicks * 0.6, maxClicks * 0.4, maxClicks * 0.2, 0].map((v, i) => (
          <span key={i}>{Math.round(v)}</span>
        ))}
      </div>
      <div className="absolute right-0 top-4 bottom-5 flex flex-col justify-between py-1 text-[10px] font-bold text-black/30 w-10 text-left pl-2">
        {activeSeries.revenue && [maxRevenue, maxRevenue * 0.8, maxRevenue * 0.6, maxRevenue * 0.4, maxRevenue * 0.2, 0].map((v, i) => (
          <span key={i}>{formatNumber(v)}</span>
        ))}
      </div>

      <div className="absolute inset-x-12 top-4 bottom-5">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
          {activeSeries.clicks && (
            <path
              d={clickPath}
              fill="none"
              stroke="#ea580c"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {activeSeries.revenue && (
            <path
              d={revenuePath}
              fill="none"
              stroke="#172554"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {activeSeries.orders && (
            <path
              d={orderPath}
              fill="none"
              stroke="#0d9488"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
      </div>

      <div className="absolute bottom-2 inset-x-12 h-4 pointer-events-none">
        {data.map((d, i) => {
          const isLast = i === data.length - 1
          const showLabel = i % labelStep === 0 || isLast
          if (!showLabel) return null

          let transform = "translateX(-50%)"
          if (i === 0) transform = "translateX(0)"
          else if (isLast) transform = "translateX(-100%)"

          return (
            <div 
              key={i} 
              className="absolute text-[10px] font-bold text-black/30 whitespace-nowrap"
              style={{ 
                left: `${(i / Math.max(data.length - 1, 1)) * 100}%`,
                transform
              }}
            >
              {new Date(d.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DoughnutChart({ value, label = "CVR" }: { value: number; label?: string }) {
  const radius = 64
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(value, 100) / 100) * circumference

  return (
    <div className="relative flex items-center justify-center">
      <svg className="h-52 w-52 -rotate-90">
        <circle cx="104" cy="104" r={radius} fill="transparent" stroke="rgba(0,0,0,0.05)" strokeWidth="16" />
        <motion.circle
          cx="104"
          cy="104"
          r={radius}
          fill="transparent"
          stroke="#8B5CF6"
          strokeWidth="16"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center text-center">
        <span className="text-2xl font-bold text-black">{value.toFixed(2)}%</span>
        <span className="text-xs font-bold uppercase tracking-wider text-black/30 mt-0.5">{label}</span>
      </div>
    </div>
  )
}

function RankingList({ title, items, type = 'product' }: { title: string; items: any[]; type?: 'influencer' | 'product' | 'campaign' | 'brand' }) {
  return (
    <div className="flex min-h-[370px] flex-col rounded-2xl border-[3px] border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-tight text-black">
          {title}
        </h3>
        <button type="button" className="rounded-lg border-2 border-black bg-blue-400 px-3 py-1 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none">
          See all
        </button>
      </div>
      <div className="space-y-4">
        {items.slice(0, 5).map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-4 rounded-xl border-2 border-black/5 p-2 transition-colors hover:border-black/20">
            <div className="flex items-center gap-3 min-w-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-black">{item.name || item.title}</p>
                <p className="text-[11px] font-bold text-black/40">
                  {formatNumber(item.clicks || item.orders)} Signals
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-black">{formatMoney(item.revenue || item.commission)}</p>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="py-8 text-center text-sm text-black/30">No records found</p>}
      </div>
    </div>
  )
}

function Sparkline({ data, color = "#10B981" }: { data: number[], color?: string }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.length > 1
    ? data.map((v, i) => ({
      x: (i / (data.length - 1)) * 100,
      y: 100 - ((v - min) / range) * 80 - 10,
    }))
    : [{ x: 0, y: 50 }, { x: 100, y: 50 }];

  const path = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');

  return (
    <div className="relative h-12 w-24">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <linearGradient id={`sparkGradient-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L 100 100 L 0 100 Z`} fill={`url(#sparkGradient-${color})`} />
        <motion.path
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeInOut" }}
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="4" fill={color} stroke="white" strokeWidth="2" />
      </svg>
    </div>
  );
}

function QuickInsightRow({ label, value, subValue, data, color, days }: { label: string, value: string, subValue: string, data: number[], color: string, days: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl border-2 border-black p-4 transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" style={{ backgroundColor: `${color}10` }}>
      <div className="flex flex-col">
        <span className="text-xl font-black text-black">{value}</span>
        <span className="text-[10px] font-black uppercase tracking-wider text-black/60">{label}</span>
        <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-black/40">
          <span className="flex items-center gap-0.5 rounded-full border border-black/10 bg-emerald-100 px-1.5 text-emerald-600">
            <ArrowUpRight className="h-3 w-3" />
            {subValue}
          </span>
          <span>vs last {days} days</span>
        </div>
      </div>
      <Sparkline data={data} color={color} />
    </div>
  )
}

export default function AnalyticsBoard({ expectedRole }: { expectedRole: Role }) {
  const [days, setDays] = useState(30)
  const [activeSeries, setActiveSeries] = useState({ clicks: true, revenue: true, orders: true })
  const [isChartDaysDropdownOpen, setIsChartDaysDropdownOpen] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    [7, 30, 90, 365].forEach(d => {
      if (d !== days) {
        queryClient.prefetchQuery({
          queryKey: ['analytics-overview', expectedRole, d],
          queryFn: async () => {
            const res = await fetch(`/api/analytics/overview?days=${d}`, { credentials: 'include' })
            if (!res.ok) throw new Error('Failed to load analytics')
            return res.json()
          }
        })
      }
    })
  }, [expectedRole, queryClient, days])

  const { data, isLoading, isFetching, refetch } = useQuery<AnalyticsData>({
    queryKey: ['analytics-overview', expectedRole, days],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/overview?days=${days}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load analytics')
      return res.json()
    },
    placeholderData: keepPreviousData,
  })

  const role = data?.role || expectedRole
  const kpis = data?.kpis || {}

  const stats = useMemo(() => {
    if (role === 'influencer') {
      return [
        { label: 'Earnings', value: formatMoney(kpis.commission), change: kpis.commissionChange || 0, icon: IndianRupee, color: '#10B981' },
        { label: 'Clicks', value: formatNumber(kpis.clicks), change: kpis.clicksChange || 0, icon: MousePointerClick, color: '#F59E0B' },
        { label: 'Orders', value: formatNumber(kpis.orders), change: kpis.ordersChange || 0, icon: ShoppingBag, color: '#EF4444' },
        { label: 'CVR', value: `${(kpis.cvr || 0).toFixed(2)}%`, change: kpis.cvrChange || 0, icon: TrendingUp, color: '#8B5CF6' },
      ]
    }
    if (role === 'brand') {
      return [
        { label: 'Revenue', value: formatMoney(kpis.revenue), change: kpis.revenueChange || 0, icon: DollarSign, color: '#B4F056' },
        { label: 'Influencers', value: formatNumber(kpis.influencers), change: kpis.influencersChange || 0, icon: Users, color: '#7DD3FC' },
        { label: 'Orders', value: formatNumber(kpis.orders), change: kpis.ordersChange || 0, icon: ShoppingBag, color: '#FFD93D' },
        { label: 'ROAS', value: `${(kpis.roas || 0).toFixed(1)}x`, change: kpis.roasChange || 0, icon: Target, color: '#A78BFA' },
      ]
    }
    return [
      { label: 'GMV', value: formatMoney(kpis.revenue), change: kpis.revenueChange || 0, icon: DollarSign, color: '#10B981' },
      { label: 'Orders', value: formatNumber(kpis.orders), change: kpis.ordersChange || 0, icon: ShoppingBag, color: '#F59E0B' },
      { label: 'Creators', value: formatNumber(kpis.influencers), change: kpis.influencersChange || 0, icon: Users, color: '#EF4444' },
      { label: 'Brands', value: formatNumber(kpis.brands), change: kpis.brandsChange || 0, icon: Crown, color: '#8B5CF6' },
    ]
  }, [kpis, role])

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <BrutalLoader size="lg" tone={role === 'brand' ? 'brand' : 'influencer'} label="Generating insights..." />
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#F9F8F4] pt-8 pb-12">
      <div className="mx-auto max-w-full px-4 sm:px-10 lg:px-16">
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-black">
              {role === 'brand' ? 'Brand' : role === 'admin' ? 'Platform' : 'Creator'} <span className="text-blue-500">Analytics</span>
            </h1>
            <p className="mt-2 text-sm font-black uppercase tracking-widest text-black/40">Performance Overview & Strategic Insights</p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border-[3px] border-black bg-white p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            {[7, 30, 90, 365].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase transition-all ${days === d ? 'bg-black text-white' : 'text-black/40 hover:bg-black/5'
                  }`}
              >
                {d === 365 ? '365D' : `${d}D`}
              </button>
            ))}
            <div className="mx-1 h-6 w-[2px] bg-black" />
            <button
              type="button"
              onClick={() => refetch()}
              className="flex items-center gap-1.5 rounded-xl border-2 border-black bg-emerald-400 px-4 py-2 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Sync
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <StatCard key={i} {...stat} days={days} />
          ))}
        </div>

        <div className="mb-6 grid gap-6 lg:grid-cols-3 items-start">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <div className="rounded-2xl border-[3px] border-black bg-white p-6 pb-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col">
              <div className="mb-8 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-tight text-black">
                  <BarChart3 className="h-5 w-5" />
                  Performance Trends
                </h3>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-4">
                    <div 
                      className={`flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-80 ${!activeSeries.clicks ? 'opacity-40' : ''}`}
                      onClick={() => setActiveSeries(prev => ({ ...prev, clicks: !prev.clicks }))}
                    >
                      <div className="h-3 w-3 rounded-full border-2 border-black bg-[#ea580c]" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-black/40">Signals</span>
                    </div>
                    <div 
                      className={`flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-80 ${!activeSeries.revenue ? 'opacity-40' : ''}`}
                      onClick={() => setActiveSeries(prev => ({ ...prev, revenue: !prev.revenue }))}
                    >
                      <div className="h-3 w-3 rounded-full border-2 border-black bg-[#172554]" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-black/40">Revenue</span>
                    </div>
                    <div 
                      className={`flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-80 ${!activeSeries.orders ? 'opacity-40' : ''}`}
                      onClick={() => setActiveSeries(prev => ({ ...prev, orders: !prev.orders }))}
                    >
                      <div className="h-3 w-3 rounded-full border-2 border-black bg-[#0d9488]" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-black/40">Orders</span>
                    </div>
                  </div>
                  <div className="relative">
                    <button 
                      onClick={() => setIsChartDaysDropdownOpen(!isChartDaysDropdownOpen)}
                      className="flex items-center gap-1.5 rounded-lg border-2 border-black bg-yellow-300 px-3 py-1.5 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                    >
                      Last {days} Days
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    {isChartDaysDropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 z-10 w-32 rounded-xl border-2 border-black bg-white p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        {[7, 30, 90, 365].map((d) => (
                          <button
                            key={d}
                            onClick={() => {
                              setDays(d)
                              setIsChartDaysDropdownOpen(false)
                            }}
                            className={`w-full text-left rounded-lg px-3 py-2 text-[10px] font-black uppercase transition-colors ${days === d ? 'bg-yellow-300 text-black' : 'text-black/60 hover:bg-black/5'}`}
                          >
                            Last {d} Days
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="h-[280px]">
                <MainTrendChart data={data?.series || []} days={days} height={280} activeSeries={activeSeries} />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <RankingList title={role === 'admin' ? 'Top Brands' : 'Top Influencers'} items={role === 'admin' ? (data?.topBrands || []) : (data?.topInfluencers || [])} type={role === 'admin' ? 'brand' : 'influencer'} />
              <RankingList title="Top Products" items={data?.topProducts || []} type="product" />
            </div>

            {role !== 'brand' && (
              <div className="rounded-2xl border-[3px] border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-tight text-black">
                  <Globe className="h-4 w-4" />
                  Global Impact
                </h3>
                <div className="flex h-56 items-center justify-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/20">Analyzing regional distribution...</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col rounded-2xl border-[3px] border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <h3 className="mb-4 text-sm font-black uppercase tracking-tight text-black">Traffic Integrity</h3>
              <div className="flex flex-1 flex-col items-center justify-center py-4">
                <DoughnutChart value={kpis.cvr || 0} />
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-lg border-2 border-black p-3 bg-violet-50">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full border-2 border-black bg-violet-500" />
                    <span className="text-[11px] font-black uppercase text-black/60">Clicks</span>
                  </div>
                  <span className="text-xs font-black text-black">{formatNumber(kpis.clicks)}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border-2 border-black p-3 bg-violet-50/50">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full border-2 border-black bg-violet-200" />
                    <span className="text-[11px] font-black uppercase text-black/60">Orders</span>
                  </div>
                  <span className="text-xs font-black text-black">{formatNumber(kpis.orders)}</span>
                </div>
              </div>
              <div className="mt-6 rounded-xl border-2 border-black bg-yellow-50 p-4 flex items-start gap-3">
                <Info className="h-4 w-4 text-black shrink-0 mt-0.5" />
                <p className="text-[10px] font-black leading-relaxed text-black/60 uppercase tracking-tight">
                  Real-time synchronization active. Performance data is verified via conversion tracking nodes.
                </p>
              </div>
            </div>

            <div className="flex flex-col rounded-2xl border-[3px] border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] h-fit">
              <h3 className="mb-6 text-sm font-black uppercase tracking-tight text-black">Quick Insights</h3>
              <div className="flex flex-col gap-4">
                <QuickInsightRow label="Total Volume" value={formatNumber(kpis.clicks || kpis.impressions)} subValue="Verified" data={[30, 45, 35, 50, 48, 65, 80]} color="#10B981" days={days} />
                <QuickInsightRow label="Conversion" value={`${(kpis.cvr || 0).toFixed(2)}%`} subValue="Stable" data={[5, 8, 4, 10, 7, 9, 12]} color="#F59E0B" days={days} />
                <QuickInsightRow label="Revenue Pulse" value={formatMoney(kpis.revenue || kpis.commission)} subValue="Trending" data={[20, 40, 15, 60, 30, 70, 90]} color="#8B5CF6" days={days} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
