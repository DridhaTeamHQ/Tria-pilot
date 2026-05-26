/**
 * Shared try-on job processor.
 *
 * Runs the actual Gemini generation pipeline for a queued job. Used by:
 *   - BullMQ worker (src/workers/tryon-worker.ts)
 *   - QStash HTTP endpoint (src/app/api/tryon/process/route.ts)
 *
 * Takes a jobId, fetches all required data from the database, generates
 * 3 try-ons in parallel, saves outputs, and updates the job status.
 *
 * Throws GeminiRateLimitError to allow upstream retry; other errors are
 * recorded against the job before re-throwing.
 */

import 'server-only'
import { createServiceClient } from '@/lib/auth'
import { GeminiRateLimitError } from '@/lib/gemini/executor'
import { normalizeBase64 } from '@/lib/image-processing'
import { fetchReferencePhotoAsBase64, getReferencePhotosByIds } from '@/lib/reference-photos/service'
import { saveUpload } from '@/lib/storage'
import { getFirstSuccessfulOutput, getJobOutputsFromRecord } from '@/lib/tryon/job-outputs'
import { analyzeGarment } from '@/lib/tryon/garment-intel'
import type { DirectTryOnOptions } from '@/lib/nanobanana'
import { runCleanTryOn, isCleanTryOnSlotSuccess } from '@/lib/tryon/clean-tryon'
import { extractFaceCrop } from '@/lib/tryon/face-crop'
import type { StrictGarmentProfile } from '@/lib/tryon/garment-strict-schema'

interface ProcessGenerationJobRow {
  id: string
  user_id: string
  inputs: {
    productId?: string | null
    clothingImage?: string | null
    garmentImageUrl?: string | null
    garmentImageBase64?: string | null
    selectedReferenceImageIds?: string[] | null
    candidateReferenceImageIds?: string[] | null
    selectionMethod?: 'manual' | 'auto_scoring' | null
    selectionReasoning?: string | null
  }
  settings: {
    outputs?: unknown[]
    model?: string | null
    requestedModel?: string | null
    aspectRatio?: '1:1' | '4:5' | '3:4' | '9:16' | null
    resolution?: '1K' | '2K' | '4K' | null
    polishNotes?: string | null
    strictGarmentProfile?: StrictGarmentProfile | null
  }
}

interface ProcessPersistedOutput {
  referenceImageId: string
  status: 'completed' | 'failed'
  outputImagePath?: string
  error?: string
  label: string
  validation?: {
    qualityScores?: {
      faceIdentity: number
      bodyConsistency: number
      compositionQuality: number
      backgroundIntegrity: number
      garmentFidelity: number
    }
    warnings?: string[]
  }
}

function ensureArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : []
}

function ensureHasValue(value: string | undefined | null, message: string): string {
  if (!value) throw new Error(message)
  return value
}

async function fetchGenerationJob(jobId: string): Promise<ProcessGenerationJobRow> {
  const service = createServiceClient()
  const { data, error } = await service
    .from('generation_jobs')
    .select('id, user_id, inputs, settings')
    .eq('id', jobId)
    .single()

  if (error || !data) {
    throw new Error(`Generation job ${jobId} not found`)
  }

  return data as unknown as ProcessGenerationJobRow
}

async function markJobStatus(jobId: string, patch: Record<string, unknown>) {
  const service = createServiceClient()
  const { error } = await service.from('generation_jobs').update(patch).eq('id', jobId)
  if (error) {
    throw new Error(`Failed updating generation job ${jobId}: ${error.message}`)
  }
}

/**
 * Run the full try-on generation pipeline for a single job.
 *
 * @param jobId - the generation_jobs row ID to process
 * @throws GeminiRateLimitError - upstream caller should retry
 * @throws Error - any other failure (job is already marked failed before throw)
 */
export async function processTryOnJob(jobId: string): Promise<void> {
  await markJobStatus(jobId, {
    status: 'processing',
    error_message: null,
  })

  try {
    const service = createServiceClient()
    const generationJob = await fetchGenerationJob(jobId)
    const { inputs, settings } = generationJob
    const userId = generationJob.user_id
    const aspectRatio = settings.aspectRatio || '4:5'
    const directRenderModel = ensureHasValue(
      settings.model,
      'Missing try-on model in job settings'
    ) as DirectTryOnOptions['model']
    const selectedPhotoIds = ensureArray(inputs.selectedReferenceImageIds)
    const candidatePhotoIds =
      ensureArray(inputs.candidateReferenceImageIds).length > 0
        ? ensureArray(inputs.candidateReferenceImageIds)
        : selectedPhotoIds
    const selectionMethod = inputs.selectionMethod || 'manual'
    const selectionReasoning = inputs.selectionReasoning || ''
    const processedGarment = normalizeBase64(
      ensureHasValue(
        inputs.garmentImageBase64 || inputs.clothingImage,
        'Missing normalized garment image in queued try-on job'
      )
    )

    if (candidatePhotoIds.length < 3) {
      throw new Error('Queued try-on job is missing enough candidate reference photos.')
    }

    const candidatePhotos = await getReferencePhotosByIds(service, userId, candidatePhotoIds)
    const selectedMap = new Map(candidatePhotos.map(photo => [photo.id, photo]))
    const orderedPhotos = candidatePhotoIds
      .map(photoId => selectedMap.get(photoId) || null)
      .filter((photo): photo is NonNullable<typeof photo> => Boolean(photo))

    if (orderedPhotos.length < 3) {
      throw new Error('Could not resolve queued reference photos for try-on.')
    }

    const orderedReferenceBase64s = await Promise.all(
      orderedPhotos.map(photo =>
        fetchReferencePhotoAsBase64(photo.image_url).then(base64 => normalizeBase64(base64))
      )
    )
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

    // Heuristic text hint for fallback when Gemini analysis 503s
    let garmentTextHint: string | undefined
    if (inputs.productId) {
      try {
        const { data: prod } = await service
          .from('products')
          .select('name, description')
          .eq('id', inputs.productId)
          .maybeSingle()
        if (prod) {
          garmentTextHint = `${prod.name || ''} ${prod.description || ''}`.trim().slice(0, 300) || undefined
        }
      } catch { /* non-fatal */ }
    }

    // Pre-compute garment intel so the clean pipeline can skip its own
    // analyzer call (it accepts prebuiltIntel).
    const garmentIntel = await analyzeGarment(processedGarment, garmentTextHint)
    const successfulOutputs: ProcessPersistedOutput[] = []
    const targetOutputCount = 3

    console.log(`🚀 process-job: clean pipeline for job ${jobId}`)

    // ── CLEAN PIPELINE ────────────────────────────────────────────────
    // Same FLUX-first pipeline as the inline /api/tryon path. Keeps the
    // async (QStash) path identical in quality to the sync path.
    const cleanResult = await runCleanTryOn({
      garmentImageBase64: processedGarment,
      candidatePhotos: orderedPhotos.slice(0, 8).map((photo: any, idx: number) => ({
        id: photo.id,
        imageUrl: photo.image_url || photo.imageUrl,
        base64: orderedReferenceBase64s[idx] || '',
        faceCropBase64: preExtractedFaceCrops[idx] || undefined,
        bodyVisibility: photo.body_visibility || photo.bodyVisibility,
        framing: photo.framing,
        description: photo.description || photo.caption,
      })).filter((p) => p.base64.length > 100),
      productText: garmentTextHint,
      aspectRatio: aspectRatio as any,
      prebuiltIntel: garmentIntel,
      prebuiltStrictGarmentProfile: settings.strictGarmentProfile || null,
      garmentAlreadyPreprocessed: true,
    })

    // Persist successful slots to storage; collect failures.
    const outputs: ProcessPersistedOutput[] = []
    await Promise.all(cleanResult.selections.map(async (sel, idx) => {
      if (!isCleanTryOnSlotSuccess(sel)) {
        outputs.push({
          referenceImageId: sel.photoId,
          status: 'failed',
          error: sel.error,
          label: `Source ${idx + 1}`,
        })
        return
      }
      let outputImagePath = sel.outputBase64
      try {
        const cleanBase64 = sel.outputBase64.replace(/^data:image\/[a-z+]+;base64,/, '')
        const storedUrl = await saveUpload(
          cleanBase64,
          `tryon/${userId}/${jobId}/${idx + 1}-${sel.photoId}.png`,
          'try-ons'
        )
        if (storedUrl) outputImagePath = storedUrl
      } catch (saveError) {
        console.warn(`process-job: storage save failed for ${jobId} slot ${idx + 1}:`, saveError)
      }
      const persisted: ProcessPersistedOutput = {
        referenceImageId: sel.photoId,
        status: 'completed',
        outputImagePath,
        label: `Source ${idx + 1}`,
        validation: {
          qualityScores: sel.identityAssessment?.scores,
          warnings: [
            'clean_pipeline',
            sel.identityAssessment
              ? `identity_guard:${sel.identityAssessment.reason}`
              : 'identity_guard:not_checked',
          ],
        },
      }
      outputs.push(persisted)
      successfulOutputs.push(persisted)
    }))
    void targetOutputCount

    const normalizedOutputs = getJobOutputsFromRecord({
      output_image_path: null,
      settings: { outputs },
    })
    const firstSuccessfulOutput = getFirstSuccessfulOutput(normalizedOutputs)
    const successCount = normalizedOutputs.filter(output => output.status === 'completed').length
    const failedCount = outputs.length - successCount
    const status =
      successCount === 0
        ? 'failed'
        : successCount === outputs.length
          ? 'completed'
          : 'completed_partial'
    const aggregatedError =
      successCount === 0
        ? outputs
            .map(output => output.error)
            .filter(Boolean)
            .join(' | ')
            .slice(0, 1200)
        : failedCount > 0
          ? `${failedCount} of ${outputs.length} outputs failed.`
          : null

    await markJobStatus(jobId, {
      status,
      output_image_path: firstSuccessfulOutput?.outputImagePath || null,
      error_message: aggregatedError,
      settings: {
        ...(settings || {}),
        outputs,
        outcome: {
          pipeline: 'nano-banana-pro-process-job',
          model: directRenderModel,
          requestedModel: settings.requestedModel || null,
          strictSwap: true,
          strictGarmentProfile: settings.strictGarmentProfile || null,
          selectionMethod,
          selectionReasoning,
          successCount,
          failedCount,
          outputs,
        },
      },
    })
  } catch (error) {
    if (error instanceof GeminiRateLimitError) throw error

    const message = error instanceof Error ? error.message : String(error)
    await markJobStatus(jobId, {
      status: 'failed',
      error_message: message,
    }).catch(() => {})
    throw error
  }
}
