import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import { presetlessTryOnSchema } from '@/lib/validation'
import { getRedisConnection, isQueueAvailable, isRedisConfigured } from '@/lib/queue/redis'
import { enqueueTryOnJob } from '@/lib/queue/tryon-queue'
import { isTryOnWorkerOnline } from '@/lib/queue/tryon-worker-health'
import { normalizeBase64 } from '@/lib/image-processing'
import { saveUpload } from '@/lib/storage'
import { generateTryOnDirect } from '@/lib/nanobanana'
import { fetchReferencePhotoAsBase64, getReferencePhotoLibrary, getReferencePhotosByIds } from '@/lib/reference-photos/service'
import type { ReferencePhotoClient } from '@/lib/reference-photos/types'
import { getFirstSuccessfulOutput, getJobOutputsFromRecord } from '@/lib/tryon/job-outputs'
import { getTryOnRenderModel, resolveDirectGeminiRenderModel } from '@/lib/tryon/nano-banana-pro-renderer'
import { analyzeGarment, composeSmartPrompt, type GarmentIntelligence } from '@/lib/tryon/garment-intel'
import { extractFaceCrop } from '@/lib/tryon/face-crop'
import { preprocessGarmentImage } from '@/lib/tryon/garment-preprocessor'
// face-crop removed — simple pipeline
import {
  type GarmentClassification,
} from '@/lib/tryon/intelligence/garment-classifier'
import {
  validateGarmentMatch,
  type GarmentValidationResult,
} from '@/lib/tryon/intelligence/garment-guardrail'
import {
  assessIdentityAndComposition,
  type IdentityCompositionAssessment,
} from '@/lib/tryon/identity-composition-check'
import { GeminiRateLimitError } from '@/lib/gemini/executor'
import { checkGenerationGate, completeGeneration } from '@/lib/generation-limiter'
import { ZodError } from 'zod'

// Max jobs allowed to sit waiting in the BullMQ queue.
// If exceeded, new requests are rejected immediately with a "busy" response.
// Prevents queue from growing unboundedly during traffic spikes.
const MAX_QUEUE_DEPTH = parseInt(process.env.TRYON_MAX_QUEUE_DEPTH || '50', 10)

export const maxDuration = 300
const TRYON_RATE_LIMIT_DISABLED =
  process.env.TRYON_RATE_LIMIT_DISABLED === 'true' ||
  process.env.NODE_ENV !== 'production'
const USER_LOCK_TTL_SECONDS = Math.max(120, maxDuration + 30)
const GLOBAL_ACTIVE_TTL_SECONDS = USER_LOCK_TTL_SECONDS
const ACTIVE_JOB_LOOKBACK_MS = USER_LOCK_TTL_SECONDS * 1000
const DEFAULT_PRODUCTION_GLOBAL_ACTIVE_LIMIT = 3
const GLOBAL_ACTIVE_LIMIT = Math.max(
  1,
  Number.parseInt(
    process.env.TRYON_INLINE_GLOBAL_LIMIT ||
      String(process.env.NODE_ENV === 'production' ? DEFAULT_PRODUCTION_GLOBAL_ACTIVE_LIMIT : 8),
    10
  ) || DEFAULT_PRODUCTION_GLOBAL_ACTIVE_LIMIT
)
const GLOBAL_ACTIVE_KEY = 'tryon:inline:active_generations'
const INTER_GENERATION_DELAY_MS = Math.max(
  0,
  Number.parseInt(process.env.TRYON_INTER_GENERATION_DELAY_MS || '3000', 10) || 3000
)
const DEADLINE_BUFFER_MS = 25_000 // Stop generating 25s before maxDuration to allow cleanup/response
const GARMENT_GUARDRAIL_MIN_CONFIDENCE = 60
const TRYON_OUTPUT_QA_MODE: 'off' | 'soft' | 'strict' =
  process.env.TRYON_OUTPUT_QA_MODE === 'strict'
    ? 'strict'
    : process.env.TRYON_OUTPUT_QA_MODE === 'soft'
      ? 'soft'
      : 'off'

// Fix: Vercel incorrectly sets NODE_ENV='development'. Use VERCEL_ENV instead.
const isDev = process.env.VERCEL_ENV
  ? process.env.VERCEL_ENV !== 'production'
  : process.env.NODE_ENV !== 'production'

function jsonError(
  status: number,
  code: string,
  error: string,
  extra?: Record<string, unknown>
) {
  return NextResponse.json({ code, error, ...extra }, { status })
}

type ServiceClient = ReturnType<typeof createServiceClient>

interface PresetlessPersistedOutput {
  referenceImageId: string
  status: 'completed' | 'failed'
  outputImagePath?: string
  error?: string
  label: string
  validation?: {
    qualityScores?: IdentityCompositionAssessment['scores']
    warnings?: string[]
    garmentGuardrail?: {
      isValid: boolean
      recommendation: GarmentValidationResult['recommendation']
      issues: string[]
      expectedType: string
      actualType: string
      expectedHemline: string
      actualHemline: string
    }
  }
}

async function findRecentActiveTryOnJob(service: ServiceClient, userId: string) {
  try {
    const activeSinceIso = new Date(Date.now() - ACTIVE_JOB_LOOKBACK_MS).toISOString()
    const { data, error } = await service
      .from('generation_jobs')
      .select('id, status, created_at')
      .eq('user_id', userId)
      .in('status', ['pending', 'processing'])
      .gte('created_at', activeSinceIso)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.warn('[tryon] active job fallback check failed:', error)
      return null
    }

    return data?.[0] || null
  } catch (error) {
    console.warn('[tryon] active job fallback check crashed:', error)
    return null
  }
}

async function countRecentActiveTryOnJobs(service: ServiceClient) {
  try {
    const activeSinceIso = new Date(Date.now() - ACTIVE_JOB_LOOKBACK_MS).toISOString()
    const { count, error } = await service
      .from('generation_jobs')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'processing'])
      .gte('created_at', activeSinceIso)

    if (error) {
      console.warn('[tryon] global active-job count failed:', error)
      return null
    }

    return count ?? 0
  } catch (error) {
    console.warn('[tryon] global active-job count crashed:', error)
    return null
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface RankedPhoto {
  id: string
  score: number
  reasoning: string
  suitability: 'excellent' | 'good' | 'fair' | 'poor'
  diversityKey: string
}

function scorePhotosForGarment(
  photos: ReferencePhotoClient[],
  garmentIntel: GarmentIntelligence
): RankedPhoto[] {
  return photos
    .map((photo) => scorePhotoForGarment(photo, garmentIntel))
    .sort((left, right) => right.score - left.score)
}

function scorePhotoForGarment(
  photo: ReferencePhotoClient,
  garmentIntel: GarmentIntelligence
): RankedPhoto {
  let score = 50
  const reasons: string[] = []
  const qualityScore = Number(photo.qualityScore ?? 0)
  const analysis = photo.analysis

  const bodyVisibility = String(analysis?.bodyVisibility ?? 'unknown').toLowerCase()
  const framing = String(analysis?.framing ?? 'unknown').toLowerCase()
  const swapSuitability = Number(analysis?.garmentSwapSuitability ?? 0)

  if (qualityScore > 0.8) {
    score += 12
    reasons.push('High quality')
  } else if (qualityScore > 0.6) {
    score += 6
  } else if (qualityScore < 0.4) {
    score -= 8
    reasons.push('Low quality')
  }

  if (swapSuitability > 0.8) {
    score += 8
    reasons.push('High swap suitability')
  } else if (swapSuitability > 0.6) {
    score += 4
  }

  if (photo.source === 'app_upload') {
    score += 5
  } else if (photo.source === 'migrated_identity') {
    score -= 8
    reasons.push('Legacy migrated')
  }

  switch (garmentIntel.coverage) {
    case 'upper_only':
      if (bodyVisibility === 'full') {
        score += 18
        reasons.push('Full body supports top pairing')
      } else if (bodyVisibility === 'upper') {
        score += 22
        reasons.push('Upper body is ideal for top swap')
      } else if (bodyVisibility === 'half') {
        score += 14
        reasons.push('Half body keeps the upper garment visible')
      } else if (bodyVisibility === 'face' || bodyVisibility === 'close_up' || bodyVisibility === 'face_only') {
        score -= 20
        reasons.push('Body is not visible enough')
      }

      if (framing === 'full' || framing === 'full_body') {
        score += 8
        reasons.push('Full frame')
      } else if (framing === 'half') {
        score += 5
      }
      break

    case 'full_body':
      if (bodyVisibility === 'full') {
        score += 30
        reasons.push('Full body is perfect for a full outfit')
      } else if (bodyVisibility === 'half') {
        score += 2
        reasons.push('Half body only partially shows the outfit')
      } else if (bodyVisibility === 'upper') {
        score -= 15
        reasons.push('Upper-only framing cuts off the outfit')
      } else if (bodyVisibility === 'face' || bodyVisibility === 'close_up' || bodyVisibility === 'face_only') {
        score -= 30
        reasons.push('Full outfit cannot be shown')
      }

      if (framing === 'full' || framing === 'full_body') {
        score += 12
        reasons.push('Full-length frame')
      }
      break

    case 'lower_only':
      if (bodyVisibility === 'full') {
        score += 22
        reasons.push('Lower body is visible')
      } else if (bodyVisibility === 'half') {
        score += 10
      } else if (bodyVisibility === 'upper' || bodyVisibility === 'face' || bodyVisibility === 'face_only') {
        score -= 25
        reasons.push('Lower body is not visible')
      }
      break

    case 'layered':
      if (bodyVisibility === 'full' || bodyVisibility === 'upper') {
        score += 18
        reasons.push('Body is visible for layering')
      } else if (bodyVisibility === 'half') {
        score += 10
      } else if (bodyVisibility === 'face' || bodyVisibility === 'face_only') {
        score -= 10
      }
      break
  }

  score = Math.max(0, Math.min(100, score))

  const suitability: RankedPhoto['suitability'] =
    score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor'

  if (reasons.length === 0) {
    reasons.push('Standard candidate')
  }

  return {
    id: photo.id,
    score,
    reasoning: reasons.join('. '),
    suitability,
    diversityKey: `${bodyVisibility}:${framing}`,
  }
}

function selectDiverseTop3(
  ranked: RankedPhoto[],
  garmentIntel: GarmentIntelligence
): string[] {
  if (ranked.length <= 3) {
    return ranked.map((photo) => photo.id)
  }

  const minimumReliableScore =
    garmentIntel.coverage === 'full_body'
      ? 80
      : garmentIntel.coverage === 'lower_only'
        ? 72
        : 65
  const reliablePool = ranked.filter((photo) => photo.score >= minimumReliableScore)
  if (reliablePool.length >= 3) {
    const preferredPool = reliablePool.slice(0, Math.min(6, reliablePool.length))
    if (garmentIntel.coverage === 'full_body' || garmentIntel.coverage === 'lower_only') {
      return shuffleRankedPhotos(preferredPool).slice(0, 3).map((photo) => photo.id)
    }
  }

  const candidatePool = (reliablePool.length >= 3 ? reliablePool : ranked).slice(0, Math.min(8, ranked.length))
  const selected: RankedPhoto[] = []
  const usedDiversity = new Set<string>()

  for (const photo of shuffleRankedPhotos(candidatePool)) {
    if (selected.length >= 3) break
    if (!usedDiversity.has(photo.diversityKey)) {
      selected.push(photo)
      usedDiversity.add(photo.diversityKey)
    }
  }

  if (selected.length < 3) {
    const selectedIds = new Set(selected.map((photo) => photo.id))
    for (const photo of shuffleRankedPhotos(candidatePool)) {
      if (selected.length >= 3) break
      if (!selectedIds.has(photo.id)) {
        selected.push(photo)
        selectedIds.add(photo.id)
      }
    }
  }

  return selected.map((photo) => photo.id)
}

function shuffleRankedPhotos(ranked: RankedPhoto[]): RankedPhoto[] {
  // Strong randomization: 25-point noise ensures real variety across runs
  // Without this, scores clustered at 80-95 always produce the same top-3
  const decorated = ranked.map((photo) => {
    const noise = Math.random() * 25
    return {
      photo,
      weightedScore: photo.score + noise,
    }
  })

  decorated.sort((left, right) => right.weightedScore - left.weightedScore)
  return decorated.map((entry) => entry.photo)
}

function buildAutoCandidatePhotoIds(
  ranked: RankedPhoto[],
  primaryIds: string[],
  maxCandidates = 6
): string[] {
  const primarySet = new Set(primaryIds)
  const remaining = shuffleRankedPhotos(ranked.filter((photo) => !primarySet.has(photo.id)))
  const orderedIds = [...primaryIds, ...remaining.map((photo) => photo.id)]
  return Array.from(new Set(orderedIds)).slice(0, maxCandidates)
}

function formatQualityGateScores(scores: IdentityCompositionAssessment['scores']): string {
  return `face=${scores.faceIdentity}, garment=${scores.garmentFidelity}, body=${scores.bodyConsistency}, composition=${scores.compositionQuality}, background=${scores.backgroundIntegrity}`
}

interface StrictOutputValidationResult {
  qualityAssessment: IdentityCompositionAssessment | null
  garmentValidation: GarmentValidationResult | null
  warnings: string[]
}

interface GarmentClassificationSummary {
  category: GarmentClassification['category']
  confidence: GarmentClassification['category_confidence']
  hemline: GarmentClassification['hemline_position']
}

function summarizeGarmentClassification(
  garmentClassification: GarmentClassification | null
): GarmentClassificationSummary | null {
  if (!garmentClassification) {
    return null
  }

  return {
    category: garmentClassification.category,
    confidence: garmentClassification.category_confidence,
    hemline: garmentClassification.hemline_position,
  }
}

async function validateGeneratedOutputStrict(params: {
  qaMode: 'off' | 'soft' | 'strict'
  referenceImageBase64: string
  generatedImageBase64: string
  garmentImageBase64: string
  garmentClassification: GarmentClassification | null
}): Promise<StrictOutputValidationResult> {
  const {
    qaMode,
    referenceImageBase64,
    generatedImageBase64,
    garmentImageBase64,
    garmentClassification,
  } = params

  if (qaMode === 'off' || !garmentClassification) {
    return {
      qualityAssessment: null,
      garmentValidation: null,
      warnings: ['output_qa_disabled'],
    }
  }

  const shouldRunGarmentGuardrail =
    garmentClassification.category !== 'UNKNOWN' &&
    garmentClassification.category_confidence >= GARMENT_GUARDRAIL_MIN_CONFIDENCE

  const [qualityAssessmentResult, garmentValidationResult] = await Promise.allSettled([
    assessIdentityAndComposition({
      sourceImageBase64: referenceImageBase64,
      generatedImageBase64,
      garmentImageBase64,
    }),
    shouldRunGarmentGuardrail
      ? validateGarmentMatch(
          garmentImageBase64,
          generatedImageBase64,
          garmentClassification.category,
          garmentClassification.hemline_position
        )
      : Promise.resolve(null),
  ])

  const warnings: string[] = []
  const qualityAssessment =
    qualityAssessmentResult.status === 'fulfilled' &&
    qualityAssessmentResult.value.reason !== 'validation_unavailable'
      ? qualityAssessmentResult.value
      : null
  const garmentValidation =
    garmentValidationResult.status === 'fulfilled' &&
    garmentValidationResult.value &&
    garmentValidationResult.value.validationAvailable !== false
      ? garmentValidationResult.value
      : null

  if (qualityAssessmentResult.status === 'rejected') {
    const reason =
      qualityAssessmentResult.reason instanceof Error
        ? qualityAssessmentResult.reason.message
        : String(qualityAssessmentResult.reason)
    warnings.push(`quality_assessment_unavailable:${reason}`)
  } else if (qualityAssessmentResult.value.reason === 'validation_unavailable') {
    warnings.push('quality_assessment_unavailable')
  }

  if (garmentValidationResult.status === 'rejected') {
    const reason =
      garmentValidationResult.reason instanceof Error
        ? garmentValidationResult.reason.message
        : String(garmentValidationResult.reason)
    warnings.push(`garment_guardrail_unavailable:${reason}`)
  } else if (garmentValidationResult.value?.validationAvailable === false) {
    warnings.push('garment_guardrail_unavailable')
  }

  const rejectionReasons: string[] = []

  if (
    qualityAssessment?.shouldRetry &&
    (
      qualityAssessment.scores.faceIdentity < 55 ||
      qualityAssessment.scores.garmentFidelity < 55 ||
      qualityAssessment.scores.bodyConsistency < 55
    )
  ) {
    rejectionReasons.push(`quality=${formatQualityGateScores(qualityAssessment.scores)}`)
  } else if (qualityAssessment?.shouldRetry) {
    warnings.push(`quality_soft_warning:${formatQualityGateScores(qualityAssessment.scores)}`)
  }

  if (
    garmentValidation &&
    garmentValidation.validationAvailable !== false &&
    garmentValidation.explicitDecision !== false &&
    garmentValidation.recommendation === 'reject' &&
    !garmentValidation.is_valid
  ) {
    const garmentIssues = garmentValidation.issues.length > 0
      ? garmentValidation.issues.join(', ')
      : 'garment structure mismatch'
    rejectionReasons.push(
      `garment_guardrail expected=${garmentClassification.category}/${garmentClassification.hemline_position} actual=${garmentValidation.details.actual_type}/${garmentValidation.details.actual_hemline} issues=${garmentIssues}`
    )
  } else if (
    garmentValidation &&
    garmentValidation.validationAvailable !== false &&
    !garmentValidation.is_valid
  ) {
    warnings.push(
      `garment_soft_warning expected=${garmentClassification.category}/${garmentClassification.hemline_position} actual=${garmentValidation.details.actual_type}/${garmentValidation.details.actual_hemline}`
    )
  }

  if (rejectionReasons.length > 0) {
    if (qaMode === 'strict') {
      throw new Error(`Try-on output rejected by quality gate: ${rejectionReasons.join(' | ')}`)
    }
    warnings.push(...rejectionReasons.map((reason) => `qa_soft_reject:${reason}`))
  }

  return {
    qualityAssessment,
    garmentValidation,
    warnings,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GARMENT RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════

async function resolveProductGarmentImageUrl(
  service: ServiceClient,
  productId: string
): Promise<string | null> {
  const { data: product } = await service
    .from('products')
    .select('id, name, cover_image, images')
    .eq('id', productId)
    .maybeSingle()

  const { data: directLegacyImages } = await service
    .from('ProductImage')
    .select('imagePath, isTryOnReference, order')
    .eq('productId', productId)
    .order('order', { ascending: true })

  const directLegacyImage =
    directLegacyImages?.find((image: any) => image.isTryOnReference)?.imagePath ||
    directLegacyImages?.[0]?.imagePath ||
    null

  if (directLegacyImage) return directLegacyImage

  if (product?.name) {
    const { data: legacyMatch } = await service
      .from('Product')
      .select('id')
      .eq('name', product.name)
      .maybeSingle()

    if (legacyMatch?.id) {
      const { data: matchedLegacyImages } = await service
        .from('ProductImage')
        .select('imagePath, isTryOnReference, order')
        .eq('productId', legacyMatch.id)
        .order('order', { ascending: true })

      const matchedLegacyImage =
        matchedLegacyImages?.find((image: any) => image.isTryOnReference)?.imagePath ||
        matchedLegacyImages?.[0]?.imagePath ||
        null

      if (matchedLegacyImage) return matchedLegacyImage
    }
  }

  const productImages = Array.isArray(product?.images) ? product.images : []
  if (typeof productImages[0] === 'string' && productImages[0]) {
    return productImages[0]
  }

  if (typeof product?.cover_image === 'string' && product.cover_image) {
    return product.cover_image
  }

  return null
}

async function resolvePresetlessGarmentBase64(
  service: ServiceClient,
  payload: ReturnType<typeof presetlessTryOnSchema.parse>
): Promise<string> {
  if (payload.clothingImage) {
    return normalizeBase64(payload.clothingImage)
  }

  if (payload.garmentImageUrl) {
    return normalizeBase64(await fetchReferencePhotoAsBase64(payload.garmentImageUrl))
  }

  const productImageUrl = payload.productId
    ? await resolveProductGarmentImageUrl(service, payload.productId)
    : null

  const garmentImageUrl = productImageUrl || null
  if (!garmentImageUrl) {
    throw new Error('A garment image is required to generate a try-on.')
  }

  return normalizeBase64(await fetchReferencePhotoAsBase64(garmentImageUrl))
}

// ═══════════════════════════════════════════════════════════════════════════
// PRESETLESS TRY-ON HANDLER
// ═══════════════════════════════════════════════════════════════════════════

async function handlePresetlessTryOnRequest(params: {
  service: ServiceClient
  userId: string
  body: unknown
  configuredRenderModel: ReturnType<typeof getTryOnRenderModel>
}) {
  const { service, userId, body, configuredRenderModel } = params
  const directRenderModel = resolveDirectGeminiRenderModel(configuredRenderModel)
  const payload = presetlessTryOnSchema.parse(body)
  const library = await getReferencePhotoLibrary(service, userId)
  const manualSelectedPhotoIds = Array.isArray(payload.selectedReferenceImageIds)
    ? payload.selectedReferenceImageIds
    : null
  const hasManualSelection = manualSelectedPhotoIds?.length === 3
  const approvedLibraryPhotos = library.photos.filter((photo) => photo.status === 'approved')

  if (approvedLibraryPhotos.length < 3) {
    return jsonError(400, 'NOT_ENOUGH_APPROVED', 'Need at least 3 approved reference photos for auto-selection.')
  }

  const pipelineStartTime = Date.now()
  const deadlineMs = (maxDuration * 1000) - DEADLINE_BUFFER_MS

  const normalizedGarment = await resolvePresetlessGarmentBase64(service, payload)

  // FAST PATH: Skip heavyweight garment preprocessing (saves ~15-25s)
  // The preprocessor does 3-4 Gemini calls (body detection, forensic analysis,
  // strict profile, extraction) which pushes us past the function timeout.
  // Instead, use the garment image directly — the generation model handles
  // clothing-on-model images well via the system instruction.
  const processedGarment = normalizeBase64(normalizedGarment)
  const garmentPreprocess = {
    wasExtracted: false,
    bodyDetected: false,
    confidence: 0,
    extractionMethod: 'passthrough' as const,
  }

  // Garment intel is lightweight (1 Gemini Flash call, ~3-5s)
  // Skip classification entirely to save time
  const garmentIntel = await analyzeGarment(processedGarment)
  const garmentClassification: GarmentClassification | null = null
  const garmentClassificationSummary = summarizeGarmentClassification(garmentClassification)

  // ── PHOTO SELECTION (manual or garment-aware auto-select) ─────────────
  let selectedPhotoIds: string[]
  let candidatePhotoIds: string[]
  let selectionMethod: 'manual' | 'auto_scoring' = 'manual'
  let selectionReasoning = ''

  if (hasManualSelection) {
    selectedPhotoIds = manualSelectedPhotoIds
    candidatePhotoIds = manualSelectedPhotoIds
    selectionMethod = 'manual'
  } else {
    const rankedPhotos = scorePhotosForGarment(approvedLibraryPhotos, garmentIntel)
    selectedPhotoIds = selectDiverseTop3(rankedPhotos, garmentIntel)
    candidatePhotoIds = buildAutoCandidatePhotoIds(rankedPhotos, selectedPhotoIds)
    selectionMethod = 'auto_scoring'
    selectionReasoning =
      `Selected ${selectedPhotoIds.length} primary photos and ${Math.max(0, candidatePhotoIds.length - selectedPhotoIds.length)} backups ` +
      `using garment-aware scoring and diversity for ${garmentIntel.garmentType} (${garmentIntel.coverage}).`

    if (isDev) {
      console.log(`📸 Auto-selected photos (${selectionMethod}):`, selectedPhotoIds)
      console.log('   Backup pool:', candidatePhotoIds)
      rankedPhotos.slice(0, 6).forEach((photo, index) => {
        console.log(
          `   ${index + 1}. ${photo.id.slice(0, 8)} → ${photo.score}/100 (${photo.suitability}) | ${photo.diversityKey} | ${photo.reasoning}`
        )
      })
      if (selectionReasoning) console.log(`   Reason: ${selectionReasoning}`)
    }
  }

  // ── FETCH & VALIDATE CANDIDATE PHOTOS ─────────────────────────────────
  const candidatePhotos = await getReferencePhotosByIds(service, userId, candidatePhotoIds)
  const selectedMap = new Map(candidatePhotos.map((photo) => [photo.id, photo]))
  const orderedPhotos = candidatePhotoIds
    .map((photoId) => selectedMap.get(photoId) || null)
    .filter((photo): photo is NonNullable<typeof photo> => Boolean(photo))

  if (orderedPhotos.length < 3) {
    return jsonError(400, 'INVALID_REFERENCE_SELECTION', 'Could not find 3 valid reference photos. Please upload more photos and try again.')
  }

  // For manual selection, enforce strict validation
  if (selectionMethod === 'manual') {
    const invalidSelection = orderedPhotos.find(
      (photo) => photo.status !== 'approved' || photo.is_active === false
    )
    if (invalidSelection) {
      return jsonError(
        400,
        'INVALID_REFERENCE_SELECTION',
        'Selected reference photos must be approved active library photos.'
      )
    }
  }

  // ── RESOLVE REFERENCE BASE64s ──────────────────────────────────────────
  const orderedReferenceBase64s = await Promise.all(
    orderedPhotos.map((photo) => fetchReferencePhotoAsBase64(photo.image_url).then((base64) => normalizeBase64(base64)))
  )

  // ── PRE-EXTRACT FACE CROPS IN PARALLEL (heuristic, no Gemini call) ──────
  // Uses Sharp center-top crop — fast, zero Gemini API cost, all parallel
  const preExtractedFaceCrops = await Promise.all(
    orderedReferenceBase64s.map(async (refBase64) => {
      try {
        const result = await extractFaceCrop(refBase64, null)
        return result.success && result.faceCropBase64 ? result.faceCropBase64 : undefined
      } catch {
        return undefined
      }
    })
  )

    // ── CREATE GENERATION JOB ─────────────────────────────────────────────
  const { data: job, error: jobError } = await service
    .from('generation_jobs')
    .insert({
      user_id: userId,
      inputs: {
        productId: payload.productId || null,
        clothingImage: payload.clothingImage || null,
        garmentImageUrl: payload.garmentImageUrl || null,
        garmentImageBase64: processedGarment,
        selectedReferenceImageIds: selectedPhotoIds,
        candidateReferenceImageIds: candidatePhotoIds,
        selectionMethod,
        selectionReasoning,
      },
      settings: {
        sourceMode: 'reference_library',
        strictSwap: true,
        polishNotes: payload.polishNotes || null,
        aspectRatio: payload.aspectRatio,
        resolution: payload.resolution,
        model: directRenderModel,
        requestedModel: configuredRenderModel,
        garmentPreprocess: {
          wasExtracted: garmentPreprocess.wasExtracted,
          bodyDetected: garmentPreprocess.bodyDetected,
          confidence: garmentPreprocess.confidence,
          extractionMethod: garmentPreprocess.extractionMethod,
        },
        outputs: [],
        candidateReferenceImageIds: candidatePhotoIds,
      },
      status: 'pending',
    })
    .select()
    .single()

  if (jobError || !job) {
    console.error('[tryon] failed to create presetless generation job:', jobError)
    return jsonError(500, 'JOB_CREATION_FAILED', 'Failed to start generation job. Please try again.')
  }

  const workerOnline = isQueueAvailable() ? await isTryOnWorkerOnline() : false
  if (workerOnline) {
    // ── Queue depth cap ─────────────────────────────────────────────────────
    // Count pending (waiting) jobs in the queue. If we're over the limit,
    // reject the request immediately rather than letting the queue grow
    // unboundedly during a traffic spike.
    try {
      const { Queue } = await import('bullmq')
      const { TRYON_QUEUE_NAME } = await import('@/lib/queue/tryon-queue')
      const redis = getRedisConnection()
      const monitorQueue = new Queue(TRYON_QUEUE_NAME, { connection: redis })
      const waitingCount = await monitorQueue.getWaitingCount()
      await monitorQueue.close()

      if (waitingCount >= MAX_QUEUE_DEPTH) {
        await service
          .from('generation_jobs')
          .update({ status: 'failed', error_message: 'Queue full — rejected before enqueue.' })
          .eq('id', job.id)
        return NextResponse.json(
          {
            error: 'Our generation queue is full right now. Please try again in a few minutes.',
            code: 'QUEUE_FULL',
            queueDepth: waitingCount,
            retryAfterSeconds: 60,
          },
          { status: 503, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } }
        )
      }

      if (isDev) console.log(`📋 Queue depth: ${waitingCount}/${MAX_QUEUE_DEPTH}`)
    } catch (depthErr) {
      // Non-fatal — if we can't check depth, proceed and let BullMQ handle it
      console.warn('[tryon] could not check queue depth:', depthErr)
    }

    try {
      await enqueueTryOnJob({ jobId: job.id, userId })
      return NextResponse.json(
        {
          success: true,
          queued: true,
          jobId: job.id,
          status: 'pending',
          selectionMethod,
          selectedPhotoIds,
        },
        { status: 202, headers: { 'Cache-Control': 'no-store' } }
      )
    } catch (queueError) {
      console.error('[tryon] failed to enqueue presetless generation job:', queueError)
      await service
        .from('generation_jobs')
        .update({
          status: 'failed',
          error_message: 'Failed to queue generation job.',
        })
        .eq('id', job.id)
      return jsonError(500, 'QUEUE_ENQUEUE_FAILED', 'Failed to queue generation job. Please try again.')
    }
  }
  if (isQueueAvailable()) {
    console.warn('[tryon] queue configured but no live worker heartbeat; running inline fallback')
  }

  await service
    .from('generation_jobs')
    .update({ status: 'processing', error_message: null })
    .eq('id', job.id)

  // ── GLOBAL RATE LIMIT (Redis) ─────────────────────────────────────────
  let redisGlobalAcquired = false
  try {
    if (!TRYON_RATE_LIMIT_DISABLED && process.env.NODE_ENV === 'production' && isRedisConfigured()) {
      try {
        const redis = getRedisConnection()
        const activeCount = await redis.incr(GLOBAL_ACTIVE_KEY)
        redisGlobalAcquired = true
        if (activeCount === 1) {
          await redis.expire(GLOBAL_ACTIVE_KEY, GLOBAL_ACTIVE_TTL_SECONDS)
        }
        if (activeCount > GLOBAL_ACTIVE_LIMIT) {
          await redis.decr(GLOBAL_ACTIVE_KEY)
          redisGlobalAcquired = false
          await service
            .from('generation_jobs')
            .update({
              status: 'failed',
              error_message: 'Server busy, please wait and retry.',
            })
            .eq('id', job.id)
          return NextResponse.json(
            {
              error: 'Server busy, please wait and retry.',
              code: 'SERVER_BUSY',
              retryAfterSeconds: 10,
              jobId: job.id,
            },
            { status: 429, headers: { 'Retry-After': '10', 'Cache-Control': 'no-store' } }
          )
        }
      } catch (redisErr) {
        console.warn('[tryon] global guard unavailable, continuing without cap:', redisErr)
        redisGlobalAcquired = false
      }
    }

    // ── GARMENT INTELLIGENCE (cached) ────────────────────────────────────
    if (isDev) {
      console.log('\n━━━ GARMENT INTELLIGENCE ━━━')
      console.log(`   Original garment size: ${normalizedGarment.length} chars (${Math.round(normalizedGarment.length * 0.75 / 1024)}KB)`)
      console.log(`   Processed garment size: ${processedGarment.length} chars (${Math.round(processedGarment.length * 0.75 / 1024)}KB)`)
      console.log(`   Garment preprocessing: extracted=${garmentPreprocess.wasExtracted} bodyDetected=${garmentPreprocess.bodyDetected} method=${garmentPreprocess.extractionMethod}`)
    }

    // ── PARALLEL GENERATION — fire all 3 at once ─────────────────────────
    const successfulOutputs: PresetlessPersistedOutput[] = []
    const failedAttempts: Array<{ referenceImageId: string; error: string }> = []
    const targetOutputCount = 3
    const TARGET_PHOTOS = orderedPhotos.slice(0, targetOutputCount)
    const smartPrompt = composeSmartPrompt(garmentIntel, {
      aspectRatio: payload.aspectRatio || '4:5',
      polishNotes: payload.polishNotes?.trim() || undefined,
    })
    if (isDev) console.log(`\n🚀 Starting ${TARGET_PHOTOS.length} generations in PARALLEL | prompt: ${smartPrompt.length} chars`)

    const generationResults = await Promise.allSettled(
      TARGET_PHOTOS.map(async (photo, idx) => {
        const referenceImageBase64 = orderedReferenceBase64s[idx]
        if (isDev) console.log(`🎯 Gen ${idx + 1}/${TARGET_PHOTOS.length} → photo: ${photo.id}`)

        const generatedImage = await generateTryOnDirect({
          personImageBase64: referenceImageBase64,
          garmentImageBase64: processedGarment,
          prompt: smartPrompt,
          aspectRatio: payload.aspectRatio || '4:5',
          model: directRenderModel,
        })

        // Save to storage
        let outputImagePath = generatedImage
        try {
          const cleanBase64 = generatedImage.replace(/^data:image\/[a-z+]+;base64,/, '')
          const storedUrl = await saveUpload(
            cleanBase64,
            `tryon/${userId}/${job.id}/${idx + 1}-${photo.id}.png`,
            'try-ons'
          )
          if (storedUrl) outputImagePath = storedUrl
        } catch (storageError) {
          console.error(`[tryon] storage failed for slot ${idx + 1}, using base64 fallback:`, storageError)
        }

        if (isDev) console.log(`✅ Gen ${idx + 1} complete → slot ${idx + 1}`)
        return { photo, outputImagePath, slot: idx + 1 }
      })
    )

    // Collect results
    for (const result of generationResults) {
      if (result.status === 'fulfilled') {
        const { photo, outputImagePath, slot } = result.value
        successfulOutputs.push({
          referenceImageId: photo.id,
          status: 'completed',
          outputImagePath,
          label: `Source ${slot}`,
          validation: { qualityScores: undefined, warnings: ['qa_skipped_parallel'], garmentGuardrail: undefined },
        })
      } else {
        const message = result.reason instanceof Error ? result.reason.message : 'Generation failed'
        console.error(`[tryon] parallel generation failed:`, message)
        failedAttempts.push({ referenceImageId: 'unknown', error: message })
      }
    }


    const outputs: PresetlessPersistedOutput[] = [...successfulOutputs]

    if (outputs.length < targetOutputCount && failedAttempts.length > 0) {
      const missingCount = targetOutputCount - outputs.length
      const fallbackFailures = failedAttempts.slice(-missingCount)
      fallbackFailures.forEach((failure, index) => {
        outputs.push({
          referenceImageId: failure.referenceImageId,
          status: 'failed',
          error: failure.error,
          label: `Source ${successfulOutputs.length + index + 1}`,
        })
      })
    }

    selectedPhotoIds = outputs
      .map((output) => output.referenceImageId)
      .filter((photoId): photoId is string => Boolean(photoId))

    // ── BUILD RESPONSE ──────────────────────────────────────────────────
    const normalizedOutputs = getJobOutputsFromRecord({
      output_image_path: null,
      settings: { outputs },
    })
    const firstSuccessfulOutput = getFirstSuccessfulOutput(normalizedOutputs)
    const successCount = normalizedOutputs.filter((output) => output.status === 'completed').length
    const failedCount = outputs.length - successCount
    const status =
      successCount === 0
        ? 'failed'
        : successCount === outputs.length
          ? 'completed'
          : 'completed_partial'
    const aggregatedError =
      successCount === 0
        ? outputs.map((output) => output.error).filter(Boolean).join(' | ').slice(0, 1200)
        : failedCount > 0
          ? `${failedCount} of ${outputs.length} outputs failed.`
          : null

    await service
      .from('generation_jobs')
      .update({
        status,
        output_image_path: firstSuccessfulOutput?.outputImagePath || null,
        error_message: aggregatedError,
        settings: {
          ...(job.settings as object),
          outputs,
          outcome: {
            pipeline: 'nano-banana-pro-inline-reference-library',
            model: directRenderModel,
            requestedModel: configuredRenderModel,
            strictSwap: true,
            garmentPreprocess: {
              wasExtracted: garmentPreprocess.wasExtracted,
              bodyDetected: garmentPreprocess.bodyDetected,
              confidence: garmentPreprocess.confidence,
              extractionMethod: garmentPreprocess.extractionMethod,
            },
            garmentClassification: garmentClassificationSummary,
            strictOutputQa: {
              mode: TRYON_OUTPUT_QA_MODE,
              enabled: TRYON_OUTPUT_QA_MODE !== 'off',
              garmentGuardrailEnabled:
                TRYON_OUTPUT_QA_MODE !== 'off' &&
                Boolean(
                  garmentClassificationSummary &&
                  garmentClassificationSummary.category !== 'UNKNOWN' &&
                  garmentClassificationSummary.confidence >= GARMENT_GUARDRAIL_MIN_CONFIDENCE
                ),
              garmentGuardrailMinConfidence: GARMENT_GUARDRAIL_MIN_CONFIDENCE,
            },
            selectionMethod,
            selectionReasoning,
            successCount,
            failedCount,
            outputs,
          },
        },
      })
      .eq('id', job.id)

    if (successCount === 0) {
      const allQualityRejected = outputs.every(
        (output) =>
          output.status === 'failed' &&
          /rejected by strict face consistency gate|rejected by quality gate|output rejected|garment_guardrail/i.test(output.error || '')
      )

      return NextResponse.json(
        {
          success: false,
          error: allQualityRejected
            ? 'All three try-on drafts were rejected because face or garment fidelity was too low. Please upload stronger source photos and try again.'
            : 'All three try-on drafts failed. Please try again.',
          code: allQualityRejected ? 'TRYON_OUTPUT_REJECTED' : 'TRYON_GENERATION_FAILED',
          jobId: job.id,
          status,
          outputs: normalizedOutputs,
          selectionMethod,
        },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status,
      imageUrl: firstSuccessfulOutput?.imageUrl,
      base64Image: firstSuccessfulOutput?.base64Image,
      output_image_path: firstSuccessfulOutput?.outputImagePath,
      outputs: normalizedOutputs,
      selectionMethod,
      selectedPhotoIds,
    })
  } finally {
    if (isRedisConfigured() && redisGlobalAcquired) {
      try {
        const redis = getRedisConnection()
        const remaining = await redis.decr(GLOBAL_ACTIVE_KEY)
        if (remaining < 0) {
          await redis.set(GLOBAL_ACTIVE_KEY, '0')
        }
      } catch (releaseErr) {
        console.warn('[tryon] failed to release global active counter:', releaseErr)
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(request: Request) {
  let redisUserLockKey: string | null = null
  // Track the generation gate requestId so we can release the lock + record cost
  // in the finally block, regardless of how the request exits.
  let gateRequestId: string | null = null
  let gateUserId: string | null = null
  const configuredRenderModel = getTryOnRenderModel()
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = createServiceClient()

    if (isDev) {
      console.log('🔑 Auth check:', { sessionUserId: authUser.id })
    }

    // Get profile from Supabase profiles table (SOURCE OF TRUTH)
    const { data: profile, error: profileError } = await service
      .from('profiles')
      .select('id, email, role, approval_status, onboarding_completed')
      .eq('id', authUser.id)
      .single()

    let currentProfile = profile

    if (profileError || !currentProfile) {
      console.error('❌ FATAL: Profile not found for user!', {
        sessionUserId: authUser.id,
        error: profileError,
      })
      const { data: newProfile, error: createError } = await service
        .from('profiles')
        .insert({
          id: authUser.id,
          email: authUser.email,
          role: 'influencer',
          approval_status: 'pending',
          onboarding_completed: false,
        })
        .select()
        .single()

      if (createError) {
        console.error('[tryon] profile auto-create failed:', createError)
        return jsonError(400, 'USER_NOT_FOUND', 'User initialization failed. Please log out and log in again.')
      }

      currentProfile = newProfile
    }

    if (isDev) {
      console.log('📋 User Status Check:', { userId: authUser.id, role: currentProfile?.role, status: currentProfile?.approval_status })
    }

    const approvalStatus = (currentProfile?.approval_status || '').toLowerCase()
    const onboardingCompleted = Boolean(currentProfile?.onboarding_completed)

    if (!onboardingCompleted) {
      return jsonError(
        403,
        'ONBOARDING_INCOMPLETE',
        'Complete your influencer onboarding before using the try-on studio.'
      )
    }

    if (approvalStatus === 'rejected') {
      return jsonError(
        403,
        'ACCOUNT_REJECTED',
        'Your creator profile needs updates before approval. Please edit and resubmit your onboarding.'
      )
    }

    if (approvalStatus !== 'approved') {
      return jsonError(
        403,
        'NOT_APPROVED',
        `Your account is ${approvalStatus || 'pending'}. Please wait for admin approval.`,
        { approvalStatus: approvalStatus || 'pending' }
      )
    }

    const role = (currentProfile?.role || 'influencer').toLowerCase()

    if (role !== 'influencer') {
      return jsonError(403, 'PROFILE_INCOMPLETE', 'Influencer account required for try-on generation.')
    }

    // Check InfluencerProfile exists
    const { data: influencerProfile } = await service
      .from('influencer_profiles')
      .select('id')
      .eq('user_id', authUser.id)
      .single()

    // Auto-create InfluencerProfile if missing
    if (!influencerProfile) {
      if (isDev) console.log('🔧 Auto-creating InfluencerProfile for approved user:', authUser.id)
      try {
        const { error: influencerProfileCreateError } = await service
          .from('influencer_profiles')
          .insert({
            user_id: authUser.id,
            niches: [],
            socials: {},
          })
        if (influencerProfileCreateError) {
          console.error('[tryon] failed to create influencer profile scaffold:', influencerProfileCreateError)
          return jsonError(
            500,
            'PROFILE_SETUP_FAILED',
            'We could not prepare your influencer profile for try-on yet. Please refresh once and try again.'
          )
        }
        if (isDev) console.log('✅ InfluencerProfile created')
      } catch (profileError) {
        console.error('Failed to create InfluencerProfile:', profileError)
        return jsonError(
          500,
          'PROFILE_SETUP_FAILED',
          'We could not prepare your influencer profile for try-on yet. Please refresh once and try again.'
        )
      }
    }

    const userId = authUser.id
    if (isDev) console.log('✅ User verified, generating try-on:', { userId })

    // ── Generation gate: daily cap + cooldown + kill switch ─────────────────
    // Runs in all environments (not gated by TRYON_RATE_LIMIT_DISABLED).
    // This is the cost-protection layer — it must always be active.
    if (process.env.NODE_ENV === 'production' || process.env.TRYON_LIMITER_ENABLED === 'true') {
      const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown'
      const gate = checkGenerationGate(userId, ip)
      if (!gate.allowed) {
        return NextResponse.json(
          {
            error: gate.blockReason || 'Generation limit reached. Please try again later.',
            code: 'GENERATION_LIMIT',
            remainingToday: gate.remainingToday,
            killSwitchActive: gate.killSwitchActive,
          },
          { status: 429, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } }
        )
      }
      // Capture for cleanup in the finally block at the bottom of POST.
      gateRequestId = gate.requestId
      gateUserId = userId
    }

    if (!TRYON_RATE_LIMIT_DISABLED) {
      const activeJob = await findRecentActiveTryOnJob(service, userId)
      if (activeJob) {
        return NextResponse.json(
          {
            error: 'A try-on is already in progress. Please wait for it to finish.',
            code: 'JOB_IN_PROGRESS',
            retryAfterSeconds: 15,
            jobId: activeJob.id,
          },
          { status: 429, headers: { 'Retry-After': '15', 'Cache-Control': 'no-store' } }
        )
      }
    }

    if (!TRYON_RATE_LIMIT_DISABLED && !isQueueAvailable()) {
      const activeGlobalJobs = await countRecentActiveTryOnJobs(service)
      if (activeGlobalJobs !== null && activeGlobalJobs >= GLOBAL_ACTIVE_LIMIT) {
        return NextResponse.json(
          {
            error: 'Try-on is busy right now. Please wait a bit and retry.',
            code: 'SERVER_BUSY',
            retryAfterSeconds: 20,
          },
          { status: 429, headers: { 'Retry-After': '20', 'Cache-Control': 'no-store' } }
        )
      }
    }

    // Per-user lock
    if (!TRYON_RATE_LIMIT_DISABLED && isRedisConfigured()) {
      try {
        const redis = getRedisConnection()
        redisUserLockKey = `tryon:user:${userId}:generating`
        const lockResult = await redis.set(redisUserLockKey, '1', 'EX', USER_LOCK_TTL_SECONDS, 'NX')
        if (lockResult !== 'OK') {
          return NextResponse.json(
            {
              error: 'A try-on is already in progress. Please wait for it to finish.',
              code: 'JOB_IN_PROGRESS',
              retryAfterSeconds: 10,
            },
            { status: 429, headers: { 'Retry-After': '10', 'Cache-Control': 'no-store' } }
          )
        }
      } catch (redisErr) {
        console.warn('[tryon] user lock unavailable, continuing without lock:', redisErr)
        redisUserLockKey = null
      }
    }

    // ── ROUTE TO PRESETLESS HANDLER ─────────────────────────────────────
    const body = await request.json().catch(() => null)
    return await handlePresetlessTryOnRequest({
      service,
      userId,
      body,
      configuredRenderModel,
    })
  } catch (error) {
    console.error('Try-on generation error:', error)
    if (error instanceof ZodError) {
      return jsonError(400, 'INVALID_TRYON_INPUT', 'Try-on input is invalid. Please re-upload your images and try again.')
    }
    if (error instanceof GeminiRateLimitError) {
      const retryAfterSeconds = Math.min(60, Math.ceil((error.retryAfterMs || 30_000) / 1000)) || 30
      return NextResponse.json(
        {
          error: error.message || 'Rate limit reached. Please retry shortly.',
          code: 'RATE_LIMIT',
          retryAfterSeconds,
        },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds), 'Cache-Control': 'no-store' } }
      )
    }
    const message = error instanceof Error ? error.message : 'Internal server error'
    return jsonError(500, 'TRYON_REQUEST_FAILED', message)
  } finally {
    if (isRedisConfigured() && redisUserLockKey) {
      try {
        const redis = getRedisConnection()
        await redis.del(redisUserLockKey)
      } catch (releaseErr) {
        console.warn('[tryon] failed to release user lock:', releaseErr)
      }
    }
    // ── Release generation gate session lock + record cost ──────────────────
    // Marks the request as finished so the user's session lock is released
    // and the daily count + cost are recorded.
    // Estimated 3 Gemini calls per try-on (3 reference photos in parallel).
    if (gateRequestId && gateUserId) {
      try {
        completeGeneration(gateUserId, gateRequestId, 'success', 3)
      } catch (gateErr) {
        console.warn('[tryon] failed to release generation gate:', gateErr)
      }
    }
  }
}

