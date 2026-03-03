'use client'

import Link from 'next/link'
import { useCampaigns } from '@/lib/hooks/useCampaigns'
import { Loader2, Sparkles } from 'lucide-react'

export default function CampaignsPage() {
  const { data: campaigns = [], isLoading, error } = useCampaigns()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9F8F4] pt-24 pb-8">
        <div className="container mx-auto px-4 max-w-7xl flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-black" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F9F8F4] pt-8 pb-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-black mb-1">Campaigns</h1>
            <p className="text-black/50 text-sm font-medium">
              AI-powered campaign strategy & management
            </p>
          </div>
          <Link
            href="/brand/campaigns/new"
            className="inline-flex items-center gap-2 px-5 py-3 bg-[#B4F056] border-[3px] border-black font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all shrink-0"
          >
            <Sparkles className="w-5 h-5" strokeWidth={2.5} />
            Launch AI Strategist
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 text-red-800 font-medium">
            Failed to load campaigns. Please refresh the page.
          </div>
        )}

        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="text-5xl mb-4">🚀</div>
            <h3 className="text-xl font-black text-black mb-2">No campaigns yet</h3>
            <p className="text-black/50 text-center max-w-md mb-8 font-medium">
              Launch the AI Strategist to create your first campaign. It&apos;ll ask strategic
              questions, research your market, generate content ideas, write scripts, and
              auto-create your campaign.
            </p>
            <Link
              href="/brand/campaigns/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#B4F056] border-[3px] border-black font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all"
            >
              <Sparkles className="w-5 h-5" strokeWidth={2.5} />
              Launch AI Strategist
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => {
              const created = campaign.created_at ?? (campaign as { createdAt?: string }).createdAt
              const strategy = campaign.strategy as Record<string, unknown> | null

              return (
                <Link
                  key={campaign.id}
                  href={`/brand/campaigns/${campaign.id}`}
                  className="bg-white border border-black/10 rounded-2xl shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all block"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-lg font-black text-black leading-tight">{campaign.title}</h3>
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 border-2 border-black shrink-0 ${campaign.status === 'active'
                        ? 'bg-[#B4F056]'
                        : campaign.status === 'draft'
                          ? 'bg-[#FFD93D]'
                          : 'bg-gray-100'
                        }`}
                    >
                      {campaign.status}
                    </span>
                  </div>

                  {campaign.goal && (
                    <p className="text-xs font-bold text-black/40 uppercase tracking-wider mb-2">
                      {String(campaign.goal)}
                    </p>
                  )}

                  {campaign.brief && (
                    <p className="text-sm text-black/60 font-medium mb-3 line-clamp-3">
                      {campaign.brief}
                    </p>
                  )}

                  {/* Strategy tags */}
                  {(() => {
                    const angles = strategy?.content_angles
                    if (!angles || !Array.isArray(angles)) return null
                    return (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {(angles as string[]).slice(0, 3).map((angle, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-bold bg-[#FFD93D]/40 border border-black/10 px-1.5 py-0.5"
                          >
                            {typeof angle === 'string' ? angle : (angle as { angle?: string }).angle ?? ''}
                          </span>
                        ))}
                      </div>
                    )
                  })()}

                  {/* Metrics */}
                  {((campaign.impressions ?? 0) > 0 || (campaign.spend ?? 0) > 0) && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center">
                        <p className="text-xs font-bold text-black/40">Impressions</p>
                        <p className="text-sm font-black">{(campaign.impressions ?? 0).toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-black/40">Clicks</p>
                        <p className="text-sm font-black">{(campaign.clicks ?? 0).toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-black/40">Spend</p>
                        <p className="text-sm font-black">₹{(campaign.spend ?? 0).toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-black/30 font-bold uppercase">
                    {created
                      ? new Date(created).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                      : '—'}
                  </p>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
