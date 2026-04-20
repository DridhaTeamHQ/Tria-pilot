/**
 * Reliable environment detection.
 *
 * Vercel incorrectly sets NODE_ENV='development' in some edge regions/builds.
 * VERCEL_ENV is the authoritative source: 'production' | 'preview' | 'development'.
 * Falls back to NODE_ENV if VERCEL_ENV is not set (local dev).
 */
export const isProduction: boolean = process.env.VERCEL_ENV
  ? process.env.VERCEL_ENV === 'production'
  : process.env.NODE_ENV === 'production'

export const isDev: boolean = !isProduction
