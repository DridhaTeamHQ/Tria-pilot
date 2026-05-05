/**
 * SECURITY SANITIZERS
 *
 * Helpers to sanitize user input before it flows into PostgREST filter
 * expressions, URL paths, or other contexts where injection is possible.
 */

/**
 * Escape characters that have special meaning inside a PostgREST `.or()`
 * or `.filter()` expression. The PostgREST grammar treats `,` `(` `)` as
 * delimiters, and `*` is the wildcard in `ilike`.
 *
 * For free-text search, the safest approach is to allow only a small
 * letter/number/whitespace set and strip everything else. This matches
 * what e-commerce search bars do in practice.
 */
export function sanitizeSearchTerm(raw: string, maxLength = 100): string {
  if (!raw) return ''
  // Strip control chars + dangerous PostgREST chars
  let cleaned = raw
    .replace(/[\x00-\x1F\x7F]/g, '') // control chars
    .replace(/[%_*,()\\]/g, '')      // PostgREST grammar + ilike wildcards
    .replace(/['"`]/g, '')           // quote chars (defense in depth)
    .trim()
  if (cleaned.length > maxLength) cleaned = cleaned.slice(0, maxLength)
  return cleaned
}

/**
 * Validate that a value is a valid UUID v4-style string. Returns the
 * lowercased UUID, or `null` if invalid. Use this on every URL `[id]`
 * param BEFORE interpolating into a PostgREST query — even when the
 * id is expected to come from your own DB. Defense in depth.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function asUuid(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return UUID_RE.test(trimmed) ? trimmed.toLowerCase() : null
}

/**
 * Throw with a 400-friendly error if the value isn't a UUID. Used in
 * route handlers where a malformed UUID is a programming-error / abuse.
 */
export function requireUuid(value: unknown, fieldName = 'id'): string {
  const uuid = asUuid(value)
  if (!uuid) {
    throw new Error(`Invalid ${fieldName} — must be a UUID`)
  }
  return uuid
}
