function normalizeHost(host: string): string {
  return host.trim().toLowerCase()
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
  let baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.RAILWAY_PUBLIC_DOMAIN ||
    process.env.RAILWAY_STATIC_URL
  
  if (!baseUrl) {
    // Try to use request origin if available (for server-side)
    if (requestOrigin) {
      baseUrl = requestOrigin.startsWith('http') ? requestOrigin : `https://${requestOrigin}`
    } else if (process.env.RAILWAY_PUBLIC_DOMAIN) {
      baseUrl = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    } else if (process.env.RAILWAY_STATIC_URL) {
      baseUrl = process.env.RAILWAY_STATIC_URL.startsWith('http')
        ? process.env.RAILWAY_STATIC_URL
        : `https://${process.env.RAILWAY_STATIC_URL}`
    } else if (process.env.NEXT_PUBLIC_VERCEL_URL) {
      baseUrl = `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
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
 * Sanitize redirect URL to prevent open redirects
 * Only allow redirects to the same origin or whitelisted domains
 */
export function sanitizeRedirectUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    
    // Check if it's a safe protocol
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null
    }

    if (isBlockedHost(parsed.hostname)) {
      return null
    }

    return parsed.toString()
  } catch {
    return null
  }
}

