const AMAZON_PRODUCT_HOSTS = ['amazon.in', 'amazon.com'] as const
const AMAZON_SHORT_HOSTS = ['amzn.to'] as const

function hostMatches(host: string, candidate: string): boolean {
  return host === candidate || host.endsWith(`.${candidate}`)
}

export function isAmazonShortLink(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.trim().toLowerCase()
    return AMAZON_SHORT_HOSTS.some((candidate) => hostMatches(host, candidate))
  } catch {
    return false
  }
}

export function normalizeAmazonProductUrl(url: string | null | undefined): string | null {
  if (!url) return null

  try {
    const parsed = new URL(url.trim())
    const host = parsed.hostname.trim().toLowerCase()

    if (!AMAZON_PRODUCT_HOSTS.some((candidate) => hostMatches(host, candidate))) {
      return parsed.toString()
    }

    const asinMatch =
      parsed.pathname.match(/\/dp\/([A-Z0-9]{10})(?:[/?]|$)/i) ||
      parsed.pathname.match(/\/gp\/product\/([A-Z0-9]{10})(?:[/?]|$)/i)

    if (!asinMatch) {
      return parsed.toString()
    }

    const asin = asinMatch[1].toUpperCase()
    return `${parsed.protocol}//${parsed.host}/dp/${asin}`
  } catch {
    return null
  }
}

export function validateProductBaseLink(url: string | null | undefined): {
  ok: boolean
  error?: string
  normalizedUrl?: string | null
} {
  if (!url) {
    return { ok: true, normalizedUrl: null }
  }

  if (isAmazonShortLink(url)) {
    return {
      ok: false,
      error:
        'Amazon short affiliate links like amzn.to cannot be used as product base links. Please paste the full Amazon product URL instead.',
    }
  }

  const normalizedUrl = normalizeAmazonProductUrl(url)
  if (!normalizedUrl) {
    return { ok: false, error: 'Invalid product link URL.' }
  }

  return { ok: true, normalizedUrl }
}
