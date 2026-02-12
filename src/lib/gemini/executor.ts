import 'server-only'
import Bottleneck from 'bottleneck'
import { GoogleGenAI, type GenerateContentParameters } from '@google/genai'
import { getGeminiKey } from '@/lib/config/api-keys'

const GEMINI_MAX_RETRIES = 3
const BASE_BACKOFF_MS = 500

const proImageLimiter = new Bottleneck({
  maxConcurrent: 2,
  minTime: 500,
})

const flashLimiter = new Bottleneck({
  maxConcurrent: 4,
  minTime: 200,
})

let client: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: getGeminiKey() })
  }
  return client
}

function pickLimiter(model: string): Bottleneck {
  if (model.includes('gemini-3-pro-image-preview')) return proImageLimiter
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

async function generateWithBackoff(params: GenerateContentParameters) {
  let attempt = 0
  let lastError: unknown = null

  while (attempt < GEMINI_MAX_RETRIES) {
    try {
      return await getClient().models.generateContent(params)
    } catch (error) {
      lastError = error
      const status = getStatusCode(error)
      if (status !== 429) throw error

      const backoffMs =
        parseRetryAfterMs(error) ??
        BASE_BACKOFF_MS * Math.pow(2, attempt) + randomJitterMs()

      attempt += 1
      if (attempt >= GEMINI_MAX_RETRIES) {
        throw new GeminiRateLimitError(
          `Gemini rate limit persisted after ${GEMINI_MAX_RETRIES} attempts`,
          backoffMs
        )
      }

      await sleep(backoffMs)
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Gemini generateContent failed')
}

export async function geminiGenerateContent(
  params: GenerateContentParameters
) {
  const limiter = pickLimiter(params.model)
  return limiter.schedule(() => generateWithBackoff(params))
}
