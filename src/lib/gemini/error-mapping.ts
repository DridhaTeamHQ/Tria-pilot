/**
 * GEMINI ERROR MAPPING
 *
 * Translates raw Gemini SDK errors into HTTP status codes + user-friendly
 * messages. Used by every API route that calls Gemini so the frontend
 * gets actionable errors instead of cryptic stack traces.
 */

import { GeminiRateLimitError, GeminiTimeoutError } from './executor'

export interface GeminiErrorResponse {
  status: number
  body: { error: string; code: string; retryAfter?: number }
}

const SAFETY_KEYWORDS = [
  'safety', 'blocked', 'harm_category', 'sexual', 'harassment', 'hate',
  'dangerous', 'violence', 'csai', 'minor', 'nudity',
]

const QUOTA_KEYWORDS = ['quota', 'billing', 'permission', 'unavailable', 'free tier']

export function mapGeminiError(err: unknown): GeminiErrorResponse {
  const message = err instanceof Error ? err.message : String(err)
  const lower = message.toLowerCase()

  if (err instanceof GeminiTimeoutError) {
    return {
      status: 504,
      body: {
        error: err.message,
        code: 'gemini_timeout',
      },
    }
  }

  if (err instanceof GeminiRateLimitError) {
    return {
      status: 429,
      body: {
        error: 'Image generation is hitting rate limits. Please wait a few seconds and try again.',
        code: 'gemini_rate_limit',
        retryAfter: Math.round(((err as any).retryAfterMs || 30_000) / 1000),
      },
    }
  }

  // Quota / billing / model-not-available
  if (QUOTA_KEYWORDS.some((k) => lower.includes(k))) {
    return {
      status: 503,
      body: {
        error: 'Image generation is temporarily unavailable. The service may be at capacity — try again shortly.',
        code: 'gemini_unavailable',
      },
    }
  }

  // Safety filter blocked
  if (SAFETY_KEYWORDS.some((k) => lower.includes(k))) {
    return {
      status: 422,
      body: {
        error:
          'The generation was blocked by content safety filters. Try rephrasing the prompt or using a different reference image.',
        code: 'gemini_safety_blocked',
      },
    }
  }

  // Empty / no-image response (model returned only text, often a refusal)
  if (lower.includes('did not return') || lower.includes('no editable region')) {
    return {
      status: 422,
      body: {
        error: message,
        code: 'gemini_no_image',
      },
    }
  }

  // Generic 5xx fallback
  return {
    status: 500,
    body: {
      error: message || 'Image generation failed unexpectedly. Please try again.',
      code: 'gemini_unknown',
    },
  }
}
