import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'

const STALE_PENDING_MS = 5 * 60 * 1000
const STALE_PROCESSING_MS = 2 * 60 * 1000

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = createServiceClient()
    const { data: activeJob, error } = await service
      .from('generation_jobs')
      .select('id, status, created_at')
      .eq('user_id', authUser.id)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !activeJob?.id) {
      return NextResponse.json({ active: false }, { status: 404 })
    }

    const createdAtMs = activeJob.created_at ? new Date(activeJob.created_at).getTime() : 0
    const now = Date.now()
    const isStale =
      (activeJob.status === 'pending' && now - createdAtMs > STALE_PENDING_MS) ||
      (activeJob.status === 'processing' && now - createdAtMs > STALE_PROCESSING_MS)

    if (isStale) {
      await service
        .from('generation_jobs')
        .update({
          status: 'failed',
          error_message: 'Stale job - cleared by active-job check.',
        })
        .eq('id', activeJob.id)

      return NextResponse.json({ active: false }, { status: 404 })
    }

    return NextResponse.json({
      active: true,
      jobId: activeJob.id,
      status: activeJob.status,
      createdAt: activeJob.created_at,
    })
  } catch (error) {
    console.error('Try-on active job error:', error)
    return NextResponse.json({ error: 'Failed to fetch active job' }, { status: 500 })
  }
}
