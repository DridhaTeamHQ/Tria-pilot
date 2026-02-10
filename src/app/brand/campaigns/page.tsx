'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import CampaignChatbot from '@/components/campaigns/CampaignChatbot'

interface Campaign {
  id: string
  title: string
  brief: string
  status: string
  createdAt: string
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    goals: '',
    targetAudience: '',
    budget: '',
    timeline: '',
  })

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/campaigns')
      const data = await response.json()
      setCampaigns(data)
    } catch (error) {
      toast.error('Failed to fetch campaigns')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          goals: formData.goals.split(',').map((g) => g.trim()),
          budget: formData.budget ? parseFloat(formData.budget) : undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create campaign')
      }

      toast.success('Campaign created successfully!')
      setShowForm(false)
      setFormData({
        title: '',
        goals: '',
        targetAudience: '',
        budget: '',
        timeline: '',
      })
      fetchCampaigns()
    } catch (error) {
      toast.error('Failed to create campaign')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF6EC] pt-24 pb-8 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-black" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDF6EC] pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b-[3px] border-black pb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-black mb-3 tracking-tight">Campaigns</h1>
            <p className="text-lg font-medium text-black/80">
              Manage your marketing campaigns with AI assistance.
            </p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-black text-white border-[3px] border-black hover:bg-[#B4F056] hover:text-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all font-bold text-lg h-14 px-8 shrink-0"
          >
            {showForm ? 'Cancel' : 'Create Campaign'}
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Campaign List */}
          <div className="lg:col-span-2 space-y-6">

            {showForm && (
              <Card className="border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden mb-8">
                <CardHeader className="pb-4 bg-black text-white border-b-[3px] border-black">
                  <CardTitle className="text-xl font-black uppercase tracking-wide">Create New Campaign</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-sm font-bold text-black uppercase tracking-wide">Campaign Title</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        className="w-full h-12 border-2 border-black font-medium focus-visible:ring-0 focus-visible:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                        placeholder="e.g., Summer Collection Launch"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="goals" className="text-sm font-bold text-black uppercase tracking-wide">Goals (comma-separated)</Label>
                      <Input
                        id="goals"
                        value={formData.goals}
                        onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                        className="w-full h-12 border-2 border-black font-medium focus-visible:ring-0 focus-visible:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                        placeholder="e.g., Brand awareness, Sales increase"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="targetAudience" className="text-sm font-bold text-black uppercase tracking-wide">Target Audience</Label>
                      <Input
                        id="targetAudience"
                        value={formData.targetAudience}
                        onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                        className="w-full h-12 border-2 border-black font-medium focus-visible:ring-0 focus-visible:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                        placeholder="e.g., Women 25-35, Fashion enthusiasts"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="budget" className="text-sm font-bold text-black uppercase tracking-wide">Budget (INR)</Label>
                        <Input
                          id="budget"
                          type="number"
                          value={formData.budget}
                          onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                          className="w-full h-12 border-2 border-black font-medium focus-visible:ring-0 focus-visible:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                          placeholder="50000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="timeline" className="text-sm font-bold text-black uppercase tracking-wide">Timeline</Label>
                        <Input
                          id="timeline"
                          value={formData.timeline}
                          onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                          className="w-full h-12 border-2 border-black font-medium focus-visible:ring-0 focus-visible:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                          placeholder="e.g., 2 months, Q2 2024"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-14 mt-4 bg-[#FF8C69] hover:bg-[#FFD93D] text-black border-[3px] border-black font-black text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all">
                      Create Campaign
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {campaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 bg-white rounded-xl border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">
                <div className="w-20 h-20 bg-[#6EC1E4] rounded-full border-[3px] border-black flex items-center justify-center mb-6">
                  <span className="text-4xl">📊</span>
                </div>
                <h3 className="text-2xl font-black text-black mb-3">No campaigns yet</h3>
                <p className="text-black/60 font-medium max-w-md mb-8">
                  Create your first campaign to start working with influencers and track your marketing goals.
                </p>
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-[#B4F056] text-black border-[3px] border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all font-bold px-8 py-6 text-lg"
                >
                  Start First Campaign
                </Button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {campaigns.map((campaign) => (
                  <Card key={campaign.id} className="border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all bg-white group cursor-pointer">
                    <CardHeader className="pb-3 border-b-2 border-black/10">
                      <div className="flex justify-between items-start gap-4">
                        <CardTitle className="text-xl font-black">{campaign.title}</CardTitle>
                        <span className="bg-[#B4F056] px-3 py-1 text-xs font-black border-2 border-black uppercase tracking-wider rounded-md shrink-0">
                          {campaign.status}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <p className="text-sm font-medium text-black/70 mb-6 line-clamp-3">{campaign.brief || "No brief available."}</p>
                      <div className="flex items-center justify-between text-xs font-bold text-black/50 uppercase tracking-wide">
                        <span>Created: {new Date(campaign.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}</span>
                        <span className="group-hover:translate-x-1 transition-transform text-black flex items-center gap-1">View Details →</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* AI Chatbot */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <CampaignChatbot />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

