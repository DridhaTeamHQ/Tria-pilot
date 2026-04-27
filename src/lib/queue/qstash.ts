/**
 * QStash queue adapter.
 *
 * QStash is Upstash's HTTP-based message queue. It's the Vercel-native
 * replacement for BullMQ/Redis workers — instead of running a long-lived
 * worker process, QStash POSTs each queued message to a Vercel endpoint
 * (/api/tryon/process), which runs as a normal serverless function with
 * full 300s budget.
 *
 * Benefits over BullMQ on Vercel:
 *   - No separate hosting needed (everything runs on Vercel)
 *   - Each job gets its own function invocation — no global concurrency cap
 *   - Built-in retries with exponential backoff
 *   - Pay-per-message (free tier: 500 msgs/day, $1 / 1000 msgs after)
 *
 * Setup:
 *   1. Create QStash account at https://upstash.com/qstash
 *   2. Get token + signing keys from console
 *   3. Set QSTASH_TOKEN, QSTASH_CURRENT_SIGNING_KEY, QSTASH_NEXT_SIGNING_KEY
 *      in Vercel environment variables
 *   4. Set NEXT_PUBLIC_SITE_URL to your production domain (e.g. https://kiwikoo.com)
 *
 * Security: messages are signed by QStash. The /process endpoint verifies
 * the signature so only legitimate QStash deliveries can trigger generation.
 */

import 'server-only'
import { Client } from '@upstash/qstash'

export interface TryOnQStashMessage {
  jobId: string
  userId: string
}

let client: Client | null = null

/**
 * Lazily initialize the QStash client.
 */
function getQStashClient(): Client | null {
  if (client) return client
  const token = process.env.QSTASH_TOKEN
  if (!token) return null
  client = new Client({ token })
  return client
}

/**
 * Returns true when QStash is fully configured for production use.
 * Both the publish token AND the signing key are required.
 */
export function isQStashConfigured(): boolean {
  return Boolean(
    process.env.QSTASH_TOKEN && process.env.QSTASH_CURRENT_SIGNING_KEY
  )
}

/**
 * Publish a try-on job to QStash for async processing.
 *
 * QStash will POST { jobId, userId } to <baseUrl>/api/tryon/process,
 * automatically retrying up to `retries` times on non-2xx responses.
 *
 * @param jobId   - generation_jobs row ID (the job to process)
 * @param userId  - owning user
 * @param baseUrl - public origin (e.g. https://kiwikoo.com)
 * @returns QStash messageId for tracking
 */
export async function publishTryOnJob(
  jobId: string,
  userId: string,
  baseUrl: string
): Promise<string> {
  const qs = getQStashClient()
  if (!qs) throw new Error('QStash is not configured (missing QSTASH_TOKEN)')

  const targetUrl = `${baseUrl.replace(/\/$/, '')}/api/tryon/process`

  const result = await qs.publishJSON({
    url: targetUrl,
    body: { jobId, userId } satisfies TryOnQStashMessage,
    // Built-in retry policy. QStash will retry with exponential backoff.
    retries: parseInt(process.env.QSTASH_RETRIES || '3', 10) || 3,
    // Don't deduplicate — each generation is intentional even if user resubmits.
  })

  return result.messageId
}

/**
 * Best-effort check that QStash is reachable. Used by the active-jobs
 * endpoint to decide whether to surface queue position info.
 */
export async function isQStashReachable(): Promise<boolean> {
  const qs = getQStashClient()
  if (!qs) return false
  try {
    // Cheap call — just lists DLQ stats. Confirms credentials work.
    await qs.dlq.listMessages({ count: 1 })
    return true
  } catch {
    return false
  }
}
