'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Target,
  Users,
  Sparkles,
  ShoppingBag,
  Package,
  ArrowRight,
  Search,
  Plus,
  Loader2
} from 'lucide-react'
import { createClient } from '@/lib/auth-client'

// Animation variants (consistent with Influencer dashboard)
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24
    }
  }
}

export default function BrandDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [brandName, setBrandName] = useState('Brand')
  const [stats, setStats] = useState({
    activeCampaigns: 0,
    totalInfluencers: 0,
    adsGenerated: 0,
    products: 0
  })

  // Fetch dashboard data
  useEffect(() => {
    async function loadDashboard() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return

        // Fetch Brand Name
        const { data: profile } = await supabase
          .from('profiles')
          .select('brand_data')
          .eq('id', user.id)
          .single()

        if (profile?.brand_data) {
          setBrandName((profile.brand_data as any).companyName || 'Brand')
        }

        // Fetch Stats (Mock for now, would be real counts)
        // In production, these should be parallel Realtime/Count queries
        setStats({
          activeCampaigns: 3,
          totalInfluencers: 12,
          adsGenerated: 45,
          products: 8
        })
      } catch (error) {
        console.error('Dashboard load error:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF6EC]">
        <Loader2 className="w-12 h-12 animate-spin text-black" />
      </div>
    )
  }

  const statCards = [
    { label: 'Active Campaigns', value: stats.activeCampaigns, icon: Target, color: 'bg-[#FFD93D]' },
    { label: 'Total Influencers', value: stats.totalInfluencers, icon: Users, color: 'bg-[#FF8C69]' },
    { label: 'Ads Generated', value: stats.adsGenerated, icon: Sparkles, color: 'bg-[#B4F056]' },
    { label: 'Products', value: stats.products, icon: Package, color: 'bg-[#6EC1E4]' },
  ]

  const quickActions = [
    {
      title: 'New Campaign',
      description: 'Launch a new influencer marketing campaign',
      icon: Target,
      href: '/brand/campaigns/new',
      primary: true,
      color: 'bg-[#FF8C69]'
    },
    {
      title: 'Generate Ad',
      description: 'Create AI-powered ad creatives',
      icon: Sparkles,
      href: '/brand/ads',
      primary: false
    },
    {
      title: 'Find Influencers',
      description: 'Discover creators for your brand',
      icon: Search,
      href: '/brand/influencers',
      primary: false
    },
    {
      title: 'Add Product',
      description: 'Upload new products to catalog',
      icon: ShoppingBag,
      href: '/brand/products/new',
      primary: false
    },
  ]

  return (
    <div className="min-h-screen bg-[#FDF6EC] pb-16">
      <div className="container mx-auto px-4 md:px-6">

        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 border-b-[3px] border-black pb-8"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-6xl font-black text-black mb-2 tracking-tight">
                Hello, {brandName}
              </h1>
              <p className="text-lg font-bold text-black/70">
                Manage your campaigns, ads, and partnerships.
              </p>
            </div>
            <Link
              href="/brand/campaigns/new"
              className="bg-black text-white px-8 py-3 rounded-xl font-bold border-[3px] border-black hover:bg-[#B4F056] hover:text-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" strokeWidth={3} />
              Create Campaign
            </Link>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
        >
          {statCards.map((stat, i) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.label}
                variants={cardVariants}
                whileHover={{ y: -4 }}
                className="bg-white rounded-xl p-6 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all relative overflow-hidden group"
              >
                <div className={`w-12 h-12 rounded-lg ${stat.color} border-[2px] border-black flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6 text-black" strokeWidth={2.5} />
                </div>
                <p className="text-4xl md:text-5xl font-black text-black mb-1">{stat.value}</p>
                <p className="text-xs uppercase font-bold tracking-wider text-black/70">{stat.label}</p>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-black text-black mb-6 uppercase tracking-tight flex items-center gap-2">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.title}
                  href={action.href}
                  className="block h-full"
                >
                  <motion.div
                    whileHover={{ y: -4, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`h-full p-6 rounded-xl border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col justify-between ${action.primary ? 'bg-[#FF8C69]' : 'bg-white'
                      }`}
                  >
                    <div>
                      <div className={`w-12 h-12 rounded-lg ${action.primary ? 'bg-white' : 'bg-gray-100'} border-[2px] border-black flex items-center justify-center mb-4`}>
                        <Icon className="w-6 h-6 text-black" strokeWidth={2.5} />
                      </div>
                      <h3 className="text-lg font-bold text-black mb-1">{action.title}</h3>
                      <p className="text-sm font-medium text-black/70 leading-snug mb-8">
                        {action.description}
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <ArrowRight className="w-5 h-5 text-black" strokeWidth={3} />
                    </div>
                  </motion.div>
                </Link>
              )
            })}
          </div>
        </motion.div>

        {/* Recent Activity Section Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-black uppercase tracking-tight">Recent Campaigns</h2>
            <Link href="/brand/campaigns" className="text-sm font-bold underline hover:no-underline">View All</Link>
          </div>

          <div className="bg-white rounded-xl border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-12 text-center">
            <div className="w-16 h-16 bg-[#B4F056] rounded-lg border-[3px] border-black flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-black" strokeWidth={2} />
            </div>
            <h3 className="text-lg font-bold mb-2">No Active Campaigns</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">Get started by launching your first influencer campaign to reach new audiences.</p>
            <Link
              href="/brand/campaigns/new"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-lg font-bold hover:bg-[#B4F056] hover:text-black border-[2px] border-black transition-all"
            >
              <Plus className="w-4 h-4" />
              Launch Campaign
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
