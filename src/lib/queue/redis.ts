import IORedis from 'ioredis'

let redisConnection: IORedis | null = null
let warnedAboutRestOnlyEnv = false

function readConfiguredRedisUrl(): string | null {
  const url =
    process.env.UPSTASH_REDIS_URL ||
    process.env.REDIS_URL ||
    null

  if (!url) return null
  return url.trim()
}

function isRedisSocketUrl(url: string): boolean {
  return url.startsWith('redis://') || url.startsWith('rediss://')
}

function getRedisUrl(): string {
  const url = readConfiguredRedisUrl()
  if (!url) {
    throw new Error('UPSTASH_REDIS_URL or REDIS_URL must be configured for queueing')
  }

  if (!isRedisSocketUrl(url)) {
    throw new Error(
      `Invalid Redis URL scheme for queueing: "${url}". ` +
      `BullMQ requires a redis:// or rediss:// URL. ` +
      `If you copied Upstash REST credentials (UPSTASH_REDIS_REST_URL/TOKEN), open Upstash -> Connect -> ioredis and copy the rediss:// URL into UPSTASH_REDIS_URL.`
    )
  }

  return url
}

/** Returns true if Redis URL is set (queue available). */
export function isQueueAvailable(): boolean {
  const socketUrl = readConfiguredRedisUrl()
  if (socketUrl && isRedisSocketUrl(socketUrl)) return true

  const hasUpstashRestCreds = Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  )

  if (!socketUrl && hasUpstashRestCreds && !warnedAboutRestOnlyEnv) {
    warnedAboutRestOnlyEnv = true
    console.warn(
      '[queue] Detected UPSTASH_REDIS_REST_URL/TOKEN, but BullMQ queueing needs UPSTASH_REDIS_URL (rediss://...). ' +
      'Queue will run in inline fallback mode until a redis:// or rediss:// URL is configured.'
    )
  }

  return false
}

export function getRedisConnection(): IORedis {
  if (redisConnection) return redisConnection

  redisConnection = new IORedis(getRedisUrl(), {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  })

  return redisConnection
}
