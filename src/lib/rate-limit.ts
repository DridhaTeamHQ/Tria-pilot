// In-memory rate limiting (for development)
// For production, use Redis

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

const defaultConfigs: Record<string, RateLimitConfig> = {
  tryon: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 per minute
  ads: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 per minute
  campaigns: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 per minute
}

export function checkRateLimit(
  userId: string,
  endpoint: 'tryon' | 'ads' | 'campaigns'
): { allowed: boolean; remaining: number; resetTime: number; retryAfterSeconds?: number } {
  const config = defaultConfigs[endpoint]
  const key = `${userId}:${endpoint}`
  const now = Date.now()

  if (store[key] && store[key].resetTime < now) {
    delete store[key]
  }

  if (!store[key]) {
    store[key] = {
      count: 0,
      resetTime: now + config.windowMs,
    }
  }

  const current = store[key]

  if (current.count >= config.maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetTime - now) / 1000))
    return {
      allowed: false,
      remaining: 0,
      resetTime: current.resetTime,
      retryAfterSeconds,
    }
  }

  current.count++

  return {
    allowed: true,
    remaining: config.maxRequests - current.count,
    resetTime: current.resetTime,
  }
}

// Cleanup function to run periodically
export function cleanupRateLimitStore() {
  const now = Date.now()
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  })
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000)
}

