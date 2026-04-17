import 'dotenv/config'
import { Job, Worker } from 'bullmq'
import { createServiceClient } from '@/lib/auth'
import { GeminiRateLimitError } from '@/lib/gemini/executor'
import { normalizeBase64 } from '@/lib/image-processing'
import { getRedisConnection } from '@/lib/queue/redis'
import { TRYON_QUEUE_NAME, type TryOnQueueJobData } from '@/lib/queue/tryon-queue'
import { getTryOnWorkerHeartbeatIntervalMs, touchTryOnWorkerHeartbeat } from '@/lib/queue/tryon-worker-health'
import { fetchReferencePhotoAsBase64, getReferencePhotosByIds } from '@/lib/reference-photos/service'
import { saveUpload } from '@/lib/storage'
import { getFirstSuccessfulOutput, getJobOutputsFromRecord } from '@/lib/tryon/job-outputs'
import { analyzeGarment, composeSmartPrompt } from '@/lib/tryon/garment-intel'
import { generateTryOnDirect, type DirectTryOnOptions } from '@/lib/nanobanana'

const INTER_GENERATION_DELAY_MS = Math.max(
  0,
  Number.parseInt(process.env.TRYON_INTER_GENERATION_DELAY_MS || '3000', 10) || 3000
)

interface WorkerGenerationJobRow {
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

interface WorkerPersistedOutput {
  referenceImageId: string
  status: 'completed' | 'failed'
  outputImagePath?: string
  error?: string
  label: string
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function ensureArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : []
}

function ensureHasValue(value: string | undefined | null, message: string): string {
  if (!value) throw new Error(message)
  return value
}

async function fetchGenerationJob(jobId: string): Promise<WorkerGenerationJobRow> {
  const service = createServiceClient()
  const { data, error } = await service
    .from('generation_jobs')
    .select('id, user_id, inputs, settings')
    .eq('id', jobId)
    .single()

  if (error || !data) {
    throw new Error(`Generation job ${jobId} not found`)
  }

  return data as unknown as WorkerGenerationJobRow
}

async function markJobStatus(jobId: string, patch: Record<string, unknown>) {
  const service = createServiceClient()
  const { error } = await service
    .from('generation_jobs')
    .update(patch)
    .eq('id', jobId)

  if (error) {
    throw new Error(`Failed updating generation job ${jobId}: ${error.message}`)
  }
}

async function processTryOnJob(queueJob: Job<TryOnQueueJobData>): Promise<void> {
  const { jobId } = queueJob.data
  await markJobStatus(jobId, {
    status: 'processing',
    error_message: null,
  })

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
  const candidatePhotoIds = ensureArray(inputs.candidateReferenceImageIds).length > 0
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
  const selectedMap = new Map(candidatePhotos.map((photo) => [photo.id, photo]))
  const orderedPhotos = candidatePhotoIds
    .map((photoId) => selectedMap.get(photoId) || null)
    .filter((photo): photo is NonNullable<typeof photo> => Boolean(photo))

  if (orderedPhotos.length < 3) {
    throw new Error('Could not resolve queued reference photos for try-on.')
  }

  const orderedReferenceBase64s = await Promise.all(
    orderedPhotos.map((photo) => fetchReferencePhotoAsBase64(photo.image_url).then((base64) => normalizeBase64(base64)))
  )

  const garmentIntel = await analyzeGarment(processedGarment)
  const successfulOutputs: WorkerPersistedOutput[] = []
  const failedAttempts: Array<{ referenceImageId: string; error: string }> = []
  const targetOutputCount = 3

  for (let candidateIndex = 0; candidateIndex < orderedPhotos.length; candidateIndex += 1) {
    if (successfulOutputs.length >= targetOutputCount) break

    const photo = orderedPhotos[candidateIndex]
    const referenceImageBase64 = orderedReferenceBase64s[candidateIndex]
    const outputSlot = successfulOutputs.length + 1

    if (candidateIndex > 0) {
      await sleep(INTER_GENERATION_DELAY_MS)
    }

    try {
      const smartPrompt = composeSmartPrompt(garmentIntel, {
        aspectRatio,
        polishNotes: settings.polishNotes?.trim() || undefined,
      })

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
          `tryon/${userId}/${jobId}/${outputSlot}-${photo.id}.png`,
          'try-ons'
        )
        if (storedUrl) {
          outputImagePath = storedUrl
        }
      } catch (saveError) {
        console.warn(`Try-on worker storage save failed for ${jobId}:`, saveError)
      }

      successfulOutputs.push({
        referenceImageId: photo.id,
        status: 'completed',
        outputImagePath,
        label: `Source ${outputSlot}`,
      })
    } catch (error) {
      if (error instanceof GeminiRateLimitError) {
        throw error
      }

      failedAttempts.push({
        referenceImageId: photo.id,
        error: error instanceof Error ? error.message : 'Generation failed',
      })
    }
  }

  const outputs: WorkerPersistedOutput[] = [...successfulOutputs]
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

  await markJobStatus(jobId, {
    status,
    output_image_path: firstSuccessfulOutput?.outputImagePath || null,
    error_message: aggregatedError,
    settings: {
      ...(settings || {}),
      outputs,
      outcome: {
        pipeline: 'nano-banana-pro-worker-reference-library',
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
}

const worker = new Worker<TryOnQueueJobData>(
  TRYON_QUEUE_NAME,
  async (job) => {
    try {
      await processTryOnJob(job)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (error instanceof GeminiRateLimitError) {
        throw error
      }

      await markJobStatus(job.data.jobId, {
        status: 'failed',
        error_message: message,
      })
      throw error
    }
  },
  {
    connection: getRedisConnection(),
    concurrency: 4,
  }
)

void touchTryOnWorkerHeartbeat()
const heartbeatTimer = setInterval(() => {
  void touchTryOnWorkerHeartbeat()
}, getTryOnWorkerHeartbeatIntervalMs())

worker.on('completed', (job) => {
  console.log(`✅ Try-on worker completed job ${job.id}`)
})

worker.on('failed', async (job, err) => {
  if (!job) return
  const message = err instanceof Error ? err.message : String(err)
  const attempts = job.opts.attempts ?? 1
  const exhausted = job.attemptsMade >= attempts

  if (exhausted) {
    try {
      await markJobStatus(job.data.jobId, {
        status: 'failed',
        error_message: message,
      })
    } catch (updateError) {
      console.error(`Failed to mark job ${job.data.jobId} as failed:`, updateError)
    }
  } else if (err instanceof GeminiRateLimitError) {
    try {
      await markJobStatus(job.data.jobId, {
        status: 'pending',
        error_message: `Rate limited by Gemini. Auto-retrying (attempt ${job.attemptsMade + 1}/${attempts}).`,
      })
    } catch (updateError) {
      console.error(`Failed to mark job ${job.data.jobId} as pending retry:`, updateError)
    }
  }
})

const shutdown = async () => {
  console.log('🛑 Shutting down try-on worker...')
  clearInterval(heartbeatTimer)
  await worker.close()
  await getRedisConnection().quit()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

console.log(`👷 Try-on worker online. Queue=${TRYON_QUEUE_NAME}`)
