const AMAZON_HOSTS = ['amazon.in', 'amazon.com', 'amzn.to'] as const

function hostMatches(host: string, candidate: string): boolean {
  return host === candidate || host.endsWith(`.${candidate}`)
}

export function isAmazonUrl(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.trim().toLowerCase()
    return AMAZON_HOSTS.some((candidate) => hostMatches(host, candidate))
  } catch {
    return false
  }
}

export function normalizeAmazonTrackingId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!/^[A-Za-z0-9][A-Za-z0-9-]{1,60}$/.test(trimmed)) return null
  return trimmed
}

export function normalizeAmazonStoreId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!/^[A-Za-z0-9][A-Za-z0-9-]{1,60}$/.test(trimmed)) return null
  return trimmed
}

export function canonicalizeAmazonTrackingId(value: unknown): string | null {
  const normalized = normalizeAmazonTrackingId(value)
  return normalized ? normalized.toLowerCase() : null
}

export function getAmazonStoreIdFromTrackingId(value: unknown): string | null {
  const normalized = normalizeAmazonTrackingId(value)
  if (!normalized) return null

  const match = normalized.match(/^(.+)-\d+$/)
  return match?.[1] || normalized
}

export function applyAmazonTrackingTag(
  url: string,
  trackingId: string | null | undefined,
  storeId?: string | null | undefined,
): string {
  const normalizedTrackingId = normalizeAmazonTrackingId(trackingId)
  const normalizedStoreId = normalizeAmazonStoreId(storeId)
  if (!normalizedTrackingId && !normalizedStoreId) return url

  try {
    const parsed = new URL(url)
    if (!isAmazonUrl(parsed.toString())) {
      return url
    }

    if (normalizedTrackingId) {
      parsed.searchParams.set('tag', normalizedTrackingId)
      parsed.searchParams.set('trackId', normalizedTrackingId)
    }
    if (normalizedStoreId) {
      parsed.searchParams.set('storeId', normalizedStoreId)
    }
    return parsed.toString()
  } catch {
    return url
  }
}

export function getAmazonTrackingTagFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (!isAmazonUrl(parsed.toString())) return null
    return normalizeAmazonTrackingId(parsed.searchParams.get('tag'))
  } catch {
    return null
  }
}
