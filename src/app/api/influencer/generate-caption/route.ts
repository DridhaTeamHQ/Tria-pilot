/**
 * POST /api/influencer/generate-caption
 *
 * Given a try-on image (or product context) + platform + tone, returns
 * 3 platform-tailored captions with hashtags. Designed for the creator
 * try-on result screen — one click and they have ready-to-post copy.
 *
 * Body:
 *   {
 *     imageUrl?: string,                  // optional — if present, GPT-4o vision uses it
 *     productName?: string,
 *     productCategory?: string,
 *     productDescription?: string,
 *     niches?: string[],                  // creator's niches for relevance
 *     platforms?: ('instagram'|'tiktok'|'youtube_shorts'|'twitter')[],
 *     tone?: 'casual'|'aspirational'|'witty'|'authentic'|'bold',
 *     count?: number,                     // captions per platform, default 3
 *   }
 *
 * Returns:
 *   { results: { platform, tone, captions: [{text, hashtags[]}] }[] }
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/auth'
import { getOpenAIKey } from '@/lib/config/api-keys'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const PLATFORMS = ['instagram', 'tiktok', 'youtube_shorts', 'twitter'] as const
const TONES = ['casual', 'aspirational', 'witty', 'authentic', 'bold'] as const

const bodySchema = z.object({
  imageUrl: z.string().url().optional(),
  productName: z.string().max(200).optional(),
  productCategory: z.string().max(100).optional(),
  productDescription: z.string().max(2000).optional(),
  niches: z.array(z.string()).max(10).optional(),
  platforms: z.array(z.enum(PLATFORMS)).max(4).optional(),
  tone: z.enum(TONES).optional(),
  count: z.number().int().min(1).max(5).optional(),
})

interface CaptionResult {
  platform: string
  tone: string
  captions: Array<{ text: string; hashtags: string[] }>
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

    const {
      imageUrl,
      productName,
      productCategory,
      productDescription,
      niches = [],
      platforms = ['instagram'],
      tone = 'authentic',
      count = 3,
    } = parsed.data

    let apiKey: string
    try {
      apiKey = getOpenAIKey()
    } catch {
      return NextResponse.json(
        { error: 'AI caption generation is currently unavailable.' },
        { status: 503 },
      )
    }

    const openai = new OpenAI({ apiKey })

    const platformGuide = platforms
      .map((p) => {
        switch (p) {
          case 'instagram':
            return '- Instagram: 1-2 sentence captions, emoji-friendly, 6-10 hashtags (mix popular + niche).'
          case 'tiktok':
            return '- TikTok: punchy hooks under 100 chars, trend-aware, 3-5 hashtags including discovery tags.'
          case 'youtube_shorts':
            return '- YouTube Shorts: descriptive but tight, question hook OK, 4-6 hashtags including #Shorts.'
          case 'twitter':
            return '- Twitter/X: under 280 chars, witty/conversational, 1-3 hashtags max.'
          default:
            return ''
        }
      })
      .filter(Boolean)
      .join('\n')

    const productContext = [
      productName ? `Product: ${productName}` : '',
      productCategory ? `Category: ${productCategory}` : '',
      productDescription ? `Description: ${productDescription}` : '',
      niches.length ? `Creator niches: ${niches.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    const systemContent = `You are a senior social media copywriter for Indian creators promoting fashion/lifestyle products via AI try-on visuals on the Kiwikoo platform.
Write captions that feel authentic to the creator (NOT corporate) and match the platform.
Tone: ${tone}.
Output ONLY valid JSON. No prose outside JSON.`

    const userPrompt = `Generate ${count} caption variants for EACH of these platforms.

${productContext || '(No specific product context provided.)'}

Platform guidelines:
${platformGuide}

Return JSON:
{
  "results": [
    {
      "platform": "<platform name>",
      "tone": "${tone}",
      "captions": [
        { "text": "<caption text>", "hashtags": ["#tag1", "#tag2"] }
      ]
    }
  ]
}

Each caption.text should NOT contain the hashtags (return them separately so the creator can pick which to use).`

    const messages: any[] = [{ role: 'system', content: systemContent }]

    if (imageUrl) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
        ],
      })
    } else {
      messages.push({ role: 'user', content: userPrompt })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      response_format: { type: 'json_object' },
      max_tokens: 1500,
      temperature: 0.85,
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) {
      return NextResponse.json({ error: 'AI returned no content' }, { status: 502 })
    }

    let parsedJson: { results?: CaptionResult[] }
    try {
      parsedJson = JSON.parse(raw)
    } catch {
      return NextResponse.json({ error: 'AI returned malformed JSON' }, { status: 502 })
    }

    return NextResponse.json({
      results: Array.isArray(parsedJson.results) ? parsedJson.results : [],
    })
  } catch (error) {
    const isQuotaError =
      error instanceof Error &&
      (error.message.includes('insufficient_quota') ||
        (error as any)?.code === 'insufficient_quota')

    if (isQuotaError) {
      return NextResponse.json(
        { error: 'AI caption generation is temporarily unavailable — quota exceeded.' },
        { status: 503 },
      )
    }

    console.error('[generate-caption] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
