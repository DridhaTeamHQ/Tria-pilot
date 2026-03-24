function stripTrailingSlash(url: string) {
  return url.endsWith('/') ? url.slice(0, -1) : url
}

function ensureProtocol(url: string) {
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `https://${url}`
}

function normalizeHostCandidate(value: string | null): string | null {
  if (!value) return null

  const candidate = value.split(',')[0]?.trim().toLowerCase()
  if (!candidate) return null
  if (/[\/\\@\s]/.test(candidate)) return null

  const hostPattern =
    /^(localhost|127\.0\.0\.1)(:\d{1,5})?$|^(\[[0-9a-f:]+\]|([a-z0-9-]+\.)*[a-z0-9-]+)(:\d{1,5})?$/i

  return hostPattern.test(candidate) ? candidate : null
}

function getAllowedPublicHosts(): string[] {
  const rawValues = [
    process.env.NEXT_PUBLIC_SITE_URL,
    // eslint-disable-next-line no-restricted-syntax
    (process.env as any).SITE_URL,
    process.env.NEXT_PUBLIC_VERCEL_URL,
    process.env.VERCEL_URL,
    process.env.PUBLIC_SITE_HOST_ALLOWLIST,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(','))
    .map((value) => value.trim())
    .filter(Boolean)

  const hosts = rawValues
    .map((value) => {
      try {
        return new URL(ensureProtocol(value)).host.toLowerCase()
      } catch {
        return normalizeHostCandidate(value)
      }
    })
    .filter((value): value is string => Boolean(value))

  return Array.from(new Set(hosts))
}

function getTrustedRequestOrigin(request: Request): string | null {
  const protoHeader = request.headers.get('x-forwarded-proto') || ''
  const proto = protoHeader === 'http' || protoHeader === 'https'
    ? protoHeader
    : process.env.NODE_ENV === 'production'
      ? 'https'
      : 'http'

  const host = normalizeHostCandidate(
    request.headers.get('x-forwarded-host') || request.headers.get('host')
  )

  if (!host) return null

  const allowedHosts = getAllowedPublicHosts()
  const trustedByDefault =
    process.env.NODE_ENV !== 'production' ||
    host.endsWith('.vercel.app') ||
    host === 'localhost:3000' ||
    host === 'localhost' ||
    host.startsWith('127.0.0.1:')

  if (!trustedByDefault && allowedHosts.length > 0 && !allowedHosts.includes(host)) {
    return null
  }

  if (!trustedByDefault && allowedHosts.length === 0) {
    return null
  }

  return `${proto}://${host}`
}

/**
 * Public base URL for links that must work from emails (confirm/reset/change-email).
 *
 * Priority:
 * - NEXT_PUBLIC_SITE_URL (recommended; set to your production domain)
 * - SITE_URL (optional server-only alias)
 * - VERCEL_URL (auto; no protocol)
 * - window.location.origin (client fallback)
 */
export function getPublicSiteUrlClient(): string {
  const env =
    process.env.NEXT_PUBLIC_SITE_URL ||
    // eslint-disable-next-line no-restricted-syntax
    (process.env as any).SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    process.env.VERCEL_URL

  if (env) return stripTrailingSlash(ensureProtocol(env))
  if (typeof window !== 'undefined') return stripTrailingSlash(window.location.origin)
  return 'http://localhost:3000'
}

export function getPublicSiteUrlFromRequest(request: Request): string {
  const env =
    process.env.NEXT_PUBLIC_SITE_URL ||
    // eslint-disable-next-line no-restricted-syntax
    (process.env as any).SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    process.env.VERCEL_URL

  if (env) return stripTrailingSlash(ensureProtocol(env))

  const trustedOrigin = getTrustedRequestOrigin(request)
  if (trustedOrigin) return stripTrailingSlash(trustedOrigin)
  return 'http://localhost:3000'
}

export function joinPublicUrl(base: string, path: string) {
  const cleanBase = stripTrailingSlash(base)
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${cleanBase}${cleanPath}`
}

export function buildAuthConfirmUrl(base: string, nextPath: string) {
  const cleanNext = nextPath.startsWith('/') ? nextPath : `/${nextPath}`
  const encodedNext = encodeURIComponent(cleanNext)
  return joinPublicUrl(base, `/auth/confirm?next=${encodedNext}`)
}

