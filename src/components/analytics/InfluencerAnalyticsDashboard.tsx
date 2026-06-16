'use client'

import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
  Link as LinkIcon,
  LineChart,
  MousePointerClick,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'
import { BrutalLoader } from '@/components/ui/BrutalLoader'

type AnalyticsData = {
  role: string
  viewer: { id: string; name: string }
  period: { days: number }
  kpis: {
    commission?: number
    clicks?: number
    orders?: number
    cvr?: number
    commissionChange?: number
    clicksChange?: number
    ordersChange?: number
    cvrChange?: number
  }
  series: Array<{ day: string; clicks: number; orders: number; revenue: number }>
  topProducts: Array<{ id: string; name: string; category: string; clicks: number; orders: number; revenue: number; image?: string }>
  topInfluencers: Array<{ id: string; name: string; clicks: number; orders: number; revenue: number; commission: number }>
  campaigns: Array<{ id: string; title: string; status: string; clicks: number; revenue: number }>
  countries: Array<{ label: string; value: number }>
  devices: Array<{ label: string; value: number }>
}

type AffiliateLinksData = {
  affiliateTag: string | null
  totalClicks: number
  totalProducts: number
  totalRevenue: number
  totalEarnings: number
  totalOrders: number
  averageClicks: number
  products: Array<{
    productId: string
    productName: string
    productImage: string | null
    maskedUrl: string
    originalUrl: string | null
    linkCode: string
    clickCount: number
    uniqueClicks: number
    orderCount: number
    revenue: number
    earnings: number
    lastClickedAt: string | null
    createdAt: string
  }>
}

function formatNumber(value: number | undefined) {
  const n = value || 0
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString('en-IN')
}

function formatMoney(value: number | undefined) {
  const n = value || 0
  return `Rs. ${Math.round(n).toLocaleString('en-IN')}`
}

function formatRelativeDate(value?: string | null) {
  if (!value) return 'No clicks yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No clicks yet'
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
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
    <>
      {/* MOBILE STAT CARD (Horizontal layout) */}
      <motion.div
        whileHover={{ y: -4, x: -4, boxShadow: '6px 6px 0px 0px rgba(0,0,0,1)' }}
        className="group relative overflow-hidden rounded-[16px] border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center sm:hidden"
        style={{ backgroundColor: `${color}15` }}
      >
        <div className="m-4 mr-0 flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[14px] border-[2px] border-black bg-white transition-transform group-hover:scale-105">
          <Icon className="h-9 w-9" color={color} />
        </div>
        <div className="flex flex-col gap-1 py-4 pr-4 pl-4 w-full">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="text-[32px] font-black text-black leading-none" title={value}>{value}</h3>
            <p className="text-[11px] font-black uppercase tracking-widest text-black/90">{label}</p>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className={`flex items-center gap-1 rounded-full border-2 border-black px-1.5 py-0.5 text-[9px] font-black ${isPositive ? 'bg-emerald-400' : 'bg-rose-400'}`}>
              {isPositive ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
              {Math.abs(change).toFixed(1)}%
            </div>
            <span className="text-[9px] font-bold text-black/40">vs {days}d</span>
          </div>
        </div>
      </motion.div>

      {/* DESKTOP STAT CARD (Vertical layout) */}
      <motion.div
        whileHover={{ y: -4, x: -4, boxShadow: '12px 12px 0px 0px rgba(0,0,0,1)' }}
        className="group relative overflow-hidden rounded-2xl border-[3px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hidden sm:block sm:p-6 sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
      >
        <div className="flex items-center justify-between">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 border-black transition-transform group-hover:scale-110`} style={{ backgroundColor: color }}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="flex h-6 w-6 items-center justify-center">
            <TrendingUp className="h-4 w-4 text-black/10" />
          </div>
        </div>
        <div className="mt-4 sm:mt-5">
          <p className="text-xs font-black uppercase tracking-wider text-black/40">{label}</p>
          <h3 className="mt-1 text-2xl font-black text-black sm:text-3xl">{value}</h3>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <div className={`flex items-center gap-1 rounded-full border-2 border-black px-2 py-0.5 text-[10px] font-black ${isPositive ? 'bg-emerald-400' : 'bg-rose-400'}`}>
            {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(change).toFixed(1)}%
          </div>
          <span className="text-[10px] font-bold text-black/30">vs last {days} days</span>
        </div>
      </motion.div>
    </>
  )
}

function MainTrendChart({ data: inputData, height = '300px', days = 15, activeSeries = { clicks: true, revenue: true, orders: true } }: { data: AnalyticsData['series']; height?: number | string; days?: number; activeSeries?: { clicks: boolean; revenue: boolean; orders: boolean } }) {
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

  const desktopLabelStep = useMemo(() => {
    if (days <= 15) return 2
    if (days <= 31) return 5
    if (days <= 45) return 7
    if (days <= 365) return 60
    return 60
  }, [days])

  const mobileLabelStep = useMemo(() => {
    if (days <= 15) return 4
    if (days <= 31) return 10
    if (days <= 45) return 15
    if (days <= 365) return 120
    return 120
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

  // Use actual pixel dimensions for cross-browser SVG rendering (fixes mobile bug)
  const chartRef = useRef<HTMLDivElement>(null)
  const [chartSize, setChartSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = chartRef.current
    if (!el) return
    const update = () => {
      const { width, height } = el.getBoundingClientRect()
      setChartSize({ w: Math.round(width), h: Math.round(height) })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="relative w-full pl-8 pr-12 pt-4 sm:pl-12 sm:pr-14" style={{ height }}>
      <div className="absolute left-8 right-12 top-4 bottom-5 flex flex-col justify-between pointer-events-none sm:left-12 sm:right-14">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-full border-b border-black/[0.03]" />
        ))}
      </div>

      <div className="absolute left-0 top-4 bottom-5 flex w-8 flex-col justify-between py-1 pr-1 text-right text-[8px] font-bold text-black/30 sm:w-12 sm:pr-2 sm:text-[10px]">
        {activeSeries.clicks && [maxClicks, maxClicks * 0.8, maxClicks * 0.6, maxClicks * 0.4, maxClicks * 0.2, 0].map((v, i) => (
          <span key={i}>{Math.round(v)}</span>
        ))}
      </div>
      <div className="absolute right-0 top-4 bottom-5 flex w-12 flex-col justify-between py-1 pl-1 text-left text-[8px] font-bold text-black/30 sm:w-14 sm:pl-2 sm:text-[10px]">
        {activeSeries.revenue && [maxRevenue, maxRevenue * 0.8, maxRevenue * 0.6, maxRevenue * 0.4, maxRevenue * 0.2, 0].map((v, i) => (
          <span key={i}>{formatNumber(v)}</span>
        ))}
      </div>

      <div ref={chartRef} className="absolute left-8 right-12 top-4 bottom-5 sm:left-12 sm:right-14">
        <svg width={chartSize.w} height={chartSize.h} className="block" style={{ overflow: 'visible' }}>
          {(() => {
            // Map data y values (10-90% range from *80-10 formula) to pixel positions
            // matching the visual center of labels (py-1=4px padding + half line-height≈6px)
            const PY = 10 // matches py-1 on label containers
            const toY = (yPct: number) => PY + (yPct - 10) / 80 * (chartSize.h - 2 * PY)
            const toX = (xPct: number) => xPct / 100 * chartSize.w
            return (
              <>
                {activeSeries.clicks && chartSize.h > 0 && clickPoints.map((p, i) => i > 0 && (
                  <line
                    key={`click-${i}`}
                    x1={toX(clickPoints[i - 1].x)}
                    y1={toY(clickPoints[i - 1].y)}
                    x2={toX(p.x)}
                    y2={toY(p.y)}
                    stroke="#ea580c"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                ))}
                {activeSeries.revenue && chartSize.h > 0 && revenuePoints.map((p, i) => i > 0 && (
                  <line
                    key={`rev-${i}`}
                    x1={toX(revenuePoints[i - 1].x)}
                    y1={toY(revenuePoints[i - 1].y)}
                    x2={toX(p.x)}
                    y2={toY(p.y)}
                    stroke="#172554"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                ))}
                {activeSeries.orders && chartSize.h > 0 && orderPoints.map((p, i) => i > 0 && (
                  <line
                    key={`ord-${i}`}
                    x1={toX(orderPoints[i - 1].x)}
                    y1={toY(orderPoints[i - 1].y)}
                    x2={toX(p.x)}
                    y2={toY(p.y)}
                    stroke="#0d9488"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                ))}
              </>
            )
          })()}
        </svg>
      </div>

      <div className="absolute bottom-2 left-8 right-12 sm:left-12 sm:right-14 h-4 pointer-events-none">
        {data.map((d, i) => {
          const isLast = i === data.length - 1
          const showDesktop = i % desktopLabelStep === 0 || isLast
          const showMobile = i % mobileLabelStep === 0 || isLast

          if (!showDesktop && !showMobile) return null

          let transform = "translateX(-50%)"
          if (i === 0) transform = "translateX(0)"
          else if (isLast) transform = "translateX(-100%)"

          let visibilityClass = ""
          if (showDesktop && !showMobile) visibilityClass = "hidden sm:block"
          else if (!showDesktop && showMobile) visibilityClass = "sm:hidden"

          return (
            <div
              key={i}
              className={`absolute text-[10px] font-bold text-black/30 whitespace-nowrap ${visibilityClass}`}
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

      {!inputData?.length && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white/80 backdrop-blur-[2px] px-4 py-2 rounded-lg border border-black/5 shadow-sm">
            <p className="text-xs font-bold text-black/40 uppercase tracking-widest">No activity found for this period</p>
          </div>
        </div>
      )}
    </div>
  )
}

function DoughnutChart({ value, total = 100 }: { value: number; total?: number }) {
  const radius = 64
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / total) * circumference

  return (
    <div className="relative flex items-center justify-center">
      <svg className="h-44 w-44 -rotate-90 sm:h-52 sm:w-52" viewBox="0 0 176 176" width="100%" height="100%">
        <circle cx="88" cy="88" r={radius} fill="transparent" stroke="rgba(0,0,0,0.05)" strokeWidth="16" />
        <motion.circle
          cx="88"
          cy="88"
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
        <span className="text-xs font-bold uppercase tracking-wider text-black/30 mt-0.5">CVR</span>
      </div>
    </div>
  )
}

function RankingList({ title, items, type = 'product' }: { title: string; items: any[]; type?: 'influencer' | 'product' | 'campaign' }) {
  return (
    <div className="flex min-h-[320px] flex-col min-w-0 rounded-2xl border-[3px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:min-h-[370px] sm:p-6 sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <div className="mb-5 flex items-center justify-between gap-3 sm:mb-6">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-tight text-black">
          {title}
        </h3>
        <button className="rounded-lg border-2 border-black bg-blue-400 px-3 py-1 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none">
          See all
        </button>
      </div>
      <div className="space-y-4">
        {items.slice(0, 5).map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-3 rounded-xl border-2 border-black/5 p-2 transition-colors hover:border-black/20 sm:gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-black">{item.name || item.title}</p>
                <p className="text-[11px] font-bold text-black/40">
                  {formatNumber(item.clicks)} Clicks
                </p>
              </div>
            </div>
            <div className="shrink-0 text-right">
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
      y: 90 - ((v - min) / range) * 80, // Map min value to y=90 to prevent bottom clipping
    }))
    : [{ x: 0, y: 50 }, { x: 100, y: 50 }];

  const path = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');

  return (
    <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-4 h-14 w-24 sm:h-16 sm:w-28 opacity-80 sm:opacity-100">
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
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="4" fill={color} stroke="white" strokeWidth="2" />
      </svg>
    </div>
  );
}

function QuickInsightRow({ label, value, subValue, data, color, days }: { label: string, value: string, subValue: string, data: number[], color: string, days: number }) {
  return (
    <div className="flex items-center justify-between relative overflow-hidden rounded-xl border-2 border-black p-3 transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:p-4" style={{ backgroundColor: `${color}10` }}>
      <div className="flex flex-col relative z-10">
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

function AffiliateStatusCard({
  trackingId,
  totalLinks,
  totalOrders,
}: {
  trackingId: string | null
  totalLinks: number
  totalOrders: number
}) {
  const healthy = Boolean(trackingId)
  return (
    <div className="min-w-0 rounded-2xl border-[3px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:p-6 sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-tight text-black">
            <LinkIcon className="h-4 w-4" />
            Affiliate Setup
          </h3>
          <p className="mt-2 text-xs font-black uppercase tracking-wider text-black/40">Amazon Tracking ID</p>
          <p className="mt-2 break-all text-lg font-black text-black">{trackingId || 'Not saved yet'}</p>
        </div>
        <span className={`rounded-full border-2 border-black px-3 py-1 text-[10px] font-black uppercase ${healthy ? 'bg-[#B4F056]' : 'bg-[#FFD93D]'}`}>
          {healthy ? 'Ready' : 'Needs Setup'}
        </span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border-2 border-black bg-[#F9F8F4] p-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-black/40">Live Links</p>
          <p className="mt-2 text-2xl font-black text-black">{totalLinks}</p>
        </div>
        <div className="rounded-xl border-2 border-black bg-[#F9F8F4] p-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-black/40">Imported Orders</p>
          <p className="mt-2 text-2xl font-black text-black">{totalOrders}</p>
        </div>
      </div>
      {!healthy ? (
        <div className="mt-5 rounded-xl border-2 border-black bg-[#FFF4CC] p-4">
          <p className="text-[11px] font-black uppercase tracking-widest text-black/55">Next Step</p>
          <p className="mt-1 text-xs font-bold leading-relaxed text-black/70">
            Add your Amazon Tracking ID in Settings so every Kiwikoo link carries your own affiliate attribution.
          </p>
        </div>
      ) : null}
    </div>
  )
}

function AffiliateLinksTable({ data }: { data: AffiliateLinksData | undefined }) {
  const rows = data?.products || []

  return (
    <div className="min-w-0 rounded-2xl border-[3px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:p-6 sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-black uppercase tracking-tight text-black">Affiliate Links</h3>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-black/40">
            Real links, real clicks, imported revenue
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border-2 border-black bg-[#FFF4CC] px-3 py-1 text-[10px] font-black uppercase">
            Links {data?.totalProducts || 0}
          </span>
          <span className="rounded-full border-2 border-black bg-[#E7FFD1] px-3 py-1 text-[10px] font-black uppercase">
            Revenue {formatMoney(data?.totalRevenue)}
          </span>
          <span className="rounded-full border-2 border-black bg-[#EAE4FF] px-3 py-1 text-[10px] font-black uppercase">
            Earnings {formatMoney(data?.totalEarnings)}
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-black/20 bg-[#F9F8F4] p-8 text-center">
          <p className="text-sm font-black uppercase tracking-widest text-black/35">No affiliate links generated yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.slice(0, 8).map((row) => (
            <div key={row.linkCode} className="rounded-2xl border-[3px] border-black bg-[#FDFBF7] p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-lg font-black text-black">{row.productName}</p>
                  <p className="mt-2 break-all text-xs font-bold text-black/45">{row.maskedUrl}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border-2 border-black bg-white px-3 py-1 text-[10px] font-black uppercase">
                      Clicks {formatNumber(row.clickCount)}
                    </span>
                    <span className="rounded-full border-2 border-black bg-white px-3 py-1 text-[10px] font-black uppercase">
                      Orders {formatNumber(row.orderCount)}
                    </span>
                    <span className="rounded-full border-2 border-black bg-white px-3 py-1 text-[10px] font-black uppercase">
                      Last click {formatRelativeDate(row.lastClickedAt)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 lg:min-w-[210px]">
                  <div className="rounded-xl border-2 border-black bg-[#E7FFD1] p-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-black/45">Revenue</p>
                    <p className="mt-2 text-xl font-black text-black">{formatMoney(row.revenue)}</p>
                  </div>
                  <div className="rounded-xl border-2 border-black bg-[#EAE4FF] p-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-black/45">Earnings</p>
                    <p className="mt-2 text-xl font-black text-black">{formatMoney(row.earnings)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function InfluencerAnalyticsDashboard() {
  const [days, setDays] = useState(30)
  const [activeSeries, setActiveSeries] = useState({ clicks: true, revenue: true, orders: true })
  const [isChartDaysDropdownOpen, setIsChartDaysDropdownOpen] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    [15, 30, 45, 365].forEach(d => {
      if (d !== days) {
        queryClient.prefetchQuery({
          queryKey: ['influencer-analytics', d],
          queryFn: async () => {
            const res = await fetch(`/api/analytics/overview?days=${d}`, { credentials: 'include' })
            if (!res.ok) throw new Error('Failed to load analytics')
            return res.json()
          }
        })
      }
    })
  }, [queryClient, days])

  const { data, isLoading, isFetching, refetch } = useQuery<AnalyticsData>({
    queryKey: ['influencer-analytics', days],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/overview?days=${days}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load analytics')
      return res.json()
    },
  })
  const { data: affiliateLinks } = useQuery<AffiliateLinksData>({
    queryKey: ['affiliate-links-analytics'],
    queryFn: async () => {
      const res = await fetch('/api/links/analytics', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load affiliate links')
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <BrutalLoader size="lg" tone="influencer" label="Generating insights..." />
      </div>
    )
  }

  const kpis = data?.kpis || {}
  const stats = [
    { label: 'Earnings', value: formatMoney(kpis.commission), change: kpis.commissionChange || 0, icon: IndianRupee, color: '#10B981' },
    { label: 'Clicks', value: formatNumber(kpis.clicks), change: kpis.clicksChange || 33.3, icon: MousePointerClick, color: '#F59E0B' },
    { label: 'Orders', value: formatNumber(kpis.orders), change: kpis.ordersChange || 0, icon: ShoppingBag, color: '#EF4444' },
    { label: 'CVR', value: `${(kpis.cvr || 0).toFixed(2)}%`, change: kpis.cvrChange || 0, icon: TrendingUp, color: '#8B5CF6' },
  ]

  return (
    <div className="min-h-screen bg-[#F9F8F4] pt-24 pb-12">
      <div className="mx-auto w-full max-w-full overflow-x-clip px-3 sm:px-10 lg:px-16">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-black uppercase tracking-tighter text-black sm:text-4xl">
              Welcome back, <span className="text-blue-500">{data?.viewer?.name || 'Creator'}</span>!
            </h1>
            <p className="mt-2 text-sm font-black uppercase tracking-widest text-black/40">Performance Overview & Strategic Insights</p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-[3px] border-black bg-white p-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:gap-2 sm:p-2">
            <div className="flex flex-1 items-center justify-between sm:justify-start gap-1">
              {[15, 30, 45, 365].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`rounded-md sm:rounded-xl px-2 py-2 text-[10px] font-black uppercase transition-all sm:px-4 ${days === d ? 'bg-black text-white' : 'text-black/40 hover:bg-black/5'
                    }`}
                >
                  {d === 365 ? '365D' : `${d}D`}
                </button>
              ))}
            </div>
            <div className="hidden sm:mx-1 sm:block sm:h-6 sm:w-[2px] sm:bg-black" />
            <button
              onClick={() => refetch()}
              className="flex items-center justify-center gap-1 rounded-xl border-2 border-black bg-emerald-400 px-3 py-2 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none sm:gap-1.5 sm:px-4 shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Sync
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <StatCard key={i} {...stat} days={days} />
          ))}
        </div>

        <div className="mb-6 grid items-start gap-4 sm:gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-4 sm:gap-6 lg:col-span-2 min-w-0">
            <div className="flex flex-col min-w-0 rounded-2xl border-[3px] border-black bg-white p-4 pb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:p-6 sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className="mb-5 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center justify-between w-full sm:w-auto">
                  <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-tight text-black">
                    <BarChart3 className="h-5 w-5 shrink-0" />
                    <span className="truncate">Revenue & Clicks Trend</span>
                  </h3>
                  <div className="relative sm:hidden ml-2 shrink-0">
                    <button
                      onClick={() => setIsChartDaysDropdownOpen(!isChartDaysDropdownOpen)}
                      className="flex items-center gap-1 rounded-sm border border-black bg-yellow-300 px-1.5 py-0.5 text-[8px] font-black uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                    >
                      Last {days} Days
                      <ChevronDown className="h-2.5 w-2.5" />
                    </button>
                    {isChartDaysDropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 z-10 w-28 rounded-lg border-2 border-black bg-white p-1 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                        {[15, 30, 45, 365].map((d) => (
                          <button
                            key={d}
                            onClick={() => {
                              setDays(d)
                              setIsChartDaysDropdownOpen(false)
                            }}
                            className={`w-full text-left rounded-sm px-1.5 py-1 text-[8px] font-black uppercase transition-colors ${days === d ? 'bg-yellow-300 text-black' : 'text-black/60 hover:bg-black/5'}`}
                          >
                            Last {d} Days
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    <div
                      className={`flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-80 ${!activeSeries.clicks ? 'opacity-40' : ''}`}
                      onClick={() => setActiveSeries(prev => ({ ...prev, clicks: !prev.clicks }))}
                    >
                      <div className="h-3 w-3 rounded-full border-2 border-black bg-[#ea580c]" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-black/40">Clicks</span>
                    </div>
                    <div
                      className={`flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-80 ${!activeSeries.revenue ? 'opacity-40' : ''}`}
                      onClick={() => setActiveSeries(prev => ({ ...prev, revenue: !prev.revenue }))}
                    >
                      <div className="h-3 w-3 rounded-full border-2 border-black bg-[#172554]" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-black/40">Earnings</span>
                    </div>
                    <div
                      className={`flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-80 ${!activeSeries.orders ? 'opacity-40' : ''}`}
                      onClick={() => setActiveSeries(prev => ({ ...prev, orders: !prev.orders }))}
                    >
                      <div className="h-3 w-3 rounded-full border-2 border-black bg-[#0d9488]" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-black/40">Orders</span>
                    </div>
                  </div>
                  <div className="relative hidden sm:block">
                    <button
                      onClick={() => setIsChartDaysDropdownOpen(!isChartDaysDropdownOpen)}
                      className="flex items-center gap-1.5 rounded-lg border-2 border-black bg-yellow-300 px-3 py-1.5 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                    >
                      Last {days} Days
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    {isChartDaysDropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 z-10 w-32 rounded-xl border-2 border-black bg-white p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        {[15, 30, 45, 365].map((d) => (
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
              <div className="h-[250px] w-full shrink-0 sm:h-[280px]">
                <MainTrendChart data={data?.series || []} days={days} height="100%" activeSeries={activeSeries} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
              <RankingList title="Top Influencers" items={data?.topInfluencers || []} type="influencer" />
              <RankingList title="Top Products" items={data?.topProducts || []} type="product" />
            </div>

            <AffiliateLinksTable data={affiliateLinks} />

            <div className="relative min-w-0 overflow-hidden rounded-2xl border-[3px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:p-6 sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-tight text-black">
                <Globe className="h-4 w-4" />
                Country Split
              </h3>
              <div className="flex h-56 items-center justify-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-black/20">Awaiting Click Data...</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:gap-6 min-w-0">
            <div className="flex flex-col min-w-0 rounded-2xl border-[3px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:p-6 sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <h3 className="mb-4 text-sm font-black uppercase tracking-tight text-black">Traffic Quality</h3>
              <div className="flex flex-1 flex-col items-center justify-center py-4">
                <DoughnutChart value={kpis.cvr || 0} />
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-lg border-2 border-black p-3 bg-violet-50">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full border-2 border-black bg-violet-500" />
                    <span className="text-[11px] font-black uppercase text-black/60">Clicks</span>
                  </div>
                  <span className="text-xs font-black text-black">{kpis.clicks || 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border-2 border-black p-3 bg-violet-50/50">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full border-2 border-black bg-violet-200" />
                    <span className="text-[11px] font-black uppercase text-black/60">Orders</span>
                  </div>
                  <span className="text-xs font-black text-black">{kpis.orders || 0}</span>
                </div>
              </div>
              <div className="mt-6 rounded-xl border-2 border-black bg-yellow-50 p-4 flex items-start gap-3">
                <Info className="h-4 w-4 text-black shrink-0 mt-0.5" />
                <p className="text-[10px] font-black leading-relaxed text-black/60 uppercase tracking-tight">
                  Device data appears after clicks. Quality score is calculated via conversion integrity.
                </p>
              </div>
            </div>

            <div className="flex h-fit flex-col min-w-0 rounded-2xl border-[3px] border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:p-6 sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <h3 className="mb-6 text-sm font-black uppercase tracking-tight text-black">Quick Insights</h3>
              <div className="flex flex-col gap-4">
                <QuickInsightRow label="Total Clicks" value={formatNumber(kpis.clicks)} subValue="33.3% ↑" data={[30, 45, 35, 50, 48, 65, 80]} color="#10B981" days={days} />
                <QuickInsightRow label="Total Orders" value={formatNumber(kpis.orders)} subValue="12.5% ↑" data={[5, 8, 4, 10, 7, 9, 12]} color="#F59E0B" days={days} />
                <QuickInsightRow label="Conversion Rate" value={`${(kpis.cvr || 0).toFixed(2)}%`} subValue="Stable" data={[2, 3, 2.5, 4, 3.5, 5, 6]} color="#8B5CF6" days={days} />
                <QuickInsightRow label="Total Earnings" value={formatMoney(kpis.commission)} subValue="Trending" data={[20, 40, 15, 60, 30, 70, 90]} color="#EF4444" days={days} />
              </div>
            </div>
            <AffiliateStatusCard
              trackingId={affiliateLinks?.affiliateTag || null}
              totalLinks={affiliateLinks?.totalProducts || 0}
              totalOrders={affiliateLinks?.totalOrders || 0}
            />
          </div>
        </div>

        {/* Removed Row 3 as content is moved up */}
      </div>
    </div>
  )
}
