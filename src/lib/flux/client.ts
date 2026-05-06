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
  | 'flux-2-pro'
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

export function getFluxKey(): string {
  const key = (process.env.FLUX_API_KEY || '').trim()
  if (!key) {
    throw new FluxError('FLUX_API_KEY not configured')
  }
  return key
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

async function submitJob(model: FluxModel, payload: Record<string, unknown>): Promise<SubmitResponse> {
  const url = `${BFL_BASE_URL}/${model}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-key': getFluxKey(),
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

async function pollJob(id: string, pollUrl?: string): Promise<PollResponse> {
  const url = pollUrl || `${BFL_BASE_URL}/get_result?id=${encodeURIComponent(id)}`
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'x-key': getFluxKey(),
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
async function submitAndAwait(
  model: FluxModel,
  payload: Record<string, unknown>,
  options?: { timeoutMs?: number },
): Promise<{ imageUrl: string; seed?: number; jobId: string }> {
  const submitted = await submitJob(model, payload)
  const deadline = Date.now() + (options?.timeoutMs || DEFAULT_TIMEOUT_MS)

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
    const result = await pollJob(submitted.id, submitted.polling_url)

    if (result.status === 'Ready' && result.result?.sample) {
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
   * Optional reference image as base64 (no data: prefix). When supplied,
   * FLUX.2 conditions the output on this image — used for clothing swap
   * by passing the person photo + a "swap the shirt to <X>" prompt.
   * FLUX.2 also supports multiple reference images via `inputImages`.
   */
  inputImage?: string
  /** Multiple reference images for multi-input conditioning (max 4) */
  inputImages?: string[]
  /** Aspect ratio (e.g. "1:1", "3:4", "9:16"). Defaults to source. */
  aspectRatio?: string
  /** Random seed for reproducibility */
  seed?: number
  /** Let BFL polish the prompt before generation. Default false. */
  promptUpsampling?: boolean
  /** 'png' or 'jpeg'. Default 'png'. */
  outputFormat?: 'png' | 'jpeg'
  /** 0 (strictest) .. 6 (most lenient). BFL default is 2. */
  safetyTolerance?: number
  /** Hard timeout for the entire operation (default 120s) */
  timeoutMs?: number
}

/**
 * FLUX.2 [pro] — high-quality generation with optional image conditioning.
 *
 * For clothing swap on the influencer side, pass:
 *   - inputImage: base64 of the influencer's photo
 *   - prompt: "Replace the person's outfit with <garment description>.
 *              Preserve face, hair, identity, pose, and background."
 *
 * Endpoint: POST https://api.bfl.ai/v1/flux-2-pro
 */
export async function flux2Generate(options: Flux2GenerateOptions): Promise<{
  imageUrl: string
  seed?: number
  jobId: string
}> {
  if (options.inputImages && options.inputImages.length > 4) {
    throw new FluxError('FLUX.2 accepts at most 4 input_images')
  }

  // Build payload — FLUX.2 accepts either input_image (single) or
  // input_images (array). Pass whichever is provided; fall back to
  // text-only generation when neither is supplied.
  const payload: Record<string, unknown> = {
    prompt: options.prompt,
    seed: options.seed,
    prompt_upsampling: options.promptUpsampling ?? false,
    output_format: options.outputFormat ?? 'png',
    safety_tolerance: options.safetyTolerance ?? 2,
  }
  if (options.inputImage) payload.input_image = options.inputImage
  if (options.inputImages && options.inputImages.length > 0) {
    payload.input_images = options.inputImages
  }
  if (options.aspectRatio) payload.aspect_ratio = options.aspectRatio

  return submitAndAwait('flux-2-pro', payload, { timeoutMs: options.timeoutMs })
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
