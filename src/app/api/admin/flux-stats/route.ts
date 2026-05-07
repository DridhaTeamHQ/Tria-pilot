/**
 * GET /api/admin/flux-stats
 *
 * Read-only diagnostic endpoint for the FLUX key pool + per-user
 * concurrency limiter. Used to verify in production that:
 *   - All keys are loaded
 *   - In-flight counts are healthy (no leaks)
 *   - No keys are stuck in cooldown
 *
 * Auth: Bearer token via FLUX_ADMIN_TOKEN env var. If unset, the
 * endpoint is disabled (returns 404). This is intentional — it leaks
 * operational metrics, so it must be opt-in.
 *
 * Example:
 *   curl -H "Authorization: Bearer $FLUX_ADMIN_TOKEN" \
 *        https://your-app.vercel.app/api/admin/flux-stats
 */

import { NextResponse } from 'next/server'
import { getFluxKeyPoolStats } from '@/lib/flux/client'
import { getUserConcurrencyStats } from '@/lib/flux/user-concurrency'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

export async function GET(request: Request) {
  const adminToken = (process.env.FLUX_ADMIN_TOKEN || '').trim()

  // Endpoint is disabled unless FLUX_ADMIN_TOKEN is configured. Returning
  // 404 (not 401) so existence isn't leaked to unauthenticated probes.
  if (!adminToken) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const auth = request.headers.get('authorization') || ''
  const provided = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''

  if (!provided || !timingSafeEqual(provided, adminToken)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const pool = getFluxKeyPoolStats()
  const users = getUserConcurrencyStats()

  return NextResponse.json(
    {
      timestamp: new Date().toISOString(),
      keyPool: pool,
      userConcurrency: users,
      health: {
        poolHealthy: pool.size > 0,
        underHalfCapacity: pool.totalInFlight < Math.ceil(pool.globalCap / 2),
        keysCoolingDown: Object.keys(pool.cooldownMsRemaining).length,
      },
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    },
  )
}
