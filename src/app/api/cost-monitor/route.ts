import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getCostMonitorData } from '@/lib/generation-limiter'

/**
 * COST MONITOR ENDPOINT
 * 
 * Returns current cost and usage data for monitoring.
 * Admin-only endpoint.
 */
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if user is admin (you may want to customize this)
        const dbUser = await prisma.user.findUnique({
            where: { email: authUser.email! },
            select: { id: true, email: true }
        })

        if (!dbUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Get cost monitor data
        const costData = getCostMonitorData()

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            costs: {
                dailySpend: costData.dailySpend.toFixed(2),
                dailyLimit: costData.dailyLimit.toFixed(2),
                utilizationPercent: ((costData.dailySpend / costData.dailyLimit) * 100).toFixed(1),
            },
            killSwitch: {
                active: costData.killSwitchActive,
                threshold: costData.killSwitchThreshold.toFixed(2),
            },
            usage: {
                totalGenerationsToday: costData.totalGenerationsToday,
            },
            limits: {
                maxGenerationsPerDay: costData.limits.MAX_GENERATIONS_PER_DAY,
                cooldownSeconds: costData.limits.COOLDOWN_SECONDS,
                maxIpRequestsPerHour: costData.limits.MAX_REQUESTS_PER_HOUR_PER_IP,
            },
            recentRecords: costData.recentRecords.slice(-10).map(r => ({
                userId: r.userId.slice(0, 8) + '...',
                result: r.result,
                cost: r.estimatedCostUsd.toFixed(3),
                timestamp: new Date(r.timestamp).toISOString(),
            }))
        })
    } catch (error) {
        console.error('Cost monitor error:', error)
        return NextResponse.json({
            error: 'Failed to get cost data',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
