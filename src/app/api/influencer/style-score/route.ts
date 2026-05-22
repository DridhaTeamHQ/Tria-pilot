import { NextResponse } from 'next/server'
import { z } from 'zod'
import OpenAI from 'openai'
import { createClient } from '@/lib/auth'
import { getOpenAIKey } from '@/lib/config/api-keys'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const bodySchema = z.object({
  imageUrl: z.string().nullish(),
  imageDataUrl: z.string().nullish(),
  productName: z.string().max(200).nullish(),
  productCategory: z.string().max(100).nullish(),
  productDescription: z.string().max(2000).nullish(),
})

function fallbackInsight(category?: string | null) {
  const normalized = String(category || '').toLowerCase()
  const seasonalBias =
    normalized.includes('dress') || normalized.includes('summer')
      ? 91
      : normalized.includes('jacket') || normalized.includes('layer')
        ? 84
        : 88

  return {
    label: seasonalBias >= 90 ? 'Trendy' : seasonalBias >= 85 ? 'Strong fit' : 'On-point',
    score: Math.round((84 + seasonalBias) / 2),
    summary: 'The look reads clean, wearable, and social-first enough to feel intentional on feed.',
    breakdown: {
      fitMatch: 86,
      colorHarmony: 88,
      seasonalRelevance: seasonalBias,
    },
    shareCaption: `Style score locked. Clean fit, sharp palette, and strong post energy.`,
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { imageUrl, imageDataUrl, productName, productCategory, productDescription } = parsed.data
    const imageInput = imageUrl || imageDataUrl || ''

    let apiKey = ''
    try {
      apiKey = getOpenAIKey()
    } catch {
      return NextResponse.json(fallbackInsight(productCategory))
    }

    if (!imageInput) {
      return NextResponse.json(fallbackInsight(productCategory))
    }

    const openai = new OpenAI({ apiKey })
    const systemPrompt = `You are Kiwikoo's fashion scoring layer for influencer try-on results.
Score the outfit like a sharp but supportive creator strategist.
Return only valid JSON.`

    const userPrompt = `Review this try-on result and score it for social-post readiness.

Product name: ${productName || 'Unknown'}
Category: ${productCategory || 'Unknown'}
Description: ${productDescription || 'Unknown'}

Return JSON in this exact shape:
{
  "label": "Trendy",
  "score": 87,
  "summary": "One sentence about why this look works.",
  "breakdown": {
    "fitMatch": 88,
    "colorHarmony": 84,
    "seasonalRelevance": 89
  },
  "shareCaption": "A short shareable line for the creator card."
}

Rules:
- Score each metric from 0 to 100
- Keep summary and shareCaption short
- Be optimistic but believable
- Focus on fit match, color harmony, and seasonal relevance`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: { url: imageInput, detail: 'low' } },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.5,
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) {
      return NextResponse.json(fallbackInsight(productCategory))
    }

    const parsedJson = JSON.parse(raw)
    return NextResponse.json({
      label: String(parsedJson.label || fallbackInsight(productCategory).label),
      score: Number(parsedJson.score || fallbackInsight(productCategory).score),
      summary: String(parsedJson.summary || fallbackInsight(productCategory).summary),
      breakdown: {
        fitMatch: Number(parsedJson.breakdown?.fitMatch || 86),
        colorHarmony: Number(parsedJson.breakdown?.colorHarmony || 88),
        seasonalRelevance: Number(parsedJson.breakdown?.seasonalRelevance || 89),
      },
      shareCaption: String(parsedJson.shareCaption || fallbackInsight(productCategory).shareCaption),
    })
  } catch (error) {
    console.error('[style-score] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
