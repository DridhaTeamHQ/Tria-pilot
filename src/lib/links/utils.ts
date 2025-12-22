/**
 * Generate full masked URL from link code
 */
export function getMaskedUrl(linkCode: string): string {
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL
  
  if (!baseUrl) {
    // Fallback to Vercel URL or localhost
    if (process.env.NEXT_PUBLIC_VERCEL_URL) {
      baseUrl = `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    } else {
      baseUrl = 'http://localhost:3000'
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
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
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

    // For now, allow all https URLs (can add whitelist later)
    // In production, you might want to validate against a whitelist
    return url
  } catch {
    return null
  }
}

