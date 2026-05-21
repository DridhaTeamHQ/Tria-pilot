'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

const niches = ['Fashion', 'Lifestyle', 'Tech', 'Beauty', 'Fitness', 'Travel', 'Food', 'Gaming']
const audiences = ['Men', 'Women', 'Unisex', 'Kids']
const genders = ['Male', 'Female', 'Other']
const categories = ['Casual', 'Formal', 'Streetwear', 'Vintage', 'Sustainable', 'Luxury']
const badgeOptions = [
  { value: '', label: 'All Badges' },
  { value: 'platinum', label: 'Platinum' },
  { value: 'gold', label: 'Gold' },
  { value: 'silver', label: 'Silver' },
]
const sortOptions = [
  { value: 'followers', label: 'Followers' },
  { value: 'price', label: 'Price per Post' },
  { value: 'engagement', label: 'Engagement Rate' },
  { value: 'badge', label: 'Badge Tier' },
]

export default function InfluencerFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/brand/marketplace?${params.toString()}`)
  }

  return (
    <Card className="sticky top-24">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <Label htmlFor="influencer-filter-niche" className="text-sm font-medium mb-2 block text-zinc-700 dark:text-zinc-300">Niche</Label>
          <select
            id="influencer-filter-niche"
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600"
            value={searchParams.get('niche') || ''}
            onChange={(e) => updateFilter('niche', e.target.value)}
          >
            <option value="">All Niches</option>
            {niches.map((niche) => (
              <option key={niche} value={niche}>
                {niche}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="influencer-filter-audience" className="text-sm font-medium mb-2 block text-zinc-700 dark:text-zinc-300">Audience</Label>
          <select
            id="influencer-filter-audience"
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600"
            value={searchParams.get('audience') || ''}
            onChange={(e) => updateFilter('audience', e.target.value)}
          >
            <option value="">All Audiences</option>
            {audiences.map((audience) => (
              <option key={audience} value={audience}>
                {audience}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="influencer-filter-gender" className="text-sm font-medium mb-2 block text-zinc-700 dark:text-zinc-300">Gender</Label>
          <select
            id="influencer-filter-gender"
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600"
            value={searchParams.get('gender') || ''}
            onChange={(e) => updateFilter('gender', e.target.value)}
          >
            <option value="">All</option>
            {genders.map((gender) => (
              <option key={gender} value={gender}>
                {gender}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="influencer-filter-category" className="text-sm font-medium mb-2 block text-zinc-700 dark:text-zinc-300">Preferred Categories</Label>
          <select
            id="influencer-filter-category"
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600"
            value={searchParams.get('category') || ''}
            onChange={(e) => updateFilter('category', e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="influencer-filter-badge" className="text-sm font-medium mb-2 block text-zinc-700 dark:text-zinc-300">Badge Tier</Label>
          <select
            id="influencer-filter-badge"
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600"
            value={searchParams.get('badge') || ''}
            onChange={(e) => updateFilter('badge', e.target.value)}
          >
            {badgeOptions.map((badge) => (
              <option key={badge.value} value={badge.value}>
                {badge.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="influencer-filter-sort" className="text-sm font-medium mb-2 block text-zinc-700 dark:text-zinc-300">Sort By</Label>
          <select
            id="influencer-filter-sort"
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600"
            value={searchParams.get('sortBy') || 'followers'}
            onChange={(e) => updateFilter('sortBy', e.target.value)}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </CardContent>
    </Card>
  )
}
