
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is missing from .env.local')
    process.exit(1)
}

const prisma = new PrismaClient()

async function main() {
    const email = 'mdafzalkhan8326@gmail.com'

    console.log(`Checking Prisma for user: ${email}`)

    const user = await prisma.user.findUnique({
        where: { email },
        include: { influencerProfile: true }
    })

    if (!user) {
        console.log('User NOT found in Prisma User table.')
    } else {
        console.log('User FOUND in Prisma:', JSON.stringify(user, null, 2))

        if (!user.influencerProfile) {
            console.log('CRITICAL: User exists but missing InfluencerProfile!')
        }
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
