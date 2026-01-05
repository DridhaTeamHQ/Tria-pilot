import { createClient } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = await createClient()
        const {
            data: { user: authUser },
        } = await supabase.auth.getUser()

        if (!authUser || !authUser.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: authUser.email.toLowerCase().trim() },
            select: { id: true },
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const generations = await prisma.generationJob.findMany({
            where: {
                userId: user.id,
            },
            select: {
                id: true,
                status: true,
                outputImagePath: true,
                settings: true,  // Contains variant data
                inputs: true,    // Contains input images
                createdAt: true,
                updatedAt: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 100, // Limit to last 100 generations
        })

        return NextResponse.json({ generations })
    } catch (error) {
        console.error('Error fetching generations:', error)
        return NextResponse.json(
            { error: 'Failed to fetch generations' },
            { status: 500 }
        )
    }
}
