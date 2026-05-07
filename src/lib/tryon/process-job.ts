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
import { analyzeGarment, composeSmartPrompt } from '@/lib/tryon/garment-intel'
import { generateTryOnDirect, type DirectTryOnOptions } from '@/lib/nanobanana'

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
  }
}

interface ProcessPersistedOutput {
  referenceImageId: string
  status: 'completed' | 'failed'
  outputImagePath?: string
  error?: string
  label: string
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

    const garmentIntel = await analyzeGarment(processedGarment, garmentTextHint)
    const successfulOutputs: ProcessPersistedOutput[] = []
    const failedAttempts: Array<{ referenceImageId: string; error: string }> = []
    const targetOutputCount = 3

    const smartPrompt = composeSmartPrompt(garmentIntel, {
      aspectRatio,
      polishNotes: settings.polishNotes?.trim() || undefined,
    })

    console.log(
      `🚀 process-job: starting ${orderedPhotos.slice(0, 3).length} parallel generations for job ${jobId}`
    )

    const generationResults = await Promise.allSettled(
      orderedPhotos.slice(0, 3).map(async (photo, idx) => {
        const referenceImageBase64 = orderedReferenceBase64s[idx]

        const generatedImage = await generateTryOnDirect({
          personImageBase64: referenceImageBase64,
          garmentImageBase64: processedGarment,
          prompt: smartPrompt,
          aspectRatio,
          model: directRenderModel,
        })

        let outputImagePath = generatedImage
        try {
          const cleanBase64 = generatedImage.replace(/^data:image\/[a-z+]+;base64,/, '')
          const storedUrl = await saveUpload(
            cleanBase64,
            `tryon/${userId}/${jobId}/${idx + 1}-${photo.id}.png`,
            'try-ons'
          )
          if (storedUrl) outputImagePath = storedUrl
        } catch (saveError) {
          console.warn(`process-job: storage save failed for ${jobId} slot ${idx + 1}:`, saveError)
        }

        return { photo, outputImagePath, slot: idx + 1 }
      })
    )

    for (const result of generationResults) {
      if (result.status === 'fulfilled') {
        const { photo, outputImagePath, slot } = result.value
        successfulOutputs.push({
          referenceImageId: photo.id,
          status: 'completed',
          outputImagePath,
          label: `Source ${slot}`,
        })
      } else {
        const err = result.reason
        if (err instanceof GeminiRateLimitError) throw err // re-throw for upstream retry
        failedAttempts.push({
          referenceImageId: 'unknown',
          error: err instanceof Error ? err.message : 'Generation failed',
        })
      }
    }

    const outputs: ProcessPersistedOutput[] = [...successfulOutputs]
    if (outputs.length < targetOutputCount && failedAttempts.length > 0) {
      const missingCount = targetOutputCount - outputs.length
      failedAttempts.slice(-missingCount).forEach((failure, index) => {
        outputs.push({
          referenceImageId: failure.referenceImageId,
          status: 'failed',
          error: failure.error,
          label: `Source ${successfulOutputs.length + index + 1}`,
        })
      })
    }

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
