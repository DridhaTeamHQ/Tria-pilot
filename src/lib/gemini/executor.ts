import 'server-only'
import Bottleneck from 'bottleneck'
import { GoogleGenAI, type GenerateContentParameters } from '@google/genai'
import { getGeminiKey } from '@/lib/config/api-keys'

const GEMINI_MAX_RETRIES = 3
const GEMINI_MAX_RETRIES_IMAGE = 5        // Image models get more attempts — they're flakier
const BASE_BACKOFF_MS = 1500
const BASE_BACKOFF_IMAGE_MS = 3000
const BASE_BACKOFF_504_MS = 8000          // 504s need longer wait — server was genuinely overloaded
const RETRYABLE_STATUS_CODES = new Set([429, 503, 504, 529])  // 504 = DEADLINE_EXCEEDED — always retry
const SINGLE_KEY_429_WAIT_MS = 8_000 // Wait 8s on single-key 429 before retrying

// Rate limit cooldown per key (ms) — if a key hits 429, skip it for this duration
const KEY_COOLDOWN_MS = 60_000

// Bottleneck limits — tune via env vars based on number of API keys in pool.
//
// Pro image model: ~2 RPM PER KEY (free tier). With N keys, total = N×2 RPM.
//   1 key   → maxConcurrent=1, minTime=5000ms (12 RPM ceiling, hits 429s if real limit is 2 RPM)
//   3 keys  → maxConcurrent=2, minTime=2500ms (~24 RPM total)
//   5 keys  → maxConcurrent=3, minTime=1500ms (~40 RPM total)
//   10 keys → maxConcurrent=5, minTime=800ms (~75 RPM total)
//
// Flash image model: ~10 RPM PER KEY. With N keys, total = N×10 RPM.
//
// Limiters auto-scale based on the number of keys in GEMINI_API_KEYS.
// You can still override per-env if you need to clamp lower.
function countKeys(): number {
  const multi = (process.env.GEMINI_API_KEYS || '').trim()
  if (multi) {
    return multi.split(',').map((k) => k.trim()).filter((k) => k.length >= 10).length
  }
  return (process.env.GEMINI_API_KEY || '').trim() ? 1 : 0
}

const KEY_COUNT = countKeys() || 1

// Pro: 1 concurrent per key (model is slow, queue more aggressively).
// Min time per slot: 1500ms with 3+ keys, 5000ms with 1 key.
const proImageLimiter = new Bottleneck({
  maxConcurrent: parseInt(process.env.GEMINI_PRO_MAX_CONCURRENT || '', 10) || Math.max(3, KEY_COUNT),
  minTime: parseInt(process.env.GEMINI_PRO_MIN_TIME_MS || '', 10) || (KEY_COUNT >= 3 ? 1200 : 5000),
})

// Flash: 2 concurrent per key, faster minTime
const flashLimiter = new Bottleneck({
  maxConcurrent: parseInt(process.env.GEMINI_FLASH_MAX_CONCURRENT || '', 10) || Math.max(4, KEY_COUNT * 2),
  minTime: parseInt(process.env.GEMINI_FLASH_MIN_TIME_MS || '', 10) || (KEY_COUNT >= 3 ? 250 : 500),
})

if (process.env.NODE_ENV !== 'production') {
  console.log(`⚙️  Gemini limiters auto-scaled for ${KEY_COUNT} key(s): pro maxConcurrent=${(proImageLimiter as any)._store?.storeOptions?.maxConcurrent || 'N/A'}, flash maxConcurrent=${(flashLimiter as any)._store?.storeOptions?.maxConcurrent || 'N/A'}`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// API KEY POOL — Supports multiple Gemini keys for production scale
// ═══════════════════════════════════════════════════════════════════════════════

interface KeySlot {
  key: string
  client: GoogleGenAI
  /** Timestamp when this key can be used again (0 = available now) */
  cooldownUntil: number
  /** Number of 429 hits in the current window */
  rateLimitHits: number
}

let keyPool: KeySlot[] | null = null
let roundRobinIndex = 0

/**
 * Initialize the key pool from environment variables.
 * Supports:
 *  - GEMINI_API_KEYS = "key1,key2,key3" (comma-separated, recommended for production)
 *  - GEMINI_API_KEY = "single_key" (backward compatible, fallback)
 */
function initKeyPool(): KeySlot[] {
  if (keyPool) return keyPool

  const multiKeys = process.env.GEMINI_API_KEYS
  let keys: string[] = []

  if (multiKeys) {
    keys = multiKeys
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length >= 10)
  }

  // Fallback to single key
  if (keys.length === 0) {
    keys = [getGeminiKey()]
  }

  keyPool = keys.map(key => ({
    key,
    client: new GoogleGenAI({ apiKey: key }),
    cooldownUntil: 0,
    rateLimitHits: 0,
  }))

  const isDev = process.env.NODE_ENV !== 'production'
  if (isDev) {
    console.log(`🔑 Gemini API key pool initialized: ${keyPool.length} key(s)`)
  }

  return keyPool
}

/**
 * Get the next available client using round-robin with cooldown awareness.
 * If a key is in cooldown (hit 429 recently), skip it.
 * If ALL keys are in cooldown, use the one with the shortest remaining cooldown.
 */
function getNextClient(): GoogleGenAI {
  const pool = initKeyPool()

  if (pool.length === 1) {
    return pool[0].client
  }

  const now = Date.now()

  // Try round-robin: find next available key
  for (let i = 0; i < pool.length; i++) {
    const idx = (roundRobinIndex + i) % pool.length
    const slot = pool[idx]

    if (now >= slot.cooldownUntil) {
      roundRobinIndex = (idx + 1) % pool.length
      return slot.client
    }
  }

  // All keys are in cooldown — pick the one that will recover soonest
  let bestIdx = 0
  let bestCooldown = Infinity
  for (let i = 0; i < pool.length; i++) {
    if (pool[i].cooldownUntil < bestCooldown) {
      bestCooldown = pool[i].cooldownUntil
      bestIdx = i
    }
  }

  roundRobinIndex = (bestIdx + 1) % pool.length
  return pool[bestIdx].client
}

/**
 * Mark a key as rate-limited (429 hit).
 * Sets a cooldown so this key is skipped for a while.
 */
function markKeyRateLimited(client: GoogleGenAI, retryAfterMs?: number): void {
  const pool = initKeyPool()
  const slot = pool.find(s => s.client === client)
  if (!slot) return

  const cooldown = retryAfterMs || KEY_COOLDOWN_MS
  slot.cooldownUntil = Date.now() + cooldown
  slot.rateLimitHits++

  const isDev = process.env.NODE_ENV !== 'production'
  if (isDev) {
    const keyPreview = slot.key.slice(0, 6) + '...'
    console.log(`🔑 Key ${keyPreview} hit 429 → cooldown ${(cooldown / 1000).toFixed(0)}s (hit #${slot.rateLimitHits})`)
  }
}

function pickLimiter(model: string): Bottleneck {
  if (model.includes('gemini-3-pro-image-preview')) return proImageLimiter
  if (model.includes('gemini-3.1-flash-image-preview') || model.includes('flash')) return flashLimiter
  return flashLimiter
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function randomJitterMs(maxJitter = 150): number {
  return Math.floor(Math.random() * maxJitter)
}

function getStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined
  const candidate = error as {
    status?: number
    code?: number
    response?: { status?: number }
  }

  return candidate.status ?? candidate.response?.status ?? candidate.code
}

function parseRetryAfterMs(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined

  const candidate = error as {
    response?: {
      headers?: {
        get?: (name: string) => string | null
      }
    }
  }

  const retryAfterHeader = candidate.response?.headers?.get?.('retry-after')
  if (!retryAfterHeader) return undefined

  const seconds = Number(retryAfterHeader)
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined
  return Math.ceil(seconds * 1000)
}

export class GeminiRateLimitError extends Error {
  public readonly status = 429
  public readonly retryAfterMs: number

  constructor(message: string, retryAfterMs: number) {
    super(message)
    this.name = 'GeminiRateLimitError'
    this.retryAfterMs = retryAfterMs
  }
}

/**
 * Detect 504 / DEADLINE_EXCEEDED from error message string.
 * The SDK sometimes surfaces these as message-only errors without a numeric status.
 */
function is504Error(error: unknown): boolean {
  if (!error) return false
  const msg = error instanceof Error ? error.message : String(error)
  return (
    msg.includes('504') ||
    msg.toLowerCase().includes('deadline exceeded') ||
    msg.toLowerCase().includes('deadline_exceeded') ||
    msg.toLowerCase().includes('deadline expired')
  )
}

async function generateWithBackoff(params: GenerateContentParameters) {
  const pool = initKeyPool()
  const hasMultipleKeys = pool.length > 1
  const isImageModel = params.model.includes('image') || params.model.includes('pro-image')
  const baseBackoff = isImageModel ? BASE_BACKOFF_IMAGE_MS : BASE_BACKOFF_MS
  const maxRetries = isImageModel ? GEMINI_MAX_RETRIES_IMAGE : GEMINI_MAX_RETRIES
  const isDev = process.env.NODE_ENV !== 'production'
  let attempt = 0
  let lastError: unknown = null

  while (attempt < maxRetries) {
    // Pick client (round-robin with cooldown awareness)
    const client = getNextClient()

    try {
      return await client.models.generateContent(params)
    } catch (error) {
      lastError = error
      const status = getStatusCode(error)

      // Treat message-level 504/DEADLINE_EXCEEDED as status 504
      const effective504 = status === 504 || is504Error(error)

      // On 429, mark this key as rate-limited and try the next key
      if (status === 429 && hasMultipleKeys) {
        const retryMs = parseRetryAfterMs(error)
        markKeyRateLimited(client, retryMs)

        // If we still have keys available, try immediately with a different key
        const now = Date.now()
        const availableKeys = pool.filter(s => now >= s.cooldownUntil)
        if (availableKeys.length > 0) {
          attempt++ // Count as an attempt but try next key without backoff
          continue
        }
      }

      // On 429 with SINGLE key: wait a mandatory cooldown before retrying
      // This is critical for image generation models which have strict RPM limits
      if (status === 429 && !hasMultipleKeys) {
        const serverRetryMs = parseRetryAfterMs(error)
        const singleKeyWait = serverRetryMs ?? SINGLE_KEY_429_WAIT_MS
        if (isDev) {
          console.log(`⏳ Single-key 429: waiting ${(singleKeyWait / 1000).toFixed(1)}s before retry (attempt ${attempt + 1}/${maxRetries})`)
        }
        attempt += 1
        if (attempt >= maxRetries) {
          throw new GeminiRateLimitError(
            `Gemini rate limit persisted after ${maxRetries} attempts`,
            singleKeyWait
          )
        }
        await sleep(singleKeyWait)
        continue
      }

      // 504 / DEADLINE_EXCEEDED — server timed out processing the request.
      // Use a longer initial backoff since the server was genuinely overloaded.
      if (effective504) {
        attempt += 1
        if (attempt >= maxRetries) {
          throw lastError instanceof Error
            ? lastError
            : new Error(`Gemini 504 DEADLINE_EXCEEDED persisted after ${maxRetries} attempts`)
        }
        // Longer backoff for timeouts: 8s, 16s, 32s, 64s ...
        const backoff504 = BASE_BACKOFF_504_MS * Math.pow(2, attempt - 1) + randomJitterMs(500)
        if (isDev) {
          console.warn(`⏳ 504 DEADLINE_EXCEEDED (${params.model}): waiting ${(backoff504 / 1000).toFixed(1)}s before retry (attempt ${attempt}/${maxRetries})`)
        }
        await sleep(backoff504)
        continue
      }

      if (!RETRYABLE_STATUS_CODES.has(status as number)) throw error

      const backoffMs =
        parseRetryAfterMs(error) ??
        baseBackoff * Math.pow(2, attempt) + randomJitterMs()

      attempt += 1
      if (attempt >= maxRetries) {
        if (status === 429) {
          throw new GeminiRateLimitError(
            `Gemini rate limit persisted after ${maxRetries} attempts${hasMultipleKeys ? ` (all ${pool.length} keys exhausted)` : ''}`,
            backoffMs
          )
        }
        throw lastError instanceof Error ? lastError : new Error(`Gemini ${status} persisted after ${maxRetries} attempts`)
      }

      await sleep(backoffMs)
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Gemini generateContent failed')
}

/**
 * Hard timeout (ms) for the entire Gemini generateContent operation
 * — INCLUDING all retries + backoffs. If exceeded we throw a friendly
 * error so the API route can show "try again" UX instead of the user
 * seeing the request hang for 5+ minutes.
 *
 * Image models get longer (Pro Image can legitimately take 60s).
 * Tunable via env so we can lift it on Pro tier.
 */
const TOTAL_TIMEOUT_TEXT_MS = parseInt(process.env.GEMINI_TOTAL_TIMEOUT_TEXT_MS || '90000', 10) || 90_000
const TOTAL_TIMEOUT_IMAGE_MS = parseInt(process.env.GEMINI_TOTAL_TIMEOUT_IMAGE_MS || '120000', 10) || 120_000

export class GeminiTimeoutError extends Error {
  status = 504
  constructor(model: string, ms: number) {
    super(`Image generation timed out after ${Math.round(ms / 1000)}s. The model may be overloaded — please try again in a moment.`)
    this.name = 'GeminiTimeoutError'
  }
}

function withHardTimeout<T>(promise: Promise<T>, ms: number, model: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new GeminiTimeoutError(model, ms)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId)
  }) as Promise<T>
}

export async function geminiGenerateContent(
  params: GenerateContentParameters
) {
  const limiter = pickLimiter(params.model)
  const isImageModel = params.model.includes('image') || params.model.includes('pro-image')
  const totalTimeoutMs = isImageModel ? TOTAL_TIMEOUT_IMAGE_MS : TOTAL_TIMEOUT_TEXT_MS
  // Wrap in hard timeout so a hung Gemini connection can never block the
  // request indefinitely. The bottleneck limiter still serializes calls.
  return withHardTimeout(
    limiter.schedule(() => generateWithBackoff(params)),
    totalTimeoutMs,
    params.model,
  )
}

async function embedWithBackoff(params: any) {
  const pool = initKeyPool()
  const hasMultipleKeys = pool.length > 1
  let attempt = 0
  let lastError: unknown = null

  while (attempt < GEMINI_MAX_RETRIES) {
    const client = getNextClient()
    try {
      if (Array.isArray(params.contents)) {
        // Batch not natively supported in this SDK version, loop over single
        return await Promise.all(params.contents.map((c: string) => 
          client.models.embedContent({ model: params.model, contents: c })
        ))
      } else {
        return await client.models.embedContent(params)
      }
    } catch (error) {
      lastError = error
      const status = getStatusCode(error)

      if (status === 429 && hasMultipleKeys) {
        const retryMs = parseRetryAfterMs(error)
        markKeyRateLimited(client, retryMs)
        const now = Date.now()
        if (pool.filter(s => now >= s.cooldownUntil).length > 0) {
          attempt++
          continue
        }
      }

      if (!RETRYABLE_STATUS_CODES.has(status as number)) throw error
      const backoffMs = parseRetryAfterMs(error) ?? BASE_BACKOFF_MS * Math.pow(2, attempt) + randomJitterMs()
      attempt += 1
      if (attempt >= GEMINI_MAX_RETRIES) throw lastError
      await sleep(backoffMs)
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Gemini embedContent failed')
}

export async function geminiEmbedContent(params: any) {
  // Use flash limiter for embeddings since it's fast
  return flashLimiter.schedule(() => embedWithBackoff(params))
}

/**
 * Get the current key pool stats (for debugging/monitoring).
 */
export function getKeyPoolStats(): { totalKeys: number; availableKeys: number; cooldownKeys: number } {
  const pool = initKeyPool()
  const now = Date.now()
  const available = pool.filter(s => now >= s.cooldownUntil).length
  return {
    totalKeys: pool.length,
    availableKeys: available,
    cooldownKeys: pool.length - available,
  }
}
