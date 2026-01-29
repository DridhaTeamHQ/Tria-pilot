/**
 * GET /api/health/db
 *
 * Diagnostic endpoint for Supabase + Prisma connectivity.
 * Use in production to verify DATABASE_URL and Supabase env vars.
 * Does not require auth.
 */
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createServiceClient } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const result: {
    ok: boolean
    supabase: { ok: boolean; error?: string; profilesCount?: number }
    prisma: { ok: boolean; error?: string; userCount?: number }
    env: {
      hasDatabaseUrl: boolean
      hasSupabaseUrl: boolean
      hasServiceRoleKey: boolean
      databaseUrlPort?: number
    }
  } = {
    ok: false,
    supabase: { ok: false },
    prisma: { ok: false },
    env: {
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
  }

  try {
    const url = process.env.DATABASE_URL
    if (url) {
      const match = url.match(/:(\d+)(?:\/|$)/)
      result.env.databaseUrlPort = match ? parseInt(match[1], 10) : undefined
    }
  } catch {
    // ignore
  }

  // Supabase: list profiles (or auth if you prefer)
  try {
    const service = createServiceClient()
    const { count, error } = await service
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
    // If service client failed (e.g. missing key), still run Prisma check below
  }

  // Prisma: simple count
  try {
    const userCount = await prisma.user.count()
    result.prisma.ok = true
    result.prisma.userCount = userCount
  } catch (e) {
    const err = e as Error & { code?: string; meta?: unknown }
    result.prisma.ok = false
    result.prisma.error = err.message || String(e)
    if (err.code) (result.prisma as Record<string, unknown>).code = err.code
    if (err.meta) (result.prisma as Record<string, unknown>).meta = err.meta
  }

  result.ok = result.supabase.ok && result.prisma.ok
  const status = result.ok ? 200 : 503
  return NextResponse.json(result, { status })
}
