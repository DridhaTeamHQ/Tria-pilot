/**
 * /api/brand/voice
 *
 * GET  — return the brand's saved voice profile (or null if not set)
 * POST — extract voice from sample posts + save
 *   body: { samples: string[] }    (3-5 short sample posts)
 *
 * The voice is stored inside profiles.brand_data.voice (JSONB).
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/auth'
import { extractBrandVoice, type BrandVoice } from '@/lib/brand/voice-extractor'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const postSchema = z.object({
  samples: z.array(z.string().trim().min(10).max(2000)).min(1).max(8),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, brand_data')
      .eq('id', authUser.id)
      .maybeSingle()

    if ((profile?.role || '').toLowerCase() !== 'brand') {
      return NextResponse.json({ error: 'Forbidden — brand only' }, { status: 403 })
    }

    const brandData = (profile?.brand_data || {}) as Record<string, unknown>
    const voice = (brandData.voice as BrandVoice | undefined) || null
    const updatedAt = (brandData.voiceUpdatedAt as string | undefined) || null
    const samples = (brandData.voiceSamples as string[] | undefined) || []

    return NextResponse.json({ voice, updatedAt, samples })
  } catch (err) {
    console.error('[brand/voice GET] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, brand_data')
      .eq('id', authUser.id)
      .maybeSingle()

    if ((profile?.role || '').toLowerCase() !== 'brand') {
      return NextResponse.json({ error: 'Forbidden — brand only' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const parsed = postSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const voice = await extractBrandVoice(parsed.data.samples)

    const service = createServiceClient()
    const existingBrandData = (profile?.brand_data || {}) as Record<string, unknown>
    const newBrandData = {
      ...existingBrandData,
      voice,
      voiceSamples: parsed.data.samples,
      voiceUpdatedAt: new Date().toISOString(),
    }

    const { error: updateErr } = await service
      .from('profiles')
      .update({ brand_data: newBrandData })
      .eq('id', authUser.id)

    if (updateErr) {
      console.error('[brand/voice POST] update error:', updateErr)
      return NextResponse.json({ error: 'Failed to save voice profile' }, { status: 500 })
    }

    return NextResponse.json({ voice, updatedAt: newBrandData.voiceUpdatedAt })
  } catch (err) {
    console.error('[brand/voice POST] error:', err)

    const isQuotaError =
      err instanceof Error &&
      (err.message.includes('insufficient_quota') || (err as any)?.code === 'insufficient_quota')
    if (isQuotaError) {
      return NextResponse.json(
        { error: 'AI is temporarily unavailable — quota exceeded. Try again later.' },
        { status: 503 },
      )
    }

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, brand_data')
      .eq('id', authUser.id)
      .maybeSingle()

    if ((profile?.role || '').toLowerCase() !== 'brand') {
      return NextResponse.json({ error: 'Forbidden — brand only' }, { status: 403 })
    }

    const service = createServiceClient()
    const existingBrandData = (profile?.brand_data || {}) as Record<string, unknown>
    const { voice: _v, voiceSamples: _s, voiceUpdatedAt: _u, ...rest } = existingBrandData

    await service.from('profiles').update({ brand_data: rest }).eq('id', authUser.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[brand/voice DELETE] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
