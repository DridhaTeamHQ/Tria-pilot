import prisma from '@/lib/prisma'
import BadgeDisplay, { type BadgeTier } from '@/components/influencer/BadgeDisplay'

export default async function InfluencerRankingsPage() {
  const influencers = await prisma.influencerProfile.findMany({
    where: {
      onboardingCompleted: true,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [
      { badgeScore: 'desc' },
      { followers: 'desc' },
      { createdAt: 'desc' },
    ],
  })

  return (
    <div className="min-h-screen bg-cream pt-24 pb-10">
      <div className="container mx-auto px-6 max-w-6xl">
        <h1 className="text-3xl font-serif text-charcoal mb-2">Influencer Rankings</h1>
        <p className="text-charcoal/60 mb-8">Ranked by badge score and engagement metrics.</p>

        <div className="bg-white rounded-2xl border border-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-cream/60 text-charcoal/70">
                <tr>
                  <th className="px-5 py-3">Rank</th>
                  <th className="px-5 py-3">Influencer</th>
                  <th className="px-5 py-3">Badge</th>
                  <th className="px-5 py-3">Score</th>
                  <th className="px-5 py-3">Followers</th>
                  <th className="px-5 py-3">Engagement</th>
                  <th className="px-5 py-3">Growth</th>
                  <th className="px-5 py-3">Retention</th>
                </tr>
              </thead>
              <tbody>
                {influencers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-charcoal/60">
                      No influencers ranked yet.
                    </td>
                  </tr>
                ) : (
                  influencers.map((inf, index) => (
                    <tr key={inf.id} className="border-t border-subtle/60">
                      <td className="px-5 py-3 font-medium">{index + 1}</td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-charcoal">{inf.user?.name || 'Influencer'}</div>
                        <div className="text-xs text-charcoal/60">{inf.user?.email}</div>
                      </td>
                      <td className="px-5 py-3">
                        <BadgeDisplay tier={(inf.badgeTier as BadgeTier) ?? null} />
                      </td>
                      <td className="px-5 py-3">{inf.badgeScore ? Number(inf.badgeScore).toFixed(2) : '—'}</td>
                      <td className="px-5 py-3">{inf.followers ?? '—'}</td>
                      <td className="px-5 py-3">
                        {inf.engagementRate ? `${(Number(inf.engagementRate) * 100).toFixed(2)}%` : '—'}
                      </td>
                      <td className="px-5 py-3">
                        {inf.audienceRate ? `${Number(inf.audienceRate).toFixed(1)}%` : '—'}
                      </td>
                      <td className="px-5 py-3">
                        {inf.retentionRate ? `${Number(inf.retentionRate).toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
