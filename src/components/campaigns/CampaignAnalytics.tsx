'use client'

import { useMemo } from 'react'
import {
    DollarSign,
    Target,
    BarChart3,
    MousePointer,
    TrendingUp,
    TrendingDown,
    Minus,
} from 'lucide-react'
import type { Campaign } from '@/lib/campaigns/types'

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TYPES
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

interface AnalyticsData {
    totalSpend: number
    totalImpressions: number
    totalClicks: number
    totalConversions: number
    activeCampaigns: number
    totalCampaigns: number
    avgCTR: number
    avgCPC: number
    statusBreakdown: Record<string, number>
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   COMPUTE ANALYTICS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function computeAnalytics(campaigns: Campaign[]): AnalyticsData {
    const totalSpend = campaigns.reduce((s, c) => s + (c.spend ?? 0), 0)
    const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions ?? 0), 0)
    const totalClicks = campaigns.reduce((s, c) => s + (c.clicks ?? 0), 0)
    const totalConversions = campaigns.reduce((s, c) => s + (c.conversions ?? 0), 0)
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length
    const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
    const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0

    const statusBreakdown: Record<string, number> = {}
    for (const c of campaigns) {
        const status = c.status || 'draft'
        statusBreakdown[status] = (statusBreakdown[status] || 0) + 1
    }

    return {
        totalSpend,
        totalImpressions,
        totalClicks,
        totalConversions,
        activeCampaigns,
        totalCampaigns: campaigns.length,
        avgCTR,
        avgCPC,
        statusBreakdown,
    }
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MINI SPARKLINE (SVG)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function MiniSparkline({ data, color = '#B4F056', width = 72, height = 24 }: {
    data: number[]
    color?: string
    width?: number
    height?: number
}) {
    if (data.length < 2) return null

    const max = Math.max(...data, 1)
    const min = Math.min(...data, 0)
    const range = max - min || 1
    const padding = 2

    const points = data.map((val, i) => {
        const x = padding + (i / (data.length - 1)) * (width - padding * 2)
        const y = padding + (1 - (val - min) / range) * (height - padding * 2)
        return `${x},${y}`
    }).join(' ')

    const trend = data[data.length - 1] >= data[0] ? 'up' : 'down'
    const gradientId = `spark-${color.replace('#', '')}-${Math.random().toString(36).slice(2, 6)}`

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={trend === 'up' ? color : '#FF6B6B'} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={trend === 'up' ? color : '#FF6B6B'} stopOpacity={0} />
                </linearGradient>
            </defs>
            {/* Area fill */}
            <polygon
                points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
                fill={`url(#${gradientId})`}
            />
            {/* Line */}
            <polyline
                points={points}
                fill="none"
                stroke={trend === 'up' ? color : '#FF6B6B'}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {/* End dot */}
            {(() => {
                const lastPoint = points.split(' ').pop()?.split(',')
                if (!lastPoint) return null
                return (
                    <circle
                        cx={Number(lastPoint[0])}
                        cy={Number(lastPoint[1])}
                        r={2}
                        fill={trend === 'up' ? color : '#FF6B6B'}
                    />
                )
            })()}
        </svg>
    )
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   STATUS RING CHART (SVG)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const STATUS_COLORS: Record<string, string> = {
    active: '#B4F056',
    draft: '#FFD93D',
    paused: '#94A3B8',
    completed: '#1a1a1a',
}

const STATUS_LABELS: Record<string, string> = {
    active: 'Active',
    draft: 'Draft',
    paused: 'Paused',
    completed: 'Completed',
}

function StatusRingChart({ breakdown, total }: { breakdown: Record<string, number>; total: number }) {
    if (total === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[160px] bg-black/5 rounded-2xl border-[3px] border-dashed border-black/10">
                <p className="text-xs font-black uppercase tracking-widest text-black/20">No active data</p>
            </div>
        )
    }

    const size = 120
    const strokeWidth = 14
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    let currentOffset = 0

    const segments = Object.entries(breakdown).map(([status, count]) => {
        const percentage = count / total
        const dashLength = percentage * circumference
        const segment = {
            status,
            count,
            percentage,
            dashArray: `${dashLength} ${circumference - dashLength}`,
            dashOffset: -currentOffset,
            color: STATUS_COLORS[status] || '#E5E7EB',
        }
        currentOffset += dashLength
        return segment
    })

    return (
        <div className="flex flex-col sm:flex-row items-center gap-8 py-2">
            <div className="relative shrink-0 group">
                <div className="absolute inset-[-8px] border-[3px] border-black/5 rounded-full scale-95 group-hover:scale-100 transition-transform duration-500" />
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-[4px_4px_0px_rgba(0,0,0,0.1)]">
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="rgba(0,0,0,0.05)"
                        strokeWidth={strokeWidth}
                    />
                    {segments.map((seg) => (
                        <circle
                            key={seg.status}
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="none"
                            stroke={seg.color}
                            strokeWidth={strokeWidth}
                            strokeDasharray={seg.dashArray}
                            strokeDashoffset={seg.dashOffset}
                            strokeLinecap="round"
                            transform={`rotate(-90 ${size / 2} ${size / 2})`}
                            className="transition-all duration-1000 ease-out"
                        />
                    ))}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-3xl font-black leading-none text-black tracking-tighter">{total}</p>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/30">Total</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full space-y-3">
                {segments.map((seg) => (
                    <div key={seg.status} className="flex items-center justify-between p-3 bg-white border-[3px] border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all cursor-default group">
                        <div className="flex items-center gap-3">
                            <div 
                                className="w-4 h-4 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:scale-110 transition-transform" 
                                style={{ backgroundColor: seg.color }}
                            />
                            <span className="text-[11px] font-black uppercase tracking-widest text-black">
                                {STATUS_LABELS[seg.status] || seg.status}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-black/30">{Math.round(seg.percentage * 100)}%</span>
                            <span className="text-sm font-black tabular-nums bg-black text-white px-2 py-0.5 rounded-lg">
                                {seg.count}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ANIMATED NUMBER
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function formatNumber(value: number, prefix = '', suffix = '', decimals = 0): string {
    if (value >= 1_000_000) return `${prefix}${(value / 1_000_000).toFixed(1)}M${suffix}`
    if (value >= 1_000) return `${prefix}${(value / 1_000).toFixed(1)}K${suffix}`
    return `${prefix}${value.toFixed(decimals)}${suffix}`
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   KPI CARD
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function KPICard({ icon: Icon, label, value, trend, sparkData, color, delay = 0 }: {
    icon: React.ElementType
    label: string
    value: string
    trend?: 'up' | 'down' | 'flat'
    sparkData?: number[]
    color: string
    delay?: number
}) {
    return (
        <div
            className="bg-white border-[3px] border-black rounded-[24px] p-5 hover:bg-black/5 transition-all animate-slideUp group shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="flex items-start justify-between mb-4">
                <div
                    className="w-11 h-11 rounded-xl border-[3px] border-black flex items-center justify-center transition-transform group-hover:scale-110 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                    style={{ backgroundColor: `${color}40` }}
                >
                    <Icon className="w-5 h-5 text-black" strokeWidth={3} />
                </div>
                {sparkData && sparkData.length > 1 && (
                    <div className="pt-2">
                        <MiniSparkline data={sparkData} color={color} />
                    </div>
                )}
            </div>
            <p className="text-2xl font-black text-black tracking-tighter leading-none mb-2">{value}</p>
            <div className="flex items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-black/40">{label}</p>
                {trend && (
                    <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg border-2 border-black text-[10px] font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${trend === 'up' ? 'bg-[#B4F056]' : trend === 'down' ? 'bg-[#FF6B6B]' : 'bg-white'
                        }`}>
                        {trend === 'up' && <TrendingUp className="w-3 h-3" strokeWidth={3} />}
                        {trend === 'down' && <TrendingDown className="w-3 h-3" strokeWidth={3} />}
                        {trend === 'flat' && <Minus className="w-3 h-3" strokeWidth={3} />}
                    </span>
                )}
            </div>
        </div>
    )
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   GENERATE MOCK SPARKLINE DATA
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function generateSparkData(baseLine: number, variance = 0.3, points = 7): number[] {
    const data: number[] = []
    let current = baseLine * (1 - variance * 0.5)
    for (let i = 0; i < points; i++) {
        const change = (Math.random() - 0.4) * baseLine * variance
        current = Math.max(0, current + change)
        data.push(current)
    }
    // Make last point close to the actual value
    data[data.length - 1] = baseLine
    return data
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MAIN COMPONENT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export default function CampaignAnalytics({ campaigns }: { campaigns: Campaign[] }) {
    const analytics = useMemo(() => computeAnalytics(campaigns), [campaigns])

    // Generate sparkline data based on real values (cosmetic trend lines)
    const sparklines = useMemo(() => ({
        spend: generateSparkData(analytics.totalSpend),
        impressions: generateSparkData(analytics.totalImpressions),
        ctr: generateSparkData(analytics.avgCTR, 0.2),
        conversions: generateSparkData(analytics.totalConversions),
    }), [analytics])

    if (campaigns.length === 0) return null

    return (
        <div className="space-y-4 animate-fadeIn">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPICard
                    icon={DollarSign}
                    label="Total Spend"
                    value={formatNumber(analytics.totalSpend, '₹')}
                    trend={analytics.totalSpend > 0 ? 'up' : 'flat'}
                    sparkData={sparklines.spend}
                    color="#FF8C69"
                    delay={0}
                />
                <KPICard
                    icon={BarChart3}
                    label="Impressions"
                    value={formatNumber(analytics.totalImpressions)}
                    trend={analytics.totalImpressions > 0 ? 'up' : 'flat'}
                    sparkData={sparklines.impressions}
                    color="#A78BFA"
                    delay={50}
                />
                <KPICard
                    icon={MousePointer}
                    label="Avg CTR"
                    value={`${analytics.avgCTR.toFixed(2)}%`}
                    trend={analytics.avgCTR > 2 ? 'up' : analytics.avgCTR > 0 ? 'flat' : 'flat'}
                    sparkData={sparklines.ctr}
                    color="#34D399"
                    delay={100}
                />
                <KPICard
                    icon={Target}
                    label="Conversions"
                    value={formatNumber(analytics.totalConversions)}
                    trend={analytics.totalConversions > 0 ? 'up' : 'flat'}
                    sparkData={sparklines.conversions}
                    color="#B4F056"
                    delay={150}
                />
            </div>

            {/* Status Distribution + Top Performer */}
            <div className="grid md:grid-cols-2 gap-3">
                {/* Status Ring */}
                <div className="bg-white border-[3px] border-black rounded-[32px] p-6 animate-slideUp shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" style={{ animationDelay: '200ms' }}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-5 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-black" />
                        Campaign Status
                    </p>
                    <StatusRingChart
                        breakdown={analytics.statusBreakdown}
                        total={analytics.totalCampaigns}
                    />
                </div>

                {/* Quick Stats */}
                <div className="bg-white border-[3px] border-black rounded-[32px] p-6 animate-slideUp shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" style={{ animationDelay: '250ms' }}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-5 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#B4F056]" />
                        Performance Snapshot
                    </p>
                    <div className="space-y-3">
                        {[
                            { label: 'Active Campaigns', value: analytics.activeCampaigns, color: '#B4F056' },
                            { label: 'Avg Cost/Click', value: analytics.avgCPC > 0 ? `₹${analytics.avgCPC.toFixed(2)}` : '—', color: '#FFD93D' },
                            { label: 'Total Clicks', value: analytics.totalClicks.toLocaleString(), color: '#A78BFA' }
                        ].map((stat, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-[#FAFAF8] border-2 border-black rounded-2xl group/stat hover:bg-white transition-colors">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stat.color }} />
                                    <span className="text-[10px] font-black uppercase tracking-wider text-black/50">{stat.label}</span>
                                </div>
                                <span className="text-xs font-black text-black bg-white border-2 border-black px-2 py-1 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-none group-hover:translate-x-[1px] group-hover:translate-y-[1px] transition-all">
                                    {stat.value}
                                </span>
                            </div>
                        ))}
                    </div>
                        {(() => {
                            const best = campaigns.reduce((top, c) =>
                                (c.impressions ?? 0) > (top?.impressions ?? 0) ? c : top, campaigns[0])
                            if (!best || (best.impressions ?? 0) === 0) return null
                            return (
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-xs font-black uppercase tracking-wider text-black/50 shrink-0">Top Performer</span>
                                    <span className="text-xs font-black text-black truncate bg-[#FFD93D] px-2 py-1 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{best.title}</span>
                                </div>
                            )
                        })()}
                    </div>
            </div>
        </div>
    )
}
