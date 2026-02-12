import IORedis from 'ioredis'

let redisConnection: IORedis | null = null

function getRedisUrl(): string {
  const url = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL
  if (!url) {
    throw new Error('UPSTASH_REDIS_URL or REDIS_URL must be configured for queueing')
  }
  return url
}

/** Returns true if Redis URL is set (queue available). */
export function isQueueAvailable(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL)
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
