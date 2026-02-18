import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'

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

    return NextResponse.json({ active: false })
  } catch (error) {
    console.error('Try-on active job error:', error)
    return NextResponse.json({ error: 'Failed to fetch active job' }, { status: 500 })
  }
}
