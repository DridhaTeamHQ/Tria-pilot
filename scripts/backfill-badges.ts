/**
 * Backfill script to calculate and update badge scores for existing influencers
 * Run with: npx tsx scripts/backfill-badges.ts
 */

import prisma from '../src/lib/prisma'
import { calculateBadge } from '../src/lib/influencer/badge-calculator'

async function backfillBadges() {
  console.log('Starting badge backfill...')

  try {
    // Get all influencers with profiles
    const influencers = await prisma.influencerProfile.findMany({
      include: {
        user: true,
      },
    })

    console.log(`Found ${influencers.length} influencers to process`)

    let updated = 0
    let skipped = 0

    for (const influencer of influencers) {
      try {
        const badge = calculateBadge({
          followers: influencer.followers ?? 0,
          engagementRate: Number(influencer.engagementRate ?? 0),
          audienceRate: influencer.audienceRate?.toNumber?.() ?? 0,
          retentionRate: influencer.retentionRate?.toNumber?.() ?? 0,
        })

        await prisma.influencerProfile.update({
          where: { id: influencer.id },
          data: {
            badgeScore: badge.score,
            badgeTier: badge.tier,
          },
        })

        updated++
        if (updated % 10 === 0) {
          console.log(`Updated ${updated}/${influencers.length} influencers...`)
        }
      } catch (error) {
        console.error(`Error updating influencer ${influencer.id}:`, error)
        skipped++
      }
    }

    console.log(`\n✅ Backfill complete!`)
    console.log(`   Updated: ${updated}`)
    console.log(`   Skipped: ${skipped}`)
  } catch (error) {
    console.error('Backfill failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

backfillBadges()
