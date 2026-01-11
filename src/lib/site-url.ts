function stripTrailingSlash(url: string) {
  return url.endsWith('/') ? url.slice(0, -1) : url
}

function ensureProtocol(url: string) {
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `https://${url}`
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

  const proto = request.headers.get('x-forwarded-proto') || 'http'
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  if (host) return stripTrailingSlash(`${proto}://${host}`)
  return 'http://localhost:3000'
}

export function joinPublicUrl(base: string, path: string) {
  const cleanBase = stripTrailingSlash(base)
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${cleanBase}${cleanPath}`
}

