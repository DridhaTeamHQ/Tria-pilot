import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import { isQueueAvailable, getRedisConnection } from '@/lib/queue/redis'
import { isTryOnWorkerOnline } from '@/lib/queue/tryon-worker-health'
import { isQStashConfigured } from '@/lib/queue/qstash'

export const dynamic = 'force-dynamic'

// Jobs older than this are considered stale and auto-expired.
// Queued generations can sit pending for a while under load, so keep this generous.
const STALE_JOB_THRESHOLD_MINUTES = 30
const STALE_JOB_THRESHOLD_MINUTES_WHEN_WORKER_OFFLINE = 8

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
    const qstashOnline = isQStashConfigured()
    const workerOnline =
      qstashOnline
        ? true   // QStash is always available — Vercel handles the function calls
        : isQueueAvailable()
          ? await isTryOnWorkerOnline()
          : false
    const staleThresholdMinutes = workerOnline
      ? STALE_JOB_THRESHOLD_MINUTES
      : STALE_JOB_THRESHOLD_MINUTES_WHEN_WORKER_OFFLINE

    // AUTO-EXPIRE: mark stale pending/processing jobs as failed.
    // We keep a generous threshold when worker heartbeat is healthy, and fail faster when worker is offline.
    await service
      .from('generation_jobs')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('user_id', authUser.id)
      .in('status', ['pending', 'processing'])
      .lt('created_at', new Date(Date.now() - staleThresholdMinutes * 60 * 1000).toISOString())

    // Now fetch the active job (if any remain after cleanup)
    const { data: activeJob, error } = await service
      .from('generation_jobs')
      .select('id, status, created_at, updated_at')
      .eq('user_id', authUser.id)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Try-on active job query error:', error)
      return NextResponse.json({ error: 'Failed to fetch active job' }, { status: 500 })
    }

    if (!activeJob) {
      return NextResponse.json({ active: false })
    }

    // ── Queue position (how many jobs are ahead in BullMQ) ─────────────────
    // Gives the frontend something meaningful to show the user while they wait.
    let queuePosition: number | null = null
    let queueDepth: number | null = null
    if (workerOnline && isQueueAvailable()) {
      try {
        const { Queue } = await import('bullmq')
        const { TRYON_QUEUE_NAME } = await import('@/lib/queue/tryon-queue')
        const redis = getRedisConnection()
        const monitorQueue = new Queue(TRYON_QUEUE_NAME, { connection: redis })

        const [waitingJobs, waiting] = await Promise.all([
          monitorQueue.getWaiting(),
          monitorQueue.getWaitingCount(),
        ])
        await monitorQueue.close()

        queueDepth = waiting
        // Find this job's position in the waiting list (1-indexed)
        const idx = waitingJobs.findIndex(j => j.data?.jobId === activeJob.id)
        if (idx !== -1) {
          queuePosition = idx + 1  // 1 = next to be processed
        } else if (activeJob.status === 'processing') {
          queuePosition = 0  // Already being processed
        }
      } catch {
        // Non-fatal — position is just a UI hint
      }
    }

    return NextResponse.json({
      active: true,
      jobId: activeJob.id,
      status: activeJob.status,
      createdAt: activeJob.created_at,
      updatedAt: activeJob.updated_at,
      // Queue context — null when worker is offline or position unknown
      queuePosition,   // 0 = generating now, 1 = next, N = Nth in line
      queueDepth,      // total waiting jobs (so UI can show "4 of 23")
    })
  } catch (error) {
    console.error('Try-on active job error:', error)
    return NextResponse.json({ error: 'Failed to fetch active job' }, { status: 500 })
  }
}
