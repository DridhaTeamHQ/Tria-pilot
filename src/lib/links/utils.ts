function normalizeHost(host: string): string {
  return host.trim().toLowerCase()
}

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url
}

function ensureProtocol(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `https://${url}`
}

function hostMatches(host: string, candidate: string): boolean {
  return host === candidate || host.endsWith(`.${candidate}`)
}

function isUnsafePublicHost(hostname: string): boolean {
  return isBlockedHost(hostname)
}

function sanitizeCandidateBaseUrl(url: string | null): string | null {
  if (!url) return null

  try {
    const parsed = new URL(stripTrailingSlash(ensureProtocol(url)))
    if (process.env.NODE_ENV === 'production' && isUnsafePublicHost(parsed.hostname)) {
      return null
    }
    return stripTrailingSlash(parsed.toString())
  } catch {
    return null
  }
}

function getConfiguredPublicBaseUrl(): string | null {
  const value =
    process.env.NEXT_PUBLIC_LINK_MASK_BASE_URL ||
    // eslint-disable-next-line no-restricted-syntax
    (process.env as any).LINK_MASK_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    // eslint-disable-next-line no-restricted-syntax
    (process.env as any).APP_URL ||
    // eslint-disable-next-line no-restricted-syntax
    (process.env as any).SITE_URL

  return sanitizeCandidateBaseUrl(value ? String(value) : null)
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return false
  }

  const [a, b] = parts
  if (a === 10 || a === 127 || a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  return false
}

function isBlockedHost(hostname: string): boolean {
  const host = normalizeHost(hostname)
  return (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.includes(':') ||
    isPrivateIpv4(host)
  )
}

/**
 * Generate full masked URL from link code
 * Fully automatic - uses environment variables or request origin
 */
export function getMaskedUrl(linkCode: string, requestOrigin?: string): string {
  let baseUrl = getConfiguredPublicBaseUrl()
  
  if (!baseUrl) {
    if (requestOrigin) {
      // Try to use request origin if available (for server-side)
      baseUrl = sanitizeCandidateBaseUrl(requestOrigin)
    }

    if (!baseUrl && process.env.NODE_ENV === 'production') {
      baseUrl = 'https://kiwikoo.com'
    } else if (process.env.NODE_ENV === 'development') {
      // Only allow localhost in development
      baseUrl = 'http://localhost:3000'
    } else {
      // Fully automatic: throw error if no URL can be determined
      // This ensures it always uses the actual domain without hardcoding
      throw new Error('Unable to determine base URL. Set NEXT_PUBLIC_APP_URL or ensure request origin is available.')
    }
  }
  
  return `${baseUrl}/l/${linkCode}`
}

/**
 * Validate original URL format
 */
export function validateOriginalUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    // Only allow http and https protocols
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && !isBlockedHost(parsed.hostname)
  } catch {
    return false
  }
}

/**
 * Sanitize redirect URL to prevent open redirects.
 *
 * Defense layers:
 *   1. http(s) protocol only (no javascript:, data:, etc.)
 *   2. Block private IPs / loopback / *.local / *.internal
 *   3. Domain allowlist — only redirect to hosts on REDIRECT_ALLOWED_HOSTS env var,
 *      or to known marketplace domains (Amazon, Flipkart, Myntra, etc.).
 *      If the env var is unset, the legacy behavior (allow any non-blocked host)
 *      kicks in for backward compatibility — set REDIRECT_ALLOWED_HOSTS in prod.
 */
export function sanitizeRedirectUrl(url: string): string | null {
  try {
    const parsed = new URL(ensureProtocol(url.trim()))
    const host = parsed.hostname.toLowerCase()
    const knownMarketplaceHosts = [
      'amazon.com',
      'amazon.in',
      'amzn.to',
      'flipkart.com',
      'myntra.com',
      'ajio.com',
      'nykaa.com',
      'meesho.com',
    ]
    const isKnownMarketplaceHost = knownMarketplaceHosts.some((candidate) => hostMatches(host, candidate))

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null
    }

    if (isBlockedHost(parsed.hostname)) {
      return null
    }

    // SECURITY: in production we REQUIRE REDIRECT_ALLOWED_HOSTS to be set.
    // Without an explicit allowlist, /l/[linkCode] is an open redirect —
    // a phishing endpoint hanging off Kiwikoo's domain that will rewrite
    // the URL bar to *any* attacker-chosen domain. Refusing the redirect
    // when the allowlist is missing in production is fail-closed.
    const allowlistEnv = (process.env.REDIRECT_ALLOWED_HOSTS || '').trim()
    if (allowlistEnv.length === 0) {
      if (isKnownMarketplaceHost) {
        return parsed.toString()
      }

      if (process.env.NODE_ENV === 'production') {
        // Fail closed in prod — explicit configuration required.
        return null
      }
      // Dev: allow with a warning (logged once per process is good enough).
      if (!hasWarnedAboutRedirectAllowlist) {
        console.warn(
          '[security] REDIRECT_ALLOWED_HOSTS is not set. Open redirects are technically possible. Set this env var before going to production.',
        )
        hasWarnedAboutRedirectAllowlist = true
      }
    } else {
      const allowed = allowlistEnv
        .split(',')
        .map((h) => h.trim().toLowerCase())
        .filter(Boolean)
      const ok = allowed.some((candidate) => hostMatches(host, candidate)) || isKnownMarketplaceHost
      if (!ok) return null
    }

    return parsed.toString()
  } catch {
    return null
  }
}

let hasWarnedAboutRedirectAllowlist = false
