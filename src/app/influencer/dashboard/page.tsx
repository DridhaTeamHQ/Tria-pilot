import { createClient } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Camera, ShoppingBag, Users, TrendingUp, Star, ArrowRight, Sparkles } from 'lucide-react'
import { ImageViewer } from '@/components/image-viewer'

export default async function InfluencerDashboard() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  // Optimized query - use select instead of include, parallel queries for better performance
  const [user, generationJobs, portfolio] = await Promise.all([
    prisma.user.findUnique({
      where: { email: authUser.email!.toLowerCase().trim() },
      select: {
        id: true,
        name: true,
        role: true,
        influencerProfile: {
          select: {
            id: true,
            bio: true,
          },
        },
      },
    }),
    prisma.generationJob.findMany({
      where: {
        user: {
          email: authUser.email!.toLowerCase().trim(),
        },
      },
      select: {
        id: true,
        status: true,
        outputImagePath: true,
        createdAt: true,
      },
      take: 6,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.portfolio.findMany({
      where: {
        user: {
          email: authUser.email!.toLowerCase().trim(),
        },
      },
      select: {
        id: true,
        imagePath: true,
        createdAt: true,
      },
      take: 6,
      orderBy: { createdAt: 'desc' },
    }),
  ])

  if (!user || user.role !== 'INFLUENCER') {
    redirect('/')
  }

  const stats = [
    { label: 'Try-Ons Generated', value: generationJobs.length, icon: Sparkles, color: 'bg-peach/20 text-orange-600' },
    { label: 'Portfolio Items', value: portfolio.length, icon: Camera, color: 'bg-blue-100 text-blue-600' },
    { label: 'Collaborations', value: 0, icon: Users, color: 'bg-green-100 text-green-600' },
    { label: 'Profile Views', value: 0, icon: TrendingUp, color: 'bg-purple-100 text-purple-600' },
  ]

  const quickActions = [
    {
      title: 'Try-On Studio',
      description: 'Create stunning virtual try-ons with AI',
      icon: Camera,
      href: '/influencer/try-on',
      color: 'from-peach to-orange-300',
      primary: true,
    },
    {
      title: 'Browse Marketplace',
      description: 'Discover products from top brands',
      icon: ShoppingBag,
      href: '/marketplace',
      color: 'from-blue-400 to-indigo-400',
    },
    {
      title: 'View Portfolio',
      description: 'Manage your creative portfolio',
      icon: Star,
      href: '/profile',
      color: 'from-purple-400 to-pink-400',
    },
    {
      title: 'Collaborations',
      description: 'Check brand collaboration requests',
      icon: Users,
      href: '/influencer/collaborations',
      color: 'from-green-400 to-emerald-400',
    },
  ]

  return (
    <div className="min-h-screen bg-cream pt-24">
      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-serif text-charcoal mb-2">
            Welcome back, <span className="italic">{user.name || 'Creator'}</span>
          </h1>
          <p className="text-charcoal/60">
            Here&apos;s what&apos;s happening with your account today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className="bg-white rounded-2xl p-6 border border-subtle"
              >
                <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6" />
                </div>
                <p className="text-3xl font-serif font-bold text-charcoal mb-1">{stat.value}</p>
                <p className="text-sm text-charcoal/60">{stat.label}</p>
              </div>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div className="mb-12">
          <h2 className="text-2xl font-serif text-charcoal mb-6">Quick Actions</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`group relative overflow-hidden rounded-2xl p-6 transition-all hover:scale-[1.02] ${action.primary
                    ? 'bg-gradient-to-br ' + action.color + ' text-charcoal'
                    : 'bg-white border border-subtle text-charcoal hover:border-charcoal/20'
                    }`}
                >
                  <div className={`w-12 h-12 rounded-xl ${action.primary ? 'bg-white/30' : 'bg-cream'} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold mb-1">{action.title}</h3>
                  <p className={`text-sm ${action.primary ? 'text-charcoal/80' : 'text-charcoal/60'}`}>
                    {action.description}
                  </p>
                  <ArrowRight className="absolute bottom-6 right-6 w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              )
            })}
          </div>
        </div>

        {/* Recent Generations */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-serif text-charcoal">Recent Generations</h2>
            <Link
              href="/influencer/generations"
              className="text-sm text-charcoal/60 hover:text-charcoal flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {generationJobs.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {generationJobs.map((job: any) => (
                <div
                  key={job.id}
                  className="bg-white rounded-2xl overflow-hidden border border-subtle group hover:border-charcoal/20 transition-all"
                >
                  {job.outputImagePath ? (
                    <div className="aspect-[3/4] overflow-hidden">
                      <ImageViewer
                        src={job.outputImagePath}
                        alt={`Generated try-on ${job.id.slice(0, 8)}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[3/4] bg-cream flex items-center justify-center">
                      <Sparkles className="w-12 h-12 text-charcoal/20" />
                    </div>
                  )}
                  <div className="p-4">
                    <p className="text-sm text-charcoal/60">Generation #{job.id.slice(0, 8)}</p>
                    <p className="text-xs text-charcoal/40 mt-1">
                      Status: <span className={job.status === 'COMPLETED' ? 'text-green-600' : 'text-yellow-600'}>{job.status}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-subtle p-12 text-center">
              <Sparkles className="w-16 h-16 text-charcoal/20 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-charcoal mb-2">No generations yet</h3>
              <p className="text-charcoal/60 mb-6">Start creating stunning virtual try-ons with AI</p>
              <Link
                href="/influencer/try-on"
                className="inline-flex items-center gap-2 px-6 py-3 bg-charcoal text-cream rounded-full font-medium hover:bg-charcoal/90 transition-colors"
              >
                <Camera className="w-5 h-5" />
                Start Generating
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
