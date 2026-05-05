/**
 * SAFE ERROR RESPONSE HELPER
 *
 * Wraps the common pattern:
 *
 *   return NextResponse.json(
 *     { error: error instanceof Error ? error.message : 'Internal server error' },
 *     { status: 500 }
 *   )
 *
 * which leaks SDK internals + stack-trace-derived details to clients
 * in production. Use `safeErrorResponse()` instead — in production it
 * returns a generic message; in development it surfaces the real error
 * so debugging stays fast.
 */

import { NextResponse } from 'next/server'

export interface SafeErrorOptions {
  /** What to log to console.error */
  logTag: string
  /** Override the generic prod message */
  publicMessage?: string
  /** HTTP status (default 500) */
  status?: number
  /** Extra fields to merge into the JSON body */
  extra?: Record<string, unknown>
}

export function safeErrorResponse(error: unknown, options: SafeErrorOptions): NextResponse {
  console.error(`[${options.logTag}]`, error)

  const isDev = process.env.NODE_ENV !== 'production'
  const status = options.status ?? 500
  const generic = options.publicMessage ?? 'Internal server error'

  // In dev, surface the real error so devs can debug.
  // In prod, only surface a generic message — never the raw SDK error,
  // never the stack, never internal paths.
  const message = isDev && error instanceof Error ? error.message : generic

  return NextResponse.json(
    {
      error: message,
      ...(options.extra || {}),
    },
    { status },
  )
}
