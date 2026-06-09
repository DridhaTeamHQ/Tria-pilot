/**
 * BLACK FOREST LABS — FLUX API CLIENT
 *
 * Lightweight wrapper around the BFL async REST API.
 *
 * Endpoints we use:
 *   POST https://api.bfl.ai/v1/<model>          — submit a generation
 *   GET  https://api.bfl.ai/v1/get_result?id=…  — poll for result
 *
 * Auth: header `x-key: $FLUX_API_KEY`.
 *
 * Models relevant to Kiwikoo:
 *   - flux-pro-1.1           — text-to-image (generic generation)
 *   - flux-pro-1.0-fill      — INPAINTING (the right tool for clothing swap)
 *   - flux-kontext-pro       — image-to-image edits with text guidance
 *
 * Why flux-pro-1.0-fill for try-on:
 *   Fill takes the original photo + a binary mask (white = replace,
 *   black = keep) + a text prompt of what to put in the masked area.
 *   For clothing swap this means: mask the existing garment, prompt
 *   "wearing <new garment description>" — Fill regenerates only the
 *   masked region while preserving face, hair, background, pose.
 *   Far higher identity fidelity than full-image generation.
 */

import 'server-only'

const BFL_BASE_URL = 'https://api.bfl.ai/v1'
const POLL_INTERVAL_MS = 1500
const DEFAULT_TIMEOUT_MS = 120_000  // 2 min — Fill is fast (5-15s) but allow headroom

export type FluxModel =
  // FLUX.2 family — newer, better at instruction following + multi-image
  | 'flux-2-max'           // highest quality, slower, more credits
  | 'flux-2-pro'           // recommended default
  | 'flux-2-flex'
  // FLUX.1 family
  | 'flux-pro-1.1'
  | 'flux-pro-1.1-ultra'
  | 'flux-pro-1.0-fill'
  | 'flux-pro-1.0-canny'
  | 'flux-pro-1.0-depth'
  | 'flux-kontext-pro'
  | 'flux-kontext-max'

export class FluxError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly raw?: unknown,
  ) {
    super(message)
    this.name = 'FluxError'
  }
}

// ── KEY POOL ─────────────────────────────────────────────────────────────────
// BFL keys are independent accounts with independent rate limits. Running
// jobs on different keys lets us parallelize without hitting per-key caps.
// We track in-flight job counts per key and pick the least-busy one.
//
// IMPORTANT: BFL scopes get_result by submitting key, so submit + poll for
// a single job MUST use the same key. acquireFluxKey() returns the chosen
// key and the caller threads it through.

let cachedKeyPool: string[] | null = null
const keyInFlight = new Map<string, number>()
/** Wall-clock ms when each key becomes usable again (set on 429/quota errors). */
const keyCooldownUntil = new Map<string, number>()
/** Keys that returned 402 "insufficient credits" — depleted accounts. Used to
 *  surface an HONEST "out of credits" error instead of a vague "pool saturated"
 *  one when every key is broke. Cleared if a key later succeeds. */
const keyCreditDepleted = new Set<string>()

/** Per-key concurrent-job ceiling. BFL allows ~24/key; we stay conservative. */
const PER_KEY_MAX = Number(process.env.FLUX_PER_KEY_MAX || 3)
/** Cooldown when a key returns 429 / over-quota. */
const KEY_COOLDOWN_MS = Number(process.env.FLUX_KEY_COOLDOWN_MS || 60_000)
/** Hard cap on total concurrent FLUX jobs across the whole process. */
const GLOBAL_MAX_CONCURRENT = Number(process.env.FLUX_GLOBAL_MAX || 0) // 0 = derive from pool size
/** Max time a job will wait for a slot before failing. */
const ACQUIRE_TIMEOUT_MS = Number(process.env.FLUX_ACQUIRE_TIMEOUT_MS || 60_000)

function loadKeyPool(): string[] {
  if (cachedKeyPool) return cachedKeyPool
  const fromMulti = (process.env.FLUX_API_KEYS || '')
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0)
  const single = (process.env.FLUX_API_KEY || '').trim()

  // Dedup, preserve order: multi first, then single fallback if not already in it.
  const seen = new Set<string>()
  const pool: string[] = []
  for (const k of fromMulti) {
    if (!seen.has(k)) { seen.add(k); pool.push(k) }
  }
  if (single && !seen.has(single)) pool.push(single)

  cachedKeyPool = pool
  return pool
}

function isKeyCoolingDown(key: string): boolean {
  const until = keyCooldownUntil.get(key)
  if (!until) return false
  if (Date.now() >= until) {
    keyCooldownUntil.delete(key)
    return false
  }
  return true
}

/**
 * Mark a key as rate-limited for KEY_COOLDOWN_MS. Called externally when
 * the FLUX API returns 429 / quota errors so we stop hammering that key.
 * Pass reason:'credit' for 402 (no credits) so we can surface an honest
 * "out of credits" error when the whole pool is depleted.
 */
export function markFluxKeyCooldown(key: string, durationMs?: number, reason?: 'rate' | 'credit'): void {
  const until = Date.now() + (durationMs || KEY_COOLDOWN_MS)
  keyCooldownUntil.set(key, until)
  if (reason === 'credit') keyCreditDepleted.add(key)
}

/** Clear depletion/cooldown state for a key that just succeeded. */
function markFluxKeyHealthy(key: string): void {
  keyCreditDepleted.delete(key)
  keyCooldownUntil.delete(key)
}

/** True when EVERY key in the pool is currently flagged out-of-credits (402). */
function allKeysOutOfCredits(): boolean {
  const pool = loadKeyPool()
  return pool.length > 0 && pool.every((k) => keyCreditDepleted.has(k))
}

/** Total slots available across the pool, considering cooldowns. */
function totalAvailableSlots(): number {
  const pool = loadKeyPool()
  let slots = 0
  for (const k of pool) {
    if (isKeyCoolingDown(k)) continue
    const inFlight = keyInFlight.get(k) || 0
    if (inFlight < PER_KEY_MAX) slots += PER_KEY_MAX - inFlight
  }
  return slots
}

/** Effective global concurrency cap. */
function globalCap(): number {
  if (GLOBAL_MAX_CONCURRENT > 0) return GLOBAL_MAX_CONCURRENT
  return loadKeyPool().length * PER_KEY_MAX
}

/** Total in-flight jobs across all keys. */
function totalInFlight(): number {
  let n = 0
  for (const v of keyInFlight.values()) n += v
  return n
}

// Per-process random offset into the key pool. Each Vercel function
// instance gets a different offset at cold-start, so concurrent
// instances START scanning the key list from different positions.
// Without this, every fresh instance sees all keys as "0 in-flight"
// and picks key #1 — concentrating load on the first keys and
// rate-limiting them while later keys idle. The offset spreads
// concurrent instances across the whole pool.
const KEY_SCAN_OFFSET = Math.floor(Math.random() * 997)

/**
 * Pick the least-busy key from the pool that is NOT cooling down and has
 * room under PER_KEY_MAX. Returns null if every key is at capacity or
 * cooling down (caller should wait).
 *
 * Ties (equal in-flight count) are broken by a per-instance rotating
 * offset so concurrent serverless instances don't all converge on the
 * same key.
 */
function pickLeastBusyKey(): string | null {
  const pool = loadKeyPool()
  if (pool.length === 0) return null
  let best: string | null = null
  let bestCount = Infinity
  // Scan the pool starting from a per-instance rotated position.
  for (let i = 0; i < pool.length; i++) {
    const k = pool[(i + KEY_SCAN_OFFSET) % pool.length]
    if (isKeyCoolingDown(k)) continue
    const count = keyInFlight.get(k) || 0
    if (count >= PER_KEY_MAX) continue
    // Strict < means the FIRST key at the lowest count wins — and
    // because the scan order is offset per-instance, "first" differs
    // across instances, spreading concurrent load.
    if (count < bestCount) {
      best = k
      bestCount = count
    }
  }
  return best
}

/**
 * Acquire a key for the duration of a single job. Returns the key and a
 * release() function the caller MUST call (in finally) to decrement the
 * in-flight counter.
 *
 * If the global concurrency cap is reached (or every key is cooling
 * down / saturated), waits up to ACQUIRE_TIMEOUT_MS for a slot before
 * throwing FluxError. This is what protects the process from queueing
 * 200+ jobs in memory when traffic spikes.
 */
export async function acquireFluxKey(): Promise<{ key: string; release: () => void }> {
  if (loadKeyPool().length === 0) {
    throw new FluxError('No FLUX API keys configured (set FLUX_API_KEY or FLUX_API_KEYS)')
  }

  // HONEST FAST-FAIL: if every key is flagged out-of-credits, don't make the
  // user wait 60s for a "pool saturated" timeout — tell them the truth now.
  // This is NON-retryable (402) so the UI shows "out of credits / top up
  // billing" instead of the misleading "AI at full capacity, try again in 5s".
  if (allKeysOutOfCredits()) {
    throw new FluxError(
      'All FLUX API keys are out of credits. Top up your Black Forest Labs billing to resume image generation.',
      402,
    )
  }

  const deadline = Date.now() + ACQUIRE_TIMEOUT_MS
  let attempt = 0

  while (true) {
    // First check global cap, then per-key availability
    if (totalInFlight() < globalCap()) {
      const key = pickLeastBusyKey()
      if (key) {
        keyInFlight.set(key, (keyInFlight.get(key) || 0) + 1)
        let released = false
        return {
          key,
          release: () => {
            if (released) return
            released = true
            const cur = keyInFlight.get(key) || 0
            if (cur <= 1) keyInFlight.delete(key)
            else keyInFlight.set(key, cur - 1)
          },
        }
      }
    }

    if (Date.now() >= deadline) {
      // If the reason we couldn't get a slot is that the funded keys all
      // depleted mid-wait, surface the honest credits error.
      if (allKeysOutOfCredits()) {
        throw new FluxError(
          'All FLUX API keys are out of credits. Top up your Black Forest Labs billing to resume image generation.',
          402,
        )
      }
      throw new FluxError(
        `FLUX pool saturated — all keys at capacity (${totalInFlight()}/${globalCap()} in-flight, ${totalAvailableSlots()} slots available). Try again shortly.`,
        503,
      )
    }

    // Backoff: 200ms, 400ms, 800ms, capped at 1500ms
    attempt++
    const wait = Math.min(1500, 200 * Math.pow(2, Math.min(attempt - 1, 3)))
    await new Promise((r) => setTimeout(r, wait))
  }
}

/** Synchronous variant — fails immediately if no slot is free. */
function tryAcquireFluxKeySync(): { key: string; release: () => void } | null {
  if (loadKeyPool().length === 0) return null
  if (totalInFlight() >= globalCap()) return null
  const key = pickLeastBusyKey()
  if (!key) return null
  keyInFlight.set(key, (keyInFlight.get(key) || 0) + 1)
  let released = false
  return {
    key,
    release: () => {
      if (released) return
      released = true
      const cur = keyInFlight.get(key) || 0
      if (cur <= 1) keyInFlight.delete(key)
      else keyInFlight.set(key, cur - 1)
    },
  }
}

/** Backwards-compat: returns ANY key (least-busy) without tracking. */
export function getFluxKey(): string {
  const key = pickLeastBusyKey()
  if (!key) throw new FluxError('FLUX_API_KEY not configured')
  return key
}

/** Diagnostic: pool size + per-key in-flight counts + cooldown state. */
export function getFluxKeyPoolStats(): {
  size: number
  totalInFlight: number
  globalCap: number
  perKeyMax: number
  inFlight: Record<string, number>
  cooldownMsRemaining: Record<string, number>
} {
  const pool = loadKeyPool()
  const inFlight: Record<string, number> = {}
  const cooldownMsRemaining: Record<string, number> = {}
  const now = Date.now()
  for (const k of pool) {
    // mask all but last 4 chars
    const masked = k.length > 8 ? `…${k.slice(-4)}` : '…'
    inFlight[masked] = keyInFlight.get(k) || 0
    const until = keyCooldownUntil.get(k)
    if (until && until > now) cooldownMsRemaining[masked] = until - now
  }
  return {
    size: pool.length,
    totalInFlight: totalInFlight(),
    globalCap: globalCap(),
    perKeyMax: PER_KEY_MAX,
    inFlight,
    cooldownMsRemaining,
  }
}

interface SubmitResponse {
  id: string
  polling_url?: string
}

interface PollResponse {
  id: string
  status:
    | 'Pending'
    | 'Request Moderated'
    | 'Content Moderated'
    | 'Ready'
    | 'Error'
    | 'Task not found'
  result?: {
    sample?: string         // signed URL (10-min TTL) of the generated image
    seed?: number
    prompt?: string
  } | null
  error?: string | null
}

async function submitJob(model: FluxModel, payload: Record<string, unknown>, apiKey: string): Promise<SubmitResponse> {
  const url = `${BFL_BASE_URL}/${model}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-key': apiKey,
    },
    body: JSON.stringify(payload),
    // 30s budget for the SUBMIT call alone (the actual generation is async)
    signal: AbortSignal.timeout(30_000),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new FluxError(
      `FLUX submit failed (${res.status}): ${text.slice(0, 300)}`,
      res.status,
      text,
    )
  }

  const data = (await res.json()) as SubmitResponse
  if (!data?.id) {
    throw new FluxError('FLUX submit response missing job id', undefined, data)
  }
  return data
}

async function pollJob(id: string, apiKey: string, pollUrl?: string): Promise<PollResponse> {
  const url = pollUrl || `${BFL_BASE_URL}/get_result?id=${encodeURIComponent(id)}`
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'x-key': apiKey,
    },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new FluxError(`FLUX poll failed (${res.status}): ${text.slice(0, 300)}`, res.status, text)
  }
  return (await res.json()) as PollResponse
}

/**
 * Submit a generation, poll until done, return the signed image URL.
 * Throws FluxError on moderation rejection, timeout, or generation error.
 */
function isRateLimitError(err: unknown): boolean {
  if (err instanceof FluxError) {
    if (err.status === 429) return true
    const msg = (err.message || '').toLowerCase()
    if (msg.includes('rate limit') || msg.includes('quota') || msg.includes('too many requests')) return true
  }
  return false
}

/**
 * A key with NO credits (402 "Insufficient credits"). These keys are dead for
 * the rest of the process until topped up — we cool them down for a long
 * window so the pool stops picking them and uses the funded keys instead.
 */
function isInsufficientCreditsError(err: unknown): boolean {
  if (err instanceof FluxError) {
    if (err.status === 402) return true
    const msg = (err.message || '').toLowerCase()
    if (msg.includes('insufficient credit') || msg.includes('payment required')) return true
  }
  return false
}

/** Depleted keys stay out of rotation this long (default 30 min). */
const CREDIT_COOLDOWN_MS = Number(process.env.FLUX_CREDIT_COOLDOWN_MS || 30 * 60_000)

async function submitAndAwait(
  model: FluxModel,
  payload: Record<string, unknown>,
  options?: { timeoutMs?: number },
): Promise<{ imageUrl: string; seed?: number; jobId: string }> {
  // Rotate across the pool on 429 (rate limit) OR 402 (no credits): mark the
  // bad key cooling-down and try a different one. Rotations scale with pool
  // size (capped at 6) so a request can skip past several depleted keys to
  // reach a funded one — important when only some keys have credits.
  const MAX_KEY_ROTATIONS = Math.max(2, Math.min(6, loadKeyPool().length))
  let lastErr: unknown = null

  for (let rotation = 0; rotation < MAX_KEY_ROTATIONS; rotation++) {
    // Acquire a key for the entire job — submit + poll must use the SAME key
    // because BFL scopes get_result by submitting account. acquireFluxKey
    // waits for a slot if the pool is saturated (up to ACQUIRE_TIMEOUT_MS).
    const { key, release } = await acquireFluxKey()
    try {
      const submitted = await submitJob(model, payload, key)
      const deadline = Date.now() + (options?.timeoutMs || DEFAULT_TIMEOUT_MS)

      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
        const result = await pollJob(submitted.id, key, submitted.polling_url)

        if (result.status === 'Ready' && result.result?.sample) {
          markFluxKeyHealthy(key) // clear any stale depletion flag — this key works
          return { imageUrl: result.result.sample, seed: result.result.seed, jobId: submitted.id }
        }

        if (result.status === 'Pending') {
          continue
        }

        if (
          result.status === 'Content Moderated' ||
          result.status === 'Request Moderated'
        ) {
          throw new FluxError('FLUX content moderation blocked the request', 400, result)
        }

        if (result.status === 'Error') {
          throw new FluxError(`FLUX generation failed: ${result.error || 'unknown'}`, 500, result)
        }

        if (result.status === 'Task not found') {
          throw new FluxError('FLUX job vanished (Task not found)', 500, result)
        }
      }

      throw new FluxError(`FLUX generation timed out after ${options?.timeoutMs || DEFAULT_TIMEOUT_MS}ms`, 504)
    } catch (err) {
      lastErr = err
      // Depleted key (402 no credits) → long cooldown so the pool stops
      // picking it, then rotate to a funded key.
      if (isInsufficientCreditsError(err)) {
        markFluxKeyCooldown(key, CREDIT_COOLDOWN_MS, 'credit')
      }
      if (isInsufficientCreditsError(err) && rotation < MAX_KEY_ROTATIONS - 1) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`💳 FLUX key …${key.slice(-4)} has NO credits — cooling down ${Math.round(CREDIT_COOLDOWN_MS / 60000)}min, rotating to a funded key`)
        }
        release()
        continue
      }
      // On rate-limit, mark this specific key cooling-down and try another
      if (isRateLimitError(err) && rotation < MAX_KEY_ROTATIONS - 1) {
        markFluxKeyCooldown(key)
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`⚠️ FLUX key …${key.slice(-4)} hit rate limit — cooling down ${KEY_COOLDOWN_MS}ms, rotating to next key`)
        }
        release()
        continue
      }
      throw err
    } finally {
      release()
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error('FLUX submitAndAwait failed')
}

// ── Public API ──────────────────────────────────────────────────────────

export interface FluxFillOptions {
  /** Base image as base64 (no data: prefix) — the photo to edit */
  imageBase64: string
  /** Binary mask as base64 (no data: prefix) — white pixels = replace, black = keep */
  maskBase64: string
  /** Text describing what to render in the masked area */
  prompt: string
  /** 0-100, higher = closer to prompt. Default 50 (FLUX-recommended). */
  steps?: number
  /** Random seed for reproducibility. Default random. */
  seed?: number
  /** Optional negative-style prompt */
  promptUpsampling?: boolean
  /** Hard timeout for the entire operation (default 120s) */
  timeoutMs?: number
}

/**
 * FLUX Fill — inpainting for clothing swap.
 * The mask must be the same dimensions as the input image.
 */
export async function fluxFill(options: FluxFillOptions): Promise<{
  imageUrl: string
  seed?: number
  jobId: string
}> {
  const model = (process.env.FLUX_TRYON_MODEL as FluxModel) || 'flux-pro-1.0-fill'

  return submitAndAwait(
    model,
    {
      image: options.imageBase64,
      mask: options.maskBase64,
      prompt: options.prompt,
      steps: options.steps ?? 50,
      prompt_upsampling: options.promptUpsampling ?? false,
      seed: options.seed,
      guidance: 60,           // Fill default
      output_format: 'png',
      safety_tolerance: 2,    // 0=strictest .. 6=most lenient; 2 is BFL default
    },
    { timeoutMs: options.timeoutMs },
  )
}

export interface FluxKontextOptions {
  /** Base image as base64 (no data: prefix) */
  imageBase64: string
  /** Edit prompt (e.g. "swap to a red leather jacket") */
  prompt: string
  /** Aspect ratio override (e.g. "3:4", "1:1"). Defaults to source. */
  aspectRatio?: string
  seed?: number
  promptUpsampling?: boolean
  timeoutMs?: number
}

/**
 * FLUX Kontext Pro — image-to-image edit with a text prompt.
 * Useful when we don't have a clean mask (let the model figure out
 * what to change). Higher creative variance than Fill.
 */
export async function fluxKontext(options: FluxKontextOptions): Promise<{
  imageUrl: string
  seed?: number
  jobId: string
}> {
  return submitAndAwait(
    'flux-kontext-pro',
    {
      input_image: options.imageBase64,
      prompt: options.prompt,
      aspect_ratio: options.aspectRatio,
      seed: options.seed,
      prompt_upsampling: options.promptUpsampling ?? false,
      output_format: 'png',
      safety_tolerance: 2,
    },
    { timeoutMs: options.timeoutMs },
  )
}

// ── FLUX.2 [pro] ─────────────────────────────────────────────────────────

export interface Flux2GenerateOptions {
  /** Text prompt describing what to generate / how to edit */
  prompt: string
  /**
   * Reference images (base64 strings, no data: prefix). FLUX.2 takes
   * up to 8 images via separate fields `input_image`, `input_image_2`,
   * ..., `input_image_8`. Pass them as a flat array; we map them to
   * the right field names.
   *
   * For clothing swap, typical order:
   *   inputImages[0] = influencer photo (the person to dress)
   *   inputImages[1] = product photo (the garment to put on them)
   */
  inputImages?: string[]
  /** Output width in pixels. Min 64. Default 0 (BFL picks a sensible size). */
  width?: number
  /** Output height in pixels. Min 64. Default 0. */
  height?: number
  /** Random seed for reproducibility */
  seed?: number
  /** 'jpeg' (default), 'png', or 'webp'. */
  outputFormat?: 'jpeg' | 'png' | 'webp'
  /** 0 (strictest) .. 5 (most lenient). BFL default is 2. */
  safetyTolerance?: number
  /** Hard timeout for the entire operation (default 120s) */
  timeoutMs?: number
  /** Override FLUX_TRYON_MODEL env var. Useful for fallback chains. */
  model?: 'flux-2-max' | 'flux-2-pro' | 'flux-2-flex'
}

const FLUX2_MAX_INPUT_IMAGES = 8

/**
 * FLUX.2 [pro] — high-quality generation with optional image conditioning.
 *
 * Endpoint: POST https://api.bfl.ai/v1/flux-2-pro
 *
 * For clothing swap on the influencer side, pass:
 *   - inputImages[0]: base64 of the influencer photo
 *   - inputImages[1]: base64 of the product photo (optional)
 *   - prompt: "Replace the person's outfit with <garment description>.
 *              Preserve face, hair, identity, pose, and background."
 *
 * Note: FLUX.2 has its own schema — different from FLUX.1. It uses
 * `input_image`, `input_image_2`, ... `input_image_8` for multi-image
 * conditioning (NOT an `input_images` array), and uses `width`/`height`
 * instead of `aspect_ratio`. There is no `prompt_upsampling` field on
 * FLUX.2.
 */
export async function flux2Generate(options: Flux2GenerateOptions): Promise<{
  imageUrl: string
  seed?: number
  jobId: string
}> {
  const images = options.inputImages || []
  if (images.length > FLUX2_MAX_INPUT_IMAGES) {
    throw new FluxError(`FLUX.2 accepts at most ${FLUX2_MAX_INPUT_IMAGES} input images`)
  }

  // FLUX.2 spec accepts safety_tolerance in [0, 5]. Default to 5 (most
  // lenient) — try-on products include graphic-print apparel (band tees,
  // Marvel/Venom prints, skulls) that the strict filter wrongly flags.
  const safety = Math.min(5, Math.max(0, options.safetyTolerance ?? 5))

  const payload: Record<string, unknown> = {
    prompt: options.prompt,
    output_format: options.outputFormat ?? 'jpeg',
    safety_tolerance: safety,
  }
  if (typeof options.seed === 'number') payload.seed = options.seed
  if (options.width && options.width >= 64) payload.width = options.width
  if (options.height && options.height >= 64) payload.height = options.height

  // Map inputImages[] to input_image, input_image_2, ..., input_image_8
  for (let i = 0; i < images.length; i++) {
    const fieldName = i === 0 ? 'input_image' : `input_image_${i + 1}`
    payload[fieldName] = images[i]
  }

  // Model resolution: explicit override → FLUX_TRYON_MODEL env → flux-2-pro
  const configuredModel = (process.env.FLUX_TRYON_MODEL || '').trim() as FluxModel
  const FLUX2_MODELS: Set<FluxModel> = new Set(['flux-2-max', 'flux-2-pro', 'flux-2-flex'])
  const model: FluxModel = options.model && FLUX2_MODELS.has(options.model)
    ? options.model
    : FLUX2_MODELS.has(configuredModel) ? configuredModel : 'flux-2-pro'

  return submitAndAwait(model, payload, { timeoutMs: options.timeoutMs })
}

/**
 * Fetch a FLUX result URL and return a base64 string. The signed URL
 * has a 10-minute TTL — for anything we want to persist, download
 * immediately and write to Supabase storage.
 */
export async function downloadFluxImage(url: string): Promise<{ base64: string; mime: string }> {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) })
  if (!res.ok) {
    throw new FluxError(`Failed to download FLUX image (${res.status})`, res.status)
  }
  const mime = res.headers.get('content-type') || 'image/png'
  const buf = await res.arrayBuffer()
  return { base64: Buffer.from(buf).toString('base64'), mime }
}
