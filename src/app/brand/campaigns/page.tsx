'use client'

import Link from 'next/link'
import { useCampaigns } from '@/lib/hooks/useCampaigns'
import CampaignChatbot from '@/components/campaigns/CampaignChatbot'
import { Loader2, Plus } from 'lucide-react'

export default function CampaignsPage() {
  const { data: campaigns = [], isLoading, error } = useCampaigns()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream pt-24 pb-8">
        <div className="container mx-auto px-4 max-w-7xl flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-black" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream pt-24 pb-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Campaigns</h1>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm">
              Manage your marketing campaigns with AI assistance
            </p>
          </div>
          <Link
            href="/brand/campaigns/new"
            className="inline-flex items-center gap-2 px-4 py-3 bg-[#B4F056] border-[3px] border-black font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all shrink-0"
          >
            <Plus className="w-5 h-5" strokeWidth={2.5} />
            Create Campaign
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 text-red-800 font-medium">
            Failed to load campaigns. Please refresh the page.
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-6">
            {campaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-lg font-black text-black mb-2">No campaigns yet</h3>
                <p className="text-black/60 text-center max-w-md mb-6">
                  Create your first campaign to set goals, audience, creative, and budget.
                </p>
                <Link
                  href="/brand/campaigns/new"
                  className="inline-flex items-center gap-2 px-4 py-3 bg-[#B4F056] border-2 border-black font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                >
                  <Plus className="w-5 h-5" />
                  Create Campaign
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {campaigns.map((campaign) => {
                  const created = campaign.created_at ?? (campaign as { createdAt?: string }).createdAt
                  return (
                    <div
                      key={campaign.id}
                      className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-shadow"
                    >
                      <h3 className="text-lg font-black text-black mb-1">{campaign.title}</h3>
                      <p className="text-xs text-black/60 mb-3">
                        Status: <span className="font-bold capitalize">{campaign.status}</span>
                        {campaign.goal && (
                          <span className="ml-2">· {String(campaign.goal)}</span>
                        )}
                      </p>
                      {campaign.brief && (
                        <p className="text-sm text-black/70 mb-4 line-clamp-3">{campaign.brief}</p>
                      )}
                      <p className="text-xs text-black/50">
                        Created:{' '}
                        {created
                          ? new Date(created).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : '—'}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 min-h-[560px] flex">
              <CampaignChatbot />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
