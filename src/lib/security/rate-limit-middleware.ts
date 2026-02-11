import { NextResponse, type NextRequest } from 'next/server'

type WindowState = { count: number; resetAt: number }

// Edge-safe in-memory store (best-effort). For strict production guarantees, back this with Redis.
const store = new Map<string, WindowState>()

function getClientIp(request: NextRequest): string {
  const xf = request.headers.get('x-forwarded-for')
  if (xf) return xf.split(',')[0]?.trim() || 'unknown'
  // NextRequest.ip is not available in all Next.js versions/runtimes; rely on forwarded headers.
  return request.headers.get('x-real-ip') || 'unknown'
}

function pickBucket(pathname: string): 'auth' | 'tryon' | 'ai' | 'write' | 'read' {
  if (pathname.startsWith('/api/auth/')) {
    // Exclude session checks from strict auth throttling
    if (pathname.includes('/me') || pathname.includes('/profile-status')) {
      return 'read'
    }
    return 'auth'
  }
  if (pathname.startsWith('/api/tryon')) return 'tryon'
  if (
    pathname.startsWith('/api/ads/') ||
    pathname.startsWith('/api/campaigns/chat') ||
    pathname.startsWith('/api/fashion-buddy/')
  ) {
    return 'ai'
  }
  return 'read'
}

function getLimits(
  bucket: ReturnType<typeof pickBucket>,
  method: string
): { windowMs: number; maxIp: number; maxUser: number } {
  const windowMs = 60_000 // 1 minute

  // Default by method: read endpoints are higher than writes.
  const isWrite = method !== 'GET' && method !== 'HEAD'
  if (bucket === 'auth') {
    // Throttle credential stuffing / enumeration
    return { windowMs, maxIp: 10, maxUser: 20 }
  }
  if (bucket === 'tryon') {
    // Slightly less aggressive default to reduce false-friction on normal usage.
    const maxPerMinute = parseInt(process.env.MAX_TRYON_PER_MINUTE || '3')
    return { windowMs, maxIp: maxPerMinute, maxUser: maxPerMinute }
  }
  if (bucket === 'ai') {
    // Expensive endpoints (plus they may have additional internal gating)
    return { windowMs, maxIp: 20, maxUser: 30 }
  }
  if (isWrite) {
    return { windowMs, maxIp: 60, maxUser: 120 }
  }
  return { windowMs, maxIp: 120, maxUser: 240 }
}

function consume(key: string, maxRequests: number, windowMs: number) {
  const now = Date.now()
  const existing = store.get(key)

  if (!existing || existing.resetAt <= now) {
    const next: WindowState = { count: 1, resetAt: now + windowMs }
    store.set(key, next)
    return { allowed: true, remaining: maxRequests - 1, resetAt: next.resetAt }
  }

  if (existing.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt }
  }

  existing.count += 1
  store.set(key, existing)
  return { allowed: true, remaining: Math.max(0, maxRequests - existing.count), resetAt: existing.resetAt }
}

function maybeCleanup() {
  // Best-effort cleanup to keep memory bounded in long-lived edge isolates.
  if (store.size < 5000) return
  const now = Date.now()
  for (const [k, v] of store.entries()) {
    if (v.resetAt <= now) store.delete(k)
    if (store.size < 3000) break
  }
}

export function applyApiRateLimit(
  request: NextRequest,
  userId: string | null
): NextResponse | null {
  const pathname = request.nextUrl.pathname
  if (!pathname.startsWith('/api/')) return null

  maybeCleanup()

  const ip = getClientIp(request)
  const bucket = pickBucket(pathname)
  const { windowMs, maxIp, maxUser } = getLimits(bucket, request.method)

  const ipKey = `ip:${ip}:${bucket}:${request.method}`
  const ipResult = consume(ipKey, maxIp, windowMs)

  // If userId exists, enforce a separate user-based limit.
  const userKey = userId ? `uid:${userId}:${bucket}:${request.method}` : null
  const userResult = userKey ? consume(userKey, maxUser, windowMs) : null

  const allowed = ipResult.allowed && (userResult?.allowed ?? true)

  // Extra hourly limits for try-on (protects against steady abuse)
  if (allowed && bucket === 'tryon') {
    const hourWindowMs = 60 * 60 * 1000
    const maxPerHourUser = parseInt(process.env.MAX_TRYON_PER_HOUR || '18')
    const maxPerHourIp = parseInt(process.env.MAX_TRYON_PER_HOUR_PER_IP || '24')

    const ipHourKey = `ip:${ip}:${bucket}:hour`
    const ipHourResult = consume(ipHourKey, maxPerHourIp, hourWindowMs)
    const userHourKey = userId ? `uid:${userId}:${bucket}:hour` : null
    const userHourResult = userHourKey ? consume(userHourKey, maxPerHourUser, hourWindowMs) : null

    if (!ipHourResult.allowed || !(userHourResult?.allowed ?? true)) {
      const resetAt = Math.max(ipHourResult.resetAt, userHourResult?.resetAt ?? 0)
      const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))
      const res = NextResponse.json(
        {
          error: 'Rate limit exceeded. Please slow down and try again.',
          retryAfterSeconds,
        },
        { status: 429 }
      )

      res.headers.set('Retry-After', String(retryAfterSeconds))
      res.headers.set('X-RateLimit-Bucket', `${bucket}-hour`)
      res.headers.set('X-RateLimit-Reset', String(resetAt))
      res.headers.set('Cache-Control', 'no-store')
      return res
    }
  }

  if (allowed) return null

  const resetAt = Math.max(ipResult.resetAt, userResult?.resetAt ?? 0)
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))

  const res = NextResponse.json(
    {
      error: 'Rate limit exceeded. Please slow down and try again.',
      retryAfterSeconds,
    },
    { status: 429 }
  )

  res.headers.set('Retry-After', String(retryAfterSeconds))
  res.headers.set('X-RateLimit-Bucket', bucket)
  res.headers.set('X-RateLimit-Reset', String(resetAt))
  res.headers.set('Cache-Control', 'no-store')
  return res
}

