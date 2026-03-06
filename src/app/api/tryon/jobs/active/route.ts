import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'

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
      .select('id, status, created_at, updated_at')
      .eq('user_id', authUser.id)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Try-on active job query error:', error)
      return NextResponse.json({ error: 'Failed to fetch active job' }, { status: 500 })
    }

    if (!activeJob) {
      return NextResponse.json({ active: false })
    }

    return NextResponse.json({
      active: true,
      jobId: activeJob.id,
      status: activeJob.status,
      createdAt: activeJob.created_at,
      updatedAt: activeJob.updated_at,
    })
  } catch (error) {
    console.error('Try-on active job error:', error)
    return NextResponse.json({ error: 'Failed to fetch active job' }, { status: 500 })
  }
}
