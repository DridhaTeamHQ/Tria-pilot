import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import { isQueueAvailable, isRedisConfigured, getRedisConnection } from '@/lib/queue/redis'
import { isTryOnWorkerOnline } from '@/lib/queue/tryon-worker-health'
import { isQStashConfigured } from '@/lib/queue/qstash'
import { getKeyPoolStats } from '@/lib/gemini/executor'
import { getCostMonitorData } from '@/lib/generation-limiter'

export const dynamic = 'force-dynamic'

/**
 * Admin-only operational health endpoint for the try-on pipeline.
 *
 * Returns real-time status of:
 *   - Gemini API key pool (total / available / cooling down)
 *   - BullMQ queue depth (waiting / active / failed / completed)
 *   - Worker heartbeat status
 *   - Daily spend + kill switch state
 *   - Recent generation cost log
 *
 * Use this for live debugging during traffic spikes and capacity planning.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = createServiceClient()
    const { data: profile } = await service
      .from('profiles')
      .select('role')
      .eq('id', authUser.id)
      .single()

    if ((profile?.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
    }

    // ── Gemini key pool stats ────────────────────────────────────────────
    const keyPool = getKeyPoolStats()

    // ── Queue stats (BullMQ) ────────────────────────────────────────────
    let queueStats: {
      waiting: number
      active: number
      completed: number
      failed: number
      delayed: number
    } | null = null
    let workerOnline = false

    if (isQueueAvailable()) {
      try {
        const { Queue } = await import('bullmq')
        const { TRYON_QUEUE_NAME } = await import('@/lib/queue/tryon-queue')
        const redis = getRedisConnection()
        const queue = new Queue(TRYON_QUEUE_NAME, { connection: redis })
        const counts = await queue.getJobCounts(
          'waiting',
          'active',
          'completed',
          'failed',
          'delayed'
        )
        queueStats = {
          waiting: counts.waiting || 0,
          active: counts.active || 0,
          completed: counts.completed || 0,
          failed: counts.failed || 0,
          delayed: counts.delayed || 0,
        }
        await queue.close()
        workerOnline = await isTryOnWorkerOnline()
      } catch (err) {
        console.warn('[admin/tryon-health] queue inspection failed:', err)
      }
    }

    // ── Cost monitor ─────────────────────────────────────────────────────
    const costData = getCostMonitorData()

    // ── DB-level stats: pending/processing jobs across all users ────────
    const { count: pendingDbCount } = await service
      .from('generation_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
    const { count: processingDbCount } = await service
      .from('generation_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'processing')
    const { count: failedDbCount } = await service
      .from('generation_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      gemini: {
        keyPool,
        // Estimated capacity assuming 2 RPM/key for Pro
        estimatedProRPM: keyPool.totalKeys * 2,
        estimatedFlashRPM: keyPool.totalKeys * 10,
      },
      queue: {
        // Active queue provider in priority order: qstash > bullmq > inline
        provider: isQStashConfigured()
          ? 'qstash'
          : isQueueAvailable() && workerOnline
            ? 'bullmq'
            : 'inline',
        qstashConfigured: isQStashConfigured(),
        bullmqConfigured: isRedisConfigured(),
        bullmqAvailable: isQueueAvailable(),
        bullmqWorkerOnline: workerOnline,
        bullmqStats: queueStats,
      },
      database: {
        pendingJobs: pendingDbCount ?? null,
        processingJobs: processingDbCount ?? null,
        failedJobsLast24h: failedDbCount ?? null,
      },
      cost: {
        dailySpendUSD: costData.dailySpend,
        dailyLimitUSD: costData.dailyLimit,
        killSwitchActive: costData.killSwitchActive,
        killSwitchThresholdUSD: costData.killSwitchThreshold,
        totalGenerationsToday: costData.totalGenerationsToday,
      },
      config: {
        workerConcurrency: parseInt(process.env.TRYON_WORKER_CONCURRENCY || '4', 10),
        maxQueueDepth: parseInt(process.env.TRYON_MAX_QUEUE_DEPTH || '50', 10),
        maxPerDayPerUser: parseInt(process.env.MAX_TRYON_PER_DAY || '10', 10),
        cooldownSeconds: parseInt(process.env.TRYON_COOLDOWN_SECONDS || '15', 10),
        proMaxConcurrent: parseInt(process.env.GEMINI_PRO_MAX_CONCURRENT || '1', 10),
        proMinTimeMs: parseInt(process.env.GEMINI_PRO_MIN_TIME_MS || '5000', 10),
        limiterEnabled:
          process.env.NODE_ENV === 'production' || process.env.TRYON_LIMITER_ENABLED === 'true',
      },
    })
  } catch (error) {
    console.error('[admin/tryon-health] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch health data' },
      { status: 500 }
    )
  }
}
