/**
 * IN-MEMORY PER-IP RATE LIMITER
 *
 * Lightweight bucket-based rate limiter for endpoints that need a small
 * extra layer of protection beyond the global middleware (e.g. admin
 * grant, tracked-link redirect, contact form).
 *
 * NOTE: this is a per-process in-memory limiter — on serverless, every
 * lambda instance has its own counters, so the effective limit is
 * `limit × N_instances`. For high-stakes endpoints, prefer Redis.
 * For lower-stakes endpoints (where some leak is OK), this is a
 * reasonable, dependency-free defense in depth.
 */

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

// Periodic cleanup so the Map doesn't grow unbounded
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000
let lastCleanup = Date.now()

function maybeCleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

/**
 * Returns true if the request should be allowed, false if rate-limited.
 *
 * @param key   Composite key — typically `${endpoint}:${ip}` or `${endpoint}:${userId}`
 * @param limit Max requests allowed within the window
 * @param windowMs Window size in milliseconds
 */
export function ipRateLimit(key: string, limit: number, windowMs: number): {
  allowed: boolean
  remaining: number
  resetMs: number
} {
  const now = Date.now()
  maybeCleanup(now)

  const bucket = buckets.get(key)
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetMs: windowMs }
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetMs: bucket.resetAt - now }
  }

  bucket.count += 1
  return { allowed: true, remaining: limit - bucket.count, resetMs: bucket.resetAt - now }
}

/**
 * Extract the client IP from a request. Trusts X-Forwarded-For/x-real-ip
 * headers — which is correct behind Vercel/Cloudflare but should NOT be
 * trusted when the route is exposed directly without a proxy.
 */
export function getClientIp(request: Request | { headers: Headers }): string {
  const h = request.headers
  // Vercel-specific
  const vercelFor = h.get('x-vercel-forwarded-for')
  if (vercelFor) return vercelFor.split(',')[0]?.trim() || 'unknown'
  // Cloudflare-specific
  const cfIp = h.get('cf-connecting-ip')
  if (cfIp) return cfIp.trim()
  // Generic
  const realIp = h.get('x-real-ip')
  if (realIp) return realIp.trim()
  const xff = h.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]?.trim() || 'unknown'
  return 'unknown'
}
