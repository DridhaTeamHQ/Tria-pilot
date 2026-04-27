import 'dotenv/config'
import { Worker } from 'bullmq'
import { createServiceClient } from '@/lib/auth'
import { GeminiRateLimitError } from '@/lib/gemini/executor'
import { getRedisConnection } from '@/lib/queue/redis'
import { TRYON_QUEUE_NAME, type TryOnQueueJobData } from '@/lib/queue/tryon-queue'
import { getTryOnWorkerHeartbeatIntervalMs, touchTryOnWorkerHeartbeat } from '@/lib/queue/tryon-worker-health'
import { processTryOnJob } from '@/lib/tryon/process-job'


// Helper used by the failure handler below to mark exhausted/rate-limited jobs.
async function markJobStatus(jobId: string, patch: Record<string, unknown>) {
  const service = createServiceClient()
  const { error } = await service
    .from('generation_jobs')
    .update(patch)
    .eq('id', jobId)

  if (error) {
    throw new Error(`Failed updating generation job ${jobId}: ${error.message}`)
  }
}

const worker = new Worker<TryOnQueueJobData>(
  TRYON_QUEUE_NAME,
  async (job) => {
    // All real work lives in the shared module so QStash can call it too.
    await processTryOnJob(job.data.jobId)
  },
  {
    connection: getRedisConnection(),
    // Concurrency tuned to total Gemini key capacity.
    // Each job fires ~3 parallel Gemini calls. With N keys at 2 RPM (Pro):
    //   1 key  → concurrency 2
    //   3 keys → concurrency 4   (current default)
    //   5 keys → concurrency 6
    //   10 keys → concurrency 10
    // Override via TRYON_WORKER_CONCURRENCY env var.
    concurrency: Math.max(1, parseInt(process.env.TRYON_WORKER_CONCURRENCY || '4', 10) || 4),
  }
)
console.log(`👷 Try-on worker started — concurrency: ${Math.max(1, parseInt(process.env.TRYON_WORKER_CONCURRENCY || '4', 10) || 4)}`)

void touchTryOnWorkerHeartbeat()
const heartbeatTimer = setInterval(() => {
  void touchTryOnWorkerHeartbeat()
}, getTryOnWorkerHeartbeatIntervalMs())

worker.on('completed', (job) => {
  console.log(`✅ Try-on worker completed job ${job.id}`)
})

worker.on('failed', async (job, err) => {
  if (!job) return
  const message = err instanceof Error ? err.message : String(err)
  const attempts = job.opts.attempts ?? 1
  const exhausted = job.attemptsMade >= attempts

  if (exhausted) {
    try {
      await markJobStatus(job.data.jobId, {
        status: 'failed',
        error_message: message,
      })
    } catch (updateError) {
      console.error(`Failed to mark job ${job.data.jobId} as failed:`, updateError)
    }
  } else if (err instanceof GeminiRateLimitError) {
    try {
      await markJobStatus(job.data.jobId, {
        status: 'pending',
        error_message: `Rate limited by Gemini. Auto-retrying (attempt ${job.attemptsMade + 1}/${attempts}).`,
      })
    } catch (updateError) {
      console.error(`Failed to mark job ${job.data.jobId} as pending retry:`, updateError)
    }
  }
})

const shutdown = async () => {
  console.log('🛑 Shutting down try-on worker...')
  clearInterval(heartbeatTimer)
  await worker.close()
  await getRedisConnection().quit()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

console.log(`👷 Try-on worker online. Queue=${TRYON_QUEUE_NAME}`)
