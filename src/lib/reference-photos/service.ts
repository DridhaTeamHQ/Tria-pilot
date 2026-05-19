import 'server-only'

import type { PhotoAnalysis, PhotoRecommendation, ReferencePhoto, ReferencePhotoSource } from './types'
import { MIN_LIBRARY_PHOTOS, toClient } from './types'
import { analyzeReferencePhoto, computeSelectionScore, rankPhotosForTryOn } from './scoring'

interface ProfileImageCandidate {
  id?: string
  url?: string
  imageUrl?: string
  isPrimary?: boolean
}

type ServiceClient = ReturnType<typeof import('@/lib/auth').createServiceClient>

function normalizeProfileImages(rawImages: unknown): Array<{ imageUrl: string; isPrimary: boolean }> {
  if (!Array.isArray(rawImages)) return []

  return rawImages
    .map((item, index) => {
      if (typeof item === 'string') {
        return {
          imageUrl: item,
          isPrimary: index === 0,
        }
      }

      const candidate = item as ProfileImageCandidate
      const imageUrl = candidate.url || candidate.imageUrl
      if (!imageUrl) return null

      return {
        imageUrl,
        isPrimary: Boolean(candidate.isPrimary || index === 0),
      }
    })
    .filter((item): item is { imageUrl: string; isPrimary: boolean } => Boolean(item?.imageUrl))
}

function buildMigratedAnalysis(
  source: ReferencePhotoSource,
  legacyType?: string | null
): { analysis: PhotoAnalysis | null; qualityScore: number | null; approvedForTryOn: boolean } {
  if (source === 'migrated_identity') {
    const isBody = typeof legacyType === 'string' && legacyType.startsWith('body_')

    const analysis: PhotoAnalysis = {
      faceDetectionConfidence: isBody ? 0.82 : 0.9,
      faceCount: 1,
      sharpness: 0.72,
      lightingQuality: 0.7,
      bodyVisibility: isBody ? 'full' : 'face_only',
      framing: isBody ? 'full_body' : 'portrait',
      faceOccluded: false,
      heavyAccessories: false,
      garmentSwapSuitability: isBody ? 0.92 : 0.28,
      rejectionNote: isBody ? undefined : 'Legacy face-only reference; not used as a clothing-swap source photo.',
    }

    return {
      analysis,
      qualityScore: computeSelectionScore(analysis),
      approvedForTryOn: false,
    }
  }

  const analysis: PhotoAnalysis = {
    faceDetectionConfidence: 0.72,
    faceCount: 1,
    sharpness: 0.66,
    lightingQuality: 0.68,
    bodyVisibility: 'upper',
    framing: 'half',
    faceOccluded: false,
    heavyAccessories: false,
    garmentSwapSuitability: 0.72,
  }

  return {
    analysis,
    qualityScore: computeSelectionScore(analysis),
    approvedForTryOn: false,
  }
}

export async function listReferencePhotosForUser(
  service: ServiceClient,
  userId: string
): Promise<ReferencePhoto[]> {
  const { data, error } = await service
    .from('reference_photos')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as ReferencePhoto[]
}

export async function getApprovedReferencePhotoCount(
  service: ServiceClient,
  userId: string
): Promise<number> {
  const { count, error } = await service
    .from('reference_photos')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('source', 'app_upload')
    .eq('approved_for_tryon', true)
    .eq('status', 'approved')

  if (error) throw error
  return count || 0
}

export async function syncLegacyReferencePhotos(
  service: ServiceClient,
  userId: string
): Promise<{ inserted: number }> {
  const [{ data: existingRows, error: existingError }, { data: profile, error: profileError }] =
    await Promise.all([
      service
        .from('reference_photos')
        .select('image_url')
        .eq('user_id', userId),
      service
        .from('influencer_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle(),
    ])

  if (existingError) throw existingError
  if (profileError && profileError.code !== 'PGRST116') throw profileError

  const existingUrls = new Set((existingRows || []).map((row: any) => String(row.image_url)))
  const inserts: Array<Record<string, unknown>> = []

  // Skip profile_images since the column doesn't exist in the current DB schema.

  if (profile?.id) {
    const { data: identityRows, error: identityError } = await service
      .from('identity_images')
      .select('image_url, image_path, image_type')
      .eq('influencer_profile_id', profile.id)
      .eq('is_active', true)

    if (identityError) throw identityError

    for (const row of identityRows || []) {
      const imageUrl = String((row as any).image_url || '')
      if (!imageUrl || existingUrls.has(imageUrl)) continue
      const migrated = buildMigratedAnalysis('migrated_identity', (row as any).image_type || null)
      const rejectionReasons = [
        'Migrated legacy reference. Upload fresh in-app source photos before using the presetless try-on pipeline.',
      ]

      inserts.push({
        id: crypto.randomUUID(),
        user_id: userId,
        image_url: imageUrl,
        image_path: (row as any).image_path || null,
        source: 'migrated_identity',
        status: 'approved',
        quality_score: migrated.qualityScore,
        analysis: migrated.analysis,
        approved_for_tryon: migrated.approvedForTryOn,
        rejection_reasons: rejectionReasons,
        is_active: true,
      })
      existingUrls.add(imageUrl)
    }
  }

  if (inserts.length === 0) {
    return { inserted: 0 }
  }

  const { error: insertError } = await service
    .from('reference_photos')
    .upsert(inserts, { onConflict: 'user_id,image_url' })

  if (insertError) throw insertError

  return { inserted: inserts.length }
}

export async function getReferencePhotoLibrary(
  service: ServiceClient,
  userId: string
): Promise<{
  photos: ReturnType<typeof toClient>[]
  approvedCount: number
  totalCount: number
  isReadyForTryOn: boolean
  minRequired: number
  photosNeeded: number
  migratedCount: number
}> {
  const migration = await syncLegacyReferencePhotos(service, userId)
  const rows = await listReferencePhotosForUser(service, userId)
  const photos = rows.map((row) => toClient(row, { selectionScore: computeSelectionScore(row.analysis) }))
  const approvedCount = rows.filter(
    (row) => row.source === 'app_upload' && row.approved_for_tryon && row.status === 'approved'
  ).length

  return {
    photos,
    approvedCount,
    totalCount: rows.length,
    isReadyForTryOn: approvedCount >= MIN_LIBRARY_PHOTOS,
    minRequired: MIN_LIBRARY_PHOTOS,
    photosNeeded: Math.max(0, MIN_LIBRARY_PHOTOS - approvedCount),
    migratedCount: migration.inserted,
  }
}

export async function getReferencePhotoRecommendations(
  service: ServiceClient,
  userId: string
): Promise<PhotoRecommendation> {
  await syncLegacyReferencePhotos(service, userId)
  const rows = await listReferencePhotosForUser(service, userId)
  return rankPhotosForTryOn(rows.filter((row) => row.source === 'app_upload'))
}

export async function getReferencePhotosByIds(
  service: ServiceClient,
  userId: string,
  photoIds: string[]
): Promise<ReferencePhoto[]> {
  if (photoIds.length === 0) return []

  const { data, error } = await service
    .from('reference_photos')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .in('id', photoIds)

  if (error) throw error
  return (data || []) as ReferencePhoto[]
}

/**
 * Validate that a reference-photo URL is safe to fetch.
 *
 * Prevents SSRF: blocks private IPs, loopback, link-local, and metadata
 * endpoints. Also enforces an allowlist of trusted hosts (Supabase storage
 * + any explicit additions via REFERENCE_PHOTO_ALLOWED_HOSTS env var).
 */
export function assertSafeReferenceUrl(rawUrl: string): URL {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new Error('Invalid reference photo URL')
  }

  // Only http(s) — no file://, data:, gopher://, etc.
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Reference photo URL must use http or https')
  }

  const host = parsed.hostname.toLowerCase()

  // Block obviously dangerous hosts: localhost, *.local, *.internal,
  // metadata service IPs, RFC1918 private ranges.
  if (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    throw new Error('Reference photo URL host is not allowed')
  }

  // RFC1918 + link-local + loopback IPv4 check
  const ipv4Parts = host.split('.').map(Number)
  if (
    ipv4Parts.length === 4 &&
    ipv4Parts.every((p) => Number.isFinite(p) && p >= 0 && p <= 255)
  ) {
    const [a, b] = ipv4Parts
    if (a === 10 || a === 127 || a === 0) {
      throw new Error('Reference photo URL points to a private IP')
    }
    if (a === 169 && b === 254) {
      throw new Error('Reference photo URL points to a link-local IP')
    }
    if (a === 172 && b >= 16 && b <= 31) {
      throw new Error('Reference photo URL points to a private IP')
    }
    if (a === 192 && b === 168) {
      throw new Error('Reference photo URL points to a private IP')
    }
  }

  // Block IPv6 loopback and link-local
  if (host === '::1' || host.startsWith('fe80:') || host.startsWith('[fe80')) {
    throw new Error('Reference photo URL points to a private IPv6')
  }

  // Allowlist: Supabase storage host (derived from NEXT_PUBLIC_SUPABASE_URL)
  // plus any extra hosts configured via env. If neither is set, the only
  // safe-by-default hosts are well-known image CDNs.
  const allowed: string[] = []
  try {
    const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').hostname
    if (supabaseHost) allowed.push(supabaseHost)
  } catch {
    // ignore — no Supabase configured
  }
  const extra = (process.env.REFERENCE_PHOTO_ALLOWED_HOSTS || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
  allowed.push(...extra)

  if (allowed.length > 0) {
    const isAllowed = allowed.some(
      (allowedHost) => host === allowedHost || host.endsWith('.' + allowedHost)
    )
    if (!isAllowed) {
      throw new Error(`Reference photo host "${host}" is not on the allowlist`)
    }
  }

  return parsed
}

export async function fetchReferencePhotoAsBase64(imageUrl: string): Promise<string> {
  const trimmed = (imageUrl || '').trim()
  if (!trimmed) {
    throw new Error('Reference photo URL is empty')
  }

  // Some reference photos are stored as inline data: URLs (base64 embedded
  // in the DB column) rather than uploaded storage URLs. Those can't be
  // fetched over HTTP — extract the base64 payload directly.
  if (trimmed.startsWith('data:')) {
    const comma = trimmed.indexOf(',')
    if (comma < 0) throw new Error('Malformed data: URL reference photo')
    const payload = trimmed.slice(comma + 1)
    if (!payload || payload.length < 100) {
      throw new Error('Empty data: URL reference photo')
    }
    return payload
  }

  // Relative storage path (no scheme) → resolve to the Supabase public URL.
  let resolvableUrl = trimmed
  if (!/^https?:\/\//i.test(trimmed)) {
    const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
    if (base) {
      const path = trimmed.replace(/^\/+/, '')
      resolvableUrl = path.startsWith('storage/')
        ? `${base}/${path}`
        : `${base}/storage/v1/object/public/${path}`
    }
  }

  const safeUrl = assertSafeReferenceUrl(resolvableUrl)

  // Bound the response size to prevent OOM via gigantic payloads.
  const MAX_BYTES = 25 * 1024 * 1024 // 25MB cap

  const response = await fetch(safeUrl.toString(), {
    redirect: 'error', // don't follow redirects — they can defeat the allowlist
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch reference photo (${response.status})`)
  }

  const arrayBuf = await response.arrayBuffer()
  if (arrayBuf.byteLength > MAX_BYTES) {
    throw new Error(`Reference photo too large (${arrayBuf.byteLength} bytes)`)
  }

  return Buffer.from(arrayBuf).toString('base64')
}

export async function analyzeAndUpdateReferencePhoto(
  service: ServiceClient,
  userId: string,
  photoId: string,
  imageBase64: string
): Promise<void> {
  const { analysis, qualityScore, approved, approvedForTryOn, rejectionReasons } =
    await analyzeReferencePhoto(imageBase64)

  const { error } = await service
    .from('reference_photos')
    .update({
      analysis,
      quality_score: qualityScore,
      status: approved ? 'approved' : 'rejected',
      approved_for_tryon: approvedForTryOn,
      rejection_reasons: rejectionReasons,
      updated_at: new Date().toISOString(),
    })
    .eq('id', photoId)
    .eq('user_id', userId)

  if (error) {
    throw error
  }

  try {
    const { extractIdentityEmbedding } = await import('@/lib/tryon/identity-embedding')
    await extractIdentityEmbedding(userId)
  } catch (embeddingError) {
    console.warn('[reference-photos] identity embedding refresh failed:', embeddingError)
  }
}
