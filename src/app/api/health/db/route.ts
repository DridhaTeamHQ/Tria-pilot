import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const result = {
    ok: false,
    supabase: { ok: false, error: undefined as string | undefined, profilesCount: 0 },
    env: {
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
  }

  try {
    const supabase = await createClient()
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    if (error) {
      result.supabase.error = error.message
      result.supabase.ok = false
    } else {
      result.supabase.ok = true
      result.supabase.profilesCount = count ?? 0
    }
  } catch (e) {
    result.supabase.error = e instanceof Error ? e.message : String(e)
    result.supabase.ok = false
  }

  result.ok = result.supabase.ok
  return NextResponse.json(result, { status: result.ok ? 200 : 503 })
}
