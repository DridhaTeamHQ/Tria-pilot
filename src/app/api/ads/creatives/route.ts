import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const {
            data: { user: authUser },
        } = await supabase.auth.getUser()

        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: authUser.email! },
        })

        if (!dbUser || dbUser.role !== 'BRAND') {
            return NextResponse.json({ error: 'Unauthorized - Brand access required' }, { status: 403 })
        }

        // Parse query params
        const url = new URL(request.url)
        const campaignId = url.searchParams.get('campaignId')
        const platform = url.searchParams.get('platform')
        const qualityMin = url.searchParams.get('qualityMin')
        const qualityMax = url.searchParams.get('qualityMax')
        const limit = parseInt(url.searchParams.get('limit') || '50')
        const offset = parseInt(url.searchParams.get('offset') || '0')

        // Build where clause
        const where: any = {
            brandId: dbUser.id,
        }

        if (campaignId) {
            where.campaignId = campaignId === 'unassigned' ? null : campaignId
        }

        // Fetch creatives
        const creatives = await prisma.adCreative.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        })

        // Transform for frontend
        const transformedCreatives = creatives.map(creative => {
            const meta = (creative.meta as any) || {}

            return {
                id: creative.id,
                imageUrl: creative.imagePath,
                qualityScore: meta.rating?.score || meta.qualityScore || 75,
                campaign: meta.campaignId ? {
                    id: meta.campaignId,
                    title: meta.campaignTitle || 'Campaign',
                } : null,
                platforms: meta.platforms || ['instagram'],
                copyVariants: meta.copyVariants || (creative.copy ? [creative.copy] : []),
                createdAt: creative.createdAt.toISOString(),
                regenerationCount: meta.regenerationCount || 0,
                maxRegenerations: meta.maxRegenerations || 5,
                stylePreset: meta.stylePreset,
            }
        })

        // Filter by quality score (post-query since it's in JSON)
        let filteredCreatives = transformedCreatives
        if (qualityMin || qualityMax) {
            const min = qualityMin ? parseInt(qualityMin) : 0
            const max = qualityMax ? parseInt(qualityMax) : 100
            filteredCreatives = transformedCreatives.filter(
                c => c.qualityScore >= min && c.qualityScore <= max
            )
        }

        // Filter by platform (post-query since it's in JSON)
        if (platform) {
            filteredCreatives = filteredCreatives.filter(
                c => c.platforms.includes(platform)
            )
        }

        return NextResponse.json({
            creatives: filteredCreatives,
            total: filteredCreatives.length,
            hasMore: creatives.length === limit,
        })
    } catch (error) {
        console.error('Fetch creatives error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        )
    }
}
