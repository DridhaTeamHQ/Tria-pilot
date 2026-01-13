'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
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
      <div className="min-h-screen bg-cream pt-24 pb-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center py-12">Loading...</div>
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
          <Button onClick={() => setShowForm(!showForm)} className="shrink-0">
            {showForm ? 'Cancel' : 'Create Campaign'}
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Campaign List */}
          <div className="lg:col-span-2 space-y-6">

            {showForm && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold">Create New Campaign</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Campaign Title</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        className="w-full"
                        placeholder="e.g., Summer Collection Launch"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="goals" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Goals (comma-separated)</Label>
                      <Input
                        id="goals"
                        value={formData.goals}
                        onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                        className="w-full"
                        placeholder="e.g., Brand awareness, Sales increase"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="targetAudience" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Target Audience</Label>
                      <Input
                        id="targetAudience"
                        value={formData.targetAudience}
                        onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                        className="w-full"
                        placeholder="e.g., Women 25-35, Fashion enthusiasts"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="budget" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Budget (INR)</Label>
                      <Input
                        id="budget"
                        type="number"
                        value={formData.budget}
                        onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                        className="w-full"
                        placeholder="50000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timeline" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Timeline</Label>
                      <Input
                        id="timeline"
                        value={formData.timeline}
                        onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                        className="w-full"
                        placeholder="e.g., 2 months, Q2 2024"
                      />
                    </div>
                    <Button type="submit" className="w-full mt-4">Create Campaign</Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {campaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">No campaigns yet</h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-center max-w-md">
                  Create your first campaign to start working with influencers and track your marketing goals.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {campaigns.map((campaign) => (
                  <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg mb-1">{campaign.title}</CardTitle>
                      <CardDescription className="text-xs">
                        Status: <span className="font-medium capitalize">{campaign.status}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 line-clamp-3">{campaign.brief}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-500">
                        Created: {new Date(campaign.createdAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
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

