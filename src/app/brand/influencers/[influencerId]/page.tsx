import { createClient } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Mail, Instagram, Youtube, Twitter } from 'lucide-react'
import RequestCollaborationButton from '@/components/collaborations/RequestCollaborationButton'
import BadgeDisplay, { type BadgeTier } from '@/components/influencer/BadgeDisplay'

export default async function InfluencerDetailPage({
  params,
}: {
  params: Promise<{ influencerId: string }>
}) {
  const { influencerId } = await params
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: authUser.email! },
  })

  // Only brands can view influencer details
  if (!dbUser || dbUser.role !== 'BRAND') {
    redirect('/')
  }

  // Try to find influencer by userId first (route param is User.id)
  let influencer = await prisma.influencerProfile.findUnique({
    where: { userId: influencerId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          slug: true,
        },
      },
    },
  })

  // If not found, try by id (in case route param is InfluencerProfile.id)
  if (!influencer) {
    influencer = await prisma.influencerProfile.findUnique({
      where: { id: influencerId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            slug: true,
          },
        },
      },
    })
  }

  if (!influencer) {
    notFound()
  }

  // Get portfolio
  const portfolio = await prisma.portfolio.findMany({
    where: {
      userId: influencer.userId,
      visibility: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Get collaboration history - influencerId must be User.id, not InfluencerProfile.id
  // Ensure we have a valid userId before querying
  const influencerUserId = influencer.userId || influencer.user?.id
  if (!influencerUserId) {
    throw new Error('Invalid influencer: missing userId')
  }

  const collaborations = await prisma.collaborationRequest.findMany({
    where: {
      influencerId: influencerUserId, // This is the User.id
      status: 'accepted',
    },
    select: {
      id: true,
      message: true,
      createdAt: true,
      brand: {
        select: {
          id: true,
          name: true,
          brandProfile: {
            select: {
              companyName: true,
            },
          },
        },
      },
    },
    take: 5,
    orderBy: {
      createdAt: 'desc',
    },
  })

  const socials = influencer.socials as Record<string, string> || {}

  return (
    <div className="min-h-screen bg-cream pt-24 pb-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <Link
          href="/brand/marketplace"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 mb-8 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Marketplace</span>
        </Link>

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Left: Profile Info */}
        <div className="lg:col-span-1">
          <Card className="sticky top-8">
            <CardHeader className="pb-4">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-2xl font-semibold text-zinc-700 dark:text-zinc-300 flex-shrink-0">
                  {influencer.user?.name?.charAt(0).toUpperCase() || 'I'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <CardTitle className="text-xl break-words">{influencer.user?.name || 'Influencer'}</CardTitle>
                    <BadgeDisplay tier={(influencer.badgeTier as BadgeTier) ?? null} />
                  </div>
                  <CardDescription className="text-xs break-all">{influencer.user?.email}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Bio */}
              {influencer.bio && (
                <div>
                  <h3 className="font-semibold mb-2 text-sm">Bio</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{influencer.bio}</p>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-zinc-500 dark:text-zinc-500 uppercase tracking-wide">Followers</p>
                  <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    {influencer.followers
                      ? `${(influencer.followers / 1000).toFixed(1)}k`
                      : 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-zinc-500 dark:text-zinc-500 uppercase tracking-wide">Price/Post</p>
                  <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    {influencer.pricePerPost
                      ? `₹${influencer.pricePerPost.toLocaleString()}`
                      : 'N/A'}
                  </p>
                </div>
                {influencer.engagementRate && (
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-500 dark:text-zinc-500 uppercase tracking-wide">Engagement</p>
                    <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      {(Number(influencer.engagementRate) * 100).toFixed(1)}%
                    </p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-xs text-zinc-500 dark:text-zinc-500 uppercase tracking-wide">Collabs</p>
                  <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{collaborations.length}</p>
                </div>
                {influencer.audienceRate && (
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-500 dark:text-zinc-500 uppercase tracking-wide">Growth</p>
                    <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      {Number(influencer.audienceRate).toFixed(1)}%
                    </p>
                  </div>
                )}
                {influencer.retentionRate && (
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-500 dark:text-zinc-500 uppercase tracking-wide">Retention</p>
                    <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      {Number(influencer.retentionRate).toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>

              {influencer.badgeScore !== null && influencer.badgeScore !== undefined && (
                <div className="rounded-2xl bg-cream/60 border border-charcoal/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-zinc-500 uppercase tracking-wide">Badge Score</p>
                      <p className="text-lg font-semibold text-zinc-900">{Number(influencer.badgeScore).toFixed(2)}</p>
                    </div>
                    <BadgeDisplay tier={(influencer.badgeTier as BadgeTier) ?? null} />
                  </div>
                </div>
              )}

              {/* Niches */}
              {influencer.niches && Array.isArray(influencer.niches) && influencer.niches.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 text-sm">Niches</h3>
                  <div className="flex flex-wrap gap-2">
                    {(influencer.niches as string[]).map((niche: string, index: number) => (
                      <span
                        key={index}
                        className="text-xs px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-700 dark:text-zinc-300 font-medium"
                      >
                        {niche}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Social Links */}
              {(socials.instagram || socials.tiktok || socials.youtube || socials.twitter) && (
                <div>
                  <h3 className="font-semibold mb-3 text-sm">Social Media</h3>
                  <div className="space-y-2.5">
                    {socials.instagram && (
                      <a
                        href={`https://instagram.com/${socials.instagram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                      >
                        <Instagram className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{socials.instagram}</span>
                      </a>
                    )}
                    {socials.tiktok && (
                      <a
                        href={`https://tiktok.com/@${socials.tiktok.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                      >
                        <Youtube className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{socials.tiktok}</span>
                      </a>
                    )}
                    {socials.youtube && (
                      <a
                        href={socials.youtube.startsWith('http') ? socials.youtube : `https://youtube.com/${socials.youtube}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                      >
                        <Youtube className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{socials.youtube}</span>
                      </a>
                    )}
                    {socials.twitter && (
                      <a
                        href={`https://twitter.com/${socials.twitter.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                      >
                        <Twitter className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{socials.twitter}</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <RequestCollaborationButton
                  influencerId={influencerUserId} // Use validated User.id
                  brandName={dbUser.name || 'Brand'}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Portfolio & History */}
        <div className="lg:col-span-2 space-y-8">
          {/* Portfolio */}
          <div>
            <h2 className="text-2xl font-semibold mb-6 text-zinc-900 dark:text-zinc-100">Portfolio</h2>
            {portfolio.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="w-16 h-16 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center mb-4">
                  <Mail className="h-8 w-8 text-zinc-400 dark:text-zinc-600" />
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 text-center">No portfolio items yet.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {portfolio.map((item: any) => (
                  <div 
                    key={item.id} 
                    className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer hover:opacity-90 transition-opacity bg-zinc-100 dark:bg-zinc-800"
                  >
                    <img
                      src={item.imagePath}
                      alt={item.title || 'Portfolio item'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Previous Collaborations */}
          {collaborations.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-zinc-900 dark:text-zinc-100">Previous Collaborations</h2>
              <div className="space-y-4">
                {collaborations.map((collab: any) => (
                  <Card key={collab.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg mb-1">
                            {collab.brand.brandProfile?.companyName || collab.brand.name || 'Brand'}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {new Date(collab.createdAt).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                        {collab.message}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}

