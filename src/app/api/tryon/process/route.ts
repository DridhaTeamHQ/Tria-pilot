/**
 * QStash worker endpoint.
 *
 * QStash POSTs a signed message here when it's time to process a queued
 * try-on job. We verify the signature, run the full Gemini generation
 * pipeline, then return 200.
 *
 * If processing fails, we return 500 — QStash will then auto-retry
 * up to QSTASH_RETRIES times with exponential backoff. After exhausting
 * retries, the message lands in QStash's DLQ for manual review.
 *
 * Security: signature verification ensures only legitimate QStash calls
 * can trigger generation. Without verification, anyone could spam this
 * endpoint with fake jobIds.
 */

import { NextResponse } from 'next/server'
import { Receiver } from '@upstash/qstash'
import { processTryOnJob } from '@/lib/tryon/process-job'
import { GeminiRateLimitError } from '@/lib/gemini/executor'

// Each job runs in its own Vercel function with full 5-minute budget.
export const maxDuration = 300

// Don't cache — every invocation processes a different job.
export const dynamic = 'force-dynamic'

interface TryOnQStashPayload {
  jobId: string
  userId: string
}

export async function POST(request: Request) {
  // QStash sends signature in this header.
  const signature = request.headers.get('upstash-signature')
  const rawBody = await request.text()

  // ── Signature verification ────────────────────────────────────────────
  // Skip verification only when explicitly disabled (e.g. local testing).
  if (process.env.QSTASH_SIGNATURE_VERIFICATION !== 'disabled') {
    if (!signature) {
      console.warn('[tryon/process] missing upstash-signature header')
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }

    const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY
    const nextKey = process.env.QSTASH_NEXT_SIGNING_KEY

    if (!currentKey || !nextKey) {
      console.error('[tryon/process] QSTASH_CURRENT_SIGNING_KEY / QSTASH_NEXT_SIGNING_KEY not set')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const receiver = new Receiver({
      currentSigningKey: currentKey,
      nextSigningKey: nextKey,
    })

    try {
      const isValid = await receiver.verify({
        signature,
        body: rawBody,
      })
      if (!isValid) {
        console.warn('[tryon/process] invalid QStash signature — rejecting')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    } catch (verifyErr) {
      console.error('[tryon/process] signature verification error:', verifyErr)
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 })
    }
  }

  // ── Parse payload ─────────────────────────────────────────────────────
  let payload: TryOnQStashPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  if (!payload.jobId || !payload.userId) {
    return NextResponse.json(
      { error: 'Missing jobId or userId in payload' },
      { status: 400 }
    )
  }

  console.log(`📨 [tryon/process] processing job ${payload.jobId} (user ${payload.userId})`)
  const startTime = Date.now()

  // ── Run the actual generation ─────────────────────────────────────────
  try {
    await processTryOnJob(payload.jobId)
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`✅ [tryon/process] completed job ${payload.jobId} in ${duration}s`)
    return NextResponse.json({ success: true, jobId: payload.jobId })
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    const message = error instanceof Error ? error.message : String(error)

    // GeminiRateLimitError → return 429 so QStash retries with backoff.
    // QStash treats any non-2xx as a failure to retry.
    if (error instanceof GeminiRateLimitError) {
      console.warn(`⚠️ [tryon/process] rate limit on job ${payload.jobId} (${duration}s) — QStash will retry`)
      return NextResponse.json(
        { error: 'Gemini rate limit — will retry', retryable: true },
        { status: 429 }
      )
    }

    console.error(`❌ [tryon/process] failed job ${payload.jobId} after ${duration}s:`, message)
    // Return 500 to trigger QStash retry. After retries are exhausted,
    // the job will already be marked 'failed' in DB by processTryOnJob.
    return NextResponse.json(
      { error: message, jobId: payload.jobId },
      { status: 500 }
    )
  }
}
