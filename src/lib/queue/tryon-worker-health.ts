import { getRedisConnection, isQueueAvailable } from './redis'

const TRYON_WORKER_HEARTBEAT_KEY = 'tryon:worker:heartbeat'
const HEARTBEAT_INTERVAL_MS = Math.max(
  3000,
  Number.parseInt(process.env.TRYON_WORKER_HEARTBEAT_INTERVAL_MS || '10000', 10) || 10000
)
const HEARTBEAT_GRACE_MS = Math.max(
  HEARTBEAT_INTERVAL_MS * 3,
  Number.parseInt(process.env.TRYON_WORKER_HEARTBEAT_GRACE_MS || '45000', 10) || 45000
)
const HEARTBEAT_TTL_SECONDS = Math.max(20, Math.ceil((HEARTBEAT_GRACE_MS + HEARTBEAT_INTERVAL_MS) / 1000))

export function getTryOnWorkerHeartbeatIntervalMs(): number {
  return HEARTBEAT_INTERVAL_MS
}

export async function touchTryOnWorkerHeartbeat(timestampMs: number = Date.now()): Promise<void> {
  if (!isQueueAvailable()) return
  const redis = getRedisConnection()
  await redis.set(TRYON_WORKER_HEARTBEAT_KEY, String(timestampMs), 'EX', HEARTBEAT_TTL_SECONDS)
}

export async function isTryOnWorkerOnline(nowMs: number = Date.now()): Promise<boolean> {
  if (!isQueueAvailable()) return false
  try {
    const redis = getRedisConnection()
    const raw = await redis.get(TRYON_WORKER_HEARTBEAT_KEY)
    if (!raw) return false
    const lastSeen = Number.parseInt(raw, 10)
    if (!Number.isFinite(lastSeen)) return true
    return nowMs - lastSeen <= HEARTBEAT_GRACE_MS
  } catch (error) {
    console.warn('[tryon] worker heartbeat check failed:', error)
    return false
  }
}
