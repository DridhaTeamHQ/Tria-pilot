'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  TrendingUp,
  Package,
  MousePointerClick,
  BarChart3,
} from 'lucide-react'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'

interface AnalyticsData {
  totalClicks: number
  totalProducts: number
  averageClicks: number
  products: Array<{
    productId: string
    productName: string
    productImage?: string
    maskedUrl: string
    linkCode: string
    clickCount: number
    uniqueClicks: number
    lastClickedAt: string | null
    createdAt: string
  }>
}

export default function InfluencerAnalyticsPage() {
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  const { data: analytics, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ['link-analytics'],
    queryFn: async () => {
      const res = await fetch('/api/links/analytics', {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to fetch analytics')
      return res.json()
    },
    staleTime: 30 * 1000, // 30 seconds
  })

  const handleCopyLink = async (maskedUrl: string) => {
    try {
      await navigator.clipboard.writeText(maskedUrl)
      setCopiedLink(maskedUrl)
      toast.success('Link copied to clipboard!')
      setTimeout(() => setCopiedLink(null), 2000)
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream to-white pt-24 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-charcoal/10 border-t-charcoal/60 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-charcoal/50">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream to-white pt-24 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Failed to load analytics</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-charcoal text-cream rounded-full"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream via-cream to-white pt-24 pb-16">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <Link
            href="/influencer/dashboard"
            className="group inline-flex items-center gap-2 text-sm text-charcoal/50 hover:text-charcoal mb-6 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>

          <h1 className="text-4xl sm:text-5xl font-serif text-charcoal mb-2">
            Link <span className="italic text-charcoal/70">Analytics</span>
          </h1>
          <p className="text-charcoal/50">
            Track clicks on your shared product links
          </p>
        </motion.div>

        {/* Summary Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-6 border border-charcoal/5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-peach/10 flex items-center justify-center">
                  <MousePointerClick className="w-6 h-6 text-peach" />
                </div>
              </div>
              <div className="text-3xl font-serif text-charcoal mb-1">
                {analytics.totalClicks.toLocaleString()}
              </div>
              <div className="text-sm text-charcoal/50">Total Clicks</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 border border-charcoal/5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-charcoal/10 flex items-center justify-center">
                  <Package className="w-6 h-6 text-charcoal" />
                </div>
              </div>
              <div className="text-3xl font-serif text-charcoal mb-1">
                {analytics.totalProducts}
              </div>
              <div className="text-sm text-charcoal/50">Products Shared</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl p-6 border border-charcoal/5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
              <div className="text-3xl font-serif text-charcoal mb-1">
                {analytics.averageClicks.toFixed(1)}
              </div>
              <div className="text-sm text-charcoal/50">Avg Clicks/Product</div>
            </motion.div>
          </div>
        )}

        {/* Products List */}
        {analytics && analytics.products.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-sm rounded-3xl border border-charcoal/5 p-12 text-center"
          >
            <BarChart3 className="w-16 h-16 text-charcoal/15 mx-auto mb-4" />
            <h3 className="text-xl font-serif text-charcoal mb-2">
              No links yet
            </h3>
            <p className="text-charcoal/50 mb-6">
              Start sharing products to track clicks
            </p>
            <Link
              href="/influencer/try-on"
              className="inline-flex items-center gap-2 px-6 py-3 bg-charcoal text-cream rounded-full font-medium"
            >
              Create Try-On
            </Link>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-3xl border border-charcoal/5 shadow-sm overflow-hidden"
          >
            <div className="p-6 border-b border-charcoal/5">
              <h2 className="text-xl font-serif text-charcoal">
                Product Links
              </h2>
            </div>

            <div className="divide-y divide-charcoal/5">
              {analytics?.products.map((product, index) => (
                <motion.div
                  key={product.productId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                  className="p-6 hover:bg-cream/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    {/* Product Image */}
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-cream flex-shrink-0">
                      {product.productImage ? (
                        <img
                          src={product.productImage}
                          alt={product.productName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-charcoal/20" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-charcoal mb-1 truncate">
                        {product.productName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-charcoal/50 mb-2">
                        <span className="flex items-center gap-1">
                          <MousePointerClick className="w-3 h-3" />
                          {product.clickCount} clicks
                        </span>
                        <span>{product.uniqueClicks} unique</span>
                        {product.lastClickedAt && (
                          <span>
                            Last: {new Date(product.lastClickedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <code className="text-xs bg-cream px-2 py-1 rounded text-charcoal/70 font-mono">
                          {product.maskedUrl}
                        </code>
                        <button
                          onClick={() => handleCopyLink(product.maskedUrl)}
                          className="p-1.5 hover:bg-charcoal/5 rounded transition-colors"
                          title="Copy link"
                        >
                          {copiedLink === product.maskedUrl ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-charcoal/50" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <a
                        href={product.maskedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-charcoal/5 rounded-lg transition-colors"
                        title="Open link"
                      >
                        <ExternalLink className="w-4 h-4 text-charcoal/50" />
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

