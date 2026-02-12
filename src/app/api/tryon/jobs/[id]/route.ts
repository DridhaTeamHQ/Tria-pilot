import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function isBase64StoragePath(path: string | null): boolean {
  return Boolean(path && path.startsWith('base64://'))
}

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await ctx.params
    const service = createServiceClient()
    const { data: job, error } = await service
      .from('generation_jobs')
      .select('id, user_id, status, output_image_path, error_message, settings, created_at, updated_at')
      .eq('id', id)
      .eq('user_id', authUser.id)
      .single()

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const outputPath = job.output_image_path as string | null
    const base64Image = isBase64StoragePath(outputPath) ? outputPath!.replace('base64://', '') : undefined
    const imageUrl = !isBase64StoragePath(outputPath) ? outputPath || undefined : undefined

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      imageUrl,
      base64Image,
      error: job.error_message || undefined,
      settings: job.settings || {},
      createdAt: job.created_at,
      updatedAt: job.updated_at,
    })
  } catch (error) {
    console.error('Try-on job poll error:', error)
    return NextResponse.json({ error: 'Failed to fetch job status' }, { status: 500 })
  }
}
